import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORY_ART_CATALOG } from '../data/storyArtCatalog';
import { getStoryPageArtIds } from '../services/storyPresentation';
import { getStoryPageArt, STORY_PAGE_IMAGES } from '../components/storyPageArt';
import {
  StoryContext, StoryLine, StoryMemory, StoryScene, StorySceneId, StoryState,
  advanceStoryPage, buildStoryScene, chooseStoryOption, clearStoryState,
  getStoryPages, getStoryPortraitSpeaker, getStorySceneResident, getStoryPresentationPhase,
  invalidateStoryCache, loadStoryState, openStoryScene, STORY_STORAGE_KEY,
} from '../services/storySpine';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage());

const SCENES: StorySceneId[] = ['cup', 'echo', 'witness', 'supper', 'plan', 'shelter',
  'plum', 'plum_recruited', 'record', 'seeds', 'promise', 'returned', 'council', 'after', 'reply', 'old_mark'];
const RESIDENTS = ['fox', 'owl', 'pangolin', 'rabbit', 'wombat', 'tarsier', 'axolotl', 'capybara', 'sloth', 'red_panda'];
const context = (overrides: Partial<StoryContext> = {}): StoryContext => ({
  phase: 5, puzzlesSolved: 200, cycleCount: 0, postRevelation: true,
  unlockedAnimals: RESIDENTS, ritualWord: 'HOME', ...overrides,
});
const state = (overrides: Partial<StoryState> = {}): StoryState => ({
  version: 1, cycle: 0, memories: {}, boundary: null, carriedBoundary: null,
  carriedRecord: false, arrivedBeforeRevision: false, ...overrides,
});
const memoryFor = (scene: StoryScene, overrides: Partial<StoryMemory> = {}): StoryMemory => ({
  scene, page: 0, completed: false, presentationPhase: 3, ...overrides,
});
const legacy = (memory: StoryMemory): StoryMemory => JSON.parse(JSON.stringify(memory,
  (key, value) => key === 'artId' ? undefined : value));

/** Exercise actual authoring paths, including sparse households and decisions
 * made in different orders. Deduplicate scene transcripts so assertions stay
 * compact while still covering all distinct text/callback combinations. */
function authoredVariants(): Map<StorySceneId, StoryScene[]> {
  const result = new Map(SCENES.map(id => [id, new Map<string, StoryScene>()]));
  let seed = 32019;
  const pick = <T,>(values: readonly T[]): T => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return values[(seed >>> 8) % values.length];
  };
  for (let sample = 0; sample < 384; sample += 1) {
    const ctx = context({
      cycleCount: pick([0, 1]),
      unlockedAnimals: sample === 0 ? RESIDENTS : sample === 1 ? ['fox'] : RESIDENTS.filter(() => pick([false, true, true])),
      ritualWord: pick(['HOME', 'STONE', 'a different offering']),
    });
    const progress = state({ cycle: ctx.cycleCount, boundary: pick([null, 'remember', 'release']),
      carriedBoundary: pick([null, 'remember', 'release']), carriedRecord: pick([false, true]),
      arrivedBeforeRevision: pick([false, true]) });
    const choices: Partial<Record<StorySceneId, (string | undefined)[]>> = {
      cup: [undefined, 'flower', 'chip'], witness: [undefined, 'share', 'private'],
      shelter: [undefined, 'road', 'room'], seeds: [undefined, 'confidence', 'share'],
      promise: [undefined, 'beside', 'apart'], record: [undefined, 'keep', 'correct'],
    };
    for (const [sceneId, values] of Object.entries(choices)) {
      const choice = pick(values);
      if (choice) {
        const id = sceneId as StorySceneId;
        progress.memories[id] = memoryFor(buildStoryScene(id, ctx, progress), { choice, completed: true });
      }
    }
    if (pick([false, true])) progress.memories.council = memoryFor(buildStoryScene('council', ctx, progress), { completed: true });
    for (const id of ['plum', 'plum_recruited', 'returned'] as const) {
      if (pick([false, true])) {
        const scene = buildStoryScene(id, { ...ctx, unlockedAnimals: pick([RESIDENTS, ['fox']]) }, progress);
        progress.memories[id] = memoryFor(scene, { completed: true });
      }
    }
    for (const id of SCENES) {
      const scene = buildStoryScene(id, ctx, progress);
      result.get(id)!.set(JSON.stringify(scene), scene);
    }
  }
  return new Map([...result].map(([id, variants]) => [id, [...variants.values()]]));
}
const variants = authoredVariants();

