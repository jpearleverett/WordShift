type Effect = { callback: () => void | (() => void); deps: readonly unknown[] };
let mockState = new Map<number, unknown>();
let mockCursor = 0;
let mockChanged = false;
let mockEffect: Effect;
const mockClosings: { finish: (finished: boolean) => void; stop: jest.Mock }[] = [];
jest.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = mockCursor++;
    if (!mockState.has(index)) mockState.set(index, typeof initial === 'function' ? initial() : initial);
    return [mockState.get(index), (update: unknown) => {
      const previous = mockState.get(index);
      const next = typeof update === 'function' ? update(previous) : update;
      mockChanged ||= !Object.is(previous, next);
      mockState.set(index, next);
    }];
  },
  useEffect: (callback: Effect['callback'], deps: readonly unknown[]) => { mockEffect = { callback, deps }; },
}));
jest.mock('react-native', () => ({
  Animated: {
    Value: class { setValue = jest.fn(); },
    timing: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    parallel: jest.fn(() => {
      let complete: ((event: { finished: boolean }) => void) | undefined;
      const stop = jest.fn(() => complete?.({ finished: false }));
      mockClosings.push({ finish: finished => complete?.({ finished }), stop });
      return { start: (callback: typeof complete) => { complete = callback; }, stop };
    }),
  },
  Easing: { cubic: 0, in: () => 0, out: () => 0 },
}));
import { Animated } from 'react-native';
import { useRowArc } from '../hooks/useRowArc';

// Harness model: React re-renders until a render-phase setState stops changing
// state, then runs the effect's cleanup + setup only when its deps changed
// (the final pass's effect wins). Not modelled: React also re-renders on a
// same-value render-phase set (the hook only sets on change, so harmless),
// prop transitions split across renders (isProcessing), and the ORDER between
// the arc subtree's unmount and the `!visible` reset, which rests on React /
// RN commit ordering rather than on this test.
let previousDeps: readonly unknown[] | undefined;
let cleanup: (() => void) | undefined;
let arc: Animated.Value;
let slots: Animated.Value;
function render(showSlots: boolean, isTarget = true, instant = false, wordCount = 4): boolean {
  let mounted = false;
  let renders = 0;
  do {
    mockCursor = 0;
    mockChanged = false;
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Manual harness settles render updates before committing the animation effect.
    mounted = useRowArc(showSlots, isTarget, instant, arc, slots, wordCount);
    if (++renders > 5) throw new Error('Row arc did not settle its render');
  } while (mockChanged);
  if (!previousDeps || mockEffect.deps.some((value, index) => !Object.is(value, previousDeps?.[index]))) {
    cleanup?.();
    previousDeps = mockEffect.deps;
    cleanup = mockEffect.callback() || undefined;
  }
  return mounted;
}
beforeEach(() => {
  mockState = new Map(); mockCursor = 0; mockChanged = false;
  previousDeps = undefined; cleanup = undefined; mockClosings.length = 0;
  arc = new Animated.Value(0); slots = new Animated.Value(1);
  jest.clearAllMocks();
});
afterEach(() => cleanup?.());

test('select then commit then undo never revives slots without a new selection', () => {
  expect(render(false)).toBe(false);
  expect(render(true)).toBe(true);
  expect(render(false, false)).toBe(false);
  expect(render(false, true)).toBe(false);
  expect(mockClosings).toHaveLength(0);
});

test('reduced motion cancels a collapsing arc and switching it back off keeps the arc hidden', () => {
  render(true);
  expect(render(false)).toBe(true);
  const closing = mockClosings[0];
  expect(render(false, true, true)).toBe(false);
  expect(closing.stop).toHaveBeenCalledTimes(1);
  expect(render(false, true, false)).toBe(false);
  closing.finish(true);
  expect(render(false)).toBe(false);
});

test('an old close completion cannot hide a reopened arc and preview changes keep its animation', () => {
  render(true);
  const openingCalls = jest.mocked(Animated.timing).mock.calls.length;
  render(true);
  expect(jest.mocked(Animated.timing).mock.calls).toHaveLength(openingCalls);
  expect(render(false)).toBe(true);
  const oldClosing = mockClosings[0];
  expect(render(true)).toBe(true);
  expect(oldClosing.stop).toHaveBeenCalledTimes(1);
  oldClosing.finish(true);
  expect(render(true)).toBe(true);
  expect(render(false)).toBe(true);
  mockClosings[1].finish(true);
  expect(render(false)).toBe(false);
});

// Row mounts the arc and standard subtrees under distinct keys, so the end of a
// collapse remounts the row's tiles. A tile that ARRIVED in this row while it
// stayed the target (a double-shift first drop, the winning move) would have
// started its arrival settle inside the arc and replayed it on the fresh
// standard mount. The word count is the board-changed signal that snaps the
// fan instead, handing the arriving tile straight to the standard layout.
test('a letter arriving while the fan is open snaps it away with no close animation', () => {
  expect(render(true)).toBe(true);
  jest.clearAllMocks();
  expect(render(false, true, false, 5)).toBe(false);
  expect(mockClosings).toHaveLength(0);
  expect(arc.setValue).toHaveBeenLastCalledWith(0);
  expect(slots.setValue).toHaveBeenLastCalledWith(1);
});

test('a letter arriving mid-collapse cuts the collapse short', () => {
  render(true);
  expect(render(false)).toBe(true);
  const closing = mockClosings[0];
  expect(render(false, true, false, 5)).toBe(false);
  expect(closing.stop).toHaveBeenCalledTimes(1);
  closing.finish(false);
  expect(render(false, true, false, 5)).toBe(false);
  // The next selection glides open from flat, exactly like a first open.
  expect(render(true, true, false, 5)).toBe(true);
  expect(mockClosings).toHaveLength(1);
});

test('a finished collapse rests the fan flat for the next open', () => {
  render(true);
  expect(render(false)).toBe(true);
  jest.clearAllMocks();
  mockClosings[0].finish(true);
  expect(render(false)).toBe(false);
  expect(arc.setValue).toHaveBeenLastCalledWith(0);
  expect(slots.setValue).toHaveBeenLastCalledWith(1);
});

test('a word-count change while the fan is open keeps it open', () => {
  expect(render(true)).toBe(true);
  expect(render(true, true, false, 5)).toBe(true);
  expect(mockClosings).toHaveLength(0);
});
