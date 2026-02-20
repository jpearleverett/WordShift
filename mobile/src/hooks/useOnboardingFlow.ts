import { useState, useCallback, useEffect, useRef } from 'react';
import {
  OnboardingStep,
  getOnboardingStep,
  setOnboardingStep,
  ONBOARDING_FOX_LINES,
} from '../services/onboarding';
import { hasTutorialCompleted, markTutorialCompleted } from '../components/Tutorial';
import { markTutorialSeedsPlanted } from '../services/amberCurrency';
import { hapticLight, hapticSelection } from '../services/haptics';
import { logEvent } from '../services/eventLogger';
import { ONBOARDING_TRANSITION_DELAY_MS } from '../constants/timing';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Callbacks that the host component (App.tsx) injects so the onboarding
 * hook can trigger screen transitions and game actions without owning
 * that state directly.
 */
export interface OnboardingCallbacks {
  /** Animated screen transition. */
  transitionTo: (screen: string, callback?: () => void) => void;
  /** Start a new puzzle (EASY difficulty for tutorial). */
  startNewGame: (difficulty: string) => void;
  /** Set the puzzle game state (e.g. GameState.IDLE). */
  setGameState: (state: string) => void;
  /** Hide confetti. */
  setShowConfetti: (show: boolean) => void;
  /** Refresh persistence stats (phase, amber, etc.). */
  refreshStats: () => void;
  /** Reset the victory animation state. */
  resetVictory: () => void;
}

export interface OnboardingFlowState {
  /** Current onboarding step in the state machine. */
  onboardingStep: OnboardingStep;
  /** Line index within the current step's Fox dialogue array. */
  onboardingLineIndex: number;
  /** True once the initial async check for onboarding state is done. */
  onboardingReady: boolean;
  /** True if the auto-offer cascade has finished on the pit screen. */
  pitOfferDone: boolean;
  /** Convenience: `onboardingStep !== 'complete'`. */
  isOnboarding: boolean;
}

export interface OnboardingFlowActions {
  /**
   * Handle the main "Continue" / "Next" tap on the FoxGuide overlay.
   * Advances dialogue lines within a step, or transitions to the next
   * step when the current dialogue is exhausted.
   */
  handleOnboardingContinue: () => Promise<void>;
  /**
   * Skip onboarding.  During pre-puzzle steps this jumps to the
   * tutorial puzzle; at or after the puzzle step it completes onboarding
   * entirely.
   */
  handleSkipOnboarding: () => Promise<void>;
  /**
   * Called by OfferingPitScreen when the auto-offer cascade finishes
   * during onboarding.
   */
  handlePitOnboardingOfferComplete: () => void;
  /**
   * Advance directly to a specific onboarding step.
   * Used by HomeScreen when the player invites Fox.
   */
  advanceOnboarding: (step: OnboardingStep) => Promise<void>;
  /** Get the Fox dialogue text for the current onboarding step/line. */
  getOnboardingFoxText: () => string;
  /** Get the button label for the current onboarding step/line. */
  getOnboardingButtonText: () => string;
  /** Clear ritual echo words callback — set externally. */
  clearRitualEchoWords: () => void;
}

/**
 * Encapsulates the multi-screen onboarding state machine.
 *
 * On mount it reads the persisted onboarding step (with backward-compat
 * check against the legacy `wordshift_tutorial_completed` flag) and
 * exposes the full dialogue-line and step-transition logic that was
 * previously inline in App.tsx.
 *
 * Navigation and game-state mutations are delegated to the host via
 * `OnboardingCallbacks` so this hook has no direct dependency on
 * screen routing or puzzle state.
 */
