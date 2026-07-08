import React, { useEffect, useRef } from 'react';
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
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';

// Generated candy-style sprites (assets/ui, generateUiIcons.mjs) replacing the
// emoji icons App.tsx passes. Unknown icon strings still render as text, so
// callers need no changes and new icons degrade gracefully.
const ICON_SPRITES: { [icon: string]: ImageSourcePropType } = {
  '↩': require('../../../assets/ui/undo.png'),
  '💡': require('../../../assets/ui/hint.png'),
  '🔄': require('../../../assets/ui/restart.png'),
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
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  colors,
  onPress,
  disabled,
  accessibilityLabel,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

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
  }, [disabled]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const iconSprite = getActionIconSprite(icon);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Animated.View
        style={[
          styles.actionButton,
          disabled && styles.actionButtonDisabled,
          { transform: [{ scale: scaleAnim }] },
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

        {/* Button body */}
        <View
          style={[
            styles.actionButtonIcon,
            { backgroundColor: colors.bg },
          ]}
        >
          {/* Top bevel */}
          <View style={styles.actionButtonBevel} />

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

        {/* 3D edge */}
        <View
          style={[
            styles.actionButtonEdge,
            { backgroundColor: colors.border },
          ]}
        />

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
    fontSize: 28,
  },
  // Matches the visual footprint of the fontSize-28 emoji it replaces
  actionButtonIconImage: {
    width: 34,
    height: 34,
  },
  actionButtonLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    marginTop: 12,
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1.5,
  },
});
