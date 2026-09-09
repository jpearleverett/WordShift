import React, { useLayoutEffect, useRef, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions, Easing } from 'react-native';
import { getPhaseTheme, CONFETTI_THEMES, SPARK_THEMES, SparkPalette } from '../theme/colors';
import { getMaxConfettiCount, shouldSimplifyAnimations } from '../services/deviceTier';
import { getEquippedSync } from '../services/cosmetics';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { STARBURST_FADE_DELAY_MS } from '../constants/timing';


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

const generateConfetti = (count: number, colors: string[], sparkBias: boolean, SCREEN_WIDTH: number): ConfettiPiece[] => {
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

/**
 * The painted shape of one confetti piece. Shared by the falling piece (which
 * wraps it in a native-driven transform) and the reduced-motion still scatter
 * (which lays it out statically), so both draw the same palette the same way.
 */
const ConfettiShapeView: React.FC<{ piece: ConfettiPiece }> = ({ piece }) => {
  // Shape variety: rectangles, squares, circles, triangles, and star-ish sparks.
  const s = piece.size;
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

const ConfettiPieceComponent: React.FC<{ piece: ConfettiPiece; profile: FallProfile }> = ({ piece, profile }) => {
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const [translateY] = useState(() => new Animated.Value(-50));
  const [translateX] = useState(() => new Animated.Value(0));
  const [rotate] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const [scale] = useState(() => new Animated.Value(0));

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
  }, [SCREEN_HEIGHT, opacity, piece.delay, profile.fallBase, profile.fallRand, profile.popSpring, profile.sparkBias, profile.spinBase, profile.spinRand, profile.strongEaseIn, profile.wobbleCycles, rotate, scale, translateX, translateY]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
      <ConfettiShapeView piece={piece} />
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

/**
 * The palette a burst paints with: an explicit override (shop purchase) wins,
 * else the equipped confetti cosmetic (pure expression), else the phase default.
 */
const resolveConfettiPalette = (phase: number, colors?: string[]): string[] => {
  if (colors && colors.length > 0) return colors;
  const equippedConfetti = getEquippedSync('confetti');
  if (equippedConfetti && CONFETTI_THEMES[equippedConfetti]) return CONFETTI_THEMES[equippedConfetti];
  return getPhaseTheme(phase).confettiColors;
};

const ConfettiBurst: React.FC<ConfettiProps> = ({ onComplete, phase = 0, ritualEnergy = 0, colors }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const profile = useMemo(() => getFallProfile(phase), [phase]);
  // One random layout per mounted burst; unrelated parent renders never restart it.
  const [pieces] = useState(() => {
      const baseCount = getMaxConfettiCount();
      // Scale confetti density with ritual energy
      const energyBonus = ritualEnergy >= 7 ? Math.floor(baseCount * 0.4) : ritualEnergy >= 4 ? Math.floor(baseCount * 0.2) : 0;
      // Dark phases thin the fall (~40% fewer pieces) so it reads as embers, not a party.
      const count = Math.max(6, Math.round((baseCount + energyBonus) * profile.countScale));
      // An explicit palette wins (shop purchase burst); else an equipped cosmetic
      // confetti palette overrides the phase default (pure expression); with none
      // equipped the confetti stays phase-aware.
      return generateConfetti(count, resolveConfettiPalette(phase, colors), profile.sparkBias, SCREEN_WIDTH);
  });
  const complete = useRef(onComplete);
  useLayoutEffect(() => { complete.current = onComplete; }, [onComplete]);
  useEffect(() => {
    const timer = setTimeout(() => complete.current?.(), profile.maxDurationMs);
    return () => clearTimeout(timer);
  }, [profile.maxDurationMs]);

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPieceComponent key={`${SCREEN_WIDTH}:${SCREEN_HEIGHT}:${piece.id}`} piece={piece} profile={profile} />
      ))}
    </View>
  );
};

// Reduced motion: the celebration is a single STILL scatter of palette pieces
// that fades out on the opacity channel only. Nothing translates, spins or
// scales. A purchased confetti palette is sold for amber and must show on
// every device, so "no motion" must not mean "no confetti".
const STILL_CONFETTI_COUNT = 24;
const STILL_CONFETTI_HOLD_MS = 700;
const STILL_CONFETTI_FADE_MS = 1100;

interface StillConfettiPiece extends ConfettiPiece {
  y: number;
}

