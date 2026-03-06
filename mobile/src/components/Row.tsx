import React, { useEffect, memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  cancelAnimation,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { Letter, RowData } from '../types';
import { LetterTile } from './LetterTile';
import { DraggableTile } from './DraggableTile';
import type { DragOverlaySharedValues, DragTileSnapshot } from './DragOverlayPortal';
import { CandyColors, getPhaseTheme } from '../theme/colors';
import { getSettingsSync } from '../services/settings';
import { shouldSimplifyAnimations } from '../services/deviceTier';
import { getWordPhaseTier } from '../services/localGenerator';

const ROW_HORIZONTAL_MARGIN = 12;
const ROW_PADDING = 8;

// Arc layout configuration
const ARC_ROTATION = 12; // Max rotation in degrees for edge elements (steeper fan)
const ARC_LIFT = 18; // How much center elements lift up relative to edges
const SLOT_WIDTH = 14; // Narrow slots to keep letters close together
const SLOT_HEIGHT = 52; // Height to match letter tiles vertically

/** Preview data for a single slot position */
export interface SlotPreview {
  word: string;
  isValid: boolean;
}

interface RowProps {
  rowData: RowData;
  rowIndex: number;
  activeRowIndex: number;
  moveDirection?: 'down' | 'up';
  selectedLetter: Letter | null;
  onLetterPress: (letter: Letter, rowIndex: number) => void;
  onSlotPress: (targetIndex: number, origin?: { x: number; y: number }) => void;
  isProcessing: boolean;
  phase?: number;
  wordLength?: number;
  concealLetters?: boolean;
  guidanceActive?: boolean;
  guidedLetterId?: string | null;
  guidedSlotIndex?: number | null;
  /** Incrementing signal from parent to trigger target-row invalid shake */
  invalidDropSignal?: number;
  /** Incrementing signal from parent to trigger target-row success bounce */
  successDropSignal?: number;
  /** Word previews for each slot position (only on target row when letter is selected) */
  slotPreviews?: SlotPreview[];
  /** Called when a letter tile is dragged and dropped — receives the letter, row, and drop position */
  onLetterDragDrop?: (letter: Letter, rowIndex: number, position: { x: number; y: number }) => void;
  /** Called when drag activation state changes — used to disable parent ScrollView during drag */
  onDragActiveChange?: (active: boolean) => void;
  /** Shared values for the global drag overlay (rendered at App.tsx level) */
  overlaySharedValues?: DragOverlaySharedValues;
  /** Called to set tile snapshot for the drag overlay */
  onSetDragSnapshot?: (snapshot: DragTileSnapshot | null) => void;
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
      plusColor: CandyColors.pink.main,
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
      plusColor: theme.bgPrimary,
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
      plusColor: '#7A5A8E',
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
    plusColor: '#4A3065',
    cornerDotColor: '#5A4075',
  };
}