beforeEach(async () => { await clearStoryState(); jest.clearAllMocks(); });

test.each(SCENES)('%s uses a different image for every page, including each selected answer and old saved transcripts', id => {
  for (const scene of variants.get(id)!) {
    for (const choice of [undefined, ...(scene.options?.map(option => option.id) ?? [])]) {
      const memory = memoryFor(scene, { choice });
      const original = JSON.stringify(memory);
      const ids = getStoryPageArtIds(memory);
      const withoutArt = legacy(memory);
      expect(ids).toEqual(getStoryPages(memory).map(line => line.artId));
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every(artId => Object.prototype.hasOwnProperty.call(STORY_PAGE_IMAGES, artId))).toBe(true);
      expect(getStoryPageArtIds(withoutArt)).toEqual(ids);
      expect(JSON.stringify(memory)).toBe(original);
      expect(withoutArt).toEqual(legacy(memory));
    }
  }
});

test('the variant matrix covers every authored illustration, with retrospective cards checked separately', () => {
  const encountered = new Set([...variants.values()].flatMap(scenes => scenes.flatMap(scene =>
    [...scene.lines, ...(scene.options?.flatMap(option => option.response) ?? [])].map(line => line.artId))));
  const expected = STORY_ART_CATALOG.map(art => art.id).filter(id => !id.endsWith('-recollection'));
  expect(expected.filter(id => !encountered.has(id))).toEqual([]);
});

test.each(SCENES)('%s retains its own retrospective illustration before its original pages', id => {
  const scene = variants.get(id)![0];
  const saved = memoryFor({ ...scene, lines: [
    { speaker: 'narrator', text: 'From an earlier evening in the house, a conversation worth keeping.', artId: `${id}-recollection` },
    ...scene.lines,
  ] });
  const ids = getStoryPageArtIds(saved);
  expect(ids[0]).toBe(`${id}-recollection`);
  expect(new Set(ids).size).toBe(ids.length);
  expect(getStoryPageArtIds(legacy(saved))).toEqual(ids);
});

test('earlier unknown wording gets distinct related scene art without editing the frozen text', () => {
  const saved = legacy(memoryFor(buildStoryScene('plum', context(), state())));
  saved.scene.lines[0].text = 'This little fish is PLUM. He swims beside Axel in the aquarium.';
  saved.scene.lines[1].text = 'A crooked bubble floats up past the little fish.';
  const before = JSON.stringify(saved);
  const ids = getStoryPageArtIds(saved);
  expect(ids).toHaveLength(4);
  expect(ids).toEqual([...new Set(ids)]);
  expect(ids.every(id => id.startsWith('plum-'))).toBe(true);
  expect(JSON.stringify(saved)).toBe(before);
});

test('the cup scene shows Ember on her own lines and on narration that names nobody shows no one', () => {
  const scene = buildStoryScene('cup', context(), state());
  for (const choice of ['flower', 'chip']) {
    const saved = memoryFor(scene, { choice });
    // cup-01 Ember, cup-02 narration (no name), cup-03 Ember, response Ember, response narration (no name).
    expect(getStoryPages(saved).map((_, page) => getStoryPortraitSpeaker(saved, page)))
      .toEqual(['fox', null, 'fox', 'fox', null]);
  }
});

test('a narrated page never borrows the face of whoever spoke last', () => {
  const lines: StoryLine[] = [
    { speaker: 'narrator', text: 'A visitor opens the notebook.' },
    { speaker: 'owl', text: 'These are my notes.' },
    { speaker: 'player', text: 'May I read them?' },
    { speaker: 'narrator', text: 'The owl turns a page.' },
    { speaker: 'fox', text: 'I remember that evening.' },
    { speaker: 'narrator', text: 'Archimedes pours the tea for Ember.' },
  ];
  const saved = memoryFor({ id: 'echo', title: 'Kept words', memory: 'A visit', lines });
  expect([0, 1, 2, 3, 4, 5].map(page => getStoryPortraitSpeaker(saved, page)))
    .toEqual([null, 'owl', null, null, 'fox', 'owl']);
  expect(saved.page).toBe(0);
});

