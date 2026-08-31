import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
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
import { announceForA11y } from '../services/a11yAnnounce';
import { hapticWarning, hapticLight } from '../services/haptics';
import { getSettingsSync } from '../services/settings';
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
// Overlay fade kit (F38) — micro-beat (ambient_whisper/silent_victory only;
// glitch_title keeps its hard cut) and the interjection fade in on reveal and
// fade out on dismissal instead of hard-cutting. Native driver; reduced
// motion snaps straight to the resting value.
// ---------------------------------------------------------------------------
const OVERLAY_FADE_IN_MS = 400;
const OVERLAY_FADE_OUT_MS = 600;
/** Small settle distance (dp) the overlay drifts in from/out to. */
const OVERLAY_SETTLE_DP = 10;

function animateOverlayIn(
  opacity: Animated.Value,
  translateY: Animated.Value,
): Animated.CompositeAnimation | null {
  if (getSettingsSync().reducedMotion) {
    opacity.setValue(1);
    translateY.setValue(0);
    return null;
  }
  opacity.setValue(0);
  translateY.setValue(OVERLAY_SETTLE_DP);
  const anim = Animated.parallel([
    Animated.timing(opacity, { toValue: 1, duration: OVERLAY_FADE_IN_MS, useNativeDriver: true }),
    Animated.timing(translateY, { toValue: 0, duration: OVERLAY_FADE_IN_MS, useNativeDriver: true }),
  ]);
  anim.start();
  return anim;
}

/** Fades the overlay out, then calls `onDone` (drives the hide, not a bare setter). */
function animateOverlayOut(
  opacity: Animated.Value,
  translateY: Animated.Value,
  onDone: () => void,
): Animated.CompositeAnimation | null {
  if (getSettingsSync().reducedMotion) {
    opacity.setValue(0);
    onDone();
    return null;
  }
  const anim = Animated.parallel([
    Animated.timing(opacity, { toValue: 0, duration: OVERLAY_FADE_OUT_MS, useNativeDriver: true }),
    Animated.timing(translateY, { toValue: OVERLAY_SETTLE_DP, duration: OVERLAY_FADE_OUT_MS, useNativeDriver: true }),
  ]);
  anim.start(({ finished }) => {
    if (finished) onDone();
  });
  return anim;
}

