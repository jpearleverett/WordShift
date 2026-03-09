import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { CandyColors } from '../theme/colors';
import { getDailyStatus } from '../services/dailyChallenge';
import { Difficulty } from '../types';
import { getSettingsSync } from '../services/settings';

interface DailyChallengeCardProps {
  onStartDaily: (difficulty: Difficulty) => void;
  phase?: number;
}

/**
 * Compact daily challenge button designed to sit in the header row.
 * - Not completed: pulsing calendar icon, tap starts daily
 * - Completed: checkmark with stars, tap does nothing extra
 * - Streak badge shown when streak > 1
 */
export const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({
  onStartDaily,
  phase = 0,
}) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('HARD');
  const [stars, setStars] = useState(0);
  const [streak, setStreak] = useState(0);
  const pulseAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0.3);

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (getSettingsSync().reducedMotion) {
      cancelAnimation(pulseAnim);
      cancelAnimation(glowAnim);
      pulseAnim.value = 1;
      glowAnim.value = isCompleted ? 0 : 0.6;
      return;
    }

    if (!isCompleted) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      );

      glowAnim.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      );
    } else {
      cancelAnimation(pulseAnim);
      cancelAnimation(glowAnim);
      pulseAnim.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
      glowAnim.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
    }

    return () => {
      cancelAnimation(pulseAnim);
      cancelAnimation(glowAnim);
    };
  }, [isCompleted, glowAnim, pulseAnim]);

  const loadStatus = () => {
    const status = getDailyStatus();
    setIsCompleted(status.isCompleted);
    setDifficulty(status.difficulty);
    setStreak(status.streak);
    if (status.todayResult) {
      setStars(status.todayResult.stars);
    }
  };

  const handlePress = () => {
    if (!isCompleted) {
      onStartDaily(difficulty);
    }
  };

  const btnBg = isCompleted
    ? 'rgba(34, 197, 94, 0.3)'
    : phase >= 4
      ? 'rgba(180, 60, 60, 0.4)'
      : phase >= 3
        ? 'rgba(160, 140, 60, 0.4)'
        : 'rgba(255, 200, 60, 0.35)';

  const glowColor = phase >= 4
    ? 'rgba(180, 60, 60, 0.6)'
    : phase >= 3
      ? 'rgba(160, 140, 60, 0.5)'
      : 'rgba(255, 200, 60, 0.5)';

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  return (
    <Animated.View style={pulseStyle}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: btnBg }]}
        onPress={handlePress}
        activeOpacity={isCompleted ? 1 : 0.7}
        accessibilityLabel={
          isCompleted
            ? `Daily challenge completed. ${stars} stars. ${streak > 1 ? `${streak} day streak.` : ''}`
            : 'Start daily challenge'
        }
        accessibilityRole="button"
      >
        {/* Glow ring for uncompleted */}
        {!isCompleted && (
          <Animated.View
            style={[
              styles.glowRing,
              { borderColor: glowColor },
              glowStyle,
            ]}
            pointerEvents="none"
          />
        )}

        {isCompleted ? (
          <View style={styles.completedContent}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.miniStars}>
              {'★'.repeat(stars)}{'☆'.repeat(3 - stars)}
            </Text>
          </View>
        ) : (
          <Text style={styles.calendarIcon}>📅</Text>
        )}

        {/* Streak badge */}
        {streak > 1 && (
          <View style={[
            styles.streakBadge,
            phase >= 3 && { backgroundColor: '#8B4513' },
          ]}>
            <Text style={styles.streakBadgeText}>{streak}</Text>
          </View>
        )}

        {/* Not-completed indicator dot */}
        {!isCompleted && (
          <View style={[
            styles.notifDot,
            phase >= 4 && { backgroundColor: '#B83C3C' },
          ]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
  },
  calendarIcon: {
    fontSize: 18,
  },
  completedContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    fontSize: 14,
    fontWeight: '900',
    color: CandyColors.green.main,
    marginTop: -1,
  },
  miniStars: {
    fontSize: 7,
    color: CandyColors.yellow.main,
    marginTop: -2,
    letterSpacing: 0.5,
  },
  streakBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: CandyColors.orange.main,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  streakBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: CandyColors.white,
  },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CandyColors.red.main,
  },
});
