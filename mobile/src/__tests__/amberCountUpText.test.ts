/**
 * AmberCountUpText: the home header's amber number counting itself up.
 * Runs the component against a synchronous hook mock (no renderer here) and
 * a scripted requestAnimationFrame, so the snap/climb semantics the old
 * HomeScreen effect had are pinned on the leaf that replaced it.
 */
const stateStore: Map<number, unknown> = new Map();
let stateIndex = 0;
let effects: (() => void | (() => void))[] = [];
const effectDeps: Map<number, unknown[] | undefined> = new Map();
let effectIndex = 0;
const refStore: Map<number, { current: unknown }> = new Map();
let refIndex = 0;

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    memo: (component: unknown) => component,
    useState: (initial: unknown) => {
      const idx = stateIndex++;
      if (!stateStore.has(idx)) {
        stateStore.set(idx, typeof initial === 'function' ? (initial as () => unknown)() : initial);
      }
      return [stateStore.get(idx), (value: unknown) => { stateStore.set(idx, value); }];
    },
    // Dependency-aware, like React: an effect re-runs only when its deps
    // change, so a re-render with the same value never restarts a climb.
    useEffect: (fn: () => void | (() => void), deps?: unknown[]) => {
      const idx = effectIndex++;
      const previous = effectDeps.get(idx);
      const unchanged = !!previous && !!deps && previous.length === deps.length && previous.every((d, i) => Object.is(d, deps[i]));
      effectDeps.set(idx, deps);
      if (!unchanged) effects.push(fn);
    },
    useRef: (initial: unknown) => {
      const idx = refIndex++;
      if (!refStore.has(idx)) refStore.set(idx, { current: initial });
      return refStore.get(idx)!;
    },
  };
});
// RewardReveal (the shared tick math lives beside its component) pulls the
// usual react-native surface at module scope; stub it the way the other
// component tests do.
jest.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: (s: Record<string, unknown>) => s },
  Animated: {
    View: 'AnimatedView',
    Text: 'AnimatedText',
    Value: class { setValue() {} interpolate() { return 0; } },
    timing: () => ({ start: () => {} }),
    spring: () => ({ start: () => {} }),
    sequence: () => ({ start: () => {} }),
    parallel: () => ({ start: () => {} }),
    loop: () => ({ start: () => {}, stop: () => {} }),
    delay: () => ({ start: () => {} }),
  },
  Easing: { out: (e: unknown) => e, in: (e: unknown) => e, inOut: (e: unknown) => e, cubic: 0, quad: 0, sin: 0 },
}));
jest.mock('../theme/fonts', () => ({ PIXEL_FONT_BOLD: 'Font', BODY_FONT: 'Font', BODY_FONT_BOLD: 'Font', BODY_FONT_ITALIC: 'Font' }));

let mockReducedMotion = false;
jest.mock('../services/settings', () => ({
  getSettingsSync: () => ({ reducedMotion: mockReducedMotion }),
}));
jest.mock('../services/deviceTier', () => ({ shouldSimplifyAnimations: () => false }));

import { AmberCountUpText } from '../components/home/AmberCountUpText';

type Frame = () => void;
let frames: Frame[] = [];
let now = 0;

/** One render pass: build the tree, then commit the effects it queued. */
function pass(value: number, phase: number) {
  stateIndex = 0;
  refIndex = 0;
  effectIndex = 0;
  effects = [];
  const tree = (AmberCountUpText as unknown as (p: unknown) => { props: { children: unknown } })({ value, phase });
  effects.forEach(fn => fn());
  return tree;
}

/** Render a value and read the settled number (a second pass re-runs no effect). */
function render(value: number, phase = 0) {
  pass(value, phase);
  return pass(value, phase).props.children;
}

beforeEach(() => {
  stateStore.clear();
  refStore.clear();
  effectDeps.clear();
  frames = [];
  now = 0;
  mockReducedMotion = false;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  (global as unknown as { requestAnimationFrame: (cb: Frame) => number }).requestAnimationFrame = cb => {
    frames.push(cb);
    return frames.length;
  };
  (global as unknown as { cancelAnimationFrame: (id: number) => void }).cancelAnimationFrame = () => {};
});
afterEach(() => jest.restoreAllMocks());

function runFrames(untilMs: number, stepMs = 16) {
  while (frames.length && now < untilMs) {
    now += stepMs;
    const cb = frames.shift()!;
    cb();
  }
}

test('mounts showing the value (the first read snaps, no climb from zero)', () => {
  expect(render(240)).toBe(240);
  expect(frames).toHaveLength(0);
});

test('a gain climbs on requestAnimationFrame and lands exactly on the total', () => {
  render(100);
  expect(render(160)).toBe(100); // the climb starts from the old value
  expect(frames).toHaveLength(1); // one scheduled frame, not one per render
  runFrames(200);
  const mid = render(160);
  expect(mid).toBeGreaterThan(100);
  expect(mid).toBeLessThan(160);
  runFrames(5000);
  expect(render(160)).toBe(160);
  expect(frames).toHaveLength(0);
});

test('a spend snaps down without ticking', () => {
  render(300);
  expect(render(120)).toBe(120);
  expect(frames).toHaveLength(0);
});

test('reduced motion snaps a gain instantly', () => {
  mockReducedMotion = true;
  render(100);
  expect(render(700)).toBe(700);
  expect(frames).toHaveLength(0);
});
