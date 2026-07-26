import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FONT_SIZE } from '../../theme/typeScale';
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

// ---------------------------------------------------------------------------
// Gait/travel pace matching (the "walking backwards" fix).
//
// A wander leg always lasts MOVEMENT_SPEED[type] ms no matter how far it
// travels, but the walk frames and the procedural gait cycled at a FIXED
// cadence. So a short hop played a full-speed gait over almost no ground: the
// legs churned while the body barely moved, which the eye reads as moonwalking
// (and, once the sprite is also mid-turn, as walking backwards).
//
// Two guards. First, a wander leg must cover at least MIN_TRAVEL_UNITS so the
// pathological near-zero leg can't happen at all. Second, the gait cadence is
// scaled by how fast this particular leg actually moves relative to a reference
// leg, so the feet always keep up with the ground.
// ---------------------------------------------------------------------------

/** Minimum distance (room units, 0-100) a wander leg may cover. */
const MIN_TRAVEL_UNITS = 18;
/** Leg distance the per-species MOVEMENT_SPEED cadence was tuned against. */
const REFERENCE_TRAVEL_UNITS = 30;
/** Clamp on the pace multiplier so the gait always stays a plausible walk. */
const MIN_GAIT_PACE = 0.6;
const MAX_GAIT_PACE = 2.4;

/**
 * Multiplier on a gait's frame/cycle duration for a leg of `travelUnits` room
 * units taking `travelMs`. 1 = the reference pace; >1 slows the gait down for a
 * short/slow leg; <1 speeds it up for a long/fast one. Pure + exported so the
 * pacing contract is testable without a renderer.
 */
export function getGaitPaceScale(
  travelUnits: number,
  travelMs: number,
  referenceMs: number,
): number {
  const units = Math.max(1, Math.abs(travelUnits));
  const ms = Math.max(1, travelMs);
  const refMs = Math.max(1, referenceMs);
  // referenceSpeed / actualSpeed, with speed measured in units per ms.
  const scale = (REFERENCE_TRAVEL_UNITS / refMs) / (units / ms);
  return Math.max(MIN_GAIT_PACE, Math.min(MAX_GAIT_PACE, scale));
}

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
   * Optional Phase 4-5 robed TALK frame (F26) — the reveal counterpart of
   * `talk`. When present, a dialogue portrait opacity-switches robed<->
   * robedTalk exactly like idle<->talk at earlier phases, so the climax's
   * biggest lines no longer play over a frozen robed still. No animal has
   * this frame today (only idle/talk/robed exist on disk for all 13) — a
   * portrait consumer must check for it and fall back to the static `robed`
   * frame rather than assuming it exists.
   */
  robedTalk?: ImageSourcePropType;
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

// Emote bubble sprites — hand-drawn candy-UI-family art (generateUiIcons.mjs),
// replacing the old OS-emoji glyphs so the ambient emotes match the game's
// vector look on every platform instead of rendering the host font's emoji.
type EmoteKey =
  | 'heart' | 'pale_heart' | 'sparkle' | 'note' | 'thought' | 'question'
  | 'fog' | 'tear' | 'eye' | 'void' | 'candle';
const EMOTE_SPRITES: Record<EmoteKey, ImageSourcePropType> = {
  heart: require('../../../assets/ui/emote_heart.png'),
  pale_heart: require('../../../assets/ui/emote_pale_heart.png'),
  sparkle: require('../../../assets/ui/emote_sparkle.png'),
  note: require('../../../assets/ui/emote_note.png'),
  thought: require('../../../assets/ui/emote_thought.png'),
  question: require('../../../assets/ui/emote_question.png'),
  fog: require('../../../assets/ui/emote_fog.png'),
  tear: require('../../../assets/ui/emote_tear.png'),
  eye: require('../../../assets/ui/emote_eye.png'),
  void: require('../../../assets/ui/emote_void.png'),
  candle: require('../../../assets/ui/emote_candle.png'),
};

