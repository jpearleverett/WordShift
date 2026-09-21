import NativeStorage from '@react-native-async-storage/async-storage';
import { completeAnimalConversationLine, countResidentsWithUnreadConversation, getNextAnimalConversation } from '../services/conversationProgress';
import { getDialoguesForAnimal, getTotalDialogueCount } from '../services/dialogue/animalDialogueBase';
import { ANIMALS } from '../services/homeWorldData';
import { getFullProgress, invalidateProgressCache, markIntroSeen, hasSeenIntro, markPostRevelation, startNewCycle } from '../services/amberCurrency';
import { STORAGE_COMMIT_KEY } from '../services/persistenceStorage';
import { logEvent } from '../services/eventLogger';
import { AnimalType, DialoguePhase, HomeWorldProgress } from '../types/homeWorld';

jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());
// Arrival delegates analytics to this service. Keep its debounced upload timer
// outside conversation persistence tests, where it could outlive Jest teardown.
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
  getInstallAgeDays: jest.fn(async () => 0),
}));

const PROGRESS_KEY = 'wordshift_home_progress';
const originalRead = (NativeStorage.getItem as jest.Mock).getMockImplementation()!;
const originalWrite = (NativeStorage.setItem as jest.Mock).getMockImplementation()!;
const allTypes = ANIMALS.map(animal => animal.type);

async function seed(overrides: Partial<HomeWorldProgress> = {}): Promise<HomeWorldProgress> {
  const progress: HomeWorldProgress = {
    ...(await getFullProgress()),
    amber: 2500, currentPhase: 4, unlockedAnimals: [...allTypes],
    unlockedRooms: ANIMALS.map(animal => animal.roomId), introsSeen: [...allTypes],
    ...overrides,
  };
  await NativeStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  invalidateProgressCache();
  return progress;
}

beforeEach(async () => {
  (logEvent as jest.Mock).mockClear();
  (NativeStorage.getItem as jest.Mock).mockImplementation(originalRead);
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  await NativeStorage.clear();
  invalidateProgressCache();
  await seed();
});

test.each(allTypes)('%s begins at its earliest unread line regardless of phase or legacy cursor', async type => {
  for (const currentPhase of [0, 1, 2, 3, 4, 5] as DialoguePhase[]) {
    const progress = await seed({ currentPhase, lastDialogueRead: { [type]: 9999 } });
    expect(getNextAnimalConversation(progress, type)).toEqual({
      dialogue: getDialoguesForAnimal(type, 0)[0], index: 0,
    });
    expect(progress.lastDialogueRead[type]).toBe(9999);
    expect(progress.introsSeen).toContain(type);
    expect(progress.amber).toBe(2500);
  }
});

test.each(allTypes)('%s traverses every regular line exactly once and keeps the late-pool cursor', async type => {
  await seed({ currentPhase: 5, lastDialogueRead: { [type]: 141 } });
  const corpus = getDialoguesForAnimal(type, 4);
  for (let index = 0; index < corpus.length; index++) {
    const progress = await getFullProgress();
    expect(getNextAnimalConversation(progress, type)).toEqual({ dialogue: corpus[index], index });
    const result = await completeAnimalConversationLine(type, corpus[index].id, 0);
    expect(result.completed).toBe(true);
    expect(result.conversationReadIds[type]).toHaveLength(index + 1);
    expect(result.next?.index ?? 141).toBe(index + 1 < corpus.length ? index + 1 : 141);
    invalidateProgressCache();
  }
  const progress = await getFullProgress();
  expect(getNextAnimalConversation(progress, type)).toBeNull();
  expect(progress.lastDialogueRead[type]).toBe(141);
  expect(progress.amber).toBe(2500);
  const retry = await completeAnimalConversationLine(type, corpus[corpus.length - 1].id, 0);
  expect(retry).toMatchObject({ completed: false, next: null, nextIndex: 141 });
});

test('phase changes open later chapters without retiring earlier unread lines', async () => {
  const type: AnimalType = 'pangolin';
  const firstChapter = getDialoguesForAnimal(type, 0);
  let progress = await seed({ currentPhase: 0, conversationReadIds: { [type]: firstChapter.slice(0, -1).map(line => line.id) } });
  expect(getNextAnimalConversation(progress, type)!.dialogue).toEqual(firstChapter[firstChapter.length - 1]);
  await completeAnimalConversationLine(type, firstChapter[firstChapter.length - 1].id, 0);
  expect(getNextAnimalConversation(await getFullProgress(), type)).toBeNull();
  progress = await seed({ currentPhase: 3 });
  expect(getNextAnimalConversation(progress, type)!.dialogue.phase).toBe(1);
  await markPostRevelation();
  expect(logEvent).toHaveBeenCalledWith({
    type: 'phase_reached',
    data: { phase: 5, puzzlesSolved: progress.puzzlesSolved, installAgeDays: 0 },
  });
  progress = await getFullProgress();
  expect(progress.currentPhase).toBe(5);
  expect(getNextAnimalConversation(progress, type)!.dialogue.phase).toBe(1);
});

