/**
 * Tests for useVictoryFlow hook — victory stage transitions, the
 * spinner grace window, choreography, and tap-to-skip.
 *
 * Since we run in a Node test environment without a React renderer,
 * we mock React hooks to work synchronously and call the hook directly.
 */

// --- Mock React hooks to run synchronously in Node ---
const stateStore: Map<number, unknown> = new Map();
let stateIndex = 0;
let effectCallbacks: (() => void)[] = [];
const refStore: Map<number, { current: unknown }> = new Map();
let refIndex = 0;

function resetHookState() {
  stateStore.clear();
  refStore.clear();
  stateIndex = 0;
  refIndex = 0;
  effectCallbacks = [];
}

function rewindHookIndices() {
  stateIndex = 0;
  refIndex = 0;
}

jest.mock('react', () => ({
  useState: (initial: unknown) => {
    const idx = stateIndex++;
    if (!stateStore.has(idx)) {
      stateStore.set(idx, initial);
    }
    const value = stateStore.get(idx);
    const setter = (valOrFn: unknown) => {
      if (typeof valOrFn === 'function') {
        stateStore.set(idx, (valOrFn as (prev: unknown) => unknown)(stateStore.get(idx)));
      } else {
        stateStore.set(idx, valOrFn);
      }
    };
    return [value, setter];
  },
  useEffect: (fn: () => void, _deps: unknown[]) => {
    effectCallbacks.push(fn);
  },
  useRef: (initial: unknown) => {
    const idx = refIndex++;
    if (!refStore.has(idx)) {
      refStore.set(idx, { current: initial });
    }
    return refStore.get(idx)!;
  },
  useCallback: (fn: Function, _deps: unknown[]) => fn,
}));

// --- Mock react-native Animated with controllable fakes ---
interface FakeAnim {
  start: jest.Mock;
  stop: jest.Mock;
  /** Simulate the animation completing naturally */
  finish: () => void;
  _callback?: (result: { finished: boolean }) => void;
}

const mockStartedAnims: FakeAnim[] = [];

jest.mock('react-native', () => {
  const makeAnim = (): FakeAnim => {
    const anim: FakeAnim = {
      start: jest.fn((cb?: (r: { finished: boolean }) => void) => {
        anim._callback = cb;
        mockStartedAnims.push(anim);
      }),
      stop: jest.fn(() => {
        const cb = anim._callback;
        anim._callback = undefined;
        cb?.({ finished: false });
      }),
      finish: () => {
        const cb = anim._callback;
        anim._callback = undefined;
        cb?.({ finished: true });
      },
    };
    return anim;
  };
  return {
    Animated: {
      Value: class {
        _value: number;
        constructor(v: number) { this._value = v; }
        setValue(v: number) { this._value = v; }
        interpolate() { return 'interpolated'; }
      },
      spring: jest.fn(() => makeAnim()),
      timing: jest.fn(() => makeAnim()),
      delay: jest.fn(() => makeAnim()),
      stagger: jest.fn(() => makeAnim()),
      sequence: jest.fn(() => makeAnim()),
      parallel: jest.fn(() => makeAnim()),
    },
  };
});

// --- Mock settings (mutable reducedMotion) ---
let mockReducedMotion = false;
jest.mock('../services/settings', () => ({
  getSettingsSync: () => ({ reducedMotion: mockReducedMotion }),
}));

// --- Mock haptics ---
const mockHapticLight = jest.fn();
const mockHapticHeavy = jest.fn();
jest.mock('../services/haptics', () => ({
  hapticLight: () => mockHapticLight(),
  hapticHeavy: () => mockHapticHeavy(),
}));

import { Animated } from 'react-native';
import { useVictoryFlow, VictoryFlowState, VictoryFlowActions } from '../hooks/useVictoryFlow';

function renderHook(): [VictoryFlowState, VictoryFlowActions] {
  rewindHookIndices();
  // eslint-disable-next-line react-hooks/rules-of-hooks -- test harness drives the hook against a manual React mock
  return useVictoryFlow();
}

