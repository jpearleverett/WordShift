import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import { CandyColors, getPhaseTheme } from '../../theme/colors';
import { CumulativeStats } from '../../services/starRating';
import {
  getVictoryTitle,
  getVictoryFeedback,
  getPhaseChangeNarrative,
  getRitualEchoHeader,
  getRitualEchoFooter,
  getWordsOfferedText,
  getPitHarvestLabel,
  getVictoryPitHint,
  getPitMandatoryText,
  getPitMandatoryCTA,
  getAutoCollectCaption,
  getMandatoryHarvestText,
  getMandatoryHarvestCTA,
  getNextStreakMilestoneText,
  getFlawlessHonorific,
  getUnbrokenWeaveRankUpLine,
  getRewardedDoubleLabel,
  getRewardedDoubleConfirm,
  getDailyLadderTrendLabel,
  getResonanceBonusLabel,
  isSilentVictoryBeat,
} from '../../services/phaseNarrative';
import { DialoguePhase } from '../../types/homeWorld';
import { VARIANT_CONFIGS } from '../../services/puzzleVariety';
import { AMBER_REWARDS, AUTO_COLLECT_PUZZLE_LIMIT } from '../../constants/gameBalance';
import { isRoutineVictory } from '../../hooks/useVictoryFlow';
import type { AmberBreakdown } from '../../hooks/useGamePersistence';
import { hapticSuccess } from '../../services/haptics';
import { isDailyShareBonusAvailable, DAILY_SHARE_BONUS_AMBER } from '../../services/shareResults';
import { getSettingsSync } from '../../services/settings';
import { DailyLeaderboardCard } from '../social/DailyLeaderboardCard';
import { getBeatPercentText, DailyRank } from '../../services/leaderboard';
import { RewardedAdButton } from '../monetization/RewardedAdButton';
import { isAdFreeSync } from '../../services/entitlements';
import { announceForA11y } from '../../services/a11yAnnounce';
import { BODY_FONT, BODY_FONT_ITALIC, PIXEL_FONT_BOLD } from '../../theme/fonts';

// Candy-styled UI sprite icons (replace emoji for critical info)
const STAR_FILLED = require('../../../assets/ui/star_filled.png');
const STAR_EMPTY = require('../../../assets/ui/star_empty.png');
const AMBER_ICON = require('../../../assets/ui/amber.png');
const FLAME_ICON = require('../../../assets/ui/flame.png');
const SHARE_ICON = require('../../../assets/ui/share.png');

export interface VictoryData {
  earnedStars: number;
  amberEarned: number;
  streakBonus: number;
  challengeBonus: number;
  /** True when the win was a Blind Offering board (labels the trial bonus line). */
  blind?: boolean;
  surpriseBonus?: number;
  milestoneBonus: number;
  milestoneMessage: string | null;
  firstCompletionBonus?: number;
  streakMilestoneBonus?: number;
  streakMilestoneMessage?: string | null;
  currentStreak: number;
  phaseChanged: boolean;
  newPhase: number;
  totalWordsFormed?: number;
  ritualEnergy?: number;
  variantBonus?: number;
  /** Amber from resonant deep-word choices (absent/0 when none; amber-only) */
  resonanceBonus?: number;
  freshVariantBonus?: number;
  variantRepeatDecay?: number;
  questsCompleted?: string[];
  harvestedWords?: string[];
  pendingHarvest?: { pendingAmber: number; pendingWords: number; pendingBatches: number };
  autoCollected?: boolean;
  /** One-time mandatory first-harvest gate: hides Next Level, forces a pit visit */
  mandatoryHarvest?: boolean;
  /** Perfect play: 0 hints, 0 invalid attempts, 0 undos — the tier above 3 stars */
  flawless?: boolean;
  /** Lifetime count of flawless offerings (for the honorific milestone copy) */
  flawlessCount?: number;
  /** Real amber itemization from the economy (display falls back to local math when absent) */
  amberBreakdown?: AmberBreakdown;
  /** True when this victory was the Daily Challenge (never compact) */
  isDaily?: boolean;
  /** Phase transition queued for the pit ceremony (never compact) */
  phaseTransitionPending?: boolean;
  /** Monotonic real-puzzle count — early wins keep the full ceremony */
  puzzlesSolved?: number;
  /** THE marked final board's win — a hushed beat (no success buzz on open) */
  finalBoard?: boolean;
  unbrokenWeaveRank?: number;
  unbrokenWeaveTitle?: string;
  unbrokenWeaveNextObjective?: string | null;
  unbrokenWeaveRankedUp?: boolean;
}

interface VictoryModalProps {
  visible: boolean;
  earnedStars: number;
  difficulty: string;
  phase: DialoguePhase;
  /** True when a phase transition is waiting to be confirmed in the pit */
  phaseTransitionPending?: boolean;
  isPlayingDaily: boolean;
  /** Daily leaderboard standing for this result (null = none / backend off) */
  dailyRank?: DailyRank | null;
  /** Persistent daily-ladder history line (best this week / participation). */
  dailyHistoryLine?: string | null;
  /** Placement trend vs the previous ranked day. */
  dailyTrend?: 'up' | 'down' | 'flat' | null;
  /** Quiet, spoiler-safe aggregate social-proof line (null = none / backend off) */
  socialProofLine?: string | null;
  /** Full-moon event bonus line for daily completions on event days. */
  eventBonusLine?: string | null;
  /** Sequential victory-toast receipt line (streak/quest/milestone receipts,
   *  pace beats, nudges). Rendered as an in-modal fading slot so it is visible
   *  over the modal instead of the board Toast, which sits under the overlay. */
  receiptLine?: string | null;
  /** App-level override: a queued cinematic (final puzzle / post-revelation)
   *  must always get the full ceremony, never the compact strip. */
  forceFullCeremony?: boolean;
  /** App-level gate for the optional rewarded "double the reward" affordance */
  rewardedDoubleEnabled?: boolean;
  /** True once the player has doubled this victory's reward */
  rewardedDoubleClaimed?: boolean;
  /** Grant the doubled reward (called on a completed rewarded view) */
  onRewardedDouble?: () => void;
  victoryData: VictoryData | null;
  completionCoda?: { title: string; text: string } | null;
  cumulativeStats: CumulativeStats | null;
  // Ritual echo data
  completedWords?: string[];
  incantationName?: string | null;
  // Animated values from useVictoryFlow
  modalScale: Animated.Value;
  modalOpacity: Animated.Value;
  star1Scale: Animated.Value;
  star2Scale: Animated.Value;
  star3Scale: Animated.Value;
  // Callbacks
  onNextLevel: () => void;
  onReturnHome: () => void;
  onGoToPit: () => void;
  onShare: () => void;
  /** Tap-anywhere during the entrance choreography — skips stars/modal animation */
  onSkip?: () => void;
  // Onboarding mode
  isOnboarding?: boolean;
  onOnboardingContinue?: () => void;
  // Bonus breakdown data
  variant?: string;
  gameMode?: string;
}

// Phase-aware 3D button colors — matches LetterTile's phase palette.
// Text/background pairs are WCAG AA-checked (>=4.5:1) against the phase's
// modal background (see getPhaseTheme) — ratios noted inline where a color
// was tuned for contrast.
function getButtonTheme(phase: DialoguePhase) {
  if (phase >= 4) return {
    primary:   { bg: '#7C3AED', edge: '#5B21B6', shadow: '#5B21B6' },
    harvest:   { bg: '#C2410C', edge: '#9A3412', shadow: '#9A3412' },
    secondary: { bg: '#2A2040', edge: '#1A1030', text: '#B0A8C0' }, // 6.7:1 (was #908098 @ 4.2:1)
    share:     { bg: '#3A3050', edge: '#2A2040', text: '#B0A8C0' }, // 5.4:1
    harvestPill: { bg: 'rgba(194, 65, 12, 0.15)', border: 'rgba(194, 65, 12, 0.3)', text: '#E87040' }, // 5.2:1
    streakChip: { bg: 'rgba(234, 88, 12, 0.16)', border: 'rgba(234, 88, 12, 0.35)', text: '#FFB27A' }, // 8.6:1
    modalBorder: 'rgba(90, 30, 90, 0.25)',
  };
  if (phase >= 3) return {
    primary:   { bg: '#9333EA', edge: '#7C3AED', shadow: '#7C3AED' },
    harvest:   { bg: '#EA580C', edge: '#C2410C', shadow: '#C2410C' },
    secondary: { bg: '#3A3555', edge: '#2E3040', text: '#B8B8C8' }, // 5.9:1 (was #A0A0B0 @ 4.5:1 borderline)
    share:     { bg: '#4A4570', edge: '#3A3555', text: '#B8B8C8' }, // 4.5:1
    harvestPill: { bg: 'rgba(234, 88, 12, 0.12)', border: 'rgba(234, 88, 12, 0.25)', text: '#F08050' }, // 5.0:1 (was #E87040 @ 4.3:1)
    streakChip: { bg: 'rgba(234, 88, 12, 0.16)', border: 'rgba(234, 88, 12, 0.35)', text: '#FFB27A' }, // 7.3:1
    modalBorder: 'rgba(147, 51, 234, 0.2)',
  };
  if (phase >= 2) return {
    primary:   { bg: CandyColors.pink.main, edge: CandyColors.pink.dark, shadow: CandyColors.pink.dark },
    harvest:   { bg: CandyColors.orange.main, edge: CandyColors.orange.dark, shadow: CandyColors.orange.dark },
    secondary: { bg: CandyColors.gray[300], edge: CandyColors.gray[400], text: CandyColors.gray[600] }, // 5.1:1
    share:     { bg: CandyColors.blue.light, edge: CandyColors.blue.main, text: CandyColors.gray[700] }, // 4.6:1 (secondary.text was 3.0:1 on blue)
    harvestPill: { bg: 'rgba(249, 115, 22, 0.10)', border: 'rgba(249, 115, 22, 0.2)', text: '#9A3412' }, // 5.2:1 (orange.dark was 3.2:1)
    streakChip: { bg: '#FFE0C2', border: 'rgba(234, 88, 12, 0.35)', text: '#9A3412' }, // 5.8:1 (was orange.dark on orange.light @ 1.6:1)
    modalBorder: 'rgba(255, 255, 255, 0.3)',
  };
  // Phase 0-1: bright candy
  return {
    primary:   { bg: CandyColors.pink.main, edge: CandyColors.pink.dark, shadow: CandyColors.pink.dark },
    harvest:   { bg: CandyColors.orange.main, edge: CandyColors.orange.dark, shadow: CandyColors.orange.dark },
    secondary: { bg: CandyColors.gray[200], edge: CandyColors.gray[300], text: CandyColors.gray[600] }, // 6.2:1
    share:     { bg: CandyColors.blue.light, edge: CandyColors.blue.main, text: CandyColors.gray[700] }, // 4.6:1 (secondary.text was 3.0:1 on blue)
    harvestPill: { bg: 'rgba(249, 115, 22, 0.10)', border: 'rgba(249, 115, 22, 0.2)', text: '#9A3412' }, // 6.6:1 (orange.dark was 3.2:1)
    streakChip: { bg: '#FFE0C2', border: 'rgba(234, 88, 12, 0.35)', text: '#9A3412' }, // 5.8:1 (was orange.dark on orange.light @ 1.6:1)
    modalBorder: 'rgba(255, 255, 255, 0.4)',
  };
}