test('supper: narration about Ember shows Ember, even after Panko has spoken', () => {
  // The owner-reported case: on the private-witness branch, "Ember glances
  // toward you" ran under Panko's face and name because Panko spoke last.
  const ctx = context();
  const progress = state({ memories: {
    cup: memoryFor(buildStoryScene('cup', ctx, state()), { choice: 'flower', completed: true }),
    witness: memoryFor(buildStoryScene('witness', ctx, state()), { choice: 'private', completed: true }),
  } });
  const saved = memoryFor(buildStoryScene('supper', ctx, progress));
  const pages = getStoryPages(saved);
  expect(pages[0].text).toContain('Ember');
  expect(getStoryPortraitSpeaker(saved, 0)).toBe('fox');
  const glance = pages.findIndex(page => page.text.includes('Ember glances toward you'));
  expect(glance).toBeGreaterThan(0);
  expect(pages.slice(0, glance).some(page => page.speaker === 'pangolin')).toBe(true);
  expect(getStoryPortraitSpeaker(saved, glance)).toBe('fox');
  expect(getStoryPortraitSpeaker(saved, pages.findIndex(page => page.speaker === 'pangolin'))).toBe('pangolin');
});

test('a name is matched whole, never inside another word', () => {
  const saved = memoryFor({ id: 'old_mark', title: 'A quiet hour', memory: 'A mark', lines: [
    { speaker: 'narrator', text: 'The mossy stones are chilly, and a stocking hangs by the hearth.' },
    { speaker: 'owl', text: 'Nobody is here yet.' },
  ] });
  // Moss / Chill / Tock all sit inside those words; none of them is present.
  expect(getStoryPortraitSpeaker(saved, 0)).toBeNull();
});

test('the earliest name in a narrated line is the one drawn', () => {
  const saved = memoryFor({ id: 'old_mark', title: 'A quiet hour', memory: 'A mark', lines: [
    { speaker: 'narrator', text: 'Warren hands the lamp to Ember.' },
  ] });
  expect(getStoryPortraitSpeaker(saved, 0)).toBe('wombat');
});

test('the journal files a scene under its first speaker, else the first resident named, else Ember', () => {
  expect(getStorySceneResident(memoryFor(buildStoryScene('plum', context(), state())))).toBe('axolotl');
  expect(getStorySceneResident(memoryFor({ id: 'old_mark', title: 'x', memory: 'x',
    lines: [{ speaker: 'narrator', text: 'Thyme left the gate open.' }] }))).toBe('rabbit');
  expect(getStorySceneResident(memoryFor({ id: 'old_mark', title: 'x', memory: 'x',
    lines: [{ speaker: 'narrator', text: 'Two chairs sit beside the hearth.' }] }))).toBe('fox');
});

test('resuming and reading an old answered save preserves its text, choice, phase and durable page', async () => {
  const ctx = context({ phase: 1, puzzlesSolved: 22, postRevelation: false });
  const scene = buildStoryScene('cup', ctx, state());
  const saved = legacy(memoryFor(scene, { choice: 'chip', page: 3, completed: false, presentationPhase: 0 }));
  saved.scene.title = 'The title from an earlier release';
  const progress = state({ memories: { cup: saved } });
  await AsyncStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(progress));
  invalidateStoryCache();
  const resumed = (await openStoryScene(ctx, 'cup'))!.memory;
  const beforeReading = await AsyncStorage.getItem(STORY_STORAGE_KEY);
  expect(getStoryPresentationPhase(resumed)).toBe(0);
  const expected = ['cup-01', 'cup-02', 'cup-03', 'cup-06', 'cup-07'];
  expect([3, 2, 1, 0, 4, 3].map(page => getStoryPageArt(resumed, page).id))
    .toEqual([expected[3], expected[2], expected[1], expected[0], expected[4], expected[3]]);
  expect(await AsyncStorage.getItem(STORY_STORAGE_KEY)).toBe(beforeReading);
  expect(resumed).toEqual(saved);
  // Reading earlier pages must not make a recorded choice changeable.
  await chooseStoryOption(ctx, 'cup', 'flower');
  expect((await loadStoryState(ctx)).memories.cup).toEqual(saved);
  await advanceStoryPage(ctx, 'cup');
  const next = (await loadStoryState(ctx)).memories.cup!;
  expect(next).toEqual({ ...saved, page: 4 });
  expect(getStoryPageArtIds(next)).toEqual(expected);
  expect(getStoryPresentationPhase(next)).toBe(0);
});
