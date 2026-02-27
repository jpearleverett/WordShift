import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  cancelAnimation,
  Easing as REasing,
} from 'react-native-reanimated';
import { Animal, AnimalType, DialoguePhase } from '../../types/homeWorld';
import { ANIMAL_EMOJIS } from '../../services/homeWorldData';
import { CandyColors } from '../../theme/colors';
import { getSettingsSync } from '../../services/settings';

// Character sprite assets - add more as they become available
// Exported so dialogue modals can use talk sprites
export const CHARACTER_SPRITES: Partial<Record<AnimalType, {
  idle: ImageSourcePropType;
  talk?: ImageSourcePropType;
  robed?: ImageSourcePropType;
}>> = {
  fox: {
    idle: require('../../../assets/characters/fox/idle.png'),
    talk: require('../../../assets/characters/fox/talk.png'),
    robed: require('../../../assets/characters/fox/robed.png'),
  },
  pangolin: {
    idle: require('../../../assets/characters/pangolin/idle.png'),
    talk: require('../../../assets/characters/pangolin/talk.png'),
    robed: require('../../../assets/characters/pangolin/robed.png'),
  },
  owl: {
    idle: require('../../../assets/characters/owl/idle.png'),
    talk: require('../../../assets/characters/owl/talk.png'),
    robed: require('../../../assets/characters/owl/robed.png'),
  },
  axolotl: {
    idle: require('../../../assets/characters/axolotl/idle.png'),
    talk: require('../../../assets/characters/axolotl/talk.png'),
    robed: require('../../../assets/characters/axolotl/robed.png'),
  },
  capybara: {
    idle: require('../../../assets/characters/capybara/idle.png'),
    talk: require('../../../assets/characters/capybara/talk.png'),
    robed: require('../../../assets/characters/capybara/robed.png'),
  },
  fennec_fox: {
    idle: require('../../../assets/characters/fennec_fox/idle.png'),
    talk: require('../../../assets/characters/fennec_fox/talk.png'),
    robed: require('../../../assets/characters/fennec_fox/robed.png'),
  },
  red_panda: {
    idle: require('../../../assets/characters/red_panda/idle.png'),
    talk: require('../../../assets/characters/red_panda/talk.png'),
    robed: require('../../../assets/characters/red_panda/robed.png'),
  },
  sloth: {
    idle: require('../../../assets/characters/sloth/idle.png'),
    talk: require('../../../assets/characters/sloth/talk.png'),
    robed: require('../../../assets/characters/sloth/robed.png'),
  },
  wombat: {
    idle: require('../../../assets/characters/wombat/idle.png'),
    talk: require('../../../assets/characters/wombat/talk.png'),
    robed: require('../../../assets/characters/wombat/robed.png'),
  },
  rabbit: {
    idle: require('../../../assets/characters/rabbit/idle.png'),
    talk: require('../../../assets/characters/rabbit/talk.png'),
    robed: require('../../../assets/characters/rabbit/robed.png'),
  },
};

// Emotion bubble emojis based on phase
const EMOTION_BUBBLES: Record<number, string[]> = {
  0: ['💕', '✨', '💖', '🌟', '💫', '🎵', '💛'],
  1: ['💭', '❓', '🤔', '💫', '✨'],
  2: ['💭', '😰', '💧', '❓', '🌫️'],
  3: ['😰', '💧', '👁️', '💀', '🌑'],
  4: ['💀', '👁️', '🌑', '⚫', '😱'],
};

