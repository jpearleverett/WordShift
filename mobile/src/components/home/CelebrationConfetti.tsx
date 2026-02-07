import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  color: string;
}

export const CelebrationConfetti: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3'];
    const newPieces: ConfettiPiece[] = [];

    for (let i = 0; i < 30; i++) {
      const startX = SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 100;
      const piece: ConfettiPiece = {
        id: i,
        x: new Animated.Value(startX),
        y: new Animated.Value(SCREEN_HEIGHT / 2),
        rotation: new Animated.Value(0),
        scale: new Animated.Value(0),
        opacity: new Animated.Value(1),
        color: colors[Math.floor(Math.random() * colors.length)],
      };
      newPieces.push(piece);

      const targetX = startX + (Math.random() - 0.5) * 300;
      const targetY = SCREEN_HEIGHT + 100;

      Animated.parallel([
        Animated.timing(piece.x, {
          toValue: targetX,
          duration: 2000 + Math.random() * 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(piece.y, {
          toValue: targetY,
          duration: 2000 + Math.random() * 1000,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(piece.rotation, {
          toValue: Math.random() * 720 - 360,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(piece.scale, {
            toValue: 1 + Math.random() * 0.5,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.timing(piece.opacity, {
            toValue: 0,
            duration: 500,
            delay: 1500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }

    setPieces(newPieces);

    const timeout = setTimeout(onComplete, 2500);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map(piece => {
        const rotate = piece.rotation.interpolate({
          inputRange: [-360, 360],
          outputRange: ['-360deg', '360deg'],
        });
        return (
          <Animated.View
            key={piece.id}
            style={[
              styles.piece,
              {
                backgroundColor: piece.color,
                transform: [
                  { translateX: piece.x },
                  { translateY: piece.y },
                  { rotate },
                  { scale: piece.scale },
                ],
                opacity: piece.opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  piece: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});
