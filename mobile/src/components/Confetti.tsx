import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
}

const CONFETTI_COLORS = [
  '#FF6B9D', // Hot pink
  '#C44DFF', // Purple
  '#4DAFFF', // Blue
  '#4DE8C2', // Mint
  '#FFD84D', // Gold
  '#FF8C4D', // Orange
  '#FF4D6A', // Red
  '#9D4DFF', // Violet
];

const generateConfetti = (count: number): ConfettiPiece[] => {
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i++) {
    pieces.push({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 8 + Math.random() * 12,
      rotation: Math.random() * 360,
      delay: Math.random() * 300,
    });
  }
  return pieces;
};

const ConfettiPieceComponent: React.FC<{ piece: ConfettiPiece }> = ({ piece }) => {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const wobbleAmount = 30 + Math.random() * 50;
    const fallDuration = 2000 + Math.random() * 1500;

    const animation = Animated.sequence([
      Animated.delay(piece.delay),
      Animated.parallel([
        // Pop in
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        // Fall down
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT + 100,
          duration: fallDuration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Wobble side to side
        Animated.sequence([
          ...Array(6).fill(0).map((_, i) =>
            Animated.timing(translateX, {
              toValue: (i % 2 === 0 ? 1 : -1) * wobbleAmount * (1 - i * 0.15),
              duration: fallDuration / 6,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            })
          ),
        ]),
        // Spin
        Animated.timing(rotate, {
          toValue: 3 + Math.random() * 3,
          duration: fallDuration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        // Fade out at end
        Animated.sequence([
          Animated.delay(fallDuration * 0.7),
          Animated.timing(opacity, {
            toValue: 0,
            duration: fallDuration * 0.3,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);
    animation.start();

    return () => animation.stop();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Random shape - rectangle or circle
  const isCircle = piece.id % 3 === 0;
  const isLong = piece.id % 4 === 0;

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: piece.x,
          width: isLong ? piece.size * 0.4 : piece.size,
          height: isLong ? piece.size * 1.5 : piece.size,
          backgroundColor: piece.color,
          borderRadius: isCircle ? piece.size / 2 : 2,
          transform: [
            { translateY },
            { translateX },
            { rotate: spin },
            { scale },
          ],
          opacity,
        },
      ]}
    />
  );
};

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
}

export const Confetti: React.FC<ConfettiProps> = ({ active, onComplete }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      setPieces(generateConfetti(50));
      const timeout = setTimeout(() => {
        onComplete?.();
      }, 3500);
      return () => clearTimeout(timeout);
    } else {
      setPieces([]);
    }
  }, [active]);

  if (!active || pieces.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPieceComponent key={piece.id} piece={piece} />
      ))}
    </View>
  );
};

// Star burst effect for successful moves
interface StarBurstProps {
  active: boolean;
  x: number;
  y: number;
}

export const StarBurst: React.FC<StarBurstProps> = ({ active, x, y }) => {
  const stars = useRef(
    Array(8).fill(0).map((_, i) => ({
      scale: new Animated.Value(0),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(1),
      angle: (i / 8) * Math.PI * 2,
    }))
  ).current;

  useEffect(() => {
    if (active) {
      stars.forEach((star, i) => {
        star.scale.setValue(0);
        star.translateX.setValue(0);
        star.translateY.setValue(0);
        star.opacity.setValue(1);

        const distance = 40 + Math.random() * 30;

        Animated.parallel([
          Animated.sequence([
            Animated.spring(star.scale, {
              toValue: 1,
              friction: 4,
              tension: 200,
              useNativeDriver: true,
            }),
            Animated.timing(star.scale, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(star.translateX, {
            toValue: Math.cos(star.angle) * distance,
            duration: 500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(star.translateY, {
            toValue: Math.sin(star.angle) * distance,
            duration: 500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(300),
            Animated.timing(star.opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
    }
  }, [active]);

  if (!active) return null;

  return (
    <View style={[styles.starBurstContainer, { left: x - 50, top: y - 50 }]} pointerEvents="none">
      {stars.map((star, i) => (
        <Animated.View
          key={i}
          style={[
            styles.star,
            {
              transform: [
                { translateX: star.translateX },
                { translateY: star.translateY },
                { scale: star.scale },
              ],
              opacity: star.opacity,
            },
          ]}
        >
          <View style={styles.starInner} />
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    top: 0,
  },
  starBurstContainer: {
    position: 'absolute',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  star: {
    position: 'absolute',
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starInner: {
    width: 12,
    height: 12,
    backgroundColor: '#FFD700',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});

export default Confetti;
