import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing, Platform } from 'react-native';
import { getPhaseTheme } from '../theme/colors';
import { getSettingsSync } from '../services/settings';
import { getMaxParticleCount, getDeviceTier } from '../services/deviceTier';
import type { DeviceTier } from '../services/deviceTier';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Phase 0-1 "something is off" aberration
// ---------------------------------------------------------------------------
// The horror payoff is buried deep, so session one must PROMISE that something
// is subtly wrong without revealing anything. Two rare, low-odds channels do
// this, both reusing existing animation loops (no new RAF, no new timers):
//   1) A single floating sparkle occasionally "dies wrong" — it desaturates to
//      a dim ashen ember tone and sinks a few px faster before vanishing.
//   2) The ambient pulse very occasionally takes one slower, off-rhythm breath.
// Both are hard-gated to Phase 0-1, off under reduced motion, and skipped on
// low-tier devices. Nothing crimson, no eyes, no words — just "did I imagine
// that?". Kept deliberately low-frequency so it never reads as a light show.
export const ABERRATION_CHANCE = 0.03; // per particle float cycle (Phase 0-1 only)
export const BREATH_ABERRATION_CHANCE = 0.06; // per ambient pulse breath (Phase 0-1 only)
// A dim, desaturated ashen-warm grey. Reads as a light going out wrong, NOT as
// fire/crimson — the reveal must stay earned.
const ABERRATION_EMBER_COLOR = 'rgba(115, 100, 92, 0.9)';

/**
 * Whether the Phase 0-1 aberration is allowed to fire, given the narrative
 * phase, device tier, and reduced-motion setting. Pure so it can be pinned by a
 * test — this gate is the make-or-break contract (Phase 0-1 only; the descent
 * itself must still feel earned).
 */
export function isAberrationEnabled(
  phase: number,
  tier: DeviceTier,
  reducedMotion: boolean
): boolean {
  return phase <= 1 && tier !== 'low' && !reducedMotion;
}

interface ParticleLayout {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  /** Stable index into the active phase's palette so motion persists while color shifts */
  colorSeed: number;
  type: 'circle' | 'star' | 'diamond';
}

interface FloatingParticle extends ParticleLayout {
  color: string;
}

// Generate the stable motion layout once; color is derived per-phase later so a
// phase transition recolors the same particles instead of leaving them pinned to
// the launch palette (the gradual candy→dread shift should reach the particles too).
const generateParticleLayout = (count: number): ParticleLayout[] => {
  const layout: ParticleLayout[] = [];
  const types: Array<'circle' | 'star' | 'diamond'> = ['circle', 'star', 'diamond'];

  for (let i = 0; i < count; i++) {
    layout.push({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      size: 8 + Math.random() * 20,
      duration: 8000 + Math.random() * 12000,
      delay: Math.random() * 5000,
      colorSeed: Math.floor(Math.random() * 997),
      type: types[Math.floor(Math.random() * types.length)],
    });
  }
  return layout;
};

// ---------------------------------------------------------------------------
// Soft vertical wash: replaces the old three hard-edged overlay rectangles
// (whose bottoms cut visible horizontal seams at ~35%/50%/50% screen height).
// Each phase-theme overlay color keeps its exact value; the softness comes
// from a full-strength core band plus stepped-opacity falloff bands, so the
// wash fades out gradually instead of stopping at a hard edge. Every band is
// a plain static View: no animation, no JS work after mount, no new deps.
// ---------------------------------------------------------------------------
const WASH_FALLOFF_STEPS = 4;