test('a line referencing a locked resident waits unread and returns when that resident arrives', async () => {
  const type: AnimalType = 'pangolin';
  const corpus = getDialoguesForAnimal(type, 4);
  const blockedIndex = corpus.findIndex(line => line.requiresAnimals?.length);
  expect(blockedIndex).toBeGreaterThanOrEqual(0);
  const blocked = corpus[blockedIndex];
  const locked = blocked.requiresAnimals![0];
  const progress = await seed({
    unlockedAnimals: allTypes.filter(animal => animal !== locked),
    conversationReadIds: { [type]: corpus.slice(0, blockedIndex).map(line => line.id) },
  });
  const later = getNextAnimalConversation(progress, type)!;
  expect(later.index).toBeGreaterThan(blockedIndex);
  const result = await completeAnimalConversationLine(type, later.dialogue.id, 0);
  expect(result.conversationReadIds[type]).not.toContain(blocked.id);
  const reunited = await seed({ unlockedAnimals: allTypes });
  expect(getNextAnimalConversation(reunited, type)).toEqual({ dialogue: blocked, index: blockedIndex });
});

test('duplicate and concurrent completions cannot skip another line or lose another animal receipt', async () => {
  const fox = getDialoguesForAnimal('fox', 0)[0];
  const owl = getDialoguesForAnimal('owl', 0)[0];
  const results = await Promise.all([
    completeAnimalConversationLine('fox', fox.id, 0),
    completeAnimalConversationLine('fox', fox.id, 0),
    completeAnimalConversationLine('owl', owl.id, 0),
  ]);
  expect(results.map(result => result.completed)).toEqual([true, false, true]);
  const progress = await getFullProgress();
  expect(progress.conversationReadIds).toEqual({ fox: [fox.id], owl: [owl.id] });
  expect(getNextAnimalConversation(progress, 'fox')!.index).toBe(1);
});

test('a later line, another resident line, or an unavailable future chapter cannot be acknowledged', async () => {
  const fox = getDialoguesForAnimal('fox', 4);
  await expect(completeAnimalConversationLine('fox', fox[1].id, 0)).rejects.toThrow('moved on');
  await expect(completeAnimalConversationLine('owl', fox[0].id, 0)).rejects.toThrow('no longer available');
  await seed({ currentPhase: 0 });
  await expect(completeAnimalConversationLine('fox', fox.find(line => line.phase === 4)!.id, 0)).rejects.toThrow('moved on');
  expect((await getFullProgress()).conversationReadIds).toBeUndefined();
});

test.each([STORAGE_COMMIT_KEY, PROGRESS_KEY])('a failed completed-line save at %s retries its exact receipt safely', async failedKey => {
  const first = getDialoguesForAnimal('fox', 0)[0];
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === failedKey && !failed) { failed = true; throw new Error('disk full'); }
    return originalWrite(key, value);
  });
  await expect(completeAnimalConversationLine('fox', first.id, 0)).rejects.toThrow();
  const saved = await completeAnimalConversationLine('fox', first.id, 0);
  expect(saved.conversationReadIds.fox).toEqual([first.id]);
  expect(saved.nextIndex).toBe(1);
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
  expect((await getFullProgress()).amber).toBe(2500);
});

test.each(['{broken json', JSON.stringify({ conversationReadIds: [] })])('unreadable progress fails closed: %s', async raw => {
  await NativeStorage.setItem(PROGRESS_KEY, raw);
  await expect(completeAnimalConversationLine('fox', getDialoguesForAnimal('fox', 0)[0].id, 0)).rejects.toThrow();
  expect(await NativeStorage.getItem(PROGRESS_KEY)).toBe(raw);
});

test('malformed read receipts never become an empty ledger that silently forgets completed lines', async () => {
  const raw = JSON.stringify({ ...(await getFullProgress()), conversationReadIds: { fox: null } });
  await NativeStorage.setItem(PROGRESS_KEY, raw);
  await expect(completeAnimalConversationLine('fox', getDialoguesForAnimal('fox', 0)[0].id, 0)).rejects.toThrow('could not be read');
  expect(await NativeStorage.getItem(PROGRESS_KEY)).toBe(raw);
});

