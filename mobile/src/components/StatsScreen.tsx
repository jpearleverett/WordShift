import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { CandyColors } from '../theme/colors';
import { CumulativeStats, getCumulativeStats, getAverageStars, getThreeStarRate } from '../services/starRating';
import { getAchievementsWithStatus, Achievement, getTotalCount } from '../services/achievements';
import { getDailyStatus } from '../services/dailyChallenge';
import { getStreakInfo } from '../services/amberCurrency';
import { Difficulty } from '../types';

interface StatsScreenProps {
  onClose: () => void;
  puzzlesSolved: number;
  currentPhase: number;
  amberBalance: number;
  phase?: number;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({
  onClose,
  puzzlesSolved,
  currentPhase,
  amberBalance,
  phase = 0,
}) => {
  const effectivePhase = phase || currentPhase;
  const [stats, setStats] = useState<CumulativeStats | null>(null);
  const [achievements, setAchievements] = useState<(Achievement & { isUnlocked: boolean; unlockedAt: number | null })[]>([]);
  const [dailyStatus, setDailyStatus] = useState<{ totalCompleted: number; bestStreak: number } | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'achievements'>('overview');

  useEffect(() => {
    getCumulativeStats().then(setStats);
    getAchievementsWithStatus().then(setAchievements);
    getDailyStatus().then(s => setDailyStatus({ totalCompleted: s.totalCompleted, bestStreak: s.bestStreak }));
    getStreakInfo().then(info => setCurrentStreak(info.currentStreak));
  }, []);

  if (!stats) return null;

  const avgStars = getAverageStars(stats);
  const perfectRate = getThreeStarRate(stats);
  const unlockedAchievements = achievements.filter(a => a.isUnlocked);
  const totalAchievements = getTotalCount();

  const phaseCardStyle = effectivePhase >= 4
    ? { backgroundColor: '#D0C0E0' }
    : effectivePhase >= 3
      ? { backgroundColor: '#E8E0F0' }
      : undefined;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[
        styles.header,
        effectivePhase >= 4 && { backgroundColor: '#4A3570' },
      ]}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Statistics</Text>
        <View style={styles.backButton} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.tabActive]}
          onPress={() => setSelectedTab('overview')}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedTab === 'overview' }}
        >
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'achievements' && styles.tabActive]}
          onPress={() => setSelectedTab('achievements')}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedTab === 'achievements' }}
        >
          <Text style={[styles.tabText, selectedTab === 'achievements' && styles.tabTextActive]}>
            Achievements ({unlockedAchievements.length}/{totalAchievements})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'overview' ? (
          <>
            {/* Hero stats */}
            <View style={[
              styles.heroRow,
              effectivePhase >= 3 && effectivePhase < 4 && { backgroundColor: '#E8E0F0' },
              effectivePhase >= 4 && { backgroundColor: '#D0C0E0' },
            ]}>
              <View style={styles.heroStat}>
                <Text style={styles.heroValue}>{stats.totalPuzzlesCompleted}</Text>
                <Text style={styles.heroLabel}>Puzzles</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroValue}>{stats.totalStars}</Text>
                <Text style={styles.heroLabel}>Stars</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroValue}>{currentStreak}</Text>
                <Text style={styles.heroLabel}>Streak</Text>
              </View>
            </View>

            {/* Star breakdown */}
            <Text style={styles.sectionTitle}>STAR BREAKDOWN</Text>
            <View style={[styles.card, phaseCardStyle]}>
              <StarBar label="3 Stars" count={stats.threeStarCount} total={stats.totalPuzzlesCompleted} color={CandyColors.yellow.main} />
              <StarBar label="2 Stars" count={stats.twoStarCount} total={stats.totalPuzzlesCompleted} color={CandyColors.orange.main} />
              <StarBar label="1 Star" count={stats.oneStarCount} total={stats.totalPuzzlesCompleted} color={CandyColors.gray[400]} />
              <View style={styles.starSummary}>
                <Text style={styles.starSummaryText}>
                  Avg: {avgStars.toFixed(1)} stars | Perfect rate: {perfectRate.toFixed(0)}%
                </Text>
              </View>
            </View>

            {/* Difficulty breakdown */}
            <Text style={styles.sectionTitle}>BY DIFFICULTY</Text>
            <View style={[styles.card, phaseCardStyle]}>
              <DifficultyRow
                difficulty="EASY"
                completed={stats.byDifficulty.EASY.completed}
                stars={stats.byDifficulty.EASY.stars}
                color={CandyColors.green.main}
              />
              <View style={styles.rowDivider} />
              <DifficultyRow
                difficulty="MEDIUM"
                completed={stats.byDifficulty.MEDIUM.completed}
                stars={stats.byDifficulty.MEDIUM.stars}
                color={CandyColors.yellow.main}
              />
              <View style={styles.rowDivider} />
              <DifficultyRow
                difficulty="HARD"
                completed={stats.byDifficulty.HARD.completed}
                stars={stats.byDifficulty.HARD.stars}
                color={CandyColors.red.main}
              />
            </View>

            {/* Journey progress */}
            <Text style={styles.sectionTitle}>YOUR JOURNEY</Text>
            <View style={[styles.card, phaseCardStyle]}>
              <View style={styles.journeyRow}>
                <Text style={styles.journeyLabel}>Phase</Text>
                <Text style={styles.journeyValue}>{currentPhase + 1}/5</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.journeyRow}>
                <Text style={styles.journeyLabel}>Amber Balance</Text>
                <Text style={styles.journeyValue}>💎 {amberBalance}</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.journeyRow}>
                <Text style={styles.journeyLabel}>Daily Challenges</Text>
                <Text style={styles.journeyValue}>{dailyStatus?.totalCompleted || 0}</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.journeyRow}>
                <Text style={styles.journeyLabel}>Best Daily Streak</Text>
                <Text style={styles.journeyValue}>{dailyStatus?.bestStreak || 0} days</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.journeyRow}>
                <Text style={styles.journeyLabel}>Hints Used</Text>
                <Text style={styles.journeyValue}>{stats.totalHintsUsed}</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.journeyRow}>
                <Text style={styles.journeyLabel}>Wrong Moves</Text>
                <Text style={styles.journeyValue}>{stats.totalInvalidAttempts}</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Achievement categories */}
            {(['puzzle', 'mastery', 'streak', 'collection', 'journey'] as const).map(category => {
              const categoryAchievements = achievements.filter(a => a.category === category);
              const categoryName = {
                puzzle: 'PUZZLES',
                mastery: 'MASTERY',
                streak: 'STREAKS',
                collection: 'COLLECTION',
                journey: 'JOURNEY',
              }[category];

              return (
                <View key={category}>
                  <Text style={styles.sectionTitle}>{categoryName}</Text>
                  <View style={[styles.card, phaseCardStyle]}>
                    {categoryAchievements.map((achievement, i) => (
                      <View key={achievement.id}>
                        {i > 0 && <View style={styles.rowDivider} />}
                        <View
                          style={[
                            styles.achievementRow,
                            !achievement.isUnlocked && styles.achievementLocked,
                          ]}
                        >
                          <Text style={[
                            styles.achievementIcon,
                            !achievement.isUnlocked && styles.achievementIconLocked,
                          ]}>
                            {achievement.isUnlocked ? achievement.icon : '🔒'}
                          </Text>
                          <View style={styles.achievementInfo}>
                            <Text style={[
                              styles.achievementTitle,
                              !achievement.isUnlocked && styles.achievementTitleLocked,
                            ]}>
                              {achievement.title}
                            </Text>
                            <Text style={styles.achievementDesc}>
                              {achievement.description}
                            </Text>
                          </View>
                          {achievement.isUnlocked && (
                            <Text style={styles.achievementCheck}>✓</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

// Star distribution bar sub-component
function StarBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View
      style={styles.starBarContainer}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${count} of ${total}`}
      accessibilityValue={{ min: 0, max: total, now: count }}
    >
      <Text style={styles.starBarLabel}>{label}</Text>
      <View style={styles.starBarTrack}>
        <View style={[styles.starBarFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.starBarCount}>{count}</Text>
    </View>
  );
}

// Difficulty row sub-component
function DifficultyRow({
  difficulty,
  completed,
  stars,
  color,
}: {
  difficulty: Difficulty;
  completed: number;
  stars: number;
  color: string;
}) {
  const avg = completed > 0 ? (stars / completed).toFixed(1) : '0.0';
  return (
    <View style={styles.difficultyRow}>
      <View style={[styles.difficultyDot, { backgroundColor: color }]} />
      <Text style={styles.difficultyLabel}>{difficulty}</Text>
      <Text style={styles.difficultyCount}>{completed} puzzles</Text>
      <Text style={styles.difficultyAvg}>{avg} avg</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CandyColors.gray[100],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 50,
    paddingBottom: 16,
    backgroundColor: CandyColors.purple.main,
  },
  backButton: {
    width: 80,
  },
  backButtonText: {
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: CandyColors.white,
    fontSize: 20,
    fontWeight: '900',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: CandyColors.purple.dark,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: CandyColors.yellow.main,
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: CandyColors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // Hero stats
  heroRow: {
    flexDirection: 'row',
    backgroundColor: CandyColors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: CandyColors.purple.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '900',
    color: CandyColors.purple.main,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: CandyColors.gray[400],
    letterSpacing: 1,
    marginTop: 4,
  },
  heroDivider: {
    width: 1,
    height: 40,
    backgroundColor: CandyColors.gray[200],
  },

  // Sections
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: CandyColors.gray[400],
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: CandyColors.white,
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  rowDivider: {
    height: 1,
    backgroundColor: CandyColors.gray[100],
    marginLeft: 16,
  },

  // Star bars
  starBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  starBarLabel: {
    width: 60,
    fontSize: 13,
    fontWeight: '600',
    color: CandyColors.gray[600],
  },
  starBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: CandyColors.gray[100],
    borderRadius: 6,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  starBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  starBarCount: {
    width: 36,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: CandyColors.gray[700],
  },
  starSummary: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 4,
  },
  starSummaryText: {
    fontSize: 12,
    color: CandyColors.gray[400],
    textAlign: 'center',
  },

  // Difficulty rows
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  difficultyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: CandyColors.gray[700],
    width: 70,
  },
  difficultyCount: {
    flex: 1,
    fontSize: 13,
    color: CandyColors.gray[500],
  },
  difficultyAvg: {
    fontSize: 13,
    fontWeight: '600',
    color: CandyColors.purple.main,
  },

  // Journey rows
  journeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  journeyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: CandyColors.gray[600],
  },
  journeyValue: {
    fontSize: 14,
    fontWeight: '700',
    color: CandyColors.purple.main,
  },

  // Achievement rows
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 28,
    width: 40,
  },
  achievementIconLocked: {
    fontSize: 20,
  },
  achievementInfo: {
    flex: 1,
    marginLeft: 8,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: CandyColors.gray[700],
  },
  achievementTitleLocked: {
    color: CandyColors.gray[400],
  },
  achievementDesc: {
    fontSize: 12,
    color: CandyColors.gray[400],
    marginTop: 2,
  },
  achievementCheck: {
    fontSize: 18,
    color: CandyColors.green.main,
    fontWeight: '900',
  },

  bottomSpacer: {
    height: 60,
  },
});
