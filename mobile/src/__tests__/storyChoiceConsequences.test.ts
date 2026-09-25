import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COUNCIL_UNANSWERED_PROMISE_LINE, STORY_STORAGE_KEY, StoryContext, StoryMemory, StorySceneId, StoryState,
  advanceStoryPage, beginStoryCycle, buildStoryScene, chooseStoryOption,
  clearStoryState, getStoryPages, getStoryWorldKeepsake, invalidateStoryCache,
  loadStoryState, openStoryScene, recordStoryBoundary, selectStoryScene,
} from '../services/storySpine';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage());

const context = (overrides: Partial<StoryContext> = {}): StoryContext => ({
  phase: 0, puzzlesSolved: 6, cycleCount: 0, unlockedAnimals: ['fox'], ...overrides,
});

async function finish(ctx: StoryContext, id: StorySceneId, answer?: string): Promise<void> {
  for (let page = 0; page < 40; page++) {
    const memory = (await loadStoryState(ctx)).memories[id];
    if (!memory || memory.completed) return;
    if (memory.scene.options && !memory.choice && memory.page === memory.scene.lines.length - 1) {
      await chooseStoryOption(ctx, id, answer ?? memory.scene.options[0].id);
    } else {
      await advanceStoryPage(ctx, id);
    }
  }
  throw new Error(`Conversation ${id} did not complete`);
}

async function readAvailable(ctx: StoryContext, answers: Partial<Record<StorySceneId, string>> = {}): Promise<StorySceneId[]> {
  const read: StorySceneId[] = [];
  for (let visit = 0; visit < 25; visit++) {
    const opened = await openStoryScene(ctx);
    if (!opened) return read;
    const id = opened.memory.scene.id;
    read.push(id);
    await finish(ctx, id, answers[id]);
  }
  throw new Error('Story selection did not settle');
}

function answered(state: StoryState, ctx: StoryContext, id: StorySceneId, choice: string): StoryState {
  const scene = buildStoryScene(id, ctx, state);
  expect(scene.options?.some(option => option.id === choice)).toBe(true);
  const memory: StoryMemory = { scene, choice, completed: true, page: 0 };
  return { ...state, memories: { ...state.memories, [id]: memory } };
}

const sceneText = (id: StorySceneId, ctx: StoryContext, state: StoryState): string =>
  buildStoryScene(id, ctx, state).lines.map(line => line.text).join(' ');

beforeEach(async () => { await clearStoryState(); jest.clearAllMocks(); });

test('normal progression delivers three decisions by puzzle 55, with each new choice after its evidence', async () => {
  expect(await readAvailable(context())).toEqual(['cup']);
  expect(await readAvailable(context({ phase: 1, puzzlesSolved: 27 }))).toEqual(['plum']);
  expect(await readAvailable(context({ phase: 1, puzzlesSolved: 28 }), { witness: 'private' }))
    .toEqual(['echo', 'witness']);
  expect(await readAvailable(context({ phase: 2, puzzlesSolved: 54 }))).toEqual(['supper']);
  const ctx = context({ phase: 2, puzzlesSolved: 55 });
  expect(await readAvailable(ctx, { shelter: 'room' })).toEqual(['plan', 'shelter']);
  const state = await loadStoryState(ctx);
  expect(Object.values(state.memories).filter(memory => memory?.choice).map(memory => memory!.scene.id))
    .toEqual(['cup', 'witness', 'shelter']);
  expect(state.memories.record).toBeUndefined();
  expect(state.boundary).toBeNull();
});

test('existing pre-arrival saves receive new followups without rewriting completed conversations or answers', async () => {
  const ctx = context({ phase: 2, puzzlesSolved: 60 });
  const old = await loadStoryState(ctx);
  const oldIds: StorySceneId[] = ['cup', 'plum', 'echo', 'supper', 'plan'];
  for (const id of oldIds) {
    const scene = buildStoryScene(id, ctx, old);
    // A persisted transcript from an older release must remain authoritative.
    scene.lines = [{ speaker: 'narrator', text: `Saved earlier ${id} conversation.` }];
    old.memories[id] = { scene, completed: true, page: 0, ...(id === 'cup' ? { choice: 'chip' } : {}) };
  }
  await AsyncStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(old));
  invalidateStoryCache();
  expect((await openStoryScene(ctx))?.memory.scene.id).toBe('witness');
  await finish(ctx, 'witness', 'share');
  expect((await openStoryScene(ctx))?.memory.scene.id).toBe('shelter');
  await finish(ctx, 'shelter', 'road');
  invalidateStoryCache();
  const updated = await loadStoryState(ctx);
  for (const id of oldIds) expect(updated.memories[id]).toEqual(old.memories[id]);
  expect(updated.memories.witness?.choice).toBe('share');
  expect(updated.memories.shelter?.choice).toBe('road');
  expect(selectStoryScene(ctx, updated)).toBeNull();
});