// The victory title's drop shadow (F40): a bright candy pink shadow reads as
// a leftover candy artifact once the sheet has gone near-black. The shadow
// itself deepens into the dread register right alongside the title's ink.
function getVictoryTitleShadowColor(phase: DialoguePhase): string {
  if (phase >= 4) return '#150610'; // near-black recede at the reveal
  if (phase >= 3) return '#5C1030'; // deep crimson, growing shadows
  return CandyColors.pink.shadow; // bright candy phases 0-2
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  visible,
  earnedStars,
  difficulty,
  phase,
  phaseTransitionPending,
  isPlayingDaily,
  dailyRank,
  dailyHistoryLine,
  dailyTrend,
  socialProofLine,
  eventBonusLine,
  receiptLine,
  forceFullCeremony,
  rewardedDoubleEnabled,
  rewardedDoubleClaimed,
  onRewardedDouble,
  victoryData,
  completionCoda,
  cumulativeStats,
  completedWords,
  incantationName,
  modalScale,
  modalOpacity,
  star1Scale,
  star2Scale,
  star3Scale,
  onNextLevel,
  onReturnHome,
  onGoToPit,
  onShare,
  onSkip,
  isOnboarding,
  onOnboardingContinue,
  variant,
  gameMode,
}) => {
  const phaseTheme = getPhaseTheme(phase);
  const btn = getButtonTheme(phase);
  // getVictoryFeedback draws randomly from a pool: pick ONCE per victory so
  // the line never visibly re-rolls as async lines (rank/social proof) land
  // and re-render the open modal.
  const victoryFeedbackLine = useMemo(
    () => getVictoryFeedback(earnedStars, phase),
    [earnedStars, phase, visible]
  );
  const totalPuzzlesCompleted = cumulativeStats?.totalPuzzlesCompleted ?? 0;
  const isEarlyGameVictory = totalPuzzlesCompleted > 0 && totalPuzzlesCompleted <= 5;
  // Both the phase-transition ceremony and the one-time first-harvest gate force
  // a pit visit: the pit CTA becomes the only action (Next Level/Home/Share hide).
  const mandatoryHarvest = !!victoryData?.mandatoryHarvest;
  const mustVisitPit = !!phaseTransitionPending || mandatoryHarvest;

  // Swift Victories: a ROUTINE win renders the compact result strip (instant,
  // condensed) instead of the full ceremony. isRoutineVictory is the shared
  // policy (also drives the instant animation path in useVictoryFlow); the
  // extra guards here cover surfaces only the modal knows about (onboarding's
  // single-button layout, the completion coda, the daily/pit props).
  const compactMode =
    getSettingsSync().swiftVictories === true &&
    !isOnboarding &&
    !isPlayingDaily &&
    !mustVisitPit &&
    !completionCoda &&
    !forceFullCeremony &&
    isRoutineVictory(victoryData);

  // The two hushed beats perform silence on screen — the finale board and the
  // scripted silent victory. Used to suppress the modal-open success haptic.
  const hushedBeat =
    victoryData?.finalBoard === true ||
    isSilentVictoryBeat(victoryData?.puzzlesSolved ?? 0);

  // Ritual echo chain + de-duplicated feedback register: the performance
  // feedback line and the ritual-echo footer occupy the same emotional slot,
  // so when the chain renders with a footer (Phase 1+), the footer wins.
  // The feedback line still carries Phase 0 (footer intentionally empty there)
  // and chain-less boards (e.g. autosave-restored victories).
  const echoWords = completedWords && completedWords.length > 0 ? completedWords : null;
  const echoFooter = echoWords ? getRitualEchoFooter(phase, echoWords.length) : '';
  const showPerformanceFeedback = !(echoWords && echoFooter !== '');

  // Amber-breakdown accent colors — bright candy accents only read on the dark
  // stat card (Phase 3+); light phases get deepened variants that hold >=4.5:1
  // on the palest stat background (#DDD5E8 at Phase 2 is the binding case).
  const accent = phase >= 3
    ? { gold: '#FFD700', silver: '#C0C0C0', challenge: '#FF6B6B', variant: '#B088D0', streak: '#FF8C00', green: '#50C878' }
    : { gold: '#755A00', silver: CandyColors.gray[600], challenge: CandyColors.red.shadow, variant: CandyColors.purple.shadow, streak: '#9A3412', green: '#166534' };

  // First share of the day earns a small amber bonus — hint it on the button
  const [shareBonusAvailable, setShareBonusAvailable] = useState(false);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    isDailyShareBonusAvailable().then(available => {
      if (!cancelled) setShareBonusAvailable(available);
    });
    return () => { cancelled = true; };
  }, [visible]);

  // Cascade animation — 4 staggered content groups. The reveal ages with the
  // descent (F34): the stagger widens and each group settles in from a small
  // translateY instead of a flat fade at the dark phases, so the entrance
  // reads as heavier, not merely darker (mirrors the star-pop stagger widening
  // in useVictoryFlow's getStarStaggerMs).
  const cascadeStaggerMs = phase >= 3 ? 280 : 200;
  const cascadeSettleDp = phase >= 3 ? 12 : 8;
  const contentOpacity1 = useRef(new Animated.Value(0)).current;
  const contentOpacity2 = useRef(new Animated.Value(0)).current;
  const contentOpacity3 = useRef(new Animated.Value(0)).current;
  const contentOpacity4 = useRef(new Animated.Value(0)).current;
  const contentTranslateY1 = contentOpacity1.interpolate({ inputRange: [0, 1], outputRange: [cascadeSettleDp, 0] });
  const contentTranslateY2 = contentOpacity2.interpolate({ inputRange: [0, 1], outputRange: [cascadeSettleDp, 0] });
  const contentTranslateY3 = contentOpacity3.interpolate({ inputRange: [0, 1], outputRange: [cascadeSettleDp, 0] });
  const contentTranslateY4 = contentOpacity4.interpolate({ inputRange: [0, 1], outputRange: [cascadeSettleDp, 0] });
  // In-modal victory receipt slot: fades each queued line in fresh as it cycles.
  const receiptOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!receiptLine) {
      if (getSettingsSync().reducedMotion) { receiptOpacity.setValue(0); return; }
      Animated.timing(receiptOpacity, { toValue: 0, duration: 160, useNativeDriver: true }).start();
      return;
    }
    if (getSettingsSync().reducedMotion) { receiptOpacity.setValue(1); return; }
    receiptOpacity.setValue(0);
    Animated.timing(receiptOpacity, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [receiptLine, receiptOpacity]);
  // While the entrance choreography (stars + content cascade) runs, a
  // tap-anywhere layer skips it; once complete the layer unmounts so the
  // action buttons receive touches normally.
  const [entranceComplete, setEntranceComplete] = useState(false);
  const cascadeAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      if (!hushedBeat) hapticSuccess();
      if (compactMode || getSettingsSync().reducedMotion) {
        // Reveal all cascade groups instantly — skip the stagger. The compact
        // strip has no entrance choreography at all (and renders no skip
        // layer), so it must never leave entranceComplete false.
        contentOpacity1.setValue(1);
        contentOpacity2.setValue(1);
        contentOpacity3.setValue(1);
        contentOpacity4.setValue(1);
        setEntranceComplete(true);
        return;
      }
      setEntranceComplete(false);
      contentOpacity1.setValue(0);
      contentOpacity2.setValue(0);
      contentOpacity3.setValue(0);
      contentOpacity4.setValue(0);
      const cascade = Animated.stagger(cascadeStaggerMs, [
        Animated.timing(contentOpacity1, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(contentOpacity2, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(contentOpacity3, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(contentOpacity4, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]);
      cascadeAnimRef.current = cascade;
      cascade.start(({ finished }) => {
        cascadeAnimRef.current = null;
        // stop() (skip/hide) fires with finished:false — skip handles the state.
        if (finished) setEntranceComplete(true);
      });
      return () => {
        cascade.stop();
        cascadeAnimRef.current = null;
      };
    }
    setEntranceComplete(false);
  }, [visible, compactMode, hushedBeat]);

  // Assistive-access announce: once the modal has settled, speak the victory
  // payoff (the SAME title + amber the player sees, so it stays spoiler and
  // tone consistent with the visible content) to screen readers. Guarded to
  // fire exactly once per open so async lines (rank/social proof) can't respeak
  // it, and reset when the modal closes.
  const announcedRef = useRef(false);
  useEffect(() => {
    if (!visible) {
      announcedRef.current = false;
      return;
    }
    if (!entranceComplete || announcedRef.current) return;
    announcedRef.current = true;
    const title = getVictoryTitle(earnedStars, phase);
    const starsPhrase = `${earnedStars} of 3 stars`;
    const flawlessPhrase = victoryData?.flawless ? `${getFlawlessHonorific(phase)}. ` : '';
    const total = victoryData?.amberEarned ?? 0;
    const amberPhrase = victoryData?.autoCollected
      ? `${total} amber earned`
      : `${total} amber gathered for the pit`;
    announceForA11y(`${title}. ${starsPhrase}. ${flawlessPhrase}${amberPhrase}.`);
  }, [visible, entranceComplete, earnedStars, phase, victoryData]);

  const handleSkipEntrance = useCallback(() => {
    cascadeAnimRef.current?.stop();
    cascadeAnimRef.current = null;
    contentOpacity1.setValue(1);
    contentOpacity2.setValue(1);
    contentOpacity3.setValue(1);
    contentOpacity4.setValue(1);
    setEntranceComplete(true);
    // Let the orchestrator snap the star/modal animation to its final state
    onSkip?.();
  }, [contentOpacity1, contentOpacity2, contentOpacity3, contentOpacity4, onSkip]);

  if (!visible) return null;

  // ---------------------------------------------------------------------
  // Compact result strip (Swift Victories, routine wins only): instant
  // appearance, condensed content — title, stars, total amber (+ flawless
  // marker) and the same Next Level / Share / Home actions. Phase-aware via
  // the same theme accessors as the full modal; no entrance choreography and
  // therefore no tap-to-skip layer.
  // ---------------------------------------------------------------------
  if (compactMode) {
    const compactTotal = victoryData?.amberEarned ?? 0;
    return (
      <View
        style={[styles.modalOverlay, {
          backgroundColor: phaseTheme.modalOverlayColor,
        }]}
        // Focus fencing: mark the overlay an assistive-tech modal so screen
        // reader focus stays inside the result surface (iOS) and cannot wander
        // into the board occluded behind the scrim. The container itself is not
        // `accessible` (its labelled children keep their own focus order).
        accessibilityViewIsModal
        accessibilityLabel="Results"
      >
        <View style={styles.compactWrap}>
          <View style={[styles.compactCard, {
            backgroundColor: phaseTheme.modalBgColor,
            borderColor: btn.modalBorder,
          }]}>
            <View
              style={styles.compactStarsRow}
              accessible
              accessibilityLabel={`${earnedStars} of 3 stars`}
            >
              {[1, 2, 3].map(i => (
                <Image
                  key={i}
                  source={earnedStars >= i ? STAR_FILLED : STAR_EMPTY}
                  style={[styles.compactStarImage, earnedStars < i && styles.victoryStarEmpty]}
                />
              ))}
            </View>
            <Text style={[styles.compactTitle, { color: phaseTheme.victoryTitleColor }]}>
              {getVictoryTitle(earnedStars, phase)}
            </Text>
            {victoryData?.flawless && (
              <Text
                style={[styles.compactFlawless, { color: phaseTheme.victoryTitleColor }]}
                accessibilityLabel={getFlawlessHonorific(phase)}
              >
                {getFlawlessHonorific(phase)}
              </Text>
            )}
            {victoryData?.unbrokenWeaveRank != null && (
              <View style={styles.compactWeaveProgress}>
                <Text style={[styles.compactFlawless, { color: phaseTheme.victoryTitleColor }]}>
                  {`Rank ${victoryData.unbrokenWeaveRank}: ${victoryData.unbrokenWeaveTitle}`}
                </Text>
                {victoryData.unbrokenWeaveNextObjective && (
                  <Text style={[styles.compactWeaveObjective, { color: phaseTheme.modalSecondaryTextColor }]}>
                    {victoryData.unbrokenWeaveNextObjective}
                  </Text>
                )}
              </View>
            )}
            <View
              style={styles.compactAmberRow}
              accessible
              accessibilityLabel={
                victoryData?.autoCollected
                  ? `${compactTotal} amber earned`
                  : `${compactTotal} amber gathered for the pit`
              }
            >
              <Image source={AMBER_ICON} style={styles.amberIconLarge} />
              <Text style={[styles.compactAmberText, { color: phaseTheme.modalTextColor }]}>
                +{compactTotal}
              </Text>
            </View>
            {!!eventBonusLine && (
              <Text style={[styles.compactFlawless, { color: phaseTheme.modalSecondaryTextColor }]}>
                {eventBonusLine}
              </Text>
            )}
            {/* Victory receipt (pace beats / nudges still fire on routine wins) —
                shown here so it is visible over the modal, not the board Toast. */}
            {!!receiptLine && (
              <Animated.Text
                style={[styles.receiptLine, { color: phaseTheme.modalSecondaryTextColor, opacity: receiptOpacity }]}
                accessibilityLabel={receiptLine ?? undefined}
              >
                {receiptLine}
              </Animated.Text>
            )}
            {/* The amber is QUEUED in a harvest batch, not credited — the strip
                must keep the pit affordance (and the 2x opt-in) or routine wins
                lose their only in-victory collection path. */}
            {rewardedDoubleEnabled && !isOnboarding && onRewardedDouble && (
              rewardedDoubleClaimed ? (
                <Text style={[styles.rewardedDoubleConfirm, { color: phaseTheme.modalSecondaryTextColor }]}>
                  {'✓ '}{getRewardedDoubleConfirm(phase as DialoguePhase)}
                </Text>
              ) : isAdFreeSync() ? (
                <TouchableOpacity
                  style={[styles.freeDoubleButton, phase >= 3 ? styles.freeDoubleButtonDark : styles.freeDoubleButtonLight]}
                  onPress={onRewardedDouble}
                  accessibilityRole="button"
                  accessibilityLabel={getRewardedDoubleLabel(phase as DialoguePhase)}
                >
                  <Text style={[styles.freeDoubleText, phase >= 3 ? styles.freeDoubleTextDark : styles.freeDoubleTextLight]}>
                    {'✦ '}{getRewardedDoubleLabel(phase as DialoguePhase)}
                  </Text>
                </TouchableOpacity>
              ) : (
                <RewardedAdButton
                  placement="victory_double"
                  phase={phase}
                  label={getRewardedDoubleLabel(phase as DialoguePhase)}
                  onReward={onRewardedDouble}
                  style={styles.rewardedDoubleButton}
                />
              )
            )}
            {!victoryData?.autoCollected && (
              <TouchableOpacity
                onPress={onGoToPit}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Collect amber in the pit"
                accessibilityRole="button"
                style={[styles.collectNowPill, {
                  backgroundColor: btn.harvestPill.bg,
                  borderColor: btn.harvestPill.border,
                }]}
              >
                <Text style={[styles.collectNowText, { color: btn.harvestPill.text }]}>
                  {`${'🌾'} Collect Now  ›`}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onNextLevel}
              activeOpacity={0.85}
              accessibilityLabel="Next level"
              accessibilityRole="button"
              style={{ width: '100%' }}
            >
              <View style={[styles.btn3dWrapper, { width: '100%' }]}>
                <View style={[styles.btn3dBody, {
                  backgroundColor: btn.primary.bg,
                  shadowColor: btn.primary.shadow,
                  width: '100%',
                }]}>
                  <View style={styles.btn3dBevel} />
                  <View style={styles.btn3dGlossy} />
                  <Text style={styles.btn3dPrimaryText}>NEXT LEVEL</Text>
                </View>
                <View style={[styles.btn3dEdge, {
                  backgroundColor: btn.primary.edge,
                }]} />
              </View>
            </TouchableOpacity>

            <View style={styles.victoryButtonRowSecondary}>
              <TouchableOpacity
                onPress={onShare}
                activeOpacity={0.8}
                hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
                accessibilityLabel={shareBonusAvailable
                  ? `Share result, earns ${DAILY_SHARE_BONUS_AMBER} amber for the first share today`
                  : 'Share result'}
                accessibilityRole="button"
                style={{ flex: 1 }}
              >
                <View style={[styles.btnFlat, {
                  backgroundColor: btn.share.bg,
                  borderColor: btn.share.edge,
                }]}>
                  <View style={styles.shareBtnRow}>
                    <Image
                      source={SHARE_ICON}
                      style={styles.shareBtnIcon}
                      importantForAccessibility="no"
                      accessibilityElementsHidden
                    />
                    <Text numberOfLines={1} style={[styles.btnFlatUniform, { color: btn.share.text }]}>
                      Share
                    </Text>
                    {shareBonusAvailable && (
                      <>
                        <Image
                          source={AMBER_ICON}
                          style={styles.shareBonusIcon}
                          importantForAccessibility="no"
                          accessibilityElementsHidden
                        />
                        <Text numberOfLines={1} style={[styles.btnFlatUniform, { color: btn.share.text }]}>
                          {`+${DAILY_SHARE_BONUS_AMBER}`}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onReturnHome}
                activeOpacity={0.8}
                hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
                accessibilityLabel="Return home"
                accessibilityRole="button"
                style={{ flex: 1 }}
              >
                <View style={[styles.btnFlat, {
                  backgroundColor: btn.secondary.bg,
                  borderColor: btn.secondary.edge,
                }]}>
                  <Text style={[styles.btnFlatUniform, { color: btn.secondary.text }]}>{'\uD83C\uDFE0'} Home</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.modalOverlay, {
        backgroundColor: phaseTheme.modalOverlayColor,
      }]}
      // Focus fencing: mark the overlay an assistive-tech modal so screen
      // reader focus stays inside the result surface (iOS) and cannot wander
      // into the board occluded behind the scrim. The container itself is not
      // `accessible` (its labelled children keep their own focus order).
      accessibilityViewIsModal
      accessibilityLabel="Results"
    >
      <ScrollView
        contentContainerStyle={styles.victoryScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
          <Animated.View style={[styles.victoryModal, {
            backgroundColor: phaseTheme.modalBgColor,
            borderColor: btn.modalBorder,
            transform: [{ scale: modalScale }],
            opacity: modalOpacity,
          }]}>
            <View style={[styles.victoryGlow, {
              backgroundColor: phaseTheme.victoryGlowColor,
            }]} />
            <View style={styles.modalShine} />

            {/* Stars — choreographed pop-in */}
            <View
              style={styles.starsContainer}
              accessible
              accessibilityLabel={`${earnedStars} of 3 stars`}
            >
              <Animated.Image
                source={earnedStars >= 1 ? STAR_FILLED : STAR_EMPTY}
                style={[
                  styles.victoryStarImage,
                  earnedStars < 1 && styles.victoryStarEmpty,
                  { transform: [{ scale: star1Scale }] },
                ]}
              />
              <Animated.Image
                source={earnedStars >= 2 ? STAR_FILLED : STAR_EMPTY}
                style={[
                  styles.victoryStarImage,
                  styles.victoryStarImageBig,
                  earnedStars < 2 && styles.victoryStarEmpty,
                  { transform: [{ scale: star2Scale }] },
                ]}
              />
              <Animated.Image
                source={earnedStars >= 3 ? STAR_FILLED : STAR_EMPTY}
                style={[
                  styles.victoryStarImage,
                  earnedStars < 3 && styles.victoryStarEmpty,
                  { transform: [{ scale: star3Scale }] },
                ]}
              />
            </View>

            <Text style={[styles.victoryTitle, {
              color: phaseTheme.victoryTitleColor,
              textShadowColor: getVictoryTitleShadowColor(phase),
            }]}>
              {getVictoryTitle(earnedStars, phase)}
            </Text>
            {/* Flawless offering — the perfect-play tier above 3 stars. A small
                phase-aware honorific ribbon; only shows on a truly clean solve. */}
            {victoryData?.flawless && (
              <View
                style={[styles.flawlessBadge, {
                  borderColor: phaseTheme.victoryTitleColor,
                  backgroundColor: phaseTheme.victoryGlowColor,
                }]}
                accessible
                accessibilityLabel={getFlawlessHonorific(phase)}
              >
                <Text style={[styles.flawlessBadgeText, {
                  color: phaseTheme.victoryTitleColor,
                }]}>
                  {getFlawlessHonorific(phase)}
                </Text>
              </View>
            )}
            {/* Subtitle only where it disambiguates — the stars + title already
                say "puzzle complete", so the generic label was trimmed. */}
            {isPlayingDaily && (
              <Text style={[styles.victorySubtitle, {
                color: phaseTheme.modalSecondaryTextColor,
              }]}>
                Daily Challenge Complete
              </Text>
            )}
            {victoryData?.unbrokenWeaveRank != null && (
              <View
                style={[styles.weaveProgress, {
                  borderColor: phaseTheme.victoryTitleColor + '55',
                  backgroundColor: phaseTheme.victoryGlowColor,
                }]}
                accessible
                accessibilityLabel={`Unbroken Weave rank ${victoryData.unbrokenWeaveRank}, ${victoryData.unbrokenWeaveTitle}`}
              >
                <Text style={[styles.weaveProgressTitle, { color: phaseTheme.victoryTitleColor }]}>
                  UNBROKEN WEAVE
                </Text>
                <Text style={[styles.weaveProgressRank, { color: phaseTheme.modalTextColor }]}>
                  {`Rank ${victoryData.unbrokenWeaveRank}: ${victoryData.unbrokenWeaveTitle}`}
                </Text>
                {victoryData.unbrokenWeaveRankedUp && (
                  <Text style={[styles.weaveProgressLine, { color: phaseTheme.modalSecondaryTextColor }]}>
                    {getUnbrokenWeaveRankUpLine(phase, victoryData.unbrokenWeaveTitle ?? 'Unbroken Weave')}
                  </Text>
                )}
                {victoryData.unbrokenWeaveNextObjective && (
                  <Text style={[styles.weaveProgressLine, { color: phaseTheme.modalSecondaryTextColor }]}>
                    {victoryData.unbrokenWeaveNextObjective}
                  </Text>
                )}
              </View>
            )}

            {isPlayingDaily && (dailyRank || dailyHistoryLine) && (
              <DailyLeaderboardCard
                rank={dailyRank?.rank ?? null}
                total={dailyRank?.total ?? null}
                percentile={dailyRank?.percentile ?? null}
                beatText={dailyRank ? getBeatPercentText(dailyRank.percentile, phase) : null}
                historyLine={dailyHistoryLine}
                trendLabel={getDailyLadderTrendLabel(dailyTrend, phase)}
                phase={phase}
              />
            )}

            {/* Group 1: Harvest, bonuses, streak, milestone */}
            <Animated.View style={{ opacity: contentOpacity1, transform: [{ translateY: contentTranslateY1 }] }}>
            {/* Harvested words (queued for the pit) */}
            {victoryData?.harvestedWords && victoryData.harvestedWords.length > 0 && (
              <View
                style={[styles.harvestWordContainer, {
                  backgroundColor: btn.harvestPill.bg,
                  borderColor: btn.harvestPill.border,
                }]}
                // Group the row so the decorative sheaf glyph is not read as its
                // own emoji; the label speaks the same count + verb shown.
                accessible
                accessibilityLabel={`${victoryData.harvestedWords.length} ${victoryData.harvestedWords.length === 1 ? 'word' : 'words'} ${getPitHarvestLabel(phase).toLowerCase()}`}
              >
                <Text style={styles.harvestWordIcon} importantForAccessibility="no">{'\uD83C\uDF3E'}</Text>
                <Text style={[styles.harvestWordText, { color: btn.harvestPill.text }]}>
                  {victoryData.harvestedWords.length} {victoryData.harvestedWords.length === 1 ? 'word' : 'words'} {getPitHarvestLabel(phase).toLowerCase()}
                </Text>
              </View>
            )}

            {/* Streak display */}
            {victoryData && victoryData.currentStreak > 1 && (() => {
              const nextMilestoneText = getNextStreakMilestoneText(phase, victoryData.currentStreak);
              return (
                <>
                  <View
                    style={[styles.winStreakContainer, {
                      backgroundColor: btn.streakChip.bg,
                      borderColor: btn.streakChip.border,
                    }]}
                    accessible
                    accessibilityLabel={`${victoryData.currentStreak} day streak`}
                  >
                    <Image source={FLAME_ICON} style={styles.winStreakIcon} />
                    <Text style={[styles.winStreakText, { color: btn.streakChip.text }]}>
                      {victoryData.currentStreak} Day Streak!
                    </Text>
                  </View>
                  {Boolean(nextMilestoneText) && (
                    <Text style={[styles.streakMilestoneHint, { color: phaseTheme.modalSecondaryTextColor }]}>
                      {nextMilestoneText}
                    </Text>
                  )}
                </>
              );
            })()}

            {/* Milestone bonus */}
            {victoryData && victoryData.milestoneBonus > 0 && Boolean(victoryData.milestoneMessage) && (
              <View
                style={[styles.milestoneContainer, phase >= 3 && styles.milestoneContainerDark]}
                accessible
                accessibilityLabel={`Milestone: ${victoryData.milestoneMessage}`}
              >
                <Text style={styles.milestoneEmoji}>{'\uD83C\uDFC6'}</Text>
                <Text style={[styles.milestoneMessage, phase >= 3 && styles.milestoneMessageDark]}>{victoryData.milestoneMessage}</Text>
              </View>
            )}

            {/* Quest completion badges */}
            {victoryData?.questsCompleted && victoryData.questsCompleted.length > 0 && (
              <View
                style={styles.questCompletedContainer}
                accessible
                accessibilityLabel={`Quests completed: ${victoryData.questsCompleted.join(', ')}`}
              >
                {victoryData.questsCompleted.map((title, i) => (
                  <View key={i} style={[styles.questBadge, { borderColor: phaseTheme.victoryTitleColor + '40' }]}>
                    <Text style={styles.questBadgeIcon}>{'\uD83D\uDCCB'}</Text>
                    <Text style={[styles.questBadgeText, { color: phaseTheme.modalTextColor }]}>
                      {title}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Phase change notification */}
            {victoryData?.phaseChanged && (() => {
              const phaseNarrative = getPhaseChangeNarrative(victoryData!.newPhase as DialoguePhase);
              return (
                <View
                  style={[styles.phaseChangeContainer,
                    victoryData!.newPhase >= 3 && styles.phaseChangeContainerDark,
                  ]}
                  accessible
                  accessibilityLabel={`${phaseNarrative.title}. ${phaseNarrative.body}`}
                >
                  <Text style={styles.phaseChangeEmoji}>{phaseNarrative.emoji}</Text>
                  <Text style={styles.phaseChangeTitle}>{phaseNarrative.title}</Text>
                  <Text style={styles.phaseChangeText}>{phaseNarrative.body}</Text>
                </View>
              );
            })()}

            {completionCoda && (
              <View style={[
                styles.completionCodaContainer,
                phase >= 3 && styles.completionCodaContainerDark,
              ]}>
                <Text style={[
                  styles.completionCodaTitle,
                  phase >= 3 && styles.completionCodaTitleDark,
                ]}>
                  {completionCoda.title}
                </Text>
                <Text style={[
                  styles.completionCodaText,
                  phase >= 3 && styles.completionCodaTextDark,
                ]}>
                  {completionCoda.text}
                </Text>
              </View>
            )}

            {/* Performance feedback — phase-aware tone. Suppressed when the
                ritual-echo footer below will speak in the same register. */}
            {showPerformanceFeedback && (
              <Text style={[styles.victoryFeedback, {
                color: phaseTheme.modalSecondaryTextColor,
              }]}>
                {victoryFeedbackLine}
              </Text>
            )}
            </Animated.View>

            {/* Group 2: Ritual echo chain */}
            <Animated.View style={{ opacity: contentOpacity2, transform: [{ translateY: contentTranslateY2 }] }}>
            {/* Ritual Echo — word chain from completed puzzle (all phases) */}
            {echoWords && (
              <View style={[
                styles.ritualEchoContainer,
                phase <= 1 && styles.ritualEchoContainerBright,
                phase >= 4 && styles.ritualEchoContainerDark,
              ]}>
                <Text style={[
                  styles.ritualEchoHeader,
                  phase <= 1 && styles.ritualEchoHeaderBright,
                  phase >= 3 && styles.ritualEchoHeaderDark,
                ]}>
                  {getRitualEchoHeader(phase)}
                </Text>
                {/* The chain descends at Phase 3+ (the "offering" register): a
                    vertical stack of chips with a centered down-arrow between
                    each, instead of the bright horizontal wrap-row. Long
                    finale-length chains (6-7 words) get slightly smaller
                    chips so the column stays readable inside the scroll. */}
                <View style={[
                  styles.ritualEchoChain,
                  phase >= 3 && styles.ritualEchoChainDescending,
                ]}>
                  {echoWords.map((word, i) => (
                    <React.Fragment key={i}>
                      <Text style={[
                        styles.ritualEchoWord,
                        phase <= 1 && styles.ritualEchoWordBright,
                        phase >= 3 && styles.ritualEchoWordDark,
                        phase >= 3 && echoWords.length >= 6 && styles.ritualEchoWordCompact,
                      ]}>
                        {word}
                      </Text>
                      {i < echoWords.length - 1 && (
                        <Text style={[
                          styles.ritualEchoArrow,
                          phase <= 1 && styles.ritualEchoArrowBright,
                          phase >= 3 && styles.ritualEchoArrowDark,
                          phase >= 3 && styles.ritualEchoArrowDescending,
                        ]}>
                          {phase >= 3 ? '\u2193' : '\u2192'}
                        </Text>
                      )}
                    </React.Fragment>
                  ))}
                </View>
                {Boolean(incantationName) && (
                  <Text style={[
                    styles.ritualIncantationName,
                    phase <= 1 && styles.ritualIncantationNameBright,
                    phase >= 3 && styles.ritualIncantationNameDark,
                  ]}>
                    {incantationName}
                  </Text>
                )}
                {echoFooter !== '' && (
                  <Text style={[
                    styles.ritualEchoFooter,
                    phase <= 1 && styles.ritualEchoFooterBright,
                    phase >= 3 && styles.ritualEchoFooterDark,
                  ]}>
                    {echoFooter}
                  </Text>
                )}
              </View>
            )}

            {/* Words Offered — ritual word count (all phases) */}
            {victoryData && victoryData.totalWordsFormed != null && victoryData.totalWordsFormed > 0 && (
              <Text style={[
                styles.wordsOfferedText,
                { color: phaseTheme.modalSecondaryTextColor },
                phase >= 3 && styles.wordsOfferedTextDark,
              ]}>
                {getWordsOfferedText(victoryData.totalWordsFormed, phase)}
              </Text>
            )}

            {/* Community line — a global daily stat, kept quiet and low in the
                hierarchy (stars → amber → chain come first). */}
            {!!socialProofLine && (
              <Text
                style={[styles.socialProofLine, { color: phaseTheme.modalSecondaryTextColor }]}
                accessibilityLabel={socialProofLine}
              >
                {socialProofLine}
              </Text>
            )}

            {/* Full-moon event bonus (daily completions on event days) — shown
                here because the puzzle toast renders UNDER this overlay. */}
            {!!eventBonusLine && (
              <Text
                style={[styles.socialProofLine, { color: phaseTheme.modalSecondaryTextColor }]}
                accessibilityLabel={eventBonusLine}
              >
                {eventBonusLine}
              </Text>
            )}
            </Animated.View>

            {/* Group 3: Amber breakdown + Collect Now */}
            <Animated.View style={{ opacity: contentOpacity3, width: '100%', transform: [{ translateY: contentTranslateY3 }] }}>
            {victoryData && (() => {
              // Prefer the REAL itemization from the economy (amberBreakdown,
              // threaded through recordVictory) — the local AMBER_REWARDS +
              // hardcoded 0.5/0.25 math survives ONLY as a fallback for
              // victories recorded without a breakdown (guard/error paths,
              // legacy autosave-restored data).
              const breakdown = victoryData.amberBreakdown;
              const baseAmber = breakdown
                ? breakdown.base
                : (AMBER_REWARDS[difficulty as keyof typeof AMBER_REWARDS] || 0);
              const starBonus = breakdown
                ? breakdown.starBonus
                : earnedStars >= 3
                ? Math.floor(baseAmber * 0.5)
                : earnedStars === 2
                ? Math.floor(baseAmber * 0.25)
                : 0;
              const patronBonusAmber = breakdown?.patronBonus ?? 0;
              const challengeBonusAmber = victoryData.challengeBonus ?? 0;
              const surpriseBonusAmber = victoryData.surpriseBonus ?? 0;
              const resonanceBonusAmber = breakdown?.resonanceBonus ?? victoryData.resonanceBonus ?? 0;
              const variantBonusAmber = victoryData.variantBonus ?? 0;
              const streakBonusAmber = victoryData.streakBonus ?? 0;
              const firstCompBonus = victoryData.firstCompletionBonus ?? 0;
              const milestoneAmber = victoryData.milestoneBonus ?? 0;
              const streakMilestoneAmber = victoryData.streakMilestoneBonus ?? 0;
              const totalAmber = victoryData.amberEarned ?? 0;
              // The rewarded "double" grants a bonus equal to amberEarned (a true
              // 2x, credited to the balance in App). Reflect it in the displayed
              // total + a breakdown line so the number the player sees AFTER the
              // ad matches the amber they actually received — otherwise it reads
              // as "I watched an ad and got nothing."
              const rewardDoubleBonus = rewardedDoubleClaimed ? totalAmber : 0;
              const displayTotal = totalAmber + rewardDoubleBonus;

              return (
                <>
                <View style={[styles.victoryStats, {
                  backgroundColor: phaseTheme.modalStatBgColor,
                }]}>
                  <View style={styles.bonusBreakdown}>
                    {isEarlyGameVictory ? (
                      <>
                        <Text style={[styles.earlyVictoryLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                          {victoryData.autoCollected ? 'Amber banked instantly' : 'Amber ready from this puzzle'}
                        </Text>
                        <View style={styles.earlyVictoryValueRow}>
                          <Image source={AMBER_ICON} style={styles.amberIconLarge} />
                          <Text style={[styles.earlyVictoryValue, { color: phaseTheme.modalTextColor }]}>
                            {displayTotal}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.bonusRow}>
                          <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>{difficulty}</Text>
                          <View style={styles.amberValueRow}>
                            <Image source={AMBER_ICON} style={styles.amberIcon} />
                            <Text style={[styles.bonusValue, { color: phaseTheme.modalTextColor }]}>{baseAmber}</Text>
                          </View>
                        </View>
                        {starBonus > 0 && (
                          <View style={styles.bonusRow}>
                            <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                              {earnedStars >= 3 ? '3\u2605 Perfect' : '2\u2605 Great'}
                            </Text>
                            <Text style={[styles.bonusValue, { color: earnedStars >= 3 ? accent.gold : accent.silver }]}>+{starBonus}</Text>
                          </View>
                        )}
                        {challengeBonusAmber > 0 && (
                          <View style={styles.bonusRow}>
                            <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                              {victoryData.blind ? 'Blind Offering' : 'Challenge'}
                            </Text>
                            <Text style={[styles.bonusValue, { color: accent.challenge }]}>+{challengeBonusAmber}</Text>
                          </View>
                        )}
                        {surpriseBonusAmber > 0 && (
                          <View style={styles.bonusRow}>
                            <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                              {'✨'} Lucky Find
                            </Text>
                            <Text style={[styles.bonusValue, { color: accent.gold }]}>+{surpriseBonusAmber}</Text>
                          </View>
                        )}
                        {resonanceBonusAmber > 0 && (
                          <View style={styles.bonusRow}>
                            <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                              {getResonanceBonusLabel(phase)}
                            </Text>
                            <Text style={[styles.bonusValue, { color: accent.gold }]}>+{resonanceBonusAmber}</Text>
                          </View>
                        )}
                        {patronBonusAmber > 0 && (
                          <View style={styles.bonusRow}>
                            <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                              {'✦'} Patron
                            </Text>
                            <Text style={[styles.bonusValue, { color: accent.gold }]}>+{patronBonusAmber}</Text>
                          </View>
                        )}
                        {variantBonusAmber > 0 && variant && variant !== 'standard' && (
                          <View style={styles.bonusRow}>
                            <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                              {VARIANT_CONFIGS[variant as keyof typeof VARIANT_CONFIGS]?.title || 'Variant'}
                            </Text>
                            <Text style={[styles.bonusValue, { color: accent.variant }]}>+{variantBonusAmber}</Text>
                          </View>
                        )}
                        {(victoryData.freshVariantBonus ?? 0) > 0 && (
                          <View style={styles.bonusRow}>
                            <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                              {'✨'} Fresh variant
                            </Text>
                            <Text style={[styles.bonusValue, { color: accent.variant }]}>+{victoryData.freshVariantBonus}</Text>
                          </View>
                        )}
                        {streakBonusAmber > 0 && (
                          <View style={styles.bonusRow}>
                            <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                              {'\uD83D\uDD25'} {victoryData.currentStreak}-day Streak
                            </Text>
                            <Text style={[styles.bonusValue, { color: accent.streak }]}>+{streakBonusAmber}</Text>
                          </View>
                        )}
                        {firstCompBonus > 0 && (
                          <View style={styles.bonusRow}>
                            <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                              First {difficulty} Clear
                            </Text>
                            <Text style={[styles.bonusValue, { color: accent.green }]}>+{firstCompBonus}</Text>
                          </View>
                        )}
                        {milestoneAmber > 0 && (
                          <View style={styles.bonusRow}>
                            <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                              {'\uD83C\uDFC6'} Milestone
                            </Text>
                            <Text style={[styles.bonusValue, { color: accent.gold }]}>+{milestoneAmber}</Text>
                          </View>
                        )}
                        {streakMilestoneAmber > 0 && (
                          <View style={styles.bonusRow}>
                            <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                              {'\uD83D\uDD25'} Streak Milestone
                            </Text>
                            <Text style={[styles.bonusValue, { color: accent.streak }]}>+{streakMilestoneAmber}</Text>
                          </View>
                        )}
                      </>
                    )}
                    {/* Doubled line — appears once the rewarded 2x is claimed, so
                        the breakdown visibly sums to the new (doubled) total. */}
                    {rewardDoubleBonus > 0 && (
                      <View style={styles.bonusRow}>
                        <Text style={[styles.bonusLabel, { color: phaseTheme.modalTextColor, fontWeight: '800' }]}>
                          {'✦'} Doubled
                        </Text>
                        <View style={styles.amberValueRow}>
                          <Image source={AMBER_ICON} style={styles.amberIcon} />
                          <Text style={[styles.bonusValue, { color: accent.gold, fontWeight: '900' }]}>+{rewardDoubleBonus}</Text>
                        </View>
                      </View>
                    )}
                    <View style={[styles.bonusDivider, { backgroundColor: phaseTheme.modalDividerColor }]} />
                    {/* Total — the amber earned is second only to the stars in
                        visual weight, so it renders larger than the line items */}
                    <View style={styles.bonusRow}>
                      <Text style={[styles.bonusLabel, { color: phaseTheme.modalTextColor, fontWeight: '800' }]}>Total</Text>
                      <View style={styles.amberValueRow}>
                        <Image source={AMBER_ICON} style={[styles.amberIcon, styles.amberIconTotal]} />
                        <Text style={[styles.bonusValue, { color: phaseTheme.modalTextColor, fontSize: 19, fontWeight: '900' }]}>
                          {displayTotal}
                        </Text>
                      </View>
                    </View>
                    {/* Auto-collect lore: while the house gathers the player's
                        early rewards for them, say WHY the amber arrives on its
                        own (in-world, never a "tutorial" voice). */}
                    {victoryData.autoCollected && (
                      <Text style={[styles.autoCollectCaption, { color: phaseTheme.modalSecondaryTextColor }]}>
                        {getAutoCollectCaption(
                          phase as DialoguePhase,
                          (victoryData.puzzlesSolved ?? 0) >= AUTO_COLLECT_PUZZLE_LIMIT,
                        )}
                      </Text>
                    )}
                    {/* Optional "double the reward". Ad-free players (Patron /
                        Remove-Ads) get it granted instantly with no ad — their
                        perk. Everyone else opts in by watching (the button
                        self-gates on provider/cap). App gates onboarding/early game. */}
                    {rewardedDoubleEnabled && !isOnboarding && onRewardedDouble && (
                      rewardedDoubleClaimed ? (
                        <Text style={[styles.rewardedDoubleConfirm, { color: phaseTheme.modalSecondaryTextColor }]}>
                          {'✓ '}{getRewardedDoubleConfirm(phase as DialoguePhase)}
                        </Text>
                      ) : isAdFreeSync() ? (
                        <TouchableOpacity
                          style={[styles.freeDoubleButton, phase >= 3 ? styles.freeDoubleButtonDark : styles.freeDoubleButtonLight]}
                          onPress={onRewardedDouble}
                          accessibilityRole="button"
                          accessibilityLabel={getRewardedDoubleLabel(phase as DialoguePhase)}
                        >
                          <Text style={[styles.freeDoubleText, phase >= 3 ? styles.freeDoubleTextDark : styles.freeDoubleTextLight]}>
                            {'✦ '}{getRewardedDoubleLabel(phase as DialoguePhase)}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <RewardedAdButton
                          placement="victory_double"
                          phase={phase}
                          label={getRewardedDoubleLabel(phase as DialoguePhase)}
                          onReward={onRewardedDouble}
                          style={styles.rewardedDoubleButton}
                        />
                      )
                    )}
                    {/* Collect Now — compact pill inside amber stats box */}
                    {!isOnboarding && !victoryData.autoCollected && (
                      <>
                      {phaseTransitionPending ? (
                        <Text style={[styles.pitMandatoryText, { color: btn.harvestPill.text }]}>
                          {getPitMandatoryText(phase as DialoguePhase)}
                        </Text>
                      ) : mandatoryHarvest ? (
                        <Text style={[styles.mandatoryHarvestText, { color: btn.harvestPill.text }]}>
                          {getMandatoryHarvestText(phase as DialoguePhase)}
                        </Text>
                      ) : null}
                      <TouchableOpacity
                        onPress={onGoToPit}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={mustVisitPit ? 'Visit the pit to continue' : 'Collect amber in the pit'}
                        accessibilityRole="button"
                        style={[styles.collectNowPill, {
                          backgroundColor: btn.harvestPill.bg,
                          borderColor: btn.harvestPill.border,
                        }]}
                      >
                        <Text style={[styles.collectNowText, { color: btn.harvestPill.text }]}>
                          {phaseTransitionPending
                            ? getPitMandatoryCTA(phase as DialoguePhase)
                            : mandatoryHarvest
                            ? getMandatoryHarvestCTA(phase as DialoguePhase)
                            : `${'\uD83C\uDF3E'} Collect Now  \u203A`}
                        </Text>
                      </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
                </>
              );
            })()}

            </Animated.View>

            {/* Victory receipt slot: the sequential victory-toast queue cycles
                its lines HERE (in-modal, over the overlay) instead of the board
                Toast, which renders under the modal and was invisible. */}
            {!!receiptLine && (
              <Animated.View style={{ opacity: receiptOpacity, width: '100%' }} pointerEvents="none">
                <Text
                  style={[styles.receiptLine, { color: phaseTheme.modalSecondaryTextColor }]}
                  accessibilityLabel={receiptLine ?? undefined}
                >
                  {receiptLine}
                </Text>
              </Animated.View>
            )}

            {/* Group 4: Action buttons — 3D candy style */}
            <Animated.View style={{ opacity: contentOpacity4, width: '100%', transform: [{ translateY: contentTranslateY4 }] }}>
            {isOnboarding ? (
            <View style={styles.victoryButtonRow}>
              {/* Onboarding: single "Continue" button */}
              <TouchableOpacity
                onPress={onOnboardingContinue}
                activeOpacity={0.85}
                accessibilityLabel="Continue"
                accessibilityRole="button"
              >
                <View style={styles.btn3dWrapper}>
                  <View style={[styles.btn3dBody, {
                    backgroundColor: btn.primary.bg,
                    shadowColor: btn.primary.shadow,
                  }]}>
                    <View style={styles.btn3dBevel} />
                    <View style={styles.btn3dGlossy} />
                    <Text style={styles.btn3dPrimaryText}>CONTINUE</Text>
                  </View>
                  <View style={[styles.btn3dEdge, {
                    backgroundColor: btn.primary.edge,
                  }]} />
                </View>
              </TouchableOpacity>
            </View>
            ) : mustVisitPit ? (
            // Pit visit required (phase transition or first-harvest gate): the
            // pit CTA above is the only action — Next Level/Home/Share are hidden.
            null
            ) : (
            <>
            {/* Early wins stay focused: one strong replay CTA. */}
            <TouchableOpacity
              onPress={onNextLevel}
              activeOpacity={0.85}
              accessibilityLabel="Next level"
              accessibilityRole="button"
              style={{ width: '100%' }}
            >
              <View style={[styles.btn3dWrapper, { width: '100%' }]}>
                <View style={[styles.btn3dBody, {
                  backgroundColor: btn.primary.bg,
                  shadowColor: btn.primary.shadow,
                  width: '100%',
                }]}>
                  <View style={styles.btn3dBevel} />
                  <View style={styles.btn3dGlossy} />
                  <Text style={styles.btn3dPrimaryText}>NEXT LEVEL</Text>
                </View>
                <View style={[styles.btn3dEdge, {
                  backgroundColor: btn.primary.edge,
                }]} />
              </View>
            </TouchableOpacity>

            <View style={styles.victoryButtonRowSecondary}>
              {/* Share — uniform secondary */}
              <TouchableOpacity
                onPress={onShare}
                activeOpacity={0.8}
                hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
                accessibilityLabel={shareBonusAvailable
                  ? `Share result, earns ${DAILY_SHARE_BONUS_AMBER} amber for the first share today`
                  : 'Share result'}
                accessibilityRole="button"
                style={{ flex: 1 }}
              >
                <View style={[styles.btnFlat, {
                  backgroundColor: btn.share.bg,
                  borderColor: btn.share.edge,
                }]}>
                  {/* Flex row (not an inline image in Text) \u2014 inline images
                      baseline-align unreliably and wrap onto their own line
                      when tight. The row centers the gem properly. */}
                  <View style={styles.shareBtnRow}>
                    <Image
                      source={SHARE_ICON}
                      style={styles.shareBtnIcon}
                      importantForAccessibility="no"
                      accessibilityElementsHidden
                    />
                    <Text numberOfLines={1} style={[styles.btnFlatUniform, { color: btn.share.text }]}>
                      Share
                    </Text>
                    {shareBonusAvailable && (
                      <>
                        <Image
                          source={AMBER_ICON}
                          style={styles.shareBonusIcon}
                          importantForAccessibility="no"
                          accessibilityElementsHidden
                        />
                        <Text numberOfLines={1} style={[styles.btnFlatUniform, { color: btn.share.text }]}>
                          {`+${DAILY_SHARE_BONUS_AMBER}`}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Home — uniform secondary */}
              <TouchableOpacity
                onPress={onReturnHome}
                activeOpacity={0.8}
                hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
                accessibilityLabel="Return home"
                accessibilityRole="button"
                style={{ flex: 1 }}
              >
                <View style={[styles.btnFlat, {
                  backgroundColor: btn.secondary.bg,
                  borderColor: btn.secondary.edge,
                }]}>
                  <Text style={[styles.btnFlatUniform, { color: btn.secondary.text }]}>{'\uD83C\uDFE0'} Home</Text>
                </View>
              </TouchableOpacity>
            </View>
            </>
            )}
            </Animated.View>
          </Animated.View>
        </ScrollView>

        {/* Tap-anywhere-to-skip layer — only mounted while the entrance
            choreography runs, so completed modals pass touches straight
            through to the action buttons. */}
        {!entranceComplete && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleSkipEntrance}
            accessibilityRole="button"
            accessibilityLabel="Skip celebration animation"
          />
        )}
      </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(76, 29, 149, 0.7)',
    zIndex: 500,
  },
  modalShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  victoryScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },

  // === Compact result strip (Swift Victories, routine wins) ===
  compactWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  compactCard: {
    borderRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 18,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    borderWidth: 1.5,
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
    overflow: 'hidden',
  },
  compactStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactStarImage: {
    width: 34,
    height: 34,
    marginHorizontal: 3,
  },
  compactTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 2,
    textAlign: 'center',
  },
  compactFlawless: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 2,
  },
  compactWeaveProgress: {
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  compactWeaveObjective: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: 10.5,
    lineHeight: 14,
    textAlign: 'center',
  },
  compactAmberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 14,
  },
  compactAmberText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 22,
    fontWeight: '900',
  },
  victoryModal: {
    backgroundColor: CandyColors.white,
    borderRadius: 32,
    paddingTop: 28,
    paddingHorizontal: 16,
    paddingBottom: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
    overflow: 'hidden',
  },
  victoryGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    height: 200,
    opacity: 0.3,
    borderRadius: 100,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  victoryStarEmpty: {
    opacity: 0.3,
  },
  // The stars are the emotional centerpiece — rendered large (the source PNGs
  // are generated at high resolution). 2×56 + 76 + margins ≈ 218dp, well
  // within the modal's ~280dp content width at a 360dp viewport.
  victoryStarImage: {
    width: 56,
    height: 56,
    marginHorizontal: 5,
  },
  victoryStarImageBig: {
    width: 76,
    height: 76,
    marginBottom: 6,
  },
  streakMilestoneHint: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  earlyVictoryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  amberIconLarge: {
    width: 26,
    height: 26,
  },
  amberValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amberIcon: {
    width: 15,
    height: 15,
  },
  amberIconTotal: {
    width: 19,
    height: 19,
  },
  victoryTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 42,
    fontWeight: '900',
    marginBottom: 6,
    textShadowColor: CandyColors.pink.shadow,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
    textAlign: 'center',
  },
  victorySubtitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 16,
    fontWeight: '700',
    color: CandyColors.gray[500],
    marginBottom: 4,
  },
  flawlessBadge: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  flawlessBadgeText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  weaveProgress: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 2,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  weaveProgressTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  weaveProgressRank: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 2,
  },
  weaveProgressLine: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 3,
  },
  socialProofLine: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 12.5,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 12,
    // No opacity fade — the phase secondary text color is already AA-tuned;
    // dimming it below 4.5:1 was the old readability bug.
  },
  receiptLine: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 6,
    paddingHorizontal: 12,
  },
  rewardedDoubleButton: {
    marginTop: 10,
  },
  rewardedDoubleConfirm: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  freeDoubleButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  freeDoubleButtonLight: {
    backgroundColor: 'rgba(255, 201, 77, 0.16)',
    borderColor: 'rgba(255, 201, 77, 0.45)',
  },
  freeDoubleButtonDark: {
    backgroundColor: 'rgba(150, 90, 60, 0.18)',
    borderColor: 'rgba(180, 110, 70, 0.4)',
  },
  freeDoubleText: { fontFamily: PIXEL_FONT_BOLD, fontSize: 13.5, fontWeight: '800' },
  // Deep antique gold — 5.8:1 on the pale gold pill over light stat cards
  // (the old #FFD479 measured ~1.3:1, gold-on-cream)
  freeDoubleTextLight: { color: '#755A00' },
  freeDoubleTextDark: { color: '#E0B080' }, // 7.3:1 on the dark pill
  victoryFeedback: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  victoryStats: {
    alignItems: 'stretch',
    backgroundColor: CandyColors.gray[50],
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
    width: '100%',
  },
  bonusBreakdown: {
    gap: 4,
  },
  earlyVictoryLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  earlyVictoryValue: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 2,
  },
  bonusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  bonusLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '600',
    color: CandyColors.gray[500],
  },
  bonusValue: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '800',
    color: CandyColors.purple.main,
  },
  bonusDivider: {
    height: 1,
    marginVertical: 6,
  },
  cumulativeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: CandyColors.gray[200],
  },
  cumulativeStatItem: {
    alignItems: 'center',
  },
  cumulativeStatValue: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 18,
    fontWeight: '800',
    color: CandyColors.purple.main,
  },
  cumulativeStatLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 10,
    fontWeight: '600',
    color: CandyColors.gray[400],
    marginTop: 2,
  },

  // === 3D Candy Button System (matches LetterTile bevel/edge treatment) ===
  victoryButtonRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
  },
  victoryButtonRowSecondary: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
    width: '100%',
  },
  btn3dWrapper: {
    alignItems: 'center',
  },
  btn3dBody: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  btn3dBodyNarrow: {
    paddingHorizontal: 18,
  },
  btn3dBevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  btn3dGlossy: {
    position: 'absolute',
    top: 3,
    left: 8,
    right: 8,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 5,
  },
  btn3dEdge: {
    width: '90%',
    height: 5,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginTop: -1,
  },
  btn3dEdgeNarrow: {
    width: '88%',
  },
  btn3dPrimaryText: {
    fontFamily: PIXEL_FONT_BOLD,
    color: CandyColors.white,
    // 19px/900 qualifies as WCAG large text (3:1 threshold — white on the
    // candy-pink body is 3.5:1) and gives the primary CTA its visual rank.
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  btn3dSecondaryText: {
    fontFamily: PIXEL_FONT_BOLD,
    color: CandyColors.white,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Pit phase transition hint
  pitHintText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 12,
  },

  // Mandatory pit text (shown when phase transition pending)
  pitMandatoryText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 2,
    paddingHorizontal: 16,
  },

  // One-time first-harvest gate dialogue — a touch larger than pitMandatoryText
  // because it's a first-time teaching beat that reads as Fox/house speaking.
  mandatoryHarvestText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13.5,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 10,
  },

  // Lore caption under the amber total while the pit auto-collects early rewards
  autoCollectCaption: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 11.5,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 8,
    paddingHorizontal: 8,
  },

  // Flat secondary buttons (Share, Home)
  btnFlat: {
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnFlatUniform: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 14,
    fontWeight: '700',
  },
  // Share button content row — keeps "📤 Share" + gem + "+N" on one centered
  // line (the row never wraps; the gem is a sibling, not an inline image).
  shareBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  shareBonusIcon: {
    width: 14,
    height: 14,
  },
  shareBtnIcon: {
    width: 18,
    height: 18,
  },

  // Collect Now pill (inside amber stats box)
  collectNowPill: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'center',
  },
  collectNowText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  // === Harvest info pill ===
  harvestWordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 6,
  },
  harvestWordIcon: {
    fontFamily: BODY_FONT,
    fontSize: 22,
    marginRight: 8,
  },
  harvestWordText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 16,
    fontWeight: '900',
  },
  harvestBonusHint: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },

  // === Other info rows ===
  // Streak chip colors come from getButtonTheme().streakChip — the old fixed
  // orange-on-orange (orange.dark on orange.light) measured 1.6:1.
  winStreakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  winStreakEmoji: {
    fontFamily: BODY_FONT,
    fontSize: 20,
    marginRight: 6,
  },
  winStreakIcon: {
    width: 17,
    height: 17,
    marginRight: 4,
  },
  winStreakText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 14,
    fontWeight: '800',
  },
  milestoneContainer: {
    alignItems: 'center',
    backgroundColor: CandyColors.yellow.light,
    borderWidth: 2,
    borderColor: CandyColors.yellow.main,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  // Phase 3+: the candy-yellow chip would be the last bright-candy artifact
  // on an otherwise near-black sheet. Mirrors phaseChangeContainerDark's
  // deep-tinted-bg + ember/amber-border treatment.
  milestoneContainerDark: {
    backgroundColor: '#2A1608',
    borderColor: 'rgba(234, 136, 40, 0.5)',
  },
  milestoneEmoji: {
    fontFamily: BODY_FONT,
    fontSize: 28,
    marginBottom: 4,
  },
  milestoneMessage: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 16,
    fontWeight: '800',
    // Deep amber-brown — 6.6:1 on the yellow.light chip (yellow.dark was 1.5:1)
    color: '#713F12',
    marginBottom: 2,
  },
  milestoneMessageDark: {
    color: '#FFD9A8', // cream-amber, high contrast on the dark ember chip
  },
  questCompletedContainer: {
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  questBadge: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
    alignItems: 'center',
  },
  questBadgeIcon: {
    fontFamily: BODY_FONT,
    fontSize: 14,
  },
  questBadgeText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '600',
  },
  completionCodaContainer: {
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: CandyColors.blue.light + '45',
    borderWidth: 1,
    borderColor: CandyColors.blue.main + '60',
  },
  completionCodaContainerDark: {
    backgroundColor: 'rgba(120, 38, 52, 0.24)',
    borderColor: 'rgba(194, 76, 102, 0.5)',
  },
  completionCodaTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 12,
    fontWeight: '900',
    color: CandyColors.blue.dark,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  completionCodaTitleDark: {
    color: '#f1b8c6',
  },
  completionCodaText: {
    fontFamily: BODY_FONT,
    fontSize: 11,
    lineHeight: 16,
    color: CandyColors.gray[700],
    textAlign: 'center',
  },
  completionCodaTextDark: {
    color: '#f2dde5',
  },
  phaseChangeContainer: {
    backgroundColor: CandyColors.purple.dark,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: CandyColors.purple.main,
  },
  phaseChangeEmoji: {
    fontFamily: BODY_FONT,
    fontSize: 32,
    marginBottom: 8,
  },
  phaseChangeTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 16,
    fontWeight: '900',
    color: CandyColors.white,
    marginBottom: 4,
    textAlign: 'center',
  },
  phaseChangeText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)', // 5.1:1 on purple.dark (0.8 was 4.2:1)
    textAlign: 'center',
    lineHeight: 18,
  },
  phaseChangeContainerDark: {
    backgroundColor: '#0F0818',
    borderColor: '#3D1560',
  },

  // Ritual Echo styles (word chain visualization).
  // Base (non-Bright/non-Dark) text styles serve Phase 2's light lavender
  // modal; Bright serves Phase 0-1; Dark serves Phase 3+. All pairs are WCAG
  // AA-checked against their effective container backgrounds.
  ritualEchoContainer: {
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.15)',
  },
  ritualEchoContainerBright: {
    backgroundColor: 'rgba(255, 182, 255, 0.12)',
    borderColor: 'rgba(255, 150, 220, 0.25)',
  },
  ritualEchoContainerDark: {
    backgroundColor: 'rgba(30, 10, 40, 0.9)',
    borderColor: 'rgba(120, 30, 60, 0.4)',
  },
  ritualEchoHeader: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 10,
    fontWeight: '700',
    color: '#655483', // 4.7:1 on the Phase 2 container (gray[400] was 1.8:1)
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  ritualEchoHeaderBright: {
    color: '#C21E63', // 5.3:1 on the bright container (pink.main was 3.3:1)
  },
  ritualEchoHeaderDark: {
    color: '#C8809A', // 4.8:1 on the Phase 3 container (old value was 2.7:1)
  },
  ritualEchoChain: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  // Phase 3+: the chain visibly DESCENDS (the "offering" register) — a
  // vertical stack of chips with a down-arrow between each, instead of the
  // bright horizontal wrap-row.
  ritualEchoChainDescending: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    gap: 2,
  },
  ritualEchoWord: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 15,
    fontWeight: '800',
    color: CandyColors.purple.shadow, // 5.5:1 on the word chip (purple.main was 3.3:1)
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ritualEchoWordBright: {
    color: '#C91E6B', // 4.9:1 on the pink chip (pink.dark was 4.1:1)
    backgroundColor: 'rgba(255, 150, 220, 0.15)',
  },
  ritualEchoWordDark: {
    color: '#C77DBA', // 4.6:1 on the dark chip
    backgroundColor: 'rgba(100, 30, 60, 0.3)',
  },
  // Long finale-length chains (6-7 words) descending in a column need a
  // smaller chip so the whole rite stays legible without dominating the
  // scroll — caps the visual height rather than letting it sprawl.
  ritualEchoWordCompact: {
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ritualEchoArrow: {
    fontFamily: BODY_FONT,
    fontSize: 12,
    color: '#655483',
    marginHorizontal: 2,
  },
  ritualEchoArrowDark: {
    color: CandyColors.gray[400],
  },
  // The descending column reads top-to-bottom, so the arrow's breathing room
  // moves from horizontal to vertical.
  ritualEchoArrowDescending: {
    marginHorizontal: 0,
    marginVertical: 1,
  },
  ritualIncantationName: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
    color: CandyColors.purple.shadow, // 6.3:1 on the Phase 2 container (purple.dark was 4.0:1)
    marginTop: 8,
    textAlign: 'center',
  },
  ritualIncantationNameBright: {
    fontFamily: BODY_FONT_ITALIC,
    color: '#C21E63',
    fontStyle: 'italic',
  },
  ritualIncantationNameDark: {
    color: '#BC80DC', // 4.9:1 on the Phase 3 container (#9B4DCA was 2.5:1 there)
  },
  ritualEchoFooter: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 10,
    fontWeight: '600',
    color: '#655483', // 4.7:1 on the Phase 2 container (gray[400] was 1.8:1)
    marginTop: 6,
    fontStyle: 'italic',
  },
  ritualEchoFooterDark: {
    color: CandyColors.gray[400], // 5.6:1 on the Phase 3+ containers
  },
  wordsOfferedText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  ritualEchoArrowBright: {
    color: '#C21E63',
  },
  ritualEchoFooterBright: {
    color: CandyColors.pink.shadow,
  },
  wordsOfferedTextDark: {
    fontFamily: BODY_FONT_ITALIC,
    color: '#C8809A', // 5.1:1 on the Phase 3 modal (old rgba value was 2.8:1)
    fontStyle: 'italic',
  },
});
