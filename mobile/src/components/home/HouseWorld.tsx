import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { FONT_SIZE } from '../../theme/typeScale';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  Text,
  Easing,
  Image,
} from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
  PanGestureHandlerGestureEvent,
  // Touchables inside the pannable house view must come from
  // react-native-gesture-handler to coexist with the pan gesture
  TouchableOpacity,
} from 'react-native-gesture-handler';
import { Room, Animal, DialoguePhase, Unlockable } from '../../types/homeWorld';
import { RoomView, computeEmbellishmentIntensity } from './RoomView';
import { CandyColors } from '../../theme/colors';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { isOnCooldown, getSessionStatus } from '../../services/dialogueSession';
import {
  clampHomeScenePanY,
  resolveHomeScenePanRestore,
  resolveGestureBasePanY,
  computePanSettleTarget,
  rubberBandPanY,
} from '../../services/homeScenePan';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations, getDeviceTier } from '../../services/deviceTier';
import { getTendingIntensity } from '../../services/tending';
import { getActiveEvent } from '../../services/liveEvents';

// Environment assets
// Full-screen sky backdrops ship as WebP (q90): ~15MB of PNG became ~1.5MB with
// no visible loss on the painterly art. Dimensions are unchanged (941x1972);
// the seat-geometry contract in skyGeometry.test.ts still holds. Re-encode via
// scripts/tools/encodeBackgroundsWebp.mjs.
const SKY_DAY = require('../../../assets/environment/sky_day.webp');
const SKY_AFTERNOON = require('../../../assets/environment/sky_afternoon.webp');
const SKY_DUSK = require('../../../assets/environment/sky_dusk.webp');
const SKY_STORM = require('../../../assets/environment/sky_storm.webp');
const SKY_SHADOW = require('../../../assets/environment/sky_shadow.webp');
const ROOF_IMG = require('../../../assets/environment/roof.png');
// Per-phase foundations (hand-lit per phase: day green -> dusk dry -> night
// blue), indexed by game phase; phase 5 reuses the shadow foundation, like the
// sky. All normalized to one box size so the house never jumps between phases.
const FOUNDATION_IMGS = [
  require('../../../assets/environment/foundation_0.png'),
  require('../../../assets/environment/foundation_1.png'),
  require('../../../assets/environment/foundation_2.png'),
  require('../../../assets/environment/foundation_3.png'),
  require('../../../assets/environment/foundation_4.png'),
];
const WALL_IMG = require('../../../assets/environment/wall.png');
const EDGE_SHADOW_IMG = require('../../../assets/environment/wall_edge_shadow.png');
const PIT_ENTRANCE_IMG = require('../../../assets/environment/pit_entrance.png');
const HOUSE_SHADOW_IMG = require('../../../assets/environment/house_shadow.png');
const SHADOW_FIGURE_IMG = require('../../../assets/environment/shadow_figure.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
// AMBIENT PARTICLE SYSTEM — phase-graded living atmosphere
// ═══════════════════════════════════════════════════════════════════════════
// Tinted-View motes (not emoji glyphs) drifting over the diorama. They age with
// the phase ladder: warm bright pollen/spark at 0-1, dimmer desaturated drift
// at 2-3, sparse crimson-tinged embers that FALL at 4-5. Native-driver
// transform + opacity only; the tint is a static per-particle backgroundColor
// (no JS-bridge color animation). Density scales down off the high tier and is
// zeroed entirely under reducedMotion / low-tier (see the spawner effect).

type ParticleDirection = 'up' | 'down';

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  /** Static tint (no animated backgroundColor). */
  color: string;
  /** Base dot size in dp (scaled by the animated `scale`). */
  size: number;
  duration: number;
  direction: ParticleDirection;
  /** Horizontal sway amplitude in dp. */
  drift: number;
  peakOpacity: number;
  /** Draw a soft same-color halo behind the core (bright/ember phases). */
  glow: boolean;
}

interface AmbientParticleConfig {
  /** Tint palette (all tinted, phase-appropriate; no pure white/black/gray). */
  colors: string[];
  size: number;
  /** Simultaneous-particle ceiling at the high tier (scaled down on medium). */
  maxCount: number;
  /** Spawn interval in ms (sparser as the dread grows). */
  spawnMs: number;
  durationMin: number;
  durationRange: number;
  direction: ParticleDirection;
  peakOpacity: number;
  drift: number;
  glow: boolean;
}

// Phase register: warm gold motes rising (0-1) -> dimmer desaturated lavender
// drift (2-3) -> sparse crimson embers sinking heavily (4-5).
const AMBIENT_PARTICLES_BY_PHASE: Record<number, AmbientParticleConfig> = {
  0: { colors: ['#FFE9A8', '#FFD27A', '#FFF3C4', '#FBE7B0'], size: 6, maxCount: 8, spawnMs: 1900, durationMin: 8000, durationRange: 5000, direction: 'up', peakOpacity: 0.85, drift: 60, glow: true },
  1: { colors: ['#FCE0A0', '#EBD9B4', '#F0C98A'], size: 5, maxCount: 7, spawnMs: 2300, durationMin: 9000, durationRange: 5000, direction: 'up', peakOpacity: 0.7, drift: 52, glow: true },
  2: { colors: ['#C9B6D6', '#B7A6C4', '#A69AB8'], size: 5, maxCount: 5, spawnMs: 3200, durationMin: 11000, durationRange: 5000, direction: 'up', peakOpacity: 0.5, drift: 42, glow: false },
  3: { colors: ['#8E7EA0', '#7C6E8E', '#6E6480'], size: 4, maxCount: 4, spawnMs: 4200, durationMin: 13000, durationRange: 6000, direction: 'up', peakOpacity: 0.42, drift: 32, glow: false },
  4: { colors: ['#C25A3A', '#A83C2A', '#8B2E22'], size: 4, maxCount: 4, spawnMs: 4200, durationMin: 12000, durationRange: 5000, direction: 'down', peakOpacity: 0.5, drift: 28, glow: true },
  5: { colors: ['#7A5C86', '#8B2E4A', '#6B5B8A'], size: 4, maxCount: 3, spawnMs: 5000, durationMin: 14000, durationRange: 6000, direction: 'down', peakOpacity: 0.45, drift: 24, glow: true },
};

