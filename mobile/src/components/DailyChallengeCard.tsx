import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { CandyColors } from '../theme/colors';
import { getDailyStatus, getDailyCommunityStats } from '../services/dailyChallenge';
import { Difficulty } from '../types';
import { getSettingsSync } from '../services/settings';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DailyChallengeCardProps {
  onStartDaily: (difficulty: Difficulty) => void;
  phase?: number;
}

export const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({
  onStartDaily,
  phase = 0,
}) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [stars, setStars] = useState(0);
  const [streak, setStreak] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [communityStats, setCommunityStats] = useState<{
    completionRate: number;
    averageStars: number;
    difficultyRating: string;
    perfectRate: number;
  } | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    // Stop any existing loop
    if (pulseLoopRef.current) {
      pulseLoopRef.current.stop();
      pulseLoopRef.current = null;
    }

    if (getSettingsSync().reducedMotion) {
      pulseAnim.setValue(1);
      return;
    }

    if (!isCompleted) {
      pulseLoopRef.current = Animated.loop(
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
      pulseLoopRef.current.start();
    }

    return () => {
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current = null;
      }
      pulseAnim.stopAnimation();
    };
  }, [isCompleted]);

  const loadStatus = async () => {
    const status = await getDailyStatus();
    setIsCompleted(status.isCompleted);
    setDifficulty(status.difficulty);
    setStreak(status.streak);
    if (status.todayResult) {
      setStars(status.todayResult.stars);
    }
    const community = getDailyCommunityStats();
    setCommunityStats(community);
  };

  const difficultyColor = {
    EASY: CandyColors.green.main,
    MEDIUM: CandyColors.yellow.main,
    HARD: CandyColors.red.main,
  }[difficulty];

  const handlePress = () => {
    if (!isCompleted) {
      onStartDaily(difficulty);
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded(prev => !prev);
    }
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <TouchableOpacity
        style={[
          styles.bar,
          isCompleted && styles.barCompleted,
          phase >= 3 && phase < 4 && { backgroundColor: 'rgba(74, 90, 74, 0.85)', borderColor: 'rgba(122, 138, 122, 0.3)' },
          phase >= 4 && { backgroundColor: 'rgba(42, 53, 42, 0.9)', borderColor: 'rgba(90, 106, 90, 0.3)' },
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>{isCompleted ? '✅' : '📅'}</Text>
        <Text style={styles.label}>Daily</Text>
        <View style={[styles.difficultyDot, { backgroundColor: difficultyColor }]} />
        <Text style={styles.difficultyText}>{difficulty}</Text>

        {streak > 1 && (
          <Text style={styles.streakText}>🔥{streak}</Text>
        )}

        <View style={styles.spacer} />

        {isCompleted ? (
          <View style={styles.completedSection}>
            <Text style={styles.starsText}>
              {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
            </Text>
            <Text style={styles.expandHint}>{expanded ? '▲' : '▼'}</Text>
          </View>
        ) : (
          <View style={[
            styles.playBadge,
            phase >= 3 && phase < 4 && { backgroundColor: '#7A8A7A' },
            phase >= 4 && { backgroundColor: '#5A6A5A' },
          ]}>
            <Text style={styles.playText}>PLAY</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Expanded community stats */}
      {expanded && isCompleted && communityStats && (
        <View style={styles.communityStatsRow}>
          <View style={styles.communityStatItem}>
            <Text style={styles.communityStatValue}>{communityStats.completionRate}%</Text>
            <Text style={styles.communityStatLabel}>solved</Text>
          </View>
          <View style={styles.communityStatDivider} />
          <View style={styles.communityStatItem}>
            <Text style={styles.communityStatValue}>{communityStats.averageStars}</Text>
            <Text style={styles.communityStatLabel}>avg stars</Text>
          </View>
          <View style={styles.communityStatDivider} />
          <View style={styles.communityStatItem}>
            <Text style={styles.communityStatValue}>{communityStats.perfectRate}%</Text>
            <Text style={styles.communityStatLabel}>perfect</Text>
          </View>
          <View style={styles.communityStatDivider} />
          <View style={styles.communityStatItem}>
            <Text style={[
              styles.communityStatValue,
              styles.communityDifficultyText,
              communityStats.difficultyRating === 'Tricky' && styles.communityDifficultyTricky,
            ]}>
              {communityStats.difficultyRating}
            </Text>
            <Text style={styles.communityStatLabel}>rating</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 4,
    zIndex: 10,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 60, 30, 0.85)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 6,
  },
  barCompleted: {
    backgroundColor: 'rgba(20, 70, 40, 0.9)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: CandyColors.white,
  },
  difficultyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  streakText: {
    fontSize: 10,
    fontWeight: '700',
    color: CandyColors.orange.light,
  },
  spacer: {
    flex: 1,
  },
  completedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsText: {
    fontSize: 13,
  },
  expandHint: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  playBadge: {
    backgroundColor: CandyColors.yellow.main,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
  },
  playText: {
    fontSize: 11,
    fontWeight: '900',
    color: CandyColors.gray[800],
    letterSpacing: 1,
  },
  communityStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  communityStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  communityStatValue: {
    fontSize: 12,
    fontWeight: '800',
    color: CandyColors.white,
  },
  communityStatLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 1,
  },
  communityStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  communityDifficultyText: {
    color: CandyColors.green.main,
    fontSize: 10,
  },
  communityDifficultyTricky: {
    color: CandyColors.orange.main,
  },
});
