import React, { useEffect, useRef, useState, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  GestureResponderEvent,
} from 'react-native';
import { Letter, RowData } from '../types';
import { LetterTile, getGuideGlowConfig, getSquashParams } from './LetterTile';
import { DraggableTile } from './DraggableTile';
import { CandyColors, getPhaseTheme } from '../theme/colors';
import { getSettingsSync } from '../services/settings';
import { hapticSelection } from '../services/haptics';
import { shouldSimplifyAnimations } from '../services/deviceTier';
import { getWordPhaseTier } from '../services/localGenerator';
import { getPressSpring } from '../theme/surfaces';
import {
  ROW_HORIZONTAL_MARGIN,
  ROW_PADDING,
  ARC_SLOT_RENDERED_WIDTH,
  ARC_LETTER_MARGIN_H,
  ARC_SLOT_MARGIN_H,
  STANDARD_TILE_W,
  STANDARD_TILE_MARGIN_H,
  COMPACT_TILE_W,
  COMPACT_TILE_MARGIN_H,
} from '../constants/tileLayout';
import {
  INTER_SLOT_PULSE_SCALE,
  INTER_SLOT_PULSE_IN_MS,
  INTER_SLOT_PULSE_OUT_MS,
  DRAG_HOVER_SCALE,
} from '../constants/timing';
import { BODY_FONT_BOLD, PIXEL_FONT_BOLD } from '../theme/fonts';

// Arc layout configuration
const ARC_ROTATION = 12; // Max rotation in degrees for edge elements (steeper fan)
const ARC_LIFT = 18; // How much center elements lift up relative to edges
const SLOT_HEIGHT = 52; // Height to match letter tiles vertically

// Board-serve entrance: a fresh board materializes top-to-bottom instead of
// snapping in. This Row component mounts fresh ONLY on a genuine board serve —
// App keys each Row by row.id (unique per generated board), so a new board
// remounts every Row, while the frequent arc-toggle tile remounts within a
// board leave the Row INSTANCE intact. So a run-once-on-mount entrance fires
// exactly on serves and never mid-solve. Reduced motion / low-tier skip it.
const BOARD_SERVE_RISE = 14; // px the row rises from as it fades in
const BOARD_SERVE_STAGGER_MS = 55; // per-row cascade delay
const BOARD_SERVE_MAX_STAGGER_ROWS = 6; // cap so long boards never crawl in
const BOARD_SERVE_FADE_MS = 260;

/** Preview data for a single slot position */
export interface SlotPreview {
  word: string;
  isValid: boolean;
}

/**
 * Accessibility label for a drop slot. When a ghost preview is available the
 * label ALWAYS announces the word the drop would form; the valid/invalid
 * verdict is appended only while the visual ✓/✗ grading is shown
 * (validityVisible), so screen-reader players get exactly the same guidance
 * sighted players do — no more, no less. Deliberately functional, literal
 * copy (not phase narrative). "Not a valid move" rather than "not a valid
 * word" because a preview can be invalid even when the formed word is real —
 * removing the letter may break the word above. When previews are suppressed
 * entirely (Blind Offering) `preview` is undefined and the plain positional
 * label is kept.
 */
export function getSlotAccessibilityLabel(
  index: number,
  slotCount: number,
  isGuided: boolean,
  preview?: SlotPreview,
  validityVisible: boolean = true
): string {
  const base = `${isGuided ? 'Guided drop zone' : 'Drop zone'} ${index + 1}`;
  if (!preview) return base;
  const position = `${base} of ${slotCount}`;
  if (!validityVisible) return `${position}, would form ${preview.word}`;
  return preview.isValid
    ? `${position}, forms ${preview.word}, valid word`
    : `${position}, would form ${preview.word}, not a valid move`;
}

interface RowProps {
  rowData: RowData;
  rowIndex: number;
  activeRowIndex: number;
  moveDirection?: 'down' | 'up';
  selectedLetter: Letter | null;
  onLetterPress: (letter: Letter, rowIndex: number) => void;
  onSlotPress: (targetIndex: number, origin?: { x: number; y: number }) => void;
  /**
   * Quiet acknowledgment for taps on tiles in rows that are neither the
   * active source row nor the selecting target row (completed and future
   * rows, which used to mount no touchable at all). The parent fires a light
   * selection haptic; the tile plays its own subtle pulse. Never threaded to
   * source-row tiles (their tap/drag/locked paths own the feedback) nor the
   * arc-layout target row (its inter-slot pulse owns those taps).
   */
  onInactivePress?: () => void;
  isProcessing: boolean;
  phase?: number;
  wordLength?: number;
  concealLetters?: boolean;
  guidanceActive?: boolean;
  guidedLetterId?: string | null;
  guidedSlotIndex?: number | null;
  /** Hint glow: id of the letter tile to highlight in this row (same visuals as the tutorial guide). */
  hintLetterId?: string | null;
  /** Hint glow: drop-slot index to highlight in this row (visible while slots are shown). */
  hintSlotIndex?: number | null;
  /** Arrival settle for the letter just placed by a committed tap move (see usePuzzleGame.lastArrival). */
  arrival?: { letterId: string; direction: 'down' | 'up'; moveId: number } | null;
  /** Incrementing signal from parent to trigger target-row invalid shake */
  invalidDropSignal?: number;
  /** Incrementing signal from parent to trigger target-row success bounce */
  successDropSignal?: number;
  /** Word previews for each slot position (only on target row when letter is selected) */
  slotPreviews?: SlotPreview[];
  /**
   * Whether the previews' ✓/✗ validity grading is PRESENTED (usePuzzleGame's
   * verb-depth gate). When false, every ghost preview renders the formed word
   * in one neutral dimmed ink — no prefix, no valid/invalid styling — and the
   * slot accessibility label announces the word without a verdict. Defaults
   * to true so legacy call sites keep the graded presentation.
   */
  previewValidityVisible?: boolean;
  /**
   * Slot index currently hovered by an active drag in this row (null = none).
   * Purely geometric feedback — the hovered slot swells slightly under the
   * finger. NEVER validity-filtered.
   */
  hoverSlotIndex?: number | null;
  /** Called when a letter tile is dragged and dropped — receives the letter, row, and drop position */
  onLetterDragDrop?: (letter: Letter, rowIndex: number, position: { x: number; y: number }) => void;
  /** Live finger position while a drag is active (drives the hover highlight). */
  onLetterDragMove?: (position: { x: number; y: number }) => void;
  /** Called when drag activation state changes — used to disable parent ScrollView during drag */
  onDragActiveChange?: (active: boolean) => void;
  /** Registers this row's measurable node by index so the parent can Y-bounds-check drops */
  onMeasureRef?: (rowIndex: number, node: View | null) => void;
}

