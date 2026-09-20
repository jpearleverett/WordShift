import NativeStorage from '@react-native-async-storage/async-storage';
import { StoryArchiveHistory, loadStoryArchiveHistory, getStoryArchiveChapterLines, getStoryArchiveChapterSummary, getStoryArchiveChapters, getStoryArchiveDialogues, getVisibleStoryMemoryLines } from '../services/storyArchive';
import { getDialoguesForAnimal } from '../services/dialogue/animalDialogueBase';
import { StoryContext, StoryMemory } from '../services/storySpine';
import { AnimalType, HomeWorldProgress } from '../types/homeWorld';
import { getFullProgress, invalidateProgressCache, startNewCycle } from '../services/amberCurrency';
import { completeAnimalConversationLine, getNextAnimalConversation } from '../services/conversationProgress';
import { runStorageTransaction } from '../services/persistenceStorage';

jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());

const context: StoryContext = { phase: 3, puzzlesSolved: 85, cycleCount: 0, unlockedAnimals: ['fox', 'owl', 'sloth'] };
const all: AnimalType[] = ['fox', 'pangolin', 'owl', 'axolotl', 'sloth', 'fennec_fox', 'capybara', 'wombat', 'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo'];
const fullyRead: StoryArchiveHistory = {
  cycleCount: 0,
  readIds: Object.fromEntries(all.map(animal => [animal, getDialoguesForAnimal(animal, 4).map(line => line.id)])),
};
const originalRead = (NativeStorage.getItem as jest.Mock).getMockImplementation()!;
const PROGRESS_KEY = 'wordshift_home_progress';
async function seed(overrides: Partial<HomeWorldProgress> = {}) {
  const progress = { ...(await getFullProgress()), currentPhase: 3, unlockedAnimals: all, ...overrides };
  await NativeStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  invalidateProgressCache();
}
beforeEach(async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(originalRead);
  await NativeStorage.clear();
  invalidateProgressCache();
});