const StillConfettiScatter: React.FC<ConfettiProps> = ({ onComplete, phase = 0, colors }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const [pieces] = useState<StillConfettiPiece[]>(() => {
    const profile = getFallProfile(phase);
    // The dark phases keep their thinner ember profile here too.
    const count = Math.max(6, Math.round(STILL_CONFETTI_COUNT * profile.countScale));
    return generateConfetti(count, resolveConfettiPalette(phase, colors), profile.sparkBias, SCREEN_WIDTH).map(piece => ({
      ...piece,
      // Scattered over the upper part of the screen, where a fall would be seen.
      y: SCREEN_HEIGHT * (0.08 + Math.random() * 0.54),
    }));
  });
  const [opacity] = useState(() => new Animated.Value(1));
  const complete = useRef(onComplete);
  useLayoutEffect(() => { complete.current = onComplete; }, [onComplete]);
  useEffect(() => {
    opacity.setValue(1);
    const anim = Animated.sequence([
      Animated.delay(STILL_CONFETTI_HOLD_MS),
      Animated.timing(opacity, { toValue: 0, duration: STILL_CONFETTI_FADE_MS, useNativeDriver: true }),
    ]);
    anim.start();
    const timer = setTimeout(() => complete.current?.(), STILL_CONFETTI_HOLD_MS + STILL_CONFETTI_FADE_MS + 50);
    return () => {
      anim.stop();
      clearTimeout(timer);
    };
  }, [opacity]);

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      {pieces.map(piece => (
        <View
          key={piece.id}
          style={[
            styles.stillPiece,
            { left: piece.x, top: piece.y, transform: [{ rotate: `${piece.rotation}deg` }] },
          ]}
        >
          <ConfettiShapeView piece={piece} />
        </View>
      ))}
    </Animated.View>
  );
};

export const Confetti: React.FC<ConfettiProps> = props => {
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  if (!props.active) return null;
  const key = `${width}:${height}:${props.phase ?? 0}`;
  // Reduced motion never nulls the effect: it renders the still scatter, which
  // completes itself on the same onComplete contract as the fall.
  return reducedMotion
    ? <StillConfettiScatter key={key} {...props} />
    : <ConfettiBurst key={key} {...props} />;
};

// Star burst effect for successful moves — colors shift with narrative phase.
// `accent` is a second tint that appears on the higher combo tiers so a deep
// streak reads as richer, not just bigger. An equipped 'spark' cosmetic
// replaces this palette (pure expression); the count, spread and physics below
// stay phase-owned and combo-owned.
const STAR_BURST_COLORS: Record<number, { bg: string; shadow: string; accent: string }> = {
  0: { bg: '#FFD700', shadow: '#FFD700', accent: '#FFFFFF' },
  1: { bg: '#F0C050', shadow: '#D4A030', accent: '#FFE9A8' },
  2: { bg: '#B088D0', shadow: '#8B5FB0', accent: '#E4CCF6' },
  3: { bg: '#9050B0', shadow: '#6A2080', accent: '#C79AE0' },
  4: { bg: '#C03050', shadow: '#901030', accent: '#F07890' },
  5: { bg: '#7B6B8A', shadow: '#5A4B6A', accent: '#B7A8C4' },  // Ghostly mauve (Phase 5: terrible peace)
};

/**
 * The phase-default spark palette (no cosmetic equipped). Exported so the shop
 * can demo the DEFAULT row's burst even while a paid spark is equipped.
 */
export function getPhaseSparkPalette(phase: number): SparkPalette {
  return STAR_BURST_COLORS[phase] || STAR_BURST_COLORS[0];
}

// Combo escalation: a deeper clean-move streak throws a bigger, further burst.
const STAR_COUNT_BY_TIER = [8, 10, 12, 14];
// Low-tier devices throw a reduced burst (six stars, no halo Views) on the
// same timeline: the spark is sold for amber and must still render there.
const REDUCED_STAR_COUNT = 6;
// Reduced motion: one still frame of palette diamonds at this radius, fading
// out on opacity only. Nothing moves or scales.
const STILL_STAR_COUNT = 8;
const STILL_STAR_RADIUS_DP = 30;
const STAR_BOX_DP = 28;
const STAR_BURST_BOX_DP = 100;

interface StarBurstProps {
  active: boolean;
  x: number;
  y: number;
  phase?: number;
  /** Clean-move combo tier (0-3) — scales the burst count, spread, and richness. */
  comboTier?: number;
  /**
   * Explicit palette (mirrors Confetti's `colors`): the shop uses it so a row
   * previews its OWN palette, owned or not. When omitted, an equipped move
   * spark wins, else the phase default.
   */
  paletteOverride?: SparkPalette;
}