const FloatingParticle: React.FC<{ particle: Particle }> = ({ particle }) => {
  useEffect(() => {
    const startX = Math.random() * SCREEN_WIDTH;
    const endX = startX + (Math.random() - 0.5) * particle.drift * 2;
    const rising = particle.direction === 'up';
    // Rising motes climb from below; sinking embers fall from above the frame.
    const startY = rising ? SCREEN_HEIGHT + 20 : -30;
    const endY = rising ? -50 : SCREEN_HEIGHT + 40;

    particle.x.setValue(startX);
    particle.y.setValue(startY);
    particle.opacity.setValue(0);
    particle.scale.setValue(0.6 + Math.random() * 0.6);

    const anim = Animated.parallel([
      // Vertical travel — embers accelerate downward (heavy), motes drift even.
      Animated.timing(particle.y, {
        toValue: endY,
        duration: particle.duration,
        easing: rising ? Easing.linear : Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      // Gentle sway
      Animated.timing(particle.x, {
        toValue: endX,
        duration: particle.duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      // Fade in, hold, fade out
      Animated.sequence([
        Animated.timing(particle.opacity, {
          toValue: particle.peakOpacity,
          duration: particle.duration * 0.2,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: particle.peakOpacity,
          duration: particle.duration * 0.55,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: particle.duration * 0.25,
          useNativeDriver: true,
        }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  const halo = particle.size * 2;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        transform: [
          { translateX: particle.x },
          { translateY: particle.y },
          { scale: particle.scale },
        ],
        opacity: particle.opacity,
      }}
      pointerEvents="none"
    >
      {particle.glow && (
        <View
          style={{
            position: 'absolute',
            left: -particle.size * 0.5,
            top: -particle.size * 0.5,
            width: halo,
            height: halo,
            borderRadius: halo / 2,
            backgroundColor: particle.color,
            opacity: 0.22,
          }}
        />
      )}
      <View
        style={{
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        }}
      />
    </Animated.View>
  );
};

/**
 * Ambient particle layer, extracted into its own memoized component so its
 * ~2s spawn setState never re-renders the parent HouseWorld. If it lived on
 * HouseWorld, a spawn tick would re-commit the pan's `translateY` transform
 * (with its stale JS value mid-settle-spring, a one-frame jump on the scene).
 * Rendered in screen space (absolute-fill, pointer-transparent) ABOVE the pan
 * handler, so the bottom-anchored opaque sky can never paint over it at rest.
 */
const AmbientParticles: React.FC<{
  phase: DialoguePhase;
  ambientMotionEnabled: boolean;
  isFullMoon: boolean;
}> = React.memo(({ phase, ambientMotionEnabled, isFullMoon }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);

  // Spawn phase-graded ambient particles. `ambientMotionEnabled` is already
  // false under reducedMotion / low-tier (zero particles there); the medium
  // tier gets a reduced ceiling on top.
  useEffect(() => {
    if (!ambientMotionEnabled) {
      setParticles([]);
      return;
    }

    const config = AMBIENT_PARTICLES_BY_PHASE[phase] ?? AMBIENT_PARTICLES_BY_PHASE[0];
    // High tier keeps the full count; medium thins it (density scales DOWN).
    const tierScale = getDeviceTier() === 'high' ? 1 : 0.6;
    // Full-moon event nights get a denser firefly drift from dusk on (F20) —
    // a modest boost, still capped by the tier scale above.
    const eventFireflyBoost = isFullMoon && phase >= 2;
    const maxCount = Math.max(2, Math.round(config.maxCount * tierScale * (eventFireflyBoost ? 1.4 : 1)));
    const spawnMs = eventFireflyBoost ? Math.round(config.spawnMs * 0.7) : config.spawnMs;

    const spawnParticle = () => {
      const newParticle: Particle = {
        id: particleIdRef.current++,
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(1),
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        size: config.size,
        duration: config.durationMin + Math.random() * config.durationRange,
        direction: config.direction,
        drift: config.drift,
        peakOpacity: config.peakOpacity,
        glow: config.glow,
      };

      // Bounded: keep only the last (maxCount - 1) + the new one.
      setParticles(prev => [...prev.slice(-(maxCount - 1)), newParticle]);
    };

    const interval = setInterval(spawnParticle, spawnMs);
    spawnParticle(); // Spawn one immediately

    return () => clearInterval(interval);
  }, [phase, ambientMotionEnabled, isFullMoon]);

  return (
    <View style={styles.particleOverlay} pointerEvents="none">
      {particles.map(particle => (
        <FloatingParticle key={particle.id} particle={particle} />
      ))}
    </View>
  );
});
AmbientParticles.displayName = 'AmbientParticles';

// ═══════════════════════════════════════════════════════════════════════════
// SMOKE PUFF ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

const SmokePuff: React.FC<{ delay: number; isStatic?: boolean; tint?: string }> = ({ delay, isStatic = false, tint }) => {
  const y = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const mountedRef = useRef(true);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    if (isStatic) {
      y.setValue(0);
      x.setValue(0);
      opacity.setValue(0);
      scale.setValue(0.5);
      return () => {
        mountedRef.current = false;
      };
    }

    const animate = () => {
      if (!mountedRef.current) return;

      y.setValue(0);
      x.setValue(0);
      opacity.setValue(0);
      scale.setValue(0.5);

      const anim = Animated.parallel([
        Animated.timing(y, {
          toValue: -40,
          duration: 3000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
          delay,
        }),
        Animated.timing(x, {
          toValue: 15 + Math.random() * 10,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          delay,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 500,
            useNativeDriver: true,
            delay,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(scale, {
          toValue: 1.5,
          duration: 3000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
          delay,
        }),
      ]);
      animationRef.current = anim;
      anim.start(() => {
        if (mountedRef.current) animate();
      });
    };

    animate();

    return () => {
      mountedRef.current = false;
      if (animationRef.current) animationRef.current.stop();
    };
  }, [isStatic, delay, y, x, opacity, scale]);

  // Soft volumetric puff: three overlapping feathered borderRadius circles (no
  // 💨 glyph). `tint` lets it darken toward ash as the phase deepens.
  const puffColor = tint ?? 'rgba(214, 214, 214, 0.85)';
  return (
    <Animated.View
      style={{
        position: 'absolute',
        transform: [{ translateX: x }, { translateY: y }, { scale }],
        opacity,
      }}
      pointerEvents="none"
    >
      <View style={smokeStyles.puffCluster}>
        <View style={[smokeStyles.puffLobeA, { backgroundColor: puffColor }]} />
        <View style={[smokeStyles.puffLobeB, { backgroundColor: puffColor }]} />
        <View style={[smokeStyles.puffLobeC, { backgroundColor: puffColor }]} />
      </View>
    </Animated.View>
  );
};

const smokeStyles = StyleSheet.create({
  puffCluster: {
    width: 20,
    height: 16,
  },
  puffLobeA: {
    position: 'absolute',
    left: 2,
    top: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.85,
  },
  puffLobeB: {
    position: 'absolute',
    left: 8,
    top: 1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    opacity: 0.7,
  },
  puffLobeC: {
    position: 'absolute',
    left: 6,
    top: 6,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    opacity: 0.6,
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// FLYING BIRD ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

// A small dark bird silhouette (no emoji): a shallow wing "V" + a body dot + a
// leading head bump. Wings flap via scaleY; the whole bird flips with scaleX
// so it always faces its travel direction (F16). The caller only renders this
// at the bright phases (F16) — songbirds don't cross the dread-phase skies.
const FlyingBird: React.FC<{ startDelay: number; yPosition: number }> = ({ startDelay, yPosition }) => {
  const x = useRef(new Animated.Value(-50)).current;
  const y = useRef(new Animated.Value(yPosition)).current;
  const flapRotation = useRef(new Animated.Value(0)).current;
  const [facingRight, setFacingRight] = useState(true);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flapAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const moveAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    const animate = () => {
      if (!mountedRef.current) return;

      const goingRight = Math.random() > 0.5;
      setFacingRight(goingRight);
      x.setValue(goingRight ? -50 : SCREEN_WIDTH + 50);
      y.setValue(yPosition + (Math.random() - 0.5) * 40);

      const flapAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(flapRotation, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(flapRotation, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ])
      );
      flapAnimRef.current = flapAnimation;
      flapAnimation.start();

      const moveAnimation = Animated.timing(x, {
        toValue: goingRight ? SCREEN_WIDTH + 50 : -50,
        duration: 8000 + Math.random() * 4000,
        easing: Easing.linear,
        useNativeDriver: true,
        delay: startDelay,
      });
      moveAnimRef.current = moveAnimation;
      moveAnimation.start(() => {
        flapAnimation.stop();
        if (!mountedRef.current) return;
        timeoutRef.current = setTimeout(animate, 5000 + Math.random() * 10000);
      });
    };

    animate();

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (flapAnimRef.current) flapAnimRef.current.stop();
      if (moveAnimRef.current) moveAnimRef.current.stop();
    };
  }, []);

  const scaleY = flapRotation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        transform: [{ translateX: x }, { translateY: y }, { scaleX: facingRight ? 1 : -1 }],
      }}
      pointerEvents="none"
    >
      <Animated.View style={{ transform: [{ scaleY }] }}>
        <View style={birdStyles.wingBox}>
          <View style={birdStyles.wingLeft} />
          <View style={birdStyles.wingRight} />
          <View style={birdStyles.body} />
          <View style={birdStyles.head} />
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const BIRD_COLOR = '#3B3B4E';
const birdStyles = StyleSheet.create({
  wingBox: {
    width: 22,
    height: 12,
  },
  // Two thin rotated wings meeting at the body — a shallow gull "V".
  wingLeft: {
    position: 'absolute',
    top: 3,
    left: 1,
    width: 11,
    height: 3,
    borderRadius: 2,
    backgroundColor: BIRD_COLOR,
    transform: [{ rotate: '18deg' }],
  },
  wingRight: {
    position: 'absolute',
    top: 3,
    left: 10,
    width: 11,
    height: 3,
    borderRadius: 2,
    backgroundColor: BIRD_COLOR,
    transform: [{ rotate: '-18deg' }],
  },
  body: {
    position: 'absolute',
    top: 4,
    left: 9,
    width: 5,
    height: 4,
    borderRadius: 2,
    backgroundColor: BIRD_COLOR,
  },
  // A tiny head bump on the leading (right, pre-flip) side so the flip reads.
  head: {
    position: 'absolute',
    top: 3.5,
    left: 13,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: BIRD_COLOR,
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// SHOOTING STAR (appears at higher phases)
// ═══════════════════════════════════════════════════════════════════════════

const ShootingStar: React.FC = () => {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    const animate = () => {
      if (!mountedRef.current) return;

      const startX = Math.random() * SCREEN_WIDTH;
      x.setValue(startX);
      y.setValue(20 + Math.random() * 60);
      opacity.setValue(0);

      const anim = Animated.parallel([
        Animated.timing(x, {
          toValue: startX + 150,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: 100 + Math.random() * 50,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ]);
      animationRef.current = anim;
      anim.start(() => {
        if (!mountedRef.current) return;
        timeoutRef.current = setTimeout(animate, 10000 + Math.random() * 20000);
      });
    };

    timeoutRef.current = setTimeout(animate, 5000 + Math.random() * 10000);

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (animationRef.current) animationRef.current.stop();
    };
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        transform: [{ translateX: x }, { translateY: y }],
        opacity,
      }}
      pointerEvents="none"
    >
      {/* A thin light streak angled along the fall path, with a brighter head
          dot — no ⭐ glyph. */}
      <View style={shootingStarStyles.streak} />
      <View style={shootingStarStyles.head} />
    </Animated.View>
  );
};

const shootingStarStyles = StyleSheet.create({
  streak: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    transform: [{ rotate: '30deg' }],
  },
  head: {
    position: 'absolute',
    right: -1,
    top: 3,
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    backgroundColor: '#FFFFFF',
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// NIGHT STAR GLINT - two-View sparkle (replaces the ✦ glyph, F13/F64)
// ═══════════════════════════════════════════════════════════════════════════

const NIGHT_STAR_COLOR = 'rgba(240, 244, 255, 1)';

const NightStarGlint: React.FC<{
  left: `${number}%`;
  top: `${number}%`;
  size: number;
  baseOpacity: number;
  twinkle: boolean;
  delay: number;
}> = ({ left, top, size, baseOpacity, twinkle, delay }) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!twinkle) {
      pulse.setValue(1);
      return;
    }
    pulse.setValue(0.45);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [twinkle, delay, pulse]);

  const s = size * 0.9;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        width: s,
        height: s,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: twinkle ? Animated.multiply(pulse, baseOpacity) : baseOpacity,
      }}
    >
      <View style={[nightStarStyles.square, { backgroundColor: NIGHT_STAR_COLOR }]} />
      <View style={[nightStarStyles.diamond, { backgroundColor: NIGHT_STAR_COLOR }]} />
    </Animated.View>
  );
};

const nightStarStyles = StyleSheet.create({
  square: {
    ...StyleSheet.absoluteFill,
    borderRadius: 1,
  },
  diamond: {
    ...StyleSheet.absoluteFill,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
});

// Phase-aware backdrop colors behind the sky image. Each value is the average
// of the TOP row of pixels of that phase's sky asset, so when the scene is
// panned up the sky appears to extend upward seamlessly (no color step).
// Sampled from assets/environment/sky_*.png (scripts/tools/reworkSkies.mjs
// prints the storm/shadow samples; re-sample if the sky assets regenerate).
// Phase→sky mapping mirrors the <Image source> below: 0=day, 1=afternoon,
// 2=dusk, 3=storm, 4+=shadow (Phase 5 reuses sky_shadow).
const PHASE_BG_COLORS: Record<number, string> = {
  0: '#439cf2', // sky_day.png top row
  1: '#1583f9', // sky_afternoon.png top row
  2: '#684381', // sky_dusk.png top row
  3: '#000000', // sky_storm.png top row (post-rework pre-storm night)
  4: '#050816', // sky_shadow.png top row
  5: '#050816', // Phase 5 renders sky_shadow too — same top row
};

// Ground seam guard below the sky image. The sky Image is bottom-anchored to
// the container, so its artwork always reaches the last visible pixel row —
// this band sits BELOW the container bottom (with a 1px overlap) purely to
// guard against sub-pixel rounding seams. It is painted with the average
// color of the sky asset's BOTTOM pixel row so even that 1px reads as grass.
// Sampled via the same scratch pngjs approach as PHASE_BG_COLORS — re-sample
// if the sky assets are regenerated.
const PHASE_GROUND_COLORS: Record<number, string> = {
  0: '#8ba232', // sky_day.png bottom row (meadow grass)
  1: '#557718', // sky_afternoon.png bottom row
  2: '#6d4018', // sky_dusk.png bottom row
  3: '#192330', // sky_storm.png bottom row (post-rework drained meadow)
  4: '#182131', // sky_shadow.png bottom row
  5: '#182131', // Phase 5 renders sky_shadow too
};

// Per-phase house lighting. The house art is drawn in daylight; these tints
// sit it into each sky's ambient light (values tuned against offline
// composites of the real assets over all five skies). `ext` is the exterior
// strength (roof / walls / foundation / pit); `room` is deliberately about
// half of it so the lit interiors keep glowing against the darkened shell,
// like windows at night. Non-rectangular pieces (roof, pit) are tinted with
// a same-source overlay Image + tintColor, which follows the art's alpha
// silhouette exactly.
const PHASE_HOUSE_TINT: Record<number, { color: string; ext: number; room: number }> = {
  0: { color: '#000000', ext: 0, room: 0 },      // day: untouched
  1: { color: '#FFBE6E', ext: 0.06, room: 0.03 }, // afternoon: faint warm gold
  2: { color: '#D66E46', ext: 0.14, room: 0.07 }, // dusk: warm sunset rose
  3: { color: '#0E1A36', ext: 0.45, room: 0.22 }, // storm night: deep blue
  4: { color: '#080818', ext: 0.55, room: 0.27 }, // shadow: near-black indigo
  5: { color: '#140E28', ext: 0.48, room: 0.24 }, // terrible peace: softer mauve dark
};

// Contact-shadow appearance by phase: color follows the ground it falls on
// (green meadow -> sunset earth -> night blues) and the strength softens as
// the direct sunlight goes away.
const CONTACT_SHADOW: Record<number, { color: string; mult: number }> = {
  0: { color: '#0A1408', mult: 1 },
  1: { color: '#1A1206', mult: 1 },
  2: { color: '#170B04', mult: 0.85 },
  3: { color: '#030812', mult: 0.6 },
  4: { color: '#020409', mult: 0.5 },
  5: { color: '#020409', mult: 0.5 },
};

// ═══════════════════════════════════════════════════════════════════════════
// ARRANGEMENT CONNECTOR - Visual sigil lines connecting rooms
// ═══════════════════════════════════════════════════════════════════════════

// Glow is built from layered Views (a wider, fainter underlay beneath the
// crisp line), NOT shadowColor/shadowRadius — Android renders no blur for
// View shadow radii, so the old shadow-based glow was iOS-only. The layers
// share one native-driven opacity pulse (static under reduced motion /
// low-tier devices).
const ArrangementConnector: React.FC<{ phase: number; tendingIntensity?: number }> = ({
  phase,
  tendingIntensity = 0,
}) => {
  let lineWidth = phase === 5 ? 1.5 : phase >= 4 ? 3 : phase >= 3 ? 2 : 1;
  const lineColor = phase === 5 ? '#6B5B8A' : phase >= 4 ? '#8B2252' : phase >= 3 ? '#6B4C8A' : '#9B7FCF';
  let lineOpacity = phase === 5 ? 0.3 : phase >= 4 ? 0.7 : phase >= 3 ? 0.4 : 0.2;
  let showNodes = phase >= 3;
  let showGlow = phase === 4;

  // Phase-5 "deepening": as the player tends the pattern, the dormant sigils
  // on the house brighten, thicken, light their nodes, and begin to glow — a
  // visible, serene reward for tending that needs no new art.
  const t = phase === 5 ? Math.max(0, Math.min(1, tendingIntensity)) : 0;
  if (t > 0) {
    lineOpacity = 0.3 + t * 0.5;        // 0.3 → 0.8
    lineWidth = 1.5 + t * 2.5;          // 1.5 → 4
    showNodes = t > 0.25;
    showGlow = t > 0.4;
  }

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animatePulse =
    showGlow && !getSettingsSync().reducedMotion && !shouldSimplifyAnimations();

  useEffect(() => {
    if (!animatePulse) {
      pulseAnim.setValue(1);
      return;
    }
    pulseAnim.setValue(0.65);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.65,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animatePulse, pulseAnim]);

  if (phase < 2) return null;

  // At Phase 5 the tending glow is serene mauve (the line's own color), never
  // the Phase-4 ember crimson.
  const glowColor = t > 0 ? lineColor : '#FF4444';

  return (
    <View style={arrangementStyles.connector}>
      {/* Layered-View glow: wide faint halo + tighter brighter halo under the
          crisp line. Tending intensity keeps its scaling (opacity climbs). */}
      {showGlow && (
        <>
          <Animated.View
            style={[
              arrangementStyles.glowLayer,
              {
                width: lineWidth + 10,
                backgroundColor: glowColor,
                opacity: Animated.multiply(pulseAnim, 0.16 + t * 0.12),
              },
            ]}
          />
          <Animated.View
            style={[
              arrangementStyles.glowLayer,
              {
                width: lineWidth + 5,
                backgroundColor: glowColor,
                opacity: Animated.multiply(pulseAnim, 0.3 + t * 0.18),
              },
            ]}
          />
        </>
      )}
      {/* Vertical line (crisp core) */}
      <View
        style={[
          arrangementStyles.line,
          {
            width: lineWidth,
            backgroundColor: lineColor,
            opacity: lineOpacity,
          },
        ]}
      />
      {/* Node halo (layered glow behind the crisp node circle) */}
      {showNodes && showGlow && (
        <Animated.View
          style={[
            arrangementStyles.nodeHalo,
            {
              backgroundColor: glowColor,
              opacity: Animated.multiply(pulseAnim, 0.35 + t * 0.2),
            },
          ]}
        />
      )}
      {/* Node circle at connection point */}
      {showNodes && (
        <View
          style={[
            arrangementStyles.node,
            { borderColor: lineColor },
            showGlow && arrangementStyles.nodeGlowCore,
            showGlow && t > 0 && { backgroundColor: lineColor, borderColor: lineColor },
          ]}
        />
      )}
    </View>
  );
};

const arrangementStyles = StyleSheet.create({
  connector: {
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    height: '100%',
  },
  // Soft halo strips beneath the crisp line (absolute children center via the
  // connector's alignItems/justifyContent, like the node).
  glowLayer: {
    position: 'absolute',
    height: '100%',
    borderRadius: 3,
  },
  node: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  nodeGlowCore: {
    backgroundColor: '#8B2252',
    borderColor: '#FF4444',
  },
  nodeHalo: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// HOUSE SIGIL OVERLAY - the true "Arrangement pattern" (F18)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * HouseSigilOverlay — an absolute, non-interactive layer spanning the whole
 * house body that draws a zig-zag geometric figure connecting alternating
 * room-column corners, plus node dots at the joints. Replaces the old 10dp
 * hairline dash hidden between room cards with a pattern that actually reads
 * as inscribed across the facade.
 *
 * Phase register: barely subliminal at Phase 2 (0.06-0.1 - "felt before
 * told"), lavender/dusk through the shadows, crimson with the same
 * Android-safe layered-View glow technique as ArrangementConnector at Phase 4.
 * tendingIntensity extends the figure with extra segments at Phase 5. Pure
 * Views + one shared native opacity pulse (glow states only); static under
 * reduced motion / low-tier devices.
 */
const HouseSigilOverlay: React.FC<{
  phase: number;
  bodyWidth: number;
  bodyHeight: number;
  tendingIntensity?: number;
}> = ({ phase, bodyWidth, bodyHeight, tendingIntensity = 0 }) => {
  const t = phase === 5 ? Math.max(0, Math.min(1, tendingIntensity)) : 0;

  const lineColor = phase === 5 ? '#6B5B8A' : phase >= 4 ? '#8B2252' : phase >= 3 ? '#6B4C8A' : '#9B7FCF';
  let baseOpacity = phase >= 4 ? 0.5 : phase === 3 ? 0.22 : 0.08; // phase 2 stays subliminal
  const lineThickness = phase >= 4 ? 2.5 : phase >= 3 ? 2 : 1.5;
  let showGlow = phase === 4;
  if (t > 0) {
    baseOpacity = 0.18 + t * 0.45;
    showGlow = t > 0.4;
  }

  const pulse = useRef(new Animated.Value(1)).current;
  const animatePulse = showGlow && !getSettingsSync().reducedMotion && !shouldSimplifyAnimations();

  useEffect(() => {
    if (!animatePulse) {
      pulse.setValue(1);
      return;
    }
    pulse.setValue(0.7);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.7, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animatePulse, pulse]);

  // The zig-zag: anchor points alternate between a left and right column,
  // evenly spaced top-to-bottom. Node count grows a touch with tending so the
  // figure visibly "extends" as the player deepens the pattern at Phase 5.
  const geometry = useMemo(() => {
    if (bodyWidth <= 0 || bodyHeight <= 0) return null;
    const inset = 0.14;
    const usableTop = bodyHeight * inset;
    const usableBottom = bodyHeight * (1 - inset);
    const nodeCount = Math.max(4, Math.min(9, 5 + Math.round(t * 3)));
    const leftX = bodyWidth * 0.28;
    const rightX = bodyWidth * 0.72;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const frac = nodeCount === 1 ? 0 : i / (nodeCount - 1);
      points.push({
        x: i % 2 === 0 ? leftX : rightX,
        y: usableTop + (usableBottom - usableTop) * frac,
      });
    }
    // RN rotates a View about its own center, so each bar is placed with its
    // center at the segment midpoint and rotated to the p->q angle.
    const segments = points.slice(0, -1).map((p, i) => {
      const q = points[i + 1];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      return { midX: (p.x + q.x) / 2, midY: (p.y + q.y) / 2, len, angleDeg };
    });
    return { points, segments };
  }, [bodyWidth, bodyHeight, t]);

  if (!geometry || phase < 2) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[sigilOverlayStyles.overlay, { opacity: showGlow ? Animated.multiply(pulse, baseOpacity) : baseOpacity }]}
      importantForAccessibility="no-hide-descendants"
    >
      {geometry.segments.map((seg, i) => (
        <React.Fragment key={`sigil-seg-${i}`}>
          {showGlow && (
            <View
              style={[
                sigilOverlayStyles.segment,
                {
                  left: seg.midX - seg.len / 2,
                  top: seg.midY - (lineThickness + 5) / 2,
                  width: seg.len,
                  height: lineThickness + 5,
                  borderRadius: (lineThickness + 5) / 2,
                  backgroundColor: lineColor,
                  opacity: 0.35,
                  transform: [{ rotate: `${seg.angleDeg}deg` }],
                },
              ]}
            />
          )}
          <View
            style={[
              sigilOverlayStyles.segment,
              {
                left: seg.midX - seg.len / 2,
                top: seg.midY - lineThickness / 2,
                width: seg.len,
                height: lineThickness,
                backgroundColor: lineColor,
                transform: [{ rotate: `${seg.angleDeg}deg` }],
              },
            ]}
          />
        </React.Fragment>
      ))}
      {geometry.points.map((p, i) => (
        <View
          key={`sigil-node-${i}`}
          style={[
            sigilOverlayStyles.node,
            {
              left: p.x - 3,
              top: p.y - 3,
              borderColor: lineColor,
              backgroundColor: showGlow || t > 0 ? lineColor : 'transparent',
            },
          ]}
        />
      ))}
    </Animated.View>
  );
};

const sigilOverlayStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Each segment is a thin rotated bar centered on the segment midpoint.
  segment: {
    position: 'absolute',
  },
  node: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// SHADOW FIGURE - The entity. It is never named, never explained.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ShadowFigure — the towering presence behind the house.
 * Invisible until Phase 3. Faint silhouette at Phase 3. Full presence at
 * Phase 4 — looming above the roofline, crimson eyes. Settled at Phase 5.
 *
 * Layers behind the house rooms but in front of the sky (negative zIndex
 * inside houseContainer). Very slow opacity "breathing" (~8s cycle); static
 * under reducedMotion / simplified animations.
 */
const ShadowFigure: React.FC<{ phase: number }> = ({ phase }) => {
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const isStatic = getSettingsSync().reducedMotion || shouldSimplifyAnimations();
  const visible = phase >= 3;

  useEffect(() => {
    if (!visible || isStatic) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, isStatic, breatheAnim]);

  if (!visible) return null;

  // Phase 3: faint silhouette. Phase 4: full presence. Phase 5: settled, calmer.
  const baseOpacity = phase >= 5 ? 0.35 : phase >= 4 ? 0.5 : 0.18;
  const height = phase >= 4 ? ROOM_WIDTH * 2 : ROOF_WIDTH * 1.6;
  const width = height * SHADOW_FIGURE_ASPECT;

  const opacity = isStatic
    ? baseOpacity
    : breatheAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [baseOpacity - 0.05, baseOpacity + 0.05],
      });

  return (
    <Animated.Image
      source={SHADOW_FIGURE_IMG}
      resizeMode="contain"
      style={{
        position: 'absolute',
        // Rise well above the roofline; the base dissolves behind the house.
        top: -height * 0.55,
        alignSelf: 'center',
        width,
        height,
        opacity,
        zIndex: -3, // Behind ground (-2) and trees (-1), in front of the sky
        transform: [{ translateX: 14 }], // Slight off-center for composition
      }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// DRIFTING CLOUD - Soft cloud sprites crossing the sky (Phase 0-2 only)
// ═══════════════════════════════════════════════════════════════════════════

// Soft volumetric cloud drawn from overlapping feathered rounded Views (no
// hollow outline PNG, F13/F64). `tint` lets the cloud dim from bright white
// toward a dusky grey as the phase darkens.
// Soft volumetric cloud drawn from overlapping feathered rounded Views (no
// hollow outline PNG, F13/F64). `tint` lets the cloud dim from bright white
// toward a dusky grey as the phase darkens.
const CloudShape: React.FC<{ width: number; tint: string }> = ({ width, tint }) => {
  const h = width / 2;
  return (
    <View style={{ width, height: h }}>
      <View style={{ position: 'absolute', left: width * 0.06, top: h * 0.42, width: width * 0.5, height: h * 0.58, borderRadius: h * 0.3, backgroundColor: tint, opacity: 0.85 }} />
      <View style={{ position: 'absolute', left: width * 0.42, top: h * 0.42, width: width * 0.52, height: h * 0.58, borderRadius: h * 0.3, backgroundColor: tint, opacity: 0.8 }} />
      <View style={{ position: 'absolute', left: width * 0.24, top: h * 0.16, width: width * 0.36, height: h * 0.7, borderRadius: h * 0.35, backgroundColor: tint, opacity: 0.95 }} />
      <View style={{ position: 'absolute', left: width * 0.5, top: h * 0.24, width: width * 0.3, height: h * 0.62, borderRadius: h * 0.31, backgroundColor: tint, opacity: 0.9 }} />
      <View style={{ position: 'absolute', left: width * 0.12, top: h * 0.5, width: width * 0.8, height: h * 0.4, borderRadius: h * 0.2, backgroundColor: tint, opacity: 0.7 }} />
    </View>
  );
};

const DriftingCloud: React.FC<{
  width: number;
  top: number;
  /** Full screen-traverse duration in ms */
  duration: number;
  /** 0..1 starting position across the sky */
  initialProgress: number;
  opacity: number;
  /** Cloud body color (phase-dimmed by the caller). */
  tint: string;
}> = ({ width, top, duration, initialProgress, opacity, tint }) => {
  const travel = SCREEN_WIDTH + width;
  const x = useRef(new Animated.Value(-width + travel * initialProgress)).current;
  const mountedRef = useRef(true);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const isStatic = getSettingsSync().reducedMotion || shouldSimplifyAnimations();

  useEffect(() => {
    if (isStatic) return; // Static cloud position under reduced motion / low-end devices
    mountedRef.current = true;

    const drift = (fromX: number) => {
      if (!mountedRef.current) return;
      x.setValue(fromX);
      const remaining = (SCREEN_WIDTH - fromX) / travel;
      const anim = Animated.timing(x, {
        toValue: SCREEN_WIDTH,
        duration: Math.max(1000, duration * remaining),
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animRef.current = anim;
      anim.start(({ finished }) => {
        if (finished && mountedRef.current) drift(-width);
      });
    };

    drift(-width + travel * initialProgress);

    return () => {
      mountedRef.current = false;
      animRef.current?.stop();
    };
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top,
        width,
        height: width / 2,
        opacity,
        transform: [{ translateX: x }],
      }}
    >
      <CloudShape width={width} tint={tint} />
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MOON GLOW - Full-moon live-event world treatment high in the night sky (F20)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * MoonGlow — a soft cool halo high in the sky on full-moon event nights
 * (deterministic local-calendar event; see liveEvents.ts). Only shown from
 * Phase 2 on (the dusk/night skies) — the bright day skies of Phases 0-1 get
 * nothing, since daytime is honest about the event. Four graduated cool ovals
 * (the same layered-glow technique used elsewhere) with a very slow
 * native-driven breath; static under reduced motion / low-tier devices. Pure
 * Views + one opacity loop, no new art.
 */
const MoonGlow: React.FC = () => {
  const breathe = useRef(new Animated.Value(0)).current;
  const isStatic = getSettingsSync().reducedMotion || shouldSimplifyAnimations();

  useEffect(() => {
    if (isStatic) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isStatic, breathe]);

  const opacity = isStatic ? 0.7 : breathe.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.85] });

  return (
    <Animated.View pointerEvents="none" style={[moonGlowStyles.wrap, { left: SCREEN_WIDTH * 0.62, opacity }]}>
      <View style={moonGlowStyles.halo1} />
      <View style={moonGlowStyles.halo2} />
      <View style={moonGlowStyles.halo3} />
      <View style={moonGlowStyles.disc} />
    </Animated.View>
  );
};

const MOON_HALO = 'rgba(198, 206, 236, 1)';
const moonGlowStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 26,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: MOON_HALO,
    opacity: 0.07,
  },
  halo2: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: MOON_HALO,
    opacity: 0.11,
  },
  halo3: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: MOON_HALO,
    opacity: 0.18,
  },
  disc: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(226, 230, 246, 0.9)',
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// PIT ATTENTION GLOW - Warm pulse around the pit entrance when offerings wait
// ═══════════════════════════════════════════════════════════════════════════

// F78: the pit's attention pulse slows into a smolder as the descent deepens —
// same warm halo, longer breath (bright base 1400ms -> ~2200ms at Phase 3 ->
// ~2800ms at Phase 4+). Mirrors DailyChallengeCard's phase-scaled pulse so both
// attention cues age together instead of staying brightly-cadenced late.
const getPitPulseMs = (phase: number): number => {
  if (phase >= 4) return 2800;
  if (phase >= 3) return 2200;
  return 1400;
};

/**
 * PitAttentionGlow — a soft warm halo behind the pit entrance, shown when
 * harvest batches are waiting to be offered. Four concentric graduated ovals
 * (130/100/70/45%, low stepped alphas) so the edge dissolves instead of
 * reading as a hard orange sticker (F17). One native-driven opacity loop, peak
 * wrapper opacity capped at 0.85 so the edge never fully hardens; renders at a
 * static mid-opacity under reducedMotion / simplified animations. The pulse
 * period lengthens with the phase (F78) so the cue smolders, not sparkles, late.
 */
const PitAttentionGlow: React.FC<{ phase: number }> = ({ phase }) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const isStatic = getSettingsSync().reducedMotion || shouldSimplifyAnimations();
  const halfCycle = getPitPulseMs(phase);

  useEffect(() => {
    if (isStatic) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: halfCycle,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: halfCycle,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isStatic, halfCycle, pulse]);

  const opacity = isStatic
    ? 0.6 // static mid-opacity — still reads as "the pit wants attention"
    : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] });

  return (
    <Animated.View pointerEvents="none" style={[styles.pitGlow, { opacity }]}>
      <View style={styles.pitGlowRing1} />
      <View style={styles.pitGlowRing2} />
      <View style={styles.pitGlowRing3} />
      <View style={styles.pitGlowRing4} />
    </Animated.View>
  );
};

