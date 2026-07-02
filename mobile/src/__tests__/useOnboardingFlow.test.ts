/**
 * Tests for the onboarding state machine's resume-resilience contract and the
 * skip clean-exit contract.
 *
 * `normalizeResumeStep` is the guard that prevents a brand-new player from
 * being stranded if the app is killed mid-onboarding: transient steps (which
 * only exist during a setTimeout transition and have no owning screen on
 * relaunch) must snap forward to a stable, resumable target. A regression here
 * re-opens the first-session soft-lock, so it is pinned directly.
 *
 * `handleSkipOnboarding` mid-puzzle must be a CLEAN exit: onboarding step
 * 'complete' persisted, the guided board abandoned (cleared + autosave
 * dropped), and the player landed on home — never a guided board in limbo
 * with dashed highlights and no instructions.
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
  'not_started', 'home_empty', 'fox_invited', 'going_to_puzzle',
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

const clearRitualEchoWords = jest.fn();

/** Render the hook fresh against the shared synchronous state store. */
function renderOnboardingHook(cbs: MockCallbacks) {
  rewindHookIndices();
  // eslint-disable-next-line react-hooks/rules-of-hooks -- test harness drives the hook against a manual React mock
  return useOnboardingFlow(cbs as unknown as OnboardingCallbacks, clearRitualEchoWords);
}

/** Boot the hook at a persisted step: initial render + mount effects + settle. */
async function mountAtStep(step: OnboardingStep, cbs: MockCallbacks) {
  await setOnboardingStep(step);
  renderOnboardingHook(cbs);
  runEffects();
  await flushAsync();
  return renderOnboardingHook(cbs);
}

describe('handleSkipOnboarding (clean exit, no guided-board limbo)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    resetHookState();
    await (AsyncStorage.clear as jest.Mock)();
    await resetOnboarding();
  });

  test('skip mid-tutorial-puzzle completes onboarding, clears the board, and lands on home', async () => {
    const cbs = makeCallbacks();
    const [state, actions] = await mountAtStep('puzzle_tutorial', cbs);
    expect(state.onboardingStep).toBe('puzzle_tutorial');
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
    expect(clearRitualEchoWords).toHaveBeenCalled();
  });

  test('skip cancels pending step-transition timers so they cannot resurrect onboarding', async () => {
    jest.useFakeTimers();
    try {
      const cbs = makeCallbacks();
      const [, actions] = await mountAtStep('pit_offering', cbs);

      // Player offered every word — the auto-return-home timer is now queued.
      actions.handlePitOnboardingOfferComplete();

      const [, freshActions] = renderOnboardingHook(cbs);
      await freshActions.handleSkipOnboarding();
      await flushAsync();
      expect(await getOnboardingStep()).toBe('complete');

      // If the queued auto-return survived the skip it would advance the
      // step to returning_home/unlock_explained — it must not.
      jest.runAllTimers();
      await flushAsync();
      expect(await getOnboardingStep()).toBe('complete');
      const [after] = renderOnboardingHook(cbs);
      expect(after.isOnboarding).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  test('skip during the intro dialogue still routes into the tutorial puzzle (not a full exit)', async () => {
    jest.useFakeTimers();
    try {
      const cbs = makeCallbacks();
      const [, actions] = await mountAtStep('fox_invited', cbs);

      await actions.handleSkipOnboarding();
      await flushAsync();

      // Early skip only skips the dialogue — onboarding is NOT completed.
      expect(markTutorialCompleted).not.toHaveBeenCalled();
      expect(await getOnboardingStep()).toBe('going_to_puzzle');

      // The queued transition lands the player in the guided puzzle.
      jest.runAllTimers();
      await flushAsync();
      expect(await getOnboardingStep()).toBe('puzzle_tutorial');
      expect(cbs.transitionTo).toHaveBeenCalledWith('puzzle', expect.any(Function));
    } finally {
      jest.useRealTimers();
    }
  });
});
