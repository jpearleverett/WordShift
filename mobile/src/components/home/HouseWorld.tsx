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
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing as REasing,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  State,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { Room, Animal, DialoguePhase, Unlockable } from '../../types/homeWorld';
import { RoomView } from './RoomView';
import { CandyColors } from '../../theme/colors';
import { isOnCooldown, getSessionStatus } from '../../services/dialogueSession';

// Environment assets
const SKY_DAY = require('../../../assets/environment/sky_day.png');
const SKY_DUSK = require('../../../assets/environment/sky_dusk.png');
const SKY_STORM = require('../../../assets/environment/sky_storm.png');
const SKY_SHADOW = require('../../../assets/environment/sky_shadow.png');

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
  1: ['✨', '🍂', '🌙', '💫'],
  2: ['🍂', '🌙', '💭', '🌫️'],
  3: ['🌙', '👁️', '🌫️', '💀'],
  4: ['💀', '👁️', '🌑', '⚫', '🔮'],
  5: ['✨', '🌙', '💜'],
};

const particleTextStyle = { fontSize: 16 };

const FloatingParticle: React.FC<{ particle: Particle }> = React.memo(({ particle }) => {
  // Store interpolation in ref so it's not recreated every render
  const rotate = useRef(particle.rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  })).current;

  // Stable style ref — Animated values are mutable, so the object identity stays the same
  const animStyle = useRef({
    position: 'absolute' as const,
    transform: [
      { translateX: particle.x },
      { translateY: particle.y },
      { scale: particle.scale },
      { rotate },
    ],
    opacity: particle.opacity,
  }).current;

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

  return (
    <Animated.View style={animStyle} pointerEvents="none">
      <Text style={particleTextStyle}>{particle.emoji}</Text>
    </Animated.View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SMOKE PUFF ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

const SmokePuff: React.FC<{ delay: number }> = React.memo(({ delay }) => {
  const y = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const mountedRef = useRef(true);
  const animationRef = useRef<Animated.CompositeAnimation | undefined>(undefined);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Stable style ref — prevents new object creation on re-render
  const animStyle = useRef({
    position: 'absolute' as const,
    transform: [{ translateX: x }, { translateY: y }, { scale }],
    opacity,
  }).current;

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
        }),
        Animated.timing(x, {
          toValue: 15 + Math.random() * 10,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 500,
            useNativeDriver: true,
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
        }),
      ]);
      animationRef.current = anim;
      anim.start(() => {
        if (mountedRef.current) animate();
      });
    };

    startTimeoutRef.current = setTimeout(animate, delay);

    return () => {
      mountedRef.current = false;
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      if (animationRef.current) animationRef.current.stop();
    };
  }, [delay]);

  return (
    <Animated.View style={animStyle}>
      <Text style={smokeTextStyle}>💨</Text>
    </Animated.View>
  );
});
const smokeTextStyle = { fontSize: 20, color: '#999' };

// ═══════════════════════════════════════════════════════════════════════════
// FLYING BIRD ANIMATION
// ═══════════════════════════════════════════════════════════════════════════

const FlyingBird: React.FC<{ startDelay: number; yPosition: number }> = React.memo(({ startDelay, yPosition }) => {
  const x = useRef(new Animated.Value(-50)).current;
  const y = useRef(new Animated.Value(yPosition)).current;
  const flapRotation = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flapAnimRef = useRef<Animated.CompositeAnimation | undefined>(undefined);
  const moveAnimRef = useRef<Animated.CompositeAnimation | undefined>(undefined);

  const scaleY = useRef(flapRotation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.6],
  })).current;

  // Stable style ref — prevents new object creation on re-render
  const animStyle = useRef({
    position: 'absolute' as const,
    transform: [{ translateX: x }, { translateY: y }, { scaleY }],
  }).current;

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

  return (
    <Animated.View style={animStyle} pointerEvents="none">
      <Text style={birdTextStyle}>🐦</Text>
    </Animated.View>
  );
});
const birdTextStyle = { fontSize: 18 };

// ═══════════════════════════════════════════════════════════════════════════
// SHOOTING STAR (appears at higher phases)
// ═══════════════════════════════════════════════════════════════════════════

