import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CandyColors } from '../../theme/colors';
import { getSettingsSync } from '../../services/settings';

interface ToastProps {
  message: string;
  isError: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, isError }) => {
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const enterAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const shakeAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Stop any in-flight animations from a previous message before starting new ones
    enterAnimRef.current?.stop();
    shakeAnimRef.current?.stop();

    slideAnim.setValue(-20);
    opacityAnim.setValue(0);
    shakeAnim.setValue(0);

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
  }, [message, isError]);

  return (
    <Animated.View
      style={[
        styles.toast,
        isError ? styles.toastError : styles.toastNormal,
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
      <View style={styles.toastShine} />
      <Text style={[styles.toastText, isError && styles.toastTextError]}>
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
