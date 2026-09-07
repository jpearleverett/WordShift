/**
 * The arrival gate must deliver every mark exactly once, on the pass React
 * COMMITS, and never again after a layout flip.
 *
 * Same manual hook harness as rowArcLifecycle.test.ts: a render re-runs until
 * no render-phase setState changes state (React re-invokes the component while
 * it schedules render-phase updates; the final pass is what commits), and the
 * fan hook's effect runs when its deps change. The two hooks are composed the
 * way Row composes them, because the defect this pins lived in their
 * interaction: a drop from the fan lands the arc -> standard flip and the
 * arrival mark in ONE render, and a gate that recorded the pre-flip generation
 * (or a fan hook that returned the stale `visible`) withheld the first
 * delivery of every tap-committed arrival while every source pin stayed green.
 */
type Effect = { callback: () => void | (() => void); deps: readonly unknown[] };
let mockState = new Map<number, unknown>();
let mockCursor = 0;
let mockChanged = false;
let mockEffect: Effect | null = null;
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
import { useArrivalGate } from '../hooks/useArrivalGate';

type Mark = { letterId: string; moveId: number };
type RowProps = { isTarget: boolean; selected: boolean; words: string[]; arrival: Mark | null };

let previousDeps: readonly unknown[] | undefined;
let cleanup: (() => void) | undefined;
let arc: Animated.Value;
let slots: Animated.Value;

/** One committed render of a Row-shaped component: the fan hook then the gate. */
function render(props: RowProps): { arcMounted: boolean; tileArrival: Mark | null } {
  let result = { arcMounted: false, tileArrival: null as Mark | null };
  let renders = 0;
  do {
    mockCursor = 0;
    mockChanged = false;
    const showSlots = props.isTarget && props.selected;
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Manual harness settles render updates before committing.
    const arcMounted = useRowArc(showSlots, props.isTarget, false, arc, slots, props.words.length);
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Same harness, same component.
    const tileArrival = useArrivalGate(props.arrival, arcMounted);
    result = { arcMounted, tileArrival };
    if (++renders > 10) throw new Error('Row did not settle its render');
  } while (mockChanged);
  if (mockEffect && (!previousDeps || mockEffect.deps.some((value, index) => !Object.is(value, previousDeps?.[index])))) {
    cleanup?.();
    previousDeps = mockEffect.deps;
    cleanup = mockEffect.callback() || undefined;
  }
  return result;
}

beforeEach(() => {
  mockState = new Map(); mockCursor = 0; mockChanged = false; mockEffect = null;
  previousDeps = undefined; cleanup = undefined; mockClosings.length = 0;
  arc = new Animated.Value(0); slots = new Animated.Value(1);
  jest.clearAllMocks();
});
afterEach(() => cleanup?.());

const W4 = ['a', 'b', 'c', 'd'];
const W5 = ['a', 'b', 'X', 'c', 'd'];
const W6 = ['a', 'b', 'X', 'c', 'Y', 'd'];
const markX: Mark = { letterId: 'X', moveId: 1 };
const markY: Mark = { letterId: 'Y', moveId: 2 };

test('a single-shift commit delivers the mark on the committed pass and keeps it across same-layout re-renders', () => {
  expect(render({ isTarget: true, selected: false, words: W4, arrival: null }).arcMounted).toBe(false);
  expect(render({ isTarget: true, selected: true, words: W4, arrival: null }).arcMounted).toBe(true);
  // The drop: the row flips target -> source and receives the mark in ONE render.
  const commit = render({ isTarget: false, selected: false, words: W5, arrival: markX });
  expect(commit.arcMounted).toBe(false);
  expect(commit.tileArrival).toBe(markX);
  // Picking in the now-source row never flips the layout, so the prop is stable
  // (a change would run the tile's effect cleanup and cut the settle short).
  expect(render({ isTarget: false, selected: true, words: W5, arrival: markX }).tileArrival).toBe(markX);
  expect(render({ isTarget: false, selected: false, words: W5, arrival: markX }).tileArrival).toBe(markX);
});

test('a double-shift first drop delivers once, then every fan toggle mounts the tile at rest', () => {
  render({ isTarget: true, selected: false, words: W4, arrival: null });
  expect(render({ isTarget: true, selected: true, words: W4, arrival: null }).arcMounted).toBe(true);
  // drop1: the row STAYS the target; the word count snaps the fan; mark X lands.
  const drop1 = render({ isTarget: true, selected: false, words: W5, arrival: markX });
  expect(drop1.arcMounted).toBe(false);
  expect(drop1.tileArrival).toBe(markX);
  expect(mockClosings).toHaveLength(0);
  // pick2: the fan reopens (a flip); the mark is still on the row but must not re-deliver.
  const pick2 = render({ isTarget: true, selected: true, words: W5, arrival: markX });
  expect(pick2.arcMounted).toBe(true);
  expect(pick2.tileArrival).toBeNull();
  // deselect: graceful collapse, then the standard layout remounts. Still no replay.
  const collapsing = render({ isTarget: true, selected: false, words: W5, arrival: markX });
  expect(collapsing.arcMounted).toBe(true);
  expect(collapsing.tileArrival).toBeNull();
  mockClosings[0].finish(true);
  const settled = render({ isTarget: true, selected: false, words: W5, arrival: markX });
  expect(settled.arcMounted).toBe(false);
  expect(settled.tileArrival).toBeNull();
  // pick2 again, then drop2: a NEW mark, delivered exactly once on its own pass.
  expect(render({ isTarget: true, selected: true, words: W5, arrival: markX }).tileArrival).toBeNull();
  const drop2 = render({ isTarget: true, selected: false, words: W6, arrival: markY });
  expect(drop2.arcMounted).toBe(false);
  expect(drop2.tileArrival).toBe(markY);
});

test('a mark landing on a row that is not flipping is delivered', () => {
  render({ isTarget: false, selected: false, words: W4, arrival: null });
  expect(render({ isTarget: false, selected: false, words: W5, arrival: markX }).tileArrival).toBe(markX);
});