function valueOf(v: Animated.Value): number {
  return (v as unknown as { _value: number })._value;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  resetHookState();
  mockStartedAnims.length = 0;
  mockReducedMotion = false;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('victory stage transitions', () => {
  test('starts idle with no spinner', () => {
    const [state] = renderHook();
    expect(state.victoryStage).toBe('idle');
    expect(state.isProcessingVictory).toBe(false);
    expect(state.victorySpinnerVisible).toBe(false);
  });

  test('setProcessingVictory(true) enters recording WITHOUT an immediate spinner', () => {
    const [, actions] = renderHook();
    actions.setProcessingVictory(true);
    const [state] = renderHook();
    expect(state.isProcessingVictory).toBe(true);
    expect(state.victoryStage).toBe('recording');
    // The spinner must not flash for the normal brief record gap
    expect(state.victorySpinnerVisible).toBe(false);
  });

  test('spinner only appears when the recording gap outlasts the grace window', () => {
    const [, actions] = renderHook();
    actions.setProcessingVictory(true);
    jest.advanceTimersByTime(399);
    let [state] = renderHook();
    expect(state.victorySpinnerVisible).toBe(false);
    jest.advanceTimersByTime(1);
    [state] = renderHook();
    expect(state.victorySpinnerVisible).toBe(true);
  });

  test('a fast record gap never shows the spinner', () => {
    const [, actions] = renderHook();
    actions.setProcessingVictory(true);
    jest.advanceTimersByTime(100);
    actions.setProcessingVictory(false);
    jest.advanceTimersByTime(5000);
    const [state] = renderHook();
    expect(state.victorySpinnerVisible).toBe(false);
    expect(state.victoryStage).toBe('idle');
    expect(state.isProcessingVictory).toBe(false);
  });

  test('full victory flow: recording -> choreographing -> settled', () => {
    const [, actions] = renderHook();
    // App order: setProcessingVictory(true) -> record -> (false) -> playVictorySequence
    actions.setProcessingVictory(true);
    actions.setProcessingVictory(false);
    actions.playVictorySequence(3);
    let [state] = renderHook();
    expect(state.victoryStage).toBe('choreographing');
    // No spinner during choreography, even past the grace window
    jest.advanceTimersByTime(1000);
    [state] = renderHook();
    expect(state.victorySpinnerVisible).toBe(false);
    // Natural completion of the root animation settles the stage
    const root = mockStartedAnims[mockStartedAnims.length - 1];
    root.finish();
    [state] = renderHook();
    expect(state.victoryStage).toBe('settled');
  });

  test('setProcessingVictory(false) does not clobber a running choreography', () => {
    const [, actions] = renderHook();
    actions.setProcessingVictory(true);
    actions.playVictorySequence(2);
    actions.setProcessingVictory(false);
    const [state] = renderHook();
    expect(state.victoryStage).toBe('choreographing');
  });

  test('playVictorySequence cancels a pending spinner from the recording gap', () => {
    const [, actions] = renderHook();
    actions.setProcessingVictory(true);
    // playVictorySequence arrives before the grace window elapses
    actions.playVictorySequence(1);
    jest.advanceTimersByTime(5000);
    const [state] = renderHook();
    expect(state.victorySpinnerVisible).toBe(false);
  });

  test('resetVictory returns everything to idle and clears the spinner timer', () => {
    const [, actions] = renderHook();
    actions.setVictoryData({ earnedStars: 3 } as never);
    actions.setProcessingVictory(true);
    actions.resetVictory();
    jest.advanceTimersByTime(5000);
    const [state] = renderHook();
    expect(state.victoryData).toBeNull();
    expect(state.isProcessingVictory).toBe(false);
    expect(state.victoryStage).toBe('idle');
    expect(state.victorySpinnerVisible).toBe(false);
  });
});

describe('choreography structure', () => {
  test('modal reveal runs in parallel with the star pops (card carries the wait)', () => {
    const [, actions] = renderHook();
    actions.playVictorySequence(3);
    // Root is a parallel of [modal scale spring, modal opacity timing, delayed star stagger]
    expect(Animated.parallel).toHaveBeenCalledTimes(1);
    expect((Animated.parallel as jest.Mock).mock.calls[0][0]).toHaveLength(3);
    // Stars are delayed slightly, then staggered — never gated behind the modal reveal
    expect(Animated.delay).toHaveBeenCalledWith(150);
    expect(Animated.stagger).toHaveBeenCalledWith(200, expect.any(Array));
    expect((Animated.stagger as jest.Mock).mock.calls[0][1]).toHaveLength(3);
  });

  test('haptic rhythm: tap-tap-tap-THUD synced to star pops', () => {
    const [, actions] = renderHook();
    actions.playVictorySequence(3);
    jest.advanceTimersByTime(249);
    expect(mockHapticLight).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1); // 250ms: first star pop
    expect(mockHapticLight).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(400); // 450ms + 650ms: second and third pops
    expect(mockHapticLight).toHaveBeenCalledTimes(3);
    expect(mockHapticHeavy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2000);
    expect(mockHapticHeavy).toHaveBeenCalledTimes(1);
  });

  test('reducedMotion settles instantly with final values and no animation', () => {
    mockReducedMotion = true;
    const [, actions] = renderHook();
    actions.playVictorySequence(2);
    const [state] = renderHook();
    expect(state.victoryStage).toBe('settled');
    expect(mockStartedAnims).toHaveLength(0);
    expect(valueOf(state.victoryStar1)).toBe(1);
    expect(valueOf(state.victoryStar2)).toBe(1);
    expect(valueOf(state.victoryStar3)).toBe(0);
    expect(valueOf(state.victoryModalScale)).toBe(1);
    expect(valueOf(state.victoryModalOpacity)).toBe(1);
    expect(mockHapticHeavy).toHaveBeenCalledTimes(1);
  });
});

