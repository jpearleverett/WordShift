import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';
import { hapticSelection } from '../../services/haptics';
import { getPressSpring } from '../../theme/surfaces';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { FONT_SIZE } from '../../theme/typeScale';

// Generated candy-style sprites (assets/ui, generateUiIcons.mjs) replacing the
// emoji icons App.tsx passes. Unknown icon strings still render as text, so
// callers need no changes and new icons degrade gracefully.
const ICON_SPRITES: { [icon: string]: ImageSourcePropType } = {
  '↩': require('../../../assets/ui/undo.png'),
  '💡': require('../../../assets/ui/hint.png'),
  '🔄': require('../../../assets/ui/restart.png'),
  '⏭': require('../../../assets/ui/skip.png'),
};

// Key-membership lookup (not truthiness) — bundler asset ids and test stubs
// may be falsy numbers.
export const getActionIconSprite = (icon: string): ImageSourcePropType | null =>
  icon in ICON_SPRITES ? ICON_SPRITES[icon] : null;

interface ActionButtonProps {
  icon: string;
  label: string;
  colors: { bg: string; border: string; glow: string };
  onPress: () => void;
  disabled: boolean;
  accessibilityLabel?: string;
  /** Narrative phase — ages the release spring so the secondary controls carry
   *  the same tactile weight language as the primary buttons (bright snaps back,
   *  the reveal releases heavily). Defaults to phase 0. */
  phase?: number;
  /** Bump this to acknowledge a value change (e.g. the hint count just rose):
   *  a one-shot scale pulse fires whenever it changes. reducedMotion → skipped. */
  pulseSignal?: number;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  colors,
  onPress,
  disabled,
  accessibilityLabel,
  phase = 0,
  pulseSignal,
}) => {
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [glowAnim] = useState(() => new Animated.Value(0));
  // Disabled-tap acknowledgment shake — parity with the locked tiles (a tap on
  // an inert control is felt, not silently swallowed).
  const [shakeAnim] = useState(() => new Animated.Value(0));

  // One-shot acknowledgment pulse when pulseSignal changes (e.g. a milestone
  // hint gift raised the count while the button was off-screen — the pulse
  // fires on the next puzzle-screen render so the count doesn't swap silently).
  const prevPulseRef = useRef(pulseSignal ?? 0);
  useEffect(() => {
    if (pulseSignal === undefined || pulseSignal === prevPulseRef.current) return;
    prevPulseRef.current = pulseSignal;
    if (getSettingsSync().reducedMotion || shouldSimplifyAnimations()) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.2, duration: 140, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
  }, [pulseSignal, scaleAnim]);

  useEffect(() => {
    if (!disabled) {
      // Skip the continuous loop under reduced motion / low-end devices —
      // hold a static mid-value glow instead.
      if (getSettingsSync().reducedMotion || shouldSimplifyAnimations()) {
        glowAnim.setValue(0.5);
      } else {
        // Drives only the glow overlay's opacity (native driver)
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }
    return () => glowAnim.stopAnimation();
  }, [disabled, glowAnim]);

  const handlePressIn = () => {
    // Reduced motion: pin the pressed scale instantly (no spring travel).
    if (getSettingsSync().reducedMotion) {
      scaleAnim.setValue(0.94);
      return;
    }
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    // Reduced motion: snap back instantly, no phase-weighted release travel.
    if (getSettingsSync().reducedMotion) {
      scaleAnim.setValue(1);
      return;
    }
    // The RELEASE ages with the phase (bright snaps, the reveal releases
    // heavily) via the shared tile/button weight language; the press-DOWN above
    // stays constant — the hand does not age.
    const release = getPressSpring(phase);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: release.friction,
      tension: release.tension,
      useNativeDriver: true,
    }).start();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const iconSprite = getActionIconSprite(icon);

  // A tap on a disabled control shakes + ticks (parity with locked tiles), then
  // does nothing else. Keeping the touchable enabled (not the `disabled` prop)
  // is what lets the inert tap be acknowledged at all.
  const handlePress = () => {
    if (disabled) {
      hapticSelection();
      if (!getSettingsSync().reducedMotion) {
        shakeAnim.setValue(0);
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 4, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -4, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 2, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
      }
      return;
    }
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      activeOpacity={1}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Animated.View
        style={[
          styles.actionButton,
          disabled && styles.actionButtonDisabled,
          { transform: [{ scale: scaleAnim }, { translateX: shakeAnim }] },
        ]}
      >
        {/* Glow effect */}
        {!disabled && (
          <Animated.View
            style={[
              styles.actionButtonGlow,
              { backgroundColor: colors.glow, opacity: glowOpacity },
            ]}
          />
        )}

        {/* Button body — disabled flattens to an inert grey face (no candy bg). */}
        <View
          style={[
            styles.actionButtonIcon,
            { backgroundColor: disabled ? '#8C8A94' : colors.bg },
          ]}
        >
          {/* Top bevel — dropped when disabled so the face reads flat/inert. */}
          {!disabled && <View style={styles.actionButtonBevel} />}

          {/* Icon */}
          {iconSprite !== null ? (
            <Image
              source={iconSprite}
              style={styles.actionButtonIconImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.actionButtonIconText}>{icon}</Text>
          )}
        </View>

        {/* 3D edge — dropped when disabled (a flat control has no raised lip). */}
        {!disabled && (
          <View
            style={[
              styles.actionButtonEdge,
              { backgroundColor: colors.border },
            ]}
          />
        )}

        {/* Label */}
        <Text style={styles.actionButtonLabel}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    position: 'relative',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: 20,
    borderRadius: 20,
  },
  actionButtonIcon: {
    width: 64,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonBevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  actionButtonEdge: {
    position: 'absolute',
    bottom: 16,
    left: 4,
    right: 4,
    height: 8,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    zIndex: -1,
  },
  actionButtonIconText: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.hero,
  },
  // Matches the visual footprint of the fontSize-28 emoji it replaces
  actionButtonIconImage: {
    width: 34,
    height: 34,
  },
  actionButtonLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    marginTop: 12,
    fontSize: FONT_SIZE.caption,
    fontWeight: '900',
    // Full-opacity white + a dark legibility shadow: the labels sit directly
    // on the board (no chip), so the shadow anchors them against the bright
    // phase-0/1 background where a 0.8 white washed out.
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 1.5,
  },
});