// Phase-aware parchment puff drawn BEHIND the ambient emote sprite, so the
// emote reads as a small cottage speech puff rather than a bare floating icon.
// It ages with the descent: warm cream in the bright days, ashen night later
// (so a Phase-4 emote never floats on a bright bubble).
const EMOTE_BUBBLE_THEME: Record<number, { bg: string; border: string }> = {
  0: { bg: '#FDF3DC', border: '#E7C98A' },
  1: { bg: '#F6E9CF', border: '#DBBE86' },
  2: { bg: '#E7D6C0', border: '#B79B77' },
  3: { bg: '#2C2A3E', border: '#4A4568' },
  4: { bg: '#1C1A2A', border: '#3A2E4E' },
  5: { bg: '#241F33', border: '#463C5C' },
};
const getEmoteBubbleTheme = (phase: number): { bg: string; border: string } =>
  EMOTE_BUBBLE_THEME[phase] ?? EMOTE_BUBBLE_THEME[0];

// Emote bubble vocabulary by phase — the same emotional arc the old emoji set
// carried (candy joy -> curiosity -> unease -> dread -> serene resignation),
// now expressed in the sprite family above.
const EMOTION_BUBBLES: Record<number, EmoteKey[]> = {
  0: ['heart', 'sparkle', 'heart', 'sparkle', 'note', 'sparkle', 'heart'],
  1: ['thought', 'question', 'thought', 'sparkle', 'question'],
  2: ['thought', 'tear', 'question', 'fog', 'tear'],
  3: ['tear', 'eye', 'void', 'fog', 'eye'],
  4: ['void', 'eye', 'void', 'eye', 'void'],
  // Phase 5: terrible peace — serene resignation, not cheerful, not dreadful.
  5: ['candle', 'fog', 'pale_heart', 'void', 'fog'],
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
  z1: { fontFamily: PIXEL_FONT_BOLD, fontSize: FONT_SIZE.micro, right: 0 },
  z2: { fontFamily: PIXEL_FONT_BOLD, fontSize: FONT_SIZE.small, right: 8, top: -5 },
  z3: { fontFamily: PIXEL_FONT_BOLD, fontSize: FONT_SIZE.bodyLg, right: 16, top: -12 },
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
// Phase-descending motion.
// The wander / bounce / breathe language slows and flattens as the house
// darkens (the tiles already age on a phase ladder; the animals never did).
// Bright days keep the candy tempo. Phase 3 slows travel ~1.4x and halves the
// bounce. Phase 4+ robed figures GLIDE (a 0-1px slow sine drift, never the
// candy hop), pause twice as long, and breathe heavily and slow. Phase 5 is
// serene-slow. Amplitudes/pause scalars only; nothing here touches game state.
// ---------------------------------------------------------------------------
interface PhaseMotion {
  speedMul: number; // × MOVEMENT_SPEED (larger = slower travel)
  pauseMul: number; // × the wait between wanders
  bounceMul: number; // × BOUNCE_HEIGHT (0 disables the hop)
  breatheMs: number; // breathe half-cycle duration (slower = heavier)
  glide: boolean; // Phase 4+: replace the hop with a 0-1px sine drift
}

export function getPhaseMotionScale(phase: number): PhaseMotion {
  if (phase >= 5) return { speedMul: 2.0, pauseMul: 2.4, bounceMul: 0, breatheMs: 3200, glide: true };
  if (phase >= 4) return { speedMul: 1.8, pauseMul: 2.0, bounceMul: 0, breatheMs: 3000, glide: true };
  if (phase === 3) return { speedMul: 1.4, pauseMul: 1.4, bounceMul: 0.5, breatheMs: 2200, glide: false };
  if (phase === 2) return { speedMul: 1.15, pauseMul: 1.15, bounceMul: 0.8, breatheMs: 1800, glide: false };
  return { speedMul: 1, pauseMul: 1, bounceMul: 1, breatheMs: 1500, glide: false };
}

// Where a sleeping animal settles (posX interpolates [0,100] → floor space).
const REST_POS_X = 30;
// Slow, heavy breath while sleeping (independent of the phase scalar).
const SLEEP_BREATHE_MS = 2600;

// ---------------------------------------------------------------------------
// Rare-idle scheduler turnstile (the "alive" system).
// AnimalSprite instances are independent, so a per-instance timer would let
// every animal on screen fire an idle beat at once. A single module-scope
// token gates the whole house to ONE idle beat at a time: an instance may only
// play a beat while it holds the token, and releases it the instant the beat
// (or its cleanup) finishes.
// ---------------------------------------------------------------------------
let idleBeatTokenHolder: number | null = null;
let idleInstanceSeq = 0;

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

  // Rare-idle beat transforms (native-driver only). Neutral at rest, animated
  // by the rare-idle scheduler one beat at a time. Live on the inner "body"
  // layer alongside the gait — never on the unflipped name/badge chrome.
  const idleTalkOpacity = useRef(new Animated.Value(0)).current; // pre-mounted talk-layer crossfade (chirp/mutter)
  const idlePerkScaleY = useRef(new Animated.Value(1)).current; // chirp scaleY perk
  const idleHopY = useRef(new Animated.Value(0)).current; // rabbit hop-in-place
  const idleShiftX = useRef(new Animated.Value(0)).current; // aye-aye tap-tap ticks
  const idleRot = useRef(new Animated.Value(0)).current; // sloth lean / aye-aye / pangolin stir (fraction of ±10deg)
  const idleScale = useRef(new Animated.Value(1)).current; // kakapo inflate

  const currentXRef = useRef(animal.position.x);
  // Gait cadence multiplier for the leg currently underway (see
  // getGaitPaceScale). Written synchronously just before setIsMoving(true), so
  // the walk-frame interval / gait loop effects — which re-run every leg as
  // walkActive/gaitActive toggle — always read this leg's value.
  const gaitPaceRef = useRef(1);
  // Live mirrors read by the async rare-idle scheduler without re-subscribing.
  const isMovingRef = useRef(false);
  const cooldownRef = useRef(isOnCooldown);
  // Stable per-instance id for the module-scope idle turnstile.
  const idleIdRef = useRef<number | null>(null);
  if (idleIdRef.current === null) idleIdRef.current = ++idleInstanceSeq;

  const [isMoving, setIsMoving] = useState(false);
  const [isDozing, setIsDozing] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmoteKey | null>(null);
  const [spriteLoadFailed, setSpriteLoadFailed] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);

  useEffect(() => {
    isMovingRef.current = isMoving;
  }, [isMoving]);
  useEffect(() => {
    cooldownRef.current = isOnCooldown;
  }, [isOnCooldown]);

  // Real walk-cycle frames play while the animal wanders (currently the fox).
  // Robed figures (Phase 4+) don't stroll — they keep the gliding reverence —
  // and reduced motion / low-tier devices keep the static sprite.
  const walkFrames = CHARACTER_SPRITES[animal.type]?.walk;
  const hasWalkFrames = Boolean(walkFrames && walkFrames.length > 0);
  const walkActive = Boolean(
    isMoving &&
    !isOnCooldown &&
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
    !isOnCooldown &&
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
        // Paced to this leg's actual ground speed so the footfalls never churn
        // faster than the animal travels.
        duration: getGaitPeriodMs(animal.type) * gaitPaceRef.current,
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

  // Contact shadow behavior. A real contact shadow stays PLANTED on the floor
  // and shrinks + softens as the body rises — it never lifts with the hop. The
  // gait bob (gaitBob) and the rare-idle hop (idleHopY) live on the `body`
  // layer, so the shadow (an unflipped SIBLING of `body`) never inherits their
  // translate; the container's moving bounce (bounceY) IS inherited, so the
  // shadow cancels it below. The shadow reacts to the combined body lift with
  // SCALE + OPACITY only (per the "may scale slightly with hop height, must not
  // translate up" contract). All three lift sources pin to 0 under reduced
  // motion / low tier, so the shadow resolves to a static full-size oval there.
  const bodyLift = Animated.add(Animated.add(bounceY, gaitBob), idleHopY);
  const shadowLiftScale = bodyLift.interpolate({
    inputRange: [-10, 0],
    outputRange: [0.82, 1],
    extrapolate: 'clamp',
  });
  const shadowLiftOpacity = bodyLift.interpolate({
    inputRange: [-10, 0],
    outputRange: [0.55, 1],
    extrapolate: 'clamp',
  });

  // Rare-idle rotate: idleRot carries a fraction of ±10deg, so the sloth's
  // 6deg doze lean drives it to 0.6, the aye-aye's small knock to 0.2, etc.
  const idleRotate = idleRot.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-10deg', '0deg', '10deg'],
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
    }, WALK_FRAME_MS * gaitPaceRef.current);
    return () => clearInterval(interval);
  }, [walkActive, walkFrames?.length]);

  // Breathing animation (subtle scale pulse) — phase-scaled: it slows and
  // deepens as the house darkens, and slows to a heavy sleep breath on
  // cooldown. Deps carry currentPhase + isOnCooldown so the pace actually
  // changes with the descent (the effect was empty-dep / phase-invariant).
  useEffect(() => {
    if (getSettingsSync().reducedMotion) {
      breatheScale.setValue(1);
      return;
    }
    const halfMs = isOnCooldown ? SLEEP_BREATHE_MS : getPhaseMotionScale(currentPhase).breatheMs;
    // Heavier (deeper) chest as the dread sets in; sleep is the deepest.
    const depth = isOnCooldown ? 1.06 : currentPhase >= 3 ? 1.06 : 1.05;
    const breatheAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheScale, {
          toValue: depth,
          duration: halfMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breatheScale, {
          toValue: 1,
          duration: halfMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    breatheAnimation.start();
    return () => breatheAnimation.stop();
  }, [currentPhase, isOnCooldown]);

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

      // Show a tap emote appropriate to the phase (same sprite family as the
      // ambient emotes above).
      const tapEmotes: EmoteKey[] =
        currentPhase >= 5
          ? ['candle', 'pale_heart', 'fog']   // serene resignation
          : currentPhase >= 3
            ? ['tear', 'void', 'eye']          // dread
            : ['heart', 'sparkle', 'note'];    // candy-cute joy
      setCurrentEmotion(tapEmotes[Math.floor(Math.random() * tapEmotes.length)]);
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

  // Walking animation - random movement within room bounds.
  // Sleep gate: a "sleeping" (on-cooldown) animal no longer sleepwalks — it
  // eases to a rest spot and stops. Phase gate: travel and pauses slow with
  // the descent (currentPhase + isOnCooldown are in the deps so the effect
  // actually re-arms when either changes; resumes on cooldown clear).
  useEffect(() => {
    if (getSettingsSync().reducedMotion) {
      // Set to a static position, no movement
      posX.setValue(animal.position.x);
      posY.setValue(animal.position.y);
      return;
    }

    // Sleeping: settle at a rest spot and stay put (no wander, no bounce).
    // The facing flip rides along: this slide used to move the sprite without
    // ever touching scaleX, so an animal resting from the right half of the
    // room glided LEFT while still facing right — the most visible "walking
    // backwards" case, and it fires after every dialogue session.
    if (isOnCooldown) {
      setIsMoving(false);
      const restGoingRight = REST_POS_X > currentXRef.current;
      currentXRef.current = REST_POS_X;
      Animated.timing(scaleX, {
        toValue: restGoingRight ? 1 : -1,
        duration: 150,
        useNativeDriver: true,
      }).start();
      Animated.timing(posX, {
        toValue: REST_POS_X,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
      return;
    }

    const motion = getPhaseMotionScale(currentPhase);
    let movementTimeout: NodeJS.Timeout;
    let isMounted = true;

    const moveToRandomPosition = () => {
      if (!isMounted) return;

      // Random target position (20-80% of room to stay away from edges).
      // Rerolled until it is at least MIN_TRAVEL_UNITS away, so a leg always
      // covers real ground: a near-zero leg still burned the full travel time
      // playing a full-speed gait in place, which reads as moonwalking. The
      // reroll is bounded (the fallback mirrors the target across the room, so
      // it is always far enough) and never blocks.
      const currentX = currentXRef.current;
      let targetX = 20 + Math.random() * 60;
      for (let tries = 0; tries < 4 && Math.abs(targetX - currentX) < MIN_TRAVEL_UNITS; tries++) {
        targetX = 20 + Math.random() * 60;
      }
      if (Math.abs(targetX - currentX) < MIN_TRAVEL_UNITS) {
        targetX = currentX < 50 ? 80 : 20;
      }
      const targetY = 20 + Math.random() * 60;

      // Determine direction for flip
      const goingRight = targetX > currentX;

      // Update tracked position before animation starts
      currentXRef.current = targetX;

      // Flip direction
      Animated.timing(scaleX, {
        toValue: goingRight ? 1 : -1,
        duration: 150,
        useNativeDriver: true,
      }).start();

      // Move to target (slower with the descent)
      const travelMs = MOVEMENT_SPEED[animal.type] * motion.speedMul;
      // Match this leg's gait cadence to its ground speed BEFORE the walk /
      // gait effects re-run off isMoving.
      gaitPaceRef.current = getGaitPaceScale(
        targetX - currentX,
        travelMs,
        MOVEMENT_SPEED[animal.type],
      );

      setIsMoving(true);

      Animated.parallel([
        Animated.timing(posX, {
          toValue: targetX,
          duration: travelMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: targetY,
          duration: travelMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMounted) {
          setIsMoving(false);
          // Wait before next movement (3-8 seconds base, longer as it darkens)
          const pauseMs = (3000 + Math.random() * 5000) * motion.pauseMul;
          movementTimeout = setTimeout(moveToRandomPosition, pauseMs);
        }
      });
    };

    // Start movement after initial delay
    movementTimeout = setTimeout(moveToRandomPosition, (1000 + Math.random() * 2000) * motion.pauseMul);

    return () => {
      isMounted = false;
      clearTimeout(movementTimeout);
    };
  }, [animal.type, currentPhase, isOnCooldown]);

  // Bounce animation while moving. Suppressed when real walk frames play OR
  // the procedural gait runs — either already carries the vertical bob, and
  // stacking the glide-bounce on top reads as skipping. Low-tier devices and
  // sleeping animals stay static. Phase-descending: the candy hop halves at
  // Phase 3 and is REPLACED by a 0-1px slow sine glide at Phase 4+ (robed
  // figures drift with reverence, they never regress to the springy hop).
  useEffect(() => {
    if (
      getSettingsSync().reducedMotion ||
      shouldSimplifyAnimations() ||
      walkActive ||
      gaitActive ||
      isOnCooldown
    ) {
      bounceY.setValue(0);
      return;
    }

    let bounceAnimation: Animated.CompositeAnimation | undefined;

    if (isMoving) {
      const motion = getPhaseMotionScale(currentPhase);
      if (motion.glide) {
        // Phase 4+: a barely-there 0-1px drift, slow and heavy.
        bounceAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(bounceY, {
              toValue: -1,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(bounceY, {
              toValue: 0,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
      } else {
        const height = BOUNCE_HEIGHT[animal.type] * motion.bounceMul;
        const stepMs = (animal.type === 'rabbit' ? 150 : 250) * motion.speedMul;
        bounceAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(bounceY, {
              toValue: -height,
              duration: stepMs,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(bounceY, {
              toValue: 0,
              duration: stepMs,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
      }
      bounceAnimation.start();
    } else {
      bounceY.setValue(0);
    }

    return () => {
      bounceAnimation?.stop();
    };
  }, [isMoving, animal.type, walkActive, gaitActive, currentPhase, isOnCooldown]);

  // ---------------------------------------------------------------------------
  // Rare-idle scheduler (the "alive" system). ~1 beat every 20-45s, but only
  // ONE animal in the whole house plays at a time (module-scope turnstile, so
  // independent instances never all fire together). Every beat is built from
  // existing frames + transforms — no new art. Gated exactly like the walk/
  // gait: lively beats are Phase 0-3 only (robed Phase-4+ figures keep their
  // gliding reverence — no chirps, no hops), never under reduced motion or on
  // low-tier devices. The tarsier is deliberately skipped: her unblinking
  // stillness IS her idle. Every timer is cleaned up on unmount.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (getSettingsSync().reducedMotion || shouldSimplifyAnimations()) return;
    if (currentPhase >= 4) return; // robed reverence: no lively idle beats
    if (animal.type === 'tarsier') return; // the Witness never fidgets

    const sprites = CHARACTER_SPRITES[animal.type];
    const hasTalk = Boolean(sprites?.talk);
    const myId = idleIdRef.current!;

    let cancelled = false;
    let scheduleTimer: ReturnType<typeof setTimeout>;
    let activeAnim: Animated.CompositeAnimation | null = null;

    const releaseToken = () => {
      if (idleBeatTokenHolder === myId) idleBeatTokenHolder = null;
    };

    const resetIdleValues = () => {
      idleTalkOpacity.setValue(0);
      idlePerkScaleY.setValue(1);
      idleHopY.setValue(0);
      idleShiftX.setValue(0);
      idleRot.setValue(0);
      idleScale.setValue(1);
    };

    const finishBeat = () => {
      activeAnim = null;
      resetIdleValues();
      setIsDozing(false);
      releaseToken();
    };

    // A pre-mounted talk-layer crossfade + a small scaleY perk — the shared
    // "chirp". The talk frame is opacity-switched (never a source swap), so
    // there is no first-cycle decode flicker.
    const chirp = (): Animated.CompositeAnimation =>
      Animated.parallel([
        hasTalk
          ? Animated.sequence([
              Animated.timing(idleTalkOpacity, { toValue: 1, duration: 70, useNativeDriver: true }),
              Animated.delay(480),
              Animated.timing(idleTalkOpacity, { toValue: 0, duration: 90, useNativeDriver: true }),
            ])
          : Animated.delay(560),
        Animated.sequence([
          Animated.timing(idlePerkScaleY, { toValue: 1.04, duration: 160, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(idlePerkScaleY, { toValue: 1, duration: 240, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ]);

    // Build one species-appropriate idle beat from existing assets/transforms.
    const buildBeat = (): Animated.CompositeAnimation => {
      switch (animal.type) {
        case 'rabbit': // double hop-in-place
          return Animated.sequence([
            Animated.timing(idleHopY, { toValue: -8, duration: 150, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(idleHopY, { toValue: 0, duration: 150, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            Animated.timing(idleHopY, { toValue: -8, duration: 150, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(idleHopY, { toValue: 0, duration: 150, easing: Easing.in(Easing.ease), useNativeDriver: true }),
          ]);
        case 'sloth': // slow ~6deg lean into a ~10s doze, reusing SleepingZs
          setIsDozing(true);
          return Animated.sequence([
            Animated.timing(idleRot, { toValue: 0.6, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.delay(9000),
            Animated.timing(idleRot, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]);
        case 'aye_aye': // two small translateX ticks + a slight rotate (the diviner's knock)
          return Animated.parallel([
            Animated.sequence([
              Animated.timing(idleShiftX, { toValue: 3, duration: 90, useNativeDriver: true }),
              Animated.timing(idleShiftX, { toValue: 0, duration: 90, useNativeDriver: true }),
              Animated.timing(idleShiftX, { toValue: 3, duration: 90, useNativeDriver: true }),
              Animated.timing(idleShiftX, { toValue: 0, duration: 90, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(idleRot, { toValue: 0.2, duration: 180, useNativeDriver: true }),
              Animated.timing(idleRot, { toValue: 0, duration: 180, useNativeDriver: true }),
            ]),
          ]);
        case 'kakapo': // slow 1.0 -> 1.08 -> 1.0 "boom" inflate
          return Animated.sequence([
            Animated.timing(idleScale, { toValue: 1.08, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(idleScale, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]);
        case 'capybara': { // 2s pause + a sleepy talk-frame mutter
          const mouth: Animated.CompositeAnimation = hasTalk
            ? Animated.sequence([
                Animated.timing(idleTalkOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
                Animated.delay(1800),
                Animated.timing(idleTalkOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
              ])
            : Animated.delay(2060);
          return Animated.parallel([
            mouth,
            Animated.sequence([
              Animated.timing(idlePerkScaleY, { toValue: 1.02, duration: 300, useNativeDriver: true }),
              Animated.delay(1400),
              Animated.timing(idlePerkScaleY, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]),
          ]);
        }
        case 'pangolin': // a periodic stir wiggle
          return Animated.sequence([
            Animated.timing(idleRot, { toValue: 0.4, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(idleRot, { toValue: -0.4, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(idleRot, { toValue: 0.3, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(idleRot, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]);
        case 'axolotl': // scuba mask can't talk: transform-only perk (chirp without the mouth)
          return Animated.sequence([
            Animated.timing(idlePerkScaleY, { toValue: 1.04, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(idlePerkScaleY, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]);
        default: // fox, owl, fennec_fox, red_panda, wombat: talk-frame chirp
          return chirp();
      }
    };

    const tryBeat = () => {
      if (cancelled) return;
      // Only fire on a genuine idle moment, and only if the house turnstile is free.
      if (!cooldownRef.current && !isMovingRef.current && idleBeatTokenHolder === null) {
        idleBeatTokenHolder = myId;
        const anim = buildBeat();
        activeAnim = anim;
        anim.start(() => finishBeat());
      }
      schedule();
    };

    const schedule = () => {
      if (cancelled) return;
      scheduleTimer = setTimeout(tryBeat, 20000 + Math.random() * 25000);
    };

    // Initial stagger so the house doesn't all tick on at once.
    scheduleTimer = setTimeout(tryBeat, 8000 + Math.random() * 20000);

    return () => {
      cancelled = true;
      clearTimeout(scheduleTimer);
      activeAnim?.stop();
      setIsDozing(false);
      releaseToken();
      resetIdleValues();
    };
  }, [animal.type, currentPhase]);

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

  // Phase-aware cottage puff behind the ambient emote sprite.
  const emoteBubbleTheme = getEmoteBubbleTheme(currentPhase);

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
        // The one focusable element for this animal, so it carries everything
        // the (now decorative) nameplate shows.
        accessibilityLabel={
          isOnCooldown
            ? cooldownPuzzlesLeft != null && cooldownPuzzlesLeft > 0
              ? `${animal.name} the ${animal.type}, resting for ${cooldownPuzzlesLeft === 1 ? '1 more puzzle' : `${cooldownPuzzlesLeft} more puzzles`}`
              : `${animal.name} the ${animal.type}, resting`
            : `${animal.name} the ${animal.type}`
        }
        accessibilityRole="button"
      >
        <View style={styles.spriteContainer}>
          {/* Contact shadow - a grounded, unflipped sibling OUTSIDE the body
              transform, so it never bobs with the gait or lifts with a rare-idle
              hop (a shadow stays planted on the floor while the feet leave it).
              It cancels the container's moving bounce (bounceY) so it stays on
              the floor there too, shrinks + softens with the body's lift, and
              still responds to the tap squash via its own scaleX. */}
          <Animated.View
            style={[
              styles.shadow,
              {
                opacity: shadowLiftOpacity,
                transform: [
                  // Keep the shadow on the ground: undo the outer container's
                  // bounceY translate (the gait/idle hops live on `body`, which
                  // the shadow never inherits, so only bounceY needs cancelling).
                  { translateY: Animated.multiply(bounceY, -1) },
                  { scaleX: tapScale },
                  { scale: shadowLiftScale },
                ],
              },
            ]}
          />

          {/* Animal BODY — the ONLY layer that carries the facing flip (scaleX),
              breathe, tap, wiggle, procedural gait, AND the rare-idle beats.
              The emote bubble, sleeping Z's and notification badge are
              unflipped, untransformed SIBLINGS below, so a facing-left animal
              never mirrors its chrome and nothing squashes with a footfall or
              an idle beat. */}
          <Animated.View
            style={[
              styles.body,
              {
                transform: [
                  { scaleX },
                  { scale: Animated.multiply(tapScale, breatheScale) },
                  { rotate: wiggleRotate },
                  // Procedural gait bundle (neutral at rest: 0 / 0deg / 1).
                  { translateY: gaitBob },
                  { rotate: gaitLean },
                  { scaleY: gaitScaleY },
                  // Rare-idle beat bundle (neutral at rest: 0 / 0deg / 1).
                  { translateY: idleHopY },
                  { translateX: idleShiftX },
                  { rotate: idleRotate },
                  { scaleY: idlePerkScaleY },
                  { scale: idleScale },
                ],
              },
            ]}
          >
            {/* Animal body sprite stack */}
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
                // The rare-idle "chirp"/"mutter" beats crossfade to the talk
                // frame. Like the walk stack it is PRE-MOUNTED (opacity-switch,
                // never a source swap) so the first chirp never decode-flickers.
                // Same gates as the scheduler that drives it.
                const mountIdleTalkLayer = Boolean(
                  sprites.talk &&
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
                    {/* Pre-mounted talk layer for the rare-idle chirp/mutter */}
                    {mountIdleTalkLayer && (
                      <Animated.View style={[styles.spriteLayer, { opacity: idleTalkOpacity }]}>
                        <Image source={sprites.talk!} style={styles.spriteFill} resizeMode="contain" />
                        {renderTint(sprites.talk!)}
                      </Animated.View>
                    )}
                  </View>
                );
              })()
            ) : (
              <View style={[styles.emojiBody, { borderColor: getMoodColor() }]}>
                <Text style={styles.emoji}>{ANIMAL_EMOJIS[animal.type]}</Text>
              </View>
            )}
          </Animated.View>

          {/* Emote bubble (unflipped sibling) — a candy-UI sprite on a phase-aware
              cottage parchment puff, so the ambient emote reads as an in-world
              speech puff rather than a bare floating icon. Decorative. */}
          {currentEmotion && (
            <Animated.View
              style={[
                styles.emotionBubble,
                {
                  transform: [{ translateY: emotionY }],
                  opacity: emotionOpacity,
                },
              ]}
              importantForAccessibility="no"
              accessibilityElementsHidden
            >
              <View
                style={[
                  styles.emotePuff,
                  { backgroundColor: emoteBubbleTheme.bg, borderColor: emoteBubbleTheme.border },
                ]}
              >
                <Image
                  source={EMOTE_SPRITES[currentEmotion]}
                  style={styles.emoteSprite}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>
          )}

          {/* Sleeping Z's while asleep (on cooldown) or mid-doze (sloth idle) */}
          {(isOnCooldown || isDozing) && <SleepingZs />}

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

          {/* The animal's NAME is deliberately not rendered here.
              It used to be a small dark pill riding this sprite's own transform
              stack, so it wandered around the room with the animal and sat over
              its body. It is now a STATIC cottage nameplate pinned to the bottom
              of the room (see RoomView's animalPlate): a label belongs to the
              room, not to a moving character, and a flat dark pill was the last
              webby chip left in the house. The cooldown state moved with it. */}
        </View>
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
  // Carries the facing flip + breathe + tap + wiggle + gait + rare-idle beats;
  // wraps ONLY the sprite so the chrome siblings (and the grounded contact
  // shadow) never inherit the mirror/deform (the un-mirror render-tree fix
  // these behaviors build on). The animal's NAME is no longer among them — it
  // is a static plaque on the room floor now (RoomView.animalPlate).
  body: {
    alignItems: 'center',
  },
  shadow: {
    position: 'absolute',
    // Grounded at the base of the 90px sprite body (top of the flex column),
    // not below the name tag — a contact shadow sits at the feet.
    top: 78,
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
    fontSize: FONT_SIZE.giant,
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
    fontSize: FONT_SIZE.bodyLg,
    fontWeight: '900',
  },
  emotionBubble: {
    position: 'absolute',
    top: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Cottage parchment puff behind the emote sprite (fill/border set per phase).
  emotePuff: {
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoteSprite: {
    width: 22,
    height: 22,
  },
});

export default AnimalSprite;
