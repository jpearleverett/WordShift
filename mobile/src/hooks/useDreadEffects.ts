import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';
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
  /** Animated opacity for the crimson dread-pulse overlay. */
  dreadPulseOpacity: Animated.Value;
  /** Animated translateX for horizontal screen shake. */
  screenShakeRef: Animated.Value;
}

export interface DreadEffectsActions {
  /**
   * Fire the dread-pulse animation (crimson flash) and, at Phase 3+,
   * a horizontal screen shake.  Also triggers phase-appropriate haptic
   * feedback.  Respects the `reducedMotion` setting.
   */
  triggerDreadPulse: (phase: number) => void;
}

/**
 * Manages dread-word visual feedback: a brief crimson overlay flash
 * and a horizontal screen shake at higher narrative phases.
 *
 * The two Animated.Values it exposes must be wired into the render tree
 * by the host component:
 * - `dreadPulseOpacity` drives the overlay's opacity
 * - `screenShakeRef`    drives `transform: [{ translateX }]` on the
 *   main container
 */
export function useDreadEffects(): [DreadEffectsState, DreadEffectsActions] {
  const dreadPulseOpacity = useRef(new Animated.Value(0)).current;
  const screenShakeRef = useRef(new Animated.Value(0)).current;

  const triggerDreadPulse = useCallback((phase: number) => {
    // Haptic feedback scaled by phase intensity.
    if (phase >= 3) {
      hapticMedium();
    } else if (phase >= 2) {
      hapticLight();
    }

    if (getSettingsSync().reducedMotion) return;

    // Crimson overlay pulse.
    const maxOpacity = DREAD_PULSE_OPACITY[phase] ?? (phase >= 4 ? 0.25 : 0.10);
    Animated.sequence([
      Animated.timing(dreadPulseOpacity, {
        toValue: maxOpacity,
        duration: DREAD_PULSE_FADE_IN_MS,
        useNativeDriver: true,
      }),
      Animated.timing(dreadPulseOpacity, {
        toValue: 0,
        duration: DREAD_PULSE_FADE_OUT_MS,
        useNativeDriver: true,
      }),
    ]).start();

    // Horizontal screen shake at Phase 3+.
    if (phase >= 3) {
      const intensity = SCREEN_SHAKE_INTENSITY[phase] ?? (phase >= 4 ? 4 : 2);
      Animated.sequence([
        Animated.timing(screenShakeRef, {
          toValue: intensity,
          duration: SCREEN_SHAKE_KEYFRAME_MS,
          useNativeDriver: true,
        }),
        Animated.timing(screenShakeRef, {
          toValue: -intensity,
          duration: SCREEN_SHAKE_KEYFRAME_MS,
          useNativeDriver: true,
        }),
        Animated.timing(screenShakeRef, {
          toValue: intensity * 0.5,
          duration: SCREEN_SHAKE_KEYFRAME_MS,
          useNativeDriver: true,
        }),
        Animated.timing(screenShakeRef, {
          toValue: 0,
          duration: SCREEN_SHAKE_KEYFRAME_MS,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [dreadPulseOpacity, screenShakeRef]);

  const state: DreadEffectsState = { dreadPulseOpacity, screenShakeRef };
  const actions: DreadEffectsActions = { triggerDreadPulse };
  return [state, actions];
}
