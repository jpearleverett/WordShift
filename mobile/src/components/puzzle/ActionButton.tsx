import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { getSettingsSync } from '../../services/settings';

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
  const scaleAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0);

  useEffect(() => {
    const { reducedMotion } = getSettingsSync();
    cancelAnimation(glowAnim);

    if (reducedMotion) {
      glowAnim.value = disabled ? 0 : 0.45;
      return;
    }

    if (!disabled) {
      glowAnim.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
      );
    } else {
      glowAnim.value = withTiming(0, { duration: 150 });
    }

    return () => {
      cancelAnimation(glowAnim);
    };
  }, [disabled, glowAnim]);

  const handlePressIn = () => {
    if (disabled) return;
    scaleAnim.value = withSpring(0.9, {
      damping: 12,
      stiffness: 320,
    });
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1, {
      damping: 10,
      stiffness: 220,
    });
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + glowAnim.value * 0.3,
  }));

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
          buttonStyle,
        ]}
      >
        {/* Glow effect */}
        {!disabled && (
          <Animated.View
            style={[
              styles.actionButtonGlow,
              { backgroundColor: colors.glow },
              glowStyle,
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
          <Text style={styles.actionButtonIconText}>{icon}</Text>
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
    fontSize: 28,
  },
  actionButtonLabel: {
    marginTop: 12,
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1.5,
  },
});
