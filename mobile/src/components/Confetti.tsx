import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { getSettingsSync } from '../services/settings';
import { getPhaseTheme } from '../theme/colors';
import { getMaxConfettiCount } from '../services/deviceTier';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
}

const generateConfetti = (count: number, colors?: string[]): ConfettiPiece[] => {
  const confettiColors = colors || getPhaseTheme(0).confettiColors;
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.random() * SCREEN_WIDTH;
    const distFromCenter = Math.abs(x - SCREEN_WIDTH / 2) / (SCREEN_WIDTH / 2);
    pieces.push({
      id: i,
      x,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      size: 8 + Math.random() * 12,
      rotation: Math.random() * 360,
      delay: distFromCenter * 400 + Math.random() * 100,
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

    const anim = Animated.sequence([
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
    anim.start();
    return () => anim.stop();
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
  phase?: number;
  /** Ritual energy of the completed puzzle — scales confetti density */
  ritualEnergy?: number;
}

export const Confetti: React.FC<ConfettiProps> = ({ active, onComplete, phase = 0, ritualEnergy = 0 }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      // Skip confetti animation if reduced motion is enabled
      if (getSettingsSync().reducedMotion) {
        onComplete?.();
        return;
      }
      const theme = getPhaseTheme(phase);
      const baseCount = getMaxConfettiCount();
      // Scale confetti density with ritual energy
      const energyBonus = ritualEnergy >= 7 ? Math.floor(baseCount * 0.4) : ritualEnergy >= 4 ? Math.floor(baseCount * 0.2) : 0;
      setPieces(generateConfetti(baseCount + energyBonus, theme.confettiColors));
      // Max animation time: up to 500ms delay + 3500ms fall = 4000ms
      const timeout = setTimeout(() => {
        onComplete?.();
      }, 4200);
      return () => clearTimeout(timeout);
    } else {
      setPieces([]);
    }
  }, [active, onComplete, phase, ritualEnergy]);

  if (!active || pieces.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPieceComponent key={piece.id} piece={piece} />
      ))}
    </View>
  );
};

// Star burst effect for successful moves — colors shift with narrative phase
const STAR_BURST_COLORS: Record<number, { bg: string; shadow: string }> = {
  0: { bg: '#FFD700', shadow: '#FFD700' },
  1: { bg: '#F0C050', shadow: '#D4A030' },
  2: { bg: '#B088D0', shadow: '#8B5FB0' },
  3: { bg: '#9050B0', shadow: '#6A2080' },
  4: { bg: '#C03050', shadow: '#901030' },
  5: { bg: '#7B6B8A', shadow: '#5A4B6A' },  // Ghostly mauve (Phase 5: terrible peace)
};

interface StarBurstProps {
  active: boolean;
  x: number;
  y: number;
  phase?: number;
}

export const StarBurst: React.FC<StarBurstProps> = ({ active, x, y, phase = 0 }) => {
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
      const runningAnims: Animated.CompositeAnimation[] = [];
      stars.forEach((star, i) => {
        star.scale.setValue(0);
        star.translateX.setValue(0);
        star.translateY.setValue(0);
        star.opacity.setValue(1);

        const distance = 40 + Math.random() * 30;

        const anim = Animated.parallel([
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
        ]);
        anim.start();
        runningAnims.push(anim);
      });
      return () => runningAnims.forEach(a => a.stop());
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
          <View style={[styles.starInner, {
            backgroundColor: (STAR_BURST_COLORS[phase] || STAR_BURST_COLORS[0]).bg,
            shadowColor: (STAR_BURST_COLORS[phase] || STAR_BURST_COLORS[0]).shadow,
          }]} />
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
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});

export default Confetti;