export function useOnboardingFlow(
  callbacks: OnboardingCallbacks,
  clearRitualEchoWords: () => void,
): [OnboardingFlowState, OnboardingFlowActions] {
  const [onboardingStep, setOnboardingStepState] = useState<OnboardingStep>('complete');
  const [onboardingLineIndex, setOnboardingLineIndex] = useState(0);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [pitOfferDone, setPitOfferDone] = useState(false);

  const isOnboarding = onboardingStep !== 'complete';

  // Guards for async-in-setTimeout cleanup
  const mountedRef = useRef(true);
  const pendingTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    pendingTimeouts.current.push(id);
    return id;
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      pendingTimeouts.current.forEach(clearTimeout);
    };
  }, []);

  // ------------------------------------------------------------------
  // Initialization — read persisted step on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const tutorialDone = await hasTutorialCompleted();
      const step = await getOnboardingStep();

      if (tutorialDone && step === 'not_started') {
        // Existing player who completed old tutorial — skip onboarding
        await setOnboardingStep('complete');
        setOnboardingStepState('complete');
      } else if (step === 'not_started') {
        // Fresh install — start onboarding
        await setOnboardingStep('home_empty');
        setOnboardingStepState('home_empty');
        setOnboardingLineIndex(0);
      } else {
        // Resume from where they left off
        setOnboardingStepState(step);
        setOnboardingLineIndex(0);
      }
      setOnboardingReady(true);
    })();
  }, []);

  // ------------------------------------------------------------------
  // advanceOnboarding — move to an explicit step
  // ------------------------------------------------------------------
  const advanceOnboarding = useCallback(async (step: OnboardingStep) => {
    await setOnboardingStep(step);
    setOnboardingStepState(step);
    setOnboardingLineIndex(0);
  }, []);

  // ------------------------------------------------------------------
  // navigateToPuzzleTutorial — shared helper for fox_invited → puzzle
  // ------------------------------------------------------------------
  const navigateToPuzzleTutorial = useCallback(async () => {
    await advanceOnboarding('going_to_puzzle');
    addTimeout(async () => {
      if (!mountedRef.current) return;
      await advanceOnboarding('puzzle_tutorial');
      if (!mountedRef.current) return;
      callbacks.refreshStats();
      clearRitualEchoWords();
      callbacks.transitionTo('puzzle', () => {
        callbacks.startNewGame('EASY');
        logEvent({ type: 'puzzle_started', data: { difficulty: 'EASY', onboarding: true } });
      });
    }, ONBOARDING_TRANSITION_DELAY_MS);
  }, [advanceOnboarding, callbacks, clearRitualEchoWords, addTimeout]);

  // ------------------------------------------------------------------
  // handleOnboardingContinue — main FoxGuide "Next" handler
  // ------------------------------------------------------------------
  const handleOnboardingContinue = useCallback(async () => {
    switch (onboardingStep) {
      case 'home_empty':
        // Handled by HomeScreen — tapping the den triggers fox_invited
        break;

      case 'fox_invited': {
        const lines = ONBOARDING_FOX_LINES.fox_invited;
        if (onboardingLineIndex < lines.length - 1) {
          setOnboardingLineIndex(prev => prev + 1);
        } else {
          await navigateToPuzzleTutorial();
        }
        break;
      }

      case 'puzzle_tutorial': {
        const lines = ONBOARDING_FOX_LINES.puzzle_tutorial_intro;
        if (onboardingLineIndex < lines.length - 1) {
          setOnboardingLineIndex(prev => prev + 1);
        }
        break;
      }

      case 'puzzle_complete': {
        const lines = ONBOARDING_FOX_LINES.puzzle_tutorial_complete;
        if (onboardingLineIndex < lines.length - 1) {
          setOnboardingLineIndex(prev => prev + 1);
        } else {
          // Navigate to pit for harvest introduction
          await advanceOnboarding('going_to_pit');
          hapticLight();
          callbacks.setShowConfetti(false);
          callbacks.resetVictory();
          clearRitualEchoWords();
          setPitOfferDone(false);
          addTimeout(async () => {
            if (!mountedRef.current) return;
            await advanceOnboarding('pit_intro');
            if (!mountedRef.current) return;
            callbacks.transitionTo('pit', () => {
              callbacks.setGameState('IDLE');
            });
          }, ONBOARDING_TRANSITION_DELAY_MS);
        }
        break;
      }

      case 'pit_intro': {
        const pitLines = ONBOARDING_FOX_LINES.pit_intro;
        if (onboardingLineIndex < pitLines.length - 1) {
          setOnboardingLineIndex(prev => prev + 1);
        } else {
          await advanceOnboarding('pit_offering');
        }
        break;
      }

      case 'pit_offering': {
        const offerLines = ONBOARDING_FOX_LINES.pit_offering_complete;
        if (onboardingLineIndex < offerLines.length - 1) {
          setOnboardingLineIndex(prev => prev + 1);
        } else {
          await advanceOnboarding('returning_home');
          hapticLight();
          callbacks.transitionTo('home', async () => {
            await advanceOnboarding('unlock_explained');
          });
        }
        break;
      }

      case 'unlock_explained': {
        const lines = ONBOARDING_FOX_LINES.unlock_explained;
        if (onboardingLineIndex < lines.length - 1) {
          setOnboardingLineIndex(prev => prev + 1);
        } else {
          await markTutorialCompleted();
          await markTutorialSeedsPlanted().catch(() => {});
          await advanceOnboarding('complete');
        }
        break;
      }

      default:
        break;
    }
  }, [
    onboardingStep,
    onboardingLineIndex,
    advanceOnboarding,
    navigateToPuzzleTutorial,
    callbacks,
    clearRitualEchoWords,
    addTimeout,
  ]);

  // ------------------------------------------------------------------
  // handleSkipOnboarding
  // ------------------------------------------------------------------
  const handleSkipOnboarding = useCallback(async () => {
    if (onboardingStep === 'fox_invited' || onboardingStep === 'home_empty') {
      // Skip dialogue but continue to tutorial puzzle
      await navigateToPuzzleTutorial();
    } else {
      // During/after puzzle: complete onboarding entirely
      await markTutorialCompleted();
      await markTutorialSeedsPlanted().catch(() => {});
      await advanceOnboarding('complete');
    }
  }, [onboardingStep, advanceOnboarding, navigateToPuzzleTutorial]);

  // ------------------------------------------------------------------
  // handlePitOnboardingOfferComplete
  // ------------------------------------------------------------------
  const handlePitOnboardingOfferComplete = useCallback(() => {
    setPitOfferDone(true);
    callbacks.refreshStats();
  }, [callbacks]);

  // ------------------------------------------------------------------
  // Fox text helpers
  // ------------------------------------------------------------------
  const getOnboardingFoxText = useCallback((): string => {
    const key = onboardingStep === 'puzzle_tutorial'
      ? 'puzzle_tutorial_intro'
      : onboardingStep === 'pit_offering'
        ? 'pit_offering_complete'
        : onboardingStep;
    const lines = ONBOARDING_FOX_LINES[key];
    if (!lines || lines.length === 0) return '';
    return lines[Math.min(onboardingLineIndex, lines.length - 1)] || '';
  }, [onboardingStep, onboardingLineIndex]);

  const getOnboardingButtonText = useCallback((): string => {
    switch (onboardingStep) {
      case 'fox_invited': {
        const lines = ONBOARDING_FOX_LINES.fox_invited;
        if (onboardingLineIndex === 0) return 'Nice to meet you!';
        if (onboardingLineIndex >= lines.length - 1) return "Let's go!";
        return 'Next';
      }
      case 'puzzle_tutorial':
        return 'Got it!';
      case 'puzzle_complete':
        return "What's next?";
      case 'pit_intro': {
        const pitLines = ONBOARDING_FOX_LINES.pit_intro;
        if (onboardingLineIndex >= pitLines.length - 1) return 'Offer words!';
        return 'Next';
      }
      case 'pit_offering':
        return "Let's go home!";
      case 'unlock_explained': {
        const lines = ONBOARDING_FOX_LINES.unlock_explained;
        if (onboardingLineIndex >= lines.length - 1) return "Let's play!";
        return 'Next';
      }
      default:
        return 'Continue';
    }
  }, [onboardingStep, onboardingLineIndex]);

  // ------------------------------------------------------------------
  // Return tuple
  // ------------------------------------------------------------------
  const state: OnboardingFlowState = {
    onboardingStep,
    onboardingLineIndex,
    onboardingReady,
    pitOfferDone,
    isOnboarding,
  };

  const actions: OnboardingFlowActions = {
    handleOnboardingContinue,
    handleSkipOnboarding,
    handlePitOnboardingOfferComplete,
    advanceOnboarding,
    getOnboardingFoxText,
    getOnboardingButtonText,
    clearRitualEchoWords,
  };

  return [state, actions];
}