// Animated drop slot component (memoized to prevent animation loop restarts on parent re-render)
// Fully migrated to Reanimated — all animations run on the UI thread.
const Slot: React.FC<{
  onPress: (origin?: { x: number; y: number }) => void;
  index: number;
  compact?: boolean;
  phase?: number;
  isGuided?: boolean;
  preview?: SlotPreview;
  /** Incremented when a letter successfully lands in this slot (triggers catch bounce) */
  triggerCatch?: number;
}> = memo(({ onPress, index, compact = false, phase = 0, isGuided = false, preview, triggerCatch = 0 }) => {
  const settings = getSettingsSync();
  const phaseColors = getPhaseRowColors(phase);

  // All animation values on the UI thread
  const scaleAnim = useSharedValue(settings.reducedMotion ? 1 : 0);
  const pulseAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0);
  const catchBounceAnim = useSharedValue(1);
  const previewOpacity = useSharedValue(0);
  const previewScale = useSharedValue(0.85);

  // Pop-in + decorative loops
  useEffect(() => {
    if (settings.reducedMotion) {
      scaleAnim.value = 1;
      return;
    }

    // Pop in with stagger
    scaleAnim.value = withDelay(
      index * 50,
      withSpring(1, { damping: 10, stiffness: 150 })
    );

    // Skip decorative loops on low-end devices
    if (shouldSimplifyAnimations()) {
      return () => {
        cancelAnimation(scaleAnim);
        cancelAnimation(catchBounceAnim);
      };
    }

    // Continuous pulse (UI thread loop)
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1
    );

    // Glow animation (UI thread loop)
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1
    );

    return () => {
      cancelAnimation(pulseAnim);
      cancelAnimation(glowAnim);
      cancelAnimation(scaleAnim);
    };
  }, []);

  // Catch bounce when a letter lands
  useEffect(() => {
    if (triggerCatch > 0 && !settings.reducedMotion) {
      catchBounceAnim.value = 1.2;
      catchBounceAnim.value = withSpring(1, { damping: 12, stiffness: 200 });
    }
  }, [triggerCatch, settings.reducedMotion]);

  // Animate preview appearance
  useEffect(() => {
    if (preview) {
      if (settings.reducedMotion) {
        previewOpacity.value = 1;
        previewScale.value = 1;
        return;
      }
      previewOpacity.value = 0;
      previewScale.value = 0.85;
      previewOpacity.value = withTiming(1, { duration: 200 });
      previewScale.value = withSpring(1, { damping: 12, stiffness: 220 });
    } else {
      previewOpacity.value = 0;
      previewScale.value = 0.85;
    }
  }, [preview?.word, preview?.isValid]);

  // Derived values for interpolations
  const pulseScale = useDerivedValue(() => 1 + pulseAnim.value * 0.08);
  const glowOpacityDerived = useDerivedValue(() => 0.4 + glowAnim.value * 0.4);

  const handlePressIn = useCallback(() => {
    if (settings.reducedMotion) return;
    scaleAnim.value = withSpring(0.9, { damping: 12, stiffness: 200 });
  }, [settings.reducedMotion]);

  const handlePressOut = useCallback(() => {
    if (settings.reducedMotion) return;
    scaleAnim.value = withSpring(1, { damping: 10, stiffness: 150 });
  }, [settings.reducedMotion]);

  // Combined scale: scaleAnim * catchBounceAnim
  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value * catchBounceAnim.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacityDerived.value,
  }));

  const guidedHaloStyle = useAnimatedStyle(() => ({
    opacity: glowOpacityDerived.value,
    transform: [{ scale: pulseScale.value }],
  }));

  const previewStyle = useAnimatedStyle(() => ({
    opacity: previewOpacity.value,
    transform: [{ scale: previewScale.value }],
  }));

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
      accessibilityLabel={isGuided ? `Guided drop zone ${index + 1}` : `Drop zone ${index + 1}`}
      accessibilityRole="button"
    >
      <Animated.View style={[styles.slotOuter, outerStyle]}>
        {/* Glow background */}
        <Animated.View
          style={[
            styles.slotGlow,
            {
              backgroundColor: isGuided ? CandyColors.yellow.main : phaseColors.slotGlowColor,
            },
            glowStyle,
          ]}
        />

        {isGuided && (
          <Animated.View
            style={[styles.guidedSlotHalo, guidedHaloStyle]}
            pointerEvents="none"
          />
        )}

        {/* Main slot */}
        <View
          style={[
            styles.slot,
            compact && styles.slotCompact,
            { borderColor: isGuided ? CandyColors.yellow.main : phaseColors.slotBorderColor },
            isGuided && [styles.slotGuided, { borderWidth: 3 }],
          ]}
        >
          {/* Inner shimmer */}
          <View style={styles.slotShimmer} />

          {/* Plus icon */}
          <View style={[styles.plusContainer, compact && styles.plusContainerCompact]}>
            <View style={[styles.plusHorizontal, compact && styles.plusHorizontalCompact, { backgroundColor: phaseColors.plusColor }]} />
            <View style={[styles.plusVertical, compact && styles.plusVerticalCompact, { backgroundColor: phaseColors.plusColor }]} />
          </View>

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

        {/* Word preview label — animated fade + scale */}
        {preview && (
          <Animated.View style={[styles.slotPreviewContainer, previewStyle]}>
            <Text
              style={[
                styles.slotPreviewText,
                compact && styles.slotPreviewTextCompact,
                preview.isValid ? styles.slotPreviewValid : styles.slotPreviewInvalid,
                preview.isValid && styles.slotPreviewValidBold,
              ]}
              numberOfLines={1}
            >
              {preview.word}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

/** Arc layout element — animated wrapper that smoothly transitions between flat (0) and arc (1) positions.
 * Uses Reanimated useAnimatedStyle so the arc interpolation runs on the UI thread. */
const ArcElement: React.FC<{
  arcProgress: SharedValue<number>;
  yTarget: number;
  rotTarget: number;
  wrapperStyle: ViewStyle;
  children: React.ReactNode;
}> = memo(({ arcProgress, yTarget, rotTarget, wrapperStyle, children }) => {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: arcProgress.value * yTarget },
      { rotate: `${arcProgress.value * rotTarget}deg` },
    ],
  }));

  return (
    <Animated.View style={[wrapperStyle, style]}>
      {children}
    </Animated.View>
  );
});

