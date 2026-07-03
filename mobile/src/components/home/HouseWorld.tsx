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
import { RoomView } from './RoomView';
import { CandyColors } from '../../theme/colors';
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
const FOUNDATION_IMG = require('../../../assets/environment/foundation.png');
const WALL_IMG = require('../../../assets/environment/wall.png');
const PIT_ENTRANCE_IMG = require('../../../assets/environment/pit_entrance.png');
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
      <Text style={{ fontSize: 16 }}>{particle.emoji}</Text>
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
      <Text style={{ fontSize: 20, color: '#999' }}>💨</Text>
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
      <Text style={{ fontSize: 18 }}>🐦</Text>
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
      <Text style={{ fontSize: 14 }}>⭐</Text>
    </Animated.View>
  );
};

// Phase-aware backdrop colors behind the sky image. Each value is the average
// of the TOP row of pixels of that phase's sky asset, so when the scene is
// panned up the sky appears to extend upward seamlessly (no color step).
// Sampled from assets/environment/sky_*.png via a scratch pngjs script —
// re-sample these if the sky assets are ever regenerated.
// Phase→sky mapping mirrors the <Image source> below: 0=day, 1=afternoon,
// 2=dusk, 3=storm, 4+=shadow (Phase 5 reuses sky_shadow).
const PHASE_BG_COLORS: Record<number, string> = {
  0: '#439cf2', // sky_day.png top row
  1: '#1583f9', // sky_afternoon.png top row
  2: '#684381', // sky_dusk.png top row
  3: '#000212', // sky_storm.png top row
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
  3: '#153150', // sky_storm.png bottom row
  4: '#182131', // sky_shadow.png bottom row
  5: '#182131', // Phase 5 renders sky_shadow too
};

// ═══════════════════════════════════════════════════════════════════════════
// ARRANGEMENT CONNECTOR - Visual sigil lines connecting rooms
// ═══════════════════════════════════════════════════════════════════════════

