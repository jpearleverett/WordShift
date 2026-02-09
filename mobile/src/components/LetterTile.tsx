import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Letter } from '../types';
import { getTileColor, CandyColors } from '../theme/colors';
import { getSettingsSync } from '../services/settings';

interface LetterTileProps {
  letter: Letter;
  onPress?: () => void;
  isSelected?: boolean;
  isInteractable?: boolean;
  highlight?: 'default' | 'source' | 'locked';
}

export const LetterTile: React.FC<LetterTileProps> = ({
  letter,
  onPress,
  isSelected,
  isInteractable,
  highlight = 'default',
}) => {
  const settings = getSettingsSync();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;
  const wobbleAnim = useRef(new Animated.Value(0)).current;

  // Get consistent color based on letter
  const tileColor = getTileColor(letter.char);

  // Idle animation for interactable tiles
  useEffect(() => {
    if (settings.reducedMotion) return;
    if (isInteractable && !isSelected) {
      // Subtle pulse glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      ).start();

      // Shine sweep animation
      Animated.loop(
        Animated.sequence([
          Animated.delay(2000),
          Animated.timing(shineAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(shineAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
      shineAnim.setValue(0);
    }

    return () => {
      glowAnim.stopAnimation();
      shineAnim.stopAnimation();
    };
  }, [isInteractable, isSelected]);

  // Selected bounce animation
  useEffect(() => {
    if (settings.reducedMotion) {
      scaleAnim.setValue(isSelected ? 1.08 : 1);
      bounceAnim.setValue(0);
      wobbleAnim.setValue(0);
      return;
    }
    if (isSelected) {
      // Initial pop
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.08,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous wobble
      Animated.loop(
        Animated.sequence([
          Animated.timing(wobbleAnim, {
            toValue: 1,
            duration: 150,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: -1,
            duration: 300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: 0,
            duration: 150,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Floating bounce
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -4,
            duration: 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
      bounceAnim.setValue(0);
      wobbleAnim.setValue(0);
    }

    return () => {
      scaleAnim.stopAnimation();
      bounceAnim.stopAnimation();
      wobbleAnim.stopAnimation();
    };
  }, [isSelected]);

  const handlePressIn = () => {
    if (settings.reducedMotion) return;
    if (isInteractable || isSelected) {
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        friction: 5,
        tension: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (settings.reducedMotion) return;
    if (isInteractable || isSelected) {
      Animated.spring(scaleAnim, {
        toValue: isSelected ? 1.08 : 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const getStyles = () => {
    if (highlight === 'locked') {
      return {
        bgColor: CandyColors.gray[300],
        borderColor: CandyColors.gray[400],
        textColor: CandyColors.gray[500],
        shadowColor: CandyColors.gray[400],
      };
    }
    if (isSelected) {
      return {
        bgColor: CandyColors.pink.main,
        borderColor: CandyColors.pink.shadow,
        textColor: CandyColors.white,
        shadowColor: CandyColors.pink.main,
      };
    }
    if (isInteractable && highlight === 'source') {
      return {
        bgColor: tileColor.bg,
        borderColor: tileColor.border,
        textColor: CandyColors.white,
        shadowColor: tileColor.bg,
      };
    }
    return {
      bgColor: CandyColors.white,
      borderColor: CandyColors.gray[300],
      textColor: CandyColors.gray[600],
      shadowColor: CandyColors.gray[400],
    };
  };

  const tileStyles = getStyles();
  const isClickable = (isInteractable || isSelected) && onPress;

  // Animated glow intensity
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  // Shine sweep position
  const shineTranslate = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 60],
  });

  // Wobble rotation
  const wobbleRotate = wobbleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-3deg', '0deg', '3deg'],
  });

  const content = (
    <Animated.View
      style={[
        styles.tileOuter,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: bounceAnim },
            { rotate: isSelected ? wobbleRotate : '0deg' },
          ],
        },
      ]}
    >
      {/* Outer glow for interactable/selected */}
      {(isInteractable || isSelected) && highlight !== 'locked' && (
        <Animated.View
          style={[
            styles.glowOuter,
            {
              backgroundColor: tileStyles.shadowColor,
              opacity: isSelected ? 0.6 : glowOpacity,
            },
          ]}
        />
      )}

      {/* Main tile body */}
      <View
        style={[
          styles.tileBody,
          {
            backgroundColor: tileStyles.bgColor,
            borderBottomColor: tileStyles.borderColor,
            shadowColor: tileStyles.shadowColor,
          },
          isSelected && styles.tileBodySelected,
          highlight === 'locked' && styles.tileBodyLocked,
        ]}
      >
        {/* Top highlight (bevel effect) */}
        <View style={styles.bevelTop} />

        {/* Glossy shine overlay */}
        <View style={styles.glossyShine} />

        {/* Letter text with shadow */}
        <Text
          style={[
            styles.letterText,
            { color: tileStyles.textColor },
            isSelected && styles.letterTextSelected,
          ]}
        >
          {letter.char}
        </Text>

        {/* Specular highlight dot */}
        {highlight !== 'locked' && (
          <View style={styles.specularDot} />
        )}

        {/* Moving shine effect */}
        {isInteractable && !isSelected && (
          <Animated.View
            style={[
              styles.shineSweep,
              {
                transform: [{ translateX: shineTranslate }],
              },
            ]}
          />
        )}

        {/* Subtle lock overlay for locked tiles */}
        {highlight === 'locked' && (
          <View style={styles.lockOverlay} />
        )}
      </View>

      {/* 3D bottom edge */}
      <View
        style={[
          styles.tileEdge,
          { backgroundColor: tileStyles.borderColor },
          highlight === 'locked' && styles.tileEdgeLocked,
        ]}
      />
    </Animated.View>
  );

  if (isClickable) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityLabel={`Letter ${letter.char}${letter.isLocked ? ', locked' : ''}`}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  tileOuter: {
    width: 52,
    height: 64,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  glowOuter: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 6,
    borderRadius: 14,
    transform: [{ scale: 1.15 }],
  },
  tileBody: {
    width: 52,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    overflow: 'hidden',
  },
  tileBodySelected: {
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  tileBodyLocked: {
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tileEdge: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    right: 4,
    height: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: -1,
  },
  tileEdgeLocked: {
    height: 6,
  },
  bevelTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  glossyShine: {
    position: 'absolute',
    top: 4,
    left: 6,
    right: 6,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 8,
  },
  letterText: {
    fontSize: 26,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
    zIndex: 10,
  },
  letterTextSelected: {
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  specularDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 4,
  },
  shineSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
});

export default LetterTile;