test.each([
  ['witness', 'share'], ['witness', 'private'], ['shelter', 'road'], ['shelter', 'room'],
] as const)('%s answer %s survives reload and a new-cycle archive without becoming a new answer', async (id, choice) => {
  const ctx = context({ phase: 2, puzzlesSolved: 55 });
  await readAvailable(ctx, { [id]: choice });
  const transcript = (await loadStoryState(ctx)).memories[id]!;
  expect(transcript.choice).toBe(choice);
  invalidateStoryCache();
  expect(getStoryPages((await loadStoryState(ctx)).memories[id]!)).toEqual(getStoryPages(transcript));
  const next = context({ cycleCount: 1, cycleStartPuzzles: 120, puzzlesSolved: 120 });
  await beginStoryCycle(next);
  invalidateStoryCache();
  const state = await loadStoryState(next);
  expect(state.previousCycles?.[0].memories[id]).toEqual(transcript);
  expect(state.memories[id]).toBeUndefined();
  expect(state.boundary).toBeNull();
});

test('existing post-arrival saves receive no invented pre-arrival choices', async () => {
  const ctx = context({ phase: 5, postRevelation: true, puzzlesSolved: 180 });
  expect(await readAvailable(ctx)).toEqual(['after', 'reply']);
  const state = await loadStoryState(ctx);
  expect(state.memories.witness).toBeUndefined();
  expect(state.memories.shelter).toBeUndefined();
  expect(state.boundary).toBeNull();
  expect(getStoryWorldKeepsake(state, ctx)).toBeNull();
});

test.each([
  ['share', ['initials', 'shared table', 'initials']],
  ['private', ['folded account', 'in private', 'folded account']],
] as const)('the %s account changes later conversations without fabricating an answer for older saves', async (choice, markers) => {
  const ctx = context({ phase: 4, puzzlesSolved: 115 });
  const unchanged = await loadStoryState(ctx);
  const changed = answered(unchanged, ctx, 'witness', choice);
  const scenes: StorySceneId[] = ['supper', 'record', 'council'];
  scenes.forEach((id, index) => {
    expect(sceneText(id, ctx, changed)).toContain(markers[index]);
    expect(sceneText(id, ctx, unchanged)).not.toMatch(/dated account|folded account|initials/);
  });
  expect(buildStoryScene('record', ctx, changed).options).toEqual(buildStoryScene('record', ctx, unchanged).options);
});

test.each([
  ['road', ['lamp', 'lamp', 'marked the road']],
  ['room', ['PLEASE KNOCK', 'knock', 'fitted the latch']],
] as const)('the %s preparation affects later conversations while preserving their own decisions', async (choice, markers) => {
  const ctx = context({ phase: 4, puzzlesSolved: 115 });
  const unchanged = await loadStoryState(ctx);
  const changed = answered(unchanged, ctx, 'shelter', choice);
  const scenes: StorySceneId[] = ['seeds', 'promise', 'council'];
  scenes.forEach((id, index) => {
    expect(sceneText(id, ctx, changed)).toContain(markers[index]);
    expect(sceneText(id, ctx, unchanged)).not.toMatch(/lamp|PLEASE KNOCK|latched door|fitted the latch/);
    expect(buildStoryScene(id, ctx, changed).options).toEqual(buildStoryScene(id, ctx, unchanged).options);
  });
});

test.each([
  ['road', 'CLOSED', 'remember', 'Read the page'],
  ['road', 'CLOSER', 'release', 'Walk beyond the trees'],
  ['room', 'CLOSED', 'remember', 'Read the page'],
  ['room', 'CLOSER', 'release', 'Walk beyond the trees'],
] as const)('%s preparation leaves %s as the actual final decision', async (shelter, word, boundary, action) => {
  const ctx = context({ phase: 2, puzzlesSolved: 55 });
  await readAvailable(ctx, { shelter });
  expect((await loadStoryState(ctx)).boundary).toBeNull();
  const final = context({ phase: 4, puzzlesSolved: 116 });
  await recordStoryBoundary(final, word);
  const after = { ...final, phase: 5 as const, postRevelation: true };
  const state = await loadStoryState(after);
  expect(state.boundary).toBe(boundary);
  expect(state.memories.shelter?.choice).toBe(shelter);
  expect(getStoryWorldKeepsake(state, after)).toMatchObject({ boundary, action });
  const result = getStoryWorldKeepsake(state, after)!.result;
  if (shelter === 'room' && boundary === 'release') expect(result).toContain('road, rather than this room');
  if (shelter === 'road' && boundary === 'remember') expect(result).toContain('private room you chose to protect');
});

