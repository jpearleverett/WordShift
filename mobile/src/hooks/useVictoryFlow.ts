import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  SharedValue,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { VictoryData } from './useGamePersistence';
import { getSettingsSync } from '../services/settings';
import { hapticLight, hapticHeavy } from '../services/haptics';

export interface VictoryFlowState {
  victoryData: VictoryData | null;
  isProcessingVictory: boolean;
  victoryStar1: SharedValue<number>;
  victoryStar2: SharedValue<number>;
  victoryStar3: SharedValue<number>;
  victoryModalScale: SharedValue<number>;
  victoryModalOpacity: SharedValue<number>;
  phaseFlashOpacity: SharedValue<number>;
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

  const victoryStar1 = useSharedValue(0);
  const victoryStar2 = useSharedValue(0);
  const victoryStar3 = useSharedValue(0);
  const victoryModalScale = useSharedValue(0.8);
  const victoryModalOpacity = useSharedValue(0);
  const phaseFlashOpacity = useSharedValue(0);
  const hapticTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup haptic timeouts on unmount
  useEffect(() => {
    return () => {
      hapticTimeouts.current.forEach(clearTimeout);
    };
  }, []);

  const playVictorySequence = useCallback((stars: number) => {
    const reducedMotion = getSettingsSync().reducedMotion;
    if (reducedMotion) {
      victoryStar1.value = stars >= 1 ? 1 : 0;
      victoryStar2.value = stars >= 2 ? 1 : 0;
      victoryStar3.value = stars >= 3 ? 1 : 0;
      victoryModalScale.value = 1;
      victoryModalOpacity.value = 1;
      hapticHeavy();
      return;
    }

    // Reset all values
    victoryStar1.value = 0;
    victoryStar2.value = 0;
    victoryStar3.value = 0;
    victoryModalScale.value = 0.8;
    victoryModalOpacity.value = 0;

    // Stars pop in with staggered delay (150ms apart)
    const starDelay = 150;
    const springConfig = { damping: 4, stiffness: 120 };
    if (stars >= 1) {
      victoryStar1.value = withDelay(0, withSpring(1, springConfig));
    }
    if (stars >= 2) {
      victoryStar2.value = withDelay(starDelay, withSpring(1, springConfig));
    }
    if (stars >= 3) {
      victoryStar3.value = withDelay(starDelay * 2, withSpring(1, springConfig));
    }

    // Modal reveal after stars (delay = stars * 150ms + buffer for spring settle)
    const modalDelay = stars * starDelay + 100;
    victoryModalScale.value = withDelay(
      modalDelay,
      withSpring(1, { damping: 8, stiffness: 150 }),
    );
    victoryModalOpacity.value = withDelay(
      modalDelay,
      withTiming(1, { duration: 250 }),
    );

    // Haptic rhythm synced to star stagger: tap-tap-tap-THUD
    hapticTimeouts.current.forEach(clearTimeout);
    hapticTimeouts.current = [];
    if (stars >= 1) hapticTimeouts.current.push(setTimeout(() => hapticLight(), 100));
    if (stars >= 2) hapticTimeouts.current.push(setTimeout(() => hapticLight(), 250));
    if (stars >= 3) hapticTimeouts.current.push(setTimeout(() => hapticLight(), 400));
    hapticTimeouts.current.push(setTimeout(() => hapticHeavy(), 100 + stars * 150 + 100));
  }, []);

  const playPhaseChangeFlash = useCallback(() => {
    const reducedMotion = getSettingsSync().reducedMotion;
    if (reducedMotion) return;

    phaseFlashOpacity.value = 0;
    phaseFlashOpacity.value = withSequence(
      withTiming(0.7, { duration: 150 }),
      withTiming(0, { duration: 100 }),
      withDelay(100, withTiming(0.5, { duration: 100 })),
      withTiming(0, { duration: 400 }),
    );
  }, []);

  const skipToEnd = useCallback((stars: number) => {
    // Cancel any running animations — Reanimated cancels automatically when
    // we assign new values, but explicit cancel ensures cleanup of withDelay
    cancelAnimation(victoryStar1);
    cancelAnimation(victoryStar2);
    cancelAnimation(victoryStar3);
    cancelAnimation(victoryModalScale);
    cancelAnimation(victoryModalOpacity);
    victoryStar1.value = stars >= 1 ? 1 : 0;
    victoryStar2.value = stars >= 2 ? 1 : 0;
    victoryStar3.value = stars >= 3 ? 1 : 0;
    victoryModalScale.value = 1;
    victoryModalOpacity.value = 1;
  }, []);

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

  const actions: VictoryFlowActions = useMemo(() => ({
    setVictoryData,
    setProcessingVictory,
    playVictorySequence,
    playPhaseChangeFlash,
    resetVictory,
    skipToEnd,
  }), [
    setVictoryData,
    setProcessingVictory,
    playVictorySequence,
    playPhaseChangeFlash,
    resetVictory,
    skipToEnd,
  ]);

  return [state, actions];
}