const SoftWash: React.FC<{
  color: string;
  /** Fraction of screen height at full strength, from the anchored edge */
  core: number;
  /** Fraction of screen height over which the wash fades to nothing */
  tail: number;
  anchor: 'top' | 'bottom';
}> = ({ color, core, tail, anchor }) => {
  const coreH = SCREEN_HEIGHT * core;
  const stepH = (SCREEN_HEIGHT * tail) / WASH_FALLOFF_STEPS;
  const place = (offset: number, height: number) =>
    anchor === 'top' ? { top: offset, height } : { bottom: offset, height };
  return (
    <>
      <View
        pointerEvents="none"
        style={[styles.washBand, place(0, coreH), { backgroundColor: color }]}
      />
      {Array.from({ length: WASH_FALLOFF_STEPS }, (_, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            styles.washBand,
            // +1px overlap between bands so rounding can't open seam gaps
            place(coreH + i * stepH, stepH + 1),
            {
              backgroundColor: color,
              // Steps down 0.8 / 0.6 / 0.4 / 0.2 — multiplies the color's own
              // baked-in alpha, so each edge is a fraction of the old hard cut.
              opacity: (WASH_FALLOFF_STEPS - i) / (WASH_FALLOFF_STEPS + 1),
            },
          ]}
        />
      ))}
    </>
  );
};

const Particle: React.FC<{ particle: FloatingParticle; aberrationEnabled: boolean }> = ({
  particle,
  aberrationEnabled,
}) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT + 50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  // Aberration drivers (Phase 0-1 only, idle at 0): an ember tone floods in and
  // the sparkle sinks a few px faster as it "dies wrong".
  const emberOpacity = useRef(new Animated.Value(0)).current;
  const sinkY = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  // Kept fresh so a phase change (0/1 -> 2+) stops future aberrations mid-loop.
  const aberrationRef = useRef(aberrationEnabled);
  aberrationRef.current = aberrationEnabled;

  useEffect(() => {
    const animate = () => {
      // Reset values
      translateY.setValue(SCREEN_HEIGHT + 50);
      opacity.setValue(0);
      rotate.setValue(0);
      scale.setValue(0.5);
      sinkY.setValue(0);
      emberOpacity.setValue(0);

      const d = particle.duration;
      // Rare: this cycle the sparkle dies wrong. Very low odds so it reads as
      // "did that just happen?", never a light show.
      const aberrant = aberrationRef.current && Math.random() < ABERRATION_CHANCE;

      const opacityBranch = aberrant
        ? Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: d * 0.2, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.6, duration: d * 0.55, useNativeDriver: true }),
            // a brief wrong flicker, then the light gutters out
            Animated.timing(opacity, { toValue: 0.82, duration: 110, useNativeDriver: true }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: d * 0.25,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ])
        : Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: d * 0.2, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.6, duration: d * 0.6, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: d * 0.2, useNativeDriver: true }),
          ]);

      const branches: Animated.CompositeAnimation[] = [
        // Float upward
        Animated.timing(translateY, {
          toValue: -100,
          duration: d,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        opacityBranch,
        // Rotate
        Animated.timing(rotate, {
          toValue: 1,
          duration: d,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        // Scale pulse
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1,
            duration: d * 0.3,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: d * 0.7,
            useNativeDriver: true,
          }),
        ]),
      ];

      if (aberrant) {
        branches.push(
          // Ember tone floods in over the last stretch of life
          Animated.sequence([
            Animated.delay(d * 0.75),
            Animated.timing(emberOpacity, { toValue: 0.85, duration: 160, useNativeDriver: true }),
            Animated.timing(emberOpacity, { toValue: 0.4, duration: d * 0.22, useNativeDriver: true }),
          ]),
          // ...and the sparkle sinks a few px faster as it goes out
          Animated.sequence([
            Animated.delay(d * 0.78),
            Animated.timing(sinkY, {
              toValue: 20,
              duration: d * 0.22,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ])
        );
      }

      animRef.current = Animated.sequence([
        Animated.delay(particle.delay),
        Animated.parallel(branches),
      ]);
      animRef.current.start(() => {
        if (mountedRef.current) animate();
      });
    };

    animate();

    return () => {
      mountedRef.current = false;
      animRef.current?.stop();
    };
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderShape = (color: string) => {
    switch (particle.type) {
      case 'star': {
        // 4/8-point sparkle: an axis-aligned square plus a same-size 45deg
        // diamond. Each shape's points poke past the other, so it reads as a
        // star instead of the old plus sign. Two Views — cheap per particle.
        const s = particle.size * 0.62;
        return (
          <View style={[styles.starContainer, { width: s, height: s }]}>
            <View style={[styles.starSquare, { backgroundColor: color }]} />
            <View style={[styles.starDiamond, { backgroundColor: color }]} />
          </View>
        );
      }
      case 'diamond':
        return (
          <View
            style={[
              styles.diamond,
              {
                width: particle.size * 0.7,
                height: particle.size * 0.7,
                backgroundColor: color,
              },
            ]}
          />
        );
      default:
        return (
          <View
            style={[
              styles.circle,
              {
                width: particle.size,
                height: particle.size,
                backgroundColor: color,
                borderRadius: particle.size / 2,
              },
            ]}
          />
        );
    }
  };

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.x,
          transform: [
            { translateY },
            { translateY: sinkY },
            { rotate: spin },
            { scale },
          ],
          opacity,
        },
      ]}
    >
      {renderShape(particle.color)}
      {aberrationEnabled && (
        <Animated.View
          pointerEvents="none"
          style={[styles.emberOverlay, { opacity: emberOpacity }]}
        >
          {renderShape(ABERRATION_EMBER_COLOR)}
        </Animated.View>
      )}
    </Animated.View>
  );
};

