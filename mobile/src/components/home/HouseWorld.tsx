import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
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
import { clampHomeScenePanY, resolveHomeScenePanY } from '../../services/homeScenePan';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';
import { getTendingIntensity } from '../../services/tending';

// Environment assets
const SKY_DAY = require('../../../assets/environment/sky_day.png');
const SKY_AFTERNOON = require('../../../assets/environment/sky_afternoon.png');
const SKY_DUSK = require('../../../assets/environment/sky_dusk.png');
const SKY_STORM = require('../../../assets/environment/sky_storm.png');
const SKY_SHADOW = require('../../../assets/environment/sky_shadow.png');
const CLOUD_1 = require('../../../assets/environment/cloud_1.png');
const CLOUD_2 = require('../../../assets/environment/cloud_2.png');
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
// PARTICLE SYSTEM - Floating sparkles, leaves, fireflies
// ═══════════════════════════════════════════════════════════════════════════

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation: Animated.Value;
  emoji: string;
  duration: number;
}

const PARTICLE_EMOJIS_BY_PHASE: Record<number, string[]> = {
  0: ['✨', '🌸', '🍃', '💛', '⭐'],
  1: ['✨', '🍂', '💫', '⭐'],
  2: ['🍂', '💭', '🌫️', '💫'],
  3: ['👁️', '🌫️', '💀', '🔮'],
  4: ['💀', '👁️', '⚫', '🔮'],
  5: ['✨', '💜', '💫'],
};

