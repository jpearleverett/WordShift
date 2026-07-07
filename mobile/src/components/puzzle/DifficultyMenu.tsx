import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { CandyColors } from '../../theme/colors';
import { SURFACE, getSurfaceTheme } from '../../theme/surfaces';
import { PanelCard } from '../ui/PanelCard';
import { Difficulty, GameMode } from '../../types';
import { DialoguePhase } from '../../types/homeWorld';
import { PuzzleVariant, VariantSelectorOption, getVariantDescription } from '../../services/puzzleVariety';

/** Semantic difficulty ring colors (shared candy identity with the header dot). */
const DIFFICULTY_RING_COLORS: Record<Difficulty, string> = {
  EASY: CandyColors.green.main,
  MEDIUM: CandyColors.yellow.main,
  MEDIUM_PLUS: CandyColors.orange.main,
  HARD: CandyColors.red.main,
};

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
  showChallengeToggle?: boolean;
  introMode?: boolean;
  introHintText?: string;
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
  showChallengeToggle = true,
  introMode = false,
  introHintText,
}) => {
  if (!visible) return null;

  const t = getSurfaceTheme(phase);
  const dark = phase >= 3;
  const title = phase >= 3 ? 'ARRANGEMENT SETUP' : 'PUZZLE SETUP';
  const styleTitle = phase >= 3 ? 'ARRANGEMENT STYLE' : 'PUZZLE STYLE';
  const visibleOptions = variantOptions.filter(option => option.unlocked);
  const coreOptions = visibleOptions.filter(option => option.group === 'core');
  const baseOptions = visibleOptions.filter(option => option.group === 'base');
  const comboOptions: VariantSelectorOption[] = [];
  const hasNonStandardVariants = !introMode && baseOptions.length > 0;

  const activeBadge = dark
    ? { bg: CandyColors.green.dark + '33', text: CandyColors.green.light }
    : { bg: CandyColors.green.light + '2E', text: CandyColors.green.shadow };
  const selectedRowStyle = { backgroundColor: t.secondaryBg, borderColor: t.secondaryBorder };
  const challengeActive = gameMode === 'challenge';

  const panelStyle = StyleSheet.flatten([
    styles.difficultyMenu,
    !hasNonStandardVariants && styles.difficultyMenuCompact,
    { shadowColor: t.screenBg },
  ]) as ViewStyle;

  const renderVariantItem = (option: VariantSelectorOption) => {
    const isSelected = option.variant === currentVariant;
    const isActive = option.variant === activeVariant;
    return (
      <TouchableOpacity
        key={option.variant}
        style={[styles.variantItem, isSelected && selectedRowStyle]}
        onPress={() => onSelectVariant(option.variant)}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${option.config.title}${isSelected ? ', selected' : ''}${isActive ? ', active' : ''}`}
      >
        <Text style={styles.variantIcon}>{option.config.icon}</Text>
        <View style={styles.variantContent}>
          <View style={styles.variantTitleRow}>
            <Text style={[styles.variantTitle, { color: isSelected ? t.title : t.body }]}>
              {option.config.title}
            </Text>
            {isSelected && (
              <Text
                style={[
                  styles.variantBadge,
                  { color: t.primaryText, backgroundColor: t.primaryBg },
                ]}
              >
                SELECTED
              </Text>
            )}
            {isActive && (
              <Text
                style={[
                  styles.variantBadge,
                  { color: activeBadge.text, backgroundColor: activeBadge.bg },
                ]}
              >
                ACTIVE
              </Text>
            )}
          </View>
          <Text style={[styles.variantDescription, { color: t.muted }]}>
            {getVariantDescription(option.config, phase)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <PanelCard phase={phase} kind="panel" style={panelStyle}>
      <Text style={[styles.menuTitle, { color: t.title }]}>{title}</Text>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: t.muted }]}>DIFFICULTY</Text>
        {(['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'] as Difficulty[]).map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.menuRow, currentDifficulty === d && selectedRowStyle]}
            onPress={() => onSelectDifficulty(d)}
            accessibilityRole="button"
            accessibilityState={{ selected: currentDifficulty === d }}
            accessibilityLabel={`${d === 'MEDIUM_PLUS' ? 'Medium Plus' : d.charAt(0) + d.slice(1).toLowerCase()} difficulty${currentDifficulty === d ? ', selected' : ''}`}
          >
            <View
              style={[styles.difficultyRing, { borderColor: DIFFICULTY_RING_COLORS[d] }]}
            />
            <Text
              style={[
                styles.menuRowText,
                { color: currentDifficulty === d ? t.title : t.body },
              ]}
            >
              {d === 'MEDIUM_PLUS' ? 'MED+' : d}
            </Text>
          </TouchableOpacity>
        ))}

        {introMode && introHintText ? (
          <View
            style={[
              styles.variantUnlockHint,
              { backgroundColor: t.rowBg, borderColor: t.rowBorder },
            ]}
          >
            <Text style={[styles.variantUnlockHintText, { color: t.muted }]}>
              {introHintText}
            </Text>
          </View>
        ) : hasNonStandardVariants ? (
          <>
            <View style={[styles.sectionDivider, { backgroundColor: t.sectionBorder }]} />

            <Text style={[styles.sectionTitle, { color: t.muted }]}>{styleTitle}</Text>
            {coreOptions.map(renderVariantItem)}
            {baseOptions.map(renderVariantItem)}

            {comboOptions.length > 0 && (
              <Text style={[styles.sectionTitle, { color: t.muted }]}>
                COMBINATION STYLES
              </Text>
            )}
            {comboOptions.map(renderVariantItem)}
            {comboOptions.length === 0 && (
              <Text style={[styles.combosComingText, { color: t.muted }]}>
                {phase >= 3
                  ? 'More layered arrangements will reveal themselves.'
                  : 'More combo styles unlock later as you progress.'}
              </Text>
            )}
          </>
        ) : (
          <View
            style={[
              styles.variantUnlockHint,
              { backgroundColor: t.rowBg, borderColor: t.rowBorder },
            ]}
          >
            <Text style={[styles.variantUnlockHintText, { color: t.muted }]}>
              {phase >= 3
                ? 'New arrangements reveal themselves as you progress deeper.'
                : 'New puzzle styles unlock as you solve more puzzles.'}
            </Text>
          </View>
        )}

        {showChallengeToggle && !introMode && (
          <>
            <View style={[styles.sectionDivider, { backgroundColor: t.sectionBorder }]} />

            <TouchableOpacity
              style={[
                styles.menuRow,
                challengeActive && {
                  backgroundColor: t.dangerText + '14',
                  borderColor: t.dangerText + '55',
                },
              ]}
              onPress={onToggleChallengeMode}
              accessibilityRole="button"
              accessibilityState={{ selected: challengeActive }}
              accessibilityLabel={`Challenge mode, ${challengeActive ? 'on' : 'off'}`}
            >
              <Text style={styles.challengeMenuIcon}>
                {challengeActive ? '🔓' : '🔒'}
              </Text>
              <View style={styles.challengeMenuContent}>
                <Text
                  style={[
                    styles.menuRowText,
                    { color: challengeActive ? t.dangerText : t.body },
                  ]}
                >
                  CHALLENGE
                </Text>
                <Text style={[styles.challengeMenuDesc, { color: t.muted }]}>
                  {challengeActive ? '1 undo, no hints, 1.5x amber' : 'Limited undos, +50% amber'}
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </PanelCard>
  );
};

const styles = StyleSheet.create({
  difficultyMenu: {
    position: 'absolute',
    right: 20,
    top: 52,
    width: 290,
    maxHeight: 650,
    paddingTop: 14,
    paddingBottom: 8,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
    zIndex: 200,
  },
  difficultyMenuCompact: {
    width: 210,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: SURFACE.sectionLetterSpacing,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  scrollArea: {
    maxHeight: 610,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: SURFACE.sectionLetterSpacing,
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  combosComingText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  difficultyRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    marginRight: 10,
  },
  menuRowText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionDivider: {
    height: 1.5,
    borderRadius: 1,
    marginVertical: 8,
    marginHorizontal: 6,
  },
  challengeMenuIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  challengeMenuContent: {
    flex: 1,
  },
  challengeMenuDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  variantItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  variantIcon: {
    fontSize: 18,
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
    fontSize: 15,
    fontWeight: '800',
  },
  variantDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  variantBadge: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginLeft: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  variantUnlockHint: {
    marginTop: 8,
    marginHorizontal: 6,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  variantUnlockHintText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
