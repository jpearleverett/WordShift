import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageSourcePropType,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { Room, Animal, RoomTheme, DialoguePhase } from '../../types/homeWorld';
import { ROOM_THEME_COLORS } from '../../services/homeWorldData';
import { AnimalSprite } from './AnimalSprite';
import { CandyColors } from '../../theme/colors';
import { FONT_SIZE } from '../../theme/typeScale';
import { getPixelSkin, CARD_CORNER_DP, CARD_EDGE_DP } from '../../theme/pixelSkin.generated';
import { NineSliceFrame } from '../ui/NineSlice';
import { PixelPlaque } from '../ui/PixelPlaque';
import { BODY_FONT_BOLD } from '../../theme/fonts';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';

// Room name plate scale: the full 42dp PixelPlaque would swamp a ~123dp room,
// so the wooden nameplate is uniformly scaled to ~29dp tall / ~9.5dp font — big
// enough to read the room name, small enough to sit as a tidy label at the top.
const ROOM_PLAQUE_SCALE = 0.68;

// The occupant's plate was 0.62 against the room sign's 0.68, which is only
// 8.8% smaller in EVERY dimension — two near-identical wooden cards at opposite
// ends of a 123dp room, together eating 44% of its height, with the lower one
// parked exactly where the animal stands (it hid 34-57% of the sprite box
// depending on the animal's floor offset, and 100% of its contact shadow).
//
// It could not simply shrink: PixelPlaque's font is 14 * scale, so anything
// under ~0.6 dropped the label below the room sign's own 9.5dp. Hence
// `fontScale` on the plaque — the wood shrinks to 0.65 the room sign's height
// while the type gives up only 8%. Combined with the left anchor and the
// behind-the-sprite z (see animalPlate), the two now read as sign and tag
// rather than as a pair.
const ANIMAL_PLAQUE_SCALE = 0.44;   // 18.5dp tall vs the room sign's 28.6dp
const ANIMAL_PLAQUE_FONT_SCALE = 1.3; // 8.0pt label (was 8.7 at the old 0.62)


// Room background images - maps theme to image asset. Backgrounds render
// cover-fit at ~250dp, so any source ≥ 750px clears the 3x requirement.
// ASSET-SIZE EXCEPTION (F115): desert / observatory (star_loft) / workshop
// (belfry) currently ship at 1783x882, above the 1456x720 family standard, and
// are pending a downscale (their window masks are cover-fit too, so a
// proportional downscale keeps alignment). jungle (1092x540) / office
// (1092x534) are accepted as-is (both exceed 750px).
const ROOM_BACKGROUNDS: Record<RoomTheme, ImageSourcePropType> = {
  cozy_den: require('../../../assets/rooms/cozy_den.png'),
  kitchen: require('../../../assets/rooms/kitchen.png'),
  study: require('../../../assets/rooms/study.png'),
  aquarium: require('../../../assets/rooms/aquarium.png'),
  jungle: require('../../../assets/rooms/jungle.png'),
  desert: require('../../../assets/rooms/desert.png'),
  office: require('../../../assets/rooms/office.png'),
  burrow: require('../../../assets/rooms/burrow.png'),
  garden: require('../../../assets/rooms/garden.png'),
  bamboo: require('../../../assets/rooms/bamboo.png'),
  // The descent trio's real art (hand-authored, processed to 1456x720). The
  // filenames carry the art's own concept names; the in-game rooms keep their
  // canon names (Star Loft / Belfry / Sky Garden — the belfry art shows the
  // workshop floor, the bell hangs up the tower shaft, out of frame).
  star_loft: require('../../../assets/rooms/observatory.png'),
  belfry: require('../../../assets/rooms/workshop.png'),
  sky_garden: require('../../../assets/rooms/rainforest.png'),
};

// Phase-appropriate windows. The room art paints bright day-view windows that
// read as noon under a dusk/night sky. These masks (white on transparent, the
// window view only) let us recolor just the window to the current phase. The
// first five (clear blue-sky windows) come from processRawWorldArt.mjs; the
// descent-trio + jungle/desert windows (day views of sky + foliage / canopy /
// misty rainforest) come from generateRoomWindows.mjs, keyed here by ROOM THEME
// but derived from the art file (observatory/workshop/rainforest = the
// star_loft/belfry/sky_garden art). Only the aquarium (water) and windowless
// rooms (burrow, bamboo) stay untreated.
const ROOM_WINDOW_MASKS: Partial<Record<RoomTheme, ImageSourcePropType>> = {
  cozy_den: require('../../../assets/rooms/windows/cozy_den.png'),
  kitchen: require('../../../assets/rooms/windows/kitchen.png'),
  study: require('../../../assets/rooms/windows/study.png'),
  office: require('../../../assets/rooms/windows/office.png'),
  garden: require('../../../assets/rooms/windows/garden.png'),
  desert: require('../../../assets/rooms/windows/desert.png'),
  jungle: require('../../../assets/rooms/windows/jungle.png'),
  star_loft: require('../../../assets/rooms/windows/observatory.png'),
  belfry: require('../../../assets/rooms/windows/workshop.png'),
  sky_garden: require('../../../assets/rooms/windows/rainforest.png'),
};

