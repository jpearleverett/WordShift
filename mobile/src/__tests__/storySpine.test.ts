import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StoryContext, StorySceneId, advanceStoryPage, beginStoryCycle, buildStoryScene,
  chooseStoryOption, clearStoryState, getStoryPages, invalidateStoryCache,
  loadStoryState, openStoryScene, recordStoryBoundary, selectStoryScene, STORY_STORAGE_KEY,
  getStoryWorldKeepsake, inspectStoryWorld, getStoryPresentationPhase,
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

test('recruiting Axel after the cup fallback still introduces PLUM before his payoff', async () => {
  const early = context({ phase: 1, puzzlesSolved: 18 });
  await openStoryScene(early); await finish(early, 'cup', 'chip');
  await openStoryScene(early); await finish(early, 'plum');
  const recruited = context({ phase: 2, puzzlesSolved: 48, unlockedAnimals: ['fox', 'axolotl'] });
  const setup = await openStoryScene(recruited);
  expect(setup?.memory.scene.id).toBe('plum_recruited');
  expect(setup?.memory.scene.lines.some(line => line.text.includes('This is PLUM'))).toBe(true);
  expect(getStoryPresentationPhase(setup!.memory)).toBe(2);
  await finish(recruited, 'plum_recruited'); invalidateStoryCache();
  const state = await loadStoryState(recruited);
  expect(state.memories.plum?.scene.lines.some(line => line.speaker === 'axolotl')).toBe(false);
  expect(buildStoryScene('returned', { ...recruited, phase: 4, puzzlesSolved: 103 }, state).lines.some(line => line.text.includes('PLUM died'))).toBe(true);
});

test('two earlier cycles keep their real answers while current choices remain independent', async () => {
  const first = context();
  await openStoryScene(first); await finish(first, 'cup', 'flower');
  await recordStoryBoundary(first, 'CLOSER');
  const second = context({ cycleCount: 1, puzzlesSolved: 126, cycleStartPuzzles: 120 });
  await beginStoryCycle(second);
  await openStoryScene(second); await finish(second, 'old_mark');
  await openStoryScene(second); await finish(second, 'cup', 'chip');
  await recordStoryBoundary(second, 'CLOSED');
  const third = context({ cycleCount: 2, puzzlesSolved: 240, cycleStartPuzzles: 240 });
  await beginStoryCycle(third); invalidateStoryCache();
  const kept = await loadStoryState(third);
  expect(kept.memories).toEqual({});
  expect(kept.previousCycles?.map(cycle => [cycle.cycle, cycle.memories.cup?.choice, cycle.boundary]))
    .toEqual([[0, 'flower', 'release'], [1, 'chip', 'remember']]);
  await clearStoryState();
  expect((await loadStoryState(third)).previousCycles).toEqual([]);
});

test('world consequences are hidden before arrival, inspectable afterward and inherited honestly', async () => {
  const before = context({ phase: 4, puzzlesSolved: 116 });
  await recordStoryBoundary(before, 'CLOSER');
  expect(getStoryWorldKeepsake(await loadStoryState(before), before)).toBeNull();
  const after = { ...before, phase: 5 as const, postRevelation: true };
  const road = getStoryWorldKeepsake(await loadStoryState(after), after);
  expect(road?.action).toBe('Walk beyond the trees');
  await inspectStoryWorld(after); invalidateStoryCache();
  expect(getStoryWorldKeepsake(await loadStoryState(after), after)?.inspected).toBe(true);
  const next = context({ cycleCount: 1, cycleStartPuzzles: 120, puzzlesSolved: 120 });
  await beginStoryCycle(next);
  const inherited = getStoryWorldKeepsake(await loadStoryState(next), next);
  expect(inherited?.inherited).toBe(true);
  expect(inherited?.invitation).toContain('old marker');
  expect(inherited?.inspected).toBe(false);
});

test.each(['flower', 'chip'])('the %s cup receives specific callbacks without changing the answer', async choice => {
  const ctx = context();
  await openStoryScene(ctx); await finish(ctx, 'cup', choice);
  const state = await loadStoryState(ctx);
  const text = buildStoryScene('supper', ctx, state).lines.map(line => line.text).join(' ');
  expect(text).toContain(choice === 'flower' ? 'flower cup' : 'chipped cup');
  expect(text).toContain(choice === 'flower' ? 'cocoa' : 'tea');
});

test('full readers get ordinary aftermath while skipped readers retain the small boundary test', async () => {
  const ctx = context({ phase: 4, puzzlesSolved: 115, finaleArmed: true, unlockedAnimals: ['fox', 'pangolin'] });
  await recordStoryBoundary(ctx, 'CLOSED');
  let state = await loadStoryState(ctx);
  expect(buildStoryScene('after', ctx, state).title).toBe('A small test');
  await openStoryScene(ctx); await finish(ctx, 'council');
  state = await loadStoryState(ctx);
  const after = buildStoryScene('after', ctx, state);
  expect(after.title).toBe('An ordinary morning');
  expect(after.lines.some(line => line.speaker === 'pangolin' && line.text.includes('Breakfast'))).toBe(true);
});
