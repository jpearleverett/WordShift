import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StoryContext, StorySceneId, advanceStoryPage, beginStoryCycle, buildStoryScene,
  chooseStoryOption, clearStoryState, getStoryPages, invalidateStoryCache,
  loadStoryState, openStoryScene, recordStoryBoundary, selectStoryScene, STORY_STORAGE_KEY,
} from '../services/storySpine';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage());
const context = (overrides: Partial<StoryContext> = {}): StoryContext => ({
  phase: 0, puzzlesSolved: 6, cycleCount: 0, unlockedAnimals: ['fox'], ...overrides,
});
async function finish(ctx: StoryContext, id: StorySceneId, choice?: string) {
  for (let i = 0; i < 30; i++) {
    const state = await loadStoryState(ctx);
    const memory = state.memories[id];
    if (!memory || memory.completed) return;
    if (memory.scene.options && !memory.choice && memory.page === memory.scene.lines.length - 1) {
      await chooseStoryOption(ctx, id, choice ?? memory.scene.options[0].id);
    } else await advanceStoryPage(ctx, id);
  }
  throw new Error('Conversation did not complete');
}
beforeEach(async () => { await clearStoryState(); jest.clearAllMocks(); });

test('unread pages survive closing and a cold reload without burning a choice', async () => {
  const ctx = context();
  await openStoryScene(ctx);
  await advanceStoryPage(ctx, 'cup');
  invalidateStoryCache();
  const resumed = await openStoryScene(ctx);
  expect(resumed?.memory.page).toBe(1);
  expect(resumed?.memory.completed).toBe(false);
  await chooseStoryOption(ctx, 'cup', 'chip');
  expect((await loadStoryState(ctx)).memories.cup?.choice).toBeUndefined();
  await finish(ctx, 'cup', 'chip');
  invalidateStoryCache();
  const kept = (await loadStoryState(ctx)).memories.cup!;
  expect(kept.choice).toBe('chip');
  expect(kept.completed).toBe(true);
  expect(getStoryPages(kept).at(-1)?.text).toContain('cocoa');
  await chooseStoryOption(ctx, 'cup', 'flower');
  expect((await loadStoryState(ctx)).memories.cup?.choice).toBe('chip');
});

test('a rejected save leaves the visible page and answer unchanged for retry', async () => {
  const ctx = context(); await openStoryScene(ctx);
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  await expect(advanceStoryPage(ctx, 'cup')).rejects.toThrow('disk full');
  expect((await loadStoryState(ctx)).memories.cup?.page).toBe(0);
  await advanceStoryPage(ctx, 'cup');
  expect((await loadStoryState(ctx)).memories.cup?.page).toBe(1);
});

test('sparse visits cannot strand the explanation or falsely name unrecruited witnesses', async () => {
  const ctx = context({ phase: 4, puzzlesSolved: 115, finaleArmed: true });
  const opened = await openStoryScene(ctx);
  expect(opened?.memory.scene.id).toBe('council');
  expect(opened?.memory.scene.lines.every(line => ['fox', 'narrator', 'player'].includes(line.speaker))).toBe(true);
  expect(opened?.memory.scene.lines.map(line => line.text).join(' ')).toContain('CLOSED');
});

test('the actual last word persists once, survives a new cycle, and clears on Reset All', async () => {
  const ctx = context({ phase: 4, puzzlesSolved: 116 });
  await recordStoryBoundary(ctx, 'CLOSED');
  await recordStoryBoundary(ctx, 'CLOSER');
  expect((await loadStoryState(ctx)).boundary).toBe('remember');
  const next = context({ cycleCount: 1, puzzlesSolved: 119, cycleStartPuzzles: 116 });
  await beginStoryCycle(next);
  invalidateStoryCache();
  const carried = await loadStoryState(next);
  expect(carried.boundary).toBeNull(); expect(carried.carriedBoundary).toBe('remember');
  expect(selectStoryScene(next, carried)).toBe('old_mark');
  expect(buildStoryScene('old_mark', next, carried).lines.some(line => line.text.includes('corrected'))).toBe(true);
  await clearStoryState();
  expect((await loadStoryState(context())).carriedBoundary).toBeNull();
});

test('old completed saves enter the aftermath without inventing a final decision', async () => {
  const ctx = context({ phase: 5, postRevelation: true, puzzlesSolved: 250 });
  const opened = await openStoryScene(ctx);
  expect(opened?.state.arrivedBeforeRevision).toBe(true);
  expect(opened?.state.boundary).toBeNull();
  expect(opened?.memory.scene.id).toBe('after');
});

test('the arrival interval cannot schedule a stale council after the entity arrived', async () => {
  const ctx = context({ phase: 4, puzzlesSolved: 116, finalPuzzleCompleted: true });
  expect(await openStoryScene(ctx)).toBeNull();
});

test.each(['invalid json', JSON.stringify({version: 1, cycle: 0, memories: {cup: {bad: true}}, boundary: null})])(
  'malformed memory data can recover safely: %s', async raw => {
    await AsyncStorage.setItem(STORY_STORAGE_KEY, raw); invalidateStoryCache();
    expect((await openStoryScene(context()))?.memory.scene.id).toBe('cup');
  });

test('a legacy post-arrival save in a later cycle enters After before a bright-day echo', async () => {
  const ctx = context({ phase: 5, postRevelation: true, cycleCount: 1, cycleStartPuzzles: 120, puzzlesSolved: 240 });
  const opened = await openStoryScene(ctx);
  expect(opened?.memory.scene.id).toBe('after');
  expect(opened?.state.arrivedBeforeRevision).toBe(true);
  await finish(ctx, 'after');
  expect((await openStoryScene(ctx))?.memory.scene.id).toBe('reply');
  await finish(ctx, 'reply', 'uncertain');
  expect(await openStoryScene(ctx)).toBeNull();
});