export const Row: React.FC<RowProps> = memo(({
  rowData,
  rowIndex,
  activeRowIndex,
  moveDirection = 'down',
  selectedLetter,
  onLetterPress,
  onSlotPress,
  isProcessing,
  phase = 0,
  wordLength = 4,
  concealLetters = false,
  guidanceActive = false,
  guidedLetterId = null,
  guidedSlotIndex = null,
  invalidDropSignal = 0,
  successDropSignal = 0,
  slotPreviews,
  onLetterDragDrop,
  onDragActiveChange,
  overlaySharedValues,
  onSetDragSnapshot,
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

  // All row-level animation values (Reanimated — UI thread)
  const rowScale = useSharedValue(isSource ? 1 : 0.9);
  const rowOpacity = useSharedValue(isSource ? 1 : 0.3);
  const rowGlow = useSharedValue(0);
  const rowSlide = useSharedValue(0);
  const arcProgress = useSharedValue(0); // 0 = flat, 1 = full arc
  const invalidShakeX = useSharedValue(0);
  const successBounceScale = useSharedValue(1);

  // Combined animated style for the row wrapper (shake + bounce + scale + opacity + slide)
  const rowWrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: rowScale.value * successBounceScale.value },
      { translateY: rowSlide.value },
      { translateX: invalidShakeX.value },
    ],
    opacity: rowOpacity.value,
  }));

  // Glow opacity derived
  const rowGlowOpacity = useDerivedValue(() => 0.3 + rowGlow.value * 0.3);
  const rowGlowStyle = useAnimatedStyle(() => ({
    opacity: rowGlowOpacity.value,
  }));

  useEffect(() => {
    // Animate row transitions — all on UI thread
    if (isSource) {
      rowScale.value = withSpring(1, { damping: 10, stiffness: 100 });
      rowOpacity.value = withTiming(1, { duration: 300 });

      // Glow pulse for active row (skip on low-end devices)
      if (!shouldSimplifyAnimations()) {
        rowGlow.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          ),
          -1
        );
      }
    } else if (isTarget) {
      const guidedTarget = guidanceActive;
      rowScale.value = withSpring(guidedTarget ? 1 : 0.98, { damping: 12 });
      rowOpacity.value = withTiming(guidedTarget ? 1 : 0.9, { duration: 300 });
    } else if (isCompleted) {
      rowScale.value = withTiming(0.92, { duration: 400, easing: Easing.out(Easing.quad) });
      rowOpacity.value = withTiming(0.4, { duration: 400 });
      rowSlide.value = withTiming(-8, { duration: 400 });
    } else {
      rowScale.value = withTiming(0.88, { duration: 300 });
      rowOpacity.value = withTiming(0.25, { duration: 300 });
    }

    return () => {
      cancelAnimation(rowGlow);
    };
  }, [isSource, isTarget, isCompleted, guidanceActive]);

  // Animate arc when slots appear/disappear - smooth glide effect
  useEffect(() => {
    if (showSlots) {
      arcProgress.value = 0;
      arcProgress.value = withTiming(1, {
        duration: 450,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      arcProgress.value = withTiming(0, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [showSlots]);

  // Micro-shake the target row on invalid drop attempts (Reanimated — UI thread).
  useEffect(() => {
    if (!isTarget || invalidDropSignal <= 0) return;
    invalidShakeX.value = withSequence(
      withTiming(7, { duration: 45 }),
      withTiming(-7, { duration: 45 }),
      withTiming(5, { duration: 40 }),
      withTiming(-5, { duration: 40 }),
      withTiming(0, { duration: 35 }),
    );
  }, [invalidDropSignal, isTarget]);

  // Brief scale bounce on the target row when a letter successfully lands (Reanimated — UI thread).
  useEffect(() => {
    if (!isTarget || successDropSignal <= 0 || getSettingsSync().reducedMotion) return;
    successBounceScale.value = 1.08;
    successBounceScale.value = withSpring(1, { damping: 14, stiffness: 200 });
  }, [successDropSignal, isTarget]);

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
  // Uses Reanimated ArcElement wrapper for UI-thread arc transforms.
  const renderArcContent = () => {
    const letters = rowData.words;
    const totalElements = letters.length * 2 + 1;
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < totalElements; i++) {
      const isSlot = i % 2 === 0;
      const { yMultiplier, rotationMultiplier } = getArcMultipliers(i, totalElements);

      if (isSlot) {
        const slotIndex = i / 2;
        elements.push(
          <ArcElement
            key={`slot-${slotIndex}`}
            arcProgress={arcProgress}
            yTarget={yMultiplier}
            rotTarget={rotationMultiplier}
            wrapperStyle={styles.arcSlotWrapper}
          >
            <Slot
              onPress={(origin) => onSlotPress(slotIndex, origin)}
              index={slotIndex}
              compact
              phase={phase}
              isGuided={guidanceActive && guidedSlotIndex === slotIndex}
              preview={slotPreviews?.[slotIndex]}
            />
          </ArcElement>
        );
      } else {
        const letterIndex = Math.floor(i / 2);
        const letter = letters[letterIndex];
        const displayLetter = (concealLetters && !isSource)
          ? { ...letter, char: '•' }
          : letter;
        elements.push(
          <ArcElement
            key={letter.id}
            arcProgress={arcProgress}
            yTarget={yMultiplier}
            rotTarget={rotationMultiplier}
            wrapperStyle={styles.arcLetterWrapper}
          >
            <LetterTile
              letter={displayLetter}
              highlight={letter.isLocked ? 'locked' : 'default'}
              phase={phase}
              compact={compactTiles}
              isResonant={isRowResonant}
              isGuided={guidanceActive && isSource && guidedLetterId === letter.id}
            />
          </ArcElement>
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
          key={canDrag ? undefined : letter.id}
          letter={displayLetter}
          isSelected={selectedLetter?.id === letter.id}
          isInteractable={isSource && !isProcessing && !letter.isLocked}
          highlight={letter.isLocked ? 'locked' : isSource ? 'source' : 'default'}
          onPress={canDrag ? undefined : () => onLetterPress(letter, rowIndex)}
          phase={phase}
          compact={compactTiles}
          isResonant={isRowResonant}
          isGuided={guidanceActive && isSource && guidedLetterId === letter.id}
        />
      );

      if (canDrag) {
        return (
          <DraggableTile
            key={letter.id}
            enabled={!isProcessing}
            onDragStart={() => {
              if (!selectedLetter || selectedLetter.id !== letter.id) {
                onLetterPress(letter, rowIndex);
              }
            }}
            onDragEnd={(pos) => onLetterDragDrop!(letter, rowIndex, pos)}
            onTap={() => onLetterPress(letter, rowIndex)}
            phase={phase}
            onDragActiveChange={onDragActiveChange}
            overlaySharedValues={overlaySharedValues}
            onSetDragSnapshot={onSetDragSnapshot}
            letterChar={letter.char}
            compact={compactTiles}
          >
            {tile}
          </DraggableTile>
        );
      }

      return tile;
    });
  };

  const getRowStyle = () => {
    if (isSource) return [styles.rowSource, { borderColor: phaseColors.sourceBorderColor, shadowColor: phaseColors.sourceShadowColor }];
    if (isTarget && selectedLetter) return [styles.rowTarget, { borderColor: phaseColors.targetBorderColor, shadowColor: phaseColors.targetShadowColor }];
    if (isTarget && guidanceActive) return styles.rowGuidedTarget;
    if (isCompleted) return styles.rowCompleted;
    return styles.rowFuture;
  };

  return (
    <Animated.View
      style={[
        styles.rowWrapper,
        // Source row with drag needs higher zIndex so floating tile renders above subsequent rows
        isSource && !!onLetterDragDrop && { zIndex: 10 },
        rowWrapperStyle,
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
            { backgroundColor: phaseColors.glowColor },
            rowGlowStyle,
          ]}
        />
      )}

      <View style={[styles.rowContainer, getRowStyle()]}>
        {/* Decorative elements for active row */}
        {isSource && (
          <>
            <View style={styles.rowShineLeft} />
            <View style={styles.rowShineRight} />
          </>
        )}

        {/* Content area */}
        <View style={[styles.contentWrapper, showSlots && styles.contentWrapperArc, isSource && !!onLetterDragDrop && styles.contentWrapperDraggable]}>
          {showSlots ? (
            // Arc layout for DROP row - letters overflow container
            <View style={styles.arcRow}>
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
  );
});

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
    marginHorizontal: -3, // 10% more separation than before (-5 -> -3)
  },
  arcSlotWrapper: {
    marginHorizontal: -1, // Minimal gap - slots nestle between letters
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
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: CandyColors.yellow.main,
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    shadowColor: CandyColors.yellow.main,
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
  slotGuided: {
    backgroundColor: 'rgba(255, 230, 100, 0.95)',
  },
  slotCompact: {
    width: SLOT_WIDTH + 4, // Slightly wider for trapezoid visibility
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
  plusContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusContainerCompact: {
    width: 10,
    height: 10,
  },
  plusHorizontal: {
    position: 'absolute',
    width: 12,
    height: 3,
    backgroundColor: CandyColors.pink.main,
    borderRadius: 2,
  },
  plusHorizontalCompact: {
    width: 8,
    height: 2,
  },
  plusVertical: {
    position: 'absolute',
    width: 3,
    height: 12,
    backgroundColor: CandyColors.pink.main,
    borderRadius: 2,
  },
  plusVerticalCompact: {
    width: 2,
    height: 8,
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
    position: 'absolute',
    fontSize: 18,
    fontWeight: '900',
    color: CandyColors.orange.main,
  },
  slotPreviewContainer: {
    position: 'absolute',
    bottom: -16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  slotPreviewText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  slotPreviewTextCompact: {
    fontSize: 9,
  },
  slotPreviewValid: {
    color: CandyColors.green.main,
    opacity: 0.85,
  },
  slotPreviewValidBold: {
    fontWeight: '800',
  },
  slotPreviewInvalid: {
    color: CandyColors.red.light,
    opacity: 0.45,
  },
});

export default Row;
