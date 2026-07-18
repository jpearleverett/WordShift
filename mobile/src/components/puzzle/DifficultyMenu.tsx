import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ViewStyle,
  Modal,
  Pressable,
  Image,
  ImageStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { CandyColors } from '../../theme/colors';
import { SURFACE, getSurfaceTheme } from '../../theme/surfaces';
import { PanelCard } from '../ui/PanelCard';
import { getModeIconSprite } from './modeIcons';
import { Difficulty, GameMode } from '../../types';
import { DialoguePhase } from '../../types/homeWorld';
import {
  PuzzleVariant,
  VariantSelectorOption,
  ComboSelectorOption,
  ComboPreset,
  getVariantDescription,
  getComboDescription,
} from '../../services/puzzleVariety';
import { BODY_FONT, BODY_FONT_ITALIC, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { useScreenInsets } from '../../hooks/useScreenInsets';
import type { UnbrokenWeaveMastery } from '../../services/masteryRecords';

// The bare mode emoji in the variant/combo selector and the challenge/blind/
// weave toggles now render as generated candy sprites (shared with the
// puzzle-screen statsRow badges via modeIcons), falling back to text for any
// unmapped glyph.
const ModeIcon: React.FC<{
  glyph: string;
  textStyle: StyleProp<TextStyle>;
  imageStyle: StyleProp<ImageStyle>;
}> = ({ glyph, textStyle, imageStyle }) => {
  const sprite = getModeIconSprite(glyph);
  return sprite !== null ? (
    <Image source={sprite} style={imageStyle} />
  ) : (
    <Text style={textStyle}>{glyph}</Text>
  );
};

// STRUCTURAL LAYOUT CONTRACT (third and final fix for the "menu runs off the
// bottom, unscrollable" device bug). The menu previously rendered as an
// absolutely-positioned child of the puzzle screen's ~50dp-tall statsRow and
// OVERFLOWED it by hundreds of dp. Two arithmetic fixes (window-height math,
// position-measurement refinement) shipped and still failed on device: the
// structure itself is unfixable on Android: touch events are not reliably
// delivered to children rendered outside their parent's bounds (the overflow
// region of the dropdown could not scroll no matter what bound it carried),
// and edge-to-edge inset quirks poisoned every height computation. The menu
// now renders inside a transparent full-window Modal: the OS provides the
// bounds (top+bottom padded flex container -> definite height, panel capped
// at maxHeight '100%'), the whole window is a native touch surface, Android
// back closes it, and tapping outside dismisses. There is no measurement and
// no window arithmetic left to be wrong. Do NOT move this back inline.
//
// Fallback panel top offset below the top inset, matching the old visual anchor
// (header block + statsRow chrome + the 52dp drop below the setup chip). Used
// only when App can't supply a measured `anchorTop` (see that prop). This was a
// hair too low on device — the panel floated far below the chip — so App now
// measures the chip's real window bottom and passes it as `anchorTop`; the
// bounds stay Modal-owned, so a stale measurement is cosmetic, never a soft-lock.
const MENU_ANCHOR_BELOW_INSET = 171;
// Breathing room kept between the panel's bottom edge and the safe area.
const MENU_BOTTOM_MARGIN = 12;
// Bottom padding inside the scroll content so the last row (BLIND / weave)
// always settles onto clear parchment above the frame's wood band.
const SCROLL_BOTTOM_PAD = 28;

/** Semantic difficulty ring colors (shared candy identity with the header dot). */
const DIFFICULTY_RING_COLORS: Record<Difficulty, string> = {
  EASY: CandyColors.green.main,
  MEDIUM: CandyColors.yellow.main,
  MEDIUM_PLUS: CandyColors.orange.main,
  HARD: CandyColors.red.main,
};

/** Canonical difficulty order — the setup rows and the header chip share it. */
export const DIFFICULTY_LEVELS: readonly Difficulty[] = ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'];

/** True only for the four real Difficulty union values. */
export function isValidDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTY_LEVELS as readonly string[]).includes(value);
}