const ShootingStar: React.FC = React.memo(() => {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const animationRef = useRef<Animated.CompositeAnimation | undefined>(undefined);

  // Stable style ref — prevents new object creation on re-render
  const animStyle = useRef({
    position: 'absolute' as const,
    transform: [{ translateX: x }, { translateY: y }],
    opacity,
  }).current;

  useEffect(() => {
    mountedRef.current = true;

    const animate = () => {
      if (!mountedRef.current) return;

      const startX = Math.random() * SCREEN_WIDTH;
      x.setValue(startX);
      y.setValue(Math.random() * 30);
      opacity.setValue(0);

      const anim = Animated.parallel([
        Animated.timing(x, {
          toValue: startX + 150,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: 100 + Math.random() * 50,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1600,
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
    <Animated.View style={animStyle} pointerEvents="none">
      <Text style={shootingStarTextStyle}>⭐</Text>
    </Animated.View>
  );
});
const shootingStarTextStyle = { fontSize: 14 };

// Phase-aware background colors (blends with each sky image's edges)
const PHASE_BG_COLORS: Record<number, string> = {
  0: '#6fb7df',
  1: '#6fb7df',
  2: '#514378',
  3: '#060612',
  4: '#1a122a',
  5: '#1E1830',
};

const getTotalContentHeight = (numRows: number, houseHeight: number): number => {
  const connectorHeight = Math.max(0, numRows - 1) * 10;
  return 50 + 80 + houseHeight + 25 + 40 + connectorHeight;
};

const getOverflowForLayout = (
  numRows: number,
  houseHeight: number,
  containerHeight: number,
): number => Math.max(0, getTotalContentHeight(numRows, houseHeight) - containerHeight);

let cachedHouseWorldContainerHeight = SCREEN_HEIGHT;

// ═══════════════════════════════════════════════════════════════════════════
// ARRANGEMENT CONNECTOR - Visual sigil lines connecting rooms
// ═══════════════════════════════════════════════════════════════════════════

const ArrangementConnector: React.FC<{ phase: number }> = React.memo(({ phase }) => {
  const pulseProgress = useSharedValue(0);

  React.useEffect(() => {
    if (phase < 3) return;

    // Energy pulse — flows through connector lines
    const pulseDuration = phase >= 4 ? 2000 : 3000;
    pulseProgress.value = 0;
    pulseProgress.value = withRepeat(
      withTiming(1, { duration: pulseDuration, easing: REasing.inOut(REasing.sin) }),
      -1,
      true,
    );

    return () => cancelAnimation(pulseProgress);
  }, [phase]);

  const lineAnimStyle = useAnimatedStyle(() => {
    if (phase < 3) return {};
    // Subtle brightness pulse on the connector line
    const baseOpacity = phase === 5 ? 0.3 : phase >= 4 ? 0.7 : 0.4;
    const pulseRange = phase >= 4 ? 0.25 : 0.15;
    return {
      opacity: baseOpacity + pulseProgress.value * pulseRange,
    };
  });

  const nodeAnimStyle = useAnimatedStyle(() => {
    if (phase < 3) return {};
    // Node pulses in size and opacity
    const s = 1.0 + pulseProgress.value * (phase >= 4 ? 0.3 : 0.15);
    return {
      transform: [{ scale: s }],
      opacity: 0.7 + pulseProgress.value * 0.3,
    };
  });

  if (phase < 2) return null;

  const lineWidth = phase === 5 ? 1.5 : phase >= 4 ? 3 : phase >= 3 ? 2 : 1;
  const lineColor = phase === 5 ? '#6B5B8A' : phase >= 4 ? '#8B2252' : phase >= 3 ? '#6B4C8A' : '#9B7FCF';
  const lineOpacity = phase === 5 ? 0.3 : phase >= 4 ? 0.7 : phase >= 3 ? 0.4 : 0.2;
  const showNodes = phase >= 3;
  const showGlow = phase === 4;

  return (
    <View style={arrangementStyles.connector}>
      {/* Vertical energy line — pulses at Phase 3+ */}
      {phase >= 3 ? (
        <Reanimated.View
          style={[
            arrangementStyles.line,
            {
              width: lineWidth,
              backgroundColor: lineColor,
            },
            showGlow && arrangementStyles.lineGlow,
            lineAnimStyle,
          ]}
        />
      ) : (
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
      )}
      {/* Node circle at connection point — pulses at Phase 3+ */}
      {showNodes && (
        <Reanimated.View
          style={[
            arrangementStyles.node,
            { borderColor: lineColor },
            showGlow && arrangementStyles.nodeGlow,
            nodeAnimStyle,
          ]}
        />
      )}
    </View>
  );
});

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
// SHADOW PRESENCE - A growing dark silhouette behind the house
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ShadowPresence — A growing dark silhouette behind the house.
 * Invisible at Phase 0-1. Faint at Phase 2. Prominent at Phase 4.
 * Represents the entity being summoned, visible before any animal mentions it.
 *
 * Enhanced: Animated breathing (scale pulse), wispy tendrils at Phase 3+,
 * pulsing crimson eyes at Phase 4 with glow effect.
 */
const ShadowPresence: React.FC<{ phase: number }> = React.memo(({ phase }) => {
  const breatheProgress = useSharedValue(0);
  const eyePulseProgress = useSharedValue(0);

  React.useEffect(() => {
    if (phase < 2) return;

    // Breathing animation — slow scale pulse via Reanimated
    const breatheDuration = phase === 5 ? 6000 : phase >= 4 ? 3000 : 4000;
    breatheProgress.value = 0;
    breatheProgress.value = withRepeat(
      withTiming(1, { duration: breatheDuration * 2, easing: REasing.inOut(REasing.sin) }),
      -1,
      true,
    );

    // Eye pulse at Phase 4+
    if (phase >= 4) {
      eyePulseProgress.value = 0;
      eyePulseProgress.value = withRepeat(
        withTiming(1, { duration: 3000, easing: REasing.inOut(REasing.sin) }),
        -1,
        true,
      );
    }

    return () => {
      cancelAnimation(breatheProgress);
      cancelAnimation(eyePulseProgress);
    };
  }, [phase]);

  const bodyAnimStyle = useAnimatedStyle(() => {
    if (phase < 2) return { opacity: 0 };
    const baseOpacity = phase === 2 ? 0.06 : phase === 3 ? 0.15 : phase === 5 ? 0.20 : 0.30;
    const scaleMax = phase >= 4 ? 1.06 : 1.03;
    const s = 1.0 + breatheProgress.value * (scaleMax - 1.0);
    return {
      opacity: baseOpacity,
      transform: [{ scale: s }],
    };
  });

  const eyeAnimStyle = useAnimatedStyle(() => {
    const op = 0.5 + eyePulseProgress.value * 0.5;
    return { opacity: op };
  });

  if (phase < 2) return null;

  const scaleVal = phase === 2 ? 0.6 : phase === 3 ? 0.8 : 1.0;
  const height = 180 * scaleVal;
  const width = 100 * scaleVal;

  return (
    <Reanimated.View style={[{
      position: 'absolute',
      top: -height * 0.3,
      alignSelf: 'center',
      width: width,
      height: height,
      zIndex: -1,
    }, bodyAnimStyle]}>
      {/* Central body - tall dark oval */}
      <View style={{
        flex: 1,
        backgroundColor: phase === 5 ? 'rgba(40, 20, 50, 0.9)' : phase >= 4 ? 'rgba(80, 10, 30, 0.9)' : 'rgba(20, 5, 30, 0.9)',
        borderTopLeftRadius: width * 0.4,
        borderTopRightRadius: width * 0.4,
        borderBottomLeftRadius: width * 0.15,
        borderBottomRightRadius: width * 0.15,
      }} />
      {/* Wispy tendrils at Phase 3+ — narrower extensions on sides */}
      {phase >= 3 && (
        <>
          <View style={{
            position: 'absolute',
            bottom: height * 0.1,
            left: -width * 0.15,
            width: width * 0.2,
            height: height * 0.4,
            backgroundColor: 'rgba(20, 5, 30, 0.5)',
            borderRadius: width * 0.1,
            transform: [{ rotate: '-15deg' }],
          }} />
          <View style={{
            position: 'absolute',
            bottom: height * 0.1,
            right: -width * 0.15,
            width: width * 0.2,
            height: height * 0.4,
            backgroundColor: 'rgba(20, 5, 30, 0.5)',
            borderRadius: width * 0.1,
            transform: [{ rotate: '15deg' }],
          }} />
        </>
      )}
      {/* "Eyes" at Phase 4+ - pulsing dots with glow (crimson at Phase 4, soft purple at Phase 5) */}
      {phase >= 4 && (
        <Reanimated.View style={[{
          position: 'absolute',
          top: height * 0.25,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: width * 0.2,
        }, eyeAnimStyle]}>
          <View style={{
            width: 8,
            height: 5,
            borderRadius: 4,
            backgroundColor: phase === 5 ? '#7B6B8A' : 'rgba(200, 40, 60, 0.9)',
            shadowColor: phase === 5 ? '#7B6B8A' : '#FF0000',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: phase === 5 ? 0.5 : 0.8,
            shadowRadius: 6,
          }} />
          <View style={{
            width: 8,
            height: 5,
            borderRadius: 4,
            backgroundColor: phase === 5 ? '#7B6B8A' : 'rgba(200, 40, 60, 0.9)',
            shadowColor: phase === 5 ? '#7B6B8A' : '#FF0000',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: phase === 5 ? 0.5 : 0.8,
            shadowRadius: 6,
          }} />
        </Reanimated.View>
      )}
    </Reanimated.View>
  );
});

// House dimensions (single-column layout)
// Room PNGs are 1456x720 (approx 2:1 aspect ratio)
const ROOM_WIDTH = 250;
const ROOM_HEIGHT = ROOM_WIDTH * 0.493865; // Maintains ~2:1 aspect ratio of room PNGs (1456x720)
const ROOM_GAP = 6;
const HOUSE_PADDING = 16;
const HOUSE_WIDTH = ROOM_WIDTH + (HOUSE_PADDING * 2);


// ═══════════════════════════════════════════════════════════════════════════
// PARTICLE LAYER - Isolated component to prevent particle state updates
// from re-rendering the entire HouseWorld tree
// ═══════════════════════════════════════════════════════════════════════════

const ParticleLayer: React.FC<{ currentPhase: number }> = React.memo(({ currentPhase }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);

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
      setParticles(prev => [...prev.slice(-8), newParticle]);
    };

    const spawnRate = currentPhase >= 3 ? 4000 : currentPhase >= 2 ? 3000 : 2000;
    const interval = setInterval(spawnParticle, spawnRate);
    spawnParticle();

    return () => clearInterval(interval);
  }, [currentPhase]);

  return (
    <>
      {particles.map(particle => (
        <FloatingParticle key={particle.id} particle={particle} />
      ))}
    </>
  );
});

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
}

export const HouseWorld: React.FC<HouseWorldProps> = React.memo(({
  rooms,
  animals,
  currentPhase,
  onAnimalPress,
  onRoomPress,
  ritualWords = [],
  nextUnlock = null,
  amberBalance = 0,
  purchasedUpgrades = {},
}) => {
  const unlockedRoomCount = rooms.filter(room => room.isUnlocked).length;
  const hasPendingRoom = nextUnlock?.type === 'room'
    && rooms.some(room => room.id === nextUnlock.targetId && !room.isUnlocked);
  const initialNumRows = Math.max(1, unlockedRoomCount + (hasPendingRoom ? 1 : 0));
  const initialHouseHeight = initialNumRows * ROOM_HEIGHT + Math.max(0, initialNumRows - 1) * ROOM_GAP + HOUSE_PADDING * 2;
  const initialOverflow = getOverflowForLayout(
    initialNumRows,
    initialHouseHeight,
    cachedHouseWorldContainerHeight,
  );

  // Animated values
  const translateY = useRef(new Animated.Value(initialOverflow)).current;

  // Refs for gesture tracking
  const panRef = useRef<PanGestureHandler>(null);

  // State tracking for gestures
  const baseTranslateY = useRef(initialOverflow);

  // Track container height via ref to avoid state-triggered re-renders.
  // Position updates are applied directly via translateY.setValue in the
  // onContainerLayout callback, bypassing React's reconciliation entirely.
  const containerHeightRef = useRef<number>(cachedHouseWorldContainerHeight);
  // numRows ref keeps the layout callback in sync with the latest room count
  // without needing to be in a useCallback dependency array.
  const numRowsRef = useRef(1);
  const houseHeightRef = useRef(0);
  const onContainerLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && Math.abs(height - containerHeightRef.current) > 1) {
      containerHeightRef.current = height;
      cachedHouseWorldContainerHeight = height;
      const nr = numRowsRef.current;
      const hh = houseHeightRef.current;
      const overflow = getOverflowForLayout(nr, hh, height);
      translateY.setValue(overflow);
      baseTranslateY.current = overflow;
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

  // Sun animation
  const sunPulse = useRef(new Animated.Value(1)).current;
  const sunRotation = useRef(new Animated.Value(0)).current;

  // Cloud animations
  const cloud1X = useRef(new Animated.Value(-150)).current;
  const cloud2X = useRef(new Animated.Value(SCREEN_WIDTH + 100)).current;
  const cloud3X = useRef(new Animated.Value(-150)).current;

  // Stable cloud styles — prevents new object creation on every render
  const cloud1Style = useRef({ top: 20 as number, transform: [{ translateX: cloud1X }] }).current;
  const cloud2Style = useRef({ top: 70 as number, transform: [{ translateX: cloud2X }] }).current;
  const cloud3Style = useRef({ top: 45 as number, transform: [{ translateX: cloud3X }] }).current;
  const cloudDimStyle = useMemo(() => currentPhase >= 3 ? { opacity: 0.6 } : undefined, [currentPhase]);
  const cloud3FontStyle = useMemo(() =>
    currentPhase >= 3 ? { fontSize: 38, opacity: 0.6 } : { fontSize: 38 },
    [currentPhase]
  );
  const cloud2MarginStyle = useMemo(() =>
    currentPhase >= 3 ? { marginLeft: 25, opacity: 0.6 } : { marginLeft: 25 },
    [currentPhase]
  );

  // Sun pulsing animation
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(sunPulse, {
          toValue: 1.15,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sunPulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const rotateAnimation = Animated.loop(
      Animated.timing(sunRotation, {
        toValue: 360,
        duration: 60000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    if (currentPhase < 3) {
      pulseAnimation.start();
      rotateAnimation.start();
    }

    return () => {
      pulseAnimation.stop();
      rotateAnimation.stop();
    };
  }, [currentPhase]);

  // Cloud animations — track only the 3 current animations (no unbounded array growth)
  const cloudMountedRef = useRef(true);

  useEffect(() => {
    cloudMountedRef.current = true;
    const activeAnims: (Animated.CompositeAnimation | null)[] = [null, null, null];

    const animateCloud = (cloudAnim: Animated.Value, startX: number, duration: number, index: number) => {
      const animate = () => {
        if (!cloudMountedRef.current) return;
        cloudAnim.setValue(startX > SCREEN_WIDTH / 2 ? SCREEN_WIDTH + 100 : -150);
        const anim = Animated.timing(cloudAnim, {
          toValue: startX > SCREEN_WIDTH / 2 ? -150 : SCREEN_WIDTH + 100,
          duration,
          useNativeDriver: true,
        });
        activeAnims[index] = anim;
        anim.start(() => {
          if (cloudMountedRef.current) animate();
        });
      };
      animate();
    };

    animateCloud(cloud1X, -100, 45000, 0);
    animateCloud(cloud2X, SCREEN_WIDTH + 50, 38000, 1);
    animateCloud(cloud3X, SCREEN_WIDTH / 2, 52000, 2);

    return () => {
      cloudMountedRef.current = false;
      activeAnims.forEach(anim => anim?.stop());
    };
  }, []);

  // Stable sun rotation interpolation — stored in ref to avoid recreation
  const sunRotate = useRef(sunRotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  })).current;

  // Memoize room computations to avoid new arrays/objects on every render.
  // Get unlocked rooms plus a single "next room" preview (if the next unlock is a room).
  const { sortedRooms, numRows, houseHeight } = useMemo(() => {
    const unlocked = rooms.filter(room => room.isUnlocked).sort((a, b) => a.floor - b.floor);
    const pendingRoom = nextUnlock?.type === 'room'
      ? rooms.find(room => room.id === nextUnlock.targetId && !room.isUnlocked) || null
      : null;
    const display = pendingRoom ? [...unlocked, pendingRoom] : unlocked;
    const sorted = [...display].sort((a, b) => b.layoutPosition.row - a.layoutPosition.row);
    const nr = Math.max(1, display.length);
    const hh = nr * ROOM_HEIGHT + Math.max(0, nr - 1) * ROOM_GAP + HOUSE_PADDING * 2;
    return { sortedRooms: sorted, numRows: nr, houseHeight: hh };
  }, [rooms, nextUnlock]);

  // Keep refs in sync for the layout callback (avoids stale closure)
  numRowsRef.current = numRows;
  houseHeightRef.current = houseHeight;

  // Memoize animal-room lookup
  const animalByRoom = useMemo(() => {
    const map = new Map<string, Animal>();
    for (const a of animals) {
      map.set(a.roomId, a);
    }
    return map;
  }, [animals]);

  // Calculate pan bounds based on content size
  // Uses refs so gesture callbacks don't need to be recreated when these values change.
  const getPanBoundsRef = useRef(() => ({ min: 0, max: 0 }));
  getPanBoundsRef.current = () => {
    const connectorHeight = Math.max(0, numRows - 1) * 10;
    const totalContentHeight = 50 + 80 + houseHeight + 25 + 40 + connectorHeight;
    const overflow = Math.max(0, totalContentHeight - containerHeightRef.current);
    return {
      min: 0,
      max: Math.max(0, overflow + 50),
    };
  };

  // Stable pan gesture callbacks — use refs to avoid PanGestureHandler reconfiguration
  const onPanGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
    const { translationY: ty } = event.nativeEvent;
    const bounds = getPanBoundsRef.current();
    const newY = Math.max(bounds.min, Math.min(bounds.max, baseTranslateY.current + ty));
    translateY.setValue(newY);
  }, []);

  const onPanHandlerStateChange = useCallback((event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY: ty } = event.nativeEvent;
      const bounds = getPanBoundsRef.current();
      baseTranslateY.current = Math.max(bounds.min, Math.min(bounds.max, baseTranslateY.current + ty));
    }
  }, []);

  // Stable transform container style — translateY is an Animated.Value ref, safe to store
  const transformStyle = useRef([
    styles.transformContainer,
    { transform: [{ translateY }] },
  ]).current;

  // Stable sun style with animated transform — stored in ref to avoid recreation
  const sunStyle = useRef([
    styles.sun,
    { transform: [{ scale: sunPulse }, { rotate: sunRotate }] },
  ]).current;

  // Set initial pan position when room count changes.
  // containerHeight changes are handled directly in onContainerLayout.
  useEffect(() => {
    const overflow = getOverflowForLayout(numRows, houseHeight, containerHeightRef.current);
    translateY.setValue(overflow);
    baseTranslateY.current = overflow;
  }, [numRows, houseHeight]);

  // Phase-aware container bg color — memoized to avoid inline object creation
  const containerBgStyle = useMemo(() => [
    styles.container,
    { backgroundColor: PHASE_BG_COLORS[currentPhase] || '#6fb7df' },
  ], [currentPhase]);

  // Phase-aware sky source
  const skySource = currentPhase >= 4 ? SKY_SHADOW
    : currentPhase >= 3 ? SKY_STORM
    : currentPhase >= 2 ? SKY_DUSK
    : SKY_DAY;

  // Sun opacity based on phase — memoized
  const sunOpacityStyle = useMemo(
    () => currentPhase >= 3 ? { opacity: 0.4 } : undefined,
    [currentPhase]
  );

  // Memoized sun ray transform styles — avoids recreating 8 objects per render
  const sunRayStyles = useRef(
    [...Array(8)].map((_, i) => [styles.sunRay, { transform: [{ rotate: `${i * 45}deg` }] }])
  ).current;

  return (
    <View style={containerBgStyle}>
      {/* Floating particles — isolated to prevent re-rendering the rest of the tree */}
      <ParticleLayer currentPhase={currentPhase} />

      {/* Pan gesture handler - vertical only */}
      <PanGestureHandler
        ref={panRef}
        onGestureEvent={onPanGestureEvent}
        onHandlerStateChange={onPanHandlerStateChange}
        minDist={10}
        avgTouches
      >
        <Animated.View style={styles.gestureContainer} onLayout={onContainerLayout}>
          <Animated.View style={transformStyle}>
              {/* Sky background - inside transform so it moves with the scene */}
              <Image
                source={skySource}
                style={styles.skyBackground}
                resizeMode="cover"
              />

              {/* Animated clouds - inside transform so they move with the scene */}
              <Animated.View style={[styles.cloud, cloud1Style]} pointerEvents="none">
                <Text style={[styles.cloudEmoji, cloudDimStyle]}>☁️</Text>
              </Animated.View>
              <Animated.View style={[styles.cloud, cloud2Style]} pointerEvents="none">
                <Text style={[styles.cloudEmoji, cloudDimStyle]}>☁️</Text>
                <Text style={[styles.cloudEmoji, cloud2MarginStyle]}>☁️</Text>
              </Animated.View>
              <Animated.View style={[styles.cloud, cloud3Style]} pointerEvents="none">
                <Text style={[styles.cloudEmoji, cloud3FontStyle]}>☁️</Text>
              </Animated.View>

              {/* Sun with animated rays - hidden at phase 4 */}
              {currentPhase < 4 && (
                <Animated.View
                  style={sunOpacityStyle ? [sunStyle[0], sunStyle[1], sunOpacityStyle] : sunStyle}
                  pointerEvents="none"
                >
                  <View style={styles.sunRays}>
                    {sunRayStyles.map((rayStyle, i) => (
                      <View key={i} style={rayStyle} />
                    ))}
                  </View>
                  <Text style={styles.sunEmoji}>{currentPhase >= 3 ? '🌙' : '☀️'}</Text>
                </Animated.View>
              )}

              {/* Moon for phase 4 */}
              {currentPhase >= 4 && (
                <View style={moonStyle} pointerEvents="none">
                  <Text style={styles.sunEmoji}>🌑</Text>
                </View>
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
                {/* Shadow entity silhouette - grows across phases, behind the house */}
                <ShadowPresence phase={currentPhase} />

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
                      <View style={[styles.shingleRow, shingleRow2Style]}>
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
                    const roomAnimal = animalByRoom.get(room.id) || null;
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

                  {sortedRooms.length === 0 && (
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
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparator to prevent re-renders from irrelevant prop changes.
  // The animals array gets a new reference on every dialogue interaction
  // (handleNextDialogue/handleCloseDialogue call setAnimals with .map()),
  // but only unlock/cooldown status actually affects HouseWorld visuals.
  if (prevProps.currentPhase !== nextProps.currentPhase) return false;
  if (prevProps.amberBalance !== nextProps.amberBalance) return false;
  if (prevProps.onAnimalPress !== nextProps.onAnimalPress) return false;
  if (prevProps.onRoomPress !== nextProps.onRoomPress) return false;
  if (prevProps.nextUnlock !== nextProps.nextUnlock) return false;
  if (prevProps.purchasedUpgrades !== nextProps.purchasedUpgrades) return false;
  if (prevProps.ritualWords !== nextProps.ritualWords) return false;
  if (prevProps.rooms !== nextProps.rooms) return false;

  // Deep-compare animals by the fields that affect HouseWorld visuals
  const prevAnimals = prevProps.animals;
  const nextAnimals = nextProps.animals;
  if (prevAnimals.length !== nextAnimals.length) return false;
  for (let i = 0; i < prevAnimals.length; i++) {
    const pa = prevAnimals[i];
    const na = nextAnimals[i];
    if (pa.id !== na.id || pa.isUnlocked !== na.isUnlocked || pa.hasNewDialogue !== na.hasNewDialogue) {
      return false;
    }
  }

  return true;
});

// Static styles defined outside the component to avoid recreation on each render
const moonStyle = { position: 'absolute' as const, top: 15, right: 20, zIndex: 200, alignItems: 'center' as const, justifyContent: 'center' as const, opacity: 0.8 };
const shingleRow2Style = { marginLeft: 10 };

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
    top: -SCREEN_HEIGHT * 0.20,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
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

  // Sun - inside transform container
  sun: {
    position: 'absolute',
    top: 15,
    right: 20,
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunEmoji: {
    fontSize: 50,
    zIndex: 2,
  },
  sunRays: {
    position: 'absolute',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunRay: {
    position: 'absolute',
    width: 3,
    height: 40,
    backgroundColor: '#FFD700',
    opacity: 0.4,
    borderRadius: 2,
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
    marginBottom: 10,
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