test('New Cycle restarts regular reads and rejects a completion from the old cycle', async () => {
  const first = getDialoguesForAnimal('fox', 0)[0];
  await completeAnimalConversationLine('fox', first.id, 0);
  await seed({ currentPhase: 5, postRevelation: true, houseCompleted: true, finalPuzzleCompleted: true });
  expect(await startNewCycle()).toBe(1);
  expect((await getFullProgress()).conversationReadIds).toEqual({});
  await expect(completeAnimalConversationLine('fox', first.id, 0)).rejects.toThrow('earlier visit');
  const result = await completeAnimalConversationLine('fox', first.id, 1);
  expect(result).toMatchObject({ completed: true, cycleCount: 1, nextIndex: 1 });
  expect((await getFullProgress()).introsSeen).toContain('fox');
});

test.each([STORAGE_COMMIT_KEY, PROGRESS_KEY])('an introduction save failure at %s never consumes an unfinished welcome', async failedKey => {
  await seed({ introsSeen: [] });
  const initial = await getFullProgress();
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === failedKey && !failed) { failed = true; throw new Error('disk full'); }
    return originalWrite(key, value);
  });
  await expect(markIntroSeen('fox')).rejects.toThrow();
  expect(initial.introsSeen).toEqual([]);
  await markIntroSeen('fox');
  expect(await hasSeenIntro('fox')).toBe(true);
  expect((await getFullProgress()).introsSeen).toEqual(['fox']);
  expect(getNextAnimalConversation(await getFullProgress(), 'fox')!.index).toBe(0);
  expect(getTotalDialogueCount('fox', 4)).toBeGreaterThan(100);
});

describe('countResidentsWithUnreadConversation', () => {
  // The reveal's soft warning (Ember's full-house beat on HomeScreen) counts
  // residents with a line the player could go and hear THIS MINUTE.
  test('counts every resident with an eligible unread line and ignores the locked ones', async () => {
    const progress = await seed({ currentPhase: 3, conversationReadIds: {}, conversationReadVersion: 1 });
    expect(countResidentsWithUnreadConversation(progress)).toBe(allTypes.length);

    const half = allTypes.slice(0, 4);
    expect(countResidentsWithUnreadConversation(
      await seed({ currentPhase: 3, unlockedAnimals: [...half] }),
    )).toBe(half.length);
  });

  test('a resident who has read everything available to them right now stops being counted', async () => {
    // fox is vanguard, so at global phase 3 its whole phase-0..4 corpus is
    // already eligible: reading all of it is what "caught up" means here.
    const read = getDialoguesForAnimal('fox', 4).map(dialogue => dialogue.id);
    const progress = await seed({
      currentPhase: 3,
      conversationReadIds: { fox: read },
      conversationReadVersion: 1,
    });
    expect(getNextAnimalConversation(progress, 'fox')).toBeNull();
    expect(countResidentsWithUnreadConversation(progress)).toBe(allTypes.length - 1);
  });

  test('a lagging resident is measured at the phase they can actually be heard at', async () => {
    // Sloane lags, so at global phase 3 she resolves to animal phase 2 and only
    // her phase 0-2 corpus is eligible. Reading exactly that much must silence
    // her: counting her phase-3 block would name a visit that offers nothing.
    const throughPhase2 = getDialoguesForAnimal('sloth', 2).map(dialogue => dialogue.id);
    const progress = await seed({
      currentPhase: 3,
      conversationReadIds: { sloth: throughPhase2 },
      conversationReadVersion: 1,
    });
    expect(countResidentsWithUnreadConversation(progress)).toBe(allTypes.length - 1);
    // The reveal is exactly what opens the rest of her, so nothing was lost.
    expect(getDialoguesForAnimal('sloth', 4).length).toBeGreaterThan(throughPhase2.length);
    expect(countResidentsWithUnreadConversation(
      { ...progress, currentPhase: 4 },
    )).toBe(allTypes.length);
  });

  test('an unreadable ledger reports nothing owed rather than throwing at the caller', async () => {
    // getConversationReadIds rejects a corrupt record. The warning is not worth
    // refusing anything over, so it must swallow that and stay silent.
    const progress = await seed({ currentPhase: 3 });
    const corrupt = { ...progress, conversationReadIds: { fox: 'not-an-array' } } as unknown as HomeWorldProgress;
    expect(() => getNextAnimalConversation(corrupt, 'fox')).toThrow();
    expect(countResidentsWithUnreadConversation(corrupt)).toBe(0);
  });
});