// Phase-aware row color helper
function getPhaseRowColors(phase: number) {
  if (phase <= 1) {
    return {
      glowColor: CandyColors.purple.main,
      sourceBorderColor: CandyColors.purple.light,
      sourceShadowColor: CandyColors.purple.main,
      targetBorderColor: CandyColors.pink.light,
      targetShadowColor: CandyColors.pink.main,
      pickBadgeColor: CandyColors.purple.main,
      dropBadgeColor: CandyColors.pink.main,
      slotGlowColor: CandyColors.pink.main,
      slotBorderColor: CandyColors.pink.light,
      dropHintColor: CandyColors.pink.main,
      cornerDotColor: CandyColors.pink.light,
    };
  }

  const theme = getPhaseTheme(phase);

  if (phase === 2) {
    return {
      glowColor: theme.bgPrimary,
      sourceBorderColor: theme.bgPrimary,
      sourceShadowColor: theme.bgPrimary,
      targetBorderColor: theme.bgPrimary,
      targetShadowColor: theme.bgPrimary,
      pickBadgeColor: theme.bgPrimary,
      dropBadgeColor: theme.bgPrimary,
      slotGlowColor: theme.bgPrimary,
      slotBorderColor: theme.bgPrimary,
      dropHintColor: theme.bgPrimary,
      cornerDotColor: theme.bgPrimary,
    };
  }

  if (phase === 3) {
    return {
      glowColor: '#4A3875',
      sourceBorderColor: '#5B4890',
      sourceShadowColor: '#4A3875',
      targetBorderColor: '#5B4890',
      targetShadowColor: '#4A3875',
      pickBadgeColor: '#7A5A8E',
      dropBadgeColor: '#7A5A8E',
      slotGlowColor: '#4A3875',
      slotBorderColor: '#5B4890',
      dropHintColor: '#7A5A8E',
      cornerDotColor: '#5B4890',
    };
  }

  // Phase 4+
  return {
    glowColor: '#2A1845',
    sourceBorderColor: '#3A2255',
    sourceShadowColor: '#2A1845',
    targetBorderColor: '#3A2255',
    targetShadowColor: '#2A1845',
    pickBadgeColor: '#4A3065',
    dropBadgeColor: '#4A3065',
    slotGlowColor: '#2A1845',
    slotBorderColor: '#5A4075',
    dropHintColor: '#4A3065',
    cornerDotColor: '#5A4075',
  };
}

