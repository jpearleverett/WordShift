import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Letter, RowData } from '../types';
import { LetterTile } from './LetterTile';
import { CandyColors } from '../theme/colors';

const ROW_HORIZONTAL_MARGIN = 12;
const ROW_PADDING = 8;

// Fan layout configuration - dramatic card-spread effect
const FAN_ROTATION = 12; // Max rotation in degrees for edge letters
const FAN_LIFT = 20; // How much center letters lift up
const COMPACT_TILE_SCALE = 0.72; // Scale down tiles in DROP row
const COMPACT_SLOT_WIDTH = 24; // Slot width
const SLOT_VERTICAL_OFFSET = 28; // Push slots down into the gaps

interface RowProps {
  rowData: RowData;
  rowIndex: number;
  activeRowIndex: number;
  selectedLetter: Letter | null;
  onLetterPress: (letter: Letter, rowIndex: number) => void;
  onSlotPress: (targetIndex: number) => void;
  isProcessing: boolean;
}

// Animated drop slot component
const Slot: React.FC<{ onPress: () => void; index: number; compact?: boolean }> = ({ onPress, index, compact = false }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

    // Continuous pulse
    Animated.loop(
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
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    ).start();

    return () => {
      scaleAnim.stopAnimation();
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
    };
  }, []);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.slotOuter,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseScale) },
            ],
          },
        ]}
      >
        {/* Glow background */}
        <Animated.View
          style={[
            styles.slotGlow,
            { opacity: glowOpacity },
          ]}
        />

        {/* Main slot */}
        <View style={[styles.slot, compact && styles.slotCompact]}>
          {/* Inner shimmer */}
          <View style={styles.slotShimmer} />

          {/* Plus icon */}
          <View style={[styles.plusContainer, compact && styles.plusContainerCompact]}>
            <View style={[styles.plusHorizontal, compact && styles.plusHorizontalCompact]} />
            <View style={[styles.plusVertical, compact && styles.plusVerticalCompact]} />
          </View>

          {/* Corner decorations - hide in compact mode */}
          {!compact && (
            <>
              <View style={[styles.cornerDot, styles.cornerTopLeft]} />
              <View style={[styles.cornerDot, styles.cornerTopRight]} />
              <View style={[styles.cornerDot, styles.cornerBottomLeft]} />
              <View style={[styles.cornerDot, styles.cornerBottomRight]} />
            </>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const Row: React.FC<RowProps> = ({
  rowData,
  rowIndex,
  activeRowIndex,
  selectedLetter,
  onLetterPress,
  onSlotPress,
  isProcessing,
}) => {
  const isSource = rowIndex === activeRowIndex;
  const isTarget = rowIndex === activeRowIndex + 1;
  const isCompleted = rowIndex < activeRowIndex;
  const showSlots = isTarget && selectedLetter && !isProcessing;

  // Animation values
  const scaleAnim = useRef(new Animated.Value(isSource ? 1 : 0.9)).current;
  const opacityAnim = useRef(new Animated.Value(isSource ? 1 : 0.3)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

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

      // Glow pulse for active row
      Animated.loop(
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
      ).start();
    } else if (isTarget) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.98,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.9,
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
      glowAnim.stopAnimation();
    };
  }, [isSource, isTarget, isCompleted]);

  // Calculate fan positions for letters (card-spread effect)
  const calculateLetterFanPosition = (index: number, totalLetters: number) => {
    // Position from -1 to 1 (left to right)
    const normalizedPos = totalLetters > 1
      ? (index / (totalLetters - 1)) * 2 - 1
      : 0;

    // Fan rotation - edges rotate outward, center stays straight
    const rotation = normalizedPos * FAN_ROTATION;

    // Inverted parabola - center lifts UP, edges stay down
    // y = -(1 - x^2) so center is highest
    const yOffset = (normalizedPos * normalizedPos - 1) * FAN_LIFT;

    return { yOffset, rotation };
  };

  // Calculate slot positions (in the diagonal gaps between fanned letters)
  const calculateSlotPosition = (slotIndex: number, totalLetters: number) => {
    // Slots go between letters, so position them at the midpoints
    // slotIndex 0 = before first letter, slotIndex N = after last letter
    const totalSlots = totalLetters + 1;
    const normalizedPos = totalSlots > 1
      ? (slotIndex / (totalSlots - 1)) * 2 - 1
      : 0;

    // Slots rotate to match the gap angle between adjacent letters
    const rotation = normalizedPos * (FAN_ROTATION * 0.8);

    // Slots sit lower in the gaps - pushed down
    const yOffset = SLOT_VERTICAL_OFFSET + Math.abs(normalizedPos) * 8;

    return { yOffset, rotation };
  };

  // Render fan layout for DROP row - letters fan out, slots in gaps
  const renderFanContent = () => {
    const letters = rowData.words;
    const totalLetters = letters.length;

    // Render letters in a fan arrangement
    const letterElements = letters.map((letter, idx) => {
      const pos = calculateLetterFanPosition(idx, totalLetters);
      return (
        <Animated.View
          key={letter.id}
          style={[
            styles.fanLetterElement,
            {
              transform: [
                { translateY: pos.yOffset },
                { rotate: `${pos.rotation}deg` },
                { scale: COMPACT_TILE_SCALE },
              ],
            },
          ]}
        >
          <LetterTile
            letter={letter}
            highlight={letter.isLocked ? 'locked' : 'default'}
          />
        </Animated.View>
      );
    });

    // Render slots positioned in the gaps between letters
    const slotElements = [];
    for (let i = 0; i <= totalLetters; i++) {
      const pos = calculateSlotPosition(i, totalLetters);
      slotElements.push(
        <Animated.View
          key={`slot-${i}`}
          style={[
            styles.fanSlotElement,
            {
              transform: [
                { translateY: pos.yOffset },
                { rotate: `${pos.rotation}deg` },
              ],
            },
          ]}
        >
          <Slot onPress={() => onSlotPress(i)} index={i} compact />
        </Animated.View>
      );
    }

    return (
      <>
        {/* Slots layer (behind letters) */}
        <View style={styles.slotsLayer}>
          {slotElements}
        </View>
        {/* Letters layer (in front) */}
        <View style={styles.lettersLayer}>
          {letterElements}
        </View>
      </>
    );
  };

  const renderContent = () => {
    const letters = rowData.words;

    // Standard display for non-target rows
    return letters.map((letter) => (
      <LetterTile
        key={letter.id}
        letter={letter}
        isSelected={selectedLetter?.id === letter.id}
        isInteractable={isSource && !isProcessing && !letter.isLocked}
        highlight={letter.isLocked ? 'locked' : isSource ? 'source' : 'default'}
        onPress={() => onLetterPress(letter, rowIndex)}
      />
    ));
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const getRowStyle = () => {
    if (isSource) return styles.rowSource;
    if (isTarget && selectedLetter) return styles.rowTarget;
    if (isCompleted) return styles.rowCompleted;
    return styles.rowFuture;
  };

  return (
    <Animated.View
      style={[
        styles.rowWrapper,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      {/* FLOATING BADGES - positioned outside row container */}
      {isSource && (
        <View style={[styles.floatingBadge, styles.floatingBadgePick]}>
          <View style={styles.badgeShine} />
          <Text style={styles.badgeText}>PICK</Text>
        </View>
      )}
      {isTarget && selectedLetter && (
        <View style={[styles.floatingBadge, styles.floatingBadgeDrop]}>
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
            { opacity: glowOpacity },
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
        <View style={[styles.contentWrapper, showSlots && styles.contentWrapperFan]}>
          {showSlots ? (
            // Fan layout for DROP row - letters pop out, slots in gaps
            <View style={styles.fanContainer}>
              {renderFanContent()}
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
};

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
  contentWrapperFan: {
    overflow: 'visible', // Allow letters to pop out!
  },
  lettersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Fan layout for DROP row - dramatic card spread
  fanContainer: {
    position: 'relative',
    height: 70, // Fixed height - content overflows
    marginHorizontal: 20, // Extra margin for edge slots
  },
  lettersLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 2,
  },
  slotsLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 1,
  },
  fanLetterElement: {
    marginHorizontal: -6, // Overlap letters slightly at bottom
    transformOrigin: 'center bottom', // Pivot from bottom for fan effect
  },
  fanSlotElement: {
    marginHorizontal: 4,
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
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 14,
    backgroundColor: CandyColors.pink.main,
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
    width: COMPACT_SLOT_WIDTH,
    height: 44,
    borderRadius: 10,
  },
  slotShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  plusContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusContainerCompact: {
    width: 12,
    height: 12,
  },
  plusHorizontal: {
    position: 'absolute',
    width: 12,
    height: 3,
    backgroundColor: CandyColors.pink.main,
    borderRadius: 2,
  },
  plusHorizontalCompact: {
    width: 10,
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
    height: 10,
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
});

export default Row;
