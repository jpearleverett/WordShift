import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Letter, RowData } from '../types';
import { LetterTile } from './LetterTile';
import { CandyColors } from '../theme/colors';

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
const Slot: React.FC<{ onPress: () => void; index: number }> = ({ onPress, index }) => {
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
        <View style={styles.slot}>
          {/* Inner shimmer */}
          <View style={styles.slotShimmer} />

          {/* Plus icon */}
          <View style={styles.plusContainer}>
            <View style={styles.plusHorizontal} />
            <View style={styles.plusVertical} />
          </View>

          {/* Corner decorations */}
          <View style={[styles.cornerDot, styles.cornerTopLeft]} />
          <View style={[styles.cornerDot, styles.cornerTopRight]} />
          <View style={[styles.cornerDot, styles.cornerBottomLeft]} />
          <View style={[styles.cornerDot, styles.cornerBottomRight]} />
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

  const renderContent = () => {
    const elements: React.ReactNode[] = [];
    const letters = rowData.words;

    // Target row with slots for dropping
    if (isTarget && selectedLetter && !isProcessing) {
      elements.push(<Slot key="slot-start" onPress={() => onSlotPress(0)} index={0} />);
      letters.forEach((letter, index) => {
        elements.push(
          <LetterTile
            key={letter.id}
            letter={letter}
            highlight={letter.isLocked ? 'locked' : 'default'}
          />
        );
        elements.push(
          <Slot key={`slot-${index + 1}`} onPress={() => onSlotPress(index + 1)} index={index + 1} />
        );
      });
    } else {
      // Standard display
      letters.forEach((letter) => {
        elements.push(
          <LetterTile
            key={letter.id}
            letter={letter}
            isSelected={selectedLetter?.id === letter.id}
            isInteractable={isSource && !isProcessing && !letter.isLocked}
            highlight={letter.isLocked ? 'locked' : isSource ? 'source' : 'default'}
            onPress={() => onLetterPress(letter, rowIndex)}
          />
        );
      });
    }
    return elements;
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

        {/* Badge label for source/target */}
        {isSource && (
          <View style={[styles.badge, styles.badgePick]}>
            <View style={styles.badgeShine} />
            <Text style={styles.badgeText}>PICK</Text>
          </View>
        )}
        {isTarget && selectedLetter && (
          <View style={[styles.badge, styles.badgeDrop]}>
            <View style={styles.badgeShine} />
            <Text style={styles.badgeText}>DROP</Text>
          </View>
        )}

        {/* Progress indicator for completed */}
        {isCompleted && (
          <View style={styles.checkBadge}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        )}

        <View style={styles.lettersContainer}>
          {renderContent()}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  rowWrapper: {
    marginVertical: 6,
    marginHorizontal: 12,
  },
  rowGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 32,
    backgroundColor: CandyColors.purple.main,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  lettersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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

  // Badge styles
  badge: {
    position: 'absolute',
    left: 8,
    top: -12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
    overflow: 'hidden',
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
  badgePick: {
    backgroundColor: CandyColors.purple.main,
    shadowColor: CandyColors.purple.main,
    transform: [{ rotate: '-3deg' }],
  },
  badgeDrop: {
    backgroundColor: CandyColors.pink.main,
    shadowColor: CandyColors.pink.main,
    transform: [{ rotate: '2deg' }],
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
  checkBadge: {
    position: 'absolute',
    left: 8,
    top: -8,
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
    elevation: 4,
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
  plusHorizontal: {
    position: 'absolute',
    width: 12,
    height: 3,
    backgroundColor: CandyColors.pink.main,
    borderRadius: 2,
  },
  plusVertical: {
    position: 'absolute',
    width: 3,
    height: 12,
    backgroundColor: CandyColors.pink.main,
    borderRadius: 2,
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
