import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
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
} from '../../services/phaseNarrative';
import { DialoguePhase } from '../../types/homeWorld';
import { VARIANT_CONFIGS } from '../../services/puzzleVariety';
import { AMBER_REWARDS } from '../../constants/gameBalance';

export interface VictoryData {
  earnedStars: number;
  amberEarned: number;
  streakBonus: number;
  challengeBonus: number;
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
  variantRepeatDecay?: number;
  questsCompleted?: string[];
  harvestedWords?: string[];
  pendingHarvest?: { pendingAmber: number; pendingWords: number; pendingBatches: number };
}

interface VictoryModalProps {
  visible: boolean;
  earnedStars: number;
  level: number;
  difficulty: string;
  phase: DialoguePhase;
  /** True when a phase transition is waiting to be confirmed in the pit */
  phaseTransitionPending?: boolean;
  isPlayingDaily: boolean;
  victoryData: VictoryData | null;
  completionCoda?: { title: string; text: string } | null;
  cumulativeStats: CumulativeStats | null;
  // Ritual echo data
  completedWords?: string[];
  incantationName?: string | null;
  // Shared values from useVictoryFlow (Reanimated)
  modalScale: SharedValue<number>;
  modalOpacity: SharedValue<number>;
  star1Scale: SharedValue<number>;
  star2Scale: SharedValue<number>;
  star3Scale: SharedValue<number>;
  // Callbacks
  onNextLevel: () => void;
  onReturnHome: () => void;
  onGoToPit: () => void;
  onShare: () => void;
  // Onboarding mode
  isOnboarding?: boolean;
  onOnboardingContinue?: () => void;
  // Tap-to-skip: true while victory animation is running (non-onboarding only)
  isAnimating?: boolean;
  onTapToSkip?: () => void;
  // Bonus breakdown data
  variant?: string;
  gameMode?: string;
}