// House dimensions (single-column layout)
// Room PNGs are 1456x720 (approx 2:1 aspect ratio)
const ROOM_WIDTH = 250;
const ROOM_HEIGHT = ROOM_WIDTH * 0.493865; // Maintains ~2:1 aspect ratio of room PNGs (1456x720)
const ROOM_GAP = 6;
const HOUSE_PADDING = 16;
const HOUSE_WIDTH = ROOM_WIDTH + (HOUSE_PADDING * 2);
// The house BODY is a touch narrower than the foundation/roof so the timber
// side walls are thin and sit WITHIN the stone base instead of overhanging it
// (the base reads as slightly wider than the walls, like a real house). The
// foundation stays HOUSE_WIDTH and the roof still overhangs both.
const HOUSE_BODY_WIDTH = ROOM_WIDTH + HOUSE_PADDING;

// House structure art. roof/foundation/pit_entrance/wall are AI-generated
// pixel art (sources in assets/raw/, processed by
// scripts/tools/processRawWorldArt.mjs — re-run it if the raws change, and
// keep these aspect constants in sync with the processed asset dims).
const ROOF_WIDTH = HOUSE_WIDTH + 30; // Rendered roof width (slight overhang)
const ROOF_RENDER_HEIGHT = Math.round(ROOF_WIDTH * (283 / 792)); // roof.png 792x283
// Foundations are all normalized to 792x120 — stone courses with grass tufts +
// a center dirt path gap baked into the base (the house plants itself into the
// meadow). One box size across phases so the house never jumps.
const FOUNDATION_RENDER_HEIGHT = Math.round(HOUSE_WIDTH * (120 / 792));
// pit_entrance.png is 460x496 (stone well + a stone path leading up to it).
// Rendered box + the tuck under the foundation edge.
const PIT_RENDER_WIDTH = 130;
const PIT_RENDER_HEIGHT = Math.round(PIT_RENDER_WIDTH * (496 / 460)); // 140
// The pit's path top meets the foundation base flush (0 = no overlap); the
// pit renders after the foundation, so a tuck would cover the stone.
const PIT_MARGIN_TOP = 0;
// Net flow height the pit adds below the foundation — used by the pan bounds,
// the contact shadow seat, and the house-vs-art geometry notes below.
const PIT_FLOW_HEIGHT = PIT_RENDER_HEIGHT + PIT_MARGIN_TOP; // 140
const SHADOW_FIGURE_ASPECT = 600 / 1200; // width / height

