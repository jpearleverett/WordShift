import React, { useRef, useEffect, useState, useMemo } from 'react';
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
  PinchGestureHandler,
  PanGestureHandler,
  State,
  PinchGestureHandlerGestureEvent,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { Room, Animal, DialoguePhase } from '../../types/homeWorld';
import { RoomView } from './RoomView';
import { CandyColors } from '../../theme/colors';
import { isOnCooldown } from '../../services/dialogueSession';

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
};

const FloatingParticle: React.FC<{ particle: Particle }> = ({ particle }) => {
  useEffect(() => {
    const startX = Math.random() * SCREEN_WIDTH;
    const endX = startX + (Math.random() - 0.5) * 100;

    particle.x.setValue(startX);
    particle.y.setValue(SCREEN_HEIGHT + 20);
    particle.opacity.setValue(0);
    particle.scale.setValue(0.3 + Math.random() * 0.5);

    Animated.parallel([
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
    ]).start();
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
  const animationRef = useRef<Animated.CompositeAnimation>();

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const flapAnimRef = useRef<Animated.CompositeAnimation>();
  const moveAnimRef = useRef<Animated.CompositeAnimation>();

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const animationRef = useRef<Animated.CompositeAnimation>();

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
  1: '#6fb7df',
  2: '#514378',
  3: '#060612',
  4: '#1a122a',
};

// House dimensions (single-column layout)
// Room PNGs are 1456x720 (approx 2:1 aspect ratio)
const ROOM_WIDTH = 250;
const ROOM_HEIGHT = ROOM_WIDTH * 0.493865; // Maintains ~2:1 aspect ratio of room PNGs (1456x720)
const ROOM_GAP = 6;
const HOUSE_PADDING = 16;
const HOUSE_WIDTH = ROOM_WIDTH + (HOUSE_PADDING * 2);

// Zoom constraints
const MIN_SCALE = 0.75;
const MAX_SCALE = 2.0;

interface HouseWorldProps {
  rooms: Room[];
  animals: Animal[];
  currentPhase: DialoguePhase;
  onAnimalPress: (animal: Animal) => void;
  onRoomPress: (room: Room) => void;
}

export const HouseWorld: React.FC<HouseWorldProps> = ({
  rooms,
  animals,
  currentPhase,
  onAnimalPress,
  onRoomPress,
}) => {
  // Animated values
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Refs for gesture tracking
  const pinchRef = useRef<PinchGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);

  // State tracking for gestures
  const baseScale = useRef(1);
  const lastScale = useRef(1);
  const baseTranslateY = useRef(0);

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

  // Sun animation
  const sunPulse = useRef(new Animated.Value(1)).current;
  const sunRotation = useRef(new Animated.Value(0)).current;

  // Cloud animations
  const cloud1X = useRef(new Animated.Value(-100)).current;
  const cloud2X = useRef(new Animated.Value(SCREEN_WIDTH + 50)).current;
  const cloud3X = useRef(new Animated.Value(SCREEN_WIDTH / 2)).current;

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

  // Cloud animations
  const cloudMountedRef = useRef(true);
  const cloudAnimRefs = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    cloudMountedRef.current = true;
    cloudAnimRefs.current = [];

    const animateCloud = (cloudAnim: Animated.Value, startX: number, duration: number) => {
      const animate = () => {
        if (!cloudMountedRef.current) return;
        cloudAnim.setValue(startX > SCREEN_WIDTH / 2 ? SCREEN_WIDTH + 100 : -150);
        const anim = Animated.timing(cloudAnim, {
          toValue: startX > SCREEN_WIDTH / 2 ? -150 : SCREEN_WIDTH + 100,
          duration,
          useNativeDriver: true,
        });
        cloudAnimRefs.current.push(anim);
        anim.start(() => {
          if (cloudMountedRef.current) animate();
        });
      };
      animate();
    };

    animateCloud(cloud1X, -100, 45000);
    animateCloud(cloud2X, SCREEN_WIDTH + 50, 38000);
    animateCloud(cloud3X, SCREEN_WIDTH / 2, 52000);

    return () => {
      cloudMountedRef.current = false;
      cloudAnimRefs.current.forEach(anim => anim.stop());
      cloudAnimRefs.current = [];
    };
  }, []);

  const sunRotate = sunRotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  // Get only unlocked rooms, sorted by floor
  const unlockedRooms = rooms
    .filter(room => room.isUnlocked)
    .sort((a, b) => a.floor - b.floor);

  const getAnimalForRoom = (roomId: string): Animal | null => {
    return animals.find(a => a.roomId === roomId) || null;
  };

  // Single-column layout: each room is its own row, sorted by row index descending (top to bottom)
  const sortedRooms = [...unlockedRooms].sort((a, b) => b.layoutPosition.row - a.layoutPosition.row);
  const numRows = Math.max(1, unlockedRooms.length);

  const calculateHouseHeight = (): number => {
    return numRows * ROOM_HEIGHT +
           Math.max(0, numRows - 1) * ROOM_GAP +
           HOUSE_PADDING * 2;
  };

  // Pinch gesture handler
  const onPinchGestureEvent = (event: PinchGestureHandlerGestureEvent) => {
    const { scale: gestureScale } = event.nativeEvent;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, baseScale.current * gestureScale));
    scale.setValue(newScale);
  };

  const onPinchHandlerStateChange = (event: PinchGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === State.END) {
      const currentScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, baseScale.current * event.nativeEvent.scale));
      baseScale.current = currentScale;
      lastScale.current = currentScale;

      // Smooth snap if too zoomed out
      if (currentScale < 0.8) {
        Animated.spring(scale, {
          toValue: 0.8,
          friction: 5,
          useNativeDriver: true,
        }).start(() => {
          baseScale.current = 0.8;
          lastScale.current = 0.8;
        });
      }
    }
  };

  // Pan gesture handler - vertical only to prevent horizontal gaps
  const onPanGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationY } = event.nativeEvent;

    const maxTranslateY = 150 * lastScale.current;
    const newY = Math.max(-maxTranslateY, Math.min(maxTranslateY, baseTranslateY.current + translationY));

    translateY.setValue(newY);
  };

  const onPanHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY } = event.nativeEvent;
      const maxTranslateY = 150 * lastScale.current;

      baseTranslateY.current = Math.max(-maxTranslateY, Math.min(maxTranslateY, baseTranslateY.current + translationY));
    }
  };

  const houseHeight = calculateHouseHeight();

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: PHASE_BG_COLORS[currentPhase] || '#6fb7df' }]}>
      {/* Floating particles */}
      {particles.map(particle => (
        <FloatingParticle key={particle.id} particle={particle} />
      ))}

      {/* Gesture handlers with simultaneous recognition */}
      <PanGestureHandler
        ref={panRef}
        simultaneousHandlers={pinchRef}
        onGestureEvent={onPanGestureEvent}
        onHandlerStateChange={onPanHandlerStateChange}
        minDist={10}
        avgTouches
      >
        <Animated.View style={styles.gestureContainer}>
          <PinchGestureHandler
            ref={pinchRef}
            simultaneousHandlers={panRef}
            onGestureEvent={onPinchGestureEvent}
            onHandlerStateChange={onPinchHandlerStateChange}
          >
            <Animated.View
              style={[
                styles.transformContainer,
                {
                  transform: [
                    { translateY },
                    { scale },
                  ],
                },
              ]}
            >
              {/* Sky background - inside transform so it moves with the scene.
                  Oversized to prevent gaps at any zoom/pan combination.
                  Width: 2x screen covers horizontal at min zoom (no horizontal pan).
                  Height: 3x screen covers vertical pan range at all zoom levels. */}
              <Image
                source={
                  currentPhase >= 4 ? SKY_SHADOW :
                  currentPhase >= 3 ? SKY_STORM :
                  currentPhase >= 2 ? SKY_DUSK :
                  SKY_DAY
                }
                style={styles.skyBackground}
                resizeMode="cover"
              />

              {/* Animated clouds - inside transform so they move with the scene */}
              <Animated.View style={[styles.cloud, { top: 20, transform: [{ translateX: cloud1X }] }]} pointerEvents="none">
                <Text style={[styles.cloudEmoji, currentPhase >= 3 && { opacity: 0.6 }]}>☁️</Text>
              </Animated.View>
              <Animated.View style={[styles.cloud, { top: 70, transform: [{ translateX: cloud2X }] }]} pointerEvents="none">
                <Text style={[styles.cloudEmoji, currentPhase >= 3 && { opacity: 0.6 }]}>☁️</Text>
                <Text style={[styles.cloudEmoji, { marginLeft: 25 }, currentPhase >= 3 && { opacity: 0.6 }]}>☁️</Text>
              </Animated.View>
              <Animated.View style={[styles.cloud, { top: 45, transform: [{ translateX: cloud3X }] }]} pointerEvents="none">
                <Text style={[styles.cloudEmoji, { fontSize: 38 }, currentPhase >= 3 && { opacity: 0.6 }]}>☁️</Text>
              </Animated.View>

              {/* Sun with animated rays - hidden at phase 4 */}
              {currentPhase < 4 && (
                <Animated.View
                  style={[
                    styles.sun,
                    {
                      transform: [
                        { scale: sunPulse },
                        { rotate: sunRotate },
                      ],
                      opacity: currentPhase >= 3 ? 0.4 : 1,
                    }
                  ]}
                  pointerEvents="none"
                >
                  <View style={styles.sunRays}>
                    {[...Array(8)].map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.sunRay,
                          { transform: [{ rotate: `${i * 45}deg` }] }
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.sunEmoji}>{currentPhase >= 3 ? '🌙' : '☀️'}</Text>
                </Animated.View>
              )}

              {/* Moon for phase 4 */}
              {currentPhase >= 4 && (
                <View style={[styles.sun, { opacity: 0.8 }]} pointerEvents="none">
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
                  {sortedRooms.map(room => {
                    const roomAnimal = getAnimalForRoom(room.id);
                    return (
                      <View key={room.id} style={styles.roomRow}>
                        <RoomView
                          room={room}
                          animal={roomAnimal}
                          width={ROOM_WIDTH}
                          height={ROOM_HEIGHT}
                          onAnimalPress={onAnimalPress}
                          onRoomPress={onRoomPress}
                          currentPhase={currentPhase}
                          isAnimalOnCooldown={roomAnimal ? isOnCooldown(roomAnimal.id) : false}
                        />
                      </View>
                    );
                  })}

                  {unlockedRooms.length === 0 && (
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
          </PinchGestureHandler>
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

  // Sky background - moves with scene, oversized to prevent gaps.
  // At MIN_SCALE (0.6) the visible area is ~1.67x screen in each dimension.
  // Vertical pan adds up to ±150px in content coords. 3x height covers all cases.
  skyBackground: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.2,
    left: -SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 1.4,
    height: SCREEN_HEIGHT * 1.4,
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
    marginBottom: -150,
    marginTop: 50,
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
