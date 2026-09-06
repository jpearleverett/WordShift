import { useRef, useCallback, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
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

/**
 * F79: the pulse's intensity already ages with phase (DREAD_PULSE_OPACITY),
 * but its ENVELOPE didn't — every phase used the same flat 300ms decay. The
 * ATTACK (DREAD_PULSE_FADE_IN_MS) stays fixed at every phase: a dread flash
 * must still startle instantly, even in the deep descent. Only the RELEASE
 * lengthens as the phases darken, so the dread lingers a beat longer before
 * fading, rather than snapping off the same way it did on Phase 0.
 */
const DREAD_PULSE_FADE_OUT_BY_PHASE: Record<number, number> = {
  0: DREAD_PULSE_FADE_OUT_MS,
  1: DREAD_PULSE_FADE_OUT_MS,
  2: DREAD_PULSE_FADE_OUT_MS,
  3: 450,
  4: 700,
  5: 700,
};

function getDreadPulseFadeOutMs(phase: number): number {
  return DREAD_PULSE_FADE_OUT_BY_PHASE[phase] ?? (phase >= 4 ? 700 : DREAD_PULSE_FADE_OUT_MS);
}

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
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const shakeAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Cleanup running animations on unmount
  useEffect(() => {
    return () => {
      pulseAnimRef.current?.stop();
      shakeAnimRef.current?.stop();
    };
  }, []);

  const triggerDreadPulse = useCallback((phase: number) => {
    // Haptic feedback scaled by phase intensity.
    if (phase >= 3) {
      hapticMedium();
    } else if (phase >= 2) {
      hapticLight();
    }
    // Movement and touch have independent preferences.
    if (getSettingsSync().reducedMotion) return;

    // Stop any in-flight animations before starting new ones.
    pulseAnimRef.current?.stop();
    shakeAnimRef.current?.stop();

    // Crimson overlay pulse. The attack (startle) stays constant at every
    // phase; only the release lengthens and eases out as the phases darken
    // (F79), so the dread visibly lingers instead of snapping off uniformly.
    const maxOpacity = DREAD_PULSE_OPACITY[phase] ?? (phase >= 4 ? 0.25 : 0.10);
    pulseAnimRef.current = Animated.sequence([
      Animated.timing(dreadPulseOpacity, {
        toValue: maxOpacity,
        duration: DREAD_PULSE_FADE_IN_MS,
        useNativeDriver: true,
      }),
      Animated.timing(dreadPulseOpacity, {
        toValue: 0,
        duration: getDreadPulseFadeOutMs(phase),
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    pulseAnimRef.current.start(() => { pulseAnimRef.current = null; });

    // Horizontal screen shake at Phase 2+ (subtle at Phase 2, stronger at Phase 3-4).
    if (phase >= 2) {
      const intensity = SCREEN_SHAKE_INTENSITY[phase] ?? (phase >= 4 ? 4 : 2);
      shakeAnimRef.current = Animated.sequence([
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
      ]);
      shakeAnimRef.current.start(() => { shakeAnimRef.current = null; });
    }
  }, [dreadPulseOpacity, screenShakeRef]);

  const state: DreadEffectsState = { dreadPulseOpacity, screenShakeRef };
  const actions: DreadEffectsActions = { triggerDreadPulse };
  return [state, actions];
}
