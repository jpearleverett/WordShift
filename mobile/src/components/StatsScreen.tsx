import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { CandyColors } from '../theme/colors';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { PanelCard } from './ui/PanelCard';
import { PixelPlaque } from './ui/PixelPlaque';
import { useScreenInsets } from '../hooks/useScreenInsets';
import { AmberInline } from './AmberInline';
import { CumulativeStats, PersonalBest, getCumulativeStats, getAverageStars, getThreeStarRate } from '../services/starRating';
import { getAchievementsWithStatus, Achievement, getTotalCount } from '../services/achievements';
import { getDailyStatus } from '../services/dailyChallenge';
import { getStreakInfo } from '../services/amberCurrency';
import { Difficulty } from '../types';
import { getJourneyAtmosphereText } from '../services/phaseNarrative';

const STAR_FILLED = require('../../assets/ui/star_filled.png');
const STAR_EMPTY = require('../../assets/ui/star_empty.png');

/** Tinted chip fill for chrome sitting directly on the deep screen base. */
const CHROME_CHIP_BG = `rgba(255, 255, 255, ${SURFACE.highlightAlpha})`;

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
  const screenInsets = useScreenInsets();
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

  const t = getSurfaceTheme(effectivePhase);
  const isDarkPhase = effectivePhase >= 3;
  // Alternating row depth: a whisper of the panel's own shade/highlight
  // material instead of hairline dividers.
  const rowAltTint = isDarkPhase ? 'rgba(255, 255, 255, 0.05)' : 'rgba(10, 6, 24, 0.05)';

  const avgStars = getAverageStars(stats);
  const perfectRate = getThreeStarRate(stats);
  const unlockedAchievements = achievements.filter(a => a.isUnlocked);
  const totalAchievements = getTotalCount();

  const overviewSelected = selectedTab === 'overview';
  const achievementsSelected = selectedTab === 'achievements';

  return (
    <View style={[styles.container, { backgroundColor: t.screenBg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: screenInsets.top + 16 }]}>
        <TouchableOpacity
          style={[styles.backChip, { backgroundColor: CHROME_CHIP_BG, borderColor: t.headerChipBorder }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Text style={[styles.backChipText, { color: t.headerTitle }]}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.headerTitle }]}>Statistics</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab bar — framed segmented chips */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tab,
            overviewSelected
              ? { backgroundColor: t.primaryBg, borderColor: t.primaryEdge }
              : { backgroundColor: CHROME_CHIP_BG, borderColor: t.cardBorder },
          ]}
          onPress={() => setSelectedTab('overview')}
          accessibilityRole="tab"
          accessibilityLabel="Overview stats"
          accessibilityState={{ selected: selectedTab === 'overview' }}
        >
          <Text
            style={[
              styles.tabText,
              overviewSelected
                ? [styles.tabTextActive, { color: t.primaryText }]
                : { color: t.headerMuted },
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            achievementsSelected
              ? { backgroundColor: t.primaryBg, borderColor: t.primaryEdge }
              : { backgroundColor: CHROME_CHIP_BG, borderColor: t.cardBorder },
          ]}
          onPress={() => setSelectedTab('achievements')}
          accessibilityRole="tab"
          accessibilityLabel={`Achievements, ${unlockedAchievements.length} of ${totalAchievements} unlocked`}
          accessibilityState={{ selected: selectedTab === 'achievements' }}
        >
          <Text
            style={[
              styles.tabText,
              achievementsSelected
                ? [styles.tabTextActive, { color: t.primaryText }]
                : { color: t.headerMuted },
            ]}
          >
            Achievements ({unlockedAchievements.length}/{totalAchievements})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'overview' ? (
          <>
            {/* Hero stats — panel card with a soft glow blob behind */}
            <PanelCard phase={effectivePhase} kind="panel" style={styles.heroCard}>
              <View
                pointerEvents="none"
                style={[styles.heroGlow, { backgroundColor: t.glow }]}
              />
              <View style={styles.heroRow}>
                <View style={[styles.heroStat, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}>
                  <Text style={[styles.heroValue, { color: t.title }]}>{stats.totalPuzzlesCompleted}</Text>
                  <Text style={[styles.heroLabel, { color: t.muted }]}>Puzzles</Text>
                </View>
                <View style={[styles.heroStat, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}>
                  <Text style={[styles.heroValue, { color: t.title }]}>{stats.totalStars}</Text>
                  <Text style={[styles.heroLabel, { color: t.muted }]}>Stars</Text>
                </View>
                <View style={[styles.heroStat, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}>
                  <Text style={[styles.heroValue, { color: t.title }]}>{currentStreak}</Text>
                  <Text style={[styles.heroLabel, { color: t.muted }]}>Streak</Text>
                </View>
              </View>
            </PanelCard>

            {/* Star breakdown */}
            <PanelCard phase={effectivePhase} style={styles.sectionCard}>
              <PixelPlaque phase={effectivePhase} label={'STAR BREAKDOWN'} style={styles.sectionPlaque} />
              <StarBar label="3 Stars" stars={3} count={stats.threeStarCount} total={stats.totalPuzzlesCompleted} color={CandyColors.yellow.main} trackColor={t.rowBorder} countColor={t.body} />
              <StarBar label="2 Stars" stars={2} count={stats.twoStarCount} total={stats.totalPuzzlesCompleted} color={CandyColors.orange.main} trackColor={t.rowBorder} countColor={t.body} />
              <StarBar label="1 Star" stars={1} count={stats.oneStarCount} total={stats.totalPuzzlesCompleted} color={t.muted} trackColor={t.rowBorder} countColor={t.body} />
              <View style={styles.starSummary}>
                <Text style={[styles.starSummaryText, { color: t.muted }]}>
                  Avg: {avgStars.toFixed(1)} stars | Perfect rate: {perfectRate.toFixed(0)}%
                </Text>
              </View>
            </PanelCard>

            {/* Difficulty breakdown */}
            <PanelCard phase={effectivePhase} style={styles.sectionCard}>
              <PixelPlaque phase={effectivePhase} label={'BY DIFFICULTY'} style={styles.sectionPlaque} />
              <DifficultyRow
                difficulty="EASY"
                completed={stats.byDifficulty.EASY.completed}
                stars={stats.byDifficulty.EASY.stars}
                color={CandyColors.green.main}
                labelColor={t.body}
                countColor={t.muted}
                avgColor={t.title}
              />
              <DifficultyRow
                difficulty="MEDIUM"
                completed={stats.byDifficulty.MEDIUM.completed}
                stars={stats.byDifficulty.MEDIUM.stars}
                color={CandyColors.yellow.main}
                labelColor={t.body}
                countColor={t.muted}
                avgColor={t.title}
                altBg={rowAltTint}
              />
              <DifficultyRow
                difficulty="HARD"
                completed={stats.byDifficulty.HARD.completed}
                stars={stats.byDifficulty.HARD.stars}
                color={CandyColors.red.main}
                labelColor={t.body}
                countColor={t.muted}
                avgColor={t.title}
              />
            </PanelCard>

            {/* Personal bests */}
            {stats.personalBests && Object.keys(stats.personalBests).length > 0 && (
              <PanelCard phase={effectivePhase} style={styles.sectionCard}>
                <PixelPlaque phase={effectivePhase} label={'PERSONAL BESTS'} style={styles.sectionPlaque} />
                {(['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'] as Difficulty[])
                  .map(diff => ({ diff, pb: stats.personalBests?.[diff] }))
                  .filter((entry): entry is { diff: Difficulty; pb: PersonalBest } => !!entry.pb)
                  .map((entry, i) => {
                    const label = entry.diff === 'MEDIUM_PLUS' ? 'MED+' : entry.diff;
                    return (
                      <View
                        key={entry.diff}
                        style={[styles.journeyRow, i % 2 === 1 && { backgroundColor: rowAltTint }]}
                      >
                        <Text style={[styles.journeyLabel, { color: t.body }]}>{label}</Text>
                        <Text style={[styles.journeyValue, { color: t.title }]}>
                          {entry.pb.fewestHints === 0 ? '✨ ' : `${entry.pb.fewestHints}h `}
                          {entry.pb.fewestInvalidAttempts === 0 ? '✨' : `${entry.pb.fewestInvalidAttempts}m`}
                        </Text>
                      </View>
                    );
                  })}
                <Text style={[styles.personalBestLegend, { color: t.muted }]}>h = hints · m = mistakes · ✨ = perfect</Text>
              </PanelCard>
            )}

            {/* Journey progress */}
            <PanelCard phase={effectivePhase} style={styles.sectionCard}>
              <PixelPlaque phase={effectivePhase} label={'YOUR JOURNEY'} style={styles.sectionPlaque} />
              <View style={styles.journeyRow}>
                <Text style={[styles.journeyLabel, { color: t.body }]}>Atmosphere</Text>
                <Text style={[styles.journeyValue, { color: t.title }]}>{getJourneyAtmosphereText(effectivePhase)}</Text>
              </View>
              <View style={[styles.journeyRow, { backgroundColor: rowAltTint }]}>
                <Text style={[styles.journeyLabel, { color: t.body }]}>Amber Balance</Text>
                <Text style={[styles.journeyValue, { color: t.amberText }]}><AmberInline /> {amberBalance}</Text>
              </View>
              <View style={styles.journeyRow}>
                <Text style={[styles.journeyLabel, { color: t.body }]}>Daily Challenges</Text>
                <Text style={[styles.journeyValue, { color: t.title }]}>{dailyStatus?.totalCompleted || 0}</Text>
              </View>
              <View style={[styles.journeyRow, { backgroundColor: rowAltTint }]}>
                <Text style={[styles.journeyLabel, { color: t.body }]}>Best Daily Streak</Text>
                <Text style={[styles.journeyValue, { color: t.title }]}>{dailyStatus?.bestStreak || 0} days</Text>
              </View>
              <View style={styles.journeyRow}>
                <Text style={[styles.journeyLabel, { color: t.body }]}>Hints Used</Text>
                <Text style={[styles.journeyValue, { color: t.title }]}>{stats.totalHintsUsed}</Text>
              </View>
              <View style={[styles.journeyRow, { backgroundColor: rowAltTint }]}>
                <Text style={[styles.journeyLabel, { color: t.body }]}>Wrong Moves</Text>
                <Text style={[styles.journeyValue, { color: t.title }]}>{stats.totalInvalidAttempts}</Text>
              </View>
            </PanelCard>
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
                <PanelCard key={category} phase={effectivePhase} style={styles.sectionCard}>
                  <PixelPlaque phase={effectivePhase} label={categoryName} style={styles.sectionPlaque} />
                  {categoryAchievements.map((achievement, i) => (
                    <View
                      key={achievement.id}
                      style={[
                        styles.achievementRow,
                        i % 2 === 1 && { backgroundColor: rowAltTint },
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
                          { color: achievement.isUnlocked ? t.title : t.muted },
                        ]}>
                          {achievement.title}
                        </Text>
                        <Text style={[styles.achievementDesc, { color: t.muted }]}>
                          {achievement.description}
                        </Text>
                      </View>
                      <View style={[styles.achievementReward, { backgroundColor: t.amberTint, borderColor: t.amberTintBorder }]}>
                        <Text style={[styles.achievementRewardText, { color: t.amberText }]}>
                          <AmberInline size={12} /> +{achievement.rewardAmber}
                        </Text>
                      </View>
                      {achievement.isUnlocked && (
                        <Text style={styles.achievementCheck}>✓</Text>
                      )}
                    </View>
                  ))}
                </PanelCard>
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
  stars,
  count,
  total,
  color,
  trackColor,
  countColor,
}: {
  label: string;
  stars: number;
  count: number;
  total: number;
  color: string;
  trackColor: string;
  countColor: string;
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
      <View style={styles.starBarStars}>
        {[1, 2, 3].map(slot => (
          <Image
            key={slot}
            source={slot <= stars ? STAR_FILLED : STAR_EMPTY}
            style={[styles.starBarStarIcon, slot > stars && styles.starBarStarEmpty]}
            resizeMode="contain"
          />
        ))}
      </View>
      <View style={[styles.starBarTrack, { backgroundColor: trackColor }]}>
        <View style={[styles.starBarFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.starBarCount, { color: countColor }]}>{count}</Text>
    </View>
  );
}

// Difficulty row sub-component
function DifficultyRow({
  difficulty,
  completed,
  stars,
  color,
  labelColor,
  countColor,
  avgColor,
  altBg,
}: {
  difficulty: Difficulty;
  completed: number;
  stars: number;
  color: string;
  labelColor: string;
  countColor: string;
  avgColor: string;
  altBg?: string;
}) {
  const avg = completed > 0 ? (stars / completed).toFixed(1) : '0.0';
  return (
    <View style={[styles.difficultyRow, altBg ? { backgroundColor: altBg } : null]}>
      <View style={[styles.difficultyDot, { backgroundColor: color }]} />
      <Text style={[styles.difficultyLabel, { color: labelColor }]}>{difficulty}</Text>
      <Text style={[styles.difficultyCount, { color: countColor }]}>{completed} puzzles</Text>
      <Text style={[styles.difficultyAvg, { color: avgColor }]}>{avg} avg</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    // paddingTop applied inline via useScreenInsets (safe-area aware)
    paddingBottom: 12,
  },
  backChip: {
    minWidth: 80,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: SURFACE.buttonRadius,
    borderWidth: 1.5,
  },
  backChipText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 80,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SURFACE.buttonRadius,
    borderWidth: 1.5,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabTextActive: {
    fontWeight: '800',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Hero stats
  heroCard: {
    marginBottom: 18,
    paddingVertical: 24,
    paddingHorizontal: 22,
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    left: -40,
    right: -40,
    height: 190,
    borderRadius: 120,
    opacity: 0.3,
  },
  heroRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  heroValue: {
    fontSize: 30,
    fontWeight: '900',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
  },

  // Sections
  sectionCard: {
    marginBottom: 18,
  },
  sectionPlaque: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: SURFACE.sectionLetterSpacing,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },

  // Star bars
  starBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  starBarStars: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  starBarStarIcon: {
    width: 16,
    height: 16,
    marginRight: 2,
  },
  starBarStarEmpty: {
    opacity: 0.45,
  },
  starBarTrack: {
    flex: 1,
    height: 12,
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
  },
  starSummary: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  starSummaryText: {
    fontSize: 12,
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
    width: 70,
  },
  difficultyCount: {
    flex: 1,
    fontSize: 13,
  },
  difficultyAvg: {
    fontSize: 13,
    fontWeight: '700',
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
  },
  journeyValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  personalBestLegend: {
    fontSize: 10,
    textAlign: 'center',
    paddingTop: 8,
    paddingBottom: 12,
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
    marginRight: 8,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  achievementDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  achievementReward: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  achievementRewardText: {
    fontSize: 12,
    fontWeight: '800',
  },
  achievementCheck: {
    fontSize: 18,
    color: CandyColors.green.main,
    fontWeight: '900',
    marginLeft: 8,
  },

  bottomSpacer: {
    height: 60,
  },
});
