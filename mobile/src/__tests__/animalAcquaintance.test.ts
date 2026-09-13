import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACQUAINTANCE_STORAGE_KEY, AnimalAcquaintanceMemory,
  advanceAnimalAcquaintance, canOfferAnimalAcquaintance, hasPendingAnimalAcquaintance,
  invalidateAnimalAcquaintanceCache, loadAnimalAcquaintanceState, openAnimalAcquaintance,
} from '../services/animalAcquaintance';
import { ACQUAINTANCE_ANIMALS, getAnimalAcquaintanceVisit } from '../services/dialogue/animalAcquaintanceContent';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage());

beforeEach(async () => {
  await AsyncStorage.clear();
  invalidateAnimalAcquaintanceCache();
  jest.clearAllMocks();
});

async function finishVisit(memory: AnimalAcquaintanceMemory): Promise<void> {
  let active: AnimalAcquaintanceMemory | null = memory;
  while (active) active = await advanceAnimalAcquaintance(active.animalType, active.visit, active.page);
}

test('only unseen late recruits are enrolled automatically; established friends can opt in', async () => {
  const state = await loadAnimalAcquaintanceState();
  for (const type of ACQUAINTANCE_ANIMALS) {
    expect(hasPendingAnimalAcquaintance(state, type, 3, false)).toBe(true);
    expect(hasPendingAnimalAcquaintance(state, type, 3, true)).toBe(false);
    expect(hasPendingAnimalAcquaintance(state, type, 1, false)).toBe(false);
    expect(canOfferAnimalAcquaintance(state, type)).toBe(true);
  }
  expect(hasPendingAnimalAcquaintance(state, 'fox', 4, false)).toBe(false);
  expect(canOfferAnimalAcquaintance(state, 'fox')).toBe(false);
  expect(await openAnimalAcquaintance('fox', 3, 'introduction')).toBeNull();
  expect(await openAnimalAcquaintance('wombat', 1, 'introduction')).toBeNull();
  expect(await openAnimalAcquaintance('wombat', 3, 'continue')).toBeNull();
  expect(await AsyncStorage.getItem(ACQUAINTANCE_STORAGE_KEY)).toBeNull();
});

test('unread pages resume after a cold reload without changing their earlier setting', async () => {
  const opened = (await openAnimalAcquaintance('wombat', 3, 'introduction'))!;
  expect(opened.visit).toBe(0);
  await advanceAnimalAcquaintance('wombat', 0, 0);
  invalidateAnimalAcquaintanceCache();
  const resumed = (await openAnimalAcquaintance('wombat', 4, 'continue'))!;
  expect(resumed.page).toBe(1);
  expect(resumed.phase).toBe(3);
  expect(resumed.lines).toEqual(opened.lines);
  const state = await loadAnimalAcquaintanceState();
  expect(hasPendingAnimalAcquaintance(state, 'wombat', 4, true)).toBe(true);
  expect(canOfferAnimalAcquaintance(state, 'wombat')).toBe(false);
});

test('an open transcript remains immutable even if the source copy is later revised', async () => {
  await openAnimalAcquaintance('rabbit', 3, 'introduction');
  const stored = await loadAnimalAcquaintanceState();
  stored.animals.rabbit!.active!.lines[0] = 'Words kept when we first sat together.';
  await AsyncStorage.setItem(ACQUAINTANCE_STORAGE_KEY, JSON.stringify(stored));
  invalidateAnimalAcquaintanceCache();
  expect((await openAnimalAcquaintance('rabbit', 4, 'continue'))!.lines[0])
    .toBe('Words kept when we first sat together.');
});

