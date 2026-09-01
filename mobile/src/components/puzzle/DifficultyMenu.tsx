import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { CandyColors } from '../../theme/colors';
import { SURFACE, getSurfaceTheme, getModalInSpring } from '../../theme/surfaces';
import { getSettingsSync } from '../../services/settings';
import { PanelCard } from '../ui/PanelCard';
import { getModeIconSprite } from './modeIcons';
import { DIFFICULTY_ART } from './difficultyArt';
import { Difficulty, GameMode } from '../../types';
import { DialoguePhase } from '../../types/homeWorld';
import {
  PuzzleVariant,
  VariantSelectorOption,
  getVariantDescription,
} from '../../services/puzzleVariety';
import { BODY_FONT, BODY_FONT_ITALIC, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { useScreenInsets } from '../../hooks/useScreenInsets';
import type { UnbrokenWeaveMastery } from '../../services/masteryRecords';
import { FONT_SIZE } from '../../theme/typeScale';

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

/**
 * Stack emblem — the "cool visual" for a combined loadout. The individual
 * modifier rows highlight on their own, but a player may not realize they LAYER
 * (onto the chosen style and onto each other). When 2+ layers are live (a
 * non-standard style + any modifiers, or 2+ modifiers), this emblem materializes
 * at the head of the modifier section: the active mode glyphs render as an
 * OVERLAPPING FANNED STACK (literally stacked, like a dealt hand) with a `xN`
 * layer count and a dynamic name, so the combination reads as one built thing.
 * Springs in on mount (reduced-motion pins it), amber-accented like every
 * reward-tier surface. Pure presentational — no state, no side effects.
 */
const StackEmblem: React.FC<{
  glyphs: string[];
  title: string;
  subtitle: string;
  count: number;
  /** Names of the active layers, in menu order — the screen-reader rendering of
   *  the glyph fan (the chips themselves are unlabeled decoration). */
  layerNames: string[];
  t: ReturnType<typeof getSurfaceTheme>;
}> = ({ glyphs, title, subtitle, count, layerNames, t }) => {
  const reduced = getSettingsSync().reducedMotion;
  const scale = useRef(new Animated.Value(reduced ? 1 : 0.86)).current;
  const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    const anim = Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 170, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 170, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [reduced, scale, opacity]);
  return (
    <Animated.View
      accessible
      accessibilityLabel={`${title}. ${count} layers active: ${layerNames.join(', ')}. ${subtitle}`}
      style={[
        styles.stackCard,
        { backgroundColor: t.amberTint, borderColor: t.amberTintBorder, opacity, transform: [{ scale }] },
      ]}
    >
      <View style={styles.stackFan}>
        {glyphs.map((g, i) => (
          <View
            key={`${g}-${i}`}
            style={[
              styles.stackChip,
              {
                backgroundColor: t.cardBg,
                borderColor: t.amberText,
                marginLeft: i === 0 ? 0 : -9,
                zIndex: i + 1,
                transform: [{ rotate: i % 2 === 0 ? '-6deg' : '6deg' }],
              },
            ]}
          >
            <ModeIcon glyph={g} textStyle={styles.stackChipGlyph} imageStyle={styles.stackChipImage} />
          </View>
        ))}
        {/* The count pill is a FILL, so it must use the amber-pill trio
            (pillBg/pillEdge/pillText), not amberText — that token is an INK
            tuned for text ON the parchment, and pairing it with primaryText
            gave 1.5-2.1:1 in every phase but 5 (cream-on-cream at phase 4).
            The pill trio holds >= 4.9:1 across all six skins. */}
        <View style={[styles.stackCountPill, { backgroundColor: t.pillBg, borderColor: t.pillEdge }]}>
          <Text style={[styles.stackCountText, { color: t.pillText }]}>{`×${count}`}</Text>
        </View>
      </View>
      <Text style={[styles.stackTitle, { color: t.amberText }]}>{title}</Text>
      <Text style={[styles.stackSubtitle, { color: t.muted }]}>{subtitle}</Text>
    </Animated.View>
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
// Opacity ramp for the "more below" fade cue — transparent at the top, near
// the parchment fill at the bottom, so the last visible row dissolves rather
// than hard-cutting at the frame edge (the apex Unbroken Weave row sits last).
const SCROLL_FADE_STOPS = [0.0, 0.22, 0.46, 0.72, 0.95];
// Bottom padding inside the scroll content so the last row (LEXICON, or the
// Unbroken Weave once it opens) always settles onto clear parchment above the
// frame's wood band.
const SCROLL_BOTTOM_PAD = 28;

/** Semantic difficulty ring colors (shared candy identity with the header dot). */
/** Canonical difficulty order — the setup rows and the header chip share it.
 * EXPERT (6-letter apex) is last and is gated: it renders as a locked row with
 * a countdown until EXPERT_UNLOCK_PUZZLES solves (see the row rendering). */
export const DIFFICULTY_LEVELS: readonly Difficulty[] = ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD', 'EXPERT'];

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
  phase?: DialoguePhase;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onSelectVariant: (variant: PuzzleVariant) => void;
  onToggleChallengeMode: () => void;
  showChallengeToggle?: boolean;
  /** Undo-limit ("Challenge") constraint active. Decoupled from blind: both can
   *  be on at once (previews hidden AND undos capped). Derived from undoLimited,
   *  not gameMode (which is 'challenge' whenever either constraint is on). */
  undoLimited?: boolean;
  blindActive?: boolean;
  onToggleBlindMode?: () => void;
  showBlindToggle?: boolean;
  /** Blind toggle visible but not yet earned: render a teased locked row. */
  blindLocked?: boolean;
  blindUnlockHint?: string;
  /** EXPERT (6-letter) difficulty gated: render a teased locked row until earned. */
  expertLocked?: boolean;
  expertUnlockHint?: string;
  /** Lexicon (rare-word) composable toggle — stacks on any difficulty/variant. */
  /** Speed Shift, the fourth composable modifier: a clock over any style. */
  speedActive?: boolean;
  onToggleSpeedMode?: () => void;
  showSpeedToggle?: boolean;
  speedLocked?: boolean;
  speedUnlockHint?: string;
  lexiconActive?: boolean;
  onToggleLexiconMode?: () => void;
  showLexiconToggle?: boolean;
  lexiconLocked?: boolean;
  lexiconUnlockHint?: string;
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
  phase = 0,
  onSelectDifficulty,
  onSelectVariant,
  onToggleChallengeMode,
  showChallengeToggle = true,
  undoLimited = false,
  blindActive = false,
  onToggleBlindMode,
  showBlindToggle = false,
  blindLocked = false,
  blindUnlockHint,
  expertLocked = false,
  expertUnlockHint,
  speedActive = false,
  onToggleSpeedMode,
  showSpeedToggle = false,
  speedLocked = false,
  speedUnlockHint,
  lexiconActive = false,
  onToggleLexiconMode,
  showLexiconToggle = false,
  lexiconLocked = false,
  lexiconUnlockHint,
  unbrokenWeaveActive = false,
  onToggleUnbrokenWeave,
  showUnbrokenWeave = false,
  unbrokenWeaveMastery = null,
  introMode = false,
  introHintText,
}) => {
  // Hooks must run on every render (before the visibility early-return).
  const screenInsets = useScreenInsets();

  // House entrance: this config surface used to pop in and out with zero
  // transition (animationType="none"). Match RulesModal's sibling pattern — a
  // backdrop fade + a SURFACE.modalIn spring on the panel — with the design
  // system's asymmetric exit (springy in, fast out). Reduced motion pins
  // everything shown. Refs/effect live BEFORE the visibility early-return so the
  // hook order never changes.
  const reducedMotion = getSettingsSync().reducedMotion;
  const backdropOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const cardScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
  const cardOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const closingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    if (reducedMotion) {
      backdropOpacity.setValue(1);
      cardScale.setValue(1);
      cardOpacity.setValue(1);
      return;
    }
    backdropOpacity.setValue(0);
    cardScale.setValue(0.92);
    cardOpacity.setValue(0);
    const anim = Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, ...getModalInSpring(phase), useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, reducedMotion, backdropOpacity, cardScale, cardOpacity]);

  // Fast, asymmetric exit: fade the panel + scrim, then hand back to the parent
  // (which owns `visible`). A guard stops a double-dismiss from racing.
  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (reducedMotion) {
      onClose?.();
      return;
    }
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: SURFACE.modalOutMs,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: SURFACE.modalOutMs,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => onClose?.());
  }, [reducedMotion, backdropOpacity, cardOpacity, onClose]);

  // Scroll discoverability. Once every modifier is unlocked (the phase-5 menu is
  // four sections deep), the option list overflows the height-capped panel. The
  // native scroll indicator alone is easy to miss, and the apex Unbroken Weave
  // row sits at the very end, so a soft parchment fade + a down-chevron cue at
  // the base signals "there is more below." It shows only while the list
  // overflows AND the player has not reached the bottom, and fades out at the
  // end. `menuAtBottom` starts false so the cue is visible immediately on an
  // overflowing menu (before any scroll), not only after the first drag.
  const [menuOverflowing, setMenuOverflowing] = useState(false);
  const [menuAtBottom, setMenuAtBottom] = useState(false);
  const scrollCueOpacity = useRef(new Animated.Value(0)).current;
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);

  const recomputeMenuOverflow = useCallback(() => {
    const overflowing = contentHeightRef.current > viewportHeightRef.current + 2;
    setMenuOverflowing(prev => (prev === overflowing ? prev : overflowing));
  }, []);

  useEffect(() => {
    if (!visible) return;
    const showCue = menuOverflowing && !menuAtBottom;
    if (reducedMotion) {
      scrollCueOpacity.setValue(showCue ? 1 : 0);
      return;
    }
    const anim = Animated.timing(scrollCueOpacity, {
      toValue: showCue ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [visible, menuOverflowing, menuAtBottom, reducedMotion, scrollCueOpacity]);

  if (!visible) return null;

  const t = getSurfaceTheme(phase);
  const dark = phase >= 3;
  const title = phase >= 3 ? 'ARRANGEMENT SETUP' : 'PUZZLE SETUP';
  const styleTitle = phase >= 3 ? 'ARRANGEMENT STYLE' : 'PUZZLE STYLE';
  // Header over the stackable modifier toggles (Challenge / Blind / Lexicon /
  // Weave) so they read as optional add-ons, distinct from the single-select
  // DIFFICULTY and STYLE sections above. Phase-aware like the other headers.
  const modifierTitle = phase >= 3 ? 'TRIALS' : 'MODIFIERS';
  // Stackability is not obvious from the toggle rows alone: a player may not
  // realize these layer onto the chosen style AND onto each other (Challenge +
  // Blind + Lexicon can all ride one board). One quiet line says so.
  const modifierHint = phase >= 3
    ? 'Layer any of these onto your arrangement.'
    : 'Stack any of these on your style.';
  // Locked options render as visibly locked rows (teased, non-selectable) so
  // the next mechanical goal is always on screen.
  const coreOptions = variantOptions.filter(option => option.group === 'core');
  const baseOptions = variantOptions.filter(option => option.group === 'base');
  const hasNonStandardVariants = !introMode && baseOptions.length > 0;

  const activeBadge = dark
    ? { bg: CandyColors.green.dark + '33', text: CandyColors.green.light }
    : { bg: CandyColors.green.light + '2E', text: CandyColors.green.shadow };
  const selectedRowStyle = { backgroundColor: t.secondaryBg, borderColor: t.secondaryBorder };
  // Challenge (undo-limit) and Blind Offering (hidden previews) are INDEPENDENT
  // constraints that stack — each row lights from its own flag. The CHALLENGE
  // row keys on undoLimited (not gameMode, which is 'challenge' whenever either
  // is on); the two can both be selected at once (the maximal trial: previews
  // hidden AND undos capped).
  const challengeActive = undoLimited;
  const blindName = phase >= 3 ? 'the Blind Offering' : 'Blind Mode';

  // Combined-loadout ("stack") readout. The layers are the non-standard style
  // plus every active modifier; the emblem shows when 2+ are live, so a single
  // toggle never triggers it (that's just one modifier, not a stack). Glyphs are
  // gathered in the same order they read down the menu (style, then modifiers).
  const selectedVariantIcon =
    currentVariant !== 'standard'
      ? variantOptions.find(option => option.variant === currentVariant)?.config.icon
      : undefined;
  const selectedVariantTitle =
    currentVariant !== 'standard'
      ? variantOptions.find(option => option.variant === currentVariant)?.config.title
      : undefined;
  const stackGlyphs: string[] = [];
  const stackLayerNames: string[] = [];
  if (selectedVariantIcon) {
    stackGlyphs.push(selectedVariantIcon);
    stackLayerNames.push(selectedVariantTitle ?? 'style');
  }
  if (undoLimited) { stackGlyphs.push('🔓'); stackLayerNames.push('Challenge'); }
  if (speedActive) { stackGlyphs.push('⚡'); stackLayerNames.push('Speed Shift'); }
  if (blindActive) { stackGlyphs.push('🌑'); stackLayerNames.push(phase >= 3 ? 'Blind Offering' : 'Blind Mode'); }
  if (lexiconActive) { stackGlyphs.push('📖'); stackLayerNames.push('Lexicon'); }
  if (unbrokenWeaveActive) { stackGlyphs.push('🧵'); stackLayerNames.push('Unbroken Weave'); }
  const stackCount = stackGlyphs.length;
  const showStackEmblem = stackCount >= 2;
  // The apex title must name the REAL `max_stack` achievement condition
  // (EXPERT + a non-standard style + Challenge + Blind + Lexicon, see App's
  // predicate). A bare `stackCount >= 4` claimed it for any four layers — e.g.
  // MEDIUM with a style + Blind + Lexicon + Weave — promising an award the
  // player would not receive.
  // Must stay identical to App's max_stack predicate: a style plus ALL FOUR
  // modifiers on EXPERT. Speed joined the set when it stopped being a style, so
  // this is a four-layer condition now. Changing one side without the other
  // makes the emblem promise an award the player will not receive.
  const isFullArrangement =
    currentDifficulty === 'EXPERT' &&
    currentVariant !== 'standard' &&
    undoLimited &&
    speedActive &&
    blindActive &&
    lexiconActive;
  const stackTitle = isFullArrangement
    ? phase >= 3 ? 'THE FULL ARRANGEMENT' : 'THE FULL STACK'
    : undoLimited && blindActive
      ? phase >= 3 ? 'THE MAXIMAL OFFERING' : 'MAXIMAL TRIAL'
      : phase >= 3 ? 'LAYERED OFFERING' : 'STACKED PLAY';
  const stackSubtitle =
    phase >= 3 ? 'All layered onto one arrangement.' : 'All active on one board.';

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop scrim fades in with the panel (native-driver opacity),
          giving the house entrance without touching the anchor layout. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay, opacity: backdropOpacity }]}
      />
      {/* Backdrop: tap anywhere outside the panel to dismiss (also gives the
          menu the whole window as a native touch surface — see the layout
          contract comment at the top of this file). */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleClose}
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
    {/* Entrance wrapper: springs the panel in (scale) + fades it (opacity),
        native-driver. Shrink-wraps under menuLayer's flex-end anchor so the
        panel stays pinned below the setup chip. */}
    <Animated.View style={{ transform: [{ scale: cardScale }], opacity: cardOpacity }}>
    <PanelCard phase={phase} kind="panel" style={panelStyle}>
      <Text style={[styles.menuTitle, { color: t.title }]}>{title}</Text>
      <View style={styles.scrollWrap}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        persistentScrollbar={true}
        scrollEventThrottle={32}
        onLayout={e => {
          viewportHeightRef.current = e.nativeEvent.layout.height;
          recomputeMenuOverflow();
        }}
        onContentSizeChange={(_w, h) => {
          contentHeightRef.current = h;
          recomputeMenuOverflow();
        }}
        onScroll={e => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 6;
          setMenuAtBottom(prev => (prev === atBottom ? prev : atBottom));
        }}
      >
        <Text style={[styles.sectionTitle, { color: t.muted }]}>DIFFICULTY</Text>
        {DIFFICULTY_LEVELS.map(d => {
          const locked = d === 'EXPERT' && expertLocked;
          const label = d === 'MEDIUM_PLUS' ? 'Medium Plus' : d.charAt(0) + d.slice(1).toLowerCase();
          return (
            <TouchableOpacity
              key={d}
              style={[styles.menuRow, currentDifficulty === d && selectedRowStyle, locked && styles.lockedRow]}
              onPress={() => { if (!locked) onSelectDifficulty(d); }}
              disabled={locked}
              accessibilityRole="button"
              accessibilityState={{ selected: currentDifficulty === d, disabled: locked }}
              accessibilityLabel={locked
                ? `Expert difficulty, locked. ${expertUnlockHint ?? ''}`
                : `${label} difficulty${currentDifficulty === d ? ', selected' : ''}`}
            >
              <Image
                source={DIFFICULTY_ART[d]}
                style={[styles.difficultySeal, locked && styles.difficultySealLocked]}
                resizeMode="contain"
              />
              {/* Title + tease share a flexing column, matching the Blind and
                  Lexicon locked rows. Previously the hint was a bare sibling
                  inside a non-wrapping flex ROW with no flex of its own, so the
                  ~40-character EXPERT tease overflowed the ~110dp remainder of
                  the 290dp panel and clipped. */}
              <View style={styles.difficultyRowContent}>
                <Text
                  style={[
                    styles.menuRowText,
                    { color: locked ? t.muted : (currentDifficulty === d ? t.title : t.body) },
                  ]}
                >
                  {locked ? '🔒 ' : ''}{d === 'MEDIUM_PLUS' ? 'MED+' : d}
                </Text>
                {locked && expertUnlockHint ? (
                  <Text style={[styles.lockedHintText, { color: t.muted }]}>{expertUnlockHint}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}

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

        {/* MODIFIER ROW ORDER IS UNLOCK ORDER: Challenge (15), Speed (55),
            Blind (80), Lexicon (100). The list doubles as the player's roadmap,
            so a row the player earns sooner must never sit below one they earn
            later (Speed shipped under Blind and read as the further goal while
            actually being the nearer one). Keep this identical to the
            stackGlyphs push order above, which the emblem renders left to
            right, and to the four unlock constants in gameBalance. */}
        {showChallengeToggle && !introMode && (
          <>
            <View style={[styles.sectionDivider, { backgroundColor: t.sectionBorder }]} />
            <Text style={[styles.sectionTitle, { color: t.muted }]}>{modifierTitle}</Text>
            <Text style={[styles.sectionSubtitle, { color: t.muted }]}>{modifierHint}</Text>

            {showStackEmblem && (
              <StackEmblem
                glyphs={stackGlyphs}
                title={stackTitle}
                subtitle={stackSubtitle}
                count={stackCount}
                layerNames={stackLayerNames}
                t={t}
              />
            )}

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
              accessibilityLabel={
                blindActive
                  ? `Challenge mode, ${challengeActive ? 'on' : 'off'}. Stacks with ${blindName}.`
                  : `Challenge mode, ${challengeActive ? 'on' : 'off'}`
              }
            >
              <ModeIcon
                glyph={challengeActive ? '🔓' : '🔒'}
                textStyle={styles.challengeMenuIcon}
                imageStyle={styles.challengeMenuIconImage}
              />
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
                  {/* One notation everywhere (+N% amber): the row used to flip
                      between "+25%" and "1.25x" for the SAME bonus depending on
                      its own state, and dropped the figure entirely when
                      stacked. Stacked with Blind it now names the real rate. */}
                  {challengeActive && blindActive
                    ? 'No hints, no guidance, limited undos. +125% amber.'
                    : 'No hints, limited undos. +25% amber.'}
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Speed Shift — locked tease */}
        {showSpeedToggle && !introMode && speedLocked && !speedActive && (
          <TouchableOpacity
            style={[styles.menuRow, styles.lockedRow]}
            disabled
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityLabel={`Speed Shift, locked. ${speedUnlockHint || ''}`}
          >
            <ModeIcon
              glyph={'🔒'}
              textStyle={styles.challengeMenuIcon}
              imageStyle={styles.challengeMenuIconImage}
            />
            <View style={styles.challengeMenuContent}>
              <Text style={[styles.menuRowText, { color: t.muted }]}>SPEED SHIFT</Text>
              {speedUnlockHint ? (
                <Text style={[styles.lockedHintText, { color: t.muted }]}>
                  {speedUnlockHint}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}

        {/* Speed Shift — live toggle */}
        {showSpeedToggle && !introMode && (!speedLocked || speedActive) && onToggleSpeedMode && (
          <TouchableOpacity
            style={[
              styles.menuRow,
              speedActive && {
                backgroundColor: t.amberText + '14',
                borderColor: t.amberText + '55',
              },
            ]}
            onPress={onToggleSpeedMode}
            accessibilityRole="button"
            accessibilityState={{ selected: speedActive }}
            accessibilityLabel={`Speed Shift, ${speedActive ? 'on' : 'off'}. A clock on any style. +34% amber.`}
          >
            {/* The glyph swaps with state (never colour alone), same rule the
                Challenge, Blind and Lexicon rows follow. */}
            <ModeIcon
              glyph={speedActive ? '⚡' : '⏱️'}
              textStyle={styles.challengeMenuIcon}
              imageStyle={styles.challengeMenuIconImage}
            />
            <View style={styles.challengeMenuContent}>
              <Text
                style={[
                  styles.menuRowText,
                  { color: speedActive ? t.amberText : t.body },
                ]}
              >
                SPEED SHIFT
              </Text>
              <Text style={[styles.challengeMenuDesc, { color: t.muted }]}>
                {speedActive
                  ? (phase >= 3
                      ? 'On. The arrangement will not wait, whatever style you bring. +34% amber.'
                      : 'On. Race the clock, on any style. +34% amber.')
                  : (phase >= 3
                      ? 'Off. The arrangement will not wait, whatever style you bring. +34% amber.'
                      : 'Off. Race the clock, on any style. +34% amber.')}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Blind toggle pre-gate: a visible locked row with the tease (the
            deepest trial rung stays on screen as a goal). If a restored board
            somehow has blind active while locked, the live toggle renders
            instead so the player can always turn it off. */}
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
            accessibilityLabel={`${phase >= 3 ? 'Blind offering' : 'Blind mode'}, ${blindActive ? 'on' : 'off'}. No guidance, judged at the end. ${blindActive && undoLimited ? 'Undos capped by Challenge. +125% amber, stacked with Challenge.' : 'Undos stay free. +100% amber.'}`}
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
                {/* The undo clause is the one thing these two rows have to say
                    out loud. Blind ALONE frees the undos (walking the chain back
                    to a flaw is its repair loop); adding Challenge re-imposes the
                    budget. Neither state was ever named here, so a player who
                    turned Challenge off had nothing confirming the cap had
                    lifted, and read the pair as refusing to decouple. */}
                {blindActive && undoLimited
                  ? 'No guidance, judged at the end. Undos capped by Challenge. +125% amber.'
                  : 'No guidance, judged at the end. Undos stay free. +100% amber.'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Lexicon (rare-word) toggle — a composable modifier that stacks on any
            difficulty + variant. Teased as a locked row until its late gate,
            then a live on/off toggle. */}
        {showLexiconToggle && !introMode && lexiconLocked && !lexiconActive && (
          <TouchableOpacity
            style={[styles.menuRow, styles.lockedRow]}
            disabled
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityLabel={`Lexicon, locked. ${lexiconUnlockHint || ''}`}
          >
            <ModeIcon
              glyph={'🔒'}
              textStyle={styles.challengeMenuIcon}
              imageStyle={styles.challengeMenuIconImage}
            />
            <View style={styles.challengeMenuContent}>
              <Text style={[styles.menuRowText, { color: t.muted }]}>LEXICON</Text>
              {lexiconUnlockHint ? (
                <Text style={[styles.lockedHintText, { color: t.muted }]}>
                  {lexiconUnlockHint}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}

        {showLexiconToggle && !introMode && (!lexiconLocked || lexiconActive) && onToggleLexiconMode && (
          <TouchableOpacity
            style={[
              styles.menuRow,
              lexiconActive && {
                backgroundColor: t.amberText + '14',
                borderColor: t.amberText + '55',
              },
            ]}
            onPress={onToggleLexiconMode}
            accessibilityRole="button"
            accessibilityState={{ selected: lexiconActive }}
            accessibilityLabel={`Lexicon rare-word mode, ${lexiconActive ? 'on' : 'off'}. Rarer words, on any style. +40% amber.`}
          >
            {/* The glyph must SWAP with state, like Challenge (🔒/🔓) and Blind
                (👁️/🌑). A constant book left the amber tint as the only on/off
                signal for a sighted player, which is information by color
                alone; the closed book now reads "off", the open book "on". */}
            <ModeIcon
              glyph={lexiconActive ? '📖' : '📕'}
              textStyle={styles.challengeMenuIcon}
              imageStyle={styles.challengeMenuIconImage}
            />
            <View style={styles.challengeMenuContent}>
              <Text
                style={[
                  styles.menuRowText,
                  { color: lexiconActive ? t.amberText : t.body },
                ]}
              >
                LEXICON
              </Text>
              <Text style={[styles.challengeMenuDesc, { color: t.muted }]}>
                {lexiconActive
                  ? (phase >= 3
                      ? 'On. Rarer, stranger words, from the older pages. +40% amber.'
                      : 'On. Rarer words, on any style. +40% amber.')
                  : (phase >= 3
                      ? 'Off. Rarer, stranger words, from the older pages. +40% amber.'
                      : 'Off. Rarer words, on any style. +40% amber.')}
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
      {/* "More below" cue: a soft parchment fade + a down-chevron, shown only
          while the list overflows and the player is not at the bottom (pointer-
          transparent, reduced-motion pins its opacity with no animation). */}
      <Animated.View
        pointerEvents="none"
        style={[styles.scrollCue, { opacity: scrollCueOpacity }]}
      >
        <View style={StyleSheet.absoluteFill}>
          {SCROLL_FADE_STOPS.map((o, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: t.cardBg, opacity: o }} />
          ))}
        </View>
        <View style={[styles.scrollCueChevron, { borderColor: t.muted }]} />
      </Animated.View>
      </View>
    </PanelCard>
    </Animated.View>
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
    // NOT SURFACE.panelPadX: at 28 the rows would be only ~206dp wide inside
    // this 290dp panel. The text was already clear (panel + scrollContent +
    // menuRow); the defect was that the selected-row HIGHLIGHT box started
    // 4dp INSIDE the wood band and painted over the frame. 16 here + 8 on
    // scrollContent lands the row boxes exactly on the 24dp band edge.
    paddingHorizontal: 16,
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
    fontSize: FONT_SIZE.small,
    fontWeight: '900',
    letterSpacing: SURFACE.sectionLetterSpacing,
    // Compensates the panel's 10 -> 16: the title keeps its ~28dp inset.
    paddingHorizontal: 12,
    paddingBottom: 3,
  },
  // Wraps the ScrollView + the "more below" fade cue so the cue can pin to the
  // scroll region's own bottom edge. Carries the shrinkable flex role inside the
  // '100%'-capped panel; the ScrollView keeps its own flexShrink so it compresses
  // and scrolls in lockstep (pinned by puzzleChromeFixes.test.ts).
  scrollWrap: {
    flexShrink: 1,
    minHeight: 0,
  },
  // The option list SHRINKS to fit inside the '100%'-capped panel (then
  // scrolls); flexGrow: 0 keeps a short list at its natural height.
  scrollArea: {
    flexGrow: 0,
    flexShrink: 1,
  },
  // The "more below" cue: a short band pinned to the scroll region's bottom.
  scrollCue: {
    position: 'absolute',
    // Flush with the scroll region so the fade band never overlaps the wood.
    left: 0,
    right: 0,
    bottom: 0,
    height: 34,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  // Font-independent down-chevron (rotated corner borders — no glyph coverage
  // risk); color is set inline to the phase's muted ink.
  scrollCueChevron: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '45deg' }],
    marginBottom: 4,
  },
  scrollContent: {
    // Row boxes start at difficultyMenu.paddingHorizontal + this = 24dp, the
    // panel band edge, so a selected row never paints on the painted wood.
    paddingHorizontal: 8,
    paddingBottom: SCROLL_BOTTOM_PAD,
  },
  sectionTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.caption,
    fontWeight: '900',
    letterSpacing: SURFACE.sectionLetterSpacing,
    marginTop: 4,
    marginBottom: 3,
    paddingHorizontal: 6,
  },
  // One quiet line under the MODIFIERS/TRIALS header telling the player these
  // toggles stack (onto the chosen style and onto each other).
  sectionSubtitle: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: FONT_SIZE.caption,
    lineHeight: 14,
    fontStyle: 'italic',
    marginTop: -1,
    marginBottom: 5,
    paddingHorizontal: 6,
  },
  // Stack emblem — the fused-loadout card shown when 2+ layers are live.
  stackCard: {
    marginTop: 4,
    marginBottom: 7,
    marginHorizontal: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  stackFan: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    // The first chip carries no negative margin; the rest overlap leftward, so
    // the row's left edge is the first chip and the fan reads as a stack.
    paddingLeft: 3,
  },
  stackChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  stackChipGlyph: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.bodyLg,
  },
  stackChipImage: {
    width: 18,
    height: 18,
  },
  stackCountPill: {
    marginLeft: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  stackCountText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.caption,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  stackTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.small,
    fontWeight: '900',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  stackSubtitle: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: FONT_SIZE.caption,
    lineHeight: 14,
    fontStyle: 'italic',
    marginTop: 1,
    textAlign: 'center',
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
  // Flexing column for a difficulty row's label + (when locked) its tease, so a
  // long unlock hint wraps inside the panel instead of overflowing the row.
  difficultyRowContent: {
    flex: 1,
    minWidth: 0,
  },
  // The tier's wax-seal emblem (assets/ui/difficulty): the seal colour still
  // carries the tier hue, but the embossed symbol tells the tiers apart by
  // silhouette too, where the old 12dp ring was colour alone.
  difficultySeal: {
    width: 28,
    height: 28,
    marginRight: 10,
  },
  difficultySealLocked: {
    opacity: 0.4,
  },
  menuRowText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.bodyLg,
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
    fontSize: FONT_SIZE.large,
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
    fontSize: FONT_SIZE.caption,
    marginTop: 1,
  },
  weaveMasteryTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.caption,
    fontWeight: '800',
    marginTop: 4,
  },
  weaveMasteryObjective: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: FONT_SIZE.micro,
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
    fontSize: FONT_SIZE.large,
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
    fontSize: FONT_SIZE.bodyLg,
    fontWeight: '800',
  },
  variantDescription: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.small,
    lineHeight: 16,
  },
  variantBadge: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.micro,
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
    fontSize: FONT_SIZE.small,
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
    fontSize: FONT_SIZE.small,
    lineHeight: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
