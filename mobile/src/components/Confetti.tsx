import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { getSettingsSync } from '../services/settings';
import { getPhaseTheme, CONFETTI_THEMES } from '../theme/colors';
import { getMaxConfettiCount, shouldSimplifyAnimations } from '../services/deviceTier';
import { getEquippedSync } from '../services/cosmetics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ConfettiShape = 'rect' | 'square' | 'circle' | 'triangle' | 'spark';

// Modest shape variety keeps the celebration lively; the phase-aware palette
// (bright rainbow -> dark muted) and the native-driven fall are unchanged.
const CONFETTI_SHAPES: ConfettiShape[] = ['rect', 'square', 'circle', 'triangle', 'spark'];
// Dark phases bias toward embers (sparks) instead of party shapes.
const DARK_CONFETTI_SHAPES: ConfettiShape[] = ['spark', 'spark', 'circle', 'square'];

/**
 * Per-phase-group fall profile. The dark phases don't just recolor the party —
 * the pieces fall like ash: fewer wobble cycles, barely any spin, a longer fall
 * with a stronger ease-in, a plain scale-to-1 instead of a bouncy pop, and a
 * denser bias toward ember sparks. Phase 5 drifts slower still. All transforms
 * stay native-driver.
 */
interface FallProfile {
  countScale: number;
  fallBase: number;
  fallRand: number;
  wobbleCycles: number;
  spinBase: number;
  spinRand: number;
  strongEaseIn: boolean;
  popSpring: boolean;
  sparkBias: boolean;
  maxDurationMs: number;
}

const getFallProfile = (phase: number): FallProfile => {
  if (phase >= 5) {
    // Terrible peace: a slow, near-straight drift.
    return {
      countScale: 0.55,
      fallBase: 3400,
      fallRand: 1500,
      wobbleCycles: 2,
      spinBase: 1,
      spinRand: 0.5,
      strongEaseIn: true,
      popSpring: false,
      sparkBias: true,
      maxDurationMs: 5900,
    };
  }
  if (phase >= 3) {
    // Growing shadows / the horizon: fewer wobbles, ~1 spin, a longer heavier fall.
    return {
      countScale: 0.6,
      fallBase: 2800,
      fallRand: 1500,
      wobbleCycles: 3,
      spinBase: 1,
      spinRand: 1,
      strongEaseIn: true,
      popSpring: false,
      sparkBias: true,
      maxDurationMs: 5100,
    };
  }
  // Bright phases keep the original party physics.
  return {
    countScale: 1,
    fallBase: 2000,
    fallRand: 1500,
    wobbleCycles: 6,
    spinBase: 3,
    spinRand: 3,
    strongEaseIn: false,
    popSpring: true,
    sparkBias: false,
    maxDurationMs: 4200,
  };
};

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
  shape: ConfettiShape;
}

const generateConfetti = (count: number, colors: string[], sparkBias: boolean): ConfettiPiece[] => {
  const confettiColors = colors.length > 0 ? colors : getPhaseTheme(0).confettiColors;
  const shapePool = sparkBias ? DARK_CONFETTI_SHAPES : CONFETTI_SHAPES;
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
      shape: shapePool[Math.floor(Math.random() * shapePool.length)],
    });
  }
  return pieces;
};

const ConfettiPieceComponent: React.FC<{ piece: ConfettiPiece; profile: FallProfile }> = ({ piece, profile }) => {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Dark phases wobble less, so the amplitude is softer too (ash doesn't dance).
    const wobbleAmount = (profile.sparkBias ? 14 : 30) + Math.random() * (profile.sparkBias ? 22 : 50);
    const fallDuration = profile.fallBase + Math.random() * profile.fallRand;
    const wobbleCycles = profile.wobbleCycles;

    // Pop in: a bouncy spring in the bright phases, a plain settle in the dark.
    const popIn = profile.popSpring
      ? Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        })
      : Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        });

    const anim = Animated.sequence([
      Animated.delay(piece.delay),
      Animated.parallel([
        popIn,
        // Fall down — stronger ease-in in the dark phases so pieces sink.
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT + 100,
          duration: fallDuration,
          easing: profile.strongEaseIn ? Easing.in(Easing.cubic) : Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Wobble side to side (fewer cycles in the dark phases)
        Animated.sequence(
          Array(wobbleCycles).fill(0).map((_, i) =>
            Animated.timing(translateX, {
              toValue: (i % 2 === 0 ? 1 : -1) * wobbleAmount * (1 - i * (0.9 / Math.max(1, wobbleCycles))),
              duration: fallDuration / wobbleCycles,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            })
          ),
        ),
        // Spin — full tumbles in the bright phases, one lazy turn in the dark.
        Animated.timing(rotate, {
          toValue: profile.spinBase + Math.random() * profile.spinRand,
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
  /**
   * Explicit palette override (e.g. a shop purchase bursting the just-bought
   * theme). When omitted, an equipped confetti cosmetic wins, else the phase
   * default. The physics still follow the phase (expression changes color only).
   */
  colors?: string[];
}

export const Confetti: React.FC<ConfettiProps> = ({ active, onComplete, phase = 0, ritualEnergy = 0, colors }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const profile = useMemo(() => getFallProfile(phase), [phase]);

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
      // Dark phases thin the fall (~40% fewer pieces) so it reads as embers, not a party.
      const count = Math.max(6, Math.round((baseCount + energyBonus) * profile.countScale));
      // An explicit palette wins (shop purchase burst); else an equipped cosmetic
      // confetti palette overrides the phase default (pure expression); with none
      // equipped the confetti stays phase-aware.
      const equippedConfetti = getEquippedSync('confetti');
      const confettiColors = colors
        ? colors
        : equippedConfetti && CONFETTI_THEMES[equippedConfetti]
        ? CONFETTI_THEMES[equippedConfetti]
        : theme.confettiColors;
      setPieces(generateConfetti(count, confettiColors, profile.sparkBias));
      const timeout = setTimeout(() => {
        onComplete?.();
      }, profile.maxDurationMs);
      return () => clearTimeout(timeout);
    } else {
      setPieces([]);
    }
  }, [active, onComplete, phase, ritualEnergy, colors, profile]);

  if (!active || pieces.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPieceComponent key={piece.id} piece={piece} profile={profile} />
      ))}
    </View>
  );
};

