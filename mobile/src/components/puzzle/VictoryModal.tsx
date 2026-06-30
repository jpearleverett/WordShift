import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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
  getNextStreakMilestoneText,
} from '../../services/phaseNarrative';
import { DialoguePhase } from '../../types/homeWorld';
import { VARIANT_CONFIGS } from '../../services/puzzleVariety';
import { AMBER_REWARDS } from '../../constants/gameBalance';
import { hapticSuccess } from '../../services/haptics';
import { isDailyShareBonusAvailable, DAILY_SHARE_BONUS_AMBER } from '../../services/shareResults';
import { getSettingsSync } from '../../services/settings';
import { DailyLeaderboardCard } from '../social/DailyLeaderboardCard';
import { getBeatPercentText, DailyRank } from '../../services/leaderboard';
import { RewardedAdButton } from '../monetization/RewardedAdButton';
import { getRewardedDoubleLabel, getRewardedDoubleConfirm } from '../../services/phaseNarrative';
import { isAdFreeSync } from '../../services/entitlements';

// Candy-styled UI sprite icons (replace emoji for critical info)
const STAR_FILLED = require('../../../assets/ui/star_filled.png');
const STAR_EMPTY = require('../../../assets/ui/star_empty.png');
const AMBER_ICON = require('../../../assets/ui/amber.png');
const FLAME_ICON = require('../../../assets/ui/flame.png');