// The color + strength painted over the window sky per phase (roughly each
// sky's own tone; strength climbs into night). Phase 0 is untouched.
const WINDOW_TINT: Record<number, { color: string; opacity: number }> = {
  0: { color: '#000000', opacity: 0 },
  1: { color: '#FFC98A', opacity: 0.14 }, // afternoon: faint warm
  2: { color: '#B5623C', opacity: 0.5 },  // dusk: warm rose
  3: { color: '#16233F', opacity: 0.82 }, // storm night: deep blue
  4: { color: '#0A0E22', opacity: 0.9 },  // shadow: near-black night
  5: { color: '#191330', opacity: 0.86 }, // terrible peace: mauve night
};

// Word echo configuration by phase (ritual words inscribed in rooms).
// Phase 5 has its OWN entry: without it the render fell back to the phase-2
// styling, so at Terrible Peace the offered words REGRESSED from crimson 0.25
// to near-invisible white 0.08. At rest now, in the serene mauve register —
// settled into the walls, not reset.
const WORD_ECHO_CONFIG: Record<number, { count: number; opacity: number; fontSize: number; color: string }> = {
  2: { count: 3, opacity: 0.08, fontSize: FONT_SIZE.micro, color: '#FFFFFF' },
  3: { count: 4, opacity: 0.15, fontSize: FONT_SIZE.micro, color: '#9B7FCF' },
  4: { count: 5, opacity: 0.25, fontSize: FONT_SIZE.caption, color: '#8B2252' },
  5: { count: 4, opacity: 0.14, fontSize: FONT_SIZE.micro, color: '#9B8CB8' },
};

// Predefined scattered positions for word echoes within each room
const WORD_ECHO_POSITIONS = [
  { top: '22%', left: '8%', rotate: '-12deg' },
  { top: '55%', left: '62%', rotate: '8deg' },
  { top: '38%', left: '35%', rotate: '-5deg' },
  { top: '68%', left: '12%', rotate: '15deg' },
  { top: '30%', left: '55%', rotate: '-8deg' },
];

// Amber gem sprite for the invite chip cost rows. Rendered as a plain Image
// inside a row (NOT embedded inline in a Text run) so the gem gets an explicit
// size and a consistent 4px gap on one shared baseline — text-embedded images
// at this small font size render with inconsistent spacing/baselines.
const AMBER_ICON = require('../../../assets/ui/amber.png');
// Chrome iconography is sprites, not emoji (F67): the locked-room padlock.
const LOCK_ICON = require('../../../assets/ui/lock.png');

/**
 * Content contract for the invite chip shown in an unlocked room whose
 * animal hasn't been invited yet. Pure + exported for tests.
 */
export type InviteChipContent =
  | { kind: 'tap'; label: string }
  | { kind: 'free'; label: string }
  | { kind: 'cost'; label: string; cost: number; affordable: boolean };

export const getInviteChipContent = (
  inviteCost: number | null,
  amberBalance: number,
): InviteChipContent => {
  if (inviteCost === null) return { kind: 'tap', label: 'Tap to Invite' };
  if (inviteCost === 0) return { kind: 'free', label: 'Invite (FREE)' };
  return { kind: 'cost', label: 'Invite', cost: inviteCost, affordable: amberBalance >= inviteCost };
};

/** Accessibility label for the invite chip (strings unchanged by the redesign). */
export const getInviteAccessibilityLabel = (
  roomName: string,
  inviteCost: number | null,
): string => {
  if (inviteCost === null) return `Invite animal to ${roomName}`;
  if (inviteCost === 0) return `Invite animal to ${roomName} for free`;
  return `Invite animal to ${roomName} for ${inviteCost} amber`;
};

// ---------------------------------------------------------------------------
// In-world investment rendering (room upgrades).
// A purchased upgrade used to render as a single 10px sparkle glyph; deepenings
// and attunements rendered nothing. These layers make each amber sink visible
// inside its room: a breathing hearth glow (tier 1), phase-aware wall sigils +
// a richer interior wash (tier 2), and scaling glow / extra sigils / dust
// motes as the attunement level climbs (tier 3). All layers are decorative,
// non-interactive, and opacity-capped so the room art stays readable.
// ---------------------------------------------------------------------------

/**
 * Mirrors roomUpgrades.getRoomEmbellishmentIntensity math for prop-fed
 * (already-loaded) maps: tier-1 = 0.25, deepening = 0.25, attunement =
 * 0.5 × level/3. Pure + exported for tests and for HouseWorld.
 */
export const computeEmbellishmentIntensity = (
  isUpgraded: boolean,
  isDeepened: boolean,
  attunementLevel: number,
): number => {
  const level = Math.min(Math.max(attunementLevel, 0), 3);
  let intensity = 0;
  if (isUpgraded) intensity += 0.25;
  if (isDeepened) intensity += 0.25;
  intensity += 0.5 * (level / 3);
  return Math.min(1, intensity);
};

export interface EmbellishmentVisuals {
  /**
   * Whether to show the tier-1 embellishment glow (the replacement for the old
   * sparkle glyph). The glow's HUE + anchor come per-room from
   * getRoomGlowVariant — fire only in real hearth rooms, room-appropriate
   * light everywhere else — so this flag is the on/off, not the fire itself.
   */
  showHearthGlow: boolean;
  /** Peak opacity of the glow stack — capped so rooms stay readable. */
  glowMaxOpacity: number;
  /** Glow stack scale — steps up with each attunement level. */
  glowScale: number;
  /** Warm pips on the nameplate: 1 for tier-1 + 1 per attunement level. */
  namePips: number;
  /** Wall sigil marks: 1 for the deepening + 1 per attunement level (max 4). */
  sigilCount: number;
  /** Richer interior wash once deepened (phase-colored, very low opacity). */
  deepTintOpacity: number;
  /** Faint floating dust motes at full attunement (max 4, motion-gated). */
  showMotes: boolean;
}

