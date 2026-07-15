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
import { Animal, AnimalType, DialoguePhase } from '../../types/homeWorld';
import { ANIMAL_EMOJIS } from '../../services/homeWorldData';
import { CandyColors } from '../../theme/colors';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';

/** Milliseconds per walk-cycle frame (matches the source video's cadence:
 * a 30-frame gait at 24fps sampled every 3rd frame). */
const WALK_FRAME_MS = 125;

// The walk-cycle art (upright, mid-stride) reads a touch leaner than the fuller
// idle pose, so the walking fox looks a little smaller even though its rendered
// bounding box actually matches idle. Nudge the walk layers up a hair to match
// the idle silhouette, anchored at the feet so the fox never lifts off the
// floor: every walk frame plants its baseline at ~81% of the 90px sprite box
// (measured constant across all 10 frames), i.e. ~28px below the box center, so
// scaling around the center pushes the feet down by 28*(scale-1) — cancel that
// with an equal upward translate.
const WALK_SPRITE_BOX = 90;
const WALK_MATCH_SCALE = 1.1;
const WALK_FEET_FROM_CENTER = WALK_SPRITE_BOX * (0.81 - 0.5); // ~28px
const WALK_FEET_CORRECTION = -WALK_FEET_FROM_CENTER * (WALK_MATCH_SCALE - 1);

// Character sprite assets - add more as they become available
// Exported so dialogue modals can use talk sprites
export const CHARACTER_SPRITES: Partial<Record<AnimalType, {
  idle: ImageSourcePropType;
  talk?: ImageSourcePropType;
  robed?: ImageSourcePropType;
  /**
   * Optional walk cycle, played while the animal wanders its room (frames
   * face RIGHT like idle.png; the container's scaleX flip handles leftward
   * walks). Frames were extracted from source video (assets/raw/*_walk_
   * source.mp4) at WALK_FRAME_MS spacing — one full gait cycle.
   */
  walk?: ImageSourcePropType[];
}>> = {
  fox: {
    idle: require('../../../assets/characters/fox/idle.png'),
    talk: require('../../../assets/characters/fox/talk.png'),
    robed: require('../../../assets/characters/fox/robed.png'),
    walk: [
      require('../../../assets/characters/fox/walk_0.png'),
      require('../../../assets/characters/fox/walk_1.png'),
      require('../../../assets/characters/fox/walk_2.png'),
      require('../../../assets/characters/fox/walk_3.png'),
      require('../../../assets/characters/fox/walk_4.png'),
      require('../../../assets/characters/fox/walk_5.png'),
      require('../../../assets/characters/fox/walk_6.png'),
      require('../../../assets/characters/fox/walk_7.png'),
      require('../../../assets/characters/fox/walk_8.png'),
      require('../../../assets/characters/fox/walk_9.png'),
    ],
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
  tarsier: {
    idle: require('../../../assets/characters/tarsier/idle.png'),
    talk: require('../../../assets/characters/tarsier/talk.png'),
    robed: require('../../../assets/characters/tarsier/robed.png'),
  },
  aye_aye: {
    idle: require('../../../assets/characters/aye_aye/idle.png'),
    talk: require('../../../assets/characters/aye_aye/talk.png'),
    robed: require('../../../assets/characters/aye_aye/robed.png'),
  },
  kakapo: {
    idle: require('../../../assets/characters/kakapo/idle.png'),
    talk: require('../../../assets/characters/kakapo/talk.png'),
    robed: require('../../../assets/characters/kakapo/robed.png'),
  },
};

// Emotion bubble emojis based on phase
const EMOTION_BUBBLES: Record<number, string[]> = {
  0: ['💕', '✨', '💖', '🌟', '💫', '🎵', '💛'],
  1: ['💭', '❓', '🤔', '💫', '✨'],
  2: ['💭', '😰', '💧', '❓', '🌫️'],
  3: ['😰', '💧', '👁️', '💀', '🌑'],
  4: ['💀', '👁️', '🌑', '⚫', '😱'],
  // Phase 5: terrible peace — serene resignation, not cheerful, not dreadful.
  5: ['🕯️', '🌑', '…', '🤍', '🌫️'],
};

// Ghostly mauve mood color for Phase 5 (matches getPhaseTheme phase 5 / colors.ts)
const PHASE5_MOOD_COLOR = '#7B6B8A';

// Z's animation component for sleeping animals
const SleepingZs: React.FC = () => {
  const z1Y = useRef(new Animated.Value(0)).current;
  const z2Y = useRef(new Animated.Value(0)).current;
  const z3Y = useRef(new Animated.Value(0)).current;
  const z1Opacity = useRef(new Animated.Value(0)).current;
  const z2Opacity = useRef(new Animated.Value(0)).current;
  const z3Opacity = useRef(new Animated.Value(0)).current;

  const animRef1 = useRef<Animated.CompositeAnimation | null>(null);
  const animRef2 = useRef<Animated.CompositeAnimation | null>(null);
  const animRef3 = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (getSettingsSync().reducedMotion) {
      z1Opacity.setValue(1);
      z2Opacity.setValue(1);
      z3Opacity.setValue(1);
      return;
    }

    const animateZ = (
      y: Animated.Value,
      opacity: Animated.Value,
      delay: number,
      animRef: React.MutableRefObject<Animated.CompositeAnimation | null>,
    ) => {
      const animate = () => {
        y.setValue(0);
        opacity.setValue(0);
        const anim = Animated.parallel([
          Animated.timing(y, {
            toValue: -25,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
            delay,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
              delay,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1700,
              useNativeDriver: true,
            }),
          ]),
        ]);
        animRef.current = anim;
        anim.start(() => animate());
      };
      animate();
    };

    animateZ(z1Y, z1Opacity, 0, animRef1);
    animateZ(z2Y, z2Opacity, 600, animRef2);
    animateZ(z3Y, z3Opacity, 1200, animRef3);

    return () => {
      animRef1.current?.stop();
      animRef2.current?.stop();
      animRef3.current?.stop();
    };
  }, []);

  return (
    <View style={sleepStyles.container}>
      <Animated.Text style={[sleepStyles.z, sleepStyles.z1, { transform: [{ translateY: z1Y }], opacity: z1Opacity }]}>
        z
      </Animated.Text>
      <Animated.Text style={[sleepStyles.z, sleepStyles.z2, { transform: [{ translateY: z2Y }], opacity: z2Opacity }]}>
        Z
      </Animated.Text>
      <Animated.Text style={[sleepStyles.z, sleepStyles.z3, { transform: [{ translateY: z3Y }], opacity: z3Opacity }]}>
        Z
      </Animated.Text>
    </View>
  );
};

