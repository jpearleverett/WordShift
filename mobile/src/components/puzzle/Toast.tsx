import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { CandyColors, getPhaseTheme } from '../../theme/colors';
import { getModalInSpring } from '../../theme/surfaces';
import { getSettingsSync } from '../../services/settings';
import { announceForA11y } from '../../services/a11yAnnounce';
import { PIXEL_FONT_BOLD, BODY_FONT_ITALIC } from '../../theme/fonts';

interface ToastProps {
  message: string;
  isError: boolean;
  /** Current narrative phase (0-5) — drives the toast's surface colors. */
  phase?: number;
  /** The cold-open's warm unnamed voice: render in the cottage's handwritten
   *  italic on a warm parchment tray with a small ember glyph, so Ember's guiding
   *  lines don't wear the same system-toast chrome as a rules/error message. */
  isVoice?: boolean;
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

export const Toast: React.FC<ToastProps> = ({ message, isError, phase = 0, isVoice = false }) => {
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const enterAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const shakeAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  // Last message spoken via the iOS announce fallback (dedupe guard).
  const lastAnnouncedRef = useRef<string | null>(null);
  // The message currently seated in the pill, so a REPLACEMENT (one move
  // message swapping for another while the pill is already up) refreshes the
  // text in place instead of flying a fresh pill in from scratch every time.
  const seatedMessageRef = useRef<string>('');
  // Live phase for the entrance spring, read inside the message-change effect
  // without making phase an effect dependency (a phase shift shouldn't re-fly a
  // seated pill; the next message picks up the new weight).
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const toastTheme = getToastTheme(phase);

  useEffect(() => {
    // Stop any in-flight animations from a previous message before starting new ones
    enterAnimRef.current?.stop();
    shakeAnimRef.current?.stop();

    const trimmed = (message ?? '').trim();
    const seated = seatedMessageRef.current;
    seatedMessageRef.current = trimmed;

    // Empty message: keep the pill fully hidden — never fly an empty bubble in.
    if (!trimmed) {
      slideAnim.setValue(-20);
      opacityAnim.setValue(0);
      shakeAnim.setValue(0);
      return;
    }

    if (getSettingsSync().reducedMotion) {
      slideAnim.setValue(0);
      opacityAnim.setValue(1);
      shakeAnim.setValue(0);
      return;
    }

    shakeAnim.setValue(0);
    const isReplacement = seated !== '' && seated !== trimmed;

    if (isReplacement) {
      // In-place cross-fade: the pill stays seated (no slide from -20, no
      // opacity 0), and a quick dip + restore masks the text swap. Kills the
      // full fade-from-zero + slide that flickered above the board on every
      // consecutive move message.
      slideAnim.setValue(0);
      const refresh = Animated.sequence([
        Animated.timing(opacityAnim, { toValue: 0.4, duration: 90, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 170, useNativeDriver: true }),
      ]);
      enterAnimRef.current = refresh;
      refresh.start(() => { enterAnimRef.current = null; });
    } else {
      // Fresh appearance (the pill was empty): the full slide + fade entrance.
      // The entrance spring ages with the descent (getModalInSpring) so the pill
      // no longer bounces in candy-bright over a dark board.
      slideAnim.setValue(-20);
      opacityAnim.setValue(0);
      const entranceSpring = getModalInSpring(phaseRef.current);
      const enterAnim = Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: entranceSpring.friction,
          tension: entranceSpring.tension,
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
    }

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
  }, [message, isError]);

  // iOS live-region fallback: the visual accessibilityLiveRegion below is
  // Android-only, so move feedback and receipts would go unspoken on iOS. Speak
  // the toast text through the announce bridge when it changes, guarded against
  // empty and duplicate messages so it can't spam or double-speak on Android
  // (which the live region already handles).
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const trimmed = (message ?? '').trim();
    if (!trimmed || trimmed === lastAnnouncedRef.current) return;
    lastAnnouncedRef.current = trimmed;
    announceForA11y(trimmed);
  }, [message]);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: isVoice && !isError ? '#FBEEDA' : (isError ? toastTheme.errorBg : toastTheme.normalBg),
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
      <View style={[styles.toastShine, { backgroundColor: isVoice && !isError ? 'rgba(255,255,255,0.35)' : toastTheme.shine }]} />
      <Text
        style={[
          isVoice && !isError ? styles.toastVoiceText : styles.toastText,
          { color: isVoice && !isError ? '#5A4326' : (isError ? toastTheme.errorText : toastTheme.normalText) },
        ]}
      >
        {isVoice && !isError ? `✻  ${message}` : message}
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
  // The cold-open voice: the cottage's handwritten italic, a touch larger and
  // lighter than the system-toast weight, so it reads as a warm aside.
  toastVoiceText: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: 15.5,
    fontStyle: 'italic',
  },
});
