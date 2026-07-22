import { useRef, useState, useCallback, useEffect } from 'react';
import { Animated } from 'react-native';
import { VictoryData } from './useGamePersistence';
import { getSettingsSync } from '../services/settings';
import { hapticLight, hapticHeavy } from '../services/haptics';
import { playUiSound } from '../services/uiSound';
import { getCelebrationSpring } from '../theme/surfaces';

/**
 * Where the victory flow currently is:
 * - 'idle': no victory in flight
 * - 'recording': the brief pre-modal record/persist gap after the final move
 * - 'choreographing': the star/modal entrance animation is running (skippable)
 * - 'settled': entrance finished (naturally or via skip) — modal is interactive
 */
export type VictoryStage = 'idle' | 'recording' | 'choreographing' | 'settled';

// ---------------------------------------------------------------------------
// Swift Victories — routine-victory policy (pure, unit-tested)
// ---------------------------------------------------------------------------

/**
 * Below this real-puzzle count every victory keeps the full ceremony — the
 * early game's choreography is part of the delight, not the staleness.
 */
export const SWIFT_VICTORY_MIN_PUZZLES = 20;

/**
 * App.tsx fires a ritual micro-event at ritualEnergy >= 7; those wins carry a
 * narrative beat and must never be compacted. Keep in sync with the App-side
 * threshold if it ever moves.
 */
export const RITUAL_MICRO_EVENT_MIN_ENERGY = 7;

/**
 * The minimal victory signals the routine/special decision reads. Both the
 * hook-level VictoryData (useGamePersistence) and the Victory modal's local
 * copy are structurally assignable, so one policy serves both call sites.
 */
export interface RoutineVictorySignals {
  isDaily?: boolean;
  mandatoryHarvest?: boolean;
  /** THE marked final board's win — always the full (hushed) ceremony. */
  finalBoard?: boolean;
  phaseTransitionPending?: boolean;
  phaseChanged?: boolean;
  firstCompletionBonus?: number;
  milestoneBonus?: number;
  streakMilestoneBonus?: number;
  questsCompleted?: string[];
  ritualEnergy?: number;
  /** A newly earned Unbroken Weave rank is a ceremony, never a compact strip. */
  unbrokenWeaveRankedUp?: boolean;
  puzzlesSolved?: number;
}

/**
 * True only for a ROUTINE victory — one with no special beat attached. Any of
 * the following forces the full ceremony (returns false):
 * - no victory data at all (safe default: full modal)
 * - the Daily Challenge
 * - the mandatory first-harvest gate
 * - THE marked final board's win (the finale must never compact away)
 * - a pending/new phase transition (phaseTransitionPending or phaseChanged)
 * - a one-time first-completion bonus for the difficulty
 * - a puzzle-count milestone or a daily-streak milestone bonus
 * - completed quests being turned in
 * - a high-energy win that triggers a ritual micro-event
 * - the player's first SWIFT_VICTORY_MIN_PUZZLES puzzles
 */
export function isRoutineVictory(victory: RoutineVictorySignals | null | undefined): boolean {
  if (!victory) return false;
  if (victory.isDaily) return false;
  if (victory.mandatoryHarvest) return false;
  if (victory.finalBoard) return false;
  if (victory.phaseTransitionPending || victory.phaseChanged) return false;
  if ((victory.firstCompletionBonus ?? 0) > 0) return false;
  if ((victory.milestoneBonus ?? 0) > 0) return false;
  if ((victory.streakMilestoneBonus ?? 0) > 0) return false;
  if ((victory.questsCompleted?.length ?? 0) > 0) return false;
  if (victory.unbrokenWeaveRankedUp === true) return false;
  if ((victory.ritualEnergy ?? 0) >= RITUAL_MICRO_EVENT_MIN_ENERGY) return false;
  if ((victory.puzzlesSolved ?? 0) < SWIFT_VICTORY_MIN_PUZZLES) return false;
  return true;
}

/** Compact mode = the Swift Victories setting is ON and the win is routine. */
export function shouldUseCompactVictory(
  victory: RoutineVictorySignals | null | undefined,
  swiftEnabled: boolean
): boolean {
  return swiftEnabled === true && isRoutineVictory(victory);
}

/**
 * The record/persist gap after the final move is normally tens of ms — a
 * spinner there reads as a jarring flash at the emotional peak. Only surface
 * the loading overlay when the gap outlasts this grace window (i.e. persistence
 * is genuinely slow and the player needs feedback).
 */