// Phase-aware 3D button colors — matches LetterTile's phase palette
function getButtonTheme(phase: DialoguePhase) {
  if (phase >= 4) return {
    primary:   { bg: '#7C3AED', edge: '#5B21B6', shadow: '#5B21B6' },
    harvest:   { bg: '#C2410C', edge: '#9A3412', shadow: '#9A3412' },
    secondary: { bg: '#2A2040', edge: '#1A1030', text: '#908098' },
    share:     { bg: '#3A3050', edge: '#2A2040' },
    harvestPill: { bg: 'rgba(194, 65, 12, 0.15)', border: 'rgba(194, 65, 12, 0.3)', text: '#E87040' },
    modalBorder: 'rgba(90, 30, 90, 0.25)',
  };
  if (phase >= 3) return {
    primary:   { bg: '#9333EA', edge: '#7C3AED', shadow: '#7C3AED' },
    harvest:   { bg: '#EA580C', edge: '#C2410C', shadow: '#C2410C' },
    secondary: { bg: '#3A3555', edge: '#2E3040', text: '#A0A0B0' },
    share:     { bg: '#4A4570', edge: '#3A3555' },
    harvestPill: { bg: 'rgba(234, 88, 12, 0.12)', border: 'rgba(234, 88, 12, 0.25)', text: '#E87040' },
    modalBorder: 'rgba(147, 51, 234, 0.2)',
  };
  if (phase >= 2) return {
    primary:   { bg: CandyColors.pink.main, edge: CandyColors.pink.dark, shadow: CandyColors.pink.dark },
    harvest:   { bg: CandyColors.orange.main, edge: CandyColors.orange.dark, shadow: CandyColors.orange.dark },
    secondary: { bg: CandyColors.gray[300], edge: CandyColors.gray[400], text: CandyColors.gray[600] },
    share:     { bg: CandyColors.blue.light, edge: CandyColors.blue.main },
    harvestPill: { bg: 'rgba(249, 115, 22, 0.10)', border: 'rgba(249, 115, 22, 0.2)', text: CandyColors.orange.dark },
    modalBorder: 'rgba(255, 255, 255, 0.3)',
  };
  // Phase 0-1: bright candy
  return {
    primary:   { bg: CandyColors.pink.main, edge: CandyColors.pink.dark, shadow: CandyColors.pink.dark },
    harvest:   { bg: CandyColors.orange.main, edge: CandyColors.orange.dark, shadow: CandyColors.orange.dark },
    secondary: { bg: CandyColors.gray[200], edge: CandyColors.gray[300], text: CandyColors.gray[600] },
    share:     { bg: CandyColors.blue.light, edge: CandyColors.blue.main },
    harvestPill: { bg: 'rgba(249, 115, 22, 0.10)', border: 'rgba(249, 115, 22, 0.2)', text: CandyColors.orange.dark },
    modalBorder: 'rgba(255, 255, 255, 0.4)',
  };
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  visible,
  earnedStars,
  level,
  difficulty,
  phase,
  phaseTransitionPending,
  isPlayingDaily,
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
  isOnboarding,
  onOnboardingContinue,
  isAnimating,
  onTapToSkip,
  variant,
  gameMode,
}) => {
  const phaseTheme = getPhaseTheme(phase);
  const btn = getButtonTheme(phase);

  // Reanimated animated styles for shared values from useVictoryFlow
  const modalAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: modalOpacity.value,
  }));
  const star1AnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: star1Scale.value }],
  }));
  const star2AnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: star2Scale.value }],
  }));
  const star3AnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: star3Scale.value }],
  }));

  // Cascade animation — 4 staggered content groups
  const contentOpacity1 = useRef(new Animated.Value(0)).current;
  const contentOpacity2 = useRef(new Animated.Value(0)).current;
  const contentOpacity3 = useRef(new Animated.Value(0)).current;
  const contentOpacity4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      console.log('[VictoryModal] visible=true', {
        isOnboarding: !!isOnboarding,
        hasOnboardingContinue: !!onOnboardingContinue,
        phase,
        ts: Date.now(),
      });
      // Note: when isOnboarding is true, this component returns the native-Modal
      // path before rendering — the cascade animations below are only used by
      // the non-onboarding path.
      contentOpacity1.setValue(0);
      contentOpacity2.setValue(0);
      contentOpacity3.setValue(0);
      contentOpacity4.setValue(0);
      Animated.stagger(200, [
        Animated.timing(contentOpacity1, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(contentOpacity2, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(contentOpacity3, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(contentOpacity4, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    } else {
      console.log('[VictoryModal] visible=false (hidden)', { isOnboarding: !!isOnboarding, ts: Date.now() });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  // contentOpacity1-4 are stable Animated.Value refs (never reassigned) and
  // isOnboarding does not change while the modal is visible, so [visible] is
  // the only reactive dependency this effect needs.

  // ---------------------------------------------------------------------------
  // Explicit CONTINUE press handler with step-by-step diagnostics.
  // Logs every stage of the press so Termux / Metro output shows exactly
  // which part of the touch chain executes (or fails to execute).
  // ---------------------------------------------------------------------------
  const handleContinuePressIn = useCallback(() => {
    console.log('[VictoryModal] CONTINUE onPressIn', { ts: Date.now() });
  }, []);

  const handleContinuePressOut = useCallback(() => {
    console.log('[VictoryModal] CONTINUE onPressOut', { ts: Date.now() });
  }, []);

  const handleContinuePress = useCallback(() => {
    console.log('[VictoryModal] CONTINUE onPress fired', {
      hasOnboardingContinue: !!onOnboardingContinue,
      isOnboarding: !!isOnboarding,
      ts: Date.now(),
    });
    if (onOnboardingContinue) {
      console.log('[VictoryModal] CONTINUE calling onOnboardingContinue callback');
      onOnboardingContinue();
    } else {
      // Safety fallback: if the onboarding callback is somehow missing,
      // fall back to the normal next-level action so the player is never stuck.
      console.warn('[VictoryModal] CONTINUE: onOnboardingContinue is undefined — falling back to onNextLevel');
      onNextLevel();
    }
  }, [onOnboardingContinue, onNextLevel]);

  if (!visible) return null;

  // ---------------------------------------------------------------------------
  // Onboarding path: native Modal layer for guaranteed touch delivery on Android.
  //
  // Root cause of the tap-not-working bug: VictoryModal's overlay uses
  // StyleSheet.absoluteFillObject + zIndex:500, but on Android Fabric zIndex is
  // a JS/shadow-thread compositor concept only.  The native touch dispatcher
  // routes hits by view elevation/tree-order — the puzzle-screen ScrollView
  // (game area) sits later in the native view tree and intercepts touches even
  // though the overlay renders visually on top.  Multiple prior fixes (static
  // opacity, skipToEnd, pointerEvents="box-none") had no effect because the
  // interception happens entirely at the Android native layer before React
  // Native even sees the event.
  //
  // React Native's <Modal> creates a separate Android Window that is always
  // above the host Activity's window for both rendering AND touch dispatch —
  // the definitive fix regardless of zIndex, Reanimated state, or ScrollView
  // nesting depth.
  //
  // ScrollView is intentionally omitted: onboarding content is minimal (stars +
  // title + one button) and never needs to scroll, eliminating another class of
  // scroll-gesture swallowing.
  // ---------------------------------------------------------------------------
  if (isOnboarding) {
    console.log('[VictoryModal] onboarding native-Modal path rendering', {
      earnedStars,
      hasOnboardingContinue: !!onOnboardingContinue,
      ts: Date.now(),
    });
    return (
      <Modal
        transparent
        animationType="none"
        visible={true}
        statusBarTranslucent
      >
        <View
          style={[styles.onboardingModalOverlay, { backgroundColor: phaseTheme.modalOverlayColor }]}
          pointerEvents="box-none"
        >
          <View
            style={[styles.victoryModal, {
              backgroundColor: phaseTheme.modalBgColor,
              borderColor: btn.modalBorder,
            }]}
            pointerEvents="box-none"
          >
            <View style={[styles.victoryGlow, { backgroundColor: phaseTheme.victoryGlowColor }]} pointerEvents="none" />
            <View style={styles.modalShine} pointerEvents="none" />

            {/* Stars — static, no Reanimated in onboarding path */}
            <View style={styles.starsContainer}>
              <Text style={[styles.victoryStar, earnedStars < 1 && styles.victoryStarEmpty]}>
                {earnedStars >= 1 ? '\u2B50' : '\u2606'}
              </Text>
              <Text style={[styles.victoryStar, styles.victoryStarBig, earnedStars < 2 && styles.victoryStarEmpty]}>
                {earnedStars >= 2 ? '\u2B50' : '\u2606'}
              </Text>
              <Text style={[styles.victoryStar, earnedStars < 3 && styles.victoryStarEmpty]}>
                {earnedStars >= 3 ? '\u2B50' : '\u2606'}
              </Text>
            </View>

            <Text style={[styles.victoryTitle, { color: phaseTheme.victoryTitleColor }]}>
              {getVictoryTitle(earnedStars, phase)}
            </Text>
            <Text style={[styles.victorySubtitle, { color: phaseTheme.modalSecondaryTextColor }]}>
              {`Level ${level} Complete`}
            </Text>

            {/* CONTINUE — Pressable with generous hitSlop for easy tapping */}
            <View style={[styles.victoryButtonRow, { width: '100%', marginTop: 20 }]}>
              <Pressable
                onPressIn={handleContinuePressIn}
                onPressOut={handleContinuePressOut}
                onPress={handleContinuePress}
                accessibilityLabel="Continue"
                accessibilityRole="button"
                hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
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
                  <View style={[styles.btn3dEdge, { backgroundColor: btn.primary.edge }]} />
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    // Non-onboarding path: native Modal for guaranteed touch delivery on Android.
    // The game-area ScrollView (puzzle rows) intercepts native touches before
    // React Native sees them, regardless of zIndex.  A native Modal creates a
    // separate Android Window that sits above the host Activity window for both
    // rendering AND touch dispatch — the same root fix used for the onboarding path.
    <Modal
      transparent
      animationType="none"
      visible={true}
      statusBarTranslucent
    >
      <View style={[styles.regularModalOverlay, {
        backgroundColor: phaseTheme.modalOverlayColor,
      }]}>
        <ScrollView
        contentContainerStyle={styles.victoryScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
          <Reanimated.View
            style={[styles.victoryModal, {
              backgroundColor: phaseTheme.modalBgColor,
              borderColor: btn.modalBorder,
            },
            modalAnimStyle,
            ]}
            pointerEvents="box-none"
          >
            <View style={[styles.victoryGlow, {
              backgroundColor: phaseTheme.victoryGlowColor,
            }]} pointerEvents="none" />
            <View style={styles.modalShine} pointerEvents="none" />

            {/* Stars — choreographed pop-in */}
            <View style={styles.starsContainer}>
              <Reanimated.Text style={[
                styles.victoryStar,
                earnedStars < 1 && styles.victoryStarEmpty,
                star1AnimStyle,
              ]}>
                {earnedStars >= 1 ? '\u2B50' : '\u2606'}
              </Reanimated.Text>
              <Reanimated.Text style={[
                styles.victoryStar,
                styles.victoryStarBig,
                earnedStars < 2 && styles.victoryStarEmpty,
                star2AnimStyle,
              ]}>
                {earnedStars >= 2 ? '\u2B50' : '\u2606'}
              </Reanimated.Text>
              <Reanimated.Text style={[
                styles.victoryStar,
                earnedStars < 3 && styles.victoryStarEmpty,
                star3AnimStyle,
              ]}>
                {earnedStars >= 3 ? '\u2B50' : '\u2606'}
              </Reanimated.Text>
            </View>

            <Text style={[styles.victoryTitle, {
              color: phaseTheme.victoryTitleColor,
            }]}>
              {getVictoryTitle(earnedStars, phase)}
            </Text>
            <Text style={[styles.victorySubtitle, {
              color: phaseTheme.modalSecondaryTextColor,
            }]}>
              {isPlayingDaily ? 'Daily Challenge Complete' : `Level ${level} Complete`}
            </Text>

            {/* Groups 1-3 skipped during onboarding — tutorial shows only stars + title + CONTINUE */}
            {!isOnboarding && (<>
            {/* Group 1: Harvest, bonuses, streak, milestone */}
            <Animated.View style={{ opacity: contentOpacity1 }}>
            {/* Harvested words (queued for the pit) */}
            {victoryData?.harvestedWords && victoryData.harvestedWords.length > 0 && (
              <View style={[styles.harvestWordContainer, {
                backgroundColor: btn.harvestPill.bg,
                borderColor: btn.harvestPill.border,
              }]}>
                <Text style={styles.harvestWordIcon}>{'\uD83C\uDF3E'}</Text>
                <Text style={[styles.harvestWordText, { color: btn.harvestPill.text }]}>
                  {victoryData.harvestedWords.length} {victoryData.harvestedWords.length === 1 ? 'word' : 'words'} {getPitHarvestLabel(phase).toLowerCase()}
                </Text>
              </View>
            )}

            {/* Streak display */}
            {victoryData && victoryData.currentStreak > 1 && (
              <View style={styles.winStreakContainer}>
                <Text style={styles.winStreakEmoji}>{'\uD83D\uDD25'}</Text>
                <Text style={styles.winStreakText}>{victoryData.currentStreak} Day Streak!</Text>
              </View>
            )}

            {/* Milestone bonus */}
            {victoryData && victoryData.milestoneBonus > 0 && Boolean(victoryData.milestoneMessage) && (
              <View style={styles.milestoneContainer}>
                <Text style={styles.milestoneEmoji}>{'\uD83C\uDFC6'}</Text>
                <Text style={styles.milestoneMessage}>{victoryData.milestoneMessage}</Text>
              </View>
            )}

            {/* Quest completion badges */}
            {victoryData?.questsCompleted && victoryData.questsCompleted.length > 0 && (
              <View style={styles.questCompletedContainer}>
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
                <View style={[styles.phaseChangeContainer,
                  victoryData!.newPhase >= 3 && styles.phaseChangeContainerDark,
                ]}>
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

            {/* Performance feedback — phase-aware tone */}
            <Text style={[styles.victoryFeedback, {
              color: phaseTheme.modalSecondaryTextColor,
            }]}>
              {getVictoryFeedback(earnedStars, phase)}
            </Text>
            </Animated.View>

            {/* Group 2: Ritual echo chain */}
            <Animated.View style={{ opacity: contentOpacity2 }}>
            {/* Ritual Echo — word chain from completed puzzle (all phases) */}
            {completedWords && completedWords.length > 0 && (
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
                <View style={styles.ritualEchoChain}>
                  {completedWords.map((word, i) => (
                    <React.Fragment key={i}>
                      <Text style={[
                        styles.ritualEchoWord,
                        phase <= 1 && styles.ritualEchoWordBright,
                        phase >= 3 && styles.ritualEchoWordDark,
                      ]}>
                        {word}
                      </Text>
                      {i < completedWords.length - 1 && (
                        <Text style={[
                          styles.ritualEchoArrow,
                          phase <= 1 && styles.ritualEchoArrowBright,
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
                    phase >= 4 && styles.ritualIncantationNameDark,
                  ]}>
                    {incantationName}
                  </Text>
                )}
                {getRitualEchoFooter(phase, completedWords.length) !== '' && (
                  <Text style={[
                    styles.ritualEchoFooter,
                    phase <= 1 && styles.ritualEchoFooterBright,
                  ]}>
                    {getRitualEchoFooter(phase, completedWords.length)}
                  </Text>
                )}
              </View>
            )}

            {/* Words Offered — ritual word count (all phases) */}
            {victoryData && victoryData.totalWordsFormed != null && victoryData.totalWordsFormed > 0 && (
              <Text style={[
                styles.wordsOfferedText,
                phase >= 3 && styles.wordsOfferedTextDark,
              ]}>
                {getWordsOfferedText(victoryData.totalWordsFormed, phase)}
              </Text>
            )}
            </Animated.View>

            {/* Group 3: Amber breakdown + Collect Now */}
            <Animated.View style={{ opacity: contentOpacity3, width: '100%' }}>
            {victoryData && (() => {
              const baseAmber = AMBER_REWARDS[difficulty as keyof typeof AMBER_REWARDS] || 0;
              const starBonus = earnedStars >= 3
                ? Math.floor(baseAmber * 0.5)
                : earnedStars === 2
                ? Math.floor(baseAmber * 0.25)
                : 0;
              const challengeBonusAmber = victoryData.challengeBonus ?? 0;
              const variantBonusAmber = victoryData.variantBonus ?? 0;
              const streakBonusAmber = victoryData.streakBonus ?? 0;
              const firstCompBonus = victoryData.firstCompletionBonus ?? 0;
              const milestoneAmber = victoryData.milestoneBonus ?? 0;
              const streakMilestoneAmber = victoryData.streakMilestoneBonus ?? 0;
              const totalAmber = victoryData.amberEarned ?? 0;

              return (
                <>
                <View style={[styles.victoryStats, {
                  backgroundColor: phaseTheme.modalStatBgColor,
                }]}>
                  <View style={styles.bonusBreakdown}>
                    <View style={styles.bonusRow}>
                      <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>{difficulty}</Text>
                      <Text style={[styles.bonusValue, { color: phaseTheme.modalTextColor }]}>{'\uD83D\uDC8E'} {baseAmber}</Text>
                    </View>
                    {starBonus > 0 && (
                      <View style={styles.bonusRow}>
                        <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                          {earnedStars >= 3 ? '3\u2605 Perfect' : '2\u2605 Great'}
                        </Text>
                        <Text style={[styles.bonusValue, { color: earnedStars >= 3 ? '#FFD700' : '#C0C0C0' }]}>+{starBonus}</Text>
                      </View>
                    )}
                    {challengeBonusAmber > 0 && (
                      <View style={styles.bonusRow}>
                        <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>Challenge</Text>
                        <Text style={[styles.bonusValue, { color: '#FF6B6B' }]}>+{challengeBonusAmber}</Text>
                      </View>
                    )}
                    {variantBonusAmber > 0 && variant && variant !== 'standard' && (
                      <View style={styles.bonusRow}>
                        <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                          {VARIANT_CONFIGS[variant as keyof typeof VARIANT_CONFIGS]?.title || 'Variant'}
                        </Text>
                        <Text style={[styles.bonusValue, { color: '#B088D0' }]}>+{variantBonusAmber}</Text>
                      </View>
                    )}
                    {streakBonusAmber > 0 && (
                      <View style={styles.bonusRow}>
                        <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                          {'\uD83D\uDD25'} {victoryData.currentStreak}-day Streak
                        </Text>
                        <Text style={[styles.bonusValue, { color: '#FF8C00' }]}>+{streakBonusAmber}</Text>
                      </View>
                    )}
                    {firstCompBonus > 0 && (
                      <View style={styles.bonusRow}>
                        <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                          First {difficulty} Clear
                        </Text>
                        <Text style={[styles.bonusValue, { color: '#50C878' }]}>+{firstCompBonus}</Text>
                      </View>
                    )}
                    {milestoneAmber > 0 && (
                      <View style={styles.bonusRow}>
                        <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                          {'\uD83C\uDFC6'} Milestone
                        </Text>
                        <Text style={[styles.bonusValue, { color: '#FFD700' }]}>+{milestoneAmber}</Text>
                      </View>
                    )}
                    {streakMilestoneAmber > 0 && (
                      <View style={styles.bonusRow}>
                        <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                          {'\uD83D\uDD25'} Streak Milestone
                        </Text>
                        <Text style={[styles.bonusValue, { color: '#FF8C00' }]}>+{streakMilestoneAmber}</Text>
                      </View>
                    )}
                    <View style={[styles.bonusDivider, { backgroundColor: phaseTheme.modalDividerColor }]} />
                    <View style={styles.bonusRow}>
                      <Text style={[styles.bonusLabel, { color: phaseTheme.modalTextColor, fontWeight: '800' }]}>Total</Text>
                      <Text style={[styles.bonusValue, { color: phaseTheme.modalTextColor, fontSize: 15, fontWeight: '900' }]}>
                        {'\uD83D\uDC8E'} {totalAmber}
                      </Text>
                    </View>
                    {/* Collect Now — compact pill inside amber stats box */}
                    {!isOnboarding && (
                      <>
                      {phaseTransitionPending && (
                        <Text style={[styles.pitMandatoryText, { color: btn.harvestPill.text }]}>
                          {getPitMandatoryText(phase as DialoguePhase)}
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={onGoToPit}
                        activeOpacity={0.8}
                        accessibilityLabel={phaseTransitionPending ? 'Visit the pit to continue' : 'Collect amber in the pit'}
                        accessibilityRole="button"
                        style={[styles.collectNowPill, {
                          backgroundColor: btn.harvestPill.bg,
                          borderColor: btn.harvestPill.border,
                        }]}
                      >
                        <Text style={[styles.collectNowText, { color: btn.harvestPill.text }]}>
                          {phaseTransitionPending
                            ? getPitMandatoryCTA(phase as DialoguePhase)
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
            </>)}

            {/* Group 4: Action buttons */}
            <Animated.View style={{ opacity: contentOpacity4, width: '100%' }} pointerEvents="box-none">
            {phaseTransitionPending ? (
            // Phase transition pending: pit CTA is the only action
            null
            ) : (
            <>
            {/* Next Level — full-width primary 3D candy button */}
            <TouchableOpacity
              onPressIn={() => console.log('[VictoryModal] NEXT LEVEL onPressIn', { ts: Date.now() })}
              onPress={() => { console.log('[VictoryModal] NEXT LEVEL onPress', { ts: Date.now() }); onNextLevel(); }}
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
                onPressIn={() => console.log('[VictoryModal] SHARE onPressIn', { ts: Date.now() })}
                onPress={() => { console.log('[VictoryModal] SHARE onPress', { ts: Date.now() }); onShare(); }}
                activeOpacity={0.8}
                accessibilityLabel="Share result"
                accessibilityRole="button"
                style={{ flex: 1 }}
              >
                <View style={[styles.btnFlat, {
                  backgroundColor: btn.share.bg,
                  borderColor: btn.share.edge,
                }]}>
                  <Text style={[styles.btnFlatUniform, { color: btn.secondary.text }]}>{'\uD83D\uDCE4'} Share</Text>
                </View>
              </TouchableOpacity>

              {/* Home — uniform secondary */}
              <TouchableOpacity
                onPressIn={() => console.log('[VictoryModal] HOME onPressIn', { ts: Date.now() })}
                onPress={() => { console.log('[VictoryModal] HOME onPress', { ts: Date.now() }); onReturnHome(); }}
                activeOpacity={0.8}
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
          </Reanimated.View>
        </ScrollView>
        {/* Tap-to-skip overlay — absoluteFill within Modal so any tap during the
            star/reveal animation skips to the end.  Rendered after ScrollView so
            it sits on top of the (still-invisible) card and intercepts taps.
            Removed as soon as the animation finishes (isAnimating becomes false). */}
        {isAnimating && onTapToSkip && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onTapToSkip}
            accessibilityLabel="Tap to skip animation"
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Root view for the non-onboarding native-Modal path.
  // flex:1 fills the Modal window so the card can be centred by the inner ScrollView.
  regularModalOverlay: {
    flex: 1,
  },
  // Full-screen overlay for onboarding native-Modal path.
  // flex:1 fills the Modal window; justifyContent/alignItems center the card.
  onboardingModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
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
    marginBottom: 12,
  },
  victoryStar: {
    fontSize: 36,
    marginHorizontal: 4,
  },
  victoryStarBig: {
    fontSize: 52,
    marginBottom: 4,
  },
  victoryStarEmpty: {
    opacity: 0.3,
  },
  victoryTitle: {
    fontSize: 42,
    fontWeight: '900',
    marginBottom: 6,
    textShadowColor: CandyColors.pink.shadow,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
    textAlign: 'center',
  },
  victorySubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: CandyColors.gray[500],
    marginBottom: 4,
  },
  victoryFeedback: {
    fontSize: 13,
    fontWeight: '600',
    color: CandyColors.gray[400],
    marginBottom: 14,
    textAlign: 'center',
  },
  victoryStats: {
    alignItems: 'stretch',
    backgroundColor: CandyColors.gray[50],
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
    width: '100%',
  },
  bonusBreakdown: {
    gap: 4,
  },
  bonusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  bonusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: CandyColors.gray[500],
  },
  bonusValue: {
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
    fontSize: 18,
    fontWeight: '800',
    color: CandyColors.purple.main,
  },
  cumulativeStatLabel: {
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
    color: CandyColors.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  btn3dSecondaryText: {
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
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 12,
  },

  // Mandatory pit text (shown when phase transition pending)
  pitMandatoryText: {
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 2,
    paddingHorizontal: 16,
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
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  // === Harvest info pill ===
  harvestWordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 6,
  },
  harvestWordIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  harvestWordText: {
    fontSize: 16,
    fontWeight: '900',
  },
  harvestBonusHint: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },

  // === Other info rows ===
  winStreakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CandyColors.orange.light,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
  },
  winStreakEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  winStreakText: {
    fontSize: 14,
    fontWeight: '800',
    color: CandyColors.orange.dark,
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
  milestoneEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  milestoneMessage: {
    fontSize: 16,
    fontWeight: '800',
    color: CandyColors.yellow.dark,
    marginBottom: 2,
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
    fontSize: 14,
  },
  questBadgeText: {
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
    fontSize: 32,
    marginBottom: 8,
  },
  phaseChangeTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: CandyColors.white,
    marginBottom: 4,
    textAlign: 'center',
  },
  phaseChangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 18,
  },
  phaseChangeContainerDark: {
    backgroundColor: '#0F0818',
    borderColor: '#3D1560',
  },

  // Ritual Echo styles (word chain visualization)
  ritualEchoContainer: {
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
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
    fontSize: 10,
    fontWeight: '700',
    color: CandyColors.gray[400],
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  ritualEchoHeaderBright: {
    color: CandyColors.pink.main,
  },
  ritualEchoHeaderDark: {
    color: 'rgba(180, 100, 130, 0.8)',
  },
  ritualEchoChain: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  ritualEchoWord: {
    fontSize: 14,
    fontWeight: '800',
    color: CandyColors.purple.main,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ritualEchoWordBright: {
    color: CandyColors.pink.dark,
    backgroundColor: 'rgba(255, 150, 220, 0.15)',
  },
  ritualEchoWordDark: {
    color: '#C77DBA',
    backgroundColor: 'rgba(100, 30, 60, 0.3)',
  },
  ritualEchoArrow: {
    fontSize: 12,
    color: CandyColors.gray[400],
    marginHorizontal: 2,
  },
  ritualIncantationName: {
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
    color: CandyColors.purple.dark,
    marginTop: 8,
    textAlign: 'center',
  },
  ritualIncantationNameBright: {
    color: CandyColors.pink.main,
    fontStyle: 'italic',
  },
  ritualIncantationNameDark: {
    color: '#9B4DCA',
  },
  ritualEchoFooter: {
    fontSize: 10,
    fontWeight: '600',
    color: CandyColors.gray[400],
    marginTop: 6,
    fontStyle: 'italic',
  },
  wordsOfferedText: {
    fontSize: 11,
    fontWeight: '600',
    color: CandyColors.gray[400],
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  ritualEchoArrowBright: {
    color: CandyColors.pink.main,
  },
  ritualEchoFooterBright: {
    color: CandyColors.pink.shadow,
  },
  wordsOfferedTextDark: {
    color: 'rgba(180, 100, 130, 0.8)',
    fontStyle: 'italic',
  },
});