// Baseline gap between the pit entrance and the container bottom (before the
// PLAY-dock clearance below is added). House-vs-art alignment comes from the
// bottom-anchored sky geometry (SKY_BOX_HEIGHT below), not from nudging this.
const HOUSE_BOTTOM_MARGIN = 30;

// HomeScreen overlays a ~56dp PLAY dock across the bottom of the world; this
// extra in-flow bottom margin (only when the pit renders) keeps the pit
// entrance fully above the dock at rest.
const PIT_DOCK_CLEARANCE = 80;

// ─── Sky geometry: the house sits BELOW the river, on every device ─────────
// All five sky assets are 941x1972 (skyGeometry.test.ts pins this). The river
// crosses the artwork no lower than row ~1335 in every variant; rows
// 1335-1972 are open meadow (the bottom 300 rows are a mirrored meadow
// extension added specifically to give the house below-river seating room).
//
// The sky Image is anchored to the container BOTTOM (bottom: 0) with
// resizeMode="cover". Cover scales by max(boxW/imgW, boxH/imgH); forcing the
// box height to at least boxWidth * imgH/imgW makes the HEIGHT ratio win, so
// the artwork's full height maps exactly onto the box: the art's bottom row
// sits on the container bottom, always, with zero vertical crop. Two
// consequences:
//   1. No fill band can ever show below the art (the old failure mode).
//   2. A feature at image row Y sits exactly (1972 - Y) * scale dp above the
//      container bottom, where scale = SKY_BOX_HEIGHT / 1972 — independent of
//      the container height, header height, or insets.
// The house column is bottom-anchored too (margins below), so the foundation
// top sits at (HOUSE_BOTTOM_MARGIN + PIT_DOCK_CLEARANCE + PIT_FLOW_HEIGHT 140
// + foundation 43) = 293dp above the container bottom.
const SKY_IMG_WIDTH = 941;
const SKY_IMG_HEIGHT = 1972;
// The 940 floor guarantees the seat even on very small / display-size-scaled
// windows (e.g. 320x640dp): scale >= 940/1972 keeps the foundation top at
// image row >= ~1366, below every river (lowest bank ~row 1335). The taller
// pit (137dp flow) pushes the foundation higher up the art than the old one
// did, so this floor is what keeps it out of the water — larger boxes only
// push the house further down the meadow, never back up into the river.
const SKY_BOX_HEIGHT = Math.max(
  SCREEN_HEIGHT,
  Math.ceil(SCREEN_WIDTH * (SKY_IMG_HEIGHT / SKY_IMG_WIDTH)) + 2,
  940,
);