export const getEmbellishmentVisuals = (
  isUpgraded: boolean,
  isDeepened: boolean,
  attunementLevel: number,
  /** 0..1 intensity; defaults to the local mirror of the service math. */
  intensityIn?: number,
): EmbellishmentVisuals => {
  const level = Math.min(Math.max(attunementLevel, 0), 3);
  const intensity = Math.min(
    1,
    Math.max(0, intensityIn ?? computeEmbellishmentIntensity(isUpgraded, isDeepened, level))
  );
  return {
    showHearthGlow: isUpgraded,
    glowMaxOpacity: Math.min(0.3, 0.16 + intensity * 0.14),
    glowScale: 1 + level * 0.12,
    namePips: isUpgraded ? Math.min(4, 1 + level) : 0,
    sigilCount: Math.min(4, (isDeepened ? 1 : 0) + level),
    deepTintOpacity: isDeepened ? 0.08 : 0,
    showMotes: level >= 3,
  };
};

/**
 * Phase register for the deepening wall marks: lavender through the dusk
 * phases, crimson-leaning once the shadows grow (3+), serene mauve at 5.
 * (Cycle-2 players can carry deepened rooms back into the bright phases —
 * they read lavender there, same as dusk.)
 */
export const getSigilColors = (phase: number): { line: string; glow: string } => {
  if (phase >= 5) return { line: '#8A78A8', glow: '#6B5B8A' };
  if (phase >= 3) return { line: '#A34062', glow: '#8B2252' };
  return { line: '#9B7FCF', glow: '#7B5FB0' };
};

// ---------------------------------------------------------------------------
// Per-room embellishment glow. The tier-1 investment glow used to be a single
// warm FIRE oval in EVERY upgraded room — a fireplace in the aquarium, a
// campfire in the desert camp. Only genuine hearth-bearing rooms (a fire: the
// cozy den's fireplace, the kitchen's oven) glow with fire now; every other
// room glows in its own register (a reading lamp, water shimmer, foliage, a
// starlit night), so the mark reads as THAT room's own light rather than a
// misplaced hearth. The investment INTENSITY (getRoomEmbellishmentIntensity,
// fed in as a prop) still drives opacity/scale; the room IDENTITY (room.theme)
// now drives the hue + anchor. All colors are decorative overlay fills.
// ---------------------------------------------------------------------------
export type GlowAnchor = 'bottom' | 'center';
export interface RoomGlowVariant {
  outer: string;
  mid: string;
  core: string;
  /** Where the glow sits: on the floor (a hearth/undergrowth) or ambient center. */
  anchor: GlowAnchor;
  /** True ONLY for genuine fire rooms — the only rooms that get the warm hearth. */
  isHearth: boolean;
}

// Five room registers. Fire is reserved for the two hearth rooms.
const GLOW_FIRE: RoomGlowVariant = { outer: '#F2953F', mid: '#FFB65C', core: '#FFD9A0', anchor: 'bottom', isHearth: true };
const GLOW_LAMP: RoomGlowVariant = { outer: '#C9922F', mid: '#E6C066', core: '#FCEBB8', anchor: 'center', isHearth: false };
const GLOW_WATER: RoomGlowVariant = { outer: '#2E7C93', mid: '#4FA9C0', core: '#AEE6EF', anchor: 'center', isHearth: false };
const GLOW_FOLIAGE: RoomGlowVariant = { outer: '#3E7A4A', mid: '#5FA866', core: '#BCE3A6', anchor: 'bottom', isHearth: false };
const GLOW_NIGHT: RoomGlowVariant = { outer: '#4A4A7E', mid: '#7272AE', core: '#B8B8E0', anchor: 'center', isHearth: false };

const ROOM_GLOW_VARIANTS: Record<RoomTheme, RoomGlowVariant> = {
  cozy_den: GLOW_FIRE,      // Fox's fireplace — the archetypal hearth
  kitchen: GLOW_FIRE,       // the chef's oven / stove
  study: GLOW_LAMP,         // the owl's reading lamp
  aquarium: GLOW_WATER,     // the axolotl's lit tank (never a fire)
  jungle: GLOW_FOLIAGE,     // the sloth's canopy
  desert: GLOW_NIGHT,       // the fennec's night camp (explicitly NOT fire)
  office: GLOW_LAMP,        // the capybara's desk lamp
  burrow: GLOW_LAMP,        // the wombat's warm earthen den
  garden: GLOW_FOLIAGE,     // the rabbit's garden patio
  bamboo: GLOW_FOLIAGE,     // the red panda's bamboo attic
  star_loft: GLOW_NIGHT,    // the tarsier's starlit observatory
  belfry: GLOW_LAMP,        // the aye-aye's workshop lamp
  sky_garden: GLOW_FOLIAGE, // the kakapo's rooftop garden
};

/** Room-appropriate tier-1 glow variant (warm fire ONLY in real hearth rooms). */
export const getRoomGlowVariant = (theme: RoomTheme): RoomGlowVariant =>
  ROOM_GLOW_VARIANTS[theme] ?? GLOW_LAMP;

/** Wall spots for up to 4 sigil marks (percent insets; mirrored pairs). */
const SIGIL_SPOTS: { top: string; left?: string; right?: string }[] = [
  { top: '26%', left: '9%' },
  { top: '24%', right: '9%' },
  { top: '58%', right: '5%' },
  { top: '60%', left: '5%' },
];