// Z's animation component for sleeping animals — Reanimated
const SleepingZs: React.FC = () => {
  // Each Z uses a single progress value (0→1) for its float-up + fade cycle
  const z1Progress = useSharedValue(0);
  const z2Progress = useSharedValue(0);
  const z3Progress = useSharedValue(0);

  useEffect(() => {
    if (getSettingsSync().reducedMotion) {
      z1Progress.value = 0.15; // static mid-fade
      z2Progress.value = 0.15;
      z3Progress.value = 0.15;
      return;
    }

    const CYCLE_MS = 2000;
    // Each Z loops 0→1 over 2s, staggered by 600ms
    z1Progress.value = 0;
    z1Progress.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: REasing.linear }),
      -1,
    );
    z2Progress.value = 0;
    z2Progress.value = withDelay(600, withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: REasing.linear }),
      -1,
    ));
    z3Progress.value = 0;
    z3Progress.value = withDelay(1200, withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: REasing.linear }),
      -1,
    ));

    return () => {
      cancelAnimation(z1Progress);
      cancelAnimation(z2Progress);
      cancelAnimation(z3Progress);
    };
  }, []);

  const z1Style = useAnimatedStyle(() => {
    const p = z1Progress.value;
    // Ease-out Y drift, quick fade-in then slow fade-out
    const yFactor = 1 - (1 - p) * (1 - p); // ease-out
    return {
      transform: [{ translateY: -25 * yFactor }],
      opacity: p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85,
    };
  });
  const z2Style = useAnimatedStyle(() => {
    const p = z2Progress.value;
    const yFactor = 1 - (1 - p) * (1 - p);
    return {
      transform: [{ translateY: -25 * yFactor }],
      opacity: p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85,
    };
  });
  const z3Style = useAnimatedStyle(() => {
    const p = z3Progress.value;
    const yFactor = 1 - (1 - p) * (1 - p);
    return {
      transform: [{ translateY: -25 * yFactor }],
      opacity: p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85,
    };
  });

  return (
    <View style={sleepStyles.container}>
      <Reanimated.Text style={[sleepStyles.z, sleepStyles.z1, z1Style]}>
        z
      </Reanimated.Text>
      <Reanimated.Text style={[sleepStyles.z, sleepStyles.z2, z2Style]}>
        Z
      </Reanimated.Text>
      <Reanimated.Text style={[sleepStyles.z, sleepStyles.z3, z3Style]}>
        Z
      </Reanimated.Text>
    </View>
  );
};

const sleepStyles = StyleSheet.create({
  container: { position: 'absolute', top: -10, right: -5 },
  z: { position: 'absolute', fontWeight: 'bold', color: CandyColors.purple.main },
  z1: { fontSize: 10, right: 0 },
  z2: { fontSize: 12, right: 8, top: -5 },
  z3: { fontSize: 14, right: 16, top: -12 },
});

interface AnimalSpriteProps {
  animal: Animal;
  roomWidth: number;
  roomHeight: number;
  onPress: (animal: Animal) => void;
  currentPhase: DialoguePhase;
  isOnCooldown?: boolean;
  cooldownPuzzlesLeft?: number;
}

// Animation speeds by animal type (slower = more movement time)
const MOVEMENT_SPEED: Record<AnimalType, number> = {
  red_panda: 3000,
  axolotl: 4000, // Floaty movement
  pangolin: 3500,
  sloth: 8000, // Very slow
  fennec_fox: 2000, // Quick and alert
  fox: 2500,
  owl: 3000,
  capybara: 5000, // Chill, slow
  wombat: 4000,
  rabbit: 1500, // Fast and nervous
};

// Bounce heights by animal type
const BOUNCE_HEIGHT: Record<AnimalType, number> = {
  red_panda: 3,
  axolotl: 2, // Subtle float
  pangolin: 2,
  sloth: 1, // Minimal bounce
  fennec_fox: 5,
  fox: 4,
  owl: 2,
  capybara: 1, // Very subtle
  wombat: 3,
  rabbit: 8, // Big hops
};

