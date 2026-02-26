import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { CandyColors } from '../../theme/colors';

interface ToastProps {
  message: string;
  isError: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, isError }) => {
  const slideY = useSharedValue(-20);
  const opacity = useSharedValue(0);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    // Setting new values automatically cancels any running animation on that shared value
    slideY.value = -20;
    opacity.value = 0;
    shakeX.value = 0;

    slideY.value = withSpring(0, { damping: 14, stiffness: 100 });
    opacity.value = withTiming(1, { duration: 200 });

    if (isError) {
      shakeX.value = withSequence(
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [message, isError]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: slideY.value },
      { translateX: shakeX.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View
      style={[
        styles.toast,
        isError ? styles.toastError : styles.toastNormal,
        animStyle,
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <View style={styles.toastShine} />
      <Text style={[styles.toastText, isError && styles.toastTextError]}>
        {message}
      </Text>
    </Reanimated.View>
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  toastNormal: {
    backgroundColor: CandyColors.white,
    shadowColor: CandyColors.purple.main,
  },
  toastError: {
    backgroundColor: CandyColors.red.main,
    shadowColor: CandyColors.red.dark,
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