/**
 * Tier-1 embellishment glow: 2-3 stacked feathered ovals with a slow
 * native-driven opacity breathing, recolored + anchored per ROOM (variant).
 * Hearth rooms get the warm fire palette anchored at the floor; other rooms
 * get their own register (lamp / water / foliage / night). Static (steady
 * glow) under reduced motion / low tier.
 */
const EmbellishmentGlow: React.FC<{
  variant: RoomGlowVariant;
  maxOpacity: number;
  scale: number;
  animate: boolean;
}> = ({ variant, maxOpacity, scale, animate }) => {
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animate) {
      breathe.setValue(1);
      return;
    }
    breathe.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, breathe]);

  return (
    <Animated.View
      style={[
        styles.glowWrap,
        variant.anchor === 'center' ? styles.glowWrapCenter : styles.glowWrapBottom,
        {
          opacity: animate ? breathe.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) : 1,
          transform: [{ scale }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.glowOuter, { backgroundColor: variant.outer, opacity: maxOpacity * 0.45 }]} />
      <View style={[styles.glowMid, { backgroundColor: variant.mid, opacity: maxOpacity * 0.7 }]} />
      <View style={[styles.glowCore, { backgroundColor: variant.core, opacity: maxOpacity }]} />
    </Animated.View>
  );
};

/**
 * One deepening wall mark: a thin angled line pair over a soft wide underlay
 * pair (layered-View glow — Android renders no shadowRadius blur, so the
 * "blur" is a fatter line at low opacity).
 */
const SigilMark: React.FC<{ line: string; glow: string }> = ({ line, glow }) => (
  <View style={styles.sigilBox} pointerEvents="none">
    <View style={[styles.sigilLine, styles.sigilGlowLeft, { backgroundColor: glow }]} />
    <View style={[styles.sigilLine, styles.sigilGlowRight, { backgroundColor: glow }]} />
    <View style={[styles.sigilLine, styles.sigilCrispLeft, { backgroundColor: line }]} />
    <View style={[styles.sigilLine, styles.sigilCrispRight, { backgroundColor: line }]} />
  </View>
);

/** One slow-rising dust mote (full-attunement rooms only; motion-gated). */
const DustMote: React.FC<{ left: string; delay: number; duration: number; color: string }> = ({
  left,
  delay,
  duration,
  color,
}) => {
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(rise, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rise, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, duration, rise]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.dustMote,
        {
          left: left as `${number}%`,
          backgroundColor: color,
          opacity: rise.interpolate({ inputRange: [0, 0.2, 0.75, 1], outputRange: [0, 0.35, 0.25, 0] }),
          transform: [
            { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) },
          ],
        },
      ]}
    />
  );
};

interface RoomViewProps {
  room: Room;
  animal: Animal | null;
  width: number;
  height: number;
  onAnimalPress: (animal: Animal) => void;
  onRoomPress: (room: Room) => void;
  currentPhase: DialoguePhase;
  isAnimalOnCooldown?: boolean;
  cooldownPuzzlesLeft?: number;
  isRoomUpgraded?: boolean;
  /** Tier-2 deepening purchased — wall sigils + a richer interior wash. */
  isDeepened?: boolean;
  /** Tier-3 attunement level (0..3) — scales glow, sigils, and dust motes. */
  attunementLevel?: number;
  /** Total investment 0..1 (see computeEmbellishmentIntensity). */
  embellishmentIntensity?: number;
  ritualWords?: string[];
  unlockCost?: number | null;
  amberBalance?: number;
  inviteCost?: number | null;
  // Hide the in-room "Invite" chip while the invite prompt modal is open
  // (the modal already offers the invite action; the chip would otherwise
  // peek through the translucent scrim and read as a doubled surface).
  suppressInviteChip?: boolean;
}

