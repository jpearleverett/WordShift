/**
 * Tests for the onboarding state machine's resume-resilience contract, the
 * skip clean-exit contract, and the pit offer-complete tap-to-continue
 * contract.
 *
 * `normalizeResumeStep` is the guard that prevents a brand-new player from
 * being stranded if the app is killed mid-onboarding: transient steps (which
 * only exist during a setTimeout transition and have no owning screen on
 * relaunch) must snap forward to a stable, resumable target. A regression here
 * re-opens the first-session soft-lock, so it is pinned directly.
 *
 * `handleSkipOnboarding` must be a CLEAN exit from EVERY step: onboarding step
 * 'complete' persisted, the guided board abandoned (cleared + autosave
 * dropped), and the player landed on home — never a guided board in limbo
 * with dashed highlights and no instructions. A confirmed "Skip it all" from
 * the home intro dialogue (home_empty/fox_invited) must NOT route the player
 * INTO the tutorial puzzle it just promised to skip.
 */

// --- Mock React hooks to run synchronously in Node (no renderer) ---
const stateStore: Map<number, unknown> = new Map();
let stateIndex = 0;
let effectCallbacks: Array<() => void> = [];
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

/** Invoke and drain all pending effects (mount effects run once). */
function runEffects() {
  const fns = effectCallbacks.splice(0);
  fns.forEach(fn => fn());
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

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

// useOnboardingFlow transitively pulls in RN-backed modules (Tutorial component,
// expo-haptics) that don't load in the Node test env — stub the side-effectful deps.
jest.mock('../components/Tutorial', () => ({
  hasTutorialCompleted: jest.fn(async () => false),
  markTutorialCompleted: jest.fn(async () => {}),
}));
jest.mock('../services/haptics', () => ({
  hapticLight: jest.fn(),
  hapticSelection: jest.fn(),
}));
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
}));
jest.mock('../services/amberCurrency', () => ({
  markTutorialSeedsPlanted: jest.fn(async () => {}),
}));
jest.mock('../services/puzzleSaveState', () => ({
  clearPuzzleState: jest.fn(async () => {}),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useOnboardingFlow,
  normalizeResumeStep,
  OnboardingCallbacks,
} from '../hooks/useOnboardingFlow';
import {
  ONBOARDING_FOX_LINES,
  OnboardingStep,
  getOnboardingStep,
  setOnboardingStep,
  resetOnboarding,
} from '../services/onboarding';
import { markTutorialCompleted } from '../components/Tutorial';
import { clearPuzzleState } from '../services/puzzleSaveState';

const ALL_STEPS: OnboardingStep[] = [
  'not_started', 'cold_open_puzzle', 'home_empty', 'fox_invited', 'going_to_puzzle',
  'puzzle_tutorial', 'puzzle_complete', 'going_to_pit', 'pit_intro',
  'pit_offering', 'returning_home', 'unlock_explained', 'complete',
];

// Transient steps that exist only for a transition window and must resume forward.
const TRANSIENT_TO_STABLE: Record<string, OnboardingStep> = {
  going_to_puzzle: 'puzzle_tutorial',
  puzzle_complete: 'puzzle_tutorial',
  going_to_pit: 'pit_intro',
  returning_home: 'unlock_explained',
};

describe('normalizeResumeStep (first-session resume resilience)', () => {
  test('every transient step snaps forward to its stable resumable target', () => {
    for (const [from, to] of Object.entries(TRANSIENT_TO_STABLE)) {
      expect(normalizeResumeStep(from as OnboardingStep)).toBe(to);
    }
  });

  test('stable steps are returned unchanged', () => {
    const stable = ALL_STEPS.filter(s => !(s in TRANSIENT_TO_STABLE));
    for (const s of stable) {
      expect(normalizeResumeStep(s)).toBe(s);
    }
  });

  test('normalization is a fixed point — a resumed step never maps to a transient step', () => {
    for (const s of ALL_STEPS) {
      const once = normalizeResumeStep(s);
      // Re-normalizing the target must be stable (no transient target leaks through).
      expect(normalizeResumeStep(once)).toBe(once);
      expect(once in TRANSIENT_TO_STABLE).toBe(false);
    }
  });
});

describe('onboarding guided-step copy (no blank Fox guide on resume)', () => {
  // The steps a player can actually resume onto that drive a FoxGuide must have
  // non-empty copy, or the resume lands on a guide with nothing to say.
  // (puzzle_tutorial keys into the *_intro line set; pit_offering into *_complete.)
  const resumeCopyKeys = [
    'home_empty',
    'fox_invited',
    'puzzle_tutorial_intro',
    'pit_intro',
    'pit_offering_complete',
    'unlock_explained',
  ];

  test('each guided resume step has at least one non-empty line', () => {
    for (const key of resumeCopyKeys) {
      const lines = ONBOARDING_FOX_LINES[key];
      expect(Array.isArray(lines)).toBe(true);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.join('').trim().length).toBeGreaterThan(0);
    }
  });

  test('the reinforcement line wired after the first move exists', () => {
    // App.tsx renders puzzle_tutorial_valid_move once after the first guided
    // move — guard that the copy it references is present.
    const lines = ONBOARDING_FOX_LINES.puzzle_tutorial_valid_move;
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].trim().length).toBeGreaterThan(0);
  });

  test('the closing beat tells the player how to reach the pit again', () => {
    // The in-world entrance below the house is the only route back to the
    // pit after onboarding — the final Fox lines must point at it.
    const allText = ONBOARDING_FOX_LINES.unlock_explained.join(' ').toLowerCase();
    expect(allText).toContain('pit');
    expect(allText).toContain('below the house');
  });
});

