/**
 * useSpeedTimer: the in-app `paused` hold (setup menu / rules sheet over a
 * live board) and its interplay with the AppState background pause.
 *
 * Manual synchronous React-hook harness (no renderer): effects run after each
 * render when their deps change, with the previous cleanup invoked first, so
 * the AppState subscription and the pause effect behave as they would live.
 */

type Effect = { deps: unknown[] | undefined; cleanup: void | (() => void) };
const states: unknown[] = [];
const refs: { current: unknown }[] = [];
const effects: Effect[] = [];
const callbacks: { deps: unknown[] | undefined; fn: unknown }[] = [];
let pendingEffects: { index: number; fn: () => void | (() => void); deps: unknown[] | undefined }[] = [];
let stateIndex = 0;
let refIndex = 0;
let effectIndex = 0;
let callbackIndex = 0;

const depsChanged = (next: unknown[] | undefined, prev: unknown[] | undefined) =>
  !next || !prev || next.length !== prev.length || next.some((d, i) => !Object.is(d, prev[i]));

jest.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = stateIndex++;
    if (!(index in states)) states[index] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
    return [states[index], (value: unknown) => {
      states[index] = typeof value === 'function' ? (value as (prev: unknown) => unknown)(states[index]) : value;
    }];
  },
  useRef: (initial: unknown) => {
    const index = refIndex++;
    return refs[index] ??= { current: initial };
  },
  // Memoized like the real hook: a stable identity while deps are unchanged,
  // so the [clearTimer]-keyed unmount cleanup does not fire on every render.
  useCallback: (callback: unknown, deps?: unknown[]) => {
    const index = callbackIndex++;
    const previous = callbacks[index];
    if (previous && !depsChanged(deps, previous.deps)) return previous.fn;
    callbacks[index] = { deps, fn: callback };
    return callback;
  },
  useLayoutEffect: (callback: () => void) => { callback(); },
  useEffect: (fn: () => void | (() => void), deps?: unknown[]) => {
    pendingEffects.push({ index: effectIndex++, fn, deps });
  },
}));

const appStateListeners: ((state: string) => void)[] = [];
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn((_type: string, listener: (state: string) => void) => {
      appStateListeners.push(listener);
      return { remove: () => { const i = appStateListeners.indexOf(listener); if (i >= 0) appStateListeners.splice(i, 1); } };
    }),
  },
}));

import { useSpeedTimer } from '../hooks/useSpeedTimer';
import { SPEED_TIMER_INTERVAL_MS } from '../constants/timing';

const onTimeUp = jest.fn();

function render(paused?: boolean) {
  stateIndex = 0;
  refIndex = 0;
  effectIndex = 0;
  callbackIndex = 0;
  pendingEffects = [];
  // eslint-disable-next-line react-hooks/rules-of-hooks -- controlled hook harness
  const result = useSpeedTimer(onTimeUp, paused);
  for (const effect of pendingEffects) {
    const previous = effects[effect.index];
    if (previous && !depsChanged(effect.deps, previous.deps)) continue;
    if (previous?.cleanup) previous.cleanup();
    effects[effect.index] = { deps: effect.deps, cleanup: effect.fn() };
  }
  return result;
}

function appState(next: string) {
  for (const listener of [...appStateListeners]) listener(next);
}

function tick(seconds: number) {
  jest.advanceTimersByTime(seconds * 1000);
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 8, 14, 12, 0, 0));
  states.length = 0;
  refs.length = 0;
  effects.length = 0;
  callbacks.length = 0;
  appStateListeners.length = 0;
  onTimeUp.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

test('the interval drives the countdown and fires time-up once', () => {
  let [, actions] = render(false);
  actions.startSpeedTimer(3);
  let [state] = render(false);
  expect(state.speedTimeRemaining).toBe(3);
  tick(2);
  [state] = render(false);
  expect(state.speedTimeRemaining).toBe(1);
  tick(1);
  [state, actions] = render(false);
  expect(state.speedTimeRemaining).toBe(0);
  expect(onTimeUp).toHaveBeenCalledTimes(1);
  tick(5);
  expect(onTimeUp).toHaveBeenCalledTimes(1);
});

test('paused stops the clock and resumes from the banked seconds (like the background pause)', () => {
  let [, actions] = render(false);
  actions.startSpeedTimer(30);
  tick(10);
  let [state] = render(false);
  expect(state.speedTimeRemaining).toBe(20);

  // The setup menu opens over the board: the clock holds at 20 no matter how
  // long the menu stays up.
  [state] = render(true);
  tick(45);
  [state] = render(true);
  expect(state.speedTimeRemaining).toBe(20);
  expect(onTimeUp).not.toHaveBeenCalled();

  // Menu closes: the countdown resumes from the bank, not from a fresh 30.
  [state] = render(false);
  expect(state.speedTimeRemaining).toBe(20);
  tick(5);
  [state] = render(false);
  expect(state.speedTimeRemaining).toBe(15);
});

