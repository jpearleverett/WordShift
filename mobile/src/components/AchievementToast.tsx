import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CandyColors, getPhaseTheme } from '../theme/colors';
import { Achievement } from '../services/achievements';

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
  phase?: number;
}

/**
 * Animated toast that slides in from the top when an achievement is unlocked.
 * Auto-dismisses after 3 seconds.
 */
export const AchievementToast: React.FC<AchievementToastProps> = ({
  achievement,
  onDismiss,
  phase = 0,
}) => {
  const slideY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (achievement) {
      // Reset and slide in
      slideY.value = -120;
      opacity.value = 0;
      slideY.value = withSpring(0, { damping: 14, stiffness: 60 });
      opacity.value = withTiming(1, { duration: 200 });

      // Auto-dismiss: exit animation after 3s, then callback
      const dismissTimeout = setTimeout(() => {
        slideY.value = withTiming(-120, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
      }, 3000);
      const callbackTimeout = setTimeout(() => {
        onDismissRef.current();
      }, 3300);

      return () => {
        clearTimeout(dismissTimeout);
        clearTimeout(callbackTimeout);
      };
    }
  }, [achievement]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
    opacity: opacity.value,
  }));

  if (!achievement) return null;

  return (
    <Reanimated.View
      style={[styles.container, animStyle]}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Achievement unlocked: ${achievement.title}. ${achievement.description}`}
    >
      <View style={[
        styles.inner,
        phase >= 3 && phase < 4 && { backgroundColor: '#2E2345', borderColor: '#6A4A8A' },
        phase >= 4 && { backgroundColor: '#1A1225', borderColor: '#5A2A3A' },
      ]}>
        <Text style={styles.icon}>{achievement.icon}</Text>
        <View style={styles.textContainer}>
          <Text style={[
            styles.label,
            phase >= 3 && phase < 4 && { color: '#A888C8' },
            phase >= 4 && { color: '#A078C8' },
          ]}>Achievement Unlocked!</Text>
          <Text style={styles.title}>{achievement.title}</Text>
        </View>
      </View>
    </Reanimated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CandyColors.purple.dark,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 2,
    borderColor: CandyColors.yellow.main,
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: CandyColors.yellow.main,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: CandyColors.white,
    marginTop: 2,
  },
});
