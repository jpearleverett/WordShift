import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Animated,
} from 'react-native';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../theme/fonts';
import { CandyColors } from '../theme/colors';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { PanelCard } from './ui/PanelCard';
import { PixelPlaque } from './ui/PixelPlaque';
import { BannerAd } from './monetization/BannerAd';
import { shouldShowBanner } from '../services/ads';
import { isAdFreeSync } from '../services/entitlements';
import { useScreenInsets } from '../hooks/useScreenInsets';
import { AmberValue } from './AmberInline';
import { CumulativeStats, PersonalBest, getCumulativeStats, getAverageStars, getThreeStarRate } from '../services/starRating';
import {
  getAchievementsWithStatus,
  Achievement,
  getTotalCount,
  buildAchievementCheckState,
  ACHIEVEMENT_LOCK_ICON,
  AchievementCheckState,
} from '../services/achievements';
import { getAchievementArt } from './achievementArt';
import { DIFFICULTY_ART } from './puzzle/difficultyArt';
import { CHROME_ICONS } from './ui/chromeIcons';
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
import { FONT_SIZE } from '../theme/typeScale';
import { playUiSound, uiHapticSelection } from '../services/uiSound';

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

/** Semantic per-tier colors for the BY DIFFICULTY rows — the same identity the
 *  setup menu's difficulty rings and the share card's dot use. */
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
  // Full achievement check-state, so locked countable achievements can draw a
  // "how close am I" progress track (the 51-item chase was otherwise invisible).
  // Loaded best-effort in its own guarded effect; the progress bar simply waits
  // for it and never blocks the rest of the screen.
  const [achievementCheckState, setAchievementCheckState] = useState<AchievementCheckState | null>(null);
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

  // Cross-fade the tab content on swap: a 120ms dip-to-0.4-and-back instead of
  // the previous single-frame content swap. Reduced motion keeps it instant.
  const tabFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (getSettingsSync().reducedMotion) return;
    tabFade.setValue(0.4);
    const anim = Animated.timing(tabFade, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab]);

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
      const diffs: Difficulty[] = ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD', 'EXPERT'];
      for (const d of diffs) {
        const trend = await getSolveTrend(d);
        if (trend?.improving) { setPaceImproving(true); return; }
      }
    })();
    // Full check-state for the locked-achievement progress tracks. Guarded so a
    // load failure (or a stubbed service in tests) never throws in the effect.
    (async () => {
      try {
        setAchievementCheckState(await buildAchievementCheckState());
      } catch {
        /* leave progress tracks unfilled; the rest of the screen is unaffected */
      }
    })();
  }, []);

  // Skeleton: render the header + a few empty PanelCards from static props
  // while the async loads land, so the reveal never exposes a blank screen —
  // combined with the entrance cascade, real content cascades in as it
  // arrives instead of popping fully-formed once everything resolves.
  if (!stats) {
    const st = getSurfaceTheme(effectivePhase);
    return (
      <View style={[styles.container, { backgroundColor: st.screenBg }]}>
        <View style={[styles.header, { paddingTop: screenInsets.top + 16 }]}>
          <TouchableOpacity
            style={[styles.backChip, { backgroundColor: CHROME_CHIP_BG, borderColor: st.headerChipBorder }]}
            onPress={() => { playUiSound('selection'); uiHapticSelection(); onClose(); }}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
          >
            <Text style={[styles.backChipText, { color: st.headerTitle }]}>{'<'} Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: st.headerTitle }]}>Statistics</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.content}>
          <PanelCard phase={effectivePhase} kind="panel" style={styles.heroCard}>
            <View style={styles.skeletonBlock} />
          </PanelCard>
          <PanelCard phase={effectivePhase} style={styles.sectionCard}>
            <View style={styles.skeletonBlock} />
          </PanelCard>
          <PanelCard phase={effectivePhase} style={styles.sectionCard}>
            <View style={styles.skeletonBlock} />
          </PanelCard>
        </View>
      </View>
    );
  }

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
        {categoryAchievements.map((achievement, i) => {
          // Progress-toward for a still-locked countable achievement (puzzle
          // counts, stars, streaks, variant wins...). One-shot achievements have
          // no `progress` spec; the whole track is skipped for them. `current`
          // is already clamped to `target` in achievements.ts.
          const prog =
            !achievement.isUnlocked && achievement.progress && achievementCheckState
              ? achievement.progress(achievementCheckState)
              : null;
          const progPct = prog && prog.target > 0
            ? Math.min(100, Math.max(0, Math.round((prog.current / prog.target) * 100)))
            : 0;
          return (
            <View
              key={achievement.id}
              style={[
                styles.achievementRow,
                i % 2 === 1 && { backgroundColor: rowAltTint },
              ]}
            >
              {/* The achievement's own generated crest (assets/ui/achievements,
                  one painted subject per achievement, the same art the
                  AchievementToast shows). A locked row shows the crest it would
                  earn, dimmed, with a small lock sprite pinned to the alcove's
                  corner so the locked state never rides on opacity alone; the
                  per-achievement emoji in achievements.ts stays a data key. */}
              <View
                style={[
                  styles.achievementIconBadge,
                  { backgroundColor: t.sectionBg, borderColor: t.sectionBorder },
                  !achievement.isUnlocked && styles.achievementIconBadgeLocked,
                ]}
              >
                <Image
                  source={getAchievementArt(achievement.id, achievement.category)}
                  style={[styles.achievementIconImage, !achievement.isUnlocked && styles.achievementIconImageLocked]}
                  resizeMode="contain"
                />
                {!achievement.isUnlocked && (
                  <Image source={ACHIEVEMENT_LOCK_ICON} style={styles.achievementLockOverlay} resizeMode="contain" />
                )}
              </View>
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
                {prog && (
                  <View
                    style={styles.achievementProgress}
                    accessible
                    accessibilityRole="progressbar"
                    accessibilityLabel={`Progress: ${prog.current} of ${prog.target}`}
                    accessibilityValue={{ min: 0, max: prog.target, now: prog.current }}
                  >
                    <View style={[styles.achievementProgressTrack, { backgroundColor: t.rowBorder }]}>
                      <View style={[styles.achievementProgressFill, { width: `${progPct}%`, backgroundColor: t.amberText }]} />
                    </View>
                    <Text style={[styles.achievementProgressText, { color: t.muted }]}>
                      {prog.current}/{prog.target}
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.achievementReward, { backgroundColor: t.amberTint, borderColor: t.amberTintBorder }]}>
                <AmberValue
                  amount={`+${achievement.rewardAmber}`}
                  size={12}
                  color={t.amberText}
                  textStyle={styles.achievementRewardText}
                  accessibilityLabel={`${achievement.rewardAmber} amber`}
                />
              </View>
              {achievement.isUnlocked && (
                <Image source={CHROME_ICONS.check} style={styles.achievementCheckIcon} resizeMode="contain" accessibilityLabel="unlocked" />
              )}
            </View>
          );
        })}
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
          onPress={() => { playUiSound('selection'); uiHapticSelection(); onClose(); }}
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

      <Animated.View style={[styles.tabContent, { opacity: tabFade }]}>
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
              <StarBar label="3 Stars" stars={3} count={stats.threeStarCount} total={stats.totalPuzzlesCompleted} color={CandyColors.yellow.main} trackColor={t.rowBorder} countColor={t.body} delay={0} />
              <StarBar label="2 Stars" stars={2} count={stats.twoStarCount} total={stats.totalPuzzlesCompleted} color={CandyColors.orange.main} trackColor={t.rowBorder} countColor={t.body} delay={SURFACE.staggerMs * 3} />
              <StarBar label="1 Star" stars={1} count={stats.oneStarCount} total={stats.totalPuzzlesCompleted} color={t.muted} trackColor={t.rowBorder} countColor={t.body} delay={SURFACE.staggerMs * 6} />
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
                {/* The weave ladder is a phase-5 (post-revelation) pursuit, and
                    getUnbrokenWeaveMastery() always resolves a rank object — so
                    without this gate, any mid-game player who opened the card via
                    a speed round or resonant choice saw "Rank 0: Unbroken Weave"
                    (naming a mode that must not exist for them yet). Match the
                    DifficultyMenu: show it only once earned or at phase 5. */}
                {unbrokenWeaveMastery && (unbrokenWeaveMastery.wins > 0 || effectivePhase === 5) && (
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
              {/* Every tier, driven by one list. This block hand-listed EASY,
                  MEDIUM and HARD, so MEDIUM_PLUS was invisible and EXPERT never
                  appeared when the apex tier shipped — a player's hardest solves
                  simply were not in their stats. The bucket falls back to zeroes
                  so a legacy save mid-backfill can't crash the screen. */}
              {(['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD', 'EXPERT'] as Difficulty[]).map((diff, i) => {
                const bucket = stats.byDifficulty?.[diff] ?? { completed: 0, stars: 0 };
                return (
                  <DifficultyRow
                    key={diff}
                    difficulty={diff}
                    completed={bucket.completed}
                    stars={bucket.stars}
                    labelColor={t.body}
                    countColor={t.muted}
                    avgColor={t.title}
                    altBg={i % 2 === 1 ? rowAltTint : undefined}
                  />
                );
              })}
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
                {(['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD', 'EXPERT'] as Difficulty[]).map((diff, i) => {
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
                <AmberValue
                  amount={displayedAmberBalance}
                  color={t.amberText}
                  textStyle={styles.journeyValue}
                  accessibilityLabel={`${displayedAmberBalance} amber`}
                />
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
          {/* Menu-surface banner: BannerAd renders its own labeled cottage tray
              at a reserved height, so the layout never shifts as the native ad
              loads in. Self-suppresses for ad-free / onboarding / Phase 4+ and
              when no ad backend is configured. */}
          {shouldShowBanner({ phase: effectivePhase as DialoguePhase, isAdFree: isAdFreeSync(), onboarding: false }) && (
            <BannerAd phase={effectivePhase} />
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      ) : (
        <FlatList
          style={styles.content}
          data={ACHIEVEMENT_CATEGORIES}
          keyExtractor={category => category}
          renderItem={renderAchievementCategory}
          extraData={`${effectivePhase}-${achievements.length}-${achievementCheckState ? 1 : 0}`}
          showsVerticalScrollIndicator={false}
          initialNumToRender={3}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews
          ListFooterComponent={
            <>
              {/* Menu-surface banner (low friction; self-suppresses for ad-free /
                  onboarding / Phase 4+, and when no ad backend is configured).
                  BannerAd renders its own labeled cottage tray at a reserved
                  height, so the native rectangle reads as a deliberate menu zone
                  and never shifts the layout below it as the ad loads in. */}
              {shouldShowBanner({ phase: effectivePhase as DialoguePhase, isAdFree: isAdFreeSync(), onboarding: false }) && (
                <BannerAd phase={effectivePhase} />
              )}
              <View style={styles.bottomSpacer} />
            </>
          }
        />
      )}
      </Animated.View>
    </View>
  );
};

// Star distribution bar sub-component. The one data-viz moment on the
// screen: the fill grows in on first mount via a left-anchored native-driver
// scaleX (the track is measured via onLayout, the fill renders at its final
// pixel width and scales from 0 with a counter-translate so its left edge
// stays pinned), staggered per bar via `delay`. Reduced motion pins it full.
function StarBar({
  label,
  stars,
  count,
  total,
  color,
  trackColor,
  countColor,
  delay = 0,
}: {
  label: string;
  stars: number;
  count: number;
  total: number;
  color: string;
  trackColor: string;
  countColor: string;
  delay?: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const fillFraction = Math.max(0.02, pct / 100);
  const reducedMotion = getSettingsSync().reducedMotion;
  const [trackWidth, setTrackWidth] = useState(0);
  const anim = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion || trackWidth === 0) {
      anim.setValue(1);
      return;
    }
    anim.setValue(0);
    const a = Animated.spring(anim, {
      toValue: 1,
      friction: 8,
      tension: 60,
      delay,
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [trackWidth, reducedMotion, delay, anim]);

  const fillWidth = trackWidth * fillFraction;
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-fillWidth / 2, 0] });

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
      <View
        style={[styles.starBarTrack, { backgroundColor: trackColor }]}
        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View
          style={[
            styles.starBarFill,
            {
              width: fillWidth,
              backgroundColor: color,
              transform: [{ translateX }, { scaleX: anim }],
            },
          ]}
        />
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
  labelColor,
  countColor,
  avgColor,
  altBg,
}: {
  difficulty: Difficulty;
  completed: number;
  stars: number;
  labelColor: string;
  countColor: string;
  avgColor: string;
  altBg?: string;
}) {
  const avg = completed > 0 ? (stars / completed).toFixed(1) : '0.0';
  return (
    <View style={[styles.difficultyRow, altBg ? { backgroundColor: altBg } : null]}>
      <Image source={DIFFICULTY_ART[difficulty]} style={styles.difficultySeal} resizeMode="contain" />
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
    fontSize: FONT_SIZE.callout,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 80,
  },
  title: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.headline,
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
    fontSize: FONT_SIZE.body,
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
    paddingVertical: SURFACE.panelPadY,
    paddingHorizontal: SURFACE.panelPadX,
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
    // Nested inside heroCard: its own inset shrinks as the panel padding grows
    // so the three stat boxes keep the same total 38dp inset from the frame.
    paddingVertical: 16,
    paddingHorizontal: 10,
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
    fontSize: FONT_SIZE.hero,
    fontWeight: '900',
  },
  heroLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.caption,
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
    fontSize: FONT_SIZE.small,
    fontWeight: '800',
    letterSpacing: SURFACE.sectionLetterSpacing,
    paddingHorizontal: SURFACE.cardPadX,
    paddingTop: 14,
    paddingBottom: 6,
  },

  // Star bars
  starBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SURFACE.cardPadX,
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
    fontSize: FONT_SIZE.body,
    fontWeight: '700',
  },
  starSummary: {
    paddingHorizontal: SURFACE.cardPadX,
    paddingBottom: 12,
    paddingTop: 4,
  },
  starSummaryText: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.small,
    textAlign: 'center',
  },

  // Mastery card
  masteryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SURFACE.cardPadX,
    paddingVertical: 8,
  },
  masteryLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.bodyLg,
    fontWeight: '600',
  },
  masteryValue: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.large,
    fontWeight: '800',
  },
  masteryPace: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.body,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: SURFACE.cardPadX,
    paddingBottom: 12,
    paddingTop: 2,
  },

  // Difficulty rows
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SURFACE.cardPadX,
    paddingVertical: 14,
  },
  // The tier's wax-seal emblem (assets/ui/difficulty) in place of a 10dp
  // coloured dot: the tiers now differ by silhouette as well as hue.
  difficultySeal: {
    width: 26,
    height: 26,
    marginRight: 10,
  },
  difficultyLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.bodyLg,
    fontWeight: '700',
    width: 70,
  },
  difficultyCount: {
    fontFamily: BODY_FONT,
    flex: 1,
    fontSize: FONT_SIZE.body,
  },
  difficultyAvg: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.body,
    fontWeight: '700',
  },

  // Journey rows
  journeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SURFACE.cardPadX,
    paddingVertical: 14,
  },
  journeyLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.bodyLg,
    fontWeight: '600',
  },
  journeyValue: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.bodyLg,
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
    fontSize: FONT_SIZE.micro,
    textAlign: 'center',
    paddingTop: 8,
    paddingBottom: 12,
  },

  // Achievement rows
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SURFACE.cardPadX,
    paddingVertical: 12,
  },
  // Generated crest alcove (the achievement's own painted crest, dimmed with a
  // corner lock while unearned), replacing the raw color emoji + 🔒 that fought
  // the cottage chrome. 48dp so a 36dp crest keeps its silhouette.
  achievementIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementIconBadgeLocked: {
    opacity: 0.7,
  },
  achievementIconImage: {
    width: 36,
    height: 36,
  },
  achievementIconImageLocked: {
    opacity: 0.38,
  },
  achievementLockOverlay: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
  },
  achievementInfo: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  // Progress-toward track on a locked, countable achievement.
  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  achievementProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  achievementProgressText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.caption,
    fontWeight: '700',
    minWidth: 42,
    textAlign: 'right',
  },
  achievementTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.callout,
    fontWeight: '700',
  },
  achievementDesc: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.small,
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
    fontSize: FONT_SIZE.small,
    fontWeight: '800',
  },
  achievementCheckIcon: {
    width: 18,
    height: 18,
    marginLeft: 8,
  },

  bottomSpacer: {
    height: 60,
  },

  // Cross-fades the whole tab content area on swap (a 120ms dip-to-0.4-and-
  // back), on top of whichever of ScrollView/FlatList is currently mounted.
  tabContent: {
    flex: 1,
  },

  // Skeleton placeholder block (empty card body while loads land).
  skeletonBlock: {
    height: 96,
  },
});