export const AnimalSprite: React.FC<AnimalSpriteProps> = React.memo(({
  animal,
  roomWidth,
  roomHeight,
  onPress,
  currentPhase,
  isOnCooldown = false,
  cooldownPuzzlesLeft,
}) => {
  // Ref pattern for onPress to avoid stale closures and keep memo effective
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const posX = useRef(new Animated.Value(animal.position.x)).current;
  const posY = useRef(new Animated.Value(animal.position.y)).current;
  const bounceY = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(1)).current;
  const notificationPulseVal = useSharedValue(1);

  // New juice animations
  const tapScale = useRef(new Animated.Value(1)).current;
  const breatheScale = useRef(new Animated.Value(1)).current;
  const combinedScale = useRef(Animated.multiply(tapScale, breatheScale)).current;
  const emotionOpacity = useRef(new Animated.Value(0)).current;
  const emotionY = useRef(new Animated.Value(0)).current;
  const wiggleRotation = useRef(new Animated.Value(0)).current;

  const currentXRef = useRef(animal.position.x);
  const lastTapTime = useRef(0);

  const [isMoving, setIsMoving] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null);
  const [spriteLoadFailed, setSpriteLoadFailed] = useState(false);

  // Breathing animation (subtle scale pulse)
  useEffect(() => {
    if (getSettingsSync().reducedMotion) {
      breatheScale.setValue(1);
      return;
    }
    const breatheAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheScale, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breatheScale, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    breatheAnimation.start();
    return () => breatheAnimation.stop();
  }, []);

  // Random emotion bubble popup
  useEffect(() => {
    if (isOnCooldown) return; // No emotions while sleeping
    if (getSettingsSync().reducedMotion) return; // Skip decorative animations

    const showEmotion = () => {
      const emojis = EMOTION_BUBBLES[currentPhase] || EMOTION_BUBBLES[0];
      setCurrentEmotion(emojis[Math.floor(Math.random() * emojis.length)]);
      emotionY.setValue(0);
      emotionOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(emotionY, {
          toValue: -30,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(emotionOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(1200),
          Animated.timing(emotionOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    };

    // Show emotion randomly every 8-15 seconds
    const interval = setInterval(() => {
      if (Math.random() > 0.5) showEmotion();
    }, 8000 + Math.random() * 7000);

    return () => clearInterval(interval);
  }, [currentPhase, isOnCooldown]);

  // Tap reaction animation (debounced to prevent cooldown toast flicker)
  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < 500) return;
    lastTapTime.current = now;

    if (!getSettingsSync().reducedMotion) {
      // Squish and bounce
      Animated.sequence([
        Animated.timing(tapScale, {
          toValue: 0.85,
          duration: 80,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(tapScale, {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Wiggle
      Animated.sequence([
        Animated.timing(wiggleRotation, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(wiggleRotation, {
          toValue: -1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(wiggleRotation, {
          toValue: 0.5,
          duration: 75,
          useNativeDriver: true,
        }),
        Animated.timing(wiggleRotation, {
          toValue: 0,
          duration: 75,
          useNativeDriver: true,
        }),
      ]).start();

      // Show a happy emotion on tap
      const emojis = currentPhase >= 3 ? ['😰', '💧'] : ['💕', '✨', '💖'];
      setCurrentEmotion(emojis[Math.floor(Math.random() * emojis.length)]);
      emotionY.setValue(0);
      emotionOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(emotionY, {
          toValue: -35,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(emotionOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(800),
          Animated.timing(emotionOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }

    onPressRef.current(animal);
  }, [animal, currentPhase]);

  const wiggleRotate = wiggleRotation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  // Walking animation - random movement within room bounds
  useEffect(() => {
    if (getSettingsSync().reducedMotion) {
      // Set to a static position, no movement
      posX.setValue(animal.position.x);
      posY.setValue(animal.position.y);
      return;
    }

    let movementTimeout: NodeJS.Timeout;
    let isMounted = true;

    const moveToRandomPosition = () => {
      if (!isMounted) return;

      // Random target position (20-80% of room to stay away from edges)
      const targetX = 20 + Math.random() * 60;
      const targetY = 20 + Math.random() * 60;

      // Determine direction for flip
      const currentX = currentXRef.current;
      const goingRight = targetX > currentX;

      // Update tracked position before animation starts
      currentXRef.current = targetX;

      // Flip direction
      Animated.timing(scaleX, {
        toValue: goingRight ? 1 : -1,
        duration: 150,
        useNativeDriver: true,
      }).start();

      setIsMoving(true);

      // Move to target
      Animated.parallel([
        Animated.timing(posX, {
          toValue: targetX,
          duration: MOVEMENT_SPEED[animal.type],
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: targetY,
          duration: MOVEMENT_SPEED[animal.type],
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMounted) {
          setIsMoving(false);
          // Wait before next movement (3-8 seconds)
          movementTimeout = setTimeout(moveToRandomPosition, 3000 + Math.random() * 5000);
        }
      });
    };

    // Start movement after initial delay
    movementTimeout = setTimeout(moveToRandomPosition, 1000 + Math.random() * 2000);

    return () => {
      isMounted = false;
      clearTimeout(movementTimeout);
    };
  }, [animal.type]);

  // Bounce animation while moving
  useEffect(() => {
    if (getSettingsSync().reducedMotion) {
      bounceY.setValue(0);
      return;
    }

    let bounceAnimation: Animated.CompositeAnimation;

    if (isMoving) {
      bounceAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceY, {
            toValue: -BOUNCE_HEIGHT[animal.type],
            duration: animal.type === 'rabbit' ? 150 : 250,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceY, {
            toValue: 0,
            duration: animal.type === 'rabbit' ? 150 : 250,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      bounceAnimation.start();
    } else {
      // Smooth landing instead of instant snap to prevent teleporting
      Animated.timing(bounceY, {
        toValue: 0,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }

    return () => {
      bounceAnimation?.stop();
    };
  }, [isMoving, animal.type]);

  // Notification pulse for new dialogue — Reanimated
  useEffect(() => {
    if (getSettingsSync().reducedMotion) {
      notificationPulseVal.value = 1;
      return;
    }
    if (animal.hasNewDialogue) {
      notificationPulseVal.value = 1;
      notificationPulseVal.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600, easing: REasing.inOut(REasing.ease) }),
          withTiming(1, { duration: 600, easing: REasing.inOut(REasing.ease) }),
        ),
        -1,
      );
    } else {
      notificationPulseVal.value = 1;
    }

    return () => cancelAnimation(notificationPulseVal);
  }, [animal.hasNewDialogue]);

  const notificationPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: notificationPulseVal.value }],
  }));

  // Get mood indicator color based on phase
  const getMoodColor = () => {
    switch (currentPhase) {
      case 0: return CandyColors.green.main;
      case 1: return CandyColors.yellow.main;
      case 2: return CandyColors.orange.main;
      case 3: return CandyColors.red.light;
      case 4: return CandyColors.purple.dark;
      default: return CandyColors.green.main;
    }
  };

  // Position sprite within room bounds (keep near bottom half for floor walking)
  const translateX = posX.interpolate({
    inputRange: [0, 100],
    outputRange: [10, roomWidth - 100],
  });

  const translateY = posY.interpolate({
    inputRange: [0, 100],
    outputRange: [roomHeight * 0.3, roomHeight - 95],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX },
            { translateY },
            { translateY: bounceY },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={styles.touchable}
        accessibilityLabel={`${animal.name} the ${animal.type}`}
        accessibilityRole="button"
      >
        <Animated.View
          style={[
            styles.spriteContainer,
            {
              transform: [
                { scaleX },
                { scale: combinedScale },
                { rotate: wiggleRotate },
              ],
            },
          ]}
        >
          {/* Shadow - scales with tap */}
          <Animated.View
            style={[
              styles.shadow,
              { transform: [{ scaleX: tapScale }] },
            ]}
          />

          {/* Animal body */}
          {CHARACTER_SPRITES[animal.type] && !spriteLoadFailed ? (
            <Image
              source={
                currentPhase >= 4 && CHARACTER_SPRITES[animal.type]?.robed
                  ? CHARACTER_SPRITES[animal.type]!.robed!
                  : CHARACTER_SPRITES[animal.type]!.idle
              }
              style={styles.spriteImage}
              resizeMode="contain"
              onError={() => setSpriteLoadFailed(true)}
            />
          ) : (
            <View style={[styles.emojiBody, { borderColor: getMoodColor() }]}>
              <Text style={styles.emoji}>{ANIMAL_EMOJIS[animal.type]}</Text>
            </View>
          )}

          {/* Emotion bubble */}
          {Boolean(currentEmotion) && (
            <Animated.View
              style={[
                styles.emotionBubble,
                {
                  transform: [{ translateY: emotionY }],
                  opacity: emotionOpacity,
                },
              ]}
            >
              <Text style={styles.emotionEmoji}>{currentEmotion}</Text>
            </Animated.View>
          )}

          {/* Sleeping Z's when on cooldown */}
          {isOnCooldown && <SleepingZs />}

          {/* New dialogue indicator - hidden when on cooldown */}
          {animal.hasNewDialogue && !isOnCooldown && (
            <Reanimated.View
              style={[
                styles.notificationBadge,
                notificationPulseStyle,
              ]}
            >
              <Text style={styles.notificationText}>!</Text>
            </Reanimated.View>
          )}

          {/* Name tag with phase-based mood indicator */}
          <View style={[
            styles.nameTag,
            currentPhase >= 3 && styles.nameTagDark,
          ]}>
            <View style={[styles.moodDot, { backgroundColor: getMoodColor() }]} />
            <Text style={[
              styles.nameText,
              currentPhase >= 3 && styles.nameTextDark,
            ]}>
              {animal.name}
            </Text>
            {isOnCooldown && (
              <Text style={styles.cooldownIndicator}>💤</Text>
            )}
          </View>

          {/* Cooldown puzzles remaining indicator */}
          {isOnCooldown && cooldownPuzzlesLeft != null && cooldownPuzzlesLeft > 0 && (
            <View style={[
              styles.cooldownCountBadge,
              currentPhase >= 3 && styles.cooldownCountBadgeDark,
            ]}>
              <Text style={[
                styles.cooldownCountText,
                currentPhase >= 3 && styles.cooldownCountTextDark,
              ]}>
                {cooldownPuzzlesLeft === 1 ? '1 puzzle' : `${cooldownPuzzlesLeft} puzzles`}
              </Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 10,
  },
  touchable: {
    padding: 5,
  },
  spriteContainer: {
    alignItems: 'center',
  },
  shadow: {
    position: 'absolute',
    bottom: 0,
    width: 60,
    height: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  emojiBody: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: CandyColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  emoji: {
    fontSize: 38,
  },
  spriteImage: {
    width: 90,
    height: 90,
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: CandyColors.red.main,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: CandyColors.white,
    shadowColor: CandyColors.red.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  notificationText: {
    color: CandyColors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  nameTag: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  nameText: {
    color: CandyColors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  moodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cooldownIndicator: {
    fontSize: 8,
    marginLeft: 2,
  },
  nameTagDark: {
    backgroundColor: CandyColors.purple.dark,
  },
  nameTextDark: {
    color: CandyColors.gray[300],
  },
  cooldownCountBadge: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 6,
  },
  cooldownCountBadgeDark: {
    backgroundColor: 'rgba(60, 30, 80, 0.7)',
  },
  cooldownCountText: {
    color: CandyColors.gray[300],
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  cooldownCountTextDark: {
    color: CandyColors.gray[400],
  },
  emotionBubble: {
    position: 'absolute',
    top: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionEmoji: {
    fontSize: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default AnimalSprite;