// Star burst effect for successful moves — colors shift with narrative phase.
// `accent` is a second tint that appears on the higher combo tiers so a deep
// streak reads as richer, not just bigger.
const STAR_BURST_COLORS: Record<number, { bg: string; shadow: string; accent: string }> = {
  0: { bg: '#FFD700', shadow: '#FFD700', accent: '#FFFFFF' },
  1: { bg: '#F0C050', shadow: '#D4A030', accent: '#FFE9A8' },
  2: { bg: '#B088D0', shadow: '#8B5FB0', accent: '#E4CCF6' },
  3: { bg: '#9050B0', shadow: '#6A2080', accent: '#C79AE0' },
  4: { bg: '#C03050', shadow: '#901030', accent: '#F07890' },
  5: { bg: '#7B6B8A', shadow: '#5A4B6A', accent: '#B7A8C4' },  // Ghostly mauve (Phase 5: terrible peace)
};

// Combo escalation: a deeper clean-move streak throws a bigger, further burst.
const STAR_COUNT_BY_TIER = [8, 10, 12, 14];

interface StarBurstProps {
  active: boolean;
  x: number;
  y: number;
  phase?: number;
  /** Clean-move combo tier (0-3) — scales the burst count, spread, and richness. */
  comboTier?: number;
}

export const StarBurst: React.FC<StarBurstProps> = ({ active, x, y, phase = 0, comboTier = 0 }) => {
  const reducedMotion = getSettingsSync().reducedMotion;
  // Low-tier devices skip the decorative burst entirely (the move still lands
  // its haptic + sound); treat it exactly like reduced motion.
  const simplify = shouldSimplifyAnimations();
  const tier = Math.max(0, Math.min(3, Math.floor(comboTier)));
  const count = STAR_COUNT_BY_TIER[tier];

  // Rebuild the animated set when the tier (and thus count) changes. The values
  // only run while `active`, so recreating them on a rare tier change is cheap.
  const stars = useMemo(
    () =>
      Array(count).fill(0).map((_, i) => ({
        scale: new Animated.Value(0),
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        opacity: new Animated.Value(1),
        angle: (i / count) * Math.PI * 2,
      })),
    [count],
  );

  useEffect(() => {
    if (active && !reducedMotion && !simplify) {
      const runningAnims: Animated.CompositeAnimation[] = [];
      // A deep tier at a dark phase damps one step (a heavier settle).
      const popFriction = phase >= 3 ? 6 : 4;
      const popTension = phase >= 3 ? 150 : 200;
      // Each tier pops a little larger too, so a streak reads as richer, not just
      // wider. Tier 0 stays exactly 1.0 so the default burst is unchanged.
      const peakScale = 1 + tier * 0.12;
      stars.forEach((star, i) => {
        star.scale.setValue(0);
        star.translateX.setValue(0);
        star.translateY.setValue(0);
        star.opacity.setValue(1);

        // Base distance grows with the combo tier so a streak flings further.
        const distance = 40 + tier * 12 + Math.random() * 30;

        const anim = Animated.parallel([
          Animated.sequence([
            Animated.spring(star.scale, {
              toValue: peakScale,
              friction: popFriction,
              tension: popTension,
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
  }, [active, reducedMotion, simplify, stars, tier, phase]);

  if (!active || reducedMotion || simplify) return null;

  const palette = STAR_BURST_COLORS[phase] || STAR_BURST_COLORS[0];

  return (
    <View style={[styles.starBurstContainer, { left: x - 50, top: y - 50 }]} pointerEvents="none">
      {stars.map((star, i) => {
        // From tier 2 up, alternate stars carry the phase accent for extra life.
        const coreColor = tier >= 2 && i % 2 === 1 ? palette.accent : palette.bg;
        return (
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
            {/* Two-layer glow (Android-safe): a soft halo View behind a bright
                core diamond, so the sparkle exists without an iOS-only shadow. */}
            <View style={[styles.starHalo, { backgroundColor: coreColor }]} />
            <View style={[styles.starCore, { backgroundColor: coreColor }]} />
          </Animated.View>
        );
      })}
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
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Soft 20px halo (low opacity) so the sparkle reads on Android, where the old
  // iOS-only shadowRadius glow drew nothing.
  starHalo: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    opacity: 0.32,
  },
  // Bright 12px core diamond.
  starCore: {
    width: 12,
    height: 12,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
});

export default Confetti;
