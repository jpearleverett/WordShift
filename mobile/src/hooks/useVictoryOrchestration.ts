import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  getVictoryGlitch,
  checkNarrativeMicroBeat,
  NarrativeMicroBeat,
  getAnimalWhisper,
  getAnimalInterjection,
  getHomescreenNudge,
} from '../services/phaseNarrative';
import { getFullProgress } from '../services/amberCurrency';
import { recordWhisper } from '../services/whisperGallery';
import {
  VICTORY_ANIMATION_LOCK_MS,
  WHISPER_DELAY_MS,
  INTERJECTION_DELAY_MS,
  INTERJECTION_AUTODISMISS_MS,
  VICTORY_GLITCH_DELAY_MS,
  VICTORY_GLITCH_DURATION_MS,
  MICRO_BEAT_GLITCH_DELAY_MS,
  MICRO_BEAT_WHISPER_DELAY_MS,
} from '../constants/timing';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WhisperData {
  animalName: string;
  text: string;
}

export interface InterjectionData {
  animalName: string;
  text: string;
}

export interface CompletionCodaData {
  title: string;
  text: string;
}

export interface VictoryOrchestrationState {
  /** Animal whisper shown after puzzle completion. */
  whisper: WhisperData | null;
  /** Whether the whisper overlay is visible. */
  showWhisper: boolean;
  /** Animal interjection / home nudge after victory. */
  interjection: InterjectionData | null;
  /** Whether the interjection overlay is visible. */
  showInterjection: boolean;
  /** Brief flash text during Phase 0 victories (~8% chance). */
  victoryGlitch: string | null;
  /** Whether the victory glitch overlay is visible. */
  showVictoryGlitch: boolean;
  /** Narrative micro-beat overlay at specific puzzle milestones. */
  microBeat: NarrativeMicroBeat | null;
  /** Whether the micro-beat overlay is visible. */
  showMicroBeat: boolean;
  /** Endgame completion coda block (title + text) in VictoryModal. */
  completionCoda: CompletionCodaData | null;
}

export interface VictoryOrchestrationActions {
  /**
   * Run the full post-victory orchestration chain: victory glitch,
   * micro-beat check, animal whisper, and interjection / home nudge.
   *
   * Call this after victory data has been recorded and the victory
   * sequence animation has started.
   */
  processVictory: (params: ProcessVictoryParams) => void;

  /** Set the completion coda data directly (used for endgame events). */
  setCompletionCoda: (coda: CompletionCodaData | null) => void;

  /**
   * Reset all post-victory overlays.
   * Call when starting a new puzzle or navigating away from puzzle screen.
   */
  resetOrchestration: () => void;

  /** Dismiss whisper overlay. */
  dismissWhisper: () => void;
}

export interface ProcessVictoryParams {
  /** Current narrative phase. */
  phase: number;
  /** Total puzzles completed (for glitch/micro-beat probability). */
  totalPuzzlesCompleted: number;
  /** Words completed in this puzzle (for whisper trigger matching). */
  completedWords: string[];
  /** Whether onboarding is still in progress (suppresses whispers/interjections). */
  isOnboarding: boolean;
  /** Consecutive puzzles without visiting home screen. */
  puzzlesSinceHomeVisit: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the cascade of post-victory effects: victory glitch text,
 * narrative micro-beats, animal whispers, and interjections / home
 * nudges.
 *
 * Each effect has its own delay and duration so they stagger naturally
 * without overlapping.  The hook owns all the state that drives the
 * overlay render in the host component (App.tsx / PuzzleScreen).
 */
export function useVictoryOrchestration(): [
  VictoryOrchestrationState,
  VictoryOrchestrationActions,
] {
  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  const [whisper, setWhisper] = useState<WhisperData | null>(null);
  const [showWhisper, setShowWhisper] = useState(false);

  const [interjection, setInterjection] = useState<InterjectionData | null>(null);
  const [showInterjection, setShowInterjection] = useState(false);

  const [victoryGlitch, setVictoryGlitch] = useState<string | null>(null);
  const [showVictoryGlitch, setShowVictoryGlitch] = useState(false);

  const [microBeat, setMicroBeat] = useState<NarrativeMicroBeat | null>(null);
  const [showMicroBeat, setShowMicroBeat] = useState(false);

  const [completionCoda, setCompletionCoda] = useState<CompletionCodaData | null>(null);

  // Track pending timeouts so we can cancel them on reset/unmount.
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Generation counter — incremented on each processVictory and resetOrchestration
  // so that in-flight async callbacks can detect they belong to a stale cycle.
  const generationRef = useRef(0);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  // Auto-dismiss interjection after INTERJECTION_AUTODISMISS_MS.
  useEffect(() => {
    if (showInterjection) {
      const timeout = setTimeout(() => setShowInterjection(false), INTERJECTION_AUTODISMISS_MS);
      return () => clearTimeout(timeout);
    }
  }, [showInterjection]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => clearAllTimeouts();
  }, [clearAllTimeouts]);