/**
 * Coerce any value into a real Difficulty. Live state should always be in the
 * union, but a legacy/corrupt autosave restored wholesale can leave the hook's
 * difficulty (and the retained preference) outside it — MEDIUM matches the
 * hook's own default preference, so the fallback is the same board the hook
 * would have served on a fresh install.
 */
export function normalizeDifficulty(value: unknown): Difficulty {
  return isValidDifficulty(value) ? value : 'MEDIUM';
}

/**
 * Header setup-chip label. NEVER empty: an out-of-union value used to render
 * a blank pill (Text renders nothing for undefined and the colored dot matched
 * no case) — the chip must always name a real difficulty.
 */
export function getDifficultyChipLabel(value: unknown): string {
  const difficulty = normalizeDifficulty(value);
  return difficulty === 'MEDIUM_PLUS' ? 'MED+' : difficulty;
}

interface DifficultyMenuProps {
  visible: boolean;
  /** Dismiss the menu: backdrop tap and the Android back button both route
   *  here (the setup chip toggle remains the explicit open/close control). */
  onClose?: () => void;
  /** Measured window-Y (dp) where the panel's top edge should sit, so it hangs
   *  just under the setup chip that opened it. App measures the chip on open;
   *  when absent (or 0), the static MENU_ANCHOR_BELOW_INSET fallback is used. */
  anchorTop?: number | null;
  currentDifficulty: Difficulty;
  gameMode: GameMode;
  currentVariant: PuzzleVariant;
  activeVariant?: PuzzleVariant;
  variantOptions: VariantSelectorOption[];
  comboOptions?: ComboSelectorOption[];
  phase?: DialoguePhase;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onSelectVariant: (variant: PuzzleVariant) => void;
  onSelectCombo?: (preset: ComboPreset) => void;
  onToggleChallengeMode: () => void;
  showChallengeToggle?: boolean;
  blindActive?: boolean;
  onToggleBlindMode?: () => void;
  showBlindToggle?: boolean;
  /** Blind toggle visible but not yet earned: render a teased locked row. */
  blindLocked?: boolean;
  blindUnlockHint?: string;
  unbrokenWeaveActive?: boolean;
  onToggleUnbrokenWeave?: () => void;
  showUnbrokenWeave?: boolean;
  unbrokenWeaveMastery?: UnbrokenWeaveMastery | null;
  introMode?: boolean;
  introHintText?: string;
}

