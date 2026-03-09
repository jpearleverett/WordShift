import { useCallback, useMemo } from 'react';
import {
  useSharedValue,
  withTiming,
  withSequence,
  cancelAnimation,
  SharedValue,
} from 'react-native-reanimated';
import { getSettingsSync } from '../services/settings';
import { hapticLight, hapticMedium } from '../services/haptics';
import {
  DREAD_PULSE_FADE_IN_MS,
  DREAD_PULSE_FADE_OUT_MS,
  SCREEN_SHAKE_KEYFRAME_MS,
} from '../constants/timing';
import {
  DREAD_PULSE_OPACITY,
  SCREEN_SHAKE_INTENSITY,
} from '../constants/gameBalance';

export interface DreadEffectsState {
  /** Reanimated shared value for the crimson dread-pulse overlay opacity. */
  dreadPulseOpacity: SharedValue<number>;
  /** Reanimated shared value for horizontal screen shake translateX. */
  screenShakeX: SharedValue<number>;
}

export interface DreadEffectsActions {
  /**
   * Fire the dread-pulse animation (crimson flash) and, at Phase 3+,
   * a horizontal screen shake.  Also triggers phase-appropriate haptic
   * feedback.  Respects the `reducedMotion` setting.
   */
  triggerDreadPulse: (phase: number) => void;
  /**
   * Fire a micro-shake for drop impact (used by drag-drop in App.tsx).
   * Runs on the UI thread via Reanimated.
   */
  triggerDropShake: (intensity: number) => void;
}

/**
 * Manages dread-word visual feedback: a brief crimson overlay flash
 * and a horizontal screen shake at higher narrative phases.
 *
 * Fully migrated to Reanimated — all animations run on the UI thread.
 * The shared values must be consumed via `useAnimatedStyle` in the host.
 */
export function useDreadEffects(): [DreadEffectsState, DreadEffectsActions] {
  const dreadPulseOpacity = useSharedValue(0);
  const screenShakeX = useSharedValue(0);

  const triggerDreadPulse = useCallback((phase: number) => {
    // Haptic feedback scaled by phase intensity.
    if (phase >= 3) {
      hapticMedium();
    } else if (phase >= 2) {
      hapticLight();
    }

    if (getSettingsSync().reducedMotion) return;

    // Cancel any in-flight animations before starting new ones.
    cancelAnimation(dreadPulseOpacity);
    cancelAnimation(screenShakeX);

    // Crimson overlay pulse — UI thread.
    const maxOpacity = DREAD_PULSE_OPACITY[phase] ?? (phase >= 4 ? 0.25 : 0.10);
    dreadPulseOpacity.value = withSequence(
      withTiming(maxOpacity, { duration: DREAD_PULSE_FADE_IN_MS }),
      withTiming(0, { duration: DREAD_PULSE_FADE_OUT_MS }),
    );

    // Horizontal screen shake at Phase 2+ (subtle at Phase 2, stronger at Phase 3-4).
    if (phase >= 2) {
      const intensity = SCREEN_SHAKE_INTENSITY[phase] ?? (phase >= 4 ? 4 : 2);
      screenShakeX.value = withSequence(
        withTiming(intensity, { duration: SCREEN_SHAKE_KEYFRAME_MS }),
        withTiming(-intensity, { duration: SCREEN_SHAKE_KEYFRAME_MS }),
        withTiming(intensity * 0.5, { duration: SCREEN_SHAKE_KEYFRAME_MS }),
        withTiming(0, { duration: SCREEN_SHAKE_KEYFRAME_MS }),
      );
    }
  }, []);

  const triggerDropShake = useCallback((intensity: number) => {
    if (getSettingsSync().reducedMotion) return;
    cancelAnimation(screenShakeX);
    screenShakeX.value = withSequence(
      withTiming(intensity, { duration: SCREEN_SHAKE_KEYFRAME_MS }),
      withTiming(-intensity, { duration: SCREEN_SHAKE_KEYFRAME_MS }),
      withTiming(intensity * 0.5, { duration: SCREEN_SHAKE_KEYFRAME_MS }),
      withTiming(0, { duration: SCREEN_SHAKE_KEYFRAME_MS }),
    );
  }, []);

  const state: DreadEffectsState = { dreadPulseOpacity, screenShakeX };
  const actions: DreadEffectsActions = useMemo(() => ({ triggerDreadPulse, triggerDropShake }), [triggerDreadPulse, triggerDropShake]);
  return [state, actions];
}