interface HouseWorldProps {
  rooms: Room[];
  animals: Animal[];
  currentPhase: DialoguePhase;
  onAnimalPress: (animal: Animal) => void;
  onRoomPress: (room: Room) => void;
  ritualWords?: string[];
  nextUnlock?: Unlockable | null;
  amberBalance?: number;
  purchasedUpgrades?: Record<string, number>;
  /** Tier-2 deepened roomId → purchase timestamp (same shape as purchasedUpgrades). */
  deepenedRooms?: Record<string, number>;
  /** Tier-3 attunement roomId → level reached 1..3 (level-0 rooms omitted). */
  attunedRooms?: Record<string, number>;
  savedPanY?: number | null;
  onPanYChange?: (panY: number) => void;
  /** Tapping the in-world pit entrance opens the Offering Pit. */
  onPitPress?: () => void;
  /**
   * Offerings are waiting in the pit — renders a soft warm pulsing glow
   * around the pit entrance and extends its accessibility label.
   */
  pitNeedsAttention?: boolean;
  /** Phase-5 Tending Level — drives the "deepening" of the arrangement sigils. */
  tendingLevel?: number;
  /**
   * Hide the in-room "Invite" chips while the invite prompt modal is open, so
   * the chip doesn't peek through the modal's translucent scrim.
   */
  suppressInviteChips?: boolean;
}