export const DifficultyMenu: React.FC<DifficultyMenuProps> = ({
  visible,
  onClose,
  anchorTop,
  currentDifficulty,
  gameMode,
  currentVariant,
  activeVariant,
  variantOptions,
  comboOptions = [],
  phase = 0,
  onSelectDifficulty,
  onSelectVariant,
  onSelectCombo,
  onToggleChallengeMode,
  showChallengeToggle = true,
  blindActive = false,
  onToggleBlindMode,
  showBlindToggle = false,
  blindLocked = false,
  blindUnlockHint,
  unbrokenWeaveActive = false,
  onToggleUnbrokenWeave,
  showUnbrokenWeave = false,
  unbrokenWeaveMastery = null,
  introMode = false,
  introHintText,
}) => {
  // Hooks must run on every render (before the visibility early-return).
  const screenInsets = useScreenInsets();
  if (!visible) return null;

  const t = getSurfaceTheme(phase);
  const dark = phase >= 3;
  const title = phase >= 3 ? 'ARRANGEMENT SETUP' : 'PUZZLE SETUP';
  const styleTitle = phase >= 3 ? 'ARRANGEMENT STYLE' : 'PUZZLE STYLE';
  // Locked options render as visibly locked rows (teased, non-selectable) so
  // the next mechanical goal is always on screen.
  const coreOptions = variantOptions.filter(option => option.group === 'core');
  const baseOptions = variantOptions.filter(option => option.group === 'base');
  const comboRows = onSelectCombo ? comboOptions : [];
  const hasNonStandardVariants = !introMode && baseOptions.length > 0;

  const activeBadge = dark
    ? { bg: CandyColors.green.dark + '33', text: CandyColors.green.light }
    : { bg: CandyColors.green.light + '2E', text: CandyColors.green.shadow };
  const selectedRowStyle = { backgroundColor: t.secondaryBg, borderColor: t.secondaryBorder };
  // Trial-ladder rungs are mutually exclusive: the CHALLENGE row lights only
  // for challenge-without-blind (Blind Offering runs under gameMode
  // 'challenge' too, but its own row carries that state). While blind is on,
  // the CHALLENGE row renders as folded-in rather than deselected — plain
  // deselection read as a broken toggle, when in truth blind absorbs the
  // challenge rung. Tapping the folded row still switches to plain Challenge.
  const challengeActive = gameMode === 'challenge' && !blindActive;
  const challengeIncluded = blindActive;
  const blindName = phase >= 3 ? 'the Blind Offering' : 'Blind Mode';

  // maxHeight '100%' is DEFINITE here: the panel's parent is the Modal's
  // top/bottom-padded flex container, whose height the OS provides. A short
  // menu keeps its natural height; a tall one caps and its ScrollView
  // (flexShrink) takes the remainder and scrolls.
  const panelStyle = StyleSheet.flatten([
    styles.difficultyMenu,
    !hasNonStandardVariants && styles.difficultyMenuCompact,
    { shadowColor: t.screenBg, maxHeight: '100%' as const },
  ]) as ViewStyle;

  /**
   * Shared row body for variant and combo entries. Locked rows are dimmed,
   * carry a lock glyph, swap their description for the unlock tease, and are
   * disabled (never information by color alone: glyph + "locked" label + tease
   * all carry the state).
   */
  const renderStyleRow = (params: {
    key: string;
    icon: string;
    title: string;
    description: string;
    locked: boolean;
    unlockHint: string;
    isSelected: boolean;
    isActive: boolean;
    onPress: () => void;
  }) => {
    const { key, icon, title, description, locked, unlockHint, isSelected, isActive, onPress } = params;
    return (
      <TouchableOpacity
        key={key}
        style={[styles.variantItem, isSelected && selectedRowStyle, locked && styles.lockedRow]}
        onPress={onPress}
        disabled={locked}
        accessibilityRole="button"
        accessibilityState={locked ? { disabled: true } : { selected: isSelected }}
        accessibilityLabel={
          locked
            ? `${title}, locked. ${unlockHint}`
            : `${title}${isSelected ? ', selected' : ''}${isActive ? ', active' : ''}`
        }
      >
        <ModeIcon
          glyph={locked ? '🔒' : icon}
          textStyle={styles.variantIcon}
          imageStyle={styles.variantIconImage}
        />
        <View style={styles.variantContent}>
          <View style={styles.variantTitleRow}>
            <Text style={[styles.variantTitle, { color: locked ? t.muted : isSelected ? t.title : t.body }]}>
              {title}
            </Text>
            {!locked && isSelected && (
              <Text
                style={[
                  styles.variantBadge,
                  { color: t.primaryText, backgroundColor: t.primaryBg },
                ]}
              >
                SELECTED
              </Text>
            )}
            {!locked && isActive && !isSelected && (
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
          {locked ? (
            <Text style={[styles.lockedHintText, { color: t.muted }]}>{unlockHint}</Text>
          ) : (
            <Text style={[styles.variantDescription, { color: t.muted }]}>{description}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderVariantItem = (option: VariantSelectorOption) =>
    renderStyleRow({
      key: option.variant,
      icon: option.config.icon,
      title: option.config.title,
      description: getVariantDescription(option.config, phase),
      locked: !option.unlocked,
      unlockHint: option.unlockHint,
      isSelected: option.unlocked && option.variant === currentVariant,
      isActive: option.unlocked && option.variant === activeVariant,
      onPress: () => onSelectVariant(option.variant),
    });

  const renderComboItem = (option: ComboSelectorOption) => {
    const { preset } = option;
    // A combo is "selected" when its variant is the chosen one AND its trial
    // rung matches the toggles (blind presets run under gameMode 'challenge'
    // with blindMode on; challenge presets require blind off).
    const rungMatches = preset.blind
      ? blindActive
      : gameMode === 'challenge' && !blindActive;
    return renderStyleRow({
      key: preset.id,
      icon: preset.icon,
      title: preset.title,
      description: getComboDescription(preset, phase),
      locked: !option.unlocked,
      unlockHint: option.unlockHint,
      isSelected: option.unlocked && preset.variant === currentVariant && rungMatches,
      isActive: option.unlocked && preset.variant === activeVariant && rungMatches,
      onPress: () => onSelectCombo?.(preset),
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop: tap anywhere outside the panel to dismiss (also gives the
          menu the whole window as a native touch surface — see the layout
          contract comment at the top of this file). */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel="Close puzzle setup"
        accessibilityRole="button"
      />
      <View
        pointerEvents="box-none"
        style={[
          styles.menuLayer,
          {
            paddingTop:
              anchorTop && anchorTop > 0
                ? anchorTop
                : screenInsets.top + MENU_ANCHOR_BELOW_INSET,
            paddingBottom: screenInsets.bottom + MENU_BOTTOM_MARGIN,
          },
        ]}
      >
    <PanelCard phase={phase} kind="panel" style={panelStyle}>
      <Text style={[styles.menuTitle, { color: t.title }]}>{title}</Text>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={[styles.sectionTitle, { color: t.muted }]}>DIFFICULTY</Text>
        {DIFFICULTY_LEVELS.map(d => (
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

            {comboRows.length > 0 && (
              <Text style={[styles.sectionTitle, { color: t.muted }]}>
                COMBINATION STYLES
              </Text>
            )}
            {comboRows.map(renderComboItem)}
            {comboRows.length === 0 && (
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
                // Folded into blind: share the blind row's amber tint so the
                // two rows read as one selected rung, never as deselected.
                challengeIncluded && {
                  backgroundColor: t.amberText + '14',
                  borderColor: t.amberText + '55',
                },
              ]}
              onPress={onToggleChallengeMode}
              accessibilityRole="button"
              accessibilityState={{ selected: challengeActive || challengeIncluded }}
              accessibilityLabel={
                challengeIncluded
                  ? `Challenge mode, folded into ${blindName}. Tap to switch to Challenge on its own.`
                  : `Challenge mode, ${challengeActive ? 'on' : 'off'}`
              }
            >
              <ModeIcon
                glyph={challengeIncluded ? '🌑' : challengeActive ? '🔓' : '🔒'}
                textStyle={styles.challengeMenuIcon}
                imageStyle={styles.challengeMenuIconImage}
              />
              <View style={styles.challengeMenuContent}>
                <Text
                  style={[
                    styles.menuRowText,
                    {
                      color: challengeIncluded
                        ? t.amberText
                        : challengeActive
                          ? t.dangerText
                          : t.body,
                    },
                  ]}
                >
                  CHALLENGE
                </Text>
                <Text style={[styles.challengeMenuDesc, { color: t.muted }]}>
                  {challengeIncluded
                    ? phase >= 3
                      ? 'Folded into the Blind Offering.'
                      : 'Folded into Blind Mode.'
                    : challengeActive
                      ? 'No hints, limited undos, 1.25x amber'
                      : 'No hints, limited undos, +25% amber'}
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Blind toggle pre-gate: a visible locked row with the tease (the apex
            rung stays on screen as a goal). If a restored board somehow has
            blind active while locked, the live toggle renders instead so the
            player can always turn it off. */}
        {showBlindToggle && !introMode && blindLocked && !blindActive && (
          <TouchableOpacity
            style={[styles.menuRow, styles.lockedRow]}
            disabled
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityLabel={`${phase >= 3 ? 'Blind offering' : 'Blind mode'}, locked. ${blindUnlockHint || ''}`}
          >
            <ModeIcon
              glyph={'🔒'}
              textStyle={styles.challengeMenuIcon}
              imageStyle={styles.challengeMenuIconImage}
            />
            <View style={styles.challengeMenuContent}>
              <Text style={[styles.menuRowText, { color: t.muted }]}>
                {phase >= 3 ? 'BLIND OFFERING' : 'BLIND MODE'}
              </Text>
              {blindUnlockHint ? (
                <Text style={[styles.lockedHintText, { color: t.muted }]}>
                  {blindUnlockHint}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}

        {showBlindToggle && !introMode && (!blindLocked || blindActive) && onToggleBlindMode && (
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
            <ModeIcon
              glyph={blindActive ? '🌑' : '👁️'}
              textStyle={styles.challengeMenuIcon}
              imageStyle={styles.challengeMenuIconImage}
            />
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
                {blindActive
                  ? 'No hints, no previews, free shifts. Judged once, at the end. 2x amber.'
                  : 'No hints, no previews, free shifts, judged only at the end, 2x amber'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {showUnbrokenWeave && phase === 5 && !introMode && onToggleUnbrokenWeave && (
          <TouchableOpacity
            style={[
              styles.menuRow,
              unbrokenWeaveActive && {
                backgroundColor: t.amberText + '14',
                borderColor: t.amberText + '55',
              },
            ]}
            onPress={onToggleUnbrokenWeave}
            accessibilityRole="button"
            accessibilityState={{ selected: unbrokenWeaveActive }}
            accessibilityLabel={`Unbroken Weave, ${unbrokenWeaveActive ? 'on' : 'off'}. Each letter may cross the chain only once.`}
          >
            <ModeIcon
              glyph={'🧵'}
              textStyle={styles.challengeMenuIcon}
              imageStyle={styles.challengeMenuIconImage}
            />
            <View style={styles.challengeMenuContent}>
              <Text
                style={[
                  styles.menuRowText,
                  { color: unbrokenWeaveActive ? t.amberText : t.body },
                ]}
              >
                UNBROKEN WEAVE
              </Text>
              <Text style={[styles.challengeMenuDesc, { color: t.muted }]}>
                Each letter may cross the chain only once.
              </Text>
              {unbrokenWeaveMastery && (
                <>
                  <Text style={[styles.weaveMasteryTitle, { color: t.amberText }]}>
                    Rank {unbrokenWeaveMastery.rank}: {unbrokenWeaveMastery.title}
                  </Text>
                  {unbrokenWeaveMastery.nextObjective && (
                    <Text style={[styles.weaveMasteryObjective, { color: t.muted }]}>
                      {unbrokenWeaveMastery.nextObjective}
                    </Text>
                  )}
                </>
              )}
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </PanelCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Full-window layer inside the transparent Modal. Its top/bottom paddings
  // (applied inline with the live insets) give the panel's parent a DEFINITE
  // height, so the panel's maxHeight '100%' is a hard OS-provided bound —
  // no measurement, no window arithmetic. box-none so only the panel itself
  // eats touches; everything else falls through to the dismiss backdrop.
  menuLayer: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  difficultyMenu: {
    width: 290,
    // maxHeight '100%' is applied inline (definite inside the padded layer).
    // Must clear the cottage panel frame's 24dp top wood band, or the title
    // sits inside the wood and reads as clipped against the top edge.
    paddingTop: 30,
    paddingBottom: 26,
    paddingHorizontal: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
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
  // The option list SHRINKS to fit inside the '100%'-capped panel (then
  // scrolls); flexGrow: 0 keeps a short list at its natural height.
  scrollArea: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingBottom: SCROLL_BOTTOM_PAD,
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
  combosComingText: {
    fontFamily: BODY_FONT,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    marginBottom: 4,
    paddingHorizontal: 8,
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
  challengeMenuIconImage: {
    width: 26,
    height: 26,
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
  weaveMasteryTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  weaveMasteryObjective: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: 10.5,
    lineHeight: 14,
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
  variantIconImage: {
    width: 27,
    height: 27,
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
  lockedRow: {
    opacity: 0.62,
  },
  lockedHintText: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
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