const VICTORY_SPINNER_GRACE_MS = 400;

// Entrance choreography timing. The modal card reveals immediately and the
// stars pop on top of the already-visible card — previously the stars animated
// FIRST, invisibly, behind the card's 0 opacity, leaving a dead ~700ms wait.
const STAR_POP_DELAY_MS = 150;
const STAR_STAGGER_MS = 200;
const STAR_HAPTIC_OFFSET_MS = 100; // haptic lands just after each star's spring begins

export interface VictoryFlowState {
  victoryData: VictoryData | null;
  isProcessingVictory: boolean;
  /**
   * Distinguishes the pre-modal record gap ('recording') from the entrance
   * animation ('choreographing') so the orchestrator never shows a spinner
   * while the celebration itself is playing.
   */
  victoryStage: VictoryStage;
  /**
   * True only when the 'recording' gap outlasts VICTORY_SPINNER_GRACE_MS.
   * Drives the loading overlay — the normal brief gap stays spinner-free.
   */
  victorySpinnerVisible: boolean;
  victoryStar1: Animated.Value;
  victoryStar2: Animated.Value;
  victoryStar3: Animated.Value;
  victoryModalScale: Animated.Value;
  victoryModalOpacity: Animated.Value;
  phaseFlashOpacity: Animated.Value;
}

export interface VictoryFlowActions {
  setVictoryData: (data: VictoryData | null) => void;
  setProcessingVictory: (processing: boolean) => void;
  playVictorySequence: (stars: number, phase?: number, hushed?: boolean) => void;
  playPhaseChangeFlash: () => void;
  resetVictory: () => void;
  /** Instantly complete victory animation (tap-to-skip-forward) */
  skipToEnd: (stars: number, hushed?: boolean) => void;
}

