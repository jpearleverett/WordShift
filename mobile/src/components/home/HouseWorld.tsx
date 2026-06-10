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
} from 'react-native-gesture-handler';
import { Room, Animal, DialoguePhase, Unlockable } from '../../types/homeWorld';
import { RoomView } from './RoomView';
import { CandyColors } from '../../theme/colors';
import { isOnCooldown, getSessionStatus } from '../../services/dialogueSession';
import { clampHomeScenePanY, resolveHomeScenePanY } from '../../services/homeScenePan';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';

// Environment assets
const SKY_DAY = require('../../../assets/environment/sky_day.png');
const SKY_AFTERNOON = require('../../../assets/environment/sky_afternoon.png');
const SKY_DUSK = require('../../../assets/environment/sky_dusk.png');
const SKY_STORM = require('../../../assets/environment/sky_storm.png');
const SKY_SHADOW = require('../../../assets/environment/sky_shadow.png');
const CLOUD_1 = require('../../../assets/environment/cloud_1.png');
const CLOUD_2 = require('../../../assets/environment/cloud_2.png');
const GROUND_IMG = require('../../../assets/environment/ground.png');
const TREE_IMG = require('../../../assets/environment/tree.png');
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

const SmokePuff: React.FC<{ delay: number }> = ({ delay }) => {
  const y = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const mountedRef = useRef(true);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    mountedRef.current = true;

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
  }, []);

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

// Phase-aware background colors (blends with each sky image's edges)
const PHASE_BG_COLORS: Record<number, string> = {
  0: '#6fb7df',
  1: '#104c83',
  2: '#514378',
  3: '#060612',
  4: '#1a122a',
  5: '#1E1830',
};

// ═══════════════════════════════════════════════════════════════════════════
// ARRANGEMENT CONNECTOR - Visual sigil lines connecting rooms
// ═══════════════════════════════════════════════════════════════════════════