test.each([
  { unlockedAnimals: [] }, { unlockedAnimals: ['fox'] }, { unlockedAnimals: ['wombat'] },
  { unlockedAnimals: ['fox', 'rabbit', 'capybara', 'owl'] },
])('new decisions and callbacks only use recruited speakers: $unlockedAnimals', async ({ unlockedAnimals }) => {
    const ctx = context({ phase: 5, puzzlesSolved: 120, unlockedAnimals });
    const initial = await loadStoryState(ctx);
    for (const witness of ['share', 'private']) {
      for (const shelter of ['road', 'room']) {
        const state = answered(answered(initial, ctx, 'witness', witness), ctx, 'shelter', shelter);
        const ids: StorySceneId[] = ['witness', 'shelter', 'supper', 'record', 'seeds', 'promise', 'council', 'after'];
        for (const id of ids) {
          const scene = buildStoryScene(id, ctx, state);
          const lines = [...scene.lines, ...(scene.options?.flatMap(option => option.response) ?? [])];
          expect(lines.every(line => ['narrator', 'player', ...unlockedAnimals].includes(line.speaker))).toBe(true);
        }
      }
    }
  },
);

test.each([
  ['witness', 'share', 'initials'], ['witness', 'private', 'account folded'],
  ['shelter', 'road', 'pale stones'], ['shelter', 'room', 'PLEASE KNOCK'],
] as const)('%s answer %s remains visible in both aftermath paths and world inspection', async (id, choice, marker) => {
  const before = context({ phase: 4, puzzlesSolved: 115 });
  const base = await loadStoryState(before);
  const after = { ...before, phase: 5 as const, postRevelation: true };
  for (const boundary of ['remember', 'release'] as const) {
    for (const heardCouncil of [false, true]) {
      const state = answered({ ...base, boundary }, before, id, choice);
      if (heardCouncil) {
        state.memories.council = { scene: buildStoryScene('council', before, state), completed: true, page: 0 };
      }
      const scene = buildStoryScene('after', after, state);
      expect(scene.title).toBe(heardCouncil ? 'An ordinary morning' : 'A small test');
      expect(scene.lines.map(line => line.text).join(' ')).toContain(marker);
      expect(getStoryWorldKeepsake(state, after)?.result).toContain(marker);
      const unanswered = { ...state, memories: { ...state.memories } };
      delete unanswered.memories[id];
      expect(sceneText('after', after, unanswered)).not.toContain(marker);
      expect(getStoryWorldKeepsake(unanswered, after)?.result).not.toContain(marker);
    }
  }
});

test('preparations never fabricate protection before a final word or alter an inherited boundary', async () => {
  const before = context({ phase: 2, puzzlesSolved: 55 });
  const base = await loadStoryState(before);
  const prepared = answered(answered(base, before, 'witness', 'share'), before, 'shelter', 'room');
  expect(getStoryWorldKeepsake(prepared, before)).toBeNull();
  const legacy = { ...before, phase: 5 as const, postRevelation: true };
  expect(sceneText('after', legacy, prepared)).not.toMatch(/initials|PLEASE KNOCK/);
  expect(getStoryWorldKeepsake(prepared, legacy)).toBeNull();
  const inherited: StoryState = { ...prepared, carriedBoundary: 'release' };
  expect(getStoryWorldKeepsake(inherited, before)).toMatchObject({ inherited: true, boundary: 'release' });
  expect(getStoryWorldKeepsake(inherited, before)?.result).not.toMatch(/initials|PLEASE KNOCK/);
});

test('an unanswered promise gets a neutral council line, never the distance the player did not ask for', async () => {
  const ctx = context({ phase: 4, puzzlesSolved: 115, unlockedAnimals: ['fox'], finaleArmed: true });
  const empty = await loadStoryState(ctx);
  const lastLine = (state: StoryState) => buildStoryScene('council', ctx, state).lines.at(-1)!;
  const neutral = lastLine(empty);
  expect(neutral.text).toBe(COUNCIL_UNANSWERED_PROMISE_LINE);
  expect(neutral.text).not.toMatch(/room as you need|beside you/);
  expect(lastLine(answered(empty, ctx, 'promise', 'apart')).text).toMatch(/as much room as you need/);
  expect(lastLine(answered(empty, ctx, 'promise', 'beside')).text).toMatch(/stand beside you/);
});
