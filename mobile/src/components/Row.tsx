import React, { useEffect, useRef, memo } from 'react';
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
import { LetterTile } from './LetterTile';
import { DraggableTile } from './DraggableTile';
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

// Animated drop slot component
const Slot: React.FC<{
  onPress: (origin?: { x: number; y: number }) => void;
  index: number;
  compact?: boolean;
  phase?: number;
  isGuided?: boolean;
  preview?: SlotPreview;
  /** Incremented when a letter successfully lands in this slot (triggers catch bounce) */
  triggerCatch?: number;
}> = ({ onPress, index, compact = false, phase = 0, isGuided = false, preview, triggerCatch = 0 }) => {
  const settings = getSettingsSync();
  const phaseColors = getPhaseRowColors(phase);
  const scaleAnim = useRef(new Animated.Value(settings.reducedMotion ? 1 : 0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const catchBounceAnim = useRef(new Animated.Value(1)).current;
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
      return () => { scaleAnim.stopAnimation(); catchBounceAnim.stopAnimation(); };
    }

    // Continuous pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
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
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1000,
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

  // Catch bounce when a letter lands
  useEffect(() => {
    if (triggerCatch > 0 && !settings.reducedMotion) {
      catchBounceAnim.setValue(1.2);
      Animated.spring(catchBounceAnim, {
        toValue: 1,
        friction: 5,
        tension: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [triggerCatch, settings.reducedMotion]);

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
      accessibilityLabel={isGuided ? `Guided drop zone ${index + 1}` : `Drop zone ${index + 1}`}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          styles.slotOuter,
          {
            transform: [
              { scale: Animated.multiply(Animated.multiply(scaleAnim, pulseScale), catchBounceAnim) },
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
              backgroundColor: isGuided ? CandyColors.yellow.main : phaseColors.slotGlowColor,
            },
          ]}
        />

        {isGuided && (
          <Animated.View
            style={[
              styles.guidedSlotHalo,
              {
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
          <Animated.View style={[styles.slotPreviewContainer, {
            opacity: previewOpacity,
            transform: [{ scale: previewScale }],
          }]}>
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
};

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
  const invalidShakeX = useRef(new Animated.Value(0)).current;
  const successBounceScale = useRef(new Animated.Value(1)).current;
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);

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

      // Glow pulse for active row (skip on low-end devices)
      if (!shouldSimplifyAnimations()) {
        glowLoopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
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

  // Animate arc when slots appear/disappear - smooth glide effect
  // Depends on both showSlots AND selectedLetter to replay animation on each selection
  useEffect(() => {
    if (showSlots) {
      // Reset to 0 first, then animate to 1 - ensures animation replays each time
      arcAnim.setValue(0);
      Animated.timing(arcAnim, {
        toValue: 1,
        duration: 450, // Visible glide animation
        easing: Easing.out(Easing.cubic), // Smooth deceleration
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(arcAnim, {
        toValue: 0,
        duration: 300, // Faster collapse
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showSlots, selectedLetter?.id]);

  // Micro-shake the target row on invalid drop attempts.
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
  useEffect(() => {
    if (!isTarget || successDropSignal <= 0 || getSettingsSync().reducedMotion) return;
    successBounceScale.setValue(1.08);
    Animated.spring(successBounceScale, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [successDropSignal, isTarget, successBounceScale]);

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
              { transform: [{ translateY }, { rotate }] },
            ]}
          >
            <Slot
              onPress={(origin) => onSlotPress(slotIndex, origin)}
              index={slotIndex}
              compact
              phase={phase}
              isGuided={guidanceActive && guidedSlotIndex === slotIndex}
              preview={slotPreviews?.[slotIndex]}
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
              isGuided={guidanceActive && isSource && guidedLetterId === letter.id}
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
          >
            {tile}
          </DraggableTile>
        );
      }

      return tile;
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

  return (
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
