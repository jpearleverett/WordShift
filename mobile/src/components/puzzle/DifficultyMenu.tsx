import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ViewStyle,
  Dimensions,
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// The menu floats at top: 52 inside the puzzle screen's statsRow, which itself
// sits below the header block (16 top pad + ~59 wordmark + up to ~28 phase
// badge + 8 bottom pad) and the row's own 8 top pad. This is that worst-case
// chrome plus the 52 anchor: the panel's top edge sits ~(insets.top + this)
// below the window top. The usable height is computed per-render from the
// safe-area insets (see menuMaxHeight in the component) — the old
// screen-height-minus-140 budget ignored the header block and the bottom
// inset entirely, so on device the panel ran past the viewport and the last
// rows (BLIND) were clipped beyond reach.
const MENU_ANCHOR_BELOW_INSET = 171;
// Floor so the panel stays usable even on absurdly short windows (the scroll
// area + generous bottom padding keeps every row reachable there) and a cap
// so tablets don't get a monolith.
const MENU_MIN_HEIGHT = 300;
const MENU_HEIGHT_CAP = 900;
// Panel chrome around the scroll area: top padding (30, clearing the top wood
// band) + title (~26) + a bottom clearance (28 > the wood band) so the final
// row always scrolls into clear parchment, never under the frame's
// overflow:hidden.
const MENU_CHROME_HEIGHT = 88;
// Base bottom padding inside the scroll content; the bottom safe-area inset
// is added per-render so the last row (BLIND) always clears gesture bars.
const SCROLL_BOTTOM_PAD = 28;

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
  // The panel is position:absolute below a VARIABLE-height header, so a static
  // estimate of the space above it (MENU_ANCHOR_BELOW_INSET) can run the panel
  // — and its inner ScrollView — off the bottom of the screen on a taller
  // header, leaving the lowest rows (e.g. the Challenge toggle) below the fold
  // and unreachable even at the scroll end. Measure the panel's REAL on-screen
  // top once it lays out and size it to the actual space beneath it.
  const panelWrapRef = useRef<View>(null);
  const [measuredMaxHeight, setMeasuredMaxHeight] = useState<number | null>(null);
  const handlePanelLayout = useCallback(() => {
    const node = panelWrapRef.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((_x, y, _w, _h) => {
      if (typeof y !== 'number' || !Number.isFinite(y) || y <= 0) return;
      const avail = SCREEN_HEIGHT - y - screenInsets.bottom - 12;
      const bounded = Math.max(MENU_MIN_HEIGHT, Math.min(avail, MENU_HEIGHT_CAP));
      setMeasuredMaxHeight(prev => (prev === bounded ? prev : bounded));
    });
  }, [screenInsets.bottom]);
  if (!visible) return null;

  // Bound the panel to the space actually below its anchor. Prefer the measured
  // height (exact, device-independent); fall back to the static estimate for the
  // first frame before measurement lands.
  const estimatedMaxHeight = Math.max(
    MENU_MIN_HEIGHT,
    Math.min(
      SCREEN_HEIGHT - screenInsets.top - MENU_ANCHOR_BELOW_INSET - screenInsets.bottom - 12,
      MENU_HEIGHT_CAP
    )
  );
  const menuMaxHeight = measuredMaxHeight ?? estimatedMaxHeight;
  const scrollMaxHeight = menuMaxHeight - MENU_CHROME_HEIGHT;

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

  const panelStyle = StyleSheet.flatten([
    styles.difficultyMenu,
    !hasNonStandardVariants && styles.difficultyMenuCompact,
    { shadowColor: t.screenBg, maxHeight: menuMaxHeight },
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
    <View ref={panelWrapRef} onLayout={handlePanelLayout} style={styles.difficultyMenuAnchor}>
    <PanelCard phase={phase} kind="panel" style={panelStyle}>
      <Text style={[styles.menuTitle, { color: t.title }]}>{title}</Text>
      <ScrollView
        style={{ maxHeight: scrollMaxHeight }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: SCROLL_BOTTOM_PAD + screenInsets.bottom },
        ]}
      >
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
  );
};

const styles = StyleSheet.create({
  // Positioning wrapper: carries the absolute anchor (below the difficulty
  // button) + a ref so the panel can measure its real on-screen top and size
  // its ScrollView to the space actually beneath it (see handlePanelLayout).
  difficultyMenuAnchor: {
    position: 'absolute',
    right: 20,
    top: 52,
    zIndex: 200,
  },
  difficultyMenu: {
    width: 290,
    // maxHeight is applied inline (menuMaxHeight) — it depends on the live
    // safe-area insets / measured position, so it cannot live in the static
    // stylesheet.
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
