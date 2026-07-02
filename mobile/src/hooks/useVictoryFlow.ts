import { useRef, useState, useCallback, useEffect } from 'react';
import { Animated } from 'react-native';
import { VictoryData } from './useGamePersistence';
import { getSettingsSync } from '../services/settings';
import { hapticLight, hapticHeavy } from '../services/haptics';

/**
 * Where the victory flow currently is:
 * - 'idle': no victory in flight
 * - 'recording': the brief pre-modal record/persist gap after the final move
 * - 'choreographing': the star/modal entrance animation is running (skippable)
 * - 'settled': entrance finished (naturally or via skip) — modal is interactive
 */
export type VictoryStage = 'idle' | 'recording' | 'choreographing' | 'settled';

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
  playVictorySequence: (stars: number) => void;
  playPhaseChangeFlash: () => void;
  resetVictory: () => void;
  /** Instantly complete victory animation (tap-to-skip-forward) */
  skipToEnd: (stars: number) => void;
}

export function useVictoryFlow(): [VictoryFlowState, VictoryFlowActions] {
  const [victoryData, setVictoryData] = useState<VictoryData | null>(null);
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

  const playVictorySequence = useCallback((stars: number) => {
    clearSpinner();
    const reducedMotion = getSettingsSync().reducedMotion;
    if (reducedMotion) {
      victoryStar1.setValue(stars >= 1 ? 1 : 0);
      victoryStar2.setValue(stars >= 2 ? 1 : 0);
      victoryStar3.setValue(stars >= 3 ? 1 : 0);
      victoryModalScale.setValue(1);
      victoryModalOpacity.setValue(1);
      setVictoryStage('settled');
      hapticHeavy();
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
        Animated.spring(victoryStar1, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true })
      );
    }
    if (stars >= 2) {
      starAnims.push(
        Animated.spring(victoryStar2, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true })
      );
    }
    if (stars >= 3) {
      starAnims.push(
        Animated.spring(victoryStar3, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true })
      );
    }

    runningAnimRef.current?.stop();
    // Card first, stars on top: the modal reveal carries the post-move wait
    // (no spinner), and the star pops are actually visible instead of playing
    // behind a fully transparent card.
    const sequence = Animated.parallel([
      Animated.spring(victoryModalScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
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

    // Haptic rhythm synced to star stagger: tap-tap-tap-THUD
    hapticTimeouts.current.forEach(clearTimeout);
    hapticTimeouts.current = [];
    const firstHapticAt = STAR_POP_DELAY_MS + STAR_HAPTIC_OFFSET_MS;
    if (stars >= 1) hapticTimeouts.current.push(setTimeout(() => hapticLight(), firstHapticAt));
    if (stars >= 2) hapticTimeouts.current.push(setTimeout(() => hapticLight(), firstHapticAt + STAR_STAGGER_MS));
    if (stars >= 3) hapticTimeouts.current.push(setTimeout(() => hapticLight(), firstHapticAt + STAR_STAGGER_MS * 2));
    hapticTimeouts.current.push(setTimeout(() => hapticHeavy(), firstHapticAt + stars * STAR_STAGGER_MS + 150));
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

  const skipToEnd = useCallback((stars: number) => {
    // Stop the running victory sequence to prevent in-flight callbacks
    // from overwriting the final values we're about to set.
    runningAnimRef.current?.stop();
    runningAnimRef.current = null;
    // Pending star haptics would land after the visuals settled — replace
    // the remaining rhythm with the settle THUD right now.
    hapticTimeouts.current.forEach(clearTimeout);
    hapticTimeouts.current = [];
    victoryStar1.setValue(stars >= 1 ? 1 : 0);
    victoryStar2.setValue(stars >= 2 ? 1 : 0);
    victoryStar3.setValue(stars >= 3 ? 1 : 0);
    victoryModalScale.setValue(1);
    victoryModalOpacity.setValue(1);
    setVictoryStage('settled');
    hapticHeavy();
  }, [victoryStar1, victoryStar2, victoryStar3, victoryModalScale, victoryModalOpacity]);

  const resetVictory = useCallback(() => {
    runningAnimRef.current?.stop();
    runningAnimRef.current = null;
    hapticTimeouts.current.forEach(clearTimeout);
    hapticTimeouts.current = [];
    clearSpinner();
    setVictoryData(null);
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