  // ---------------------------------------------------------------
  // processVictory
  // ---------------------------------------------------------------
  const processVictory = useCallback((params: ProcessVictoryParams) => {
    const {
      phase,
      totalPuzzlesCompleted,
      completedWords,
      isOnboarding: onboarding,
      puzzlesSinceHomeVisit,
    } = params;

    const gen = ++generationRef.current;

    // ------ Victory glitch (Phase 0, ~8%, guaranteed on first puzzle) ------
    const glitchText = getVictoryGlitch(phase, totalPuzzlesCompleted);
    if (glitchText) {
      addTimeout(() => {
        setVictoryGlitch(glitchText);
        setShowVictoryGlitch(true);
        addTimeout(() => setShowVictoryGlitch(false), VICTORY_GLITCH_DURATION_MS);
      }, VICTORY_GLITCH_DELAY_MS);
    }

    // ------ Narrative micro-beat (one-time surprises at milestone counts) ------
    try {
      const beat = checkNarrativeMicroBeat(totalPuzzlesCompleted);
      if (beat) {
        const delay = beat.type === 'glitch_title'
          ? MICRO_BEAT_GLITCH_DELAY_MS
          : MICRO_BEAT_WHISPER_DELAY_MS;
        addTimeout(() => {
          if (gen !== generationRef.current) return;
          setMicroBeat(beat);
          setShowMicroBeat(true);
          addTimeout(() => setShowMicroBeat(false), beat.durationMs);
        }, delay);
      }
    } catch (_e) {
      // Micro-beats are non-critical
    }

    // ------ Animal whisper (skip during onboarding) ------
    if (!onboarding) {
      addTimeout(async () => {
        try {
          if (gen !== generationRef.current) return;
          const fullProgress = await getFullProgress();
          if (gen !== generationRef.current) return;
          const whisperData = getAnimalWhisper(
            phase,
            fullProgress.unlockedAnimals || [],
            completedWords,
          );
          if (whisperData) {
            setWhisper({ animalName: whisperData.animalName, text: whisperData.text });
            setShowWhisper(true);
            // Record whisper in gallery
            try {
              recordWhisper({
                animalType: whisperData.animalType || 'unknown',
                animalName: whisperData.animalName,
                text: whisperData.text,
                phase,
                type: 'whisper',
              });
            } catch (_e) { /* ignore */ }
          }
        } catch {
          // Whispers are non-critical
        }
      }, WHISPER_DELAY_MS);
    }

    // ------ Animal interjection / home nudge (skip during onboarding) ------
    if (!onboarding) {
      addTimeout(async () => {
        // Don't stack with whisper (check current ref value)
        // Note: we rely on the showWhisper state being set by now
        // (whisper fires at 1200ms, interjection at 2500ms)
        try {
          if (gen !== generationRef.current) return;
          const fullProgress = await getFullProgress();
          if (gen !== generationRef.current) return;

          // Home nudge takes priority after 3+ puzzles without visiting home
          if (puzzlesSinceHomeVisit >= 3) {
            const nudge = getHomescreenNudge(
              phase,
              fullProgress.unlockedAnimals || [],
              puzzlesSinceHomeVisit,
            );
            if (nudge) {
              setInterjection(nudge);
              setShowInterjection(true);
              return;
            }
          }

          // Standard random interjection (30% chance internally)
          const interj = getAnimalInterjection(
            phase,
            fullProgress.unlockedAnimals || [],
            fullProgress.puzzlesSolved || 0,
          );
          if (interj) {
            setInterjection(interj);
            setShowInterjection(true);
          }
        } catch {
          // Interjections are non-critical
        }
      }, INTERJECTION_DELAY_MS);
    }
  }, [addTimeout]);

  // ---------------------------------------------------------------
  // resetOrchestration
  // ---------------------------------------------------------------
  const resetOrchestration = useCallback(() => {
    generationRef.current++;
    clearAllTimeouts();
    setWhisper(null);
    setShowWhisper(false);
    setInterjection(null);
    setShowInterjection(false);
    setVictoryGlitch(null);
    setShowVictoryGlitch(false);
    setMicroBeat(null);
    setShowMicroBeat(false);
    setCompletionCoda(null);
  }, [clearAllTimeouts]);

  // ---------------------------------------------------------------
  // dismissWhisper
  // ---------------------------------------------------------------
  const dismissWhisper = useCallback(() => {
    setShowWhisper(false);
  }, []);

  // ---------------------------------------------------------------
  // Return tuple
  // ---------------------------------------------------------------
  const state: VictoryOrchestrationState = {
    whisper,
    showWhisper,
    interjection,
    showInterjection,
    victoryGlitch,
    showVictoryGlitch,
    microBeat,
    showMicroBeat,
    completionCoda,
  };

  const actions: VictoryOrchestrationActions = useMemo(() => ({
    processVictory,
    setCompletionCoda,
    resetOrchestration,
    dismissWhisper,
  }), [processVictory, setCompletionCoda, resetOrchestration, dismissWhisper]);

  return [state, actions];
}
