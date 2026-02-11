import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { getPhaseSurfaceTheme } from '../../theme/colors';
import { getSettingsSync } from '../../services/settings';

interface ActionButtonProps {
  icon: string;
  label: string;
  colors: { bg: string; border: string; glow: string };
  onPress: () => void;
  disabled: boolean;
  accessibilityLabel?: string;
  phase?: number;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  colors,
  onPress,
  disabled,
  accessibilityLabel,
  phase = 0,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const reducedMotion = getSettingsSync().reducedMotion;
  const surfaceTheme = getPhaseSurfaceTheme(phase);

  useEffect(() => {
    if (glowLoopRef.current) {
      glowLoopRef.current.stop();
      glowLoopRef.current = null;
    }

    if (!disabled && !reducedMotion) {
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
      glowLoopRef.current = glowLoop;
      glowLoop.start();
    } else {
      glowAnim.setValue(disabled ? 0.12 : 0.45);
    }

    return () => {
      if (glowLoopRef.current) {
        glowLoopRef.current.stop();
        glowLoopRef.current = null;
      }
      glowAnim.stopAnimation();
    };
  }, [disabled, reducedMotion, glowAnim]);

  const handlePressIn = () => {
    if (reducedMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (reducedMotion) return;
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
          {
            shadowColor: colors.border,
          },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Glow effect */}
        {!disabled && (
          <Animated.View
            style={[
              styles.actionButtonGlow,
              { backgroundColor: colors.glow, opacity: glowOpacity },
              phase >= 3 && styles.actionButtonGlowDark,
            ]}
          />
        )}

        {/* Button body */}
        <View
          style={[
            styles.actionButtonIcon,
            { backgroundColor: colors.bg },
            {
              borderColor: surfaceTheme.glassBorder,
              shadowColor: colors.border,
            },
          ]}
        >
          {/* Top bevel */}
          <View
            style={[
              styles.actionButtonBevel,
              { backgroundColor: surfaceTheme.glassShine },
            ]}
          />

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
        <Text
          style={[
            styles.actionButtonLabel,
            { color: surfaceTheme.textSecondary },
            phase >= 4 && styles.actionButtonLabelDark,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    position: 'relative',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  actionButtonDisabled: {
    opacity: 0.42,
  },
  actionButtonGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: 20,
    borderRadius: 20,
  },
  actionButtonGlowDark: {
    transform: [{ scale: 1.04 }],
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
    borderWidth: 1,
  },
  actionButtonBevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
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
    letterSpacing: 1.5,
  },
  actionButtonLabelDark: {
    color: 'rgba(214, 184, 198, 0.88)',
  },
});
