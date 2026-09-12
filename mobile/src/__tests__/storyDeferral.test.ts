import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StoryContext, StorySceneId, advanceStoryPage, canResumeStoryScene,
  chooseStoryOption, clearStoryState, deferStoryScene, invalidateStoryCache,
  loadStoryState, openStoryScene, selectStoryScene,
} from '../services/storySpine';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage());

const context = (overrides: Partial<StoryContext> = {}): StoryContext => ({
  phase: 0, puzzlesSolved: 6, cycleCount: 0, unlockedAnimals: ['fox'], ...overrides,
});

async function finish(ctx: StoryContext, id: StorySceneId): Promise<void> {
  for (let count = 0; count < 30; count++) {
    const memory = (await loadStoryState(ctx)).memories[id];
    if (!memory || memory.completed) return;
    if (memory.scene.options?.length && !memory.choice && memory.page === memory.scene.lines.length - 1) {
      await chooseStoryOption(ctx, id, memory.scene.options[0].id);
    } else await advanceStoryPage(ctx, id);
  }
  throw new Error('Conversation did not finish');
}

async function openPlan(ctx: StoryContext): Promise<void> {
  for (let count = 0; count < 20; count++) {
    const opened = await openStoryScene(ctx);
    if (!opened) throw new Error('Plan was not earned');
    if (opened.memory.scene.id === 'plan') return;
    await finish(ctx, opened.memory.scene.id);
  }
  throw new Error('Plan did not open');
}

beforeEach(async () => { await clearStoryState(); jest.clearAllMocks(); });

test('explicit deferral survives reload, preserves the page and retries after three puzzles', async () => {
  const ctx = context();
  await openStoryScene(ctx);
  await advanceStoryPage(ctx, 'cup');
  const before = (await loadStoryState(ctx)).memories.cup!;
  await deferStoryScene(ctx, 'cup');
  invalidateStoryCache();
  const saved = (await loadStoryState(ctx)).memories.cup!;
  expect(saved).toEqual({ ...before, deferredAtPuzzle: 6 });
  expect(saved.choice).toBeUndefined();
  expect(saved.completed).toBe(false);
  expect(await openStoryScene(ctx)).toBeNull();
  expect(await openStoryScene(context({ puzzlesSolved: 8 }))).toBeNull();
  const retried = await openStoryScene(context({ puzzlesSolved: 9 }));
  expect(retried?.memory).toEqual(before);
});

test('an old deferred passive scene cannot starve a newly due consequential decision', async () => {
  const early = context({ phase: 2, puzzlesSolved: 55 });
  await openPlan(early);
  const original = (await loadStoryState(early)).memories.plan!;
  await deferStoryScene(early, 'plan');
  invalidateStoryCache();
  const later = context({ phase: 3, puzzlesSolved: 80 });
  // Newly introduced mid-story decisions may also be due before the record.
  // All of them get their turn while the old unread plan remains untouched.
  let reachedRecord = false;
  for (let count = 0; count < 20; count++) {
    const next = await openStoryScene(later);
    expect(next?.memory.scene.id).not.toBe('plan');
    if (!next) throw new Error('The next decision was lost');
    if (next.memory.scene.id === 'record') {
      expect(next.memory.scene.options?.length).toBeGreaterThan(1);
      expect(next.memory.choice).toBeUndefined();
      reachedRecord = true;
      break;
    }
    await finish(later, next.memory.scene.id);
  }
  expect(reachedRecord).toBe(true);
  expect((await loadStoryState(later)).memories.plan).toEqual({ ...original, deferredAtPuzzle: 55 });
});

test('journal resume bypasses the delay only for an existing unfinished conversation', async () => {
  const ctx = context();
  await openStoryScene(ctx);
  await advanceStoryPage(ctx, 'cup');
  await deferStoryScene(ctx, 'cup');
  invalidateStoryCache();
  const state = await loadStoryState(ctx);
  expect(selectStoryScene(ctx, state)).toBeNull();
  expect(canResumeStoryScene(ctx, state, 'cup')).toBe(true);
  expect(await openStoryScene(ctx, 'record')).toBeNull();
  const resumed = await openStoryScene(ctx, 'cup');
  expect(resumed?.memory.page).toBe(1);
  expect(resumed?.memory.deferredAtPuzzle).toBeUndefined();
  expect(resumed?.memory.choice).toBeUndefined();
  await finish(ctx, 'cup');
  expect(await openStoryScene(ctx, 'cup')).toBeNull();
});

test('council priority and the arrival interval still protect the ending from historical replays', async () => {
  const early = context({ phase: 2, puzzlesSolved: 55 });
  await openPlan(early);
  await deferStoryScene(early, 'plan');
  const finale = context({ phase: 4, puzzlesSolved: 115, finaleArmed: true });
  expect((await openStoryScene(finale))?.memory.scene.id).toBe('council');
  await deferStoryScene(finale, 'council');
  expect((await openStoryScene(finale))?.memory.scene.id).toBe('council');
  expect(await openStoryScene(finale, 'plan')).toBeNull();
  const arrival = { ...finale, puzzlesSolved: 116, finalPuzzleCompleted: true };
  expect(await openStoryScene(arrival)).toBeNull();
  expect(await openStoryScene(arrival, 'council')).toBeNull();
  const after = { ...arrival, phase: 5 as const, postRevelation: true };
  expect(await openStoryScene(after, 'plan')).toBeNull();
  expect((await openStoryScene(after))?.memory.scene.id).toBe('after');
  const state = await loadStoryState(after);
  expect(state.memories.plan?.completed).toBe(false);
  expect(state.memories.plan?.choice).toBeUndefined();
});

test('a failed deferral never loses the unread memory or silently consumes its answer', async () => {
  const ctx = context();
  await openStoryScene(ctx);
  const original = (await loadStoryState(ctx)).memories.cup;
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  await expect(deferStoryScene(ctx, 'cup')).rejects.toThrow('disk full');
  expect((await loadStoryState(ctx)).memories.cup).toEqual(original);
  expect((await openStoryScene(ctx))?.memory.scene.id).toBe('cup');
});

test('deferring the response preserves an already committed answer and its exact transcript', async () => {
  const ctx = context();
  await openStoryScene(ctx);
  await advanceStoryPage(ctx, 'cup');
  await advanceStoryPage(ctx, 'cup');
  await chooseStoryOption(ctx, 'cup', 'chip');
  const original = (await loadStoryState(ctx)).memories.cup!;
  expect(original.choice).toBe('chip');
  await deferStoryScene(ctx, 'cup');
  invalidateStoryCache();
  expect((await openStoryScene(ctx, 'cup'))?.memory).toEqual(original);
  await chooseStoryOption(ctx, 'cup', 'flower');
  expect((await loadStoryState(ctx)).memories.cup?.choice).toBe('chip');
});
