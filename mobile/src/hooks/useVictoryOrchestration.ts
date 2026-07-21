import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getVictoryGlitch,
  getFirstWinGlitchText,
  resolveVictoryMicroBeat,
  NarrativeMicroBeat,
  getAnimalWhisper,
  getPersonalizedPhase5Whisper,
  getAnimalInterjection,
  getHomescreenNudge,
} from '../services/phaseNarrative';
import { getFullProgress } from '../services/amberCurrency';
import { recordWhisper } from '../services/whisperGallery';
// Audio routes through the guarded uiSound bridge (never a static expo-audio
// import) so this hook stays Jest-safe; haptics self-gate on hapticsEnabled.
import { playUiSound } from '../services/uiSound';
import { hapticWarning, hapticLight } from '../services/haptics';
import {
  VICTORY_ANIMATION_LOCK_MS,
  WHISPER_DELAY_MS,
  INTERJECTION_DELAY_MS,
  INTERJECTION_AUTODISMISS_MS,
  VICTORY_GLITCH_DELAY_MS,
  VICTORY_GLITCH_DURATION_MS,
  VICTORY_GLITCH_FIRST_DURATION_MS,
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
  /** The guaranteed first-ever-victory glitch: held longer + rendered louder. */
  victoryGlitchProminent: boolean;
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
  /** The player's FIRST free-play (non-onboarding) win — fires the guaranteed,
   *  prominent opening-promise glitch here rather than on the guided tutorial. */
  firstFreeWin?: boolean;
  /**
   * Dwell-window voice: the held-breath line for a Phase-4 win inside the
   * post-house-completion dwell window (App computes it from the dwell count).
   * Surfaced through the ambient micro-beat overlay, but only when no keyed
   * micro-beat fires on the same win — one narrative voice per victory.
   */
  dwellLine?: string | null;
  /**
   * Whether this win is on the bespoke FINAL board. Suppresses the horror
   * audio/haptic cues (glitch, whisper) so the finale's silent-victory contract
   * holds. Wire it from App's `isFinalBoard` at the processVictory call site.
   */
  isFinalBoard?: boolean;
}

/** Display duration for the dwell-window held-breath line (ambient overlay). */
const DWELL_LINE_DURATION_MS = 4500;

/**
 * Whisper frequency gate: the probability that a given win voices an animal
 * whisper. Firing on EVERY win guaranteed fast repeats from the 5-line-per-
 * phase pools, so phases 0-3 whisper on under half of wins, phase 4 more
 * often (the dread thickens), and phase 5 always (the personalized whispers
 * are the endgame feature). Exported for tests.
 */