export const HouseWorld: React.FC<HouseWorldProps> = ({
  rooms,
  animals,
  currentPhase,
  onAnimalPress,
  onRoomPress,
  ritualWords = [],
  nextUnlock = null,
  amberBalance = 0,
  purchasedUpgrades = {},
  deepenedRooms = {},
  attunedRooms = {},
  savedPanY = null,
  onPanYChange,
  onPitPress,
  pitNeedsAttention = false,
  tendingLevel = 0,
  suppressInviteChips = false,
}) => {
  const tendingIntensity = getTendingIntensity(tendingLevel);
  const ambientMotionEnabled = !getSettingsSync().reducedMotion && !shouldSimplifyAnimations();
  const houseTint = PHASE_HOUSE_TINT[currentPhase] ?? PHASE_HOUSE_TINT[0];
  // Full-moon live event (deterministic local-calendar math, see liveEvents.ts
  // — no network, no Math.random). Cheap pure call; the world treatment below
  // (F20) is gated to Phase 2+, since the bright day skies stay honest.
  const isFullMoon = getActiveEvent() != null;
  // Wall texture sits UNDER the whole-body room scrim, so its own overlay is
  // compensated to land the compound wall tint exactly on `ext`.
  const wallTintOpacity = houseTint.room >= 1
    ? houseTint.ext
    : Math.max(0, (houseTint.ext - houseTint.room) / (1 - houseTint.room));
  // The pit shares the exterior tint, but capped so the well's teal glow
  // survives the night phases instead of washing to flat black.
  const pitTintOpacity = Math.min(houseTint.ext, 0.4);
  const contactShadow = CONTACT_SHADOW[currentPhase] ?? CONTACT_SHADOW[0];
  // Chimney smoke color: warm pale grey while the days are bright, cooling to
  // ash as the descent deepens (F13/F64).
  const smokeTint = currentPhase >= 4
    ? 'rgba(150, 150, 168, 0.8)'
    : currentPhase >= 3
      ? 'rgba(176, 176, 190, 0.82)'
      : currentPhase >= 2
        ? 'rgba(200, 196, 206, 0.85)'
        : 'rgba(220, 220, 224, 0.9)';
  // ─── Pan driver ──────────────────────────────────────────────────────────
  // `panRaw` holds the RAW (un-rubber-banded) pan position and is driven
  // NATIVELY: the gesture writes straight into it via Animated.event, and the
  // release spring animates the same value. It used to be updated by a JS
  // callback calling setValue() on every gesture frame, which meant a JS->native
  // hop plus a style commit per frame while dragging a scene of ~30 animated
  // children and several full-screen images — that is the pan lag.
  //
  // The rubber band is no longer computed in JS either: it is baked into the
  // interpolation below (panRaw -> rendered translateY), so the whole drag,
  // including the overscroll give, runs on the native thread with ZERO JS work.
  const panRaw = useRef(new Animated.Value(0)).current;

  // Refs for gesture tracking
  const panRef = useRef<PanGestureHandler>(null);

  // State tracking for gestures
  const baseTranslateY = useRef(0);
  const currentPanYRef = useRef<number | null>(null);
  // Has the player actually touched the scene during THIS mount? Until they
  // have, `savedPanY` stays the source of truth and the live value is only a
  // provisional rendering of it. See the restore effect for why that matters:
  // this component mounts before the house knows how tall it is, so a live
  // value adopted early is a value clamped against the wrong bound.
  const hasUserPannedRef = useRef(false);
  // Synchronous mirror of panRaw's live value. Animations run on the NATIVE
  // driver, so panRaw's JS value lags the real native value between frames, and
  // stopAnimation()'s callback is ASYNC — reading the base from it left the
  // FIRST frame of a fresh drag using a stale base, flashing the scene toward
  // the bottom before it corrected. Attaching a listener makes RN stream
  // native->JS updates every frame (for native-driven EVENTS too), so this ref
  // is always current and the base can be captured synchronously at BEGAN.
  const liveTranslateYRef = useRef(0);
  // Momentum settle animation (spring) currently decelerating the scene after
  // a release. A new gesture stops it; the physics is instant (no momentum /
  // rubber-band) under reducedMotion or on low-tier devices.
  const settleAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const panPhysicsEnabled = !getSettingsSync().reducedMotion && !shouldSimplifyAnimations();

  // Track container height for proper initial positioning
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const onContainerLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setContainerHeight(height);
    }
  }, []);

  // Memoize night star glint positions/sizes to prevent flicker on re-render.
  // Full-moon event nights raise the count +30% (F20) — cheap, tier-gated.
  const nightStars = useMemo(() => {
    const count = isFullMoon ? 16 : 12;
    return [...Array(count)].map((_, i) => ({
      id: i,
      left: `${10 + (i * 7) % 80}%` as `${number}%`,
      top: `${5 + (i * 11) % 15}%` as `${number}%`,
      opacity: 0.3 + (((i * 17 + 7) % 10) / 10) * 0.5,
      size: 8 + (((i * 13 + 3) % 10) / 10) * 6,
      // Staggered twinkle phase so the glints don't pulse in lockstep.
      twinkleDelay: (i % 4) * 500,
    }));
  }, [isFullMoon]);

  // The ambient particle system lives in the memoized <AmbientParticles> child
  // (below, in screen space) so its ~2s spawn setState never re-renders this
  // component and never invalidates the pan container's cached texture.

  // Get unlocked rooms plus a single "next room" preview (if the next unlock is a room).
  // This allows players to tap the house itself to build, instead of using header controls.
  const unlockedRooms = rooms.filter(room => room.isUnlocked).sort((a, b) => a.floor - b.floor);
  const pendingRoomUnlock = nextUnlock?.type === 'room'
    ? rooms.find(room => room.id === nextUnlock.targetId && !room.isUnlocked) || null
    : null;
  const displayRooms = pendingRoomUnlock
    ? [...unlockedRooms, pendingRoomUnlock]
    : unlockedRooms;

  const getAnimalForRoom = (roomId: string): Animal | null => {
    return animals.find(a => a.roomId === roomId) || null;
  };

  // Single-column layout: each room is its own row, sorted top-to-bottom.
  const sortedRooms = [...displayRooms].sort((a, b) => b.layoutPosition.row - a.layoutPosition.row);
  const numRows = Math.max(1, displayRooms.length);

  const houseHeight = useMemo(() => {
    return numRows * ROOM_HEIGHT +
      Math.max(0, numRows - 1) * ROOM_GAP +
      HOUSE_PADDING * 2;
  }, [numRows]);

  // Extra downward pan slack so the pit entrance can be pulled fully clear of
  // Extra in-flow bottom margin so the pit entrance rests fully above
  // HomeScreen's bottom PLAY dock. Only needed when the pit entrance renders.
  const dockClearance = onPitPress ? PIT_DOCK_CLEARANCE : 0;
  const houseBottomMargin = HOUSE_BOTTOM_MARGIN + dockClearance;

  const panBounds = useMemo(() => {
    // Full height of the house structure including margins and connectors
    const connectorHeight = Math.max(0, numRows - 1) * 10; // ArrangementConnectors between rooms
    const totalContentHeight = 50 + (ROOF_RENDER_HEIGHT - 6) + houseHeight + FOUNDATION_RENDER_HEIGHT + (onPitPress ? PIT_FLOW_HEIGHT : 0) + (houseBottomMargin + 10) + connectorHeight; // marginTop + roof + body + foundation + pit + marginBottom + connectors
    // How much the house overflows above the visible viewport
    const overflow = Math.max(0, totalContentHeight - (containerHeight ?? SCREEN_HEIGHT));
    return {
      min: 0,
      // Allow panning up to see the roof + small padding.
      max: Math.max(0, overflow + 50),
    };
  }, [containerHeight, houseHeight, numRows, onPitPress, houseBottomMargin]);

  // ─── One cohesive scene (no vertical-pan parallax) ───────────────────────
  // The meadow the house stands on is BAKED INTO the sky artwork. A two-rate
  // parallax (F12) that moved the sky slower than the house therefore slid the
  // house off its own ground — it read as "floating" — and forced an ugly flat
  // foreground band to give the house something at 1.0x to stand on. It also
  // shimmered along the seam: two independent native springs (house + sky)
  // cannot stay perfectly frame-locked. So the sky now rides the scene 1:1 —
  // the whole painterly landscape (meadow, river, forest, house, pit) pans as
  // one plane, the house stays planted in the real grass, and there is a single
  // animated driver so nothing can desync. Atmospheric depth still comes from
  // the independently DRIFTING clouds + ambient sprites, which are unaffected.

  // The rendered pan offset: panRaw put through the rubber band.
  //
  // Rubber-band only the ROOF end (pan > max): overscrolling there reveals more
  // of the sky-top-colored background, which blends seamlessly. The PIT end is a
  // HARD floor (pan >= 0): the sky is bottom-anchored to the container bottom,
  // so lifting the scene off it would expose the flat ground fill BELOW the
  // artwork ("green beneath the background"). The ground is solid; only the sky
  // gives. This preserves the invariant "the art can never lift off the
  // container bottom".
  //
  // rubberBandPanY is non-linear, so it is SAMPLED into a piecewise-linear
  // interpolation. That is what lets the give run natively — the same curve, one
  // native node, no JS in the drag loop.
  const panBoundsMax = panBounds.max;
  const panTransform = useMemo(() => {
    const max = Math.max(0, panBoundsMax);
    const viewport = containerHeight ?? SCREEN_HEIGHT;
    if (!panPhysicsEnabled || max <= 0) {
      // Hard clamp, no give (reduced motion / low tier / nothing to scroll).
      const hi = Math.max(1, max);
      return { inputRange: [-1, 0, hi, hi + 1], outputRange: [0, 0, max, max] };
    }
    const maxOverscroll = Math.min(viewport * 0.3, 120);
    const inputRange = [-1, 0, max];
    const outputRange = [0, 0, max];
    // Sample well past the cap so the curve has flattened before extrapolation.
    const SAMPLES = 8;
    const span = maxOverscroll * 3;
    for (let i = 1; i <= SAMPLES; i++) {
      const over = (span * i) / SAMPLES;
      inputRange.push(max + over);
      outputRange.push(
        Math.max(0, rubberBandPanY(max + over, max, viewport, undefined, maxOverscroll)),
      );
    }
    return { inputRange, outputRange };
  }, [panBoundsMax, containerHeight, panPhysicsEnabled]);

  const translateY = useMemo(
    () => panRaw.interpolate({ ...panTransform, extrapolate: 'clamp' as const }),
    [panRaw, panTransform],
  );

  const syncPanPosition = useCallback((nextPanY: number, notify = false) => {
    // Cancel any in-flight momentum settle before hard-setting the position, so
    // a programmatic reposition (house grew / saved-pan restore) can't fight a
    // running native spring.
    settleAnimRef.current?.stop();
    settleAnimRef.current = null;
    const clampedPanY = clampHomeScenePanY(nextPanY, panBoundsMax);
    // Clear any gesture offset first, or the hard set would land relative to
    // the base captured at the last gesture start.
    panRaw.setOffset(0);
    panRaw.setValue(clampedPanY);
    liveTranslateYRef.current = clampedPanY;
    currentPanYRef.current = clampedPanY;
    baseTranslateY.current = clampedPanY;
    if (notify) {
      onPanYChange?.(clampedPanY);
    }
  }, [onPanYChange, panBoundsMax, panRaw]);

  // Keep liveTranslateYRef synchronously current. Adding a listener also forces
  // the native driver to report values to JS every frame — for the settle spring
  // AND for the native gesture event — so the mirror never lags the on-screen
  // position. This is the ONLY per-frame JS during a drag now: a single number
  // assignment, versus the old setValue + style commit.
  const panBoundsMaxRef = useRef(panBoundsMax);
  panBoundsMaxRef.current = panBoundsMax;
  useEffect(() => {
    liveTranslateYRef.current = (panRaw as unknown as { __getValue: () => number }).__getValue();
    const id = panRaw.addListener(({ value }) => {
      liveTranslateYRef.current = value;
      // Keep the LOGICAL position fresh too, so a mid-gesture layout change
      // (the house growing) repositions from where the scene actually is.
      currentPanYRef.current = clampHomeScenePanY(value, panBoundsMaxRef.current);
    });
    return () => panRaw.removeListener(id);
  }, [panRaw]);

  // Stop a decelerating settle at the start of a fresh gesture. Capture the base
  // SYNCHRONOUSLY from the listener-backed live mirror (not stopAnimation's
  // async callback, which for a native-driven value fires a frame or more later —
  // leaving the drag's first frame on a stale base and flashing the scene), then
  // hand it to the native node as the gesture OFFSET so the incoming
  // translationY stream needs no JS arithmetic at all.
  const stopSettle = useCallback(() => {
    // Whether a spring is genuinely in flight decides which number to trust:
    // mid-flight only the native mirror knows where the scene is, at rest only
    // JS's own bookkeeping is safe to believe. resolveGestureBasePanY carries
    // the full reasoning; the short version is that the mirror can report ~0
    // after a micro-drag, and taking that as a base drops the house to the pit.
    const settling = settleAnimRef.current !== null;
    settleAnimRef.current?.stop();
    settleAnimRef.current = null;
    panRaw.stopAnimation();
    const base = resolveGestureBasePanY({
      settling,
      liveMirror: liveTranslateYRef.current,
      lastRestingPanY: baseTranslateY.current,
      maxPanY: panBoundsMaxRef.current,
    });
    baseTranslateY.current = base;
    liveTranslateYRef.current = base;
    panRaw.setOffset(base);
    panRaw.setValue(0);
  }, [panRaw]);

  // Native-driven pan: the gesture's translationY IS the animated value (added
  // to the offset captured at BEGAN). Must stay a pure Animated.event with no
  // JS listener attached, or RN falls back to the JS path this replaced.
  const onPanGestureEvent = useMemo(
    () => Animated.event([{ nativeEvent: { translationY: panRaw } }], { useNativeDriver: true }),
    [panRaw],
  );

  const onPanHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    const { state, translationY, velocityY } = event.nativeEvent;

    if (state === State.BEGAN) {
      stopSettle();
      return;
    }
    if (state === State.ACTIVE) {
      // The scene is genuinely being panned, so from here on the player owns
      // the position and the restore effect stops re-deriving it from
      // savedPanY. Keyed on ACTIVE, not BEGAN: BEGAN fires on finger-down, so
      // arming it there would hand ownership to every TAP, including the tap
      // that opens a room's unlock modal. A tap must not make a provisionally
      // clamped position authoritative.
      hasUserPannedRef.current = true;
      return;
    }
    if (state === State.FAILED || state === State.CANCELLED) {
      // A touch that never became a pan: tapping an animal, or a room to open
      // its unlock card. BEGAN already split the animated value into
      // offset + 0 and nothing else will fold it back, so re-assert the resting
      // position outright. That leaves the value un-split and, just as
      // importantly, re-syncs the native mirror, which is the ref most likely
      // to have been left holding a stale gesture translation.
      syncPanPosition(clampHomeScenePanY(baseTranslateY.current, panBoundsMax), false);
      return;
    }
    if (state !== State.END) return;

    const logicalRelease = clampHomeScenePanY(baseTranslateY.current + translationY, panBoundsMax);

    // Reduced motion / low tier / no scroll range: settle instantly, no
    // momentum, no bounce. (syncPanPosition clears the gesture offset.)
    if (!panPhysicsEnabled || panBoundsMax <= 0) {
      syncPanPosition(logicalRelease, true);
      return;
    }

    // Fold the gesture offset back into the value so the release spring
    // animates one plain number from exactly where the finger left the scene
    // (raw, possibly inside the overscroll zone) to its rest point.
    panRaw.flattenOffset();

    // Carry the release velocity into a decelerating spring toward the
    // momentum-projected rest point. A projection past a bound clamps the
    // target, and the seeded velocity overshoots into the rubber-band zone and
    // settles back — the spring-back bounce.
    const settleTarget = computePanSettleTarget({
      releasePanY: logicalRelease,
      velocityY,
      maxPanY: panBoundsMax,
    });
    currentPanYRef.current = settleTarget;
    // The resting position is settled the moment the release is computed, not
    // when the spring lands: an interrupted spring never runs its callback, and
    // this ref is what the NEXT gesture reads as its base now that the native
    // mirror is only trusted mid-flight.
    baseTranslateY.current = settleTarget;
    // Commit the release to memory NOW rather than only from the spring's
    // finish callback. Anything that stops the settle mid-flight (the restore
    // effect re-running because savedPanY / containerHeight / panBoundsMax
    // changed, or a fresh gesture) drops that callback, and the remembered
    // position would stay a whole pan behind what the player is looking at —
    // which is then the stale value a later remount restores. The target is
    // where this gesture is going; if a new gesture supersedes it, that one
    // commits its own release the same way.
    onPanYChange?.(settleTarget);

    // One native spring drives the whole scene — the entire painterly plane
    // (sky, meadow, house, pit) settles together, so there is nothing for a
    // second layer to desync from. At the PIT floor (settleTarget 0) the seeded
    // velocity is dropped so the underdamped spring can't overshoot below 0 and
    // flash the ground fill beneath the art; the roof end keeps its momentum
    // bounce (it overscrolls into seamless sky-colored background, and the
    // interpolation above rubber-bands that overshoot exactly as the drag does).
    const settle = Animated.spring(panRaw, {
      toValue: settleTarget,
      velocity: settleTarget <= 0 ? 0 : velocityY,
      friction: 9,
      tension: 45,
      useNativeDriver: true,
    });
    settleAnimRef.current = settle;
    settle.start(({ finished }) => {
      if (!finished) return;
      settleAnimRef.current = null;
      baseTranslateY.current = settleTarget;
      currentPanYRef.current = settleTarget;
      onPanYChange?.(settleTarget);
    });
  };

  // Stop any running settle spring on unmount so no native animation is left
  // driving a torn-down value.
  useEffect(() => {
    return () => {
      settleAnimRef.current?.stop();
      settleAnimRef.current = null;
      panRaw.stopAnimation();
    };
  }, [panRaw]);

  // Preserve the current viewport when the house grows or helper UI changes the
  // available height, and restore the last viewport when the home screen remounts.
  //
  // THE RESTORE IS DELIBERATELY RE-RUN FROM `savedPanY`, NOT FROM THE LIVE
  // VALUE, UNTIL THE PLAYER TOUCHES THE SCENE. HomeScreen unmounts on every
  // navigation (that is the premise of its paint-ahead snapshot), so this
  // component mounts fresh each time the player comes home from a puzzle — and
  // it mounts BEFORE the house knows its own height. `rooms` is seeded from the
  // snapshot but `nextUnlock` is not: it starts null and only lands after
  // several AsyncStorage round trips, while onLayout fires on the first commit.
  // For that window `panBoundsMax` is one room (~140dp) SHORT of the truth.
  //
  // The old code adopted the value clamped against that provisional bound as
  // the new live position AND wrote it back through onPanYChange (shouldNotify
  // was unconditionally true whenever currentPanYRef was null, which is exactly
  // the mount case). So every single trip home shaved up to a room's height off
  // a player parked near the roof, permanently and cumulatively — which is what
  // "it takes me back down to the bottom of the house" actually was. It was
  // never one reset; it was a slow leak with no floor.
  //
  // Now the clamp is only ever a temporary RENDERING of the saved value: when
  // the real bound arrives moments later this effect re-resolves from
  // `savedPanY` and lands where the player left off, and nothing writes to the
  // memory until there is a real gesture to record.
  // `savedPanY` is read through a ref and is deliberately NOT a dependency.
  // It is our own echo: onPanYChange writes it into App state, which comes
  // straight back down as this prop. With it in the deps, committing a release
  // re-entered this effect on the very next commit, and syncPanPosition STOPS
  // any running settle (1) — so the momentum spring was killed a frame after it
  // started and the deceleration and rubber-band bounce never played. Nothing
  // else ever changes savedPanY (App seeds it null and only this component
  // writes it), so geometry alone should re-run the restore.
  const savedPanYRef = useRef(savedPanY);
  savedPanYRef.current = savedPanY;
  useEffect(() => {
    if (containerHeight === null) return;
    // Once the player has panned, their live position is authoritative and the
    // house growing above them must not move it (the scene is bottom-anchored
    // and rooms are added at the TOP, so holding the number holds the view).
    const { panY, commit } = resolveHomeScenePanRestore({
      currentPanY: currentPanYRef.current,
      savedPanY: savedPanYRef.current,
      maxPanY: panBoundsMax,
      userOwnsPosition: hasUserPannedRef.current,
    });
    syncPanPosition(panY, commit);
  }, [containerHeight, panBoundsMax, syncPanPosition]);

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: PHASE_BG_COLORS[currentPhase] || PHASE_BG_COLORS[0] }]}>
      {/* Pan gesture handler - vertical only */}
      <PanGestureHandler
        ref={panRef}
        onGestureEvent={onPanGestureEvent}
        onHandlerStateChange={onPanHandlerStateChange}
        minDist={10}
        avgTouches
      >
        <Animated.View style={styles.gestureContainer} onLayout={onContainerLayout}>
          <Animated.View
            style={[
              styles.transformContainer,
              {
                opacity: containerHeight === null ? 0 : 1,
                transform: [
                  { translateY },
                ],
              },
            ]}
          >
              {/* Sky + clouds + celestials ride transformContainer 1:1 (no
                  counter-transform) so the baked-in meadow stays exactly under
                  the house at every pan offset; the whole scene is one plane.
                  These are FLAT direct children of transformContainer (the
                  proven pre-audit structure), NOT nested in a wrapper View: an
                  extra viewport-sized negative-z absoluteFill layer nesting the
                  overflowing sky raster made Fabric/Android promote + recomposite
                  it each pan frame, which shimmered while scrolling. The sky Image
                  and groundExtension keep their own zIndex:-1 (behind the house);
                  clouds/stars keep theirs. Clouds/stars still drift on their own
                  timers for life. */}
                {/* Sky background - inside transform so it moves with the scene.
                    Bottom-anchored: the artwork's bottom row sits exactly on the
                    container bottom (see the SKY_BOX_HEIGHT geometry notes), so
                    the art always covers every visible pixel and the house seats
                    at a device-independent spot on the meadow below the river.
                    Height is the fixed SKY_BOX_HEIGHT floor: with the scene now
                    panning as one 1:1 plane, the art covers the frame across the
                    whole pan range exactly as the seat geometry was tuned for. */}
                <Image
                  source={
                    currentPhase >= 4 ? SKY_SHADOW :
                    currentPhase >= 3 ? SKY_STORM :
                    currentPhase >= 2 ? SKY_DUSK :
                    currentPhase >= 1 ? SKY_AFTERNOON :
                    SKY_DAY
                  }
                  style={[styles.skyBackground, { height: SKY_BOX_HEIGHT }]}
                  resizeMode="cover"
                />

                {/* Ground seam guard: a band below the container bottom (1px
                    overlap) in the art's own bottom-row grass color, purely to
                    guard against sub-pixel rounding seams at the art's bottom
                    edge. Never visibly a "fill" — the artwork itself reaches
                    the last visible row. */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.groundExtension,
                    { backgroundColor: PHASE_GROUND_COLORS[currentPhase] ?? PHASE_GROUND_COLORS[0] },
                  ]}
                />

                {/* Drifting clouds - Phase 0-2 only; the storm sky takes over at
                    Phase 3. Soft View blobs (no hollow outline PNG, F13/F64),
                    phase-dimmed. */}
                {currentPhase <= 2 && (
                  <>
                    <DriftingCloud width={170} top={26} duration={80000} initialProgress={0.15} opacity={currentPhase >= 2 ? 0.4 : 0.85} tint={currentPhase >= 2 ? '#CFC7DA' : '#FFFFFF'} />
                    <DriftingCloud width={130} top={88} duration={105000} initialProgress={0.55} opacity={currentPhase >= 2 ? 0.4 : 0.85} tint={currentPhase >= 2 ? '#CFC7DA' : '#FFFFFF'} />
                    <DriftingCloud width={120} top={58} duration={65000} initialProgress={0.8} opacity={currentPhase >= 2 ? 0.35 : 0.75} tint={currentPhase >= 2 ? '#C6BED2' : '#F4F2FA'} />
                  </>
                )}

                {/* Full-moon world treatment (F20): a soft moon-glow halo high
                    in the sky on event nights, from Phase 2 on. The bright day
                    skies of Phases 0-1 get nothing — daytime is honest. */}
                {isFullMoon && currentPhase >= 2 && <MoonGlow />}

                {/* Night star glints (phase 3-4) - two-View sparkles (F13/F64),
                    not the old ✦ glyph. Twinkle when ambient motion is on. */}
                {currentPhase >= 3 && (
                  <View style={styles.starsContainer} pointerEvents="none">
                    {nightStars.map((star) => (
                      <NightStarGlint
                        key={star.id}
                        left={star.left}
                        top={star.top}
                        size={star.size}
                        baseOpacity={star.opacity}
                        twinkle={ambientMotionEnabled}
                        delay={star.twinkleDelay}
                      />
                    ))}
                  </View>
                )}

                {/* Shooting stars (only at higher phases) */}
                {ambientMotionEnabled && currentPhase >= 2 && <ShootingStar />}
                {ambientMotionEnabled && currentPhase >= 3 && <ShootingStar />}
                {ambientMotionEnabled && currentPhase >= 4 && <ShootingStar />}

              {/* Songbirds cross only the bright phases (F16); from Phase 3 on
                  the sky stays honestly empty rather than an unnatural cross-
                  ing. Dark silhouettes flip to face their travel direction and
                  stay on the house's own 1.0× rate (they fly near the roofline,
                  not the distant sky backdrop). */}
              {ambientMotionEnabled && currentPhase <= 2 && (
                <>
                  <FlyingBird startDelay={0} yPosition={80} />
                  <FlyingBird startDelay={3000} yPosition={50} />
                  <FlyingBird startDelay={6000} yPosition={110} />
                </>
              )}

              {/* House */}
              <View style={[styles.houseContainer, { marginBottom: houseBottomMargin }]}>
                {/* The unnamed entity - invisible until Phase 3, then looming behind the house */}
                <ShadowFigure phase={currentPhase} />

                {/* Contact shadow: a soft feathered blob under the foundation
                    seats the house on the meadow (without it the hard art edge
                    read as a sticker). Painted before the house so the
                    foundation/pit cover the opaque core and only the soft halo
                    shows around the base; tintColor + opacity track the phase
                    ground (green -> sunset earth -> night blues, softening as
                    the sun leaves). */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.contactShadowWrap,
                    { bottom: (onPitPress ? PIT_FLOW_HEIGHT : 0) - 48 },
                  ]}
                >
                  <Image
                    source={HOUSE_SHADOW_IMG}
                    style={[styles.contactShadowImg, { tintColor: contactShadow.color, opacity: 0.55 * contactShadow.mult }]}
                    resizeMode="stretch"
                  />
                </View>


                {/* Roof — pixel art (chimney + attic window baked into the asset) */}
                <View style={styles.roof}>
                  <Image source={ROOF_IMG} style={styles.roofImage} resizeMode="stretch" />
                  {/* Phase lighting: a same-source tinted copy follows the roof
                      silhouette exactly (tintColor respects alpha). */}
                  {houseTint.ext > 0 && (
                    <Image
                      source={ROOF_IMG}
                      style={[styles.roofImage, styles.tintFill, { tintColor: houseTint.color, opacity: houseTint.ext }]}
                      resizeMode="stretch"
                    />
                  )}
                  {/* Animated smoke puffs rising from the baked-in chimney */}
                  <View style={styles.smokeContainer}>
                    <SmokePuff delay={0} isStatic={!ambientMotionEnabled} tint={smokeTint} />
                    <SmokePuff delay={1000} isStatic={!ambientMotionEnabled} tint={smokeTint} />
                    <SmokePuff delay={2000} isStatic={!ambientMotionEnabled} tint={smokeTint} />
                  </View>
                </View>

                {/* House body with rooms (single-column layout). The plank
                    tile fills the wall area behind the rooms — the flat color
                    fill read as a cartoon sticker against the painterly sky. */}
                <View style={[styles.houseBody, { minHeight: houseHeight - HOUSE_PADDING }]}>
                  {/* Clipped backdrop: resizeMode="cover" is width-driven for
                      the tall plank strip, so its content overflows the body's
                      height. Fabric does not clip that overflow, which let the
                      planks bleed BELOW the foundation around the pit. This
                      wrapper (overflow:hidden) confines the wall to the body
                      without clipping the room content (rooms are siblings). */}
                  <View style={styles.wallBackdrop} pointerEvents="none">
                    <Image
                      source={WALL_IMG}
                      style={styles.wallTexture}
                      resizeMode="cover"
                      fadeDuration={0}
                    />
                  </View>
                  {/* Wall/frame phase scrim (behind the rooms). Compensated so
                      the wall's compound tint (this + the room scrim over it)
                      lands on the full exterior strength, while the rooms above
                      keep only the lighter room scrim — lit interiors still glow
                      against the darkened shell. */}
                  {wallTintOpacity > 0 && (
                    <View
                      pointerEvents="none"
                      style={[styles.bodyScrim, { backgroundColor: houseTint.color, opacity: wallTintOpacity }]}
                    />
                  )}

                  {/* Render rooms from top to bottom (highest row number first) */}
                  {sortedRooms.map((room, index) => {
                    const roomAnimal = getAnimalForRoom(room.id);
                    const roomUnlockCost = (!room.isUnlocked && nextUnlock?.type === 'room' && nextUnlock.targetId === room.id)
                      ? nextUnlock.cost
                      : null;
                    const inviteCost = (room.isUnlocked
                      && roomAnimal
                      && !roomAnimal.isUnlocked
                      && nextUnlock?.type === 'character'
                      && nextUnlock.targetId === roomAnimal.id)
                      ? nextUnlock.cost
                      : null;
                    return (
                      <React.Fragment key={room.id}>
                        <View style={styles.roomRow}>
                          <RoomView
                            room={room}
                            animal={roomAnimal}
                            width={ROOM_WIDTH}
                            height={ROOM_HEIGHT}
                            onAnimalPress={onAnimalPress}
                            onRoomPress={onRoomPress}
                            currentPhase={currentPhase}
                            isAnimalOnCooldown={roomAnimal ? isOnCooldown(roomAnimal.id) : false}
                            cooldownPuzzlesLeft={roomAnimal ? getSessionStatus(roomAnimal.id).puzzlesRemaining : undefined}
                            isRoomUpgraded={room.id in purchasedUpgrades}
                            isDeepened={room.id in deepenedRooms}
                            attunementLevel={attunedRooms[room.id] ?? 0}
                            embellishmentIntensity={computeEmbellishmentIntensity(
                              room.id in purchasedUpgrades,
                              room.id in deepenedRooms,
                              attunedRooms[room.id] ?? 0
                            )}
                            ritualWords={ritualWords}
                            unlockCost={roomUnlockCost}
                            amberBalance={amberBalance}
                            inviteCost={inviteCost}
                            suppressInviteChip={suppressInviteChips}
                          />
                        </View>
                        {/* Arrangement sigil connection between rooms */}
                        {index < sortedRooms.length - 1 && (
                          <ArrangementConnector phase={currentPhase} tendingIntensity={tendingIntensity} />
                        )}
                      </React.Fragment>
                    );
                  })}

                  {displayRooms.length === 0 && (
                    <View style={styles.emptyHouse}>
                      <Image source={require('../../../assets/ui/home.png')} style={styles.emptyHouseIcon} resizeMode="contain" />
                      <Text style={styles.emptyHouseSubtext}>Your house awaits!</Text>
                    </View>
                  )}

                  {/* Room phase scrim (over the rooms + frame). Lighter than the
                      exterior so the interiors read as lit at night; inset past
                      the frame border so the stone trim tints too. */}
                  {houseTint.room > 0 && (
                    <View
                      pointerEvents="none"
                      style={[styles.bodyRoomScrim, { backgroundColor: houseTint.color, opacity: houseTint.room }]}
                    />
                  )}

                  {/* Arrangement sigil overlay (F18): the true pattern
                      inscribed OVER the house facade, a zig-zag connecting
                      alternating room corners with node dots at the joints.
                      Barely subliminal at Phase 2 (felt before told), crimson +
                      glowing at Phase 4, extending as the player tends at
                      Phase 5. Pointer-transparent. */}
                  <HouseSigilOverlay
                    phase={currentPhase}
                    bodyWidth={HOUSE_BODY_WIDTH}
                    bodyHeight={houseHeight - HOUSE_PADDING}
                    tendingIntensity={tendingIntensity}
                  />

                  {/* Soft shadowed side edges (replaces the flat brown outline).
                      The wall reaches the true body edge; these gradients darken
                      the outer strip so the house corners read as receding into
                      shadow, matching the painterly art instead of a hard line. */}
                  <Image
                    source={EDGE_SHADOW_IMG}
                    style={styles.edgeShadowLeft}
                    resizeMode="stretch"
                    fadeDuration={0}
                  />
                  <Image
                    source={EDGE_SHADOW_IMG}
                    style={styles.edgeShadowRight}
                    resizeMode="stretch"
                    fadeDuration={0}
                  />
                </View>

                {/* Foundation — hand-lit per-phase stone + baked grass (no
                    tint overlay: the art is already colored for the phase). */}
                <View style={styles.foundationWrap}>
                  <Image
                    source={FOUNDATION_IMGS[Math.min(currentPhase, FOUNDATION_IMGS.length - 1)]}
                    style={styles.foundationImageInner}
                    resizeMode="stretch"
                  />
                </View>

                {/* The Offering Pit's mouth in the front yard, a stone path
                    connecting it to the house */}
                {onPitPress && (
                  <TouchableOpacity
                    style={styles.pitEntrance}
                    onPress={onPitPress}
                    accessibilityLabel={
                      pitNeedsAttention
                        ? 'Enter the Offering Pit, offerings waiting'
                        : 'Enter the Offering Pit'
                    }
                    accessibilityRole="button"
                    activeOpacity={0.8}
                  >
                    {pitNeedsAttention && <PitAttentionGlow phase={currentPhase} />}
                    <Image
                      source={PIT_ENTRANCE_IMG}
                      style={styles.pitEntranceImage}
                      resizeMode="contain"
                    />
                    {houseTint.ext > 0 && (
                      <Image
                        source={PIT_ENTRANCE_IMG}
                        style={[styles.pitEntranceImage, styles.tintFill, { tintColor: houseTint.color, opacity: pitTintOpacity }]}
                        resizeMode="contain"
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
        </Animated.View>
      </PanGestureHandler>

      {/* Ambient particle overlay (F11). Rendered AFTER the pan handler in a
          screen-space absolute-fill layer (zIndex above the gesture
          container, pointer-transparent), so the bottom-anchored opaque sky
          can never paint over the particles at rest — the defect where they
          were invisible at translateY=0 in every phase. Memoized child: its
          spawn setState never re-renders the pan scene (flicker fix). */}
      <AmbientParticles
        phase={currentPhase}
        ambientMotionEnabled={ambientMotionEnabled}
        isFullMoon={isFullMoon}
      />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    zIndex: 1, // Keep below header (zIndex: 100)
    // Fallback only — overridden inline with PHASE_BG_COLORS (sky top-row samples)
    backgroundColor: '#439cf2',
  },

  // Sky background - bottom-anchored so the artwork's bottom row sits exactly
  // on the container bottom (see SKY_BOX_HEIGHT notes). Pan only ever moves
  // the scene DOWN (translateY >= 0), so the art can never lift off the
  // bottom edge; upward exposure is covered by the PHASE_BG_COLORS backdrop
  // (sky top-row samples).
  skyBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SKY_BOX_HEIGHT,
    zIndex: -1,
  },
  // Below the container bottom with a 1px overlap over the art's bottom row —
  // sub-pixel seam insurance only (see PHASE_GROUND_COLORS notes).
  groundExtension: {
    position: 'absolute',
    bottom: -SCREEN_HEIGHT,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT + 1,
    zIndex: -1,
  },
  // Screen-space ambient particle overlay: rendered after the pan handler,
  // above the gesture container, pointer-transparent — so the opaque sky can
  // never paint over the particles at rest (F11).
  particleOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },

  // Stars for night sky
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.3,
    zIndex: 150,
  },

  // Smoke container
  smokeContainer: {
    position: 'absolute',
    top: -16,
    left: ROOF_WIDTH * 0.24,
  },

  // Gesture container
  gestureContainer: {
    flex: 1,
    zIndex: 10,
  },

  // Transform container
  transformContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  // House container. marginBottom here is the pit-less baseline; the render
  // site overrides it with houseBottomMargin (baseline + dock clearance when
  // the pit entrance is shown). These margins ARE part of the house-vs-art
  // seat math — see the SKY_BOX_HEIGHT geometry notes before nudging them.
  houseContainer: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: HOUSE_BOTTOM_MARGIN,
  },

  // Roof
  roof: {
    width: ROOF_WIDTH,
    height: ROOF_RENDER_HEIGHT,
    marginBottom: -6,
    position: 'relative',
  },
  roofImage: {
    width: '100%',
    height: '100%',
  },
  // Absolute-fill for a same-source tinted overlay (phase lighting). Follows
  // the base image's box; tintColor makes it follow the alpha silhouette.
  tintFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  foundationWrap: {
    width: HOUSE_WIDTH,
    height: FOUNDATION_RENDER_HEIGHT,
    marginTop: -2,
  },
  foundationImageInner: {
    width: '100%',
    height: '100%',
  },
  pitEntrance: {
    alignSelf: 'center',
    marginTop: PIT_MARGIN_TOP, // path tucks under the foundation edge
    width: PIT_RENDER_WIDTH,
    height: PIT_RENDER_HEIGHT, // pit_entrance.png aspect
  },
  pitEntranceImage: {
    width: '100%',
    height: '100%',
  },
  // Warm attention halo behind the pit entrance (offerings waiting). Four
  // concentric graduated ovals (130/100/70/45%) with low stepped alphas under
  // a single animated-opacity wrapper — the outer rings feather the edge so it
  // dissolves instead of reading as a hard orange sticker (F17). No color
  // animation.
  pitGlow: {
    position: 'absolute',
    top: -30,
    left: -34,
    right: -34,
    bottom: -24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pitGlowRing1: {
    position: 'absolute',
    width: '130%',
    height: '130%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 176, 74, 0.06)',
  },
  pitGlowRing2: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 186, 92, 0.10)',
  },
  pitGlowRing3: {
    position: 'absolute',
    width: '70%',
    height: '70%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 200, 110, 0.16)',
  },
  pitGlowRing4: {
    position: 'absolute',
    width: '45%',
    height: '45%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 216, 140, 0.26)',
  },

  // House body
  houseBody: {
    // Muted-timber fallback under the plank texture (matches wall.png's average
    // so any seam/fallback reads as wood, not the old garish orange)
    backgroundColor: '#79593E',
    // Narrower than the foundation (HOUSE_BODY_WIDTH) so the thin timber walls
    // sit within the stone base instead of overhanging it. The old flat 5px
    // border is gone (it read as a cheap outline); soft edge-shadow overlays
    // give the sides depth instead.
    width: HOUSE_BODY_WIDTH,
    padding: HOUSE_PADDING / 2,
    alignItems: 'center',
  },
  // Clips the wall texture to the house body. Absolute-fills the body; the
  // wall Image cover-overflows its own frame on Fabric, so this overflow:hidden
  // wrapper stops the planks spilling below the foundation onto the pit.
  wallBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  // Muted timber wall behind the rooms. wall.png is a pre-tiled 256x1280 strip
  // drawn with resizeMode="cover" (NOT "repeat" — repeat renders nothing on the
  // New Architecture / Fabric). The strip's 1:5 aspect keeps cover width-driven
  // so the plank scale is consistent whatever the room count; the wallBackdrop
  // wrapper clips the resulting vertical overflow to the body.
  //
  // EXPLICIT width/height '100%' (not right:0/bottom:0): on Fabric an <Image>
  // sized only by insets falls back to its INTRINSIC size (256px) anchored
  // top-left, which left the right ~26px of the body showing the flat fallback
  // color instead of planks. Percentages stretch it to fill the backdrop.
  wallTexture: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  // Phase scrim over the wall, behind the rooms. Fills the body exactly (the
  // old flat border it used to reach past is gone).
  bodyScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Phase scrim over the rooms. Fills the body exactly.
  bodyRoomScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Soft shadowed side edges (wall_edge_shadow.png is a dark->transparent
  // horizontal gradient). Left uses it as-is (dark on the outer/left); right
  // mirrors it (scaleX:-1) so the dark sits on the outer/right. Explicit
  // height:'100%' (not bottom:0) for the same Fabric intrinsic-size reason as
  // wallTexture — an inset-only Image would collapse to its 16px source height.
  edgeShadowLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: '100%',
    pointerEvents: 'none',
  },
  edgeShadowRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: '100%',
    transform: [{ scaleX: -1 }],
    pointerEvents: 'none',
  },
  // Contact shadow under the foundation. Wrap is bottom-positioned inline (the
  // pit entrance adds its flow height below the foundation when it renders);
  // the soft blob Image is wider than the house so its feathered halo spills
  // onto the meadow around the base.
  contactShadowWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactShadowImg: {
    width: HOUSE_WIDTH + 40,
    height: 54,
  },
  roomRow: {
    marginBottom: ROOM_GAP,
    alignItems: 'center',
  },
  emptyHouse: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHouseText: {
    fontFamily: BODY_FONT,
    fontSize: 60,
    marginBottom: 10,
  },
  emptyHouseIcon: {
    width: 64,
    height: 64,
    marginBottom: 10,
  },
  emptyHouseSubtext: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.large,
    color: CandyColors.white,
    fontWeight: '700',
  },

  // Foundation
});

export default HouseWorld;