test('a run started while paused shows its full budget and only ticks once the hold lifts', () => {
  // The modifier toggles re-serve the board UNDER the still-open setup menu;
  // App starts the clock as soon as the board is PLAYING. Nothing may drain
  // until the player can actually see the tiles.
  let [, actions] = render(true);
  actions.startSpeedTimer(60);
  let [state] = render(true);
  expect(state.speedTimeRemaining).toBe(60);
  tick(8);
  [state] = render(true);
  expect(state.speedTimeRemaining).toBe(60);

  [state] = render(false);
  tick(3);
  [state] = render(false);
  expect(state.speedTimeRemaining).toBe(57);
});

test('a restart while paused replaces the banked budget', () => {
  let [, actions] = render(false);
  actions.startSpeedTimer(30);
  tick(10);
  render(true);
  [, actions] = render(true);
  // Another toggle re-serves the board: a fresh clock, not 20 + 45.
  actions.startSpeedTimer(45);
  let [state] = render(true);
  expect(state.speedTimeRemaining).toBe(45);
  [state] = render(false);
  tick(1);
  [state] = render(false);
  expect(state.speedTimeRemaining).toBe(44);
});

test('paused is inert while no run is active', () => {
  let [state] = render(true);
  expect(state.speedTimeRemaining).toBeNull();
  [state] = render(false);
  expect(state.speedTimeRemaining).toBeNull();
  expect(onTimeUp).not.toHaveBeenCalled();
});

test('the background pause and the menu hold compose: the clock resumes only when both lift', () => {
  let [, actions] = render(false);
  actions.startSpeedTimer(30);
  tick(5);
  render(true); // menu open (25 banked)
  appState('background');
  tick(100);
  appState('active'); // back in the app, but the menu is still up
  let [state] = render(true);
  expect(state.speedTimeRemaining).toBe(25);
  tick(20);
  [state] = render(true);
  expect(state.speedTimeRemaining).toBe(25);

  [state] = render(false); // menu closes
  tick(5);
  [state] = render(false);
  expect(state.speedTimeRemaining).toBe(20);

  // And the other order: menu closes while backgrounded, resume on active.
  appState('background');
  tick(100);
  [state] = render(true);
  [state] = render(false);
  tick(30);
  [state] = render(false);
  expect(state.speedTimeRemaining).toBe(20);
  appState('active');
  [state] = render(false);
  expect(state.speedTimeRemaining).toBe(20);
  tick(2);
  [state] = render(false);
  expect(state.speedTimeRemaining).toBe(18);
  expect(onTimeUp).not.toHaveBeenCalled();
});

test('stopSpeedTimer while paused clears the run so lifting the hold does not resume it', () => {
  let [, actions] = render(false);
  actions.startSpeedTimer(30);
  tick(5);
  [, actions] = render(true);
  actions.stopSpeedTimer();
  let [state] = render(true);
  expect(state.speedTimeRemaining).toBeNull();
  [state] = render(false);
  tick(10);
  [state] = render(false);
  expect(state.speedTimeRemaining).toBeNull();
  expect(onTimeUp).not.toHaveBeenCalled();
});

test('a transient inactive state never touches a ticking clock', () => {
  let [, actions] = render(false);
  actions.startSpeedTimer(10);
  tick(2);
  appState('inactive');
  appState('active');
  tick(2);
  const [state] = render(false);
  expect(state.speedTimeRemaining).toBe(6);
  expect(SPEED_TIMER_INTERVAL_MS).toBeLessThanOrEqual(1000);
});

test('global overlays pause a live clock and compose with rules and background holds', () => {
  let [, actions] = render(false);
  actions.startSpeedTimer(30);
  tick(8);
  actions.setSpeedTimerOverlayPaused(true);
  render(false);
  tick(60);
  expect(render(false)[0].speedTimeRemaining).toBe(22);
  expect(onTimeUp).not.toHaveBeenCalled();
  render(true);
  actions.setSpeedTimerOverlayPaused(false);
  tick(10);
  expect(render(true)[0].speedTimeRemaining).toBe(22);
  appState('background');
  render(false);
  tick(10);
  expect(render(false)[0].speedTimeRemaining).toBe(22);
  appState('active');
  tick(3);
  expect(render(false)[0].speedTimeRemaining).toBe(19);
});

test('a board started beneath a global overlay waits for that overlay to close', () => {
  const [, actions] = render(false);
  actions.setSpeedTimerOverlayPaused(true);
  actions.startSpeedTimer(12);
  tick(20);
  expect(render(false)[0].speedTimeRemaining).toBe(12);
  expect(onTimeUp).not.toHaveBeenCalled();
  actions.setSpeedTimerOverlayPaused(false);
  tick(12);
  expect(onTimeUp).toHaveBeenCalledTimes(1);
});