export function getWhisperChance(phase: number): number {
  if (phase >= 5) return 1;
  if (phase >= 4) return 0.6;
  return 0.45;
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
  const [victoryGlitchProminent, setVictoryGlitchProminent] = useState(false);

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
      firstFreeWin,
      dwellLine,
      isFinalBoard,
    } = params;

    // The finale runs silent (no chime/confetti); its orchestration must not
    // sneak a glitch/whisper cue in either.
    const suppressCeremonyCues = !!isFinalBoard;

    const gen = ++generationRef.current;

    // ------ Victory glitch ------
    // The player's first FREE-PLAY win gets the guaranteed, prominent opening
    // promise (held longer + louder). The guided tutorial gets NO glitch (pure
    // warmth — the promise belongs on a win the player owns). Every other
    // Phase-0 win keeps the ~8% ambient glitch.
    let glitchText: string | null = null;
    let prominent = false;
    if (firstFreeWin) {
      glitchText = getFirstWinGlitchText();
      prominent = true;
    } else if (!onboarding) {
      glitchText = getVictoryGlitch(phase, totalPuzzlesCompleted);
    }
    if (glitchText) {
      addTimeout(() => {
        setVictoryGlitch(glitchText);
        setVictoryGlitchProminent(prominent);
        setShowVictoryGlitch(true);
        // Only the PROMINENT glitch (first free win) gets a felt wrong-note; the
        // ~8% ambient flickers stay subliminal (no sound/haptic). Never on the finale.
        if (prominent && !suppressCeremonyCues) {
          playUiSound('glitch');
          hapticWarning();
        }
        addTimeout(
          () => setShowVictoryGlitch(false),
          prominent ? VICTORY_GLITCH_FIRST_DURATION_MS : VICTORY_GLITCH_DURATION_MS,
        );
      }, VICTORY_GLITCH_DELAY_MS);
    }

    // ------ Narrative micro-beat (one-time surprises at milestone counts) ------
    // First playthrough: absolute-count MICRO_BEATS. New Cycle: the
    // cycle-relative track (half-memory beats + re-fired regular beats).
    // The dwell-window held-breath line rides the same ambient overlay, but
    // only when no keyed beat claims this win — one narrative voice at a time.
    (async () => {
      let beat: NarrativeMicroBeat | null = null;
      try {
        const fullProgress = await getFullProgress();
        if (gen !== generationRef.current) return;
        beat = await resolveVictoryMicroBeat(
          totalPuzzlesCompleted,
          fullProgress?.cycleCount ?? 0,
          fullProgress?.cycleStartPuzzles ?? 0,
        );
      } catch {
        beat = null;
      }
      if (gen !== generationRef.current) return;
      if (!beat && dwellLine) {
        beat = { type: 'ambient_whisper', text: dwellLine, durationMs: DWELL_LINE_DURATION_MS };
      }
      if (beat) {
        const finalBeat = beat;
        const delay = finalBeat.type === 'glitch_title'
          ? MICRO_BEAT_GLITCH_DELAY_MS
          : MICRO_BEAT_WHISPER_DELAY_MS;
        addTimeout(() => {
          if (gen !== generationRef.current) return;
          setMicroBeat(finalBeat);
          setShowMicroBeat(true);
          // Micro-beat cues: a held glitch_title tears (glitch + warning), an
          // ambient_whisper breathes (whisper + light). Suppressed on the finale.
          if (!suppressCeremonyCues) {
            if (finalBeat.type === 'glitch_title') { playUiSound('glitch'); hapticWarning(); }
            else if (finalBeat.type === 'ambient_whisper') { playUiSound('whisper'); hapticLight(); }
          }
          addTimeout(() => setShowMicroBeat(false), finalBeat.durationMs);
        }, delay);
      }
    })().catch(() => {});

    // ------ Animal whisper (skip during onboarding; frequency-gated) ------
    // The roll happens BEFORE generation: a win that loses the roll skips the
    // whisper entirely, INCLUDING the gallery recordWhisper — a line the
    // player never saw must not fill the archive.
    if (!onboarding && Math.random() < getWhisperChance(phase)) {
      addTimeout(async () => {
        try {
          if (gen !== generationRef.current) return;
          const fullProgress = await getFullProgress();
          if (gen !== generationRef.current) return;
          // At phase 5 the whispers turn personal: they weave the player's own
          // fed ritual words back at them (falls back to the generic pool on an
          // empty history, and keeps ~35% generic variety internally).
          const whisperData = phase >= 5
            ? getPersonalizedPhase5Whisper(
                fullProgress.unlockedAnimals || [],
                (fullProgress.ritualWords && fullProgress.ritualWords.length > 0)
                  ? fullProgress.ritualWords
                  : completedWords,
              )
            : getAnimalWhisper(
                phase,
                fullProgress.unlockedAnimals || [],
                completedWords,
              );
          if (whisperData) {
            setWhisper({ animalName: whisperData.animalName, text: whisperData.text });
            setShowWhisper(true);
            // A whisper surfaces — the sound of being noticed. Not on the finale.
            if (!suppressCeremonyCues) { playUiSound('whisper'); hapticLight(); }
            // Record whisper in gallery
            recordWhisper({
              animalType: whisperData.animalType || 'unknown',
              animalName: whisperData.animalName,
              text: whisperData.text,
              phase,
              type: 'whisper',
            }).catch(() => {});
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
    setVictoryGlitchProminent(false);
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
    victoryGlitchProminent,
    microBeat,
    showMicroBeat,
    completionCoda,
  };

  const actions: VictoryOrchestrationActions = {
    processVictory,
    setCompletionCoda,
    resetOrchestration,
    dismissWhisper,
  };

  return [state, actions];
}