export interface VictoryData {
  earnedStars: number;
  amberEarned: number;
  streakBonus: number;
  challengeBonus: number;
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
  variantRepeatDecay?: number;
  questsCompleted?: string[];
  harvestedWords?: string[];
  pendingHarvest?: { pendingAmber: number; pendingWords: number; pendingBatches: number };
  autoCollected?: boolean;
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
  /** Quiet, spoiler-safe aggregate social-proof line (null = none / backend off) */
  socialProofLine?: string | null;
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
  // Onboarding mode
  isOnboarding?: boolean;
  onOnboardingContinue?: () => void;
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
  difficulty,
  phase,
  phaseTransitionPending,
  isPlayingDaily,
  dailyRank,
  socialProofLine,
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
  isOnboarding,
  onOnboardingContinue,
  variant,
  gameMode,
}) => {
  const phaseTheme = getPhaseTheme(phase);
  const btn = getButtonTheme(phase);
  const totalPuzzlesCompleted = cumulativeStats?.totalPuzzlesCompleted ?? 0;
  const isEarlyGameVictory = totalPuzzlesCompleted > 0 && totalPuzzlesCompleted <= 5;

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

  // Cascade animation — 4 staggered content groups
  const contentOpacity1 = useRef(new Animated.Value(0)).current;
  const contentOpacity2 = useRef(new Animated.Value(0)).current;
  const contentOpacity3 = useRef(new Animated.Value(0)).current;
  const contentOpacity4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      hapticSuccess();
      if (getSettingsSync().reducedMotion) {
        // Reveal all cascade groups instantly — skip the stagger
        contentOpacity1.setValue(1);
        contentOpacity2.setValue(1);
        contentOpacity3.setValue(1);
        contentOpacity4.setValue(1);
        return;
      }
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
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[styles.modalOverlay, {
      backgroundColor: phaseTheme.modalOverlayColor,
    }]}>
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
            }]}>
              {getVictoryTitle(earnedStars, phase)}
            </Text>
            <Text style={[styles.victorySubtitle, {
              color: phaseTheme.modalSecondaryTextColor,
            }]}>
              {isPlayingDaily ? 'Daily Challenge Complete' : 'Puzzle Complete'}
            </Text>

            {isPlayingDaily && dailyRank && (
              <DailyLeaderboardCard
                rank={dailyRank.rank}
                total={dailyRank.total}
                percentile={dailyRank.percentile}
                beatText={getBeatPercentText(dailyRank.percentile, phase)}
                phase={phase}
              />
            )}

            {!!socialProofLine && (
              <Text
                style={[styles.socialProofLine, { color: phaseTheme.modalSecondaryTextColor }]}
                accessibilityLabel={socialProofLine}
              >
                {socialProofLine}
              </Text>
            )}

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
            {victoryData && victoryData.currentStreak > 1 && (() => {
              const nextMilestoneText = getNextStreakMilestoneText(phase, victoryData.currentStreak);
              return (
                <>
                  <View
                    style={styles.winStreakContainer}
                    accessible
                    accessibilityLabel={`${victoryData.currentStreak} day streak`}
                  >
                    <Image source={FLAME_ICON} style={styles.winStreakIcon} />
                    <Text style={styles.winStreakText}>{victoryData.currentStreak} Day Streak!</Text>
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
                style={styles.milestoneContainer}
                accessible
                accessibilityLabel={`Milestone: ${victoryData.milestoneMessage}`}
              >
                <Text style={styles.milestoneEmoji}>{'\uD83C\uDFC6'}</Text>
                <Text style={styles.milestoneMessage}>{victoryData.milestoneMessage}</Text>
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
              const surpriseBonusAmber = victoryData.surpriseBonus ?? 0;
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
                    {isEarlyGameVictory ? (
                      <>
                        <Text style={[styles.earlyVictoryLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                          {victoryData.autoCollected ? 'Amber banked instantly' : 'Amber ready from this puzzle'}
                        </Text>
                        <View style={styles.earlyVictoryValueRow}>
                          <Image source={AMBER_ICON} style={styles.amberIconLarge} />
                          <Text style={[styles.earlyVictoryValue, { color: phaseTheme.modalTextColor }]}>
                            {totalAmber}
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
                            <Text style={[styles.bonusValue, { color: earnedStars >= 3 ? '#FFD700' : '#C0C0C0' }]}>+{starBonus}</Text>
                          </View>
                        )}
                        {challengeBonusAmber > 0 && (
                          <View style={styles.bonusRow}>
                            <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>Challenge</Text>
                            <Text style={[styles.bonusValue, { color: '#FF6B6B' }]}>+{challengeBonusAmber}</Text>
                          </View>
                        )}
                        {surpriseBonusAmber > 0 && (
                          <View style={styles.bonusRow}>
                            <Text style={[styles.bonusLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
                              {'✨'} Lucky Find
                            </Text>
                            <Text style={[styles.bonusValue, { color: '#FFD700' }]}>+{surpriseBonusAmber}</Text>
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
                      </>
                    )}
                    <View style={[styles.bonusDivider, { backgroundColor: phaseTheme.modalDividerColor }]} />
                    <View style={styles.bonusRow}>
                      <Text style={[styles.bonusLabel, { color: phaseTheme.modalTextColor, fontWeight: '800' }]}>Total</Text>
                      <View style={styles.amberValueRow}>
                        <Image source={AMBER_ICON} style={styles.amberIcon} />
                        <Text style={[styles.bonusValue, { color: phaseTheme.modalTextColor, fontSize: 15, fontWeight: '900' }]}>
                          {totalAmber}
                        </Text>
                      </View>
                    </View>
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
                      {phaseTransitionPending && (
                        <Text style={[styles.pitMandatoryText, { color: btn.harvestPill.text }]}>
                          {getPitMandatoryText(phase as DialoguePhase)}
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={onGoToPit}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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

            {/* Group 4: Action buttons — 3D candy style */}
            <Animated.View style={{ opacity: contentOpacity4, width: '100%' }}>
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
            ) : phaseTransitionPending ? (
            // Phase transition pending: pit CTA is the only action
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
                  <Text style={[styles.btnFlatUniform, { color: btn.secondary.text }]}>
                    {'\uD83D\uDCE4'} Share{shareBonusAvailable ? ` +${DAILY_SHARE_BONUS_AMBER}` : ''}
                    {shareBonusAvailable && (
                      <>
                        {' '}
                        <Image source={AMBER_ICON} style={styles.shareBonusIcon} accessibilityLabel="amber" />
                      </>
                    )}
                  </Text>
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
  victoryStarImage: {
    width: 38,
    height: 38,
    marginHorizontal: 4,
  },
  victoryStarImageBig: {
    width: 52,
    height: 52,
    marginBottom: 4,
  },
  streakMilestoneHint: {
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
  socialProofLine: {
    fontSize: 12.5,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 2,
    opacity: 0.85,
  },
  rewardedDoubleButton: {
    marginTop: 10,
  },
  rewardedDoubleConfirm: {
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
  freeDoubleText: { fontSize: 13.5, fontWeight: '800' },
  freeDoubleTextLight: { color: '#FFD479' },
  freeDoubleTextDark: { color: '#E0B080' },
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
  earlyVictoryLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  earlyVictoryValue: {
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
  shareBonusIcon: {
    width: 12,
    height: 12,
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
  winStreakIcon: {
    width: 17,
    height: 17,
    marginRight: 4,
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