test('all three personal visits finish independently without changing ordinary history or answers', async () => {
  const progress = JSON.stringify({ lastDialogueRead: { tarsier: 104 }, introsSeen: ['tarsier'] });
  const choices = JSON.stringify({ choices: { tarsier: 'refuse' }, offeredBy: ['tarsier'] });
  await AsyncStorage.setItem('wordshift_home_progress', progress);
  await AsyncStorage.setItem('wordshift_dialogue_choices', choices);
  for (let visit = 0; visit < 3; visit += 1) {
    const memory = (await openAnimalAcquaintance('tarsier', 4, visit === 0 ? 'introduction' : 'continue'))!;
    expect(memory.visit).toBe(visit);
    await finishVisit(memory);
    invalidateAnimalAcquaintanceCache();
    const state = await loadAnimalAcquaintanceState();
    expect(state.animals.tarsier).toEqual({ nextVisit: visit + 1 });
    expect(hasPendingAnimalAcquaintance(state, 'tarsier', 4, true)).toBe(visit < 2);
  }
  expect(await openAnimalAcquaintance('tarsier', 4, 'introduction')).toBeNull();
  expect(await openAnimalAcquaintance('tarsier', 5, 'optional')).toBeNull();
  expect(await AsyncStorage.getItem('wordshift_home_progress')).toBe(progress);
  expect(await AsyncStorage.getItem('wordshift_dialogue_choices')).toBe(choices);
});

test('old friends begin with a shared moment and do not repeat their move-in introduction', async () => {
  const memory = (await openAnimalAcquaintance('kakapo', 4, 'optional'))!;
  expect(memory.visit).toBe(1);
  expect(memory.lines).toEqual(getAnimalAcquaintanceVisit('kakapo', 1, 4)!.lines);
  await finishVisit(memory);
  expect((await openAnimalAcquaintance('kakapo', 4, 'continue'))!.visit).toBe(2);
});

test('duplicate and stale taps cannot skip a page or complete the following visit', async () => {
  await openAnimalAcquaintance('red_panda', 3, 'introduction');
  await Promise.all([
    advanceAnimalAcquaintance('red_panda', 0, 0),
    advanceAnimalAcquaintance('red_panda', 0, 0),
  ]);
  let memory = (await openAnimalAcquaintance('red_panda', 3, 'continue'))!;
  expect(memory.page).toBe(1);
  await finishVisit(memory);
  memory = (await openAnimalAcquaintance('red_panda', 3, 'continue'))!;
  const staleResult = await advanceAnimalAcquaintance('red_panda', 0, memory.lines.length - 1);
  expect(staleResult).toEqual(memory);
  expect((await loadAnimalAcquaintanceState()).animals.red_panda!.active!.page).toBe(0);
});

test('a failed page save keeps the old position available for retry', async () => {
  await openAnimalAcquaintance('aye_aye', 3, 'introduction');
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  await expect(advanceAnimalAcquaintance('aye_aye', 0, 0)).rejects.toThrow('disk full');
  expect((await loadAnimalAcquaintanceState()).animals.aye_aye!.active!.page).toBe(0);
  expect((await advanceAnimalAcquaintance('aye_aye', 0, 0))!.page).toBe(1);
});

test('a failed enrollment does not consume an introduction or hide its badge', async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  await expect(openAnimalAcquaintance('rabbit', 3, 'introduction')).rejects.toThrow('disk full');
  const state = await loadAnimalAcquaintanceState();
  expect(state.animals.rabbit).toBeUndefined();
  expect(hasPendingAnimalAcquaintance(state, 'rabbit', 3, false)).toBe(true);
  expect((await openAnimalAcquaintance('rabbit', 3, 'introduction'))!.visit).toBe(0);
});

test('arrival rewrites only the unfinished visit in its morning setting and keeps finished visits finished', async () => {
  await finishVisit((await openAnimalAcquaintance('wombat', 3, 'introduction'))!);
  await openAnimalAcquaintance('wombat', 4, 'continue');
  await advanceAnimalAcquaintance('wombat', 1, 0);
  invalidateAnimalAcquaintanceCache();
  const morning = (await openAnimalAcquaintance('wombat', 5, 'continue'))!;
  expect(morning).toMatchObject({ visit: 1, page: 0, phase: 5 });
  expect(morning.lines).toEqual(getAnimalAcquaintanceVisit('wombat', 1, 5)!.lines);
  await advanceAnimalAcquaintance('wombat', 1, 0);
  invalidateAnimalAcquaintanceCache();
  expect((await openAnimalAcquaintance('wombat', 5, 'continue'))!.page).toBe(1);
});

