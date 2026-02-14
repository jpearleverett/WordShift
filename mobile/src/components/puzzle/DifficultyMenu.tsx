import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { CandyColors, getPhaseTheme } from '../../theme/colors';
import { Difficulty, GameMode } from '../../types';
import { DialoguePhase } from '../../types/homeWorld';
import { PuzzleVariant, VariantSelectorOption, getVariantDescription } from '../../services/puzzleVariety';

interface DifficultyMenuProps {
  visible: boolean;
  currentDifficulty: Difficulty;
  gameMode: GameMode;
  currentVariant: PuzzleVariant;
  activeVariant?: PuzzleVariant;
  variantOptions: VariantSelectorOption[];
  phase?: DialoguePhase;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onSelectVariant: (variant: PuzzleVariant) => void;
  onToggleChallengeMode: () => void;
}

export const DifficultyMenu: React.FC<DifficultyMenuProps> = ({
  visible,
  currentDifficulty,
  gameMode,
  currentVariant,
  activeVariant,
  variantOptions,
  phase = 0,
  onSelectDifficulty,
  onSelectVariant,
  onToggleChallengeMode,
}) => {
  if (!visible) return null;

  const phaseTheme = getPhaseTheme(phase);
  const isDark = phase >= 3;
  const title = phase >= 3 ? 'ARRANGEMENT SETUP' : 'PUZZLE SETUP';
  const styleTitle = phase >= 3 ? 'ARRANGEMENT STYLE' : 'PUZZLE STYLE';
  const coreOptions = variantOptions.filter(option => option.group === 'core');
  const baseOptions = variantOptions.filter(option => option.group === 'base');
  const comboOptions = variantOptions.filter(option => option.group === 'combo');

  const renderVariantItem = (option: VariantSelectorOption) => {
    const isSelected = option.variant === currentVariant;
    const isActive = option.variant === activeVariant;
    return (
      <TouchableOpacity
        key={option.variant}
        style={[
          styles.variantItem,
          !option.unlocked && styles.variantItemLocked,
          isSelected && styles.variantItemSelected,
          isSelected && isDark && { backgroundColor: phaseTheme.modalTextColor + '25' },
        ]}
        onPress={() => {
          if (option.unlocked) {
            onSelectVariant(option.variant);
          }
        }}
        disabled={!option.unlocked}
      >
        <Text style={styles.variantIcon}>{option.config.icon}</Text>
        <View style={styles.variantContent}>
          <View style={styles.variantTitleRow}>
            <Text style={[
              styles.variantTitle,
              isDark && { color: phaseTheme.modalTextColor },
            ]}>
              {option.config.title}
            </Text>
            {isSelected && (
              <Text style={styles.variantBadge}>SELECTED</Text>
            )}
            {isActive && (
              <Text style={styles.variantBadgeActive}>ACTIVE</Text>
            )}
            {!option.unlocked && (
              <Text style={styles.variantBadgeLocked}>LOCKED</Text>
            )}
          </View>
          <Text style={[
            styles.variantDescription,
            isDark && { color: phaseTheme.modalSecondaryTextColor },
          ]}>
            {option.unlocked
              ? getVariantDescription(option.config, phase)
              : option.unlockHint}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.difficultyMenu, isDark && {
      backgroundColor: phaseTheme.modalBgColor,
      shadowColor: '#000',
    }]}>
      <Text style={[
        styles.menuTitle,
        isDark && { color: phaseTheme.modalTextColor },
      ]}>
        {title}
      </Text>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <Text style={[
          styles.sectionTitle,
          isDark && { color: phaseTheme.modalSecondaryTextColor },
        ]}>
          DIFFICULTY
        </Text>
        {(['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'] as Difficulty[]).map(d => (
          <TouchableOpacity
            key={d}
            style={[
              styles.difficultyMenuItem,
              currentDifficulty === d && styles.difficultyMenuItemActive,
              currentDifficulty === d && isDark && {
                backgroundColor: phaseTheme.modalTextColor + '20',
              },
            ]}
            onPress={() => onSelectDifficulty(d)}
          >
            <View style={[
              styles.difficultyMenuDot,
              d === 'EASY' && styles.difficultyDotEasy,
              d === 'MEDIUM' && styles.difficultyDotMedium,
              d === 'MEDIUM_PLUS' && styles.difficultyDotMediumPlus,
              d === 'HARD' && styles.difficultyDotHard,
            ]} />
            <Text
              style={[
                styles.difficultyMenuText,
                isDark && { color: phaseTheme.modalSecondaryTextColor },
                currentDifficulty === d && styles.difficultyMenuTextActive,
                currentDifficulty === d && isDark && { color: phaseTheme.modalTextColor },
              ]}
            >
              {d === 'MEDIUM_PLUS' ? 'MED+' : d}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[
            styles.difficultyMenuItem,
            gameMode === 'challenge' && styles.challengeMenuItemActive,
            gameMode === 'challenge' && isDark && {
              backgroundColor: '#601828' + '20',
            },
          ]}
          onPress={onToggleChallengeMode}
        >
          <Text style={styles.challengeMenuIcon}>
            {gameMode === 'challenge' ? '\uD83D\uDD13' : '\uD83D\uDD12'}
          </Text>
          <View style={styles.challengeMenuContent}>
            <Text style={[
              styles.difficultyMenuText,
              isDark && { color: phaseTheme.modalSecondaryTextColor },
              gameMode === 'challenge' && styles.challengeMenuTextActive,
            ]}>
              CHALLENGE
            </Text>
            <Text style={[styles.challengeMenuDesc, isDark && {
              color: phaseTheme.modalSecondaryTextColor,
            }]}>
              {gameMode === 'challenge' ? '1 undo, no hints, 1.5x amber' : 'Limited undos, +50% amber'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.challengeMenuDivider, isDark && {
          backgroundColor: phaseTheme.modalDividerColor,
        }]} />

        <Text style={[
          styles.sectionTitle,
          isDark && { color: phaseTheme.modalSecondaryTextColor },
        ]}>
          {styleTitle}
        </Text>
        {coreOptions.map(renderVariantItem)}
        {baseOptions.map(renderVariantItem)}

        {comboOptions.length > 0 && (
          <Text style={[
            styles.sectionSubtitle,
            isDark && { color: phaseTheme.modalSecondaryTextColor },
          ]}>
            COMBINATION STYLES
          </Text>
        )}
        {comboOptions.map(renderVariantItem)}
        {comboOptions.length === 0 && (
          <Text style={[
            styles.combosComingText,
            isDark && { color: phaseTheme.modalSecondaryTextColor },
          ]}>
            {phase >= 3
              ? 'More layered arrangements will reveal themselves.'
              : 'More combo styles unlock later as you progress.'}
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  difficultyMenu: {
    position: 'absolute',
    right: 20,
    top: 52,
    width: 340,
    maxHeight: 520,
    backgroundColor: CandyColors.white,
    borderRadius: 16,
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 200,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: CandyColors.gray[600],
    letterSpacing: 0.7,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  scrollArea: {
    maxHeight: 490,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: CandyColors.gray[400],
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 6,
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: CandyColors.gray[400],
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 6,
  },
  combosComingText: {
    fontSize: 10,
    color: CandyColors.gray[500],
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 8,
    lineHeight: 14,
  },
  difficultyMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  difficultyMenuItemActive: {
    backgroundColor: CandyColors.purple.light + '30',
  },
  difficultyMenuDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  difficultyDotEasy: {
    backgroundColor: CandyColors.green.main,
  },
  difficultyDotMedium: {
    backgroundColor: CandyColors.yellow.main,
  },
  difficultyDotMediumPlus: {
    backgroundColor: CandyColors.orange.main,
  },
  difficultyDotHard: {
    backgroundColor: CandyColors.red.main,
  },
  difficultyMenuText: {
    fontSize: 13,
    fontWeight: '700',
    color: CandyColors.gray[600],
  },
  difficultyMenuTextActive: {
    color: CandyColors.purple.main,
  },
  challengeMenuDivider: {
    height: 1,
    backgroundColor: CandyColors.gray[200],
    marginVertical: 6,
    marginHorizontal: 8,
  },
  challengeMenuItemActive: {
    backgroundColor: CandyColors.red.main + '15',
  },
  challengeMenuIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  challengeMenuContent: {
    flex: 1,
  },
  challengeMenuTextActive: {
    color: CandyColors.red.main,
  },
  challengeMenuDesc: {
    fontSize: 10,
    color: CandyColors.gray[400],
    marginTop: 1,
  },
  variantItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  variantItemSelected: {
    backgroundColor: CandyColors.purple.light + '24',
  },
  variantItemLocked: {
    opacity: 0.55,
  },
  variantIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  variantContent: {
    flex: 1,
  },
  variantTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  variantTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: CandyColors.gray[700],
  },
  variantDescription: {
    fontSize: 10,
    lineHeight: 14,
    color: CandyColors.gray[500],
  },
  variantBadge: {
    fontSize: 8,
    fontWeight: '900',
    color: CandyColors.purple.main,
    backgroundColor: CandyColors.purple.light + '40',
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  variantBadgeActive: {
    fontSize: 8,
    fontWeight: '900',
    color: CandyColors.green.dark,
    backgroundColor: CandyColors.green.light + '55',
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  variantBadgeLocked: {
    fontSize: 8,
    fontWeight: '900',
    color: CandyColors.gray[500],
    backgroundColor: CandyColors.gray[200],
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
