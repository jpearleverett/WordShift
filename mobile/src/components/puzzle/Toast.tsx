import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CandyColors, getPhaseTheme } from '../../theme/colors';
import { getSettingsSync } from '../../services/settings';
import { PIXEL_FONT_BOLD } from '../../theme/fonts';
import { hasVisibleToastMessage } from './toastMessage';

interface ToastProps {
  message: string;
  isError: boolean;
  /** Current narrative phase (0-5) — drives the toast's surface colors. */
  phase?: number;
}

/**
 * Phase-aware toast colors. Reuses the phase theme's AA-audited modal
 * text/background pairs for the normal toast (the same pairs VictoryModal
 * renders on), plus contrast-checked error pairs per phase group:
 * - Phase 0-2 error: white on CandyColors.red.shadow #B91C1C — 6.5:1
 *   (the old red.main #EF4444 measured only 3.8:1 with white)
 * - Phase 3+ error: #F6C8CE on deep crimson #4A1520 — 9.9:1
 * Exported for the contrast regression tests.
 */
export function getToastTheme(phase: number) {
  const theme = getPhaseTheme(phase);
  if (phase >= 3) {
    return {
      normalBg: theme.modalBgColor,
      normalText: theme.modalTextColor,
      errorBg: '#4A1520',
      errorText: '#F6C8CE',
      // The candy shine reads as a smudge on the dark tinted fills — keep a
      // faint top light so the pill still has form without going bright.
      shine: 'rgba(255, 255, 255, 0.06)',
      shadow: theme.vignetteColor,
    };
  }
  return {
    normalBg: theme.modalBgColor,
    normalText: theme.modalTextColor,
    errorBg: CandyColors.red.shadow,
    errorText: CandyColors.white,
    shine: 'rgba(255, 255, 255, 0.3)',
    shadow: theme.vignetteColor,
  };
}

export const Toast: React.FC<ToastProps> = ({ message, isError, phase = 0 }) => {
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const enterAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const shakeAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const hasVisibleMessage = hasVisibleToastMessage(message);

  const toastTheme = getToastTheme(phase);

  useEffect(() => {
    // Stop any in-flight animations from a previous message before starting new ones
    enterAnimRef.current?.stop();
    shakeAnimRef.current?.stop();

    slideAnim.setValue(-20);
    opacityAnim.setValue(0);
    shakeAnim.setValue(0);

    if (!hasVisibleMessage) return;

    if (getSettingsSync().reducedMotion) {
      slideAnim.setValue(0);
      opacityAnim.setValue(1);
      shakeAnim.setValue(0);
      return;
    }

    const enterAnim = Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]);
    enterAnimRef.current = enterAnim;
    enterAnim.start(() => { enterAnimRef.current = null; });

    if (isError) {
      const shakeSeq = Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]);
      shakeAnimRef.current = shakeSeq;
      shakeSeq.start(() => { shakeAnimRef.current = null; });
    }

    return () => {
      enterAnimRef.current?.stop();
      shakeAnimRef.current?.stop();
    };
  }, [message, isError, hasVisibleMessage]);

  if (!hasVisibleMessage) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: isError ? toastTheme.errorBg : toastTheme.normalBg,
          shadowColor: toastTheme.shadow,
        },
        {
          transform: [
            { translateY: slideAnim },
            { translateX: shakeAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <View style={[styles.toastShine, { backgroundColor: toastTheme.shine }]} />
      <Text style={[styles.toastText, { color: isError ? toastTheme.errorText : toastTheme.normalText }]}>
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  toastText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 15,
    fontWeight: '800',
  },
});
