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

let previousDeps: readonly unknown[] | undefined;
let cleanup: (() => void) | undefined;
let arc: Animated.Value;
let slots: Animated.Value;
function render(showSlots: boolean, isTarget = true, instant = false): boolean {
  let mounted = false;
  let renders = 0;
  do {
    mockCursor = 0;
    mockChanged = false;
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Manual harness settles render updates before committing the animation effect.
    mounted = useRowArc(showSlots, isTarget, instant, arc, slots);
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
