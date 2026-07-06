import React, { useRef, useCallback } from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SURFACE, getPressSpring, getSurfaceTheme } from '../../theme/surfaces';
import { getSettingsSync } from '../../services/settings';

export type CandyButtonVariant = 'primary' | 'amber' | 'secondary' | 'quiet';

interface CandyButtonProps {
  label: string;
  onPress: () => void;
  phase: number;
  /**
   * primary   — the one strong CTA on a surface (chunky purple bevel)
   * amber     — prices / claims (chunky gold bevel, the single warm accent)
   * secondary — tinted framed pill, no bevel (supporting actions)
   * quiet     — text-only (dismiss / destructive-adjacent)
   */
  variant?: CandyButtonVariant;
  disabled?: boolean;
  /** Optional ui-sprite icon rendered left of the label. */
  icon?: ImageSourcePropType;
  size?: 'md' | 'lg';
  style?: ViewStyle;
  accessibilityLabel?: string;
}

/**
 * Chunky two-layer candy button — the shared press feel for every menu and
 * modal. A darker bottom "edge" View gives the face physical thickness; the
 * face travels down onto it while pressed and springs back with phase-aware
 * weight (bright phases snap, dark phases release heavily). Displacement,
 * never an opacity fade. Reduced motion pins the face (no travel animation).
 */
export const CandyButton: React.FC<CandyButtonProps> = ({
  label,
  onPress,
  phase,
  variant = 'primary',
  disabled = false,
  icon,
  size = 'md',
  style,
  accessibilityLabel,
}) => {
  const t = getSurfaceTheme(phase);
  const reducedMotion = getSettingsSync().reducedMotion;
  const travel = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    if (reducedMotion) return;
    Animated.timing(travel, { toValue: 1, duration: 70, useNativeDriver: true }).start();
  }, [travel, reducedMotion]);

  const handlePressOut = useCallback(() => {
    if (reducedMotion) return;
    const spring = getPressSpring(phase);
    Animated.spring(travel, { toValue: 0, ...spring, useNativeDriver: true }).start();
  }, [travel, phase, reducedMotion]);

  const beveled = variant === 'primary' || variant === 'amber';
  const face = variant === 'primary'
    ? { bg: t.primaryBg, edge: t.primaryEdge, text: t.primaryText }
    : variant === 'amber'
      ? { bg: t.pillBg, edge: t.pillEdge, text: t.pillText }
      : variant === 'secondary'
        ? { bg: t.secondaryBg, edge: 'transparent', text: t.secondaryText }
        : { bg: 'transparent', edge: 'transparent', text: t.muted };

  const translateY = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SURFACE.pressTravel],
  });

  const minHeight = size === 'lg' ? 56 : 46;

  if (!beveled) {
    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        style={[styles.flatWrapper, { minHeight: variant === 'quiet' ? 44 : minHeight }, style]}
        hitSlop={variant === 'quiet' ? { top: 6, bottom: 6, left: 8, right: 8 } : undefined}
      >
        <Animated.View
          style={[
            styles.flatFace,
            variant === 'secondary' && {
              backgroundColor: face.bg,
              borderColor: t.secondaryBorder,
              borderWidth: 1.5,
              borderRadius: SURFACE.buttonRadius,
              minHeight,
            },
            { transform: [{ translateY }] },
          ]}
        >
          {icon ? <Image source={icon} style={styles.icon} resizeMode="contain" /> : null}
          <Text
            style={[
              styles.label,
              size === 'lg' && styles.labelLg,
              { color: face.text },
              variant === 'quiet' && styles.quietLabel,
              disabled && styles.disabledLabel,
            ]}
          >
            {label}
          </Text>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={[styles.bevelWrapper, disabled && styles.disabledWrapper, style]}
    >
      {/* Bottom edge — the button's physical thickness. */}
      <View
        style={[
          styles.edge,
          {
            backgroundColor: face.edge,
            borderRadius: SURFACE.buttonRadius,
            top: SURFACE.bevelDepth,
            minHeight,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.face,
          {
            backgroundColor: face.bg,
            borderRadius: SURFACE.buttonRadius,
            minHeight,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Top highlight — light from above. */}
        <View style={[styles.faceHighlight, { borderRadius: SURFACE.buttonRadius }]} />
        {icon ? <Image source={icon} style={styles.icon} resizeMode="contain" /> : null}
        <Text style={[styles.label, size === 'lg' && styles.labelLg, { color: face.text }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  bevelWrapper: {
    // Reserve room for the edge below the face.
    paddingBottom: SURFACE.bevelDepth,
  },
  disabledWrapper: {
    opacity: 0.45,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  face: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  faceHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
    backgroundColor: `rgba(255, 255, 255, ${SURFACE.highlightAlpha})`,
  },
  flatWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatFace: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 10,
    width: '100%',
  },
  icon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  labelLg: {
    fontSize: 17,
  },
  quietLabel: {
    fontWeight: '600',
    fontSize: 14,
  },
  disabledLabel: {
    opacity: 0.6,
  },
});

export default CandyButton;