const sleepStyles = StyleSheet.create({
  container: { position: 'absolute', top: -10, right: -5 },
  z: { fontFamily: PIXEL_FONT_BOLD, position: 'absolute', fontWeight: 'bold', color: CandyColors.purple.main },
  z1: { fontFamily: PIXEL_FONT_BOLD, fontSize: 10, right: 0 },
  z2: { fontFamily: PIXEL_FONT_BOLD, fontSize: 12, right: 8, top: -5 },
  z3: { fontFamily: PIXEL_FONT_BOLD, fontSize: 14, right: 16, top: -12 },
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
  tarsier: 1800, // Quick, darting leaps
  aye_aye: 3500, // Deliberate, tapping gait
  kakapo: 4500, // Heavy, unhurried waddle
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
  tarsier: 7, // Springy little leaps
  aye_aye: 3,
  kakapo: 2, // Grounded shuffle
};

// ---------------------------------------------------------------------------
// Procedural gait (the 12 animals without real walk frames).
// Without frames a wandering animal used to glide side-to-side as a static
// sprite with a flat bounce ("fridge magnets"). While wandering, these animals
// now play a transform-only gait bundle: a synced vertical bob, a slight
// alternating lean, and a subtle squash-stretch on the footfall beat — all
// native-driver, derived from each species' existing movement speed. The fox
// keeps its real frames; robed Phase-4+ figures keep the gliding reverence;
// reduced motion / low-tier devices keep the current static behavior.
// ---------------------------------------------------------------------------

/** Full two-step gait cycle duration (ms), derived from the wander speed so
 * quick species (rabbit, fennec) patter and slow ones (sloth, kakapo) trudge. */
export const getGaitPeriodMs = (type: AnimalType): number =>
  Math.max(300, Math.min(1400, (MOVEMENT_SPEED[type] ?? 3000) * 0.22));

/** Vertical bob amplitude (px): subtle 2-3px, scaled off the species bounce. */
export const getGaitBobPx = (type: AnimalType): number =>
  Math.max(2, Math.min(3, (BOUNCE_HEIGHT[type] ?? 3) * 0.5));

/** Alternating lean, degrees (±). */
export const GAIT_LEAN_DEG = 2.5;

// Per-animal vertical nudge (px, +down) to plant feet on the floor. The sprite
// art isn't uniformly bottom-aligned in its frame — some characters are drawn
// higher, so with the same room placement they read as floating. These offsets
// push those few down so everyone walks on the floor. 0 = already grounded.
// Tuned from player feedback: pangolin/owl previously sat 3px too low (feet
// stepped just past the room's bottom edge), so their offsets were eased back.
const FLOOR_OFFSET: Record<AnimalType, number> = {
  // Bamboo's art carries 24% bottom padding in its frame — identical to the
  // owl's (measured lowest-opaque-row), so he takes the owl's tuned offset.
  red_panda: 15,
  axolotl: 0, // lives in the tank — placement handled by the water, leave as-is
  pangolin: 11,
  sloth: 0,
  fennec_fox: 0,
  fox: 0,
  owl: 15,
  capybara: 0,
  wombat: 0,
  rabbit: 0,
  // Measured from the landed art (lowest-opaque-row): tarsier carries 21%
  // bottom padding (between fox's 18% -> 0 and owl's 24% -> 15); the other
  // two sit at 13%/11%, well inside the grounded range.
  tarsier: 8,
  aye_aye: 0,
  kakapo: 0,
};

/**
 * Progressive "dread" treatment for the idle sprite across Phases 1-3 — the
 * stretch where the dialogue has already curdled but there is no distinct
 * mid-state art (sprites are binary: idle through Phase 3, robed at Phase 4+).
 * Layering a low-opacity tinted copy of the SAME sprite on top cools and
 * desaturates only the animal shape (Image `tintColor` respects the alpha mask,
 * so the transparent bounding box is untouched) while the underlying full-colour
 * detail still reads through. The wash deepens phase by phase so the *animals*
 * visibly turn before Phase 4 names the cult — restoring "show before tell" on
 * the most important narrative object. Phase 0 = none; Phase 4+ = robed art.
 */
function getSpriteDreadTint(phase: number): { color: string; opacity: number } | null {
  if (phase >= 4) return null; // robed sprite already carries the reveal
  // Phase 3 stacks with the room's night scrim (PHASE_HOUSE_TINT room 0.22 in
  // HouseWorld), so this wash must stay light or the animals read as
  // silhouettes: a cold violet at low opacity keeps the dread hue-shift while
  // the sprite detail survives the combined darkening.
  if (phase === 3) return { color: '#2B2450', opacity: 0.20 };
  if (phase === 2) return { color: '#2A2F58', opacity: 0.24 }; // cool desaturation creeps in
  if (phase === 1) return { color: '#3A4378', opacity: 0.12 }; // faint cool wash, barely there
  return null;
}

export const AnimalSprite: React.FC<AnimalSpriteProps> = ({
  animal,
  roomWidth,
  roomHeight,
  onPress,
  currentPhase,
  isOnCooldown = false,
  cooldownPuzzlesLeft,
}) => {
  const posX = useRef(new Animated.Value(animal.position.x)).current;
  const posY = useRef(new Animated.Value(animal.position.y)).current;
  const bounceY = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(1)).current;
  const notificationPulse = useRef(new Animated.Value(1)).current;

  // New juice animations
  const tapScale = useRef(new Animated.Value(1)).current;
  const breatheScale = useRef(new Animated.Value(1)).current;
  const emotionOpacity = useRef(new Animated.Value(0)).current;
  const emotionY = useRef(new Animated.Value(0)).current;
  const wiggleRotation = useRef(new Animated.Value(0)).current;

  const currentXRef = useRef(animal.position.x);

  const [isMoving, setIsMoving] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null);
  const [spriteLoadFailed, setSpriteLoadFailed] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);

  // Real walk-cycle frames play while the animal wanders (currently the fox).
  // Robed figures (Phase 4+) don't stroll — they keep the gliding reverence —
  // and reduced motion / low-tier devices keep the static sprite.
  const walkFrames = CHARACTER_SPRITES[animal.type]?.walk;
  const hasWalkFrames = Boolean(walkFrames && walkFrames.length > 0);
  const walkActive = Boolean(
    isMoving &&
    hasWalkFrames &&
    currentPhase < 4 &&
    !spriteLoadFailed &&
    !getSettingsSync().reducedMotion &&
    !shouldSimplifyAnimations()
  );

  // Procedural gait for the animals WITHOUT real walk frames: bob + lean +
  // footfall squash-stretch while wandering. Same gates as the walk cycle —
  // robed figures glide, reduced motion / low tier stay static.
  const gaitAnim = useRef(new Animated.Value(0)).current;
  const gaitActive = Boolean(
    isMoving &&
    !hasWalkFrames &&
    currentPhase < 4 &&
    !getSettingsSync().reducedMotion &&
    !shouldSimplifyAnimations()
  );

  useEffect(() => {
    if (!gaitActive) {
      gaitAnim.setValue(0); // 0 = neutral pose (no lean, no bob, scale 1)
      return;
    }
    gaitAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(gaitAnim, {
        toValue: 1,
        duration: getGaitPeriodMs(animal.type),
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => {
      loop.stop();
      gaitAnim.setValue(0);
    };
  }, [gaitActive, animal.type, gaitAnim]);

  // One cycle = two steps: footfalls at 0 / 0.5 / 1, lifts at 0.25 / 0.75.
  const gaitBobPx = getGaitBobPx(animal.type);
  const gaitBob = gaitAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -gaitBobPx, 0, -gaitBobPx, 0],
  });
  const gaitLean = gaitAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0deg', `${GAIT_LEAN_DEG}deg`, '0deg', `-${GAIT_LEAN_DEG}deg`, '0deg'],
  });
  const gaitScaleY = gaitAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 1.03, 0.97, 1.03, 1],
  });

  // Cycle gait frames while walking; reset to the first frame on stop so the
  // next stroll always starts at the cycle's beginning.
  useEffect(() => {
    if (!walkActive) {
      setWalkFrame(0);
      return;
    }
    const interval = setInterval(() => {
      setWalkFrame(prev => (prev + 1) % (walkFrames?.length ?? 1));
    }, WALK_FRAME_MS);
    return () => clearInterval(interval);
  }, [walkActive, walkFrames?.length]);

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

  // Tap reaction animation
  const handlePress = useCallback(() => {
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

      // Show a tap emotion appropriate to the phase
      const emojis =
        currentPhase >= 5
          ? ['🕯️', '🤍', '…']        // serene resignation
          : currentPhase >= 3
            ? ['😰', '💧']             // dread
            : ['💕', '✨', '💖'];      // candy-cute joy
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

    onPress(animal);
  }, [animal, onPress, currentPhase]);

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

  // Bounce animation while moving. Suppressed when real walk frames play OR
  // the procedural gait runs — either already carries the vertical bob, and
  // stacking the glide-bounce on top reads as skipping.
  useEffect(() => {
    if (getSettingsSync().reducedMotion || walkActive || gaitActive) {
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
      bounceY.setValue(0);
    }

    return () => {
      bounceAnimation?.stop();
    };
  }, [isMoving, animal.type, walkActive, gaitActive]);

  // Notification pulse for new dialogue
  useEffect(() => {
    if (getSettingsSync().reducedMotion) {
      notificationPulse.setValue(1);
      return;
    }
    if (animal.hasNewDialogue) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(notificationPulse, {
            toValue: 1.3,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(notificationPulse, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    }
  }, [animal.hasNewDialogue]);

  // Get mood indicator color based on phase
  const getMoodColor = () => {
    switch (currentPhase) {
      case 0: return CandyColors.green.main;
      case 1: return CandyColors.yellow.main;
      case 2: return CandyColors.orange.main;
      case 3: return CandyColors.red.light;
      case 4: return CandyColors.purple.dark;
      case 5: return PHASE5_MOOD_COLOR; // ghostly mauve — terrible peace
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

  // Per-animal nudge so feet land on the floor (some sprite art sits high in frame).
  const floorOffset = FLOOR_OFFSET[animal.type] ?? 0;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX },
            { translateY },
            { translateY: floorOffset },
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
                { scale: Animated.multiply(tapScale, breatheScale) },
                { rotate: wiggleRotate },
                // Procedural gait bundle (neutral at rest: 0 / 0deg / 1).
                { translateY: gaitBob },
                { rotate: gaitLean },
                { scaleY: gaitScaleY },
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
            (() => {
              const sprites = CHARACTER_SPRITES[animal.type]!;
              const staticSource =
                currentPhase >= 4 && sprites.robed ? sprites.robed : sprites.idle;
              const dreadTint = getSpriteDreadTint(currentPhase);
              // Walk frames stay MOUNTED (opacity-switched) whenever they
              // could play — swapping one Image's `source` mid-gait forces an
              // async decode per frame the first time through the cycle,
              // which reads as flicker. Mounting decodes everything up front.
              // Skipped when the walk can never run (robed phases, reduced
              // motion, low-tier devices) so those paths pay no decode cost.
              const mountWalkStack = Boolean(
                walkFrames &&
                walkFrames.length > 0 &&
                currentPhase < 4 &&
                !getSettingsSync().reducedMotion &&
                !shouldSimplifyAnimations()
              );
              // Phases 1-3 layer a tinted copy on top of each layer (tintColor
              // honours the sprite's alpha, so only the animal shape cools).
              const renderTint = (source: ImageSourcePropType) =>
                dreadTint ? (
                  <Image
                    source={source}
                    style={[
                      styles.spriteLayer,
                      { tintColor: dreadTint.color, opacity: dreadTint.opacity },
                    ]}
                    resizeMode="contain"
                    importantForAccessibility="no"
                    accessibilityElementsHidden
                  />
                ) : null;
              return (
                <View style={styles.spriteImage}>
                  {/* Idle/robed base — hidden (not unmounted) while walking */}
                  <View style={[styles.spriteLayer, { opacity: walkActive ? 0 : 1 }]}>
                    <Image
                      source={staticSource}
                      style={styles.spriteFill}
                      resizeMode="contain"
                      onError={() => setSpriteLoadFailed(true)}
                    />
                    {renderTint(staticSource)}
                  </View>
                  {mountWalkStack && walkFrames!.map((frameSource, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.spriteLayer,
                        // Scale the walk art up a hair to match the idle
                        // silhouette, kept feet-planted (see WALK_MATCH_SCALE).
                        { transform: [{ translateY: WALK_FEET_CORRECTION }, { scale: WALK_MATCH_SCALE }] },
                        { opacity: walkActive && idx === walkFrame % walkFrames!.length ? 1 : 0 },
                      ]}
                    >
                      <Image source={frameSource} style={styles.spriteFill} resizeMode="contain" />
                      {renderTint(frameSource)}
                    </View>
                  ))}
                </View>
              );
            })()
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
            <Animated.View
              style={[
                styles.notificationBadge,
                { transform: [{ scale: notificationPulse }] },
              ]}
            >
              <Text style={styles.notificationText}>!</Text>
            </Animated.View>
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
};

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
    fontFamily: BODY_FONT,
    fontSize: 38,
  },
  spriteImage: {
    width: 90,
    height: 90,
  },
  // Stacked sprite layers: absolute + EXPLICIT '100%' size (never inset-only —
  // on Fabric an Image sized only by insets collapses to its intrinsic size).
  spriteLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  spriteFill: {
    width: '100%',
    height: '100%',
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
    fontFamily: PIXEL_FONT_BOLD,
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
    fontFamily: PIXEL_FONT_BOLD,
    color: CandyColors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  moodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cooldownIndicator: {
    fontFamily: BODY_FONT,
    fontSize: 10,
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
    fontFamily: PIXEL_FONT_BOLD,
    color: CandyColors.gray[300],
    fontSize: 10,
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
    fontFamily: BODY_FONT,
    fontSize: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default AnimalSprite;
