let mockState: unknown;
let mockChanged = false;
let mockEffect: { callback: () => void | (() => void); deps: readonly unknown[] };
jest.mock('react', () => ({
  useState: (initial: unknown) => {
    mockState ??= typeof initial === 'function' ? initial() : initial;
    return [mockState, (update: unknown) => {
      const next = typeof update === 'function' ? update(mockState) : update;
      mockChanged ||= next !== mockState;
      mockState = next;
    }];
  },
  useEffect: (callback: () => void | (() => void), deps: readonly unknown[]) => { mockEffect = { callback, deps }; },
}));
import { useCountUp } from '../hooks/useCountUp';

let previousDeps: readonly unknown[] | undefined;
let cleanup: (() => void) | undefined;
let now: number;
let nextFrame: number;
let frames: Map<number, Parameters<typeof globalThis.requestAnimationFrame>[0]>;
const originalFrame = globalThis.requestAnimationFrame;
const originalCancel = globalThis.cancelAnimationFrame;

function render(target: number, enabled = true, identity: unknown = 'card') {
  let result!: ReturnType<typeof useCountUp>;
  let renders = 0;
  do {
    mockChanged = false;
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Manual React harness settles guarded render updates before running effects.
    result = useCountUp(target, { enabled, durationMs: 400, identity });
    if (++renders > 4) throw new Error('Count-up did not settle its render');
  } while (mockChanged);
  if (!previousDeps || mockEffect.deps.some((value, index) => value !== previousDeps?.[index])) {
    cleanup?.();
    previousDeps = mockEffect.deps;
    cleanup = mockEffect.callback() || undefined;
  }
  return result;
}
function tick(milliseconds: number) {
  now += milliseconds;
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback(now));
}

beforeEach(() => {
  mockState = undefined; previousDeps = undefined; cleanup = undefined;
  now = 0; nextFrame = 0; frames = new Map();
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  globalThis.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  globalThis.cancelAnimationFrame = id => { if (id != null) frames.delete(id); };
});
afterEach(() => {
  cleanup?.(); jest.restoreAllMocks();
  globalThis.requestAnimationFrame = originalFrame;
  globalThis.cancelAnimationFrame = originalCancel;
});

test('a second balance change continues from the value currently on screen', () => {
  expect(render(10).value).toBe(10);
  expect(render(20).running).toBe(true);
  tick(200);
  expect(render(20).value).toBe(15);
  expect(render(30).value).toBe(15);
  tick(400);
  expect(render(30)).toEqual({ value: 30, running: false });
});

test('reduced motion immediately snaps and cancels an in-progress count', () => {
  render(10); render(20); tick(100);
  expect(render(20, false)).toEqual({ value: 20, running: false });
  expect(frames.size).toBe(0);
  tick(400);
  expect(render(20, false).value).toBe(20);
});

test('a new modal presentation snaps to its own balance and rejects an old queued frame', () => {
  render(10); render(20);
  const stale = [...frames.values()][0];
  expect(render(100, true, 'next-card')).toEqual({ value: 100, running: false });
  stale(500);
  expect(render(100, true, 'next-card').value).toBe(100);
  expect(frames.size).toBe(0);
});
