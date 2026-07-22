import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../theme/fonts';
import { CandyColors } from '../theme/colors';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { PanelCard } from './ui/PanelCard';
import { PixelPlaque } from './ui/PixelPlaque';
import { BannerAd } from './monetization/BannerAd';
import { useScreenInsets } from '../hooks/useScreenInsets';
import { AmberInline } from './AmberInline';
import { CumulativeStats, PersonalBest, getCumulativeStats, getAverageStars, getThreeStarRate } from '../services/starRating';
import { getAchievementsWithStatus, Achievement, getTotalCount } from '../services/achievements';
import { getDailyStatus } from '../services/dailyChallenge';
import { getStreakInfo, getAmberBalance } from '../services/amberCurrency';
import { Difficulty } from '../types';
import { getJourneyAtmosphereText, getPaceTrendMessage } from '../services/phaseNarrative';
import {
  getBestSpeedRound,
  getResonantChoices,
  getSolveTrend,
  getUnbrokenWeaveMastery,
  UnbrokenWeaveMastery,
} from '../services/masteryRecords';
import { DialoguePhase } from '../types/homeWorld';
import {
  EntranceCascadeItem,
  getCascadeDelayMs,
  countUpDisplayValue,
  getCountUpDurationMs,
} from './ui/RewardReveal';
import { getSettingsSync } from '../services/settings';
import { shouldSimplifyAnimations } from '../services/deviceTier';

const STAR_FILLED = require('../../assets/ui/star_filled.png');
const STAR_EMPTY = require('../../assets/ui/star_empty.png');

/** True when a personal best is clean on both counts: zero hints AND zero mistakes. */
export function isPerfectPersonalBest(pb: PersonalBest): boolean {
  return pb.fewestHints === 0 && pb.fewestInvalidAttempts === 0;
}

/**
 * Plain-words personal-best summary ("1 hint, 0 mistakes") for a non-perfect
 * best. Each field is an independent fewest-ever minimum (see starRating).
 */
export function formatPersonalBestSummary(pb: PersonalBest): string {
  const hints = `${pb.fewestHints} hint${pb.fewestHints === 1 ? '' : 's'}`;
  const mistakes = `${pb.fewestInvalidAttempts} mistake${pb.fewestInvalidAttempts === 1 ? '' : 's'}`;
  return `${hints}, ${mistakes}`;
}

/** Tinted chip fill for chrome sitting directly on the deep screen base. */
const CHROME_CHIP_BG = `rgba(255, 255, 255, ${SURFACE.highlightAlpha})`;

/** Content rows wait this long so the header reads as settling in first. */
const HEADER_CASCADE_BASE_MS = 120;

/** The five achievement-category cards, in display order (also the windowed
 *  list's data). Bounded and fixed — the list virtualizes the tall cards, not
 *  a growing history. */
const ACHIEVEMENT_CATEGORIES = ['puzzle', 'mastery', 'streak', 'collection', 'journey'] as const;
/** Only the first on-screen category cards cascade in; later ones scrolled into
 *  the windowed list appear without re-triggering the entrance. */
const ACHIEVEMENT_CASCADE_WINDOW = 3;
const ACHIEVEMENT_CATEGORY_NAMES: Record<(typeof ACHIEVEMENT_CATEGORIES)[number], string> = {
  puzzle: 'PUZZLES',
  mastery: 'MASTERY',
  streak: 'STREAKS',
  collection: 'COLLECTION',
  journey: 'JOURNEY',
};

interface HeroStatSpec {
  value: number;
  label: string;
}

/**
 * The hero stat row: the three headline numbers count up together once on
 * mount (a single, one-shot beat, not an idle loop). The count runs on the JS
 * thread via a plain rAF stepper (never an Animated listener under the native
 * driver). Reduced motion / low-tier devices show the final numbers instantly,
 * and each Text exposes its final value to screen readers regardless.
 */
