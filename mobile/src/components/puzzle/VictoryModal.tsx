import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
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
} from '../../services/phaseNarrative';
import { DialoguePhase } from '../../types/homeWorld';

export interface VictoryData {
  earnedStars: number;
  amberEarned: number;
  streakBonus: number;
  challengeBonus: number;
  milestoneBonus: number;
  milestoneMessage: string | null;
  currentStreak: number;
  phaseChanged: boolean;
  newPhase: number;
  totalWordsFormed?: number;
  ritualEnergy?: number;
  variantBonus?: number;
  variantRepeatDecay?: number;
}

interface VictoryModalProps {
  visible: boolean;
  earnedStars: number;
  level: number;
  difficulty: string;
  amberBalance: number;
  phase: DialoguePhase;
  isPlayingDaily: boolean;
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
  onShare: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  visible,
  earnedStars,
  level,
  difficulty,
  amberBalance,
  phase,
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
  onShare,
}) => {
  const phaseTheme = getPhaseTheme(phase);

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
            transform: [{ scale: modalScale }],
            opacity: modalOpacity,
          }]}>
            <View style={[styles.victoryGlow, {
              backgroundColor: phaseTheme.victoryGlowColor,
            }]} />
            <View style={styles.modalShine} />

            {/* Stars — choreographed pop-in */}
            <View style={styles.starsContainer}>
              <Animated.Text style={[
                styles.victoryStar,
                earnedStars < 1 && styles.victoryStarEmpty,
                { transform: [{ scale: star1Scale }] },
              ]}>
                {earnedStars >= 1 ? '\u2B50' : '\u2606'}
              </Animated.Text>
              <Animated.Text style={[
                styles.victoryStar,
                styles.victoryStarBig,
                earnedStars < 2 && styles.victoryStarEmpty,
                { transform: [{ scale: star2Scale }] },
              ]}>
                {earnedStars >= 2 ? '\u2B50' : '\u2606'}
              </Animated.Text>
              <Animated.Text style={[
                styles.victoryStar,
                earnedStars < 3 && styles.victoryStarEmpty,
                { transform: [{ scale: star3Scale }] },
              ]}>
                {earnedStars >= 3 ? '\u2B50' : '\u2606'}
              </Animated.Text>
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

            {/* Amber earned */}
            {victoryData && (
              <View style={styles.amberEarnedContainer}>
                <Text style={styles.amberEarnedIcon}>{'\uD83D\uDC8E'}</Text>
                <Text style={styles.amberEarnedText}>+{victoryData.amberEarned} Amber</Text>
                {victoryData.streakBonus > 0 && (
                  <Text style={styles.streakBonusText}>
                    (+{victoryData.streakBonus} streak!)
                  </Text>
                )}
                {victoryData.challengeBonus > 0 && (
                  <Text style={styles.challengeBonusText}>
                    (+{victoryData.challengeBonus} challenge!)
                  </Text>
                )}
                {(victoryData.variantBonus ?? 0) > 0 && (
                  <Text style={styles.variantBonusText}>
                    (+{victoryData.variantBonus} style{victoryData.variantRepeatDecay && victoryData.variantRepeatDecay < 1 ? ', tapered' : ''})
                  </Text>
                )}
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
            {victoryData && victoryData.milestoneBonus > 0 && victoryData.milestoneMessage && (
              <View style={styles.milestoneContainer}>
                <Text style={styles.milestoneEmoji}>{'\uD83C\uDFC6'}</Text>
                <Text style={styles.milestoneMessage}>{victoryData.milestoneMessage}</Text>
                <Text style={styles.milestoneBonus}>+{victoryData.milestoneBonus} Bonus Amber!</Text>
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
                {incantationName && (
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

            <View style={[styles.victoryStats, {
              backgroundColor: phaseTheme.modalStatBgColor,
            }]}>
              <View style={styles.victoryStatItem}>
                <Text style={[styles.victoryStatValue, { color: phaseTheme.modalTextColor }]}>Lv.{level}</Text>
                <Text style={[styles.victoryStatLabel, { color: phaseTheme.modalSecondaryTextColor }]}>{difficulty}</Text>
              </View>
              <View style={[styles.victoryStatDivider, { backgroundColor: phaseTheme.modalDividerColor }]} />
              <View style={styles.victoryStatItem}>
                <Text style={[styles.victoryStatValue, { color: phaseTheme.modalTextColor }]}>{'\uD83D\uDC8E'} {amberBalance}</Text>
                <Text style={[styles.victoryStatLabel, { color: phaseTheme.modalSecondaryTextColor }]}>Total Amber</Text>
              </View>
            </View>

            {/* Cumulative stats */}
            {cumulativeStats && (
              <View style={[styles.cumulativeStats, {
                borderTopColor: phaseTheme.modalDividerColor,
              }]}>
                <View style={styles.cumulativeStatItem}>
                  <Text style={[styles.cumulativeStatValue, { color: phaseTheme.modalTextColor }]}>{cumulativeStats.totalStars}</Text>
                  <Text style={[styles.cumulativeStatLabel, { color: phaseTheme.modalSecondaryTextColor }]}>Total Stars</Text>
                </View>
                <View style={styles.cumulativeStatItem}>
                  <Text style={[styles.cumulativeStatValue, { color: phaseTheme.modalTextColor }]}>{cumulativeStats.threeStarCount}</Text>
                  <Text style={[styles.cumulativeStatLabel, { color: phaseTheme.modalSecondaryTextColor }]}>Perfect</Text>
                </View>
                <View style={styles.cumulativeStatItem}>
                  <Text style={[styles.cumulativeStatValue, { color: phaseTheme.modalTextColor }]}>{cumulativeStats.totalPuzzlesCompleted}</Text>
                  <Text style={[styles.cumulativeStatLabel, { color: phaseTheme.modalSecondaryTextColor }]}>Puzzles</Text>
                </View>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.victoryButtonRow}>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={onShare}
                accessibilityLabel="Share result"
                accessibilityRole="button"
              >
                <Text style={styles.shareButtonText}>{'\uD83D\uDCE4'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.homeButton}
                onPress={onReturnHome}
                accessibilityLabel="Return home"
                accessibilityRole="button"
              >
                <Text style={styles.homeButtonText}>{'\uD83C\uDFE0'} HOME</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextLevelButton}
                onPress={onNextLevel}
                accessibilityLabel="Next level"
                accessibilityRole="button"
              >
                <View style={styles.buttonShine} />
                <Text style={styles.nextLevelButtonText}>NEXT LEVEL</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(76, 29, 149, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    padding: 24,
  },
  victoryModal: {
    backgroundColor: CandyColors.white,
    borderRadius: 40,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
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
    marginBottom: 16,
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
    marginBottom: 8,
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
    marginBottom: 16,
    textAlign: 'center',
  },
  victoryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CandyColors.gray[50],
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  victoryStatItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  victoryStatValue: {
    fontSize: 28,
    fontWeight: '900',
    color: CandyColors.purple.main,
  },
  victoryStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: CandyColors.gray[400],
    letterSpacing: 1,
    marginTop: 2,
  },
  victoryStatDivider: {
    width: 2,
    height: 40,
    backgroundColor: CandyColors.gray[200],
    borderRadius: 1,
  },
  cumulativeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
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
  victoryButtonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: CandyColors.blue.light,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  shareButtonText: {
    fontSize: 20,
  },
  homeButton: {
    backgroundColor: CandyColors.gray[200],
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  homeButtonText: {
    color: CandyColors.gray[600],
    fontSize: 16,
    fontWeight: '800',
  },
  nextLevelButton: {
    backgroundColor: CandyColors.pink.main,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 32,
    overflow: 'hidden',
    shadowColor: CandyColors.pink.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  nextLevelButtonText: {
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  buttonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  amberEarnedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CandyColors.yellow.light,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
  },
  amberEarnedIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  amberEarnedText: {
    fontSize: 18,
    fontWeight: '900',
    color: CandyColors.yellow.shadow,
  },
  streakBonusText: {
    fontSize: 12,
    fontWeight: '700',
    color: CandyColors.orange.main,
    marginLeft: 8,
  },
  challengeBonusText: {
    fontSize: 12,
    fontWeight: '700',
    color: CandyColors.pink.main,
    marginLeft: 8,
  },
  variantBonusText: {
    fontSize: 12,
    fontWeight: '700',
    color: CandyColors.blue.dark,
    marginLeft: 8,
  },
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
  milestoneBonus: {
    fontSize: 14,
    fontWeight: '700',
    color: CandyColors.green.dark,
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