export const StarBurst: React.FC<StarBurstProps> = ({ active, x, y, phase = 0, comboTier = 0, paletteOverride }) => {
  const reducedMotion = useReducedMotion();
  // Low-tier devices get a reduced burst (fewer stars, no halos), never none:
  // the move still lands its haptic + sound, and its paid palette still shows.
  const simplify = shouldSimplifyAnimations();
  const tier = Math.max(0, Math.min(3, Math.floor(comboTier)));
  const count = reducedMotion ? STILL_STAR_COUNT : simplify ? REDUCED_STAR_COUNT : STAR_COUNT_BY_TIER[tier];

  // Rebuild the animated set when the count changes. The values only run
  // while `active`, so recreating them on a rare tier change is cheap.
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
  // The reduced-motion still frame fades as one on a single opacity value.
  const [stillOpacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!active) return;
    if (reducedMotion) {
      stillOpacity.setValue(1);
      const anim = Animated.sequence([
        Animated.delay(STARBURST_FADE_DELAY_MS),
        Animated.timing(stillOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]);
      anim.start();
      return () => anim.stop();
    }
    const runningAnims: Animated.CompositeAnimation[] = [];
    // A deep tier at a dark phase damps one step (a heavier settle).
    const popFriction = phase >= 3 ? 6 : 4;
    const popTension = phase >= 3 ? 150 : 200;
    // Each tier pops a little larger too, so a streak reads as richer, not just
    // wider. Tier 0 stays exactly 1.0 so the default burst is unchanged.
    const peakScale = 1 + tier * 0.12;
    stars.forEach((star) => {
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
          // Held longer (450ms, was 300) so the palette can be read before it goes.
          Animated.delay(STARBURST_FADE_DELAY_MS),
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
  }, [active, reducedMotion, stars, tier, phase, stillOpacity]);

  // The paid effect is NEVER nulled: reduced motion renders a still frame,
  // low tier a reduced burst. Only an inactive burst renders nothing.
  if (!active) return null;

  // An explicit palette wins (shop preview); else an equipped move spark; with
  // none equipped the burst stays phase-aware. The phase entries carry no
  // `halo`, so the halo falls back to the core color exactly as it always has.
  const equippedSpark = getEquippedSync('spark');
  const themedSpark = equippedSpark ? SPARK_THEMES[equippedSpark] : undefined;
  const palette: SparkPalette = paletteOverride ?? themedSpark ?? getPhaseSparkPalette(phase);
  // From tier 1 up, alternate stars carry the accent, so a paid palette's
  // second colour shows on the first clean pair, not only on a 4-move streak.
  const coreFor = (i: number) => (tier >= 1 && i % 2 === 1 ? palette.accent : palette.bg);
  const containerStyle = [styles.starBurstContainer, { left: x - STAR_BURST_BOX_DP / 2, top: y - STAR_BURST_BOX_DP / 2 }];

  if (reducedMotion) {
    // One static frame of palette diamonds around the origin. Positions are
    // plain layout offsets (no transforms); only the opacity animates.
    const centre = STAR_BURST_BOX_DP / 2 - STAR_BOX_DP / 2;
    return (
      <Animated.View style={[...containerStyle, { opacity: stillOpacity }]} pointerEvents="none">
        {stars.map((star, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                left: centre + Math.cos(star.angle) * STILL_STAR_RADIUS_DP,
                top: centre + Math.sin(star.angle) * STILL_STAR_RADIUS_DP,
              },
            ]}
          >
            <View style={[styles.starCore, { backgroundColor: coreFor(i) }]} />
          </View>
        ))}
      </Animated.View>
    );
  }

  return (
    <View style={containerStyle} pointerEvents="none">
      {stars.map((star, i) => {
        const coreColor = coreFor(i);
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
                core diamond, so the sparkle exists without an iOS-only shadow.
                The low-tier reduced burst drops the halo Views (six stars, one
                View each) to stay inside that tier's animation budget. */}
            {!simplify && <View style={[styles.starHalo, { backgroundColor: palette.halo ?? coreColor }]} />}
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
  // Reduced-motion still scatter: a piece laid out where it would have fallen.
  stillPiece: {
    position: 'absolute',
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
    width: STAR_BURST_BOX_DP,
    height: STAR_BURST_BOX_DP,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  star: {
    position: 'absolute',
    width: STAR_BOX_DP,
    height: STAR_BOX_DP,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Soft 28dp halo so the sparkle reads on Android, where the old iOS-only
  // shadowRadius glow drew nothing. Sized up from 20dp @ 0.32 (which vanished
  // on the dusk/night boards) so the burst is readable, not subliminal.
  starHalo: {
    position: 'absolute',
    width: STAR_BOX_DP,
    height: STAR_BOX_DP,
    borderRadius: STAR_BOX_DP / 2,
    opacity: 0.45,
  },
  // Bright 16dp core diamond (was 12: too small to read under a thumb).
  starCore: {
    width: 16,
    height: 16,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
});

export default Confetti;
