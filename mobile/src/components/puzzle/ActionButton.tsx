import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';

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