export function useVictoryFlow(): [VictoryFlowState, VictoryFlowActions] {
  const [victoryData, setVictoryDataState] = useState<VictoryData | null>(null);
  const [isProcessingVictory, setProcessingVictoryState] = useState(false);
  const [victoryStage, setVictoryStage] = useState<VictoryStage>('idle');
  const [victorySpinnerVisible, setVictorySpinnerVisible] = useState(false);

  const victoryStar1 = useRef(new Animated.Value(0)).current;
  const victoryStar2 = useRef(new Animated.Value(0)).current;
  const victoryStar3 = useRef(new Animated.Value(0)).current;
  const victoryModalScale = useRef(new Animated.Value(0.8)).current;
  const victoryModalOpacity = useRef(new Animated.Value(0)).current;
  const phaseFlashOpacity = useRef(new Animated.Value(0)).current;
  const hapticTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const spinnerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Ref to the running victory sequence animation (so skipToEnd can stop it). */
  const runningAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  /**
   * Synchronous mirror of victoryData: App sets the data and starts the
   * choreography in the same tick, so playVictorySequence must read the fresh
   * value (state would be one render behind) to decide the swift/compact path.
   */
  const victoryDataRef = useRef<VictoryData | null>(null);

  const setVictoryData = useCallback((data: VictoryData | null) => {
    victoryDataRef.current = data;
    setVictoryDataState(data);
  }, []);

  // Cleanup haptic/spinner timeouts and running animations on unmount
  useEffect(() => {
    return () => {
      hapticTimeouts.current.forEach(clearTimeout);
      if (spinnerTimeout.current) clearTimeout(spinnerTimeout.current);
      spinnerTimeout.current = null;
      runningAnimRef.current?.stop();
      runningAnimRef.current = null;
    };
  }, []);

  const clearSpinner = useCallback(() => {
    if (spinnerTimeout.current) {
      clearTimeout(spinnerTimeout.current);
      spinnerTimeout.current = null;
    }
    setVictorySpinnerVisible(false);
  }, []);

  const setProcessingVictory = useCallback((processing: boolean) => {
    setProcessingVictoryState(processing);
    if (processing) {
      setVictoryStage('recording');
      // Spinner only appears if the record gap outlasts the grace window —
      // the normal brief gap shows nothing (the celebration carries the wait).
      if (spinnerTimeout.current) clearTimeout(spinnerTimeout.current);
      spinnerTimeout.current = setTimeout(() => {
        spinnerTimeout.current = null;
        setVictorySpinnerVisible(true);
      }, VICTORY_SPINNER_GRACE_MS);
    } else {
      clearSpinner();
      // Don't clobber a stage the choreography already advanced to.
      setVictoryStage(prev => (prev === 'recording' ? 'idle' : prev));
    }
  }, [clearSpinner]);

  const playVictorySequence = useCallback((stars: number, phase = 0, hushed = false) => {
    clearSpinner();
    const settings = getSettingsSync();
    const reducedMotion = settings.reducedMotion;
    // The celebration entrance is a WORLD arrival: it ages with the descent so
    // the stars stop candy-bouncing at the reveal (see getCelebrationSpring).
    const cel = getCelebrationSpring(phase);
    // The modal reveal is heavier than the stars (softer tension, more friction)
    // so the card settles rather than snaps; at phase 0 this is the original
    // {6, 80}, deepening to a slow heave at the reveal.
    const modalSpring = { friction: cel.friction + 2, tension: Math.max(40, cel.tension - 40) };
    // Swift Victories: a routine win renders the compact result strip, which
    // needs no entrance choreography — settle instantly (same path reduced
    // motion takes, so the two compose instead of fighting). Special beats
    // never reach here compact: isRoutineVictory gates them to the full mode.
    const swiftCompact = shouldUseCompactVictory(
      victoryDataRef.current,
      settings.swiftVictories === true
    );
    // THE marked final board AND the scripted silent-victory beat are HUSHED:
    // the choreography still plays (the stars are earned) but the celebration
    // RHYTHM is one soft settle instead of tap-tap-tap-THUD, and no success
    // buzz. The quiet is the moment; the arrival follows. (finalBoard kept for
    // back-compat; App also passes the computed hushed flag.)
    const finalBoard = victoryDataRef.current?.finalBoard === true;
    const isHushed = hushed || finalBoard;
    if (reducedMotion || swiftCompact) {
      victoryStar1.setValue(stars >= 1 ? 1 : 0);
      victoryStar2.setValue(stars >= 2 ? 1 : 0);
      victoryStar3.setValue(stars >= 3 ? 1 : 0);
      victoryModalScale.setValue(1);
      victoryModalOpacity.setValue(1);
      setVictoryStage('settled');
      if (isHushed) {
        hapticLight();
      } else {
        hapticHeavy();
      }
      return;
    }

    setVictoryStage('choreographing');
    victoryStar1.setValue(0);
    victoryStar2.setValue(0);
    victoryStar3.setValue(0);
    victoryModalScale.setValue(0.8);
    victoryModalOpacity.setValue(0);

    const starAnims: Animated.CompositeAnimation[] = [];
    if (stars >= 1) {
      starAnims.push(
        Animated.spring(victoryStar1, { toValue: 1, friction: cel.friction, tension: cel.tension, useNativeDriver: true })
      );
    }
    if (stars >= 2) {
      starAnims.push(
        Animated.spring(victoryStar2, { toValue: 1, friction: cel.friction, tension: cel.tension, useNativeDriver: true })
      );
    }
    if (stars >= 3) {
      starAnims.push(
        Animated.spring(victoryStar3, { toValue: 1, friction: cel.friction, tension: cel.tension, useNativeDriver: true })
      );
    }

    runningAnimRef.current?.stop();
    // Card first, stars on top: the modal reveal carries the post-move wait
    // (no spinner), and the star pops are actually visible instead of playing
    // behind a fully transparent card.
    const sequence = Animated.parallel([
      Animated.spring(victoryModalScale, { toValue: 1, friction: modalSpring.friction, tension: modalSpring.tension, useNativeDriver: true }),
      Animated.timing(victoryModalOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(STAR_POP_DELAY_MS),
        Animated.stagger(STAR_STAGGER_MS, starAnims),
      ]),
    ]);
    runningAnimRef.current = sequence;
    sequence.start(({ finished }) => {
      runningAnimRef.current = null;
      // stop() (skip/unmount) fires with finished:false — skip sets the stage itself.
      if (finished) setVictoryStage('settled');
    });

    // Haptic rhythm synced to star stagger: tap-tap-tap-THUD. On the final
    // board the rhythm is replaced by a single soft settle at the end.
    hapticTimeouts.current.forEach(clearTimeout);
    hapticTimeouts.current = [];
    const firstHapticAt = STAR_POP_DELAY_MS + STAR_HAPTIC_OFFSET_MS;
    if (isHushed) {
      // One soft settle, no celebration rhythm — the quiet is the moment.
      hapticTimeouts.current.push(setTimeout(() => hapticLight(), firstHapticAt + stars * STAR_STAGGER_MS + 150));
    } else if (phase >= 4) {
      // At the reveal the stars land like stones: two slow medium pulses
      // instead of three quick taps, keeping the settling THUD. A star_pop note
      // rides each pulse (its dark hollow mirror at Phase 3+, so the pops SINK).
      hapticTimeouts.current.push(setTimeout(() => { hapticLight(); playUiSound('star_pop', 1); }, firstHapticAt));
      if (stars >= 3) hapticTimeouts.current.push(setTimeout(() => { hapticLight(); playUiSound('star_pop', 2); }, firstHapticAt + STAR_STAGGER_MS * 1.5));
      hapticTimeouts.current.push(setTimeout(() => hapticHeavy(), firstHapticAt + stars * STAR_STAGGER_MS + 200));
    } else {
      // A rising celesta note per star, fired in the SAME setTimeout as its
      // haptic so ear and hand land together (tap-tap-tap-THUD).
      if (stars >= 1) hapticTimeouts.current.push(setTimeout(() => { hapticLight(); playUiSound('star_pop', 1); }, firstHapticAt));
      if (stars >= 2) hapticTimeouts.current.push(setTimeout(() => { hapticLight(); playUiSound('star_pop', 2); }, firstHapticAt + STAR_STAGGER_MS));
      if (stars >= 3) hapticTimeouts.current.push(setTimeout(() => { hapticLight(); playUiSound('star_pop', 3); }, firstHapticAt + STAR_STAGGER_MS * 2));
      hapticTimeouts.current.push(setTimeout(() => hapticHeavy(), firstHapticAt + stars * STAR_STAGGER_MS + 150));
    }
  }, [clearSpinner, victoryStar1, victoryStar2, victoryStar3, victoryModalScale, victoryModalOpacity]);

  const playPhaseChangeFlash = useCallback(() => {
    const reducedMotion = getSettingsSync().reducedMotion;
    if (reducedMotion) return;

    phaseFlashOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(phaseFlashOpacity, { toValue: 0.7, duration: 150, useNativeDriver: true }),
      Animated.timing(phaseFlashOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.delay(100),
      Animated.timing(phaseFlashOpacity, { toValue: 0.5, duration: 100, useNativeDriver: true }),
      Animated.timing(phaseFlashOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [phaseFlashOpacity]);

  const skipToEnd = useCallback((stars: number, hushed = false) => {
    // Stop the running victory sequence to prevent in-flight callbacks
    // from overwriting the final values we're about to set.
    runningAnimRef.current?.stop();
    runningAnimRef.current = null;
    // Pending star haptics would land after the visuals settled — replace
    // the remaining rhythm with the settle right now.
    hapticTimeouts.current.forEach(clearTimeout);
    hapticTimeouts.current = [];
    victoryStar1.setValue(stars >= 1 ? 1 : 0);
    victoryStar2.setValue(stars >= 2 ? 1 : 0);
    victoryStar3.setValue(stars >= 3 ? 1 : 0);
    victoryModalScale.setValue(1);
    victoryModalOpacity.setValue(1);
    setVictoryStage('settled');
    // Skipping a hushed beat (finale / silent victory) must not fire the
    // celebration THUD — the screen is performing silence.
    const finalBoard = victoryDataRef.current?.finalBoard === true;
    if (hushed || finalBoard) {
      hapticLight();
    } else {
      hapticHeavy();
      // The stagger was skipped, so land a single top star note (never the
      // full ladder) to acknowledge the pop-in the player fast-forwarded.
      if (stars >= 1) playUiSound('star_pop', stars);
    }
  }, [victoryStar1, victoryStar2, victoryStar3, victoryModalScale, victoryModalOpacity]);

  const resetVictory = useCallback(() => {
    runningAnimRef.current?.stop();
    runningAnimRef.current = null;
    hapticTimeouts.current.forEach(clearTimeout);
    hapticTimeouts.current = [];
    clearSpinner();
    victoryDataRef.current = null;
    setVictoryDataState(null);
    setProcessingVictoryState(false);
    setVictoryStage('idle');
  }, [clearSpinner]);

  const state: VictoryFlowState = {
    victoryData,
    isProcessingVictory,
    victoryStage,
    victorySpinnerVisible,
    victoryStar1,
    victoryStar2,
    victoryStar3,
    victoryModalScale,
    victoryModalOpacity,
    phaseFlashOpacity,
  };

  const actions: VictoryFlowActions = {
    setVictoryData,
    setProcessingVictory,
    playVictorySequence,
    playPhaseChangeFlash,
    resetVictory,
    skipToEnd,
  };

  return [state, actions];
}
