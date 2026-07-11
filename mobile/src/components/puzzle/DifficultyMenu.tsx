import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { CandyColors } from '../../theme/colors';
import { SURFACE, getSurfaceTheme } from '../../theme/surfaces';
import { PanelCard } from '../ui/PanelCard';
import { Difficulty, GameMode } from '../../types';
import { DialoguePhase } from '../../types/homeWorld';
import { PuzzleVariant, VariantSelectorOption, getVariantDescription } from '../../services/puzzleVariety';
import { BODY_FONT, BODY_FONT_ITALIC, PIXEL_FONT_BOLD } from '../../theme/fonts';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// The menu floats at top: 52 inside the stats row, below the puzzle header.
// Reserve that full chrome offset plus a bottom margin so the lower wood edge
// stays on-screen; the ScrollView carries overflow on shorter devices.
const MENU_MAX_HEIGHT = Math.max(400, Math.min(SCREEN_HEIGHT - 204, 900));
// The scroll area must fit ABOVE the frame's ~21dp bottom wood band, or its
// last row is clipped by the panel's overflow:hidden and can't be scrolled
// into view. Reserve the top padding (18) + title (~26) + a bottom clearance
// (28 > the wood band) so the final row always scrolls into clear parchment.
const SCROLL_MAX_HEIGHT = MENU_MAX_HEIGHT - 72;

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
  blindActive?: boolean;
  onToggleBlindMode?: () => void;
  showBlindToggle?: boolean;
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
  blindActive = false,
  onToggleBlindMode,
  showBlindToggle = false,
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
            {isActive && !isSelected && (
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

        {showBlindToggle && !introMode && onToggleBlindMode && (
          <TouchableOpacity
            style={[
              styles.menuRow,
              blindActive && {
                backgroundColor: t.amberText + '14',
                borderColor: t.amberText + '55',
              },
            ]}
            onPress={onToggleBlindMode}
            accessibilityRole="button"
            accessibilityState={{ selected: blindActive }}
            accessibilityLabel={`Blind offering, ${blindActive ? 'on' : 'off'}`}
          >
            <Text style={styles.challengeMenuIcon}>
              {blindActive ? '🌑' : '👁️'}
            </Text>
            <View style={styles.challengeMenuContent}>
              <Text
                style={[
                  styles.menuRowText,
                  { color: blindActive ? t.amberText : t.body },
                ]}
              >
                {phase >= 3 ? 'BLIND OFFERING' : 'BLIND MODE'}
              </Text>
              <Text style={[styles.challengeMenuDesc, { color: t.muted }]}>
                {blindActive ? 'No previews. Trust the words.' : 'Hide previews for a truer test'}
              </Text>
            </View>
          </TouchableOpacity>
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
    maxHeight: MENU_MAX_HEIGHT,
    paddingTop: 14,
    paddingBottom: 26,
    paddingHorizontal: 10,
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
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: SURFACE.sectionLetterSpacing,
    paddingHorizontal: 16,
    paddingBottom: 3,
  },
  scrollArea: {
    maxHeight: SCROLL_MAX_HEIGHT,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: SURFACE.sectionLetterSpacing,
    marginTop: 4,
    marginBottom: 3,
    paddingHorizontal: 6,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 2,
  },
  difficultyRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    marginRight: 10,
  },
  menuRowText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionDivider: {
    height: 1.5,
    borderRadius: 1,
    marginVertical: 4,
    marginHorizontal: 6,
  },
  challengeMenuIcon: {
    fontFamily: BODY_FONT,
    fontSize: 17,
    marginRight: 10,
  },
  challengeMenuContent: {
    flex: 1,
  },
  challengeMenuDesc: {
    fontFamily: BODY_FONT,
    fontSize: 11,
    marginTop: 1,
  },
  variantItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 2,
  },
  variantIcon: {
    fontFamily: BODY_FONT,
    fontSize: 17,
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
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 14,
    fontWeight: '800',
  },
  variantDescription: {
    fontFamily: BODY_FONT,
    fontSize: 12,
    lineHeight: 16,
  },
  variantBadge: {
    fontFamily: PIXEL_FONT_BOLD,
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
    marginTop: 6,
    marginHorizontal: 6,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  variantUnlockHintText: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
