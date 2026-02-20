import { useRef, useState, useCallback, useEffect } from 'react';
import { Animated } from 'react-native';
import { VictoryData } from './useGamePersistence';
import { getSettingsSync } from '../services/settings';
import { hapticLight, hapticHeavy } from '../services/haptics';

export interface VictoryFlowState {
  victoryData: VictoryData | null;
  isProcessingVictory: boolean;
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
  const [isProcessingVictory, setProcessingVictory] = useState(false);

  const victoryStar1 = useRef(new Animated.Value(0)).current;
  const victoryStar2 = useRef(new Animated.Value(0)).current;
  const victoryStar3 = useRef(new Animated.Value(0)).current;
  const victoryModalScale = useRef(new Animated.Value(0.8)).current;
  const victoryModalOpacity = useRef(new Animated.Value(0)).current;
  const phaseFlashOpacity = useRef(new Animated.Value(0)).current;
  const hapticTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Ref to the running victory sequence animation (so skipToEnd can stop it). */
  const runningAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Cleanup haptic timeouts and running animations on unmount
  useEffect(() => {
    return () => {
      hapticTimeouts.current.forEach(clearTimeout);
      runningAnimRef.current?.stop();
      runningAnimRef.current = null;
    };
  }, []);

  const playVictorySequence = useCallback((stars: number) => {
    const reducedMotion = getSettingsSync().reducedMotion;
    if (reducedMotion) {
      victoryStar1.setValue(stars >= 1 ? 1 : 0);
      victoryStar2.setValue(stars >= 2 ? 1 : 0);
      victoryStar3.setValue(stars >= 3 ? 1 : 0);
      victoryModalScale.setValue(1);
      victoryModalOpacity.setValue(1);
      hapticHeavy();
      return;
    }

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
    const sequence = Animated.sequence([
      Animated.stagger(200, starAnims),
      Animated.parallel([
        Animated.spring(victoryModalScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(victoryModalOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
    ]);
    runningAnimRef.current = sequence;
    sequence.start(() => { runningAnimRef.current = null; });

    // Haptic rhythm synced to star stagger: tap-tap-tap-THUD
    hapticTimeouts.current.forEach(clearTimeout);
    hapticTimeouts.current = [];
    if (stars >= 1) hapticTimeouts.current.push(setTimeout(() => hapticLight(), 100));
    if (stars >= 2) hapticTimeouts.current.push(setTimeout(() => hapticLight(), 300));
    if (stars >= 3) hapticTimeouts.current.push(setTimeout(() => hapticLight(), 500));
    hapticTimeouts.current.push(setTimeout(() => hapticHeavy(), 100 + stars * 200 + 150));
  }, [victoryStar1, victoryStar2, victoryStar3, victoryModalScale, victoryModalOpacity]);

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
    victoryStar1.setValue(stars >= 1 ? 1 : 0);
    victoryStar2.setValue(stars >= 2 ? 1 : 0);
    victoryStar3.setValue(stars >= 3 ? 1 : 0);
    victoryModalScale.setValue(1);
    victoryModalOpacity.setValue(1);
  }, [victoryStar1, victoryStar2, victoryStar3, victoryModalScale, victoryModalOpacity]);

  const resetVictory = useCallback(() => {
    setVictoryData(null);
    setProcessingVictory(false);
  }, []);

  const state: VictoryFlowState = {
    victoryData,
    isProcessingVictory,
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