interface AnimatedBackgroundProps {
  phase?: number;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ phase = 0 }) => {
  const reducedMotion = getSettingsSync().reducedMotion;
  const theme = useMemo(() => getPhaseTheme(phase), [phase]);
  const particleCount = getMaxParticleCount();
  // Layout (positions/timing) is generated once and kept stable; color is mapped
  // from the current phase palette so transitions recolor in place.
  const particleLayout = useRef(
    reducedMotion ? [] : generateParticleLayout(particleCount)
  ).current;
  const particles = useMemo<FloatingParticle[]>(
    () =>
      particleLayout.map((p) => ({
        ...p,
        color: theme.particleColors[p.colorSeed % theme.particleColors.length],
      })),
    [particleLayout, theme]
  );
  // Use opacity-based pulse with native driver instead of JS-bridge backgroundColor
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  // Phase 0-1 aberration gate (shared by particles + the ambient breath).
  const aberrationEnabled = isAberrationEnabled(phase, getDeviceTier(), reducedMotion);
  // Read inside the self-scheduling breath loop so a phase change flips it
  // without restarting the loop.
  const breathAberrationRef = useRef(aberrationEnabled);
  breathAberrationRef.current = aberrationEnabled;

  useEffect(() => {
    if (reducedMotion) return;
    // Subtle pulse: animate opacity of a secondary color overlay (native driver).
    // Self-scheduling instead of Animated.loop so a single breath can rarely run
    // slower and linger — a barely-perceptible off-rhythm beat at Phase 0-1. No
    // new perpetual loop: this replaces the old Animated.loop one-for-one.
    let cancelled = false;
    let current: Animated.CompositeAnimation | null = null;

    const runBreath = () => {
      if (cancelled) return;
      const aberrant =
        breathAberrationRef.current && Math.random() < BREATH_ABERRATION_CHANCE;
      const dur = aberrant ? 6800 : 4000;
      const seq = Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        // An off-rhythm breath holds at the top a beat before releasing.
        ...(aberrant ? [Animated.delay(650)] : []),
        Animated.timing(pulseOpacity, {
          toValue: 0,
          duration: dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]);
      current = seq;
      seq.start(({ finished }) => {
        if (finished && !cancelled) runBreath();
      });
    };
    runBreath();

    return () => {
      cancelled = true;
      current?.stop();
      pulseOpacity.stopAnimation();
    };
  }, [reducedMotion]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {/* Pulsing secondary color overlay — uses native driver via opacity */}
      <Animated.View
        style={[
          styles.pulseOverlay,
          { backgroundColor: theme.bgSecondary, opacity: pulseOpacity },
        ]}
        pointerEvents="none"
      />

      {/* Gradient overlay wash — graduated static bands, no hard edges */}
      <SoftWash color={theme.overlayTop} core={0.2} tail={0.28} anchor="top" />
      <SoftWash color={theme.overlayMid} core={0.34} tail={0.28} anchor="top" />
      <SoftWash color={theme.overlayBottom} core={0.34} tail={0.28} anchor="bottom" />

      {/* Radial glow in center. iOS: soft shadow blur. Android ignores the
          shadow-* props (and elevation would cast a hard directional shadow,
          not a glow), so it gets concentric stepped-opacity circles instead,
          the same layered-oval trick as the Offering Pit glow. Static Views. */}
      {Platform.OS === 'ios' ? (
        <View style={[styles.centerGlow, { backgroundColor: theme.centerGlow }]} />
      ) : (
        <>
          <View
            pointerEvents="none"
            style={[styles.centerGlowOuter, { backgroundColor: theme.centerGlow }]}
          />
          <View
            pointerEvents="none"
            style={[styles.centerGlowMid, { backgroundColor: theme.centerGlow }]}
          />
          <View
            pointerEvents="none"
            style={[styles.centerGlowInner, { backgroundColor: theme.centerGlow }]}
          />
        </>
      )}

      {/* Floating particles */}
      {particles.map((particle) => (
        <Particle
          key={particle.id}
          particle={particle}
          aberrationEnabled={aberrationEnabled}
        />
      ))}

      {/* Top vignette. iOS: shadow-based soft band. Android ignores those
          shadow props entirely, so it gets three stepped translucent bands
          fading downward instead (mirrors the bottom vignette's approach). */}
      {Platform.OS === 'ios' ? (
        <View style={[styles.vignetteTop, { shadowColor: theme.vignetteColor }]} />
      ) : (
        <>
          <View
            pointerEvents="none"
            style={[styles.vignetteTopBand, { top: 0, backgroundColor: theme.vignetteColor + '4D' }]}
          />
          <View
            pointerEvents="none"
            style={[styles.vignetteTopBand, { top: 40, backgroundColor: theme.vignetteColor + '33' }]}
          />
          <View
            pointerEvents="none"
            style={[styles.vignetteTopBand, { top: 80, backgroundColor: theme.vignetteColor + '1A' }]}
          />
        </>
      )}
      {/* Bottom vignette */}
      <View style={[styles.vignetteBottom, { backgroundColor: theme.vignetteColor + '4D' }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  pulseOverlay: {
    ...StyleSheet.absoluteFill,
  },
  washBand: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  centerGlow: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3,
    left: SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: SCREEN_WIDTH * 0.3,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
  },
  // Android center-glow fallback: three concentric circles sharing the iOS
  // glow's center point (0.5W, 0.3H + 0.3W), stepping opacity up toward the
  // core to read as a soft radial glow without shadow support.
  centerGlowOuter: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3 - SCREEN_WIDTH * 0.1,
    left: SCREEN_WIDTH * 0.1,
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    opacity: 0.35,
  },
  centerGlowMid: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3,
    left: SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: SCREEN_WIDTH * 0.3,
    opacity: 0.65,
  },
  centerGlowInner: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3 + SCREEN_WIDTH * 0.1,
    left: SCREEN_WIDTH * 0.3,
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_WIDTH * 0.4,
    borderRadius: SCREEN_WIDTH * 0.2,
    opacity: 1,
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'transparent',
    // Top shadow effect
    shadowOffset: { width: 0, height: 40 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
  },
  // Android top-vignette fallback bands (40px each, stepped alpha 30%/20%/10%)
  vignetteTopBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 40,
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  particle: {
    position: 'absolute',
  },
  circle: {
    // Styles applied dynamically
  },
  starContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Axis-aligned square + a 45deg diamond of equal size = a compact sparkle.
  starSquare: {
    ...StyleSheet.absoluteFill,
    borderRadius: 1,
  },
  starDiamond: {
    ...StyleSheet.absoluteFill,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  diamond: {
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  // Ember overlay: a same-shape copy tinted dim ashen ember, faded in only
  // during an aberrant "dies wrong" cycle. Fills the particle box and centers.
  emberOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AnimatedBackground;
