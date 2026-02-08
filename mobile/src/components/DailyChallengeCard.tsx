import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { CandyColors } from '../theme/colors';
import { getDailyStatus } from '../services/dailyChallenge';
import { Difficulty } from '../types';

interface DailyChallengeCardProps {
  onStartDaily: (difficulty: Difficulty) => void;
}

export const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({
  onStartDaily,
}) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [stars, setStars] = useState(0);
  const [streak, setStreak] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!isCompleted) {
      // Gentle pulse to draw attention
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isCompleted]);

  const loadStatus = async () => {
    const status = await getDailyStatus();
    setIsCompleted(status.isCompleted);
    setDifficulty(status.difficulty);
    setStreak(status.streak);
    if (status.todayResult) {
      setStars(status.todayResult.stars);
    }
  };

  const difficultyColor = {
    EASY: CandyColors.green.main,
    MEDIUM: CandyColors.yellow.main,
    HARD: CandyColors.red.main,
  }[difficulty];

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <TouchableOpacity
        style={[styles.card, isCompleted && styles.cardCompleted]}
        onPress={() => !isCompleted && onStartDaily(difficulty)}
        disabled={isCompleted}
        activeOpacity={0.8}
      >
        <View style={styles.leftSection}>
          <View style={styles.dateRow}>
            <Text style={styles.calendarIcon}>{isCompleted ? '✅' : '📅'}</Text>
            <Text style={styles.dateText}>Daily Challenge</Text>
          </View>
          <View style={styles.difficultyBadge}>
            <View style={[styles.difficultyDot, { backgroundColor: difficultyColor }]} />
            <Text style={styles.difficultyText}>{difficulty}</Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          {isCompleted ? (
            <View style={styles.completedInfo}>
              <Text style={styles.starsText}>
                {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
              </Text>
              <Text style={styles.completedText}>Done!</Text>
            </View>
          ) : (
            <View style={styles.playBadge}>
              <Text style={styles.playText}>PLAY</Text>
            </View>
          )}
          {streak > 1 && (
            <Text style={styles.streakText}>🔥 {streak}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 8,
    zIndex: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 60, 30, 0.85)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardCompleted: {
    backgroundColor: 'rgba(20, 70, 40, 0.9)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  leftSection: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  calendarIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '800',
    color: CandyColors.white,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  playBadge: {
    backgroundColor: CandyColors.yellow.main,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  playText: {
    fontSize: 13,
    fontWeight: '900',
    color: CandyColors.gray[800],
    letterSpacing: 1,
  },
  completedInfo: {
    alignItems: 'flex-end',
  },
  starsText: {
    fontSize: 16,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '700',
    color: CandyColors.green.main,
    marginTop: 2,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
    color: CandyColors.orange.light,
    marginTop: 4,
  },
});