describe('earlier conversation archive', () => {
  it('keeps late-arriving residents empty until their own lines are finished, even at Arrival', async () => {
    await seed({ currentPhase: 5, lastDialogueRead: { axolotl: 9999 }, introsSeen: ['axolotl'] });
    const arrival = { ...context, phase: 5 as const, unlockedAnimals: all };
    expect(getStoryArchiveChapters(arrival, await loadStoryArchiveHistory())).toEqual([]);
    const line = getNextAnimalConversation(await getFullProgress(), 'axolotl')!.dialogue;
    await completeAnimalConversationLine('axolotl', line.id, 0);
    const history = await loadStoryArchiveHistory();
    expect(getStoryArchiveChapters(arrival, history)).toEqual([{ id: 'axolotl', animal: 'axolotl', count: 1 }]);
    expect(getStoryArchiveChapterLines(arrival, 'axolotl', history)).toEqual([line]);
    expect(getStoryArchiveChapterLines(arrival, 'fox', history)).toEqual([]);
  });

  it('does not treat a selected or interrupted regular line as completed', async () => {
    await seed();
    const first = getNextAnimalConversation(await getFullProgress(), 'fox')!;
    expect(getStoryArchiveChapterLines(context, 'fox', await loadStoryArchiveHistory())).toEqual([]);
    await completeAnimalConversationLine('fox', first.dialogue.id, 0);
    const second = getNextAnimalConversation(await getFullProgress(), 'fox')!;
    expect(second.dialogue.id).not.toBe(first.dialogue.id);
    expect(getStoryArchiveChapterLines(context, 'fox', await loadStoryArchiveHistory())).toEqual([first.dialogue]);
  });

  it('requires a receipt belonging to this animal and ignores unknown IDs and duplicates', () => {
    const fox = getDialoguesForAnimal('fox', 0)[0];
    const owl = getDialoguesForAnimal('owl', 0)[0];
    const history = { cycleCount: 0, readIds: { fox: [owl.id, 'not-a-line', fox.id, fox.id], owl: [fox.id] } };
    expect(getStoryArchiveChapterLines(context, 'fox', history)).toEqual([fox]);
    expect(getStoryArchiveChapterLines(context, 'owl', history)).toEqual([]);
    expect(getStoryArchiveChapters(context, null)).toEqual([]);
  });

  it('still hides locked speakers, forward references and unreached phase blocks', () => {
    const early = { ...context, phase: 0 as const, unlockedAnimals: ['fox'] };
    expect(getStoryArchiveDialogues(early, 'owl', 0, fullyRead)).toEqual([]);
    expect(getStoryArchiveChapters(early, fullyRead).map(chapter => chapter.animal)).toEqual(['fox']);
    for (const line of getStoryArchiveDialogues(early, 'fox', 0, fullyRead)) {
      expect(line.text).not.toMatch(/Archimedes|Panko|Thyme|Vesper|Tock|Moss/);
      expect(line.requiresAnimals?.every(animal => animal === 'fox') ?? true).toBe(true);
    }
    expect(getStoryArchiveDialogues(context, 'fox', 4, fullyRead)).toEqual([]);
    expect(getStoryArchiveDialogues(context, 'sloth', 3, fullyRead)).toEqual([]);
    expect(getStoryArchiveDialogues(context, 'fox', 3, fullyRead).length).toBeGreaterThan(0);
    expect(getStoryArchiveDialogues(context, 'sloth', 2, fullyRead).length).toBeGreaterThan(0);
  });

  it('preserves all actually completed earlier lines at Arrival, in authored order', () => {
    const after = { ...context, phase: 5 as const, unlockedAnimals: all };
    for (const animal of all) {
      const reversed = { ...fullyRead, readIds: { [animal]: [...fullyRead.readIds[animal]].reverse() } };
      const chapters = getStoryArchiveChapters(after, reversed).filter(chapter => chapter.animal === animal);
      const preserved = getStoryArchiveChapterLines(after, animal, reversed);
      expect(preserved.map(line => line.id)).toEqual(getDialoguesForAnimal(animal, 4).map(line => line.id));
      expect(chapters).toEqual([{ id: animal, animal, count: preserved.length }]);
      expect(getStoryArchiveDialogues(after, animal, 5, reversed)).toEqual([]);
    }
    expect(getStoryArchiveChapterSummary(1)).toBe('One line kept');
    expect(getStoryArchiveChapterSummary(12)).toBe('12 lines kept');
  });

  it('never reconstructs legacy reads from cursor positions, phase, puzzle count or introductions', async () => {
    await seed({ puzzlesSolved: 999, currentPhase: 4, lastDialogueRead: { fox: 999 }, introsSeen: all });
    const before = await NativeStorage.getItem(PROGRESS_KEY);
    const history = await loadStoryArchiveHistory();
    expect(history).toEqual({ cycleCount: 0, readIds: {} });
    expect(getStoryArchiveChapters(context, history)).toEqual([]);
    expect(await NativeStorage.getItem(PROGRESS_KEY)).toBe(before);
  });

  it('does not mutate progress, receipts or choices while browsing', async () => {
    await seed({ conversationReadVersion: 1, conversationReadIds: { fox: ['fx_0_1'] } });
    const before = await NativeStorage.getItem(PROGRESS_KEY);
    const history = await loadStoryArchiveHistory();
    const frozen = Object.freeze({ ...context, unlockedAnimals: Object.freeze([...context.unlockedAnimals]) });
    Object.freeze(history.readIds.fox);
    Object.freeze(history.readIds);
    Object.freeze(history);
    getStoryArchiveChapters(frozen, history);
    getStoryArchiveDialogues(frozen, 'fox', 0, history);
    expect(await NativeStorage.getItem(PROGRESS_KEY)).toBe(before);
    expect(history.readIds.fox).not.toBe((await getFullProgress()).conversationReadIds!.fox);
  });

  it('does not carry an earlier cycle snapshot into a new playthrough', async () => {
    await seed({ currentPhase: 5, postRevelation: true, houseCompleted: true, finalPuzzleCompleted: true });
    const first = getDialoguesForAnimal('fox', 0)[0];
    await completeAnimalConversationLine('fox', first.id, 0);
    const oldHistory = await loadStoryArchiveHistory();
    expect(getStoryArchiveChapterLines(context, 'fox', oldHistory)).toEqual([first]);
    expect(await startNewCycle()).toBe(1);
    const newContext = { ...context, phase: 0 as const, cycleCount: 1 };
    expect(getStoryArchiveChapters(newContext, oldHistory)).toEqual([]);
    expect(getStoryArchiveChapters(newContext, await loadStoryArchiveHistory())).toEqual([]);
    await completeAnimalConversationLine('fox', first.id, 1);
    expect(getStoryArchiveChapterLines(newContext, 'fox', await loadStoryArchiveHistory())).toEqual([first]);
  });

  it('waits for an in-flight durable completion before exposing its history', async () => {
    await seed();
    let release!: () => void;
    let entered!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    const started = new Promise<void>(resolve => { entered = resolve; });
    const write = runStorageTransaction('journal_test_read_order', async () => { entered(); await hold; });
    await started;
    let loaded = false;
    const history = loadStoryArchiveHistory().then(value => { loaded = true; return value; });
    await Promise.resolve();
    expect(loaded).toBe(false);
    release();
    await write;
    expect(await history).toEqual({ cycleCount: 0, readIds: {} });
  });

  it('propagates a failed read for retry instead of exposing the corpus or a false empty history', async () => {
    await seed({ conversationReadIds: { fox: ['fx_0_1'] } });
    let failed = false;
    (NativeStorage.getItem as jest.Mock).mockImplementation(async key => {
      if (key === PROGRESS_KEY && !failed) { failed = true; throw new Error('disk unavailable'); }
      return originalRead(key);
    });
    await expect(loadStoryArchiveHistory()).rejects.toThrow('disk unavailable');
    expect((await loadStoryArchiveHistory()).readIds).toEqual({ fox: ['fx_0_1'] });
  });

  it.each([null, [], { fox: null }, { fox: [42] }])('fails closed on malformed receipts: %j', async value => {
    await seed({ conversationReadIds: value as unknown as HomeWorldProgress['conversationReadIds'] });
    await expect(loadStoryArchiveHistory()).rejects.toThrow('could not be read');
  });

  it('fails closed on unsupported receipt versions', async () => {
    await seed({ conversationReadIds: { fox: ['fx_0_1'] }, conversationReadVersion: 2 as 1 });
    await expect(loadStoryArchiveHistory()).rejects.toThrow('could not be read');
  });
});

describe('saved scene transcript', () => {
  const memory: StoryMemory = {
    scene: { id: 'cup', title: 'The cup', memory: 'The answer mattered.', lines: [
      { speaker: 'fox', text: 'Which cup?' }, { speaker: 'narrator', text: 'One has a flower.' },
    ], options: [
      { id: 'flower', label: 'The flower.', response: [{ speaker: 'fox', text: 'This one is yours.' }] },
      { id: 'other', label: 'The other.', response: [{ speaker: 'fox', text: 'An answer you did not choose.' }] },
    ] }, page: 0, completed: false,
  };
  it('keeps unvisited pages and unchosen answers out of an unfinished memory', () => {
    expect(getVisibleStoryMemoryLines(memory, context).map(line => line.text)).toEqual(['Which cup?']);
    expect(getVisibleStoryMemoryLines({ ...memory, page: 2, choice: 'flower' }, context).map(line => line.text))
      .toEqual(['Which cup?', 'One has a flower.', 'This one is yours.']);
  });
  it('filters a restored transcript against the actual current roster', () => {
    expect(getVisibleStoryMemoryLines(memory, { ...context, unlockedAnimals: [] })).toEqual([]);
  });
});