// ---------------------------------------------------------------------------
// handleSkipOnboarding — clean-exit contract (hook-level)
// ---------------------------------------------------------------------------

function makeCallbacks() {
  return {
    // Simulate App's transitionTo: swap + run the swap callback.
    transitionTo: jest.fn((_screen: string, cb?: () => void) => { cb?.(); }),
    startNewGame: jest.fn(),
    setGameState: jest.fn(),
    clearBoard: jest.fn(),
    setShowConfetti: jest.fn(),
    refreshStats: jest.fn(),
    resetVictory: jest.fn(),
  };
}

type MockCallbacks = ReturnType<typeof makeCallbacks>;

/** Flush chained promises/microtasks (AsyncStorage mock resolves immediately). */
async function flushAsync(rounds = 20) {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

/** Render the hook fresh against the shared synchronous state store. */
function renderOnboardingHook(cbs: MockCallbacks) {
  rewindHookIndices();
  // eslint-disable-next-line react-hooks/rules-of-hooks -- test harness drives the hook against a manual React mock
  return useOnboardingFlow(cbs as unknown as OnboardingCallbacks);
}

/** Boot the hook at a persisted step: initial render + mount effects + settle. */
async function mountAtStep(step: OnboardingStep, cbs: MockCallbacks) {
  await setOnboardingStep(step);
  renderOnboardingHook(cbs);
  runEffects();
  await flushAsync();
  return renderOnboardingHook(cbs);
}

describe('fresh-install cold open', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    resetHookState();
    await (AsyncStorage.clear as jest.Mock)();
    await resetOnboarding();
  });

  test('persists cold_open_puzzle as the first step', async () => {
    const cbs = makeCallbacks();
    const [state] = await mountAtStep('not_started', cbs);

    expect(state.onboardingStep).toBe('cold_open_puzzle');
    expect(state.onboardingReady).toBe(true);
    expect(await getOnboardingStep()).toBe('cold_open_puzzle');
  });
});