const ArrangementConnector: React.FC<{ phase: number }> = ({ phase }) => {
  if (phase < 2) return null;

  const lineWidth = phase === 5 ? 1.5 : phase >= 4 ? 3 : phase >= 3 ? 2 : 1;
  const lineColor = phase === 5 ? '#6B5B8A' : phase >= 4 ? '#8B2252' : phase >= 3 ? '#6B4C8A' : '#9B7FCF';
  const lineOpacity = phase === 5 ? 0.3 : phase >= 4 ? 0.7 : phase >= 3 ? 0.4 : 0.2;
  const showNodes = phase >= 3;
  const showGlow = phase === 4;

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
        ]}
      />
      {/* Node circle at connection point */}
      {showNodes && (
        <View
          style={[
            arrangementStyles.node,
            { borderColor: lineColor },
            showGlow && arrangementStyles.nodeGlow,
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
      pointerEvents="none"
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
      pointerEvents="none"
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

// House dimensions (single-column layout)
// Room PNGs are 1456x720 (approx 2:1 aspect ratio)
const ROOM_WIDTH = 250;
const ROOM_HEIGHT = ROOM_WIDTH * 0.493865; // Maintains ~2:1 aspect ratio of room PNGs (1456x720)
const ROOM_GAP = 6;
const HOUSE_PADDING = 16;
const HOUSE_WIDTH = ROOM_WIDTH + (HOUSE_PADDING * 2);

// House structure art (roof.png 1024x420, foundation.png 1024x160,
// ground.png 1024x300, tree.png 480x640, shadow_figure.png 600x1200)
const ROOF_WIDTH = HOUSE_WIDTH + 20; // Reference width for the shadow figure's scale
const GROUND_WIDTH = ROOM_WIDTH * 1.6;
const GROUND_HEIGHT = GROUND_WIDTH * (300 / 1024);
const SHADOW_FIGURE_ASPECT = 600 / 1200; // width / height


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
}) => {
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
  }, [currentPhase]);



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

  const panBounds = useMemo(() => {
    // Full height of the house structure including margins and connectors
    const connectorHeight = Math.max(0, numRows - 1) * 10; // ArrangementConnectors between rooms
    const totalContentHeight = 50 + 80 + houseHeight + 25 + 40 + connectorHeight; // marginTop + roof + body + foundation + marginBottom + connectors
    // How much the house overflows above the visible viewport
    const overflow = Math.max(0, totalContentHeight - (containerHeight ?? SCREEN_HEIGHT));
    return {
      min: 0, // Don't allow panning below the house (prevents empty space below foundation)
      max: Math.max(0, overflow + 50), // Allow panning up to see the roof + small padding
    };
  }, [containerHeight, houseHeight, numRows]);

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
    <GestureHandlerRootView style={[styles.container, { backgroundColor: PHASE_BG_COLORS[currentPhase] || '#6fb7df' }]}>
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
                  Keep the same image size, but frame it slightly lower on the
                  home screen so more of the lower artwork is visible. */}
              <Image
                source={
                  currentPhase >= 4 ? SKY_SHADOW :
                  currentPhase >= 3 ? SKY_STORM :
                  currentPhase >= 2 ? SKY_DUSK :
                  currentPhase >= 1 ? SKY_AFTERNOON :
                  SKY_DAY
                }
                style={[styles.skyBackground, {
                  top: -Math.max(SCREEN_HEIGHT * 0.05, houseHeight * 0.0),
                }]}
                resizeMode="cover"
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
              {currentPhase >= 2 && <ShootingStar />}
              {currentPhase >= 3 && <ShootingStar />}
              {currentPhase >= 4 && <ShootingStar />}

              {/* Flying birds */}
              <FlyingBird startDelay={0} yPosition={80} />
              <FlyingBird startDelay={3000} yPosition={50} />
              {currentPhase < 3 && <FlyingBird startDelay={6000} yPosition={110} />}

              {/* House */}
              <View style={styles.houseContainer}>
                {/* The unnamed entity - invisible until Phase 3, then looming behind the house */}
                <ShadowFigure phase={currentPhase} />

                {/* Grassy hill under the house - darkens as the world does */}
                <Image
                  source={GROUND_IMG}
                  pointerEvents="none"
                  resizeMode="stretch"
                  style={{
                    position: 'absolute',
                    bottom: -GROUND_HEIGHT * 0.45,
                    alignSelf: 'center',
                    width: GROUND_WIDTH,
                    height: GROUND_HEIGHT,
                    zIndex: -2,
                    opacity: currentPhase >= 4 ? 0.3 : currentPhase >= 3 ? 0.5 : 1,
                  }}
                />

                {/* Candy trees flanking the house - fading away as the phases darken */}
                {currentPhase <= 3 && (
                  <>
                    <Image
                      source={TREE_IMG}
                      pointerEvents="none"
                      resizeMode="contain"
                      style={{
                        position: 'absolute',
                        bottom: -6,
                        left: -62,
                        width: 68,
                        height: 90,
                        zIndex: -1,
                        opacity: currentPhase >= 3 ? 0.4 : 1,
                      }}
                    />
                    <Image
                      source={TREE_IMG}
                      pointerEvents="none"
                      resizeMode="contain"
                      style={{
                        position: 'absolute',
                        bottom: -4,
                        right: -48,
                        width: 50,
                        height: 66,
                        zIndex: -1,
                        opacity: currentPhase >= 3 ? 0.4 : 1,
                        transform: [{ scaleX: -1 }],
                      }}
                    />
                  </>
                )}

                {/* Roof */}
                <View style={styles.roof}>
                  <View style={styles.chimney}>
                    <View style={styles.chimneyBody} />
                    <View style={styles.chimneyTop} />
                    {/* Animated smoke puffs */}
                    <View style={styles.smokeContainer}>
                      <SmokePuff delay={0} />
                      <SmokePuff delay={1000} />
                      <SmokePuff delay={2000} />
                    </View>
                  </View>
                  <View style={styles.roofMain}>
                    <View style={styles.roofPattern}>
                      <View style={styles.shingleRow}>
                        {[...Array(8)].map((_, i) => (
                          <View key={i} style={styles.shingle} />
                        ))}
                      </View>
                      <View style={[styles.shingleRow, { marginLeft: 10 }]}>
                        {[...Array(7)].map((_, i) => (
                          <View key={i} style={styles.shingle} />
                        ))}
                      </View>
                    </View>
                  </View>
                  <View style={styles.roofTrim} />
                  <View style={styles.atticWindow}>
                    <View style={styles.atticWindowGlass} />
                    <View style={styles.atticWindowFrame} />
                  </View>
                </View>

                {/* House body with rooms (single-column layout) */}
                <View style={[styles.houseBody, { minHeight: houseHeight - HOUSE_PADDING }]}>
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
                          <ArrangementConnector phase={currentPhase} />
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

                {/* Foundation */}
                <View style={styles.foundation}>
                  <View style={styles.stoneRow}>
                    {[...Array(6)].map((_, i) => (
                      <View key={i} style={styles.stone} />
                    ))}
                  </View>
                </View>
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
    backgroundColor: '#6fb7df', // Matches sky_day bottom edge so no gaps when zoomed out
  },

  // Sky background - moves with scene, oversized to prevent gaps during pan.
  skyBackground: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0,
    left: -SCREEN_WIDTH * 0,
    width: SCREEN_WIDTH * 1,
    height: SCREEN_HEIGHT * 1,
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
    top: -20,
    left: 5,
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

  // House container
  houseContainer: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 30,
  },

  // Roof
  roof: {
    width: HOUSE_WIDTH + 30,
    height: 80,
    marginBottom: -5,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  chimney: {
    position: 'absolute',
    top: -20,
    right: 60,
    alignItems: 'center',
    zIndex: 10,
  },
  chimneyBody: {
    width: 25,
    height: 40,
    backgroundColor: '#8B4513',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  chimneyTop: {
    width: 32,
    height: 8,
    backgroundColor: '#5D4037',
    borderRadius: 2,
    marginTop: -2,
  },
  smokeEmoji: {
    fontSize: 18,
    position: 'absolute',
    top: -25,
    opacity: 0.6,
  },
  roofMain: {
    width: '100%',
    height: 60,
    backgroundColor: '#5D4037',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    overflow: 'hidden',
  },
  roofPattern: {
    flex: 1,
    paddingTop: 15,
    paddingHorizontal: 20,
  },
  shingleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 5,
  },
  shingle: {
    width: 30,
    height: 15,
    backgroundColor: '#4E342E',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  roofTrim: {
    position: 'absolute',
    bottom: 0,
    width: '110%',
    height: 15,
    backgroundColor: '#3E2723',
    borderRadius: 5,
  },
  atticWindow: {
    position: 'absolute',
    top: 20,
    width: 35,
    height: 30,
    borderRadius: 20,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    overflow: 'hidden',
  },
  atticWindowGlass: {
    flex: 1,
    backgroundColor: '#FFE4B5',
    opacity: 0.8,
  },
  atticWindowFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: '#5D4037',
    borderRadius: 20,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },

  // House body
  houseBody: {
    backgroundColor: '#A0522D',
    padding: HOUSE_PADDING / 2,
    borderWidth: 5,
    borderColor: '#5D4037',
    borderTopWidth: 0,
    alignItems: 'center',
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
  foundation: {
    width: HOUSE_WIDTH,
    height: 25,
    backgroundColor: '#6D4C41',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stoneRow: {
    flexDirection: 'row',
    gap: 5,
  },
  stone: {
    width: 50,
    height: 15,
    backgroundColor: '#5D4037',
    borderRadius: 3,
  },
});

export default HouseWorld;