export const RoomView: React.FC<RoomViewProps> = React.memo(({
  room,
  animal,
  width,
  height,
  onAnimalPress,
  onRoomPress,
  currentPhase,
  isAnimalOnCooldown = false,
  cooldownPuzzlesLeft,
  isRoomUpgraded = false,
  isDeepened = false,
  attunementLevel = 0,
  embellishmentIntensity = 0,
  ritualWords = [],
  unlockCost = null,
  amberBalance = 0,
  inviteCost = null,
  suppressInviteChip = false,
}) => {
  const themeColors = ROOM_THEME_COLORS[room.theme];
  const embellish = getEmbellishmentVisuals(
    isRoomUpgraded,
    isDeepened,
    attunementLevel,
    embellishmentIntensity > 0 ? embellishmentIntensity : undefined
  );
  const sigilColors = getSigilColors(currentPhase);
  // Room-appropriate tier-1 glow (fire only in real hearth rooms).
  const glowVariant = getRoomGlowVariant(room.theme);
  // Decorative-layer motion gate (breathing glow, motes). The layers still
  // render statically under reduced motion; only the movement is skipped.
  const embellishMotion = !getSettingsSync().reducedMotion && !shouldSimplifyAnimations();

  if (!room.isUnlocked) {
    // Locked room: an "unbuilt" painterly interior (timber studs, a shuttered
    // window, a draped dust sheet) instead of a flat gray box, with the cost
    // chip on the established cottage NineSlice card (F30). The house's phase
    // scrim (bodyRoomScrim in HouseWorld) darkens it for free.
    const lockedSkin = getPixelSkin(currentPhase);
    const affordable = unlockCost !== null && amberBalance >= unlockCost;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.container,
          styles.lockedRoom,
          { width, height },
          pressed && styles.pressed,
        ]}
        onPress={() => onRoomPress(room)}
        accessibilityRole="button"
        accessibilityLabel={
          unlockCost !== null
            ? `Build ${room.name} for ${unlockCost} amber`
            : `Unlock ${room.name}`
        }
      >
        {/* Unbuilt interior: framing studs + cross-beam, a shuttered window,
            and a draped dust sheet — a room mid-construction, not cardboard. */}
        <View style={styles.unbuiltInterior} pointerEvents="none" importantForAccessibility="no-hide-descendants">
          <View style={[styles.stud, { left: '16%' }]} />
          <View style={[styles.stud, { left: '38%' }]} />
          <View style={[styles.stud, { left: '60%' }]} />
          <View style={[styles.stud, { left: '82%' }]} />
          <View style={styles.crossBeam} />
          <View style={styles.crossBeamLow} />
          {/* Shuttered window (a boarded-up opening) */}
          <View style={styles.shutterWindow}>
            <View style={styles.shutterSlat} />
            <View style={styles.shutterSlat} />
            <View style={styles.shutterSlat} />
          </View>
          {/* Draped dust sheet over the near corner */}
          <View style={styles.dustSheet} />
          <View style={styles.dustSheetFold} />
        </View>
        {/* Soft inner shade so the interior reads as an unlit, unfinished space */}
        <View style={styles.unbuiltShade} pointerEvents="none" />

        {/* Cost chip on a cottage card (mirrors the invite chip). box-none so
            only the card catches taps; the Pressable owns the action. */}
        <View style={styles.lockedCardWrap} pointerEvents="box-none">
          <View style={styles.lockedCard}>
            <NineSliceFrame
              skin={lockedSkin.card}
              cornerDp={CARD_CORNER_DP}
              edgeDp={CARD_EDGE_DP}
              fillColor={lockedSkin.fillCard}
            />
            <Image source={LOCK_ICON} style={styles.lockIconImg} />
            <Text style={[styles.lockedCardName, { color: lockedSkin.ink.primary }]} numberOfLines={1}>
              {room.name}
            </Text>
            {unlockCost !== null ? (
              <>
                <View style={styles.lockedCostRow}>
                  <Text style={[styles.lockedCostLabel, { color: lockedSkin.ink.secondary }]}>Build</Text>
                  <Image source={AMBER_ICON} style={styles.lockedCostGem} />
                  <Text style={[styles.lockedCostAmount, { color: lockedSkin.ink.primary }]}>{unlockCost}</Text>
                </View>
                {affordable ? (
                  <Text style={[styles.lockedCardSub, styles.lockedCardSubAffordable]}>Tap to build</Text>
                ) : (
                  <View style={styles.lockedBalanceRow}>
                    <Text style={[styles.lockedCardSub, { color: lockedSkin.ink.quiet }]}>You:</Text>
                    <Image source={AMBER_ICON} style={styles.lockedBalanceGem} />
                    <Text style={[styles.lockedCardSub, { color: lockedSkin.ink.quiet }]}>{amberBalance}</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={[styles.lockedCardSub, { color: lockedSkin.ink.secondary }]}>Tap to unlock</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          backgroundColor: themeColors.bg,
        },
      ]}
    >
      {/* Room background image (falls back to backgroundColor on load failure) */}
      {ROOM_BACKGROUNDS[room.theme] && (
        <Image
          source={ROOM_BACKGROUNDS[room.theme]}
          style={styles.backgroundImage}
          resizeMode="cover"
          onError={() => {/* Falls back to themeColors.bg */}}
        />
      )}

      {/* Phase-appropriate window: recolor just the window sky to match the
          current sky. tintColor paints the mask's window shape; resizeMode
          cover matches the background so it aligns. Mullions/curtains stay. */}
      {(() => {
        const mask = ROOM_WINDOW_MASKS[room.theme];
        const tint = WINDOW_TINT[currentPhase] ?? WINDOW_TINT[0];
        if (!mask || tint.opacity <= 0) return null;
        return (
          <Image
            source={mask}
            style={[styles.backgroundImage, { tintColor: tint.color, opacity: tint.opacity }]}
            resizeMode="cover"
          />
        );
      })()}

      {/* In-world investment layers (tier-1 hearth glow / tier-2 sigils and
          wash / tier-3 scaling + motes). Behind the frame, animal, and
          nameplate; entirely decorative and non-interactive. */}
      {(embellish.showHearthGlow || embellish.sigilCount > 0 || embellish.deepTintOpacity > 0) && (
        <View
          style={styles.embellishOverlay}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
        >
          {embellish.deepTintOpacity > 0 && (
            <View
              style={[
                styles.embellishFill,
                { backgroundColor: sigilColors.glow, opacity: embellish.deepTintOpacity },
              ]}
            />
          )}
          {embellish.showHearthGlow && (
            <EmbellishmentGlow
              variant={glowVariant}
              maxOpacity={embellish.glowMaxOpacity}
              scale={embellish.glowScale}
              animate={embellishMotion}
            />
          )}
          {SIGIL_SPOTS.slice(0, embellish.sigilCount).map((spot, i) => (
            <View
              key={`sigil-${i}`}
              style={[
                styles.sigilSpot,
                {
                  top: spot.top as `${number}%`,
                  ...(spot.left ? { left: spot.left as `${number}%` } : null),
                  ...(spot.right ? { right: spot.right as `${number}%` } : null),
                },
              ]}
            >
              <SigilMark line={sigilColors.line} glow={sigilColors.glow} />
            </View>
          ))}
          {embellish.showMotes && embellishMotion && (
            <>
              <DustMote left="22%" delay={0} duration={5200} color="#FFE9C4" />
              <DustMote left="44%" delay={1700} duration={6400} color="#FFE9C4" />
              <DustMote left="63%" delay={800} duration={5800} color="#F5D9EE" />
              <DustMote left="80%" delay={2600} duration={7000} color="#FFE9C4" />
            </>
          )}
        </View>
      )}

      {/* Room frame */}
      <View style={[styles.frame, { borderColor: themeColors.accent }]} />

      {/* Room name plate — the wooden cottage PixelPlaque (matching the dialogue
          nameplates), compact-scaled to sit proportionately in the small room.
          Phase-aware wood: bright cottage -> dusk -> storm -> charred -> mauve. */}
      <View style={styles.namePlate}>
        <PixelPlaque phase={currentPhase} label={room.name} scale={ROOM_PLAQUE_SCALE} />
        {/* Procedural ornament row: one warm lantern pip per investment step
            (tier-1 + each attunement level). Replaces the old lone glyph. */}
        {embellish.namePips > 0 && (
          <View style={styles.pipRow} importantForAccessibility="no-hide-descendants">
            {Array.from({ length: embellish.namePips }).map((_, i) => (
              <View key={`pip-${i}`} style={styles.pip} />
            ))}
          </View>
        )}
      </View>

      {/* Occupant name tag — a SUBORDINATE tag, not a second room sign.
          Three changes separate it from the room's own sign, which it used to
          be a near-twin of: it is 0.65 its height (via the plaque's fontScale,
          so the wood could shrink without the type going with it), it hangs in
          the bottom-LEFT corner instead of on the centre axis the sign already
          owns, and it sits BEHIND the sprite (see animalPlate's zIndex) so an
          animal that wanders across its own tag passes in FRONT of it. That
          last one is the actual fix for "blocks the animation": the tag can no
          longer cover the animal, only be covered by it, which reads as depth.

          It stays on plaque wood deliberately. Bare type over 13 room
          backgrounds x 6 phases is a contrast gamble with no audited ink pair;
          the plaque's wood/ink is pinned >= 4.5:1 per skin in
          pixelSkinContrast.test.ts, and that is the only surface in the room
          where a label is guaranteed readable.

          DECORATIVE for screen readers: the animal's touchable is the single
          focusable element and already announces the name and resting state. */}
      {animal && animal.isUnlocked && (
        <View
          style={[styles.animalPlate, isAnimalOnCooldown && styles.animalPlateResting]}
          pointerEvents="none"
          // Both platforms: importantForAccessibility is Android-only and
          // accessibilityElementsHidden is iOS-only, so hiding on one alone
          // would let VoiceOver announce the name a second time.
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {/* The resting countdown rides INSIDE the wood rather than floating
              above it, and this tag is its only visual surface (elsewhere the
              number exists just in the sprite's accessibility label). The
              animal's own sleeping Z's already say "asleep"; the tag says for
              how much longer, and dims while it does. */}
          <PixelPlaque
            phase={currentPhase}
            label={
              isAnimalOnCooldown && cooldownPuzzlesLeft != null && cooldownPuzzlesLeft > 0
                ? `${animal.name} · ${cooldownPuzzlesLeft}`
                : animal.name
            }
            scale={ANIMAL_PLAQUE_SCALE}
            fontScale={ANIMAL_PLAQUE_FONT_SCALE}
          />
        </View>
      )}

      {/* Animal if present and unlocked */}
      {animal && animal.isUnlocked && (
        <AnimalSprite
          animal={animal}
          roomWidth={width}
          roomHeight={height}
          onPress={onAnimalPress}
          currentPhase={currentPhase}
          isOnCooldown={isAnimalOnCooldown}
          cooldownPuzzlesLeft={cooldownPuzzlesLeft}
        />
      )}

      {/* Empty room waiting for animal - show invite chip.
          Centered by an absolute-fill wrapper (box-none: only the chip itself
          is tappable) instead of hand-tuned translate offsets, so it stays
          truly centered whatever size the chip renders at. */}
      {animal && !animal.isUnlocked && !suppressInviteChip && (() => {
        const chip = getInviteChipContent(inviteCost, amberBalance);
        const inviteSkin = getPixelSkin(currentPhase);
        return (
          <View style={styles.inviteCenterWrap} pointerEvents="box-none">
            <Pressable
              style={({ pressed }) => [pressed && styles.pressed]}
              onPress={() => onRoomPress(room)}
              accessibilityRole="button"
              accessibilityLabel={getInviteAccessibilityLabel(room.name, inviteCost)}
            >
              <View style={styles.inviteAnimalBadge}>
                {/* Cottage card-frame chrome (replaces the flat white webby chip) */}
                <NineSliceFrame
                  skin={inviteSkin.card}
                  cornerDp={CARD_CORNER_DP}
                  edgeDp={CARD_EDGE_DP}
                  fillColor={inviteSkin.fillCard}
                />
                {chip.kind === 'cost' ? (
                  <View style={styles.inviteCostRow}>
                    <Text style={styles.inviteAnimalText}>{chip.label}</Text>
                    <Image source={AMBER_ICON} style={styles.inviteCostGem} />
                    <Text style={styles.inviteCostAmount}>{chip.cost}</Text>
                  </View>
                ) : (
                  <Text style={styles.inviteAnimalText}>{chip.label}</Text>
                )}
                {chip.kind === 'cost' && (
                  chip.affordable ? (
                    <Text style={[styles.inviteAnimalCostSubtext, styles.inviteSubtextAffordable]}>
                      Tap to welcome
                    </Text>
                  ) : (
                    <View style={styles.inviteBalanceRow}>
                      <Text style={styles.inviteAnimalCostSubtext}>You:</Text>
                      <Image source={AMBER_ICON} style={styles.inviteBalanceGem} />
                      <Text style={styles.inviteAnimalCostSubtext}>{amberBalance}</Text>
                    </View>
                  )
                )}
              </View>
            </Pressable>
          </View>
        );
      })()}

      {/* Word Echo Overlay - ritual words faintly inscribed in rooms */}
      {currentPhase >= 2 && ritualWords.length > 0 && (() => {
        const config = WORD_ECHO_CONFIG[currentPhase] || WORD_ECHO_CONFIG[2];
        const offset = (room.floor * 7) % Math.max(1, ritualWords.length);
        const words: string[] = [];
        for (let i = 0; i < config.count && i < ritualWords.length; i++) {
          words.push(ritualWords[(offset + i * 3) % ritualWords.length]);
        }
        return (
          <View style={styles.wordEchoOverlay} pointerEvents="none">
            {words.map((word, i) => {
              const pos = WORD_ECHO_POSITIONS[i % WORD_ECHO_POSITIONS.length];
              return (
                <Text
                  key={`echo-${i}`}
                  style={[
                    styles.wordEchoText,
                    {
                      top: pos.top as any,
                      left: pos.left as any,
                      transform: [{ rotate: pos.rotate }],
                      opacity: config.opacity,
                      fontSize: config.fontSize,
                      color: config.color,
                    },
                  ]}
                >
                  {word}
                </Text>
              );
            })}
          </View>
        );
      })()}
    </View>
  );
}) as React.FC<RoomViewProps>;
RoomView.displayName = 'RoomView';

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  pressed: {
    opacity: 0.75,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  frame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 4,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  // Positioning wrapper only — the wooden PixelPlaque owns the frame now (the
  // old flat dark chip bg/border/padding are gone). Sits near the top of the
  // room and centers the plaque + its pip ornament row.
  namePlate: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
    alignItems: 'center',
    maxWidth: '96%',
  },
  // Occupant tag, hung in the room's bottom-LEFT corner. Left, not centred, so
  // it never sits on the axis the room's own sign owns (two centred wooden
  // labels at opposite ends of the same small room is the canonical "two peers"
  // reading, which is exactly what players reported). zIndex 2 keeps it UNDER
  // AnimalSprite's container (10), reversing the old 12: the animal now walks
  // in FRONT of its own tag. A tag the animal can cover is depth; a tag that
  // covers the animal is the clutter this replaced.
  animalPlate: {
    position: 'absolute',
    bottom: 2,
    left: 6,
    maxWidth: '62%',
    zIndex: 2,
  },
  animalPlateResting: {
    opacity: 0.62,
  },
  // Nameplate ornament row: tiny warm lantern pips (procedural, not emoji).
  pipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  pip: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD27A',
  },
  // ---- In-world investment layers ----
  embellishOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  embellishFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Embellishment glow: a stack of feathered ovals (core brightest). Colors are
  // set per-room at the call site (variant fill); the anchor variant places the
  // wrap at the floor (hearth/undergrowth) or ambient center.
  glowWrap: {
    position: 'absolute',
    alignSelf: 'center',
    width: 120,
    height: 70,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // Back down on the floor where a hearth glow belongs. It was lifted to 26 to
  // clear the occupant's wooden plate, which sat centred over the glow's
  // brightest core — and that glow is a purchased amber sink whose entire
  // purpose is visible investment. The caption that replaced the plate is
  // left-anchored and behind, so the centre is clear again.
  glowWrapBottom: {
    bottom: 4,
  },
  glowWrapCenter: {
    top: '34%',
  },
  glowOuter: {
    position: 'absolute',
    bottom: 0,
    width: 120,
    height: 64,
    borderRadius: 999,
  },
  glowMid: {
    position: 'absolute',
    bottom: 6,
    width: 82,
    height: 44,
    borderRadius: 999,
  },
  glowCore: {
    position: 'absolute',
    bottom: 12,
    width: 48,
    height: 26,
    borderRadius: 999,
  },
  // Deepening sigils: thin angled line pair + a fatter low-opacity underlay
  // pair standing in for blur (Android-safe: no shadowRadius glow).
  sigilSpot: {
    position: 'absolute',
  },
  // The line pair is anchored with explicit `left` values (box is 22 wide:
  // crisp 2px lines centered at 7/15, their 7px glow underlays center-aligned
  // beneath them) — no translate offsets (the invite-chip centering pin bans
  // hardcoded translates in this file).
  sigilBox: {
    width: 22,
    height: 22,
    opacity: 0.5,
  },
  sigilLine: {
    position: 'absolute',
    top: 1,
    height: 20,
    borderRadius: 1,
  },
  sigilCrispLeft: {
    left: 6,
    width: 2,
    transform: [{ rotate: '24deg' }],
  },
  sigilCrispRight: {
    left: 14,
    width: 2,
    transform: [{ rotate: '-24deg' }],
  },
  sigilGlowLeft: {
    left: 3.5,
    width: 7,
    borderRadius: 3,
    opacity: 0.22,
    transform: [{ rotate: '24deg' }],
  },
  sigilGlowRight: {
    left: 11.5,
    width: 7,
    borderRadius: 3,
    opacity: 0.22,
    transform: [{ rotate: '-24deg' }],
  },
  dustMote: {
    position: 'absolute',
    bottom: '24%',
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  // Warm dark timber base for the unbuilt room (never flat gray cardboard).
  lockedRoom: {
    backgroundColor: '#4A3826',
  },
  // ---- Unbuilt (under-construction) interior ----
  unbuiltInterior: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: 8,
  },
  // Vertical framing studs (raw timber).
  stud: {
    position: 'absolute',
    top: '8%',
    width: 7,
    height: '84%',
    backgroundColor: '#5E4931',
    borderRadius: 1,
  },
  crossBeam: {
    position: 'absolute',
    top: '22%',
    left: '6%',
    right: '6%',
    height: 6,
    backgroundColor: '#6B5238',
    borderRadius: 1,
  },
  crossBeamLow: {
    position: 'absolute',
    top: '68%',
    left: '6%',
    right: '6%',
    height: 6,
    backgroundColor: '#5A4530',
    borderRadius: 1,
  },
  // A boarded / shuttered window opening.
  shutterWindow: {
    position: 'absolute',
    top: '30%',
    right: '12%',
    width: 40,
    height: 30,
    backgroundColor: '#2E2416',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#6B5238',
    justifyContent: 'space-evenly',
    paddingVertical: 3,
  },
  shutterSlat: {
    height: 4,
    marginHorizontal: 3,
    backgroundColor: '#7A5E3E',
    borderRadius: 1,
  },
  // A draped dust sheet over the near corner.
  dustSheet: {
    position: 'absolute',
    bottom: '6%',
    left: '8%',
    width: 66,
    height: 40,
    backgroundColor: '#C9BFA8',
    opacity: 0.5,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 8,
    transform: [{ rotate: '-6deg' }],
  },
  dustSheetFold: {
    position: 'absolute',
    bottom: '6%',
    left: '30%',
    width: 30,
    height: 34,
    backgroundColor: '#B7AC93',
    opacity: 0.5,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 14,
    transform: [{ rotate: '4deg' }],
  },
  unbuiltShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 6, 2, 0.34)',
    borderRadius: 8,
  },
  // ---- Locked cottage cost card (mirrors the invite chip) ----
  lockedCardWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedCard: {
    minWidth: 108,
    minHeight: 58,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  lockIconImg: {
    width: 18,
    height: 18,
    marginBottom: 2,
  },
  lockedCardName: {
    fontFamily: BODY_FONT_BOLD,
    fontSize: FONT_SIZE.small,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: 130,
  },
  lockedCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  lockedCostLabel: {
    fontFamily: BODY_FONT_BOLD,
    fontSize: FONT_SIZE.caption,
    fontWeight: '700',
  },
  lockedCostGem: {
    width: 14,
    height: 14,
    marginLeft: 5,
    marginRight: 3,
  },
  lockedCostAmount: {
    fontFamily: BODY_FONT_BOLD,
    fontSize: FONT_SIZE.small,
    fontWeight: '800',
  },
  lockedCardSub: {
    fontFamily: BODY_FONT_BOLD,
    fontSize: FONT_SIZE.micro,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  lockedCardSubAffordable: {
    color: CandyColors.green.shadow,
  },
  lockedBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  lockedBalanceGem: {
    width: 11,
    height: 11,
    marginLeft: 4,
    marginRight: 3,
  },
  // Invite chip: absolute-fill wrapper centers the chip in the room without
  // hardcoded offsets; box-none keeps touches limited to the chip itself.
  inviteCenterWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Cottage card-frame chip: the wood-and-parchment chrome comes from the
  // NineSliceFrame; content must clear the 12dp card wood band, so the padding
  // is generous. No white bg / gold border — the pixel frame owns the edge.
  inviteAnimalBadge: {
    minWidth: 104,
    minHeight: 58,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  // Action line: "Invite [gem] 100" as an explicit row so the 16px gem and
  // the bold amount share one baseline with a fixed 4px gap.
  inviteCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteCostGem: {
    width: 16,
    height: 16,
    marginLeft: 5,
    marginRight: 4,
  },
  inviteCostAmount: {
    fontFamily: BODY_FONT_BOLD,
    color: CandyColors.purple.main,
    fontSize: FONT_SIZE.small,
    fontWeight: '800',
  },
  inviteAnimalText: {
    fontFamily: BODY_FONT_BOLD,
    color: CandyColors.purple.main,
    fontSize: FONT_SIZE.small,
    fontWeight: '800',
    textAlign: 'center',
  },
  // Dimmed balance line: "You: [gem] 30" with the same gap treatment (12px gem).
  inviteBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  inviteBalanceGem: {
    width: 12,
    height: 12,
    marginLeft: 4,
    marginRight: 4,
  },
  inviteAnimalCostSubtext: {
    fontFamily: BODY_FONT_BOLD,
    color: CandyColors.gray[600],
    fontSize: FONT_SIZE.micro,
    fontWeight: '700',
    textAlign: 'center',
  },
  inviteSubtextAffordable: {
    marginTop: 3,
    color: CandyColors.green.shadow,
  },
  // Word echo overlay - ritual words inscribed in rooms
  wordEchoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  wordEchoText: {
    fontFamily: BODY_FONT_BOLD,
    position: 'absolute',
    fontWeight: '700',
    letterSpacing: 2,
  },
});

export default RoomView;