describe('fox invitation handoff', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    resetHookState();
    await (AsyncStorage.clear as jest.Mock)();
    await resetOnboarding();
  });

  test('routes directly to the pit tutorial without starting a second puzzle', async () => {
    jest.useFakeTimers();
    try {
      const cbs = makeCallbacks();
      await mountAtStep('fox_invited', cbs);

      for (let i = 0; i < ONBOARDING_FOX_LINES.fox_invited.length; i++) {
        const [, actions] = renderOnboardingHook(cbs);
        await actions.handleOnboardingContinue();
        await flushAsync();
      }

      expect(await getOnboardingStep()).toBe('going_to_pit');
      jest.runAllTimers();
      await flushAsync();

      expect(await getOnboardingStep()).toBe('pit_intro');
      expect(cbs.transitionTo).toHaveBeenCalledWith('pit', expect.any(Function));
      expect(cbs.startNewGame).not.toHaveBeenCalled();
      expect(cbs.transitionTo).not.toHaveBeenCalledWith('puzzle', expect.any(Function));
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('handleSkipOnboarding (clean exit, no guided-board limbo)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    resetHookState();
    await (AsyncStorage.clear as jest.Mock)();
    await resetOnboarding();
  });

  test('skip during the cold open completes onboarding, clears the board, and lands on home', async () => {
    const cbs = makeCallbacks();
    const [state, actions] = await mountAtStep('cold_open_puzzle', cbs);
    expect(state.onboardingStep).toBe('cold_open_puzzle');
    expect(state.isOnboarding).toBe(true);

    await actions.handleSkipOnboarding();
    await flushAsync();

    // Onboarding fully complete — and persisted, so a relaunch stays free.
    expect(markTutorialCompleted).toHaveBeenCalled();
    expect(await getOnboardingStep()).toBe('complete');

    // The hook's own state collapses every derived tutorial surface
    // (FoxGuide gating, tutorialGuidance, row guidance highlights).
    const [after] = renderOnboardingHook(cbs);
    expect(after.onboardingStep).toBe('complete');
    expect(after.isOnboarding).toBe(false);
    expect(after.pitOfferDone).toBe(false);

    // The player is taken home, and the guided board is abandoned: cleared
    // in memory AND its autosave dropped so Play starts a fresh puzzle.
    expect(cbs.transitionTo).toHaveBeenCalledWith('home', expect.any(Function));
    expect(cbs.clearBoard).toHaveBeenCalled();
    expect(clearPuzzleState).toHaveBeenCalled();

    // Transient tutorial remnants are torn down.
    expect(cbs.setShowConfetti).toHaveBeenCalledWith(false);
    expect(cbs.resetVictory).toHaveBeenCalled();
  });

  test('skip cancels pending step-transition timers so they cannot resurrect onboarding', async () => {
    jest.useFakeTimers();
    try {
      const cbs = makeCallbacks();
      // puzzle_complete is transient (a mount normalizes it away), so reach it
      // in-session the way App.tsx does after the tutorial victory.
      const [, mounted] = await mountAtStep('puzzle_tutorial', cbs);
      await mounted.advanceOnboarding('puzzle_complete');
      await flushAsync();

      // Tap through the completion beat; the final tap queues the
      // going_to_pit → pit_intro transition timer.
      const lines = ONBOARDING_FOX_LINES.puzzle_tutorial_complete;
      for (let i = 0; i < lines.length; i++) {
        const [, actions] = renderOnboardingHook(cbs);
        await actions.handleOnboardingContinue();
        await flushAsync();
      }
      expect(await getOnboardingStep()).toBe('going_to_pit');

      const [, freshActions] = renderOnboardingHook(cbs);
      await freshActions.handleSkipOnboarding();
      await flushAsync();
      expect(await getOnboardingStep()).toBe('complete');

      // If the queued transition survived the skip it would advance the
      // step to pit_intro — it must not.
      jest.runAllTimers();
      await flushAsync();
      expect(await getOnboardingStep()).toBe('complete');
      const [after] = renderOnboardingHook(cbs);
      expect(after.isOnboarding).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  test('skip during the fox_invited dialogue is a FULL exit: complete, home, no tutorial', async () => {
    jest.useFakeTimers();
    try {
      const cbs = makeCallbacks();
      const [, actions] = await mountAtStep('fox_invited', cbs);

      await actions.handleSkipOnboarding();
      await flushAsync();

      // "Skip it all" means skip it all — onboarding completes and persists.
      expect(markTutorialCompleted).toHaveBeenCalled();
      expect(await getOnboardingStep()).toBe('complete');

      // The player lands on the full home screen, never the guided puzzle.
      expect(cbs.transitionTo).toHaveBeenCalledWith('home', expect.any(Function));
      expect(cbs.transitionTo).not.toHaveBeenCalledWith('puzzle', expect.any(Function));
      expect(cbs.startNewGame).not.toHaveBeenCalled();

      // No queued transition may resurrect the tutorial after the skip.
      jest.runAllTimers();
      await flushAsync();
      expect(await getOnboardingStep()).toBe('complete');
      expect(cbs.transitionTo).not.toHaveBeenCalledWith('puzzle', expect.any(Function));
    } finally {
      jest.useRealTimers();
    }
  });

  test('skip from home_empty (before Fox is even invited) also completes cleanly', async () => {
    jest.useFakeTimers();
    try {
      const cbs = makeCallbacks();
      const [, actions] = await mountAtStep('home_empty', cbs);

      await actions.handleSkipOnboarding();
      await flushAsync();

      expect(markTutorialCompleted).toHaveBeenCalled();
      expect(await getOnboardingStep()).toBe('complete');
      expect(cbs.transitionTo).toHaveBeenCalledWith('home', expect.any(Function));
      expect(cbs.startNewGame).not.toHaveBeenCalled();

      const [after] = renderOnboardingHook(cbs);
      expect(after.isOnboarding).toBe(false);

      jest.runAllTimers();
      await flushAsync();
      expect(await getOnboardingStep()).toBe('complete');
    } finally {
      jest.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// handlePitOnboardingOfferComplete — tap-to-continue contract (no auto-return)
// ---------------------------------------------------------------------------
// The old behavior auto-returned home ~1.5s after the last word was offered,
// which yanked the completion line away before the player could read it. The
// fixed behavior: offer-complete flips pitOfferDone (FoxGuide switches to the
// completion beat, which now shows a continue button) and WAITS — the player
// taps "Let's go home!" to route home via handleOnboardingContinue.

describe('handlePitOnboardingOfferComplete (tap-to-continue, no auto-return)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    resetHookState();
    await (AsyncStorage.clear as jest.Mock)();
    await resetOnboarding();
  });

  test('offer-complete flips pitOfferDone, resets the line index, and schedules NO return-home timer', async () => {
    jest.useFakeTimers();
    try {
      const cbs = makeCallbacks();
      const [, actions] = await mountAtStep('pit_offering', cbs);

      // Seed a stale line index (state slot 1 = onboardingLineIndex in hook
      // declaration order) to prove the completion beat starts at line 0.
      stateStore.set(1, 1);

      actions.handlePitOnboardingOfferComplete();

      const [state] = renderOnboardingHook(cbs);
      expect(state.pitOfferDone).toBe(true);
      expect(state.onboardingLineIndex).toBe(0);
      expect(state.onboardingStep).toBe('pit_offering');
      expect(cbs.refreshStats).toHaveBeenCalled();

      // No auto-return: nothing is queued, and even draining every timer
      // must leave the player at the pit until they tap continue.
      expect(jest.getTimerCount()).toBe(0);
      jest.runAllTimers();
      await flushAsync();
      expect(await getOnboardingStep()).toBe('pit_offering');
      expect(cbs.transitionTo).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  test('one-shot guard: the stall-rescue path cannot double-invoke completion', async () => {
    const cbs = makeCallbacks();
    const [, actions] = await mountAtStep('pit_offering', cbs);

    actions.handlePitOnboardingOfferComplete();
    actions.handlePitOnboardingOfferComplete();

    expect(cbs.refreshStats).toHaveBeenCalledTimes(1);
  });

  test('tapping continue after the completion beat routes home (existing pit_offering case)', async () => {
    const cbs = makeCallbacks();
    const [, actions] = await mountAtStep('pit_offering', cbs);
    actions.handlePitOnboardingOfferComplete();

    // Tap through the completion beat; the final tap ("Let's go home!")
    // transitions home and lands on unlock_explained.
    const lines = ONBOARDING_FOX_LINES.pit_offering_complete;
    for (let i = 0; i < lines.length; i++) {
      const [, fresh] = renderOnboardingHook(cbs);
      await fresh.handleOnboardingContinue();
      await flushAsync();
    }

    expect(cbs.transitionTo).toHaveBeenCalledWith('home', expect.any(Function));
    expect(await getOnboardingStep()).toBe('unlock_explained');
  });
});