// Animated drop slot component
const Slot: React.FC<{
  onPress: (origin?: { x: number; y: number }) => void;
  index: number;
  /** Total slot count in the target row (for the "N of M" accessibility label). */
  slotCount?: number;
  compact?: boolean;
  phase?: number;
  isGuided?: boolean;
  preview?: SlotPreview;
  /** Whether the preview's ✓/✗ grading is shown (false = neutral ghost word). */
  validityVisible?: boolean;
  /** True while an active drag's finger is over this slot (geometric swell). */
  isHovered?: boolean;
  /** Incremented when the adjacent letter tile is tapped (brief guidance pulse). */
  pulseSignal?: number;
  /** Incremented when a letter successfully lands in this slot (triggers catch bounce) */
  triggerCatch?: number;
}> = ({ onPress, index, slotCount = 0, compact = false, phase = 0, isGuided = false, preview, validityVisible = true, isHovered = false, pulseSignal = 0, triggerCatch = 0 }) => {
  const settings = getSettingsSync();
  const phaseColors = getPhaseRowColors(phase);
  const guideGlow = getGuideGlowConfig(phase);
  const scaleAnim = useRef(new Animated.Value(settings.reducedMotion ? 1 : 0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  // Catch-landing squash pair (F9/F76): replaces the old uniform catchBounceAnim
  // scale bump with a phase-weighted squash-and-stretch (getSquashParams),
  // matching LetterTile's own arrival landing instead of a fixed f5/t200 bounce.
  const catchSquashXAnim = useRef(new Animated.Value(1)).current;
  const catchSquashYAnim = useRef(new Animated.Value(1)).current;
  const hoverScaleAnim = useRef(new Animated.Value(1)).current;
  const adjacentPulseAnim = useRef(new Animated.Value(0)).current;
  const previewOpacity = useRef(new Animated.Value(0)).current;
  const previewScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (settings.reducedMotion) {
      scaleAnim.setValue(1);
      return;
    }

    // Pop in animation with stagger
    Animated.sequence([
      Animated.delay(index * 50),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Skip decorative loops on low-end devices
    if (shouldSimplifyAnimations()) {
      return () => {
        scaleAnim.stopAnimation();
        catchSquashXAnim.stopAnimation();
        catchSquashYAnim.stopAnimation();
      };
    }

    // The active-slot pulse/glow tempo ages with the descent: the board's own
    // heartbeat slows as the world darkens (bright 800/1000ms -> ~1300/1600ms at
    // the reveal), so the slot indicator doesn't keep a chirpy phase-0 cadence
    // over a Phase-4 board. Mirrors the tile-wobble slowdown.
    const pulseMs = phase >= 4 ? 1300 : phase >= 3 ? 1100 : phase >= 2 ? 950 : 800;
    const glowMs = phase >= 4 ? 1600 : phase >= 3 ? 1350 : phase >= 2 ? 1150 : 1000;

    // Continuous pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: pulseMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: pulseMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Glow animation (native driver — only drives opacity)
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: glowMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: glowMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    return () => {
      pulseLoop.stop();
      glowLoop.stop();
      scaleAnim.stopAnimation();
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
    };
  }, []);

  // Catch squash-and-stretch when a letter lands (F9: split from a uniform
  // scale bounce; F76: the spring itself now ages with phase via
  // getSquashParams instead of a fixed f5/t200 bounce at every phase).
  useEffect(() => {
    if (triggerCatch > 0 && !settings.reducedMotion) {
      const squash = getSquashParams(phase);
      catchSquashXAnim.setValue(1 + squash.amount);
      catchSquashYAnim.setValue(1 - squash.amount);
      Animated.spring(catchSquashXAnim, {
        toValue: 1,
        friction: squash.friction,
        tension: squash.tension,
        useNativeDriver: true,
      }).start();
      Animated.spring(catchSquashYAnim, {
        toValue: 1,
        friction: squash.friction,
        tension: squash.tension,
        useNativeDriver: true,
      }).start();
    }
  }, [triggerCatch, settings.reducedMotion, phase]);

  // Live drag-hover swell: the slot under the finger scales up slightly while
  // hovered. Purely GEOMETRIC feedback (never validity-filtered) — it answers
  // "where would this land?", not "is this legal?". Reduced motion sets the
  // value instantly (the feedback is informative, not decorative).
  useEffect(() => {
    if (settings.reducedMotion) {
      hoverScaleAnim.setValue(isHovered ? DRAG_HOVER_SCALE : 1);
      return;
    }
    Animated.spring(hoverScaleAnim, {
      toValue: isHovered ? DRAG_HOVER_SCALE : 1,
      friction: 5,
      tension: 220,
      useNativeDriver: true,
    }).start();
    return () => {
      hoverScaleAnim.stopAnimation();
    };
  }, [isHovered, settings.reducedMotion]);

  // Adjacent-slot guidance pulse: tapping the letter tile BETWEEN slots (a tap
  // that previously vanished silently) briefly swells this slot to draw the
  // eye toward where drops actually go. No commit, no validity leak.
  useEffect(() => {
    if (!pulseSignal || settings.reducedMotion) return;
    adjacentPulseAnim.setValue(0);
    const pulse = Animated.sequence([
      Animated.timing(adjacentPulseAnim, {
        toValue: 1,
        duration: INTER_SLOT_PULSE_IN_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(adjacentPulseAnim, {
        toValue: 0,
        duration: INTER_SLOT_PULSE_OUT_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    pulse.start();
    return () => {
      pulse.stop();
      adjacentPulseAnim.setValue(0);
    };
  }, [pulseSignal, settings.reducedMotion]);

  // Animate preview appearance
  useEffect(() => {
    if (preview) {
      if (settings.reducedMotion) {
        previewOpacity.setValue(1);
        previewScale.setValue(1);
        return;
      }
      previewOpacity.setValue(0);
      previewScale.setValue(0.85);
      Animated.parallel([
        Animated.timing(previewOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(previewScale, {
          toValue: 1,
          friction: 6,
          tension: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      previewOpacity.setValue(0);
      previewScale.setValue(0.85);
    }
  }, [preview?.word, preview?.isValid]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const adjacentPulseScale = adjacentPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, INTER_SLOT_PULSE_SCALE],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  const handlePressIn = () => {
    if (settings.reducedMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (settings.reducedMotion) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={(event: GestureResponderEvent) => {
        onPress({
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
        });
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      accessibilityLabel={getSlotAccessibilityLabel(index, slotCount, isGuided, preview, validityVisible)}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          styles.slotOuter,
          {
            transform: [
              {
                scale: Animated.multiply(
                  Animated.multiply(scaleAnim, pulseScale),
                  Animated.multiply(hoverScaleAnim, adjacentPulseScale)
                ),
              },
              // Catch-landing squash (F9/F76), layered independently of the
              // uniform scale above — mirrors LetterTile's arrival squash.
              { scaleX: catchSquashXAnim },
              { scaleY: catchSquashYAnim },
            ],
          },
        ]}
      >
        {/* Glow background */}
        <Animated.View
          style={[
            styles.slotGlow,
            {
              opacity: glowOpacity,
              backgroundColor: isGuided ? guideGlow.accent : phaseColors.slotGlowColor,
            },
          ]}
        />

        {isGuided && (
          <Animated.View
            style={[
              styles.guidedSlotHalo,
              {
                borderColor: guideGlow.accent,
                backgroundColor: guideGlow.haloWash,
                shadowColor: guideGlow.accent,
                opacity: glowOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
            pointerEvents="none"
          />
        )}

        {/* Main slot */}
        <View
          style={[
            styles.slot,
            compact && styles.slotCompact,
            { borderColor: isGuided ? guideGlow.accent : phaseColors.slotBorderColor },
            isGuided && { borderWidth: 3, backgroundColor: guideGlow.slotFill },
          ]}
        >
          {/* Inner shimmer */}
          <View style={styles.slotShimmer} />

          {/* Drop indicator: single flexbox-centered dot (View-based, so it stays
              crisply centered under the arc rotation + trapezoid transform).
              Hidden while the guided arrow shows so the two never stack. */}
          {!isGuided && (
            <View
              style={[
                styles.dropDot,
                compact && styles.dropDotCompact,
                { backgroundColor: phaseColors.dropHintColor },
              ]}
            />
          )}

          {/* Corner decorations - hide in compact mode */}
          {!compact && (
            <>
              <View style={[styles.cornerDot, styles.cornerTopLeft, { backgroundColor: phaseColors.cornerDotColor }]} />
              <View style={[styles.cornerDot, styles.cornerTopRight, { backgroundColor: phaseColors.cornerDotColor }]} />
              <View style={[styles.cornerDot, styles.cornerBottomLeft, { backgroundColor: phaseColors.cornerDotColor }]} />
              <View style={[styles.cornerDot, styles.cornerBottomRight, { backgroundColor: phaseColors.cornerDotColor }]} />
            </>
          )}

          {isGuided && (
            <Text style={styles.slotGuideText}>↓</Text>
          )}
        </View>

        {/* Word preview label — animated fade + scale. When the validity gate
            is closed, the formed word renders in ONE neutral dimmed ink for
            every slot: no ✓/✗ prefix, no green/red split, no bold-vs-dim tell.
            The player must judge whether the word is real. */}
        {preview && (
          <Animated.View style={[styles.slotPreviewContainer, {
            opacity: previewOpacity,
            transform: [{ scale: previewScale }],
          }]}>
            {/* The preview word rides a small dark scrim chip so the core
                judge-the-word channel is legible at every phase (the bare ink
                over the translucent target-row fill computed 1.2-2.8:1). Light
                inks on the chip compute >=4.5:1; valid/invalid is still carried
                by the ✓/✗ prefix + bold, and the neutral gate keeps ONE ink and
                ONE weight for every slot (no validity leak). */}
            <View style={styles.slotPreviewChip}>
              <Text
                style={[
                  styles.slotPreviewText,
                  compact && styles.slotPreviewTextCompact,
                  validityVisible
                    ? (preview.isValid ? styles.slotPreviewValid : styles.slotPreviewInvalid)
                    : styles.slotPreviewNeutral,
                  validityVisible && preview.isValid && styles.slotPreviewValidBold,
                ]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
              >
                {validityVisible ? (preview.isValid ? '✓ ' : '✗ ') : ''}{preview.word}
              </Text>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const Row: React.FC<RowProps> = memo(({
  rowData,
  rowIndex,
  activeRowIndex,
  moveDirection = 'down',
  selectedLetter,
  onLetterPress,
  onSlotPress,
  onInactivePress,
  isProcessing,
  phase = 0,
  wordLength = 4,
  concealLetters = false,
  guidanceActive = false,
  guidedLetterId = null,
  guidedSlotIndex = null,
  hintLetterId = null,
  hintSlotIndex = null,
  arrival = null,
  invalidDropSignal = 0,
  successDropSignal = 0,
  slotPreviews,
  previewValidityVisible = true,
  hoverSlotIndex = null,
  onLetterDragDrop,
  onLetterDragMove,
  onDragActiveChange,
  onMeasureRef,
}) => {
  const phaseColors = getPhaseRowColors(phase);
  const targetRowIndex = activeRowIndex + (moveDirection === 'down' ? 1 : -1);
  const isSource = rowIndex === activeRowIndex;
  const isTarget = rowIndex === targetRowIndex;
  // Drop rows compact at 6+ (need room for insertion slots); pick rows compact at 7+
  const compactTiles = isTarget ? wordLength >= 6 : wordLength >= 7;
  const isCompleted = moveDirection === 'down'
    ? rowIndex < activeRowIndex
    : rowIndex > activeRowIndex;
  const showSlots = isTarget && selectedLetter && !isProcessing;

  // Resonance: check if this row's word belongs to a dread tier relevant to the current phase.
  // Only visible at Phase 1+ — creates the subliminal "these words feel different" effect.
  const wordTier = getWordPhaseTier(rowData.originalWord);
  const isRowResonant = phase >= 1 && wordTier > 0;

  // Animation values
  const scaleAnim = useRef(new Animated.Value(isSource ? 1 : 0.9)).current;
  const opacityAnim = useRef(new Animated.Value(isSource ? 1 : 0.3)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const arcAnim = useRef(new Animated.Value(0)).current; // 0 = flat, 1 = full arc
  // Slot-wrapper fade/scale that plays alongside the fan's flatten on collapse,
  // so the slots don't pop out of existence when the arc subtree unmounts.
  const slotCollapseAnim = useRef(new Animated.Value(1)).current; // 1 = shown, 0 = collapsed
  // Tracks whether the fan is currently open/opening, so a letter switch can
  // update previews in place instead of hard-cutting the fan back to flat.
  const arcOpenRef = useRef(false);
  const invalidShakeX = useRef(new Animated.Value(0)).current;
  const successBounceScale = useRef(new Animated.Value(1)).current;
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  // F1 (neighbour rank-closing) — per-tile translateX cache + the last
  // rendered STANDARD-layout id order, used by the rank-shift effect below.
  const prevStandardIdsRef = useRef<string[] | null>(null);
  const rankShiftAnims = useRef(new Map<string, Animated.Value>()).current;
  const getRankShiftAnim = (id: string): Animated.Value => {
    let anim = rankShiftAnims.get(id);
    if (!anim) {
      anim = new Animated.Value(0);
      rankShiftAnims.set(id, anim);
    }
    return anim;
  };

  // The arc fan stays MOUNTED through its close animation (see the arc effect):
  // while collapsing, showSlots is already false but arcVisible keeps the
  // subtree alive so the 300ms flatten plays against live views instead of an
  // already-unmounted subtree.
  const [arcVisible, setArcVisible] = useState(false);

  // Inter-slot tap guidance: tapping a letter tile in the target row (between
  // drop slots) pulses its two ADJACENT slots. Letter i sits between slots i
  // and i+1 in the interleaved arc layout; seq makes repeat taps re-fire.
  const [slotPulse, setSlotPulse] = useState<{ left: number; right: number; seq: number } | null>(null);
  const handleInterSlotTap = (letterIndex: number) => {
    hapticSelection();
    setSlotPulse(prev => ({
      left: letterIndex,
      right: letterIndex + 1,
      seq: (prev?.seq ?? 0) + 1,
    }));
  };

  // Stable ref callback so the parent can measure this row in-window for drop
  // Y-bounds checking. Kept stable across renders to avoid detach/attach churn.
  const measureCbRef = useRef<(node: View | null) => void>(() => {});
  measureCbRef.current = (node: View | null) => onMeasureRef?.(rowIndex, node);
  const stableMeasureRef = useRef((node: View | null) => measureCbRef.current(node)).current;

  // Board-serve entrance (see BOARD_SERVE_* above). Decided once at mount so the
  // initial values don't flash: an animating serve starts hidden + risen and
  // settles; a reduced-motion / low-tier serve starts already in place. The
  // outer wrapper owns opacity/translateY so it never contends with the inner
  // row-transition opacity/scale/slide.
  const serveAnimates = useRef(
    !getSettingsSync().reducedMotion && !shouldSimplifyAnimations()
  ).current;
  const serveOpacity = useRef(new Animated.Value(serveAnimates ? 0 : 1)).current;
  const serveTranslateY = useRef(new Animated.Value(serveAnimates ? BOARD_SERVE_RISE : 0)).current;

  useEffect(() => {
    if (!serveAnimates) return;
    const delay = Math.min(rowIndex, BOARD_SERVE_MAX_STAGGER_ROWS) * BOARD_SERVE_STAGGER_MS;
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(serveOpacity, {
          toValue: 1,
          duration: BOARD_SERVE_FADE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(serveTranslateY, {
          toValue: 0,
          friction: 7,
          tension: 90,
          useNativeDriver: true,
        }),
      ]),
    ]);
    anim.start();
    return () => {
      anim.stop();
      serveOpacity.stopAnimation();
      serveTranslateY.stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount (a genuine board serve); anim values are stable refs
  }, []);

  useEffect(() => {
    // Animate row transitions
    if (isSource) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow pulse for active row (skip on low-end devices / reduced motion)
      if (getSettingsSync().reducedMotion || shouldSimplifyAnimations()) {
        glowAnim.setValue(0.5);
      } else {
        // Drives only the row glow overlay's opacity (native driver)
        glowLoopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
        glowLoopRef.current.start();
      }
    } else if (isTarget) {
      const guidedTarget = guidanceActive;
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: guidedTarget ? 1 : 0.98,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: guidedTarget ? 1 : 0.9,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isCompleted) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -8,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.88,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.25,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      glowLoopRef.current?.stop();
      glowLoopRef.current = null;
      glowAnim.stopAnimation();
    };
  }, [isSource, isTarget, isCompleted, guidanceActive]);

  // Animate the arc fan open/closed with real motion. The fan stays MOUNTED
  // through its collapse (local arcVisible state) so the 300ms close plays
  // against live views instead of an already-unmounted subtree; a letter switch
  // while the fan is open updates previews in place without hard-cutting the fan
  // flat; a committed move (the row's role changed, so isTarget is already
  // false) accepts the snap, which the catch-bounce + arrival settle mask.
  // Reduced motion / low-tier devices set everything instantly.
  useEffect(() => {
    const instant = getSettingsSync().reducedMotion || shouldSimplifyAnimations();
    if (showSlots) {
      setArcVisible(true);
      if (instant) {
        arcAnim.setValue(1);
        slotCollapseAnim.setValue(1);
        arcOpenRef.current = true;
        return;
      }
      if (arcOpenRef.current) {
        // Fan already open (letter switch): keep it in place, let the Slot
        // preview effects update the ghost words. No setValue(0) flash.
        slotCollapseAnim.setValue(1);
        return;
      }
      // Fresh open glide.
      arcOpenRef.current = true;
      slotCollapseAnim.setValue(1);
      arcAnim.setValue(0);
      Animated.timing(arcAnim, {
        toValue: 1,
        duration: 450, // Visible glide animation
        easing: Easing.out(Easing.cubic), // Smooth deceleration
        useNativeDriver: true,
      }).start();
      return;
    }

    // showSlots is false.
    if (!arcOpenRef.current) return; // nothing open to collapse
    arcOpenRef.current = false;
    // A deselect leaves this the target row (isTarget stays true); a committed
    // move flips the row's role so isTarget is already false -> snap instead.
    const gracefulDeselect = isTarget;
    if (instant || !gracefulDeselect) {
      arcAnim.setValue(0);
      slotCollapseAnim.setValue(1);
      setArcVisible(false);
      return;
    }
    // Deselect (board unchanged): flatten the fan and fade the slots, then
    // unmount only once the collapse finishes.
    Animated.parallel([
      Animated.timing(arcAnim, {
        toValue: 0,
        duration: 300, // Faster collapse
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slotCollapseAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setArcVisible(false);
        slotCollapseAnim.setValue(1); // reset for the next open
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isTarget rides with showSlots; anim values are stable refs
  }, [showSlots, selectedLetter?.id]);

  // Micro-shake the target row on invalid drop attempts. Visual-only: the
  // haptic + sound are owned by App.tsx's handleSlotPress so the rejection buzz
  // fires exactly once instead of being doubled by a second impact here.
  useEffect(() => {
    if (!isTarget || invalidDropSignal <= 0) return;
    invalidShakeX.setValue(0);
    Animated.sequence([
      Animated.timing(invalidShakeX, { toValue: 7, duration: 45, useNativeDriver: true }),
      Animated.timing(invalidShakeX, { toValue: -7, duration: 45, useNativeDriver: true }),
      Animated.timing(invalidShakeX, { toValue: 5, duration: 40, useNativeDriver: true }),
      Animated.timing(invalidShakeX, { toValue: -5, duration: 40, useNativeDriver: true }),
      Animated.timing(invalidShakeX, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();
  }, [invalidDropSignal, isTarget, invalidShakeX]);

  // Brief scale bounce on the target row when a letter successfully lands.
  // Visual-only: App.tsx owns the landing haptic (weighted heavy for a drag vs
  // medium for a tap), so this effect must not fire a second impact. The
  // release spring itself ages with phase (F76) via getPressSpring — the same
  // ladder LetterTile's own press-out already uses — so the drop lands
  // soft-heavy at Phase 4 instead of the same bright f5/t200 bounce forever.
  useEffect(() => {
    if (!isTarget || successDropSignal <= 0) return;
    if (getSettingsSync().reducedMotion) return;
    const releaseSpring = getPressSpring(phase);
    successBounceScale.setValue(1.08);
    Animated.spring(successBounceScale, {
      toValue: 1,
      friction: releaseSpring.friction,
      tension: releaseSpring.tension,
      useNativeDriver: true,
    }).start();
  }, [successDropSignal, isTarget, successBounceScale, phase]);

  // Calculate arc multipliers for position in sequence
  const getArcMultipliers = (index: number, totalElements: number) => {
    const normalizedPos = totalElements > 1
      ? (index / (totalElements - 1)) * 2 - 1  // -1 to 1
      : 0;

    // Inverted parabola centered in container:
    // Raw parabola: normalizedPos^2 - 1 goes from 0 (edges) to -1 (center)
    // Multiply by ARC_LIFT: edges at 0, center at -ARC_LIFT
    // Offset by ARC_LIFT/2 to center: edges at +ARC_LIFT/2, center at -ARC_LIFT/2
    const rawParabola = (normalizedPos * normalizedPos - 1) * ARC_LIFT;
    const yMultiplier = rawParabola + ARC_LIFT / 2;

    // Rotation: edges tilt outward (steeper fan)
    const rotationMultiplier = normalizedPos * ARC_ROTATION;

    return { yMultiplier, rotationMultiplier };
  };

  // Render interleaved arc layout: [slot][letter][slot][letter]...[slot]
  const renderArcContent = () => {
    const letters = rowData.words;
    const totalElements = letters.length * 2 + 1;
    const elements: React.ReactNode[] = [];

    // Slots fade + shrink slightly as the fan collapses (rests at 1 while open),
    // so their disappearance is smoothed rather than a hard unmount pop.
    const slotCollapseScale = slotCollapseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.82, 1],
    });

    for (let i = 0; i < totalElements; i++) {
      const isSlot = i % 2 === 0;
      const { yMultiplier, rotationMultiplier } = getArcMultipliers(i, totalElements);

      // Animated transforms - multiply by arcAnim for smooth transition
      const translateY = arcAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, yMultiplier],
      });
      const rotate = arcAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', `${rotationMultiplier}deg`],
      });

      if (isSlot) {
        const slotIndex = i / 2;
        elements.push(
          <Animated.View
            key={`slot-${slotIndex}`}
            style={[
              styles.arcSlotWrapper,
              {
                opacity: slotCollapseAnim,
                transform: [{ translateY }, { rotate }, { scale: slotCollapseScale }],
              },
            ]}
          >
            <Slot
              onPress={(origin) => onSlotPress(slotIndex, origin)}
              index={slotIndex}
              slotCount={letters.length + 1}
              compact
              phase={phase}
              isGuided={
                (guidanceActive && guidedSlotIndex === slotIndex) ||
                (hintSlotIndex != null && hintSlotIndex === slotIndex)
              }
              preview={slotPreviews?.[slotIndex]}
              validityVisible={previewValidityVisible}
              isHovered={hoverSlotIndex === slotIndex}
              pulseSignal={
                slotPulse && (slotPulse.left === slotIndex || slotPulse.right === slotIndex)
                  ? slotPulse.seq
                  : 0
              }
            />
          </Animated.View>
        );
      } else {
        const letterIndex = Math.floor(i / 2);
        const letter = letters[letterIndex];
        const displayLetter = (concealLetters && !isSource)
          ? { ...letter, char: '•' }
          : letter;
        // No wrapper View - LetterTile renders directly with animation
        elements.push(
          <Animated.View
            key={letter.id}
            style={[
              styles.arcLetterWrapper,
              { transform: [{ translateY }, { rotate }] },
            ]}
          >
            <LetterTile
              letter={displayLetter}
              highlight={letter.isLocked ? 'locked' : 'default'}
              phase={phase}
              compact={compactTiles}
              isResonant={isRowResonant}
              isGuided={
                (guidanceActive && isSource && guidedLetterId === letter.id) ||
                (hintLetterId != null && hintLetterId === letter.id)
              }
              // Target-row letter tiles used to swallow taps silently during
              // targeting. Now a tap acknowledges itself: a selection haptic
              // plus a brief pulse on the two adjacent drop slots, drawing the
              // eye to where drops go without committing anything (and without
              // leaking validity).
              onLockedPress={() => handleInterSlotTap(letterIndex)}
              arrivalMoveId={arrival && arrival.letterId === letter.id ? arrival.moveId : undefined}
              arrivalDirection={arrival && arrival.letterId === letter.id ? arrival.direction : undefined}
            />
          </Animated.View>
        );
      }
    }

    return elements;
  };

  const renderContent = () => {
    const letters = rowData.words;

    // Standard display for non-target rows
    return letters.map((letter) => {
      const displayLetter = (concealLetters && !isSource)
        ? { ...letter, char: '•' }
        : letter;
      const canDrag = isSource && !isProcessing && !letter.isLocked && !!onLetterDragDrop;
      const tile = (
        <LetterTile
          letter={displayLetter}
          isSelected={selectedLetter?.id === letter.id}
          isInteractable={isSource && !isProcessing && !letter.isLocked}
          highlight={letter.isLocked ? 'locked' : isSource ? 'source' : 'default'}
          onPress={canDrag ? undefined : () => onLetterPress(letter, rowIndex)}
          // Locked tiles in the ACTIVE source row are tappable for feedback
          // only: the press routes to the same handler, whose locked branch
          // fires the error haptic + locked-letter message. Previously the
          // touchable never mounted for locked tiles, so that path was
          // unreachable and the tap produced literally nothing.
          onLockedPress={
            isSource && !isProcessing && letter.isLocked
              ? () => onLetterPress(letter, rowIndex)
              : undefined
          }
          // Tiles in completed/future rows (and the target row before a
          // letter is selected) used to mount no touchable at all — a
          // confused poke got literally nothing. Passed straight through
          // (stable identity from App's useCallback) so the memoized tile
          // gains a quiet acknowledgment without extra re-renders. Source-row
          // tiles never receive it: their tap/drag/locked paths own feedback.
          onInactivePress={isSource ? undefined : onInactivePress}
          phase={phase}
          compact={compactTiles}
          isResonant={isRowResonant}
          isGuided={
            (guidanceActive && isSource && guidedLetterId === letter.id) ||
            (hintLetterId != null && hintLetterId === letter.id)
          }
          arrivalMoveId={arrival && arrival.letterId === letter.id ? arrival.moveId : undefined}
          arrivalDirection={arrival && arrival.letterId === letter.id ? arrival.direction : undefined}
        />
      );

      const inner = canDrag ? (
        <DraggableTile
          enabled={!isProcessing}
          letterChar={displayLetter.char}
          onDragStart={() => {
            if (!selectedLetter || selectedLetter.id !== letter.id) {
              onLetterPress(letter, rowIndex);
            }
          }}
          onDragEnd={(pos) => onLetterDragDrop!(letter, rowIndex, pos)}
          onMove={onLetterDragMove}
          onTap={() => onLetterPress(letter, rowIndex)}
          phase={phase}
          onDragActiveChange={onDragActiveChange}
        >
          {tile}
        </DraggableTile>
      ) : tile;

      // F1 (neighbour rank-closing): wraps every standard-layout tile in a
      // cheap native-driver translateX (rests at 0) so a word-length change
      // on THIS row can smoothly close ranks instead of flexbox-teleporting
      // the remaining tiles to their re-centered spots. See the rank-shift
      // effect below for when/why it actually moves.
      return (
        <Animated.View key={letter.id} style={{ transform: [{ translateX: getRankShiftAnim(letter.id) }] }}>
          {inner}
        </Animated.View>
      );
    });
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const getRowStyle = () => {
    if (isSource) return [styles.rowSource, { borderColor: phaseColors.sourceBorderColor, shadowColor: phaseColors.sourceShadowColor }];
    if (isTarget && selectedLetter) return [styles.rowTarget, { borderColor: phaseColors.targetBorderColor, shadowColor: phaseColors.targetShadowColor }];
    if (isTarget && guidanceActive) return styles.rowGuidedTarget;
    if (isCompleted) return styles.rowCompleted;
    return styles.rowFuture;
  };

  // Render the arc while slots are shown AND through the collapse that follows a
  // deselect (arcVisible). Gated on isTarget so a committed move (row role
  // flipped) shows the standard layout immediately — no one-frame arc-on-source
  // flash while the effect resets the collapse state.
  const arcMounted = isTarget && (!!showSlots || arcVisible);

  // ─── F1 (neighbour rank-closing, achievable half) ──────────────────────────
  // When this row's rendered word length changes while it stays on the
  // STANDARD (non-arc) layout throughout — the old source row shrinking to
  // `completed` as its picked letter departs — the remaining tiles would
  // otherwise flexbox-teleport straight to their re-centered positions. Each
  // remaining tile instead starts at its PRE-shrink offset (a half-tile-
  // footprint nudge, from tileLayout.ts) and native-springs to 0, so ranks
  // visibly close / make room instead of snapping.
  //
  // Deliberately scoped to same-layout-path changes: the arc->standard flip
  // when a row becomes the new source (letters were previously laid out in
  // the fan, not this standard row) has no previous STANDARD baseline to
  // diff against here, so it is left alone — that transition is already
  // masked by the arc-collapse animation plus the arriving letter's own
  // arrival settle. A true cross-row "flying ghost" (a tile visibly
  // travelling from the source row's position into the target slot) needs
  // usePuzzleGame to hand down the source tile's measured screen position
  // and is out of scope for this file.
  useEffect(() => {
    if (arcMounted) return;
    const currentIds = rowData.words.map((l) => l.id);
    const prevIds = prevStandardIdsRef.current;
    const instant = getSettingsSync().reducedMotion || shouldSimplifyAnimations();

    if (instant) {
      currentIds.forEach((id) => getRankShiftAnim(id).setValue(0));
      prevStandardIdsRef.current = currentIds;
      return;
    }

    const started: Animated.CompositeAnimation[] = [];
    if (prevIds && prevIds.length !== currentIds.length) {
      const footprint = compactTiles
        ? COMPACT_TILE_W + COMPACT_TILE_MARGIN_H * 2
        : STANDARD_TILE_W + STANDARD_TILE_MARGIN_H * 2;
      const half = footprint / 2;
      const releaseSpring = getPressSpring(phase);
      currentIds.forEach((id, newIdx) => {
        const oldIdx = prevIds.indexOf(id);
        if (oldIdx === -1) return; // a newly-arrived tile owns its own arrival settle
        let startOffset: number | null = null;
        if (newIdx === oldIdx) startOffset = -half; // sat before the departed tile
        else if (newIdx < oldIdx) startOffset = half; // sat after it; the gap closed under it
        if (startOffset === null) return;
        const anim = getRankShiftAnim(id);
        anim.setValue(startOffset);
        const spring = Animated.spring(anim, {
          toValue: 0,
          friction: releaseSpring.friction,
          tension: releaseSpring.tension,
          useNativeDriver: true,
        });
        spring.start();
        started.push(spring);
      });
    }

    prevStandardIdsRef.current = currentIds;
    return () => { started.forEach((a) => a.stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rankShiftAnims/prevStandardIdsRef/getRankShiftAnim are stable refs recreated fresh each run
  }, [arcMounted, rowData.words, compactTiles, phase]);

  return (
    <Animated.View
      // Board-serve entrance wrapper: fades + rises the whole row in on a fresh
      // board serve (staggered by rowIndex). Kept OUTSIDE the row-transition
      // wrapper so its opacity/translateY compose cleanly with the inner
      // scale/opacity/slide instead of fighting them for the same props.
      style={{
        opacity: serveOpacity,
        transform: [{ translateY: serveTranslateY }],
      }}
    >
    <Animated.View
      style={[
        styles.rowWrapper,
        // Source row with drag needs higher zIndex so floating tile renders above subsequent rows
        isSource && !!onLetterDragDrop && { zIndex: 10 },
        {
          transform: [
            { scale: Animated.multiply(scaleAnim, successBounceScale) },
            { translateX: invalidShakeX },
            { translateY: slideAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      {/* FLOATING BADGES - positioned outside row container */}
      {isSource && (
        <View style={[styles.floatingBadge, styles.floatingBadgePick, { backgroundColor: phaseColors.pickBadgeColor, shadowColor: phaseColors.pickBadgeColor }]} accessibilityLabel="Pick a letter from this row">
          <View style={styles.badgeShine} />
          <Text style={styles.badgeText}>PICK</Text>
        </View>
      )}
      {isTarget && selectedLetter && (
        <View style={[styles.floatingBadge, styles.floatingBadgeDrop, { backgroundColor: phaseColors.dropBadgeColor, shadowColor: phaseColors.dropBadgeColor }]} accessibilityLabel="Drop the letter into this row">
          <View style={styles.badgeShine} />
          <Text style={styles.badgeText}>DROP</Text>
        </View>
      )}
      {isCompleted && (
        <View style={styles.floatingCheckBadge}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}

      {/* Outer glow for source row */}
      {isSource && (
        <Animated.View
          style={[
            styles.rowGlow,
            { opacity: glowOpacity, backgroundColor: phaseColors.glowColor },
          ]}
        />
      )}

      <View ref={onMeasureRef ? stableMeasureRef : undefined} style={[styles.rowContainer, getRowStyle()]}>
        {/* Decorative elements for active row */}
        {isSource && (
          <>
            <View style={styles.rowShineLeft} />
            <View style={styles.rowShineRight} />
          </>
        )}

        {/* Content area */}
        <View style={[styles.contentWrapper, arcMounted && styles.contentWrapperArc, isSource && !!onLetterDragDrop && styles.contentWrapperDraggable]}>
          {arcMounted ? (
            // Arc layout for DROP row - letters overflow container. While the
            // fan is collapsing (showSlots already false) the slots are inert.
            <View style={styles.arcRow} pointerEvents={showSlots ? 'auto' : 'none'}>
              {renderArcContent()}
            </View>
          ) : (
            // Standard centered layout for other rows
            <View style={styles.lettersContainer}>
              {renderContent()}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
    </Animated.View>
  );
});
Row.displayName = 'Row';

const styles = StyleSheet.create({
  rowWrapper: {
    marginVertical: 6,
    marginHorizontal: ROW_HORIZONTAL_MARGIN,
    position: 'relative',
    overflow: 'visible', // Allow fan content to pop out
    zIndex: 1,
  },
  rowGlow: {
    position: 'absolute',
    top: 4, // Adjusted for floating badge space
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 32,
    backgroundColor: CandyColors.purple.main,
  },
  rowContainer: {
    marginTop: 16, // Space for floating badge
    borderRadius: 24,
    position: 'relative',
    overflow: 'visible', // Allow content to overflow
  },

  // Content wrapper
  contentWrapper: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    paddingVertical: 16,
    paddingHorizontal: ROW_PADDING,
  },
  contentWrapperArc: {
    overflow: 'visible', // Allow letters to pop OUT of container
  },
  contentWrapperDraggable: {
    overflow: 'visible', // Allow floating drag tile to escape container bounds
  },
  lettersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Arc layout for DROP row - content overflows upward
  arcRow: {
    flexDirection: 'row',
    alignItems: 'center', // Center vertically - slots and letters aligned
    justifyContent: 'center',
    // No extra padding - container stays same size, content overflows
  },
  arcLetterWrapper: {
    marginHorizontal: ARC_LETTER_MARGIN_H, // 10% more separation than before (-5 -> -3)
  },
  arcSlotWrapper: {
    marginHorizontal: ARC_SLOT_MARGIN_H, // Minimal gap - slots nestle between letters
    zIndex: 10, // Bring slots to front (on top of letters)
  },

  // Row variants
  rowSource: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 3,
    borderColor: CandyColors.purple.light,
    shadowColor: CandyColors.purple.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  rowTarget: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 3,
    borderColor: CandyColors.pink.light,
    borderStyle: 'dashed',
    shadowColor: CandyColors.pink.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  rowGuidedTarget: {
    backgroundColor: 'rgba(255, 246, 180, 0.35)',
    borderWidth: 2,
    borderColor: CandyColors.yellow.main,
    borderStyle: 'dashed',
    shadowColor: CandyColors.yellow.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  rowCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rowFuture: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Shine effects
  rowShineLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  rowShineRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },

  // FLOATING Badge styles - positioned outside row
  floatingBadge: {
    position: 'absolute',
    left: 12,
    top: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 20,
    overflow: 'hidden',
  },
  floatingBadgePick: {
    backgroundColor: CandyColors.purple.main,
    shadowColor: CandyColors.purple.main,
    transform: [{ rotate: '-3deg' }],
  },
  floatingBadgeDrop: {
    backgroundColor: CandyColors.pink.main,
    shadowColor: CandyColors.pink.main,
    transform: [{ rotate: '2deg' }],
  },
  badgeShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  badgeText: {
    fontFamily: PIXEL_FONT_BOLD,
    color: CandyColors.white,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Check badge for completed
  floatingCheckBadge: {
    position: 'absolute',
    left: 12,
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: CandyColors.green.main,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: CandyColors.green.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 20,
  },
  checkText: {
    fontFamily: PIXEL_FONT_BOLD,
    color: CandyColors.white,
    fontSize: 14,
    fontWeight: '900',
  },

  // Slot styles
  slotOuter: {
    marginHorizontal: 2,
  },
  slotGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderTopLeftRadius: 9, // Match trapezoid shape
    borderTopRightRadius: 9,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    backgroundColor: CandyColors.pink.main,
  },
  guidedSlotHalo: {
    // Colors (borderColor/backgroundColor/shadowColor) are phase-aware — see
    // getGuideGlowConfig, applied inline at the JSX call site.
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 16,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  slot: {
    width: 28,
    height: 56,
    borderWidth: 2,
    borderColor: CandyColors.pink.light,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  slotCompact: {
    width: ARC_SLOT_RENDERED_WIDTH, // Slightly wider than SLOT_WIDTH for trapezoid visibility
    height: SLOT_HEIGHT,
    borderTopLeftRadius: 6, // Rounded top corners
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 3, // Smaller bottom corners for taper
    borderBottomRightRadius: 3,
    // Transform to create upside-down trapezoid effect (wider top, narrower bottom)
    transform: [
      { perspective: 120 }, // Closer perspective for more pronounced effect
      { rotateX: '18deg' }, // More tilt to make top visibly wider than bottom
    ],
  },
  slotShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderTopLeftRadius: 8, // Match compact slot top radius
    borderTopRightRadius: 8,
  },
  // Single drop-hint dot. A plain View child of the flex-centered slot, so it
  // is geometrically centered with no font metrics involved (replaces the old
  // two-bar plus glyph, which stacked with the guided arrow and read as a
  // misaligned cross over a down arrow).
  dropDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.55,
    backgroundColor: CandyColors.pink.main,
  },
  dropDotCompact: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cornerDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: CandyColors.pink.light,
  },
  cornerTopLeft: {
    top: 4,
    left: 4,
  },
  cornerTopRight: {
    top: 4,
    right: 4,
  },
  cornerBottomLeft: {
    bottom: 4,
    left: 4,
  },
  cornerBottomRight: {
    bottom: 4,
    right: 4,
  },
  slotGuideText: {
    fontFamily: PIXEL_FONT_BOLD,
    position: 'absolute',
    fontSize: 18,
    lineHeight: 18,
    textAlign: 'center',
    includeFontPadding: false, // Android: strip font padding so the arrow truly centers
    fontWeight: '900',
    color: CandyColors.orange.main,
  },
  slotPreviewContainer: {
    position: 'absolute',
    bottom: -18,
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  // The dark scrim chip that backs the preview word — a single dark tint that
  // becomes the controlled background so light inks read at >=4.5:1 regardless
  // of the phase or the translucent target-row fill behind it.
  slotPreviewChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: 'rgba(16, 10, 34, 0.62)',
    maxWidth: 60,
  },
  slotPreviewText: {
    // Same face at every size (F5) — was PIXEL_FONT_BOLD (the chrome sans) at
    // standard width and BODY_FONT at compact, so the preview visibly changed
    // typeface the moment a word crossed 6 letters.
    fontFamily: BODY_FONT_BOLD,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  slotPreviewTextCompact: {
    fontSize: 9,
  },
  // Light inks on the dark chip. Valid/invalid stays distinguished by the
  // ✓/✗ prefix + bold weight (never color alone); the hues are light tints
  // that clear 4.5:1 on the chip.
  slotPreviewValid: {
    color: '#8BF0AE',
  },
  slotPreviewValidBold: {
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '800',
  },
  slotPreviewInvalid: {
    color: '#FF9DA2',
  },
  // Neutral ghost preview (validity gate closed): ONE ink + ONE weight for
  // every slot — the valid/invalid split must never leak through color,
  // weight, or opacity when the player is meant to judge the word.
  slotPreviewNeutral: {
    color: '#EDE8F8',
  },
});

export default Row;
