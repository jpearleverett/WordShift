import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CandyColors, getPhaseSurfaceTheme } from '../../theme/colors';

interface ToastProps {
  message: string;
  isError: boolean;
  phase?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, isError, phase = 0 }) => {
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const surfaceTheme = getPhaseSurfaceTheme(phase);

  useEffect(() => {
    slideAnim.setValue(-20);
    opacityAnim.setValue(0);

    Animated.parallel([
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
    ]).start();

    if (isError) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [message, isError]);

  return (
    <Animated.View
      style={[
        styles.toast,
        isError
          ? [
            styles.toastError,
            {
              backgroundColor: surfaceTheme.dangerAccent,
              borderColor: 'rgba(255, 220, 225, 0.25)',
              shadowColor: surfaceTheme.dangerAccent,
            },
          ]
          : [
            styles.toastNormal,
            {
              backgroundColor: surfaceTheme.cardBg,
              borderColor: surfaceTheme.cardBorder,
              shadowColor: surfaceTheme.cardShadow,
            },
          ],
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
      <View
        style={[
          styles.toastShine,
          { backgroundColor: surfaceTheme.glassShine },
        ]}
      />
      <Text
        style={[
          styles.toastText,
          !isError && { color: phase >= 2 ? surfaceTheme.textSecondary : CandyColors.purple.main },
          isError && styles.toastTextError,
        ]}
      >
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
    borderWidth: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  toastNormal: {
    backgroundColor: CandyColors.white,
    shadowColor: CandyColors.purple.main,
    borderColor: CandyColors.gray[100],
  },
  toastError: {
    backgroundColor: CandyColors.red.main,
    shadowColor: CandyColors.red.dark,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  toastText: {
    fontSize: 15,
    fontWeight: '800',
    color: CandyColors.purple.main,
  },
  toastTextError: {
    color: CandyColors.white,
  },
});