const ArrangementConnector: React.FC<{ phase: number; tendingIntensity?: number }> = ({
  phase,
  tendingIntensity = 0,
}) => {
  if (phase < 2) return null;

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

  return (
    <View style={arrangementStyles.connector}>
      {/* Vertical line */}
      <View
        style={[
          arrangementStyles.line,
          {
            width: lineWidth,
            backgroundColor: lineColor,
            opacity: lineOpacity,
          },
          showGlow && arrangementStyles.lineGlow,
          // At Phase 5 the deepening glow is serene mauve, not Phase-4 crimson.
          showGlow && t > 0 && { shadowColor: lineColor, shadowOpacity: 0.4 + t * 0.4, shadowRadius: 3 + t * 4 },
        ]}
      />
      {/* Node circle at connection point */}
      {showNodes && (
        <View
          style={[
            arrangementStyles.node,
            { borderColor: lineColor },
            showGlow && arrangementStyles.nodeGlow,
            showGlow && t > 0 && { backgroundColor: lineColor, shadowColor: lineColor, shadowOpacity: 0.5 + t * 0.4 },
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
  lineGlow: {
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  node: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  nodeGlow: {
    backgroundColor: '#8B2252',
    borderColor: '#FF4444',
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
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

// House structure art (roof.png 1024x420, foundation.png 1024x160,
// ground.png 1024x300, tree.png 480x640, shadow_figure.png 600x1200)
const ROOF_WIDTH = HOUSE_WIDTH + 30; // Rendered roof width (slight overhang)
const ROOF_RENDER_HEIGHT = Math.round(ROOF_WIDTH * (312 / 792)); // roof.png aspect
const FOUNDATION_RENDER_HEIGHT = Math.round(HOUSE_WIDTH * (84 / 792)); // foundation.png aspect
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
// top sits at (HOUSE_BOTTOM_MARGIN + PIT_DOCK_CLEARANCE + pit 95 + foundation
// 30) = 235dp ≈ image rows 1360-1470 across real devices — on the meadow,
// just below the river, in every sky variant.
const SKY_IMG_WIDTH = 941;
const SKY_IMG_HEIGHT = 1972;
// The 760 floor guarantees the seat even on very small / display-size-scaled
// windows (e.g. 320x640dp): scale >= 760/1972 puts the foundation top at
// image row <= ~1362, still below every river. Larger boxes only push the
// house further down the meadow, never back into the water.
const SKY_BOX_HEIGHT = Math.max(
  SCREEN_HEIGHT,
  Math.ceil(SCREEN_WIDTH * (SKY_IMG_HEIGHT / SKY_IMG_WIDTH)) + 2,
  760,
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
  savedPanY = null,
  onPanYChange,
  onPitPress,
  pitNeedsAttention = false,
  tendingLevel = 0,
}) => {
  const tendingIntensity = getTendingIntensity(tendingLevel);
  const ambientMotionEnabled = !getSettingsSync().reducedMotion && !shouldSimplifyAnimations();
  // Contact-shadow strength by phase: crisp under the day sun, softer as the
  // skies darken (a hard shadow under a storm sky reads wrong).
  const contactShadowMult = [1, 1, 0.85, 0.6, 0.5, 0.5][currentPhase] ?? 1;
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
    const totalContentHeight = 50 + (ROOF_RENDER_HEIGHT - 6) + houseHeight + FOUNDATION_RENDER_HEIGHT + (onPitPress ? 95 : 0) + (houseBottomMargin + 10) + connectorHeight; // marginTop + roof + body + foundation + pit + marginBottom + connectors
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

                {/* Contact shadow: three stacked soft pills under the
                    foundation seat the house on the meadow (without it the
                    hard art edge read as a sticker on the background).
                    Static Views, painted before the house so the foundation
                    covers the center; dark phases soften it. */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.contactShadowWrap,
                    { bottom: (onPitPress ? 95 : 0) - 14 },
                  ]}
                >
                  <View style={[styles.contactShadowPill, styles.contactShadowOuter, { opacity: 0.1 * contactShadowMult }]} />
                  <View style={[styles.contactShadowPill, styles.contactShadowMid, { opacity: 0.1 * contactShadowMult }]} />
                  <View style={[styles.contactShadowPill, styles.contactShadowInner, { opacity: 0.12 * contactShadowMult }]} />
                </View>


                {/* Roof — pixel art (chimney + attic window baked into the asset) */}
                <View style={styles.roof}>
                  <Image source={ROOF_IMG} style={styles.roofImage} resizeMode="stretch" />
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
                  <Image
                    source={WALL_IMG}
                    style={styles.wallTexture}
                    resizeMode="repeat"
                    fadeDuration={0}
                  />
                  <View style={styles.topTrim} />

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
                            ritualWords={ritualWords}
                            unlockCost={roomUnlockCost}
                            amberBalance={amberBalance}
                            inviteCost={inviteCost}
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
                </View>

                {/* Foundation — pixel stone courses */}
                <Image source={FOUNDATION_IMG} style={styles.foundationImage} resizeMode="stretch" />

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
  foundationImage: {
    width: HOUSE_WIDTH,
    height: FOUNDATION_RENDER_HEIGHT,
    marginTop: -2,
  },
  pitEntrance: {
    alignSelf: 'center',
    marginTop: -4, // path tucks under the foundation edge
    width: 132,
    height: 99, // pit_entrance.png aspect (480x360)
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
    fontSize: 18,
    position: 'absolute',
    top: -25,
    opacity: 0.6,
  },

  // House body
  houseBody: {
    // Fallback under the plank texture (also covers any repeat-tiling seam)
    backgroundColor: '#A0522D',
    padding: HOUSE_PADDING / 2,
    borderWidth: 5,
    borderColor: '#5D4037',
    borderTopWidth: 0,
    alignItems: 'center',
  },
  // Seamless 48x48 timber tile (assets/environment/wall.png, generated by
  // generatePixelWorld.mjs) repeated across the wall area behind the rooms.
  wallTexture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Contact shadow under the foundation. Wrap is bottom-positioned inline
  // (the pit entrance adds 95dp of flow height below the foundation when it
  // renders). Dark grass-green rather than pure black so the low-opacity
  // lobes blend into the meadow.
  contactShadowWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactShadowPill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#0A1408',
  },
  contactShadowOuter: {
    width: HOUSE_WIDTH + 54,
    height: 26,
    borderRadius: 13,
  },
  contactShadowMid: {
    width: HOUSE_WIDTH + 28,
    height: 20,
    borderRadius: 10,
  },
  contactShadowInner: {
    width: HOUSE_WIDTH + 4,
    height: 14,
    borderRadius: 7,
  },
  topTrim: {
    position: 'absolute',
    top: 0,
    left: -5,
    right: -5,
    height: 8,
    backgroundColor: '#8B4513',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
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
    fontSize: 60,
    marginBottom: 10,
  },
  emptyHouseSubtext: {
    fontSize: 16,
    color: CandyColors.white,
    fontWeight: '700',
  },

  // Foundation
});

export default HouseWorld;
