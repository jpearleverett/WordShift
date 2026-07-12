import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { getSettingsSync } from '../services/settings';
import { getPhaseTheme, CONFETTI_THEMES } from '../theme/colors';
import { getMaxConfettiCount } from '../services/deviceTier';
import { getEquippedSync } from '../services/cosmetics';
import { shouldFreezePlayStoreCaptureMotion } from '../dev/playStoreCapture';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ConfettiShape = 'rect' | 'square' | 'circle' | 'triangle' | 'spark';

// Modest shape variety keeps the celebration lively; the phase-aware palette
// (bright rainbow -> dark muted) and the native-driven fall are unchanged.
const CONFETTI_SHAPES: ConfettiShape[] = ['rect', 'square', 'circle', 'triangle', 'spark'];

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
  shape: ConfettiShape;
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
      shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
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

  // Shape variety: rectangles, squares, circles, triangles, and star-ish sparks.
  // The Animated.View is now a motion/position wrapper; the shape renders inside
  // so the native-driven transform stays exactly as before.
  const s = piece.size;
  const renderShape = () => {
    switch (piece.shape) {
      case 'rect':
        return (
          <View
            style={{ width: s * 0.5, height: s * 1.4, backgroundColor: piece.color, borderRadius: 2 }}
          />
        );
      case 'circle':
        return (
          <View
            style={{ width: s, height: s, backgroundColor: piece.color, borderRadius: s / 2 }}
          />
        );
      case 'triangle':
        return (
          <View
            style={{
              width: 0,
              height: 0,
              backgroundColor: 'transparent',
              borderStyle: 'solid',
              borderLeftWidth: s * 0.55,
              borderRightWidth: s * 0.55,
              borderBottomWidth: s,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: piece.color,
            }}
          />
        );
      case 'spark': {
        const ss = s * 0.9;
        return (
          <View style={{ width: ss, height: ss }}>
            <View style={[styles.sparkSquare, { backgroundColor: piece.color }]} />
            <View style={[styles.sparkDiamond, { backgroundColor: piece.color }]} />
          </View>
        );
      }
      default: // 'square'
        return (
          <View style={{ width: s, height: s, backgroundColor: piece.color, borderRadius: 2 }} />
        );
    }
  };

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: piece.x,
          transform: [
            { translateY },
            { translateX },
            { rotate: spin },
            { scale },
          ],
          opacity,
        },
      ]}
    >
      {renderShape()}
    </Animated.View>
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
      // Play Store fixtures are development-web-only static captures. The
      // native resolver always returns false, so real celebrations are unchanged.
      if (
        getSettingsSync().reducedMotion
        || shouldFreezePlayStoreCaptureMotion()
      ) {
        setPieces([]);
        onComplete?.();
        return;
      }
      const theme = getPhaseTheme(phase);
      const baseCount = getMaxConfettiCount();
      // Scale confetti density with ritual energy
      const energyBonus = ritualEnergy >= 7 ? Math.floor(baseCount * 0.4) : ritualEnergy >= 4 ? Math.floor(baseCount * 0.2) : 0;
      // An equipped cosmetic confetti palette overrides the phase default (pure
      // expression); with none equipped the confetti stays phase-aware.
      const equippedConfetti = getEquippedSync('confetti');
      const confettiColors = equippedConfetti && CONFETTI_THEMES[equippedConfetti]
        ? CONFETTI_THEMES[equippedConfetti]
        : theme.confettiColors;
      setPieces(generateConfetti(baseCount + energyBonus, confettiColors));
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
  const reducedMotion = getSettingsSync().reducedMotion;
  const freezeCaptureMotion = shouldFreezePlayStoreCaptureMotion();
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
    if (active && !reducedMotion && !freezeCaptureMotion) {
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
  }, [active, reducedMotion, freezeCaptureMotion]);

  if (!active || reducedMotion || freezeCaptureMotion) return null;

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
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    top: 0,
  },
  // Star-ish spark confetti: square + 45deg diamond overlaid (compact sparkle).
  sparkSquare: {
    ...StyleSheet.absoluteFill,
    borderRadius: 1,
  },
  sparkDiamond: {
    ...StyleSheet.absoluteFill,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
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