function HeroStatsRow({
  stats,
  phase,
  animate,
  sectionBg,
  sectionBorder,
  valueColor,
  labelColor,
}: {
  stats: HeroStatSpec[];
  phase: number;
  animate: boolean;
  sectionBg: string;
  sectionBorder: string;
  valueColor: string;
  labelColor: string;
}) {
  const [fraction, setFraction] = useState(animate ? 0 : 1);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!animate) {
      setFraction(1);
      return;
    }
    const reduced = getSettingsSync().reducedMotion || shouldSimplifyAnimations();
    const maxTarget = stats.reduce((m, s) => Math.max(m, Math.abs(s.value)), 0);
    const duration = reduced ? 0 : getCountUpDurationMs(maxTarget, phase);
    if (duration <= 0) {
      setFraction(1);
      return;
    }
    const startedAt = Date.now();
    const tick = () => {
      const f = Math.min(1, (Date.now() - startedAt) / duration);
      setFraction(f);
      if (f < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.heroRow}>
      {stats.map(s => (
        <View
          key={s.label}
          style={[styles.heroStat, { backgroundColor: sectionBg, borderColor: sectionBorder }]}
        >
          <Text
            style={[styles.heroValue, { color: valueColor }]}
            accessibilityLabel={`${s.value} ${s.label}`}
          >
            {countUpDisplayValue(fraction, s.value)}
          </Text>
          <Text style={[styles.heroLabel, { color: labelColor }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

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
  const [bestSpeedRound, setBestSpeedRound] = useState(0);
  const [resonantChoices, setResonantChoices] = useState(0);
  const [paceImproving, setPaceImproving] = useState(false);
  const [unbrokenWeaveMastery, setUnbrokenWeaveMastery] = useState<UnbrokenWeaveMastery | null>(null);
  // Live spendable balance read straight from the amberCurrency store on
  // mount (this screen mounts fresh on every visit). The amberBalance PROP is
  // App's React-state mirror, which can drift stale (or, via a bad caller
  // computation, even negative) between refreshes — the home header reads the
  // store directly and this screen must agree with it. The prop serves only
  // as the first-paint fallback, clamped so a broken mirror can never show a
  // negative balance.
  const [liveAmberBalance, setLiveAmberBalance] = useState<number | null>(null);
  // Latch so the hero count-up runs only the first time the overview appears
  // (persists across tab switches; a re-shown hero snaps to its final values).
  const heroCountedRef = useRef(false);

  useEffect(() => {
    getAmberBalance().then(setLiveAmberBalance).catch(() => {});
    getCumulativeStats().then(setStats);
    getAchievementsWithStatus().then(setAchievements);
    getDailyStatus().then(s => setDailyStatus({ totalCompleted: s.totalCompleted, bestStreak: s.bestStreak }));
    getStreakInfo().then(info => setCurrentStreak(info.currentStreak));
    getBestSpeedRound().then(setBestSpeedRound);
    getResonantChoices().then(setResonantChoices);
    getUnbrokenWeaveMastery().then(setUnbrokenWeaveMastery);
    // Pace trend: improving if the player is quicker at ANY difficulty they've
    // played enough of. Private scanning-speed signal — no leaderboard.
    (async () => {
      const diffs: Difficulty[] = ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'];
      for (const d of diffs) {
        const trend = await getSolveTrend(d);
        if (trend?.improving) { setPaceImproving(true); return; }
      }
    })();
  }, []);

  if (!stats) return null;

  // First appearance of the overview animates the hero; later shows are static.
  const animateHero = !heroCountedRef.current;
  heroCountedRef.current = true;

  const t = getSurfaceTheme(effectivePhase);
  const isDarkPhase = effectivePhase >= 3;
  // Alternating row depth: a whisper of the panel's own shade/highlight
  // material instead of hairline dividers.
  const rowAltTint = isDarkPhase ? 'rgba(255, 255, 255, 0.05)' : 'rgba(10, 6, 24, 0.05)';

  // Truth-first display: live store value once loaded, clamped prop before.
  const displayedAmberBalance = Math.max(0, liveAmberBalance ?? amberBalance);

  const avgStars = getAverageStars(stats);
  const perfectRate = getThreeStarRate(stats);
  const unlockedAchievements = achievements.filter(a => a.isUnlocked);
  const totalAchievements = getTotalCount();

  const overviewSelected = selectedTab === 'overview';
  const achievementsSelected = selectedTab === 'achievements';

  // One windowed list item = one framed achievement-category card (preserving
  // the cottage frame + per-category cascade). Windowing at card granularity
  // unmounts off-screen categories so the tall multi-row cards aren't all
  // mounted at once.
  const renderAchievementCategory = ({
    item: category,
    index: categoryIndex,
  }: {
    item: (typeof ACHIEVEMENT_CATEGORIES)[number];
    index: number;
  }) => {
    const categoryAchievements = achievements.filter(a => a.category === category);
    const card = (
      <PanelCard phase={effectivePhase} style={styles.sectionCard}>
        <PixelPlaque phase={effectivePhase} label={ACHIEVEMENT_CATEGORY_NAMES[category]} style={styles.sectionPlaque} />
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
    if (categoryIndex < ACHIEVEMENT_CASCADE_WINDOW) {
      return (
        <EntranceCascadeItem
          phase={effectivePhase}
          delay={getCascadeDelayMs(categoryIndex, { baseMs: HEADER_CASCADE_BASE_MS })}
        >
          {card}
        </EntranceCascadeItem>
      );
    }
    return card;
  };

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
        <EntranceCascadeItem phase={effectivePhase}>
          <Text style={[styles.title, { color: t.headerTitle }]}>Statistics</Text>
        </EntranceCascadeItem>
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

      {overviewSelected ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <>
            {/* Hero stats: panel card with a soft glow blob behind. The three
                headline numbers count up once on mount (the single hero beat). */}
            <EntranceCascadeItem
              phase={effectivePhase}
              delay={getCascadeDelayMs(0, { baseMs: HEADER_CASCADE_BASE_MS })}
            >
              <PanelCard phase={effectivePhase} kind="panel" style={styles.heroCard}>
                <View
                  pointerEvents="none"
                  style={[styles.heroGlow, { backgroundColor: t.glow }]}
                />
                <HeroStatsRow
                  phase={effectivePhase}
                  animate={animateHero}
                  sectionBg={t.sectionBg}
                  sectionBorder={t.sectionBorder}
                  valueColor={t.title}
                  labelColor={t.muted}
                  stats={[
                    { value: stats.totalPuzzlesCompleted, label: 'Puzzles' },
                    { value: stats.totalStars, label: 'Stars' },
                    { value: currentStreak, label: 'Streak' },
                  ]}
                />
              </PanelCard>
            </EntranceCascadeItem>

            {/* Star breakdown */}
            <EntranceCascadeItem phase={effectivePhase} delay={getCascadeDelayMs(1, { baseMs: HEADER_CASCADE_BASE_MS })}>
            <PanelCard phase={effectivePhase} style={styles.sectionCard}>
              <PixelPlaque phase={effectivePhase} label={'STAR BREAKDOWN'} style={styles.sectionPlaque} />
              <StarBar label="3 Stars" stars={3} count={stats.threeStarCount} total={stats.totalPuzzlesCompleted} color={CandyColors.yellow.main} trackColor={t.rowBorder} countColor={t.body} />
              <StarBar label="2 Stars" stars={2} count={stats.twoStarCount} total={stats.totalPuzzlesCompleted} color={CandyColors.orange.main} trackColor={t.rowBorder} countColor={t.body} />
              <StarBar label="1 Star" stars={1} count={stats.oneStarCount} total={stats.totalPuzzlesCompleted} color={t.muted} trackColor={t.rowBorder} countColor={t.body} />
              <View style={styles.starSummary}>
                <Text style={[styles.starSummaryText, { color: t.muted }]}>
                  Avg: {avgStars.toFixed(1)} stars | Perfect rate: {perfectRate.toFixed(0)}%
                </Text>
                {(stats.flawlessCount ?? 0) > 0 && (
                  <Text
                    style={[styles.starSummaryText, { color: t.amberText, marginTop: 4, fontWeight: '800' }]}
                    accessibilityLabel={`${stats.flawlessCount} flawless offerings`}
                  >
                    Flawless offerings: {stats.flawlessCount}
                  </Text>
                )}
              </View>
            </PanelCard>
            </EntranceCascadeItem>

            {/* Mastery: private skill records (best speed run, scanning pace).
                Only shown once there's something to show, so it never clutters a
                new player's overview. */}
            {(bestSpeedRound > 0 || resonantChoices > 0 || paceImproving || effectivePhase === 5 || (unbrokenWeaveMastery !== null && unbrokenWeaveMastery.wins > 0)) && (
              <EntranceCascadeItem phase={effectivePhase} delay={getCascadeDelayMs(2, { baseMs: HEADER_CASCADE_BASE_MS })}>
              <PanelCard phase={effectivePhase} style={styles.sectionCard}>
                <PixelPlaque phase={effectivePhase} label={'MASTERY'} style={styles.sectionPlaque} />
                {bestSpeedRound > 0 && (
                  <View style={styles.masteryRow}>
                    <Text style={[styles.masteryLabel, { color: t.body }]}>Best speed run</Text>
                    <Text style={[styles.masteryValue, { color: t.title }]}>Round {bestSpeedRound + 1}</Text>
                  </View>
                )}
                {resonantChoices > 0 && (
                  <View style={styles.masteryRow}>
                    <Text
                      style={[styles.masteryLabel, { color: t.body }]}
                      accessibilityLabel={`${resonantChoices} resonant choices`}
                    >
                      Resonant choices
                    </Text>
                    <Text style={[styles.masteryValue, { color: t.title }]}>{resonantChoices}</Text>
                  </View>
                )}
                {paceImproving && (
                  <Text style={[styles.masteryPace, { color: t.amberText }]}>
                    {getPaceTrendMessage(effectivePhase as DialoguePhase)}
                  </Text>
                )}
                {unbrokenWeaveMastery && (
                  <>
                    <View style={styles.masteryRow}>
                      <Text style={[styles.masteryLabel, { color: t.body }]}>Unbroken Weave</Text>
                      <Text style={[styles.masteryValue, { color: t.title }]}>
                        Rank {unbrokenWeaveMastery.rank}: {unbrokenWeaveMastery.title}
                      </Text>
                    </View>
                    {unbrokenWeaveMastery.nextObjective && (
                      <Text style={[styles.masteryPace, { color: t.muted }]}>
                        {unbrokenWeaveMastery.nextObjective}
                      </Text>
                    )}
                  </>
                )}
              </PanelCard>
              </EntranceCascadeItem>
            )}

            {/* Difficulty breakdown */}
            <EntranceCascadeItem phase={effectivePhase} delay={getCascadeDelayMs(3, { baseMs: HEADER_CASCADE_BASE_MS })}>
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
            </EntranceCascadeItem>

            {/* Personal bests — cleanest solves at each difficulty. Sprite
                policy (no raw emoji in stats chrome): a perfect best gets the
                star sprite + the word "Perfect"; anything else reads in plain
                words ("1 hint, 2 mistakes"); a difficulty with no best yet
                says so explicitly instead of hiding the row. */}
            {stats.personalBests && Object.keys(stats.personalBests).length > 0 && (
              <EntranceCascadeItem phase={effectivePhase} delay={getCascadeDelayMs(4, { baseMs: HEADER_CASCADE_BASE_MS })}>
              <PanelCard phase={effectivePhase} style={styles.sectionCard}>
                <PixelPlaque phase={effectivePhase} label={'PERSONAL BESTS'} style={styles.sectionPlaque} />
                {(['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'] as Difficulty[]).map((diff, i) => {
                  const pb = stats.personalBests?.[diff];
                  const label = diff === 'MEDIUM_PLUS' ? 'MED+' : diff;
                  const perfect = !!pb && isPerfectPersonalBest(pb);
                  const summary = pb ? formatPersonalBestSummary(pb) : null;
                  return (
                    <View
                      key={diff}
                      style={[styles.journeyRow, i % 2 === 1 && { backgroundColor: rowAltTint }]}
                      accessible
                      accessibilityLabel={
                        pb
                          ? `${label} best: ${perfect ? 'perfect, no hints, no mistakes' : summary}`
                          : `${label}: no best yet`
                      }
                    >
                      <Text style={[styles.journeyLabel, { color: t.body }]}>{label}</Text>
                      {pb ? (
                        perfect ? (
                          <View style={styles.personalBestValueRow}>
                            <Image source={STAR_FILLED} style={styles.personalBestStarIcon} resizeMode="contain" />
                            <Text style={[styles.journeyValue, { color: t.amberText }]}>Perfect</Text>
                          </View>
                        ) : (
                          <Text style={[styles.journeyValue, { color: t.title }]}>{summary}</Text>
                        )
                      ) : (
                        <Text style={[styles.journeyValue, { color: t.muted }]}>No best yet</Text>
                      )}
                    </View>
                  );
                })}
                <Text style={[styles.personalBestLegend, { color: t.muted }]}>
                  Fewest hints and mistakes at each difficulty
                </Text>
              </PanelCard>
              </EntranceCascadeItem>
            )}

            {/* Journey progress */}
            <EntranceCascadeItem phase={effectivePhase} delay={getCascadeDelayMs(5, { baseMs: HEADER_CASCADE_BASE_MS })}>
            <PanelCard phase={effectivePhase} style={styles.sectionCard}>
              <PixelPlaque phase={effectivePhase} label={'YOUR JOURNEY'} style={styles.sectionPlaque} />
              <View style={styles.journeyRow}>
                <Text style={[styles.journeyLabel, { color: t.body }]}>Atmosphere</Text>
                <Text style={[styles.journeyValue, { color: t.title }]}>{getJourneyAtmosphereText(effectivePhase)}</Text>
              </View>
              <View style={[styles.journeyRow, { backgroundColor: rowAltTint }]}>
                <Text style={[styles.journeyLabel, { color: t.body }]}>Amber Balance</Text>
                <Text
                  style={[styles.journeyValue, { color: t.amberText }]}
                  accessibilityLabel={`${displayedAmberBalance} amber`}
                >
                  <AmberInline /> {displayedAmberBalance}
                </Text>
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
            </EntranceCascadeItem>
          </>
          <BannerAd phase={effectivePhase} />
          <View style={styles.bottomSpacer} />
        </ScrollView>
      ) : (
        <FlatList
          style={styles.content}
          data={ACHIEVEMENT_CATEGORIES}
          keyExtractor={category => category}
          renderItem={renderAchievementCategory}
          extraData={`${effectivePhase}-${achievements.length}`}
          showsVerticalScrollIndicator={false}
          initialNumToRender={3}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews
          ListFooterComponent={
            <>
              {/* Menu-surface banner (low friction; self-suppresses for ad-free /
                  onboarding / Phase 4+, and when no ad backend is configured). */}
              <BannerAd phase={effectivePhase} />
              <View style={styles.bottomSpacer} />
            </>
          }
        />
      )}
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
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 80,
  },
  title: {
    fontFamily: PIXEL_FONT_BOLD,
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
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabTextActive: {
    fontFamily: PIXEL_FONT_BOLD,
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
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 30,
    fontWeight: '900',
  },
  heroLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
  },

  // Sections
  sectionCard: {
    marginBottom: 18,
    // The card frame's wood band is 12dp; without extra padding the last
    // row's box ran to the card's bottom pixel and its content sat only
    // ~2dp of parchment above the wood (the cramped HARD row). 16dp keeps
    // every last row clear of the band with breathing room, on every card.
    paddingBottom: 16,
  },
  sectionPlaque: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: PIXEL_FONT_BOLD,
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
    fontFamily: PIXEL_FONT_BOLD,
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
    fontFamily: BODY_FONT,
    fontSize: 12,
    textAlign: 'center',
  },

  // Mastery card
  masteryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  masteryLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 14,
    fontWeight: '600',
  },
  masteryValue: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 16,
    fontWeight: '800',
  },
  masteryPace: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 2,
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
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 14,
    fontWeight: '700',
    width: 70,
  },
  difficultyCount: {
    fontFamily: BODY_FONT,
    flex: 1,
    fontSize: 13,
  },
  difficultyAvg: {
    fontFamily: PIXEL_FONT_BOLD,
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
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 14,
    fontWeight: '600',
  },
  journeyValue: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 14,
    fontWeight: '700',
  },
  personalBestValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personalBestStarIcon: {
    width: 14,
    height: 14,
    marginRight: 5,
  },
  personalBestLegend: {
    fontFamily: BODY_FONT,
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
    fontFamily: BODY_FONT,
    fontSize: 28,
    width: 40,
  },
  achievementIconLocked: {
    fontFamily: BODY_FONT,
    fontSize: 20,
  },
  achievementInfo: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  achievementTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 15,
    fontWeight: '700',
  },
  achievementDesc: {
    fontFamily: BODY_FONT,
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
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 12,
    fontWeight: '800',
  },
  achievementCheck: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 18,
    color: CandyColors.green.main,
    fontWeight: '900',
    marginLeft: 8,
  },

  bottomSpacer: {
    height: 60,
  },
});