// ---------------------------------------------------------------------------
// Narrative-slot arbiter (F108) — only one narrative voice (victory glitch,
// micro-beat, whisper, interjection) is ever visible at a time. A voice whose
// scheduled moment finds another one still up reschedules itself just behind
// it instead of stacking on top of it (an explicit handoff, not a cut).
// ---------------------------------------------------------------------------
const NARRATIVE_VOICE_RETRY_MS = 200;
/** Safety cap (~4s of retries) so a stuck voice can never wedge a later one silent forever. */
const NARRATIVE_VOICE_MAX_ATTEMPTS = 20;

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
  /**
   * Opacity/translateY driving the interjection overlay's fade in/out (F38).
   * The host can spread these onto the overlay's Animated.View style
   * (`opacity` + `transform:[{translateY}]`); reduced motion snaps them
   * straight to their resting values, so a host that never reads them is
   * unaffected (the boolean gate above still flips on the usual schedule).
   */
  interjectionOpacity: Animated.Value;
  interjectionTranslateY: Animated.Value;
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
  /**
   * Opacity/translateY driving the ambient_whisper/silent_victory micro-beat
   * fade in/out (F38). `glitch_title` deliberately keeps its hard cut (the
   * wrongness is of authorship, not a polished transition) and leaves these
   * pinned at their resting values (opacity 1, translateY 0) while visible.
   */
  microBeatOpacity: Animated.Value;
  microBeatTranslateY: Animated.Value;
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
  const interjectionOpacity = useRef(new Animated.Value(0)).current;
  const interjectionTranslateY = useRef(new Animated.Value(OVERLAY_SETTLE_DP)).current;
  const interjectionAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const [victoryGlitch, setVictoryGlitch] = useState<string | null>(null);
  const [showVictoryGlitch, setShowVictoryGlitch] = useState(false);
  const [victoryGlitchProminent, setVictoryGlitchProminent] = useState(false);

  const [microBeat, setMicroBeat] = useState<NarrativeMicroBeat | null>(null);
  const [showMicroBeat, setShowMicroBeat] = useState(false);
  const microBeatOpacity = useRef(new Animated.Value(0)).current;
  const microBeatTranslateY = useRef(new Animated.Value(OVERLAY_SETTLE_DP)).current;
  const microBeatAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const [completionCoda, setCompletionCoda] = useState<CompletionCodaData | null>(null);

  // Track pending timeouts so we can cancel them on reset/unmount.
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Generation counter — incremented on each processVictory and resetOrchestration
  // so that in-flight async callbacks can detect they belong to a stale cycle.
  const generationRef = useRef(0);

  // Narrative-slot arbiter (F108) — live mirrors of the visibility booleans.
  // The reveal timers are async closures that captured STALE state at the
  // time processVictory ran, so a fresh read needs a ref, kept in sync by a
  // small effect per voice.
  const showVictoryGlitchRef = useRef(false);
  const showMicroBeatRef = useRef(false);
  const showWhisperRef = useRef(false);
  const showInterjectionRef = useRef(false);
  useEffect(() => { showVictoryGlitchRef.current = showVictoryGlitch; }, [showVictoryGlitch]);
  useEffect(() => { showMicroBeatRef.current = showMicroBeat; }, [showMicroBeat]);
  useEffect(() => { showWhisperRef.current = showWhisper; }, [showWhisper]);
  useEffect(() => { showInterjectionRef.current = showInterjection; }, [showInterjection]);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  const isNarrativeVoiceActive = useCallback(() => (
    showVictoryGlitchRef.current ||
    showMicroBeatRef.current ||
    showWhisperRef.current ||
    showInterjectionRef.current
  ), []);

  /**
   * Waits for the narrative slot to be free, then runs `reveal` (F108). A
   * voice that finds another one still up reschedules itself a beat later
   * instead of stacking on top of it; a stuck voice can never wedge a later
   * one silent forever (NARRATIVE_VOICE_MAX_ATTEMPTS bails and reveals anyway).
   */
  const revealWhenFree = useCallback((reveal: () => void, gen: number) => {
    let attempts = 0;
    const attempt = () => {
      if (gen !== generationRef.current) return;
      if (isNarrativeVoiceActive() && attempts < NARRATIVE_VOICE_MAX_ATTEMPTS) {
        attempts += 1;
        addTimeout(attempt, NARRATIVE_VOICE_RETRY_MS);
        return;
      }
      reveal();
    };
    attempt();
  }, [addTimeout, isNarrativeVoiceActive]);

  // Auto-dismiss interjection after INTERJECTION_AUTODISMISS_MS. Gated on
  // !showWhisper (F107) so the countdown only starts once the interjection is
  // ACTUALLY visible per the host's render condition (showInterjection &&
  // !showWhisper) — previously it started the moment showInterjection went
  // true even while a whisper's own render guard was still hiding it, so an
  // interjection revealed behind a whisper could tick most of its lifetime
  // away unseen and then pop in truncated. Hides via animation completion
  // (F38) instead of a bare setShowInterjection(false).
  useEffect(() => {
    if (showInterjection && !showWhisper) {
      const timeout = setTimeout(() => {
        interjectionAnimRef.current?.stop();
        interjectionAnimRef.current = animateOverlayOut(
          interjectionOpacity,
          interjectionTranslateY,
          () => setShowInterjection(false),
        );
      }, INTERJECTION_AUTODISMISS_MS);
      return () => clearTimeout(timeout);
    }
  }, [showInterjection, showWhisper, interjectionOpacity, interjectionTranslateY]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      microBeatAnimRef.current?.stop();
      interjectionAnimRef.current?.stop();
    };
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
        revealWhenFree(() => {
          if (gen !== generationRef.current) return;
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
        }, gen);
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
        // ambient_whisper/silent_victory fade in/out (F38); glitch_title
        // keeps its hard cut on purpose (the wrongness is of authorship, a
        // polished transition would soften the point).
        const fadesInOut = finalBeat.type === 'ambient_whisper' || finalBeat.type === 'silent_victory';
        addTimeout(() => {
          revealWhenFree(() => {
            if (gen !== generationRef.current) return;
            setMicroBeat(finalBeat);
            setShowMicroBeat(true);
            microBeatAnimRef.current?.stop();
            if (fadesInOut) {
              microBeatAnimRef.current = animateOverlayIn(microBeatOpacity, microBeatTranslateY);
            } else {
              microBeatAnimRef.current = null;
              microBeatOpacity.setValue(1);
              microBeatTranslateY.setValue(0);
            }
            // Screen-reader treatment (finding 4.6): a beat's READABLE atmospheric
            // line (ambient_whisper, the stark silent-victory line) is spoken so a
            // SR player gets the horror content — content delivery, not a cue, so
            // it fires even when the finale suppresses the celebratory audio. The
            // glitch_title (a visual TITLE-swap wrongness) and color_shift (purely
            // visual) are deliberately NOT spoken: read plainly they would either
            // over-speak or land as a real victory title.
            if (
              (finalBeat.type === 'ambient_whisper' || finalBeat.type === 'silent_victory') &&
              finalBeat.text
            ) {
              announceForA11y(finalBeat.text);
            }
            // Micro-beat cues: a held glitch_title tears (glitch + warning), an
            // ambient_whisper breathes (whisper + light). Suppressed on the finale.
            if (!suppressCeremonyCues) {
              if (finalBeat.type === 'glitch_title') { playUiSound('glitch'); hapticWarning(); }
              else if (finalBeat.type === 'ambient_whisper') { playUiSound('whisper'); hapticLight(); }
            }
            addTimeout(() => {
              if (fadesInOut) {
                // Drive the hide via animation completion (F38) rather than a
                // bare setter — the beat fades out instead of hard-cutting.
                microBeatAnimRef.current?.stop();
                microBeatAnimRef.current = animateOverlayOut(
                  microBeatOpacity,
                  microBeatTranslateY,
                  () => setShowMicroBeat(false),
                );
              } else {
                setShowMicroBeat(false);
              }
            }, finalBeat.durationMs);
          }, gen);
        }, delay);
      }
    })().catch(() => {});

    // ------ Animal whisper (skip during onboarding; frequency-gated) ------
    // The roll happens BEFORE generation: a win that loses the roll skips the
    // whisper entirely, INCLUDING the gallery recordWhisper — a line the
    // player never saw must not fill the archive. The finale win carries
    // exactly one narrative voice (the silence, then the Arrival), so the
    // roll itself is suppressed there — never just its sound cue, or a
    // chatty ghost overlay races the climax cinematic.
    if (!onboarding && !suppressCeremonyCues && Math.random() < getWhisperChance(phase)) {
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
            // Reveal only once the narrative slot is free (F108) — the payload
            // is computed eagerly, but becoming VISIBLE waits its turn.
            revealWhenFree(() => {
              if (gen !== generationRef.current) return;
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
            }, gen);
          }
        } catch {
          // Whispers are non-critical
        }
      }, WHISPER_DELAY_MS);
    }

    // ------ Animal interjection / home nudge (skip during onboarding;
    // suppressed entirely on the finale win — see the whisper gate above) ------
    if (!onboarding && !suppressCeremonyCues) {
      addTimeout(async () => {
        try {
          if (gen !== generationRef.current) return;
          const fullProgress = await getFullProgress();
          if (gen !== generationRef.current) return;

          // Home nudge takes priority after 3+ puzzles without visiting home
          let payload: InterjectionData | null = null;
          if (puzzlesSinceHomeVisit >= 3) {
            payload = getHomescreenNudge(
              phase,
              fullProgress.unlockedAnimals || [],
              puzzlesSinceHomeVisit,
            );
          }
          // Standard random interjection (30% chance internally)
          if (!payload) {
            payload = getAnimalInterjection(
              phase,
              fullProgress.unlockedAnimals || [],
              fullProgress.puzzlesSolved || 0,
            );
          }
          if (payload) {
            const finalPayload = payload;
            // Don't stack with a whisper still up (F107): reveal only once the
            // narrative slot is free, then fade in (F38). Previously this set
            // showInterjection(true) immediately and relied on the host's
            // render guard (!showWhisper) to hide it, so a still-showing
            // whisper let the interjection's own auto-dismiss clock burn
            // unseen; it could pop in already truncated with no entrance.
            revealWhenFree(() => {
              if (gen !== generationRef.current) return;
              setInterjection(finalPayload);
              setShowInterjection(true);
              interjectionAnimRef.current?.stop();
              interjectionAnimRef.current = animateOverlayIn(interjectionOpacity, interjectionTranslateY);
            }, gen);
          }
        } catch {
          // Interjections are non-critical
        }
      }, INTERJECTION_DELAY_MS);
    }
  }, [addTimeout, revealWhenFree, interjectionOpacity, interjectionTranslateY, microBeatOpacity, microBeatTranslateY]);

  // ---------------------------------------------------------------
  // resetOrchestration
  // ---------------------------------------------------------------
  const resetOrchestration = useCallback(() => {
    generationRef.current++;
    clearAllTimeouts();
    // Stop any in-flight fades and snap the overlays back to their resting
    // (hidden) values so the next reveal always starts from a fresh fade-in
    // instead of a stale mid-animation value.
    microBeatAnimRef.current?.stop();
    microBeatAnimRef.current = null;
    interjectionAnimRef.current?.stop();
    interjectionAnimRef.current = null;
    microBeatOpacity.setValue(0);
    microBeatTranslateY.setValue(OVERLAY_SETTLE_DP);
    interjectionOpacity.setValue(0);
    interjectionTranslateY.setValue(OVERLAY_SETTLE_DP);
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
  }, [clearAllTimeouts, microBeatOpacity, microBeatTranslateY, interjectionOpacity, interjectionTranslateY]);

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
    interjectionOpacity,
    interjectionTranslateY,
    victoryGlitch,
    showVictoryGlitch,
    victoryGlitchProminent,
    microBeat,
    showMicroBeat,
    microBeatOpacity,
    microBeatTranslateY,
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