test('a failed morning rebuild retains the saved visit and can be retried', async () => {
  const before = await openAnimalAcquaintance('kakapo', 4, 'introduction');
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  await expect(openAnimalAcquaintance('kakapo', 5, 'continue')).rejects.toThrow('disk full');
  expect((await loadAnimalAcquaintanceState()).animals.kakapo!.active).toEqual(before);
  expect((await openAnimalAcquaintance('kakapo', 5, 'continue'))!.phase).toBe(5);
});

test('callers cannot mutate the service cache through returned state or pages', async () => {
  const memory = (await openAnimalAcquaintance('wombat', 3, 'introduction'))!;
  const original = memory.lines[0];
  memory.lines[0] = 'Changed externally';
  const state = await loadAnimalAcquaintanceState();
  state.animals.wombat!.nextVisit = 3;
  expect((await openAnimalAcquaintance('wombat', 3, 'continue'))!.lines[0]).toBe(original);
  expect((await loadAnimalAcquaintanceState()).animals.wombat!.nextVisit).toBe(0);
});

test('a queued tap from the old session cannot overwrite externally restored progress', async () => {
  await openAnimalAcquaintance('wombat', 3, 'introduction');
  const pendingTap = advanceAnimalAcquaintance('wombat', 0, 0);
  const rejected = expect(pendingTap).rejects.toThrow('The saved conversation changed');
  invalidateAnimalAcquaintanceCache();
  await AsyncStorage.setItem(ACQUAINTANCE_STORAGE_KEY,
    JSON.stringify({ version: 1, animals: { wombat: { nextVisit: 3 } } }));
  await rejected;
  expect((await loadAnimalAcquaintanceState()).animals.wombat).toEqual({ nextVisit: 3 });
  expect(await openAnimalAcquaintance('wombat', 3, 'continue')).toBeNull();
});

test('a slow badge read cannot replace a page saved while that read was in flight', async () => {
  await openAnimalAcquaintance('rabbit', 3, 'introduction');
  const oldSnapshot = await AsyncStorage.getItem(ACQUAINTANCE_STORAGE_KEY);
  invalidateAnimalAcquaintanceCache();
  let releaseRead!: (value: string | null) => void;
  let notifyStarted!: () => void;
  const started = new Promise<void>(resolve => { notifyStarted = resolve; });
  (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(() => {
    notifyStarted();
    return new Promise<string | null>(resolve => { releaseRead = resolve; });
  });
  const pendingRead = loadAnimalAcquaintanceState();
  await started;
  await advanceAnimalAcquaintance('rabbit', 0, 0);
  releaseRead(oldSnapshot);
  expect((await pendingRead).animals.rabbit!.active!.page).toBe(1);
  expect((await loadAnimalAcquaintanceState()).animals.rabbit!.active!.page).toBe(1);
});

test.each([
  '{bad json',
  JSON.stringify({ version: 2, animals: {} }),
  JSON.stringify({ version: 1, animals: { fox: { nextVisit: 0 } } }),
  JSON.stringify({ version: 1, animals: { wombat: { nextVisit: 4 } } }),
  JSON.stringify({ version: 1, animals: { wombat: { nextVisit: 0, active: {
    animalType: 'wombat', visit: 0, phase: 3, page: 8, title: 'A visit', lines: ['Hello'],
  } } } }),
])('invalid stored acquaintance state is rejected safely (%s)', async raw => {
  await AsyncStorage.setItem(ACQUAINTANCE_STORAGE_KEY, raw);
  expect(await loadAnimalAcquaintanceState()).toEqual({ version: 1, animals: {} });
});