describe('skipToEnd (tap-to-skip)', () => {
  test('skip during choreography stops the animation and settles final values', () => {
    const [, actions] = renderHook();
    actions.playVictorySequence(2);
    const root = mockStartedAnims[mockStartedAnims.length - 1];
    actions.skipToEnd(2);
    expect(root.stop).toHaveBeenCalled();
    const [state] = renderHook();
    expect(state.victoryStage).toBe('settled');
    expect(valueOf(state.victoryStar1)).toBe(1);
    expect(valueOf(state.victoryStar2)).toBe(1);
    expect(valueOf(state.victoryStar3)).toBe(0);
    expect(valueOf(state.victoryModalScale)).toBe(1);
    expect(valueOf(state.victoryModalOpacity)).toBe(1);
  });

  test('skip cancels pending star haptics and fires the settle THUD immediately', () => {
    const [, actions] = renderHook();
    actions.playVictorySequence(3);
    jest.advanceTimersByTime(250); // first star haptic lands
    expect(mockHapticLight).toHaveBeenCalledTimes(1);
    actions.skipToEnd(3);
    expect(mockHapticHeavy).toHaveBeenCalledTimes(1);
    mockHapticLight.mockClear();
    mockHapticHeavy.mockClear();
    jest.advanceTimersByTime(10000);
    // No stale rhythm after the visuals have settled
    expect(mockHapticLight).not.toHaveBeenCalled();
    expect(mockHapticHeavy).not.toHaveBeenCalled();
  });

  test('the stopped animation callback cannot un-settle the stage', () => {
    const [, actions] = renderHook();
    actions.playVictorySequence(1);
    actions.skipToEnd(1);
    // stop() already fired the callback with finished:false; a late finish
    // must not fire again (callback consumed) nor regress the stage
    const root = mockStartedAnims[mockStartedAnims.length - 1];
    root.finish();
    const [state] = renderHook();
    expect(state.victoryStage).toBe('settled');
  });
});