const FloatingParticle: React.FC<{ particle: Particle }> = ({ particle }) => {
  useEffect(() => {
    const startX = Math.random() * SCREEN_WIDTH;
    const endX = startX + (Math.random() - 0.5) * 100;

    particle.x.setValue(startX);
    particle.y.setValue(SCREEN_HEIGHT + 20);
    particle.opacity.setValue(0);
    particle.scale.setValue(0.3 + Math.random() * 0.5);

    const anim = Animated.parallel([
      // Float up
      Animated.timing(particle.y, {
        toValue: -50,
        duration: particle.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      // Gentle sway
      Animated.timing(particle.x, {
        toValue: endX,
        duration: particle.duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      // Fade in then out
      Animated.sequence([
        Animated.timing(particle.opacity, {
          toValue: 0.8,
          duration: particle.duration * 0.2,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0.8,
          duration: particle.duration * 0.6,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: particle.duration * 0.2,
          useNativeDriver: true,
        }),
      ]),
      // Gentle rotation
      Animated.timing(particle.rotation, {
        toValue: Math.random() > 0.5 ? 360 : -360,
        duration: particle.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  const rotate = particle.rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        transform: [
          { translateX: particle.x },
          { translateY: particle.y },
          { scale: particle.scale },
          { rotate },
        ],
        opacity: particle.opacity,
      }}
      pointerEvents="none"
    >
      <Text style={{ fontFamily: BODY_FONT, fontSize: 16 }}>{particle.emoji}</Text>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SMOKE PUFF ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

const SmokePuff: React.FC<{ delay: number; isStatic?: boolean }> = ({ delay, isStatic = false }) => {
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

  return (
    <Animated.View
      style={{
        position: 'absolute',
        transform: [{ translateX: x }, { translateY: y }, { scale }],
        opacity,
      }}
    >
      <Text style={{ fontFamily: BODY_FONT, fontSize: 20, color: '#999' }}>💨</Text>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FLYING BIRD ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

const FlyingBird: React.FC<{ startDelay: number; yPosition: number }> = ({ startDelay, yPosition }) => {
  const x = useRef(new Animated.Value(-50)).current;
  const y = useRef(new Animated.Value(yPosition)).current;
  const flapRotation = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flapAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const moveAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    const animate = () => {
      if (!mountedRef.current) return;

      const goingRight = Math.random() > 0.5;
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
        transform: [{ translateX: x }, { translateY: y }, { scaleY }],
      }}
      pointerEvents="none"
    >
      <Text style={{ fontFamily: BODY_FONT, fontSize: 18 }}>🐦</Text>
    </Animated.View>
  );
};

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
      <Text style={{ fontFamily: BODY_FONT, fontSize: 14 }}>⭐</Text>
    </Animated.View>
  );
};

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

const DriftingCloud: React.FC<{
  source: number;
  width: number;
  top: number;
  /** Full screen-traverse duration in ms */
  duration: number;
  /** 0..1 starting position across the sky */
  initialProgress: number;
  opacity: number;
}> = ({ source, width, top, duration, initialProgress, opacity }) => {
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
    <Animated.Image
      source={source}
      resizeMode="contain"
      style={{
        position: 'absolute',
        left: 0,
        top,
        width,
        height: width / 2, // cloud PNGs are 512x256
        opacity,
        transform: [{ translateX: x }],
      }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PIT ATTENTION GLOW - Warm pulse around the pit entrance when offerings wait
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PitAttentionGlow — a soft warm halo behind the pit entrance, shown when
 * harvest batches are waiting to be offered. Pre-styled overlay Views with a
 * single native-driven opacity loop (no JS-bridge color animation); renders
 * at a static mid-opacity under reducedMotion / simplified animations.
 */
const PitAttentionGlow: React.FC = () => {
  const pulse = useRef(new Animated.Value(0)).current;
  const isStatic = getSettingsSync().reducedMotion || shouldSimplifyAnimations();

  useEffect(() => {
    if (isStatic) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isStatic, pulse]);

  const opacity = isStatic
    ? 0.7 // static mid-opacity — still reads as "the pit wants attention"
    : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  return (
    <Animated.View pointerEvents="none" style={[styles.pitGlow, { opacity }]}>
      <View style={styles.pitGlowOuter} />
      <View style={styles.pitGlowInner} />
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
  // Wall texture sits UNDER the whole-body room scrim, so its own overlay is
  // compensated to land the compound wall tint exactly on `ext`.
  const wallTintOpacity = houseTint.room >= 1
    ? houseTint.ext
    : Math.max(0, (houseTint.ext - houseTint.room) / (1 - houseTint.room));
  // The pit shares the exterior tint, but capped so the well's teal glow
  // survives the night phases instead of washing to flat black.
  const pitTintOpacity = Math.min(houseTint.ext, 0.4);
  const contactShadow = CONTACT_SHADOW[currentPhase] ?? CONTACT_SHADOW[0];
  // Animated values
  const translateY = useRef(new Animated.Value(0)).current;

  // Refs for gesture tracking
  const panRef = useRef<PanGestureHandler>(null);

  // State tracking for gestures
  const baseTranslateY = useRef(0);
  const currentPanYRef = useRef<number | null>(null);

  // Track container height for proper initial positioning
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const onContainerLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setContainerHeight(height);
    }
  }, []);

  // Memoize night star positions/sizes to prevent flicker on re-render
  const nightStars = useMemo(() =>
    [...Array(12)].map((_, i) => ({
      id: i,
      left: `${10 + (i * 7) % 80}%` as `${number}%`,
      top: `${5 + (i * 11) % 15}%` as `${number}%`,
      opacity: 0.3 + (((i * 17 + 7) % 10) / 10) * 0.5,
      fontSize: 8 + (((i * 13 + 3) % 10) / 10) * 6,
    })),
  []);

  // Particle system state
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);

  // Spawn particles based on phase
  useEffect(() => {
    if (!ambientMotionEnabled) {
      setParticles([]);
      return;
    }

    const spawnParticle = () => {
      const emojis = PARTICLE_EMOJIS_BY_PHASE[currentPhase] || PARTICLE_EMOJIS_BY_PHASE[0];
      const newParticle: Particle = {
        id: particleIdRef.current++,
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(1),
        rotation: new Animated.Value(0),
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        duration: 8000 + Math.random() * 6000,
      };

      setParticles(prev => [...prev.slice(-8), newParticle]); // Keep max 8 particles
    };

    // Spawn particles more frequently at lower phases (happy), less at higher (dread)
    const spawnRate = currentPhase >= 3 ? 4000 : currentPhase >= 2 ? 3000 : 2000;
    const interval = setInterval(spawnParticle, spawnRate);
    spawnParticle(); // Spawn one immediately

    return () => clearInterval(interval);
  }, [currentPhase, ambientMotionEnabled]);



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

  const syncPanPosition = useCallback((nextPanY: number, notify = false) => {
    const clampedPanY = clampHomeScenePanY(nextPanY, panBounds.max);
    translateY.setValue(clampedPanY);
    currentPanYRef.current = clampedPanY;
    baseTranslateY.current = clampedPanY;
    if (notify) {
      onPanYChange?.(clampedPanY);
    }
  }, [onPanYChange, panBounds.max, translateY]);

  // Pan gesture handler - vertical only to prevent horizontal gaps
  const onPanGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationY } = event.nativeEvent;

    const newY = clampHomeScenePanY(baseTranslateY.current + translationY, panBounds.max);

    translateY.setValue(newY);
    currentPanYRef.current = newY;
  };

  const onPanHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY } = event.nativeEvent;
      syncPanPosition(baseTranslateY.current + translationY, true);
    }
  };

  // Preserve the current viewport when the house grows or helper UI changes the
  // available height, and restore the last viewport when the home screen remounts.
  useEffect(() => {
    if (containerHeight === null) return;
    const resolvedPanY = resolveHomeScenePanY({
      currentPanY: currentPanYRef.current,
      savedPanY,
      maxPanY: panBounds.max,
    });
    const shouldNotify = currentPanYRef.current == null || currentPanYRef.current !== resolvedPanY;
    syncPanPosition(resolvedPanY, shouldNotify);
  }, [containerHeight, panBounds.max, savedPanY, syncPanPosition]);

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: PHASE_BG_COLORS[currentPhase] || PHASE_BG_COLORS[0] }]}>
      {/* Floating particles */}
      {particles.map(particle => (
        <FloatingParticle key={particle.id} particle={particle} />
      ))}

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
              {/* Sky background - inside transform so it moves with the scene.
                  Bottom-anchored: the artwork's bottom row sits exactly on the
                  container bottom (see the SKY_BOX_HEIGHT geometry notes), so
                  the art always covers every visible pixel and the house seats
                  at a device-independent spot on the meadow below the river. */}
              <Image
                source={
                  currentPhase >= 4 ? SKY_SHADOW :
                  currentPhase >= 3 ? SKY_STORM :
                  currentPhase >= 2 ? SKY_DUSK :
                  currentPhase >= 1 ? SKY_AFTERNOON :
                  SKY_DAY
                }
                style={styles.skyBackground}
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

              {/* Drifting clouds - Phase 0-2 only; the storm sky takes over at Phase 3.
                  Rendered before the house so they layer behind the shadow figure. */}
              {currentPhase <= 2 && (
                <>
                  <DriftingCloud source={CLOUD_1} width={170} top={26} duration={80000} initialProgress={0.15} opacity={currentPhase >= 2 ? 0.4 : 0.85} />
                  <DriftingCloud source={CLOUD_2} width={130} top={88} duration={105000} initialProgress={0.55} opacity={currentPhase >= 2 ? 0.4 : 0.85} />
                  <DriftingCloud source={CLOUD_1} width={120} top={58} duration={65000} initialProgress={0.8} opacity={currentPhase >= 2 ? 0.35 : 0.75} />
                </>
              )}


              {/* Stars at night (phase 3-4) */}
              {currentPhase >= 3 && (
                <View style={styles.starsContainer} pointerEvents="none">
                  {nightStars.map((star) => (
                    <Text
                      key={star.id}
                      style={[
                        styles.star,
                        {
                          left: star.left,
                          top: star.top,
                          opacity: star.opacity,
                          fontSize: star.fontSize,
                        }
                      ]}
                    >
                      ✦
                    </Text>
                  ))}
                </View>
              )}

              {/* Shooting stars (only at higher phases) */}
              {ambientMotionEnabled && currentPhase >= 2 && <ShootingStar />}
              {ambientMotionEnabled && currentPhase >= 3 && <ShootingStar />}
              {ambientMotionEnabled && currentPhase >= 4 && <ShootingStar />}

              {/* Flying birds */}
              {ambientMotionEnabled && (
                <>
                  <FlyingBird startDelay={0} yPosition={80} />
                  <FlyingBird startDelay={3000} yPosition={50} />
                  {currentPhase < 3 && <FlyingBird startDelay={6000} yPosition={110} />}
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
                    <SmokePuff delay={0} isStatic={!ambientMotionEnabled} />
                    <SmokePuff delay={1000} isStatic={!ambientMotionEnabled} />
                    <SmokePuff delay={2000} isStatic={!ambientMotionEnabled} />
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
                      <Text style={styles.emptyHouseText}>🏠</Text>
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
                    {pitNeedsAttention && <PitAttentionGlow />}
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
  // Clouds - inside transform container
  cloud: {
    position: 'absolute',
    flexDirection: 'row',
    zIndex: 200,
  },
  cloudEmoji: {
    fontFamily: BODY_FONT,
    fontSize: 45,
    opacity: 0.9,
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
  star: {
    fontFamily: BODY_FONT,
    position: 'absolute',
    color: '#FFFFFF',
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
  // Warm attention halo behind the pit entrance (offerings waiting). Layered
  // rgba ovals under a single animated-opacity wrapper — no color animation.
  pitGlow: {
    position: 'absolute',
    top: -10,
    left: -20,
    right: -20,
    bottom: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pitGlowOuter: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 80,
    backgroundColor: 'rgba(255, 176, 74, 0.32)',
  },
  pitGlowInner: {
    position: 'absolute',
    width: '62%',
    height: '58%',
    borderRadius: 48,
    backgroundColor: 'rgba(255, 214, 130, 0.38)',
  },
  smokeEmoji: {
    fontFamily: BODY_FONT,
    fontSize: 18,
    position: 'absolute',
    top: -25,
    opacity: 0.6,
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
  emptyHouseSubtext: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 16,
    color: CandyColors.white,
    fontWeight: '700',
  },

  // Foundation
});

export default HouseWorld;
