import React, { useEffect, useState } from 'react';
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
import {
  ROOM_THEME_COLORS,
  getLockedRoomCardSub,
  getReservedArrivalText,
  getReserveGateText,
  getDescentTrioNotReadyText,
} from '../../services/homeWorldData';
import { AnimalSprite } from './AnimalSprite';
import { CandyColors } from '../../theme/colors';
import { FONT_SIZE } from '../../theme/typeScale';
import { getPixelSkin, CARD_CORNER_DP, CARD_EDGE_DP, PLAQUE_H_DP } from '../../theme/pixelSkin.generated';
import { NineSliceFrame } from '../ui/NineSlice';
import { PixelPlaque } from '../ui/PixelPlaque';
import { CHROME_ICONS } from '../ui/chromeIcons';
import { BODY_FONT_BOLD } from '../../theme/fonts';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';
import { getRoomUpgradeArt } from '../shop/shopArt';
import {
  getRoomUpgradeScene, ROOM_ART_WIDTH, ROOM_ART_HEIGHT,
  RoomUpgradeProp, RoomLightSource,
} from './roomUpgradeVisuals';

// Room name plate scale: the full 42dp PixelPlaque would swamp a ~123dp room,
// so the wooden nameplate is uniformly scaled to ~29dp tall / ~9.5dp font — big
// enough to read the room name, small enough to sit as a tidy label at the top.
export const ROOM_PLAQUE_SCALE = 0.68;

// The opaque central sign ends at 32.56dp. Room art below it stays clear;
// raised lanterns can hang higher beside the sign's left and right edges.
const NAME_PLATE_TOP_DP = 4;
export const ROOM_SIGN_BOTTOM_DP = NAME_PLATE_TOP_DP + PLAQUE_H_DP * ROOM_PLAQUE_SCALE;

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
  5: { color: '#453F64', opacity: 0.78 }, // After: moonlit mauve, still a night outside
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

// Purchased objects carry the visible reward. Light stays local to the room's
// actual source, so full investment never paints over its furniture or animal.
export const GLOW_OPACITY_CAP = 0.38;
export const GLOW_OPACITY_BOOST_CAP = 0.48;
export const GLOW_SCRIM_BOOST_MAX = 1.6;

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
  /**
   * Light strength: 0.26 for a decoration, 0.38 at full investment.
   * Feathered contours share this opacity instead of stacking opaque fills.
   * Host scrim compensation is capped at GLOW_OPACITY_BOOST_CAP.
   */
  glowMaxOpacity: number;
  /** The decoration's own object, drawn in the room (tier 1). */
  showDecorationProp: boolean;
  /** The deepening's altered object or environmental effect (tier 2). */
  showDeepeningProp: boolean;
  /** Glow stack scale — steps up with each attunement level. */
  glowScale: number;
  /** Warm pips on the nameplate: 1 for tier-1 + 1 per attunement level. */
  namePips: number;
  /** Wall sigil marks: 1 for the deepening + 1 per attunement level (max 4). */
  sigilCount: number;
  /** Richer interior wash once deepened (phase-colored, very low opacity). */
  deepTintOpacity: number;
  /** Floating dust motes at full attunement ONLY (six, motion-gated). */
  showMotes: boolean;
}

export const getEmbellishmentVisuals = (
  isUpgraded: boolean,
  isDeepened: boolean,
  attunementLevel: number,
  /** 0..1 intensity; defaults to the local mirror of the service math. */
  intensityIn?: number,
  /**
   * HouseWorld paints a phase scrim OVER every room (7% dusk, 22% storm,
   * 27% shadow) and the warm glow sits under it. Multiplying by
   * 1 / (1 - scrim) makes the perceived glow roughly phase-invariant; the
   * host passes it in so this file never mirrors the tint table.
   */
  scrimBoost = 1,
): EmbellishmentVisuals => {
  const level = Math.min(Math.max(attunementLevel, 0), 3);
  const intensity = Math.min(
    1,
    Math.max(0, intensityIn ?? computeEmbellishmentIntensity(isUpgraded, isDeepened, level))
  );
  const boost = Math.min(GLOW_SCRIM_BOOST_MAX, Math.max(1, Number.isFinite(scrimBoost) ? scrimBoost : 1));
  const baseGlow = Math.min(GLOW_OPACITY_CAP, 0.22 + intensity * 0.16);
  return {
    showHearthGlow: isUpgraded,
    glowMaxOpacity: Math.min(GLOW_OPACITY_BOOST_CAP, baseGlow * boost),
    showDecorationProp: isUpgraded,
    showDeepeningProp: isUpgraded && isDeepened,
    glowScale: 1 + level * 0.055,
    namePips: isUpgraded ? Math.min(4, 1 + level) : 0,
    sigilCount: isUpgraded ? Math.min(4, (isDeepened ? 1 : 0) + level) : 0,
    deepTintOpacity: isUpgraded && isDeepened ? 0.045 : 0,
    showMotes: isUpgraded && level >= 3,
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


/**
 * The room painting supplies its objects and light sources. These shallow
 * recesses and floor reflections make the cutaway read as a space inside the
 * timber, with the animal standing in front of it. Investment glows above this
 * layer keep their own brighter, animated treatment.
 */
const RoomDepthLighting: React.FC<{ theme: RoomTheme; phase: DialoguePhase }> = ({
  theme, phase,
}) => {
  const variant = getRoomGlowVariant(theme);
  const after = phase >= 5;
  const night = phase >= 3;
  const recess = night ? '#080B18' : '#392919';
  const layers = shouldSimplifyAnimations() ? [1] : [1, 0.62, 0.3];
  return (
    <View pointerEvents="none" style={styles.depthLighting}
      importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {layers.map((weight, i) => (
        <React.Fragment key={'recess-' + i}>
          <View style={{
            position: 'absolute', top: 4 + i * 5, left: 4, right: 4,
            height: 5, backgroundColor: recess,
            opacity: (night ? 0.22 : 0.14) * weight,
          }} />
          <View style={{
            position: 'absolute', top: 4, bottom: 4, left: 4 + i * 3,
            width: 3, backgroundColor: recess, opacity: 0.16 * weight,
          }} />
          <View style={{
            position: 'absolute', top: 4, bottom: 4, right: 4 + i * 3,
            width: 3, backgroundColor: recess, opacity: 0.2 * weight,
          }} />
        </React.Fragment>
      ))}
      <View style={[styles.floorReflection, {
        backgroundColor: variant.core,
        opacity: after ? 0.11 : night ? 0.085 : 0.055,
      }]} />
      <View style={[styles.floorRecess, {
        backgroundColor: recess, opacity: night ? 0.24 : 0.17,
      }]} />
      <View style={[styles.floorLip, {
        backgroundColor: variant.core, opacity: after ? 0.3 : 0.2,
      }]} />
    </View>
  );
};


/**
 * Objects that have already settled into place THIS SESSION. RoomView
 * remounts on every trip home (HomeScreen unmounts on navigation), so the
 * settle-in spring keys on a module-scope set instead of mount state: the
 * piece lands once, the first time the player sees it, and is simply there on
 * every later visit. Cleared only by a cold start, on purpose.
 */
const settledRoomProps = new Set<string>();

/** The room painting's surfaces, rather than the store icon's framing. */
const RoomPropPaint: React.FC<{ prop: RoomUpgradeProp; roomId: string }> = ({ prop, roomId }) => {
  if (prop.kind === 'art') {
    const source = getRoomUpgradeArt(roomId, prop.tier);
    return source ? <>
      {prop.id.startsWith('pot-') && <View style={styles.potHook} />}
      <Image source={source} style={styles.roomPropImage} resizeMode="contain" />
    </> : null;
  }
  switch (prop.kind) {
    case 'hearthstone':
      return <View style={styles.carvedStone}>
        <View style={styles.stoneHighlight} /><View style={styles.stoneCarving} /><View style={styles.stoneCarvingReturn} />
        <View style={styles.stoneSeam} />
      </View>;
    case 'mantel':
      return <>
        <View style={styles.mantelReturn}><View style={styles.mantelHighlight} /></View>
        <View style={styles.ashenMantel}>
          <View style={styles.mantelHighlight} /><View style={styles.mantelJoint} />
        </View>
      </>;
    case 'salt':
      return <><View style={styles.saltRing} /><View style={styles.saltRingInner} /></>;
    case 'water':
      return <>{[0, 1, 2].map(i => <View key={i} style={{
        position: 'absolute', top: i * 4, left: `${i * 7}%`, right: `${(2 - i) * 9}%`,
        height: 1, backgroundColor: '#CAE9E3', opacity: 0.24 - i * 0.035,
      }} />)}</>;
    case 'floorLamp':
      return <>
        <View style={styles.lampStem} /><View style={styles.lampStemHighlight} />
        <View style={styles.lampShadeTop} /><View style={styles.lampShade} />
        <View style={styles.lampShadeEdge} /><View style={styles.lampBase} />
      </>;
    case 'shadow':
      return <><View style={styles.secondShadowLong} /><View style={styles.secondShadowShort} /></>;
    case 'chalk':
      return <>{[0, 1, 2, 3].map(i => <View key={i} style={{
        position: 'absolute', left: `${i * 25}%`, top: i % 2, width: 5, height: 5,
        borderWidth: 1, borderRadius: 3, borderColor: '#D9D3AF', opacity: 0.7,
      }} />)}</>;
    case 'resonance':
      // The bell is above this workshop, out of frame. The bronze pull cord
      // and quiet echoes reach down from the beam; no second bell appears.
      return <>
        <View style={styles.bellCord} /><View style={styles.bellCordGrip} />
        {[0, 1].map(i => <View key={i} style={{
          position: 'absolute', left: i === 0 ? 1 : 19, top: 5, width: 6, height: 13,
          borderLeftWidth: i === 0 ? 1 : 0, borderRightWidth: i === 1 ? 1 : 0,
          borderRadius: 6, borderColor: '#C2A570', opacity: 0.5,
        }} />)}
      </>;
  }
};

/** Physical contact shadows belong only beneath standing / tabletop objects. */
const RoomProp: React.FC<{
  prop: RoomUpgradeProp;
  roomId: string;
  scaleX: number;
  scaleY: number;
  animate: boolean;
}> = ({ prop, roomId, scaleX, scaleY, animate }) => {
  const settleKey = `${roomId}:${prop.id}`;
  const [firstAppearance] = useState(() => animate && !settledRoomProps.has(settleKey));
  const [settle] = useState(() => new Animated.Value(firstAppearance ? 0 : 1));
  useEffect(() => {
    settledRoomProps.add(settleKey);
    if (!firstAppearance || !animate) {
      settle.setValue(1);
      return;
    }
    const spring = Animated.spring(settle, { toValue: 1, friction: 8, tension: 75, useNativeDriver: true });
    spring.start();
    return () => spring.stop();
  }, [animate, firstAppearance, settle, settleKey]);
  const contact = (prop.surface === 'floor' || prop.surface === 'table')
    && (prop.kind === 'art' || prop.kind === 'floorLamp' || prop.kind === 'hearthstone');
  return (
    <Animated.View testID={`room-upgrade-${roomId}-${prop.id}`} pointerEvents="none" style={[styles.roomProp, {
      left: prop.left * scaleX, top: prop.top * scaleY,
      width: prop.width * scaleX, height: prop.height * scaleY,
      opacity: settle.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
      transform: [{ scale: settle.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
    }]}>
      {contact && <View style={styles.roomPropShadow} />}
      <RoomPropPaint prop={prop} roomId={roomId} />
    </Animated.View>
  );
};

/**
 * The Shop's "see it in the room" handoff lands here: a one-shot flare of the
 * room's own glow register that rises to full, holds, and fades, so the eye
 * lands on the room HouseWorld just panned to. Native driver. Under reduced
 * motion it is simply lit at full and stays until the host consumes the focus
 * (an opacity that never moves is not motion).
 */
export const FOCUS_FLARE_MS = 1660;
const FocusFlare: React.FC<{ variant: RoomGlowVariant; animate: boolean }> = ({ variant, animate }) => {
  const [flare] = useState(() => new Animated.Value(animate ? 0 : 1));

  useEffect(() => {
    if (!animate) {
      flare.setValue(1);
      return;
    }
    flare.setValue(0);
    const seq = Animated.sequence([
      Animated.timing(flare, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(500),
      Animated.timing(flare, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]);
    seq.start();
    return () => seq.stop();
  }, [animate, flare]);

  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      style={[styles.focusFlare, { opacity: flare }]}
    >
      <View style={[styles.embellishFill, { backgroundColor: variant.core, opacity: 0.08 }]} />
      <View style={[styles.focusRim, { borderColor: variant.core }]} />
    </Animated.View>
  );
};

/** Eight faint contours feather a small source of light without a solid disc.
 * Low-tier devices use four contours. Both paths keep Android's native driver.
 */
const EmbellishmentGlow: React.FC<{
  variant: RoomGlowVariant;
  source: RoomLightSource;
  maxOpacity: number;
  scale: number;
  scaleX: number;
  scaleY: number;
  animate: boolean;
}> = ({ variant, source, maxOpacity, scale, scaleX, scaleY, animate }) => {
  const [breathe] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!animate) { breathe.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animate, breathe]);
  const contours = shouldSimplifyAnimations() ? 4 : 8;
  return <Animated.View pointerEvents="none" style={[styles.glowWrap, {
    left: source.left * scaleX, top: source.top * scaleY,
    width: source.width * scaleX, height: source.height * scaleY,
    opacity: animate ? breathe.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) : 1,
    transform: [{ scale }],
  }]}>
    {Array.from({ length: contours }, (_, i) => {
      const inset = i * 30 / contours;
      return <View key={i} style={{
        position: 'absolute', left: `${inset}%`, right: `${inset}%`, top: `${inset}%`, bottom: `${inset}%`,
        borderRadius: 999, backgroundColor: i < contours / 2 ? variant.outer : variant.core,
        opacity: maxOpacity * (source.strength ?? 1) * (0.55 + i * 0.07) / contours,
      }} />;
    })}
  </Animated.View>;
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

// Where a stilled mote hangs: mid-rise, on the bright plateau of the opacity
// curve below, so a motion-free room shows the dust rather than nothing.
const MOTE_REST_RISE = 0.45;

/**
 * One slow-rising 2dp dust mote (full-attunement rooms ONLY). Like every other
 * layer here it RENDERS without motion: the shop card promises drifting dust at
 * the last level, so reduced motion / a low tier stills the drift and shows the
 * mote hanging mid-rise rather than paying out nothing.
 */
const DustMote: React.FC<{
  left: string;
  delay: number;
  duration: number;
  color: string;
  animate: boolean;
}> = ({
  left,
  delay,
  duration,
  color,
  animate,
}) => {
  const [rise] = useState(() => new Animated.Value(animate ? 0 : MOTE_REST_RISE));

  useEffect(() => {
    if (!animate) {
      rise.setValue(MOTE_REST_RISE);
      return;
    }
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
  }, [animate, delay, duration, rise]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.dustMote,
        {
          left: left as `${number}%`,
          backgroundColor: color,
          opacity: rise.interpolate({ inputRange: [0, 0.2, 0.75, 1], outputRange: [0, 0.6, 0.45, 0] }),
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
  quietNotifications?: boolean;
  cooldownPuzzlesLeft?: number;
  isRoomUpgraded?: boolean;
  /** Tier-2 deepening purchased — wall sigils + a richer interior wash. */
  isDeepened?: boolean;
  /** Tier-3 attunement level (0..3) — scales glow, sigils, and dust motes. */
  attunementLevel?: number;
  /** Total investment 0..1 (see computeEmbellishmentIntensity). */
  embellishmentIntensity?: number;
  /**
   * 1 / (1 - the host's room scrim opacity), so the purchased glow reads at
   * roughly the same strength under the night scrim as in daylight. 1 = no
   * scrim. Clamped inside getEmbellishmentVisuals.
   */
  glowScrimBoost?: number;
  /**
   * This room is the target of the Shop's "see it in the room" handoff:
   * HouseWorld pans to it and this flares its glow once (FocusFlare). The
   * host clears it when the focus is consumed.
   */
  isFocusTarget?: boolean;
  ritualWords?: string[];
  unlockCost?: number | null;
  amberBalance?: number;
  /**
   * This room is the RESERVED unlock: its cost has already been spent and it
   * builds itself when its level gate opens. Without it the in-world card kept
   * advertising the price the player just paid, beside their now-depleted
   * balance — the reservation read as a failure or a double charge.
   */
  isReserved?: boolean;
  /**
   * This room cannot be built at ANY balance right now — its level gate is shut,
   * or (descent trio) the house's own weighted Phase-3 floor is. Resolved by
   * homeWorldData's `isUnlockGateBlocked`, the same predicate isUnlockAvailable
   * uses, so the card and the refusal can never disagree. The card used to say
   * "Tap to build" the moment the player could afford it, and tapping only
   * opened a modal explaining the wait.
   */
  gateBlocked?: boolean;
  /** The level this room's gate opens at (for the short card line + a11y). */
  gateMinPuzzles?: number;
  /** Solves so far: picks the BINDING wait (level board vs house) and speaks it. */
  puzzlesSolved?: number;
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
  quietNotifications = false,
  cooldownPuzzlesLeft,
  isRoomUpgraded = false,
  isDeepened = false,
  attunementLevel = 0,
  embellishmentIntensity = 0,
  glowScrimBoost = 1,
  isFocusTarget = false,
  ritualWords = [],
  unlockCost = null,
  amberBalance = 0,
  isReserved = false,
  gateBlocked = false,
  gateMinPuzzles,
  puzzlesSolved = 0,
  inviteCost = null,
  suppressInviteChip = false,
}) => {
  const themeColors = ROOM_THEME_COLORS[room.theme];
  const embellish = getEmbellishmentVisuals(
    isRoomUpgraded,
    isDeepened,
    attunementLevel,
    embellishmentIntensity > 0 ? embellishmentIntensity : undefined,
    glowScrimBoost
  );
  const upgradeScene = getRoomUpgradeScene(room.id, isRoomUpgraded, isDeepened);
  const roomScaleX = width / ROOM_ART_WIDTH;
  const roomScaleY = height / ROOM_ART_HEIGHT;
  const sigilColors = getSigilColors(currentPhase);
  const glowVariant = isDeepened && room.theme === 'cozy_den'
    ? { ...getRoomGlowVariant(room.theme), outer: '#7898AA', mid: '#A5BED0', core: '#D4DFDF' }
    : getRoomGlowVariant(room.theme);
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
    // Which of the two waits is this? A level gate the player can watch tick
    // down, or the house's own Phase-3 floor on the descent trio (which no
    // level number describes — see getLockedRoomCardSub).
    const levelGateOpen = gateMinPuzzles === undefined || puzzlesSolved >= gateMinPuzzles;
    // A reserved room is PAID: neither the price nor the balance means anything
    // about it any more, so both rows go. A gated-but-unreserved room KEEPS
    // both (they are still true) and gains the wait line beneath them — the
    // price and the balance are exactly what that player is still working on.
    const cardSub = getLockedRoomCardSub({
      reserved: isReserved,
      gateBlocked,
      minPuzzles: gateMinPuzzles,
      puzzlesSolved,
      affordable,
    });
    // Spoken, not laid out, so the a11y label uses the long-form modal copy —
    // the card's own line has to survive a 108x58dp chip.
    const lockedA11yLabel = isReserved
      ? `${room.name}. ${getReservedArrivalText(gateMinPuzzles, puzzlesSolved)}`
      : gateBlocked
        ? levelGateOpen
          ? `${room.name}. ${getDescentTrioNotReadyText()}`
          : `${room.name}. ${getReserveGateText(gateMinPuzzles, puzzlesSolved)}`
        : unlockCost !== null
          ? `Build ${room.name} for ${unlockCost} amber`
          : `Unlock ${room.name}`;
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
        accessibilityLabel={lockedA11yLabel}
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
            {isReserved ? (
              // Paid and waiting on its own gate: the carved chrome tick,
              // never a typed check glyph (the art pass retired those).
              <View style={styles.lockedReservedRow}>
                <Image source={CHROME_ICONS.check} style={styles.lockedReservedMark} accessible={false} />
                <Text style={[styles.lockedCardSub, { color: lockedSkin.ink.secondary, marginTop: 0 }]}>{cardSub}</Text>
              </View>
            ) : unlockCost !== null ? (
              <>
                <View style={styles.lockedCostRow}>
                  <Text style={[styles.lockedCostLabel, { color: lockedSkin.ink.secondary }]}>Build</Text>
                  <Image source={AMBER_ICON} style={styles.lockedCostGem} />
                  <Text style={[styles.lockedCostAmount, { color: lockedSkin.ink.primary }]}>{unlockCost}</Text>
                </View>
                {/* The balance row is about the PURSE and the wait line is
                    about the LEVEL BOARD: two independent constraints, so a
                    gated room the player also cannot yet afford has to show
                    both. Branching gate-first hid the balance — the number
                    that player is actually working on for most of the wait. */}
                {!affordable && (
                  <View style={styles.lockedBalanceRow}>
                    <Text style={[styles.lockedCardSub, { color: lockedSkin.ink.quiet }]}>You:</Text>
                    <Image source={AMBER_ICON} style={styles.lockedBalanceGem} />
                    <Text style={[styles.lockedCardSub, { color: lockedSkin.ink.quiet }]}>{amberBalance}</Text>
                  </View>
                )}
                {cardSub !== '' && (
                  <Text
                    style={[
                      styles.lockedCardSub,
                      gateBlocked
                        ? { color: lockedSkin.ink.secondary }
                        : styles.lockedCardSubAffordable,
                    ]}
                  >
                    {cardSub}
                  </Text>
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

      <RoomDepthLighting theme={room.theme} phase={currentPhase} />

      {/* Purchased objects sit on the painting's surfaces. Deepenings alter
          those objects or the room itself; light stays local to its source.
          All decoration remains behind the animal and ignores touches. */}
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
          {embellish.showHearthGlow && upgradeScene.light && (
            <EmbellishmentGlow
              variant={glowVariant}
              source={upgradeScene.light}
              scaleX={roomScaleX}
              scaleY={roomScaleY}
              maxOpacity={embellish.glowMaxOpacity}
              scale={embellish.glowScale}
              animate={embellishMotion}
            />
          )}
          {upgradeScene.marks.slice(0, embellish.sigilCount).map((spot, i) => (
            <View key={`sigil-${i}`} style={[styles.sigilSpot, {
              top: spot.top * roomScaleY, left: spot.left * roomScaleX,
            }]}>
              <SigilMark line={sigilColors.line} glow={sigilColors.glow} />
            </View>
          ))}
          {upgradeScene.props.map(prop => (
            <RoomProp key={prop.id} prop={prop} roomId={room.id}
              scaleX={roomScaleX} scaleY={roomScaleY} animate={embellishMotion} />
          ))}
          {embellish.showMotes && (
            <>
              <DustMote left="20%" delay={0} duration={5200} color="#FFE9C4" animate={embellishMotion} />
              <DustMote left="33%" delay={3100} duration={6800} color="#F5D9EE" animate={embellishMotion} />
              <DustMote left="46%" delay={1700} duration={6400} color="#FFE9C4" animate={embellishMotion} />
              <DustMote left="58%" delay={800} duration={5800} color="#F5D9EE" animate={embellishMotion} />
              <DustMote left="70%" delay={3900} duration={6100} color="#FFE9C4" animate={embellishMotion} />
              <DustMote left="82%" delay={2600} duration={7000} color="#FFE9C4" animate={embellishMotion} />
            </>
          )}
        </View>
      )}

      {/* Shop handoff: flare this room's own light once so the eye lands
          here after the pan. Above the investment layers, still behind the
          frame and the animal. */}
      {isFocusTarget && <FocusFlare variant={glowVariant} animate={embellishMotion} />}

      {/* Room frame */}
      <View pointerEvents="none" style={[styles.frame, {
        borderColor: themeColors.accent,
        borderTopColor: currentPhase >= 3 ? '#96856C' : '#D4B684',
        borderBottomColor: currentPhase >= 3 ? '#302839' : '#5A4028',
      }]} />
      <View pointerEvents="none" style={styles.innerBevel} />

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
          style={styles.animalPlate}
          pointerEvents="none"
          // Both platforms: importantForAccessibility is Android-only and
          // accessibilityElementsHidden is iOS-only, so hiding on one alone
          // would let VoiceOver announce the name a second time.
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {/* The tag shows the name and nothing else. It used to append the
              dialogue-cooldown countdown and dim while it ran, back when the
              animal also froze under sleeping Z's. The animal now just keeps
              wandering with no explanation offered, so a bare digit beside its
              name would be the last unexplained state read-out left in the
              room. The count survives only in the sprite's accessibility
              label, where a screen-reader user has no other signal. */}
          <PixelPlaque
            phase={currentPhase}
            label={animal.name}
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
          quietNotifications={quietNotifications}
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

  depthLighting: { ...StyleSheet.absoluteFill, overflow: 'hidden', borderRadius: 8 },
  floorReflection: {
    position: 'absolute', bottom: 8, left: '16%', width: '68%', height: '24%',
    borderRadius: 90,
  },
  floorRecess: { position: 'absolute', left: 4, right: 4, bottom: 4, height: 7 },
  floorLip: { position: 'absolute', left: 8, right: 8, bottom: 5, height: 1 },
  innerBevel: {
    position: 'absolute', top: 4, bottom: 4, left: 4, right: 4,
    borderRadius: 4, borderWidth: 1,
    borderTopColor: '#1B16284D', borderLeftColor: '#1B162830',
    borderRightColor: '#F4D6A729', borderBottomColor: '#F4D6A740',
  },
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
    top: NAME_PLATE_TOP_DP,
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
  // Nameplate ornament row: tiny warm lantern pips (procedural, not emoji).
  pipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  // 6dp with a warm-dark rim: a 4dp bare dot read as UI lint, not a lantern.
  pip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD27A',
    borderWidth: 1,
    borderColor: '#5A3A1A',
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
  glowWrap: { position: 'absolute' },
  roomProp: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  roomPropImage: { width: '100%', height: '100%' },
  roomPropShadow: {
    position: 'absolute', bottom: 0, width: '72%', height: 3,
    borderRadius: 999, backgroundColor: '#140A04', opacity: 0.2,
  },
  potHook: { position: 'absolute', left: '47%', top: -3, width: 2, height: 7, backgroundColor: '#987951', borderLeftWidth: 1, borderLeftColor: '#C9A675' },
  carvedStone: {
    width: '100%', height: '100%', backgroundColor: '#857363',
    borderWidth: 1, borderTopColor: '#C3AE89', borderLeftColor: '#B3A080',
    borderRightColor: '#4E4137', borderBottomColor: '#493F35',
  },
  stoneHighlight: { position: 'absolute', left: 2, right: 2, top: 1, height: 1, backgroundColor: '#CDB88B' },
  stoneCarving: { position: 'absolute', left: '45%', top: 2, width: 1, height: 4, backgroundColor: '#504C42', transform: [{ rotate: '24deg' }] },
  stoneCarvingReturn: { position: 'absolute', left: '52%', top: 2, width: 1, height: 4, backgroundColor: '#504C42', transform: [{ rotate: '-24deg' }] },
  stoneSeam: { position: 'absolute', left: '22%', bottom: 0, width: 1, height: 3, backgroundColor: '#5B5143' },
  ashenMantel: { position: 'absolute', left: 0, top: 6, width: '69%', height: 8, backgroundColor: '#53565B', borderWidth: 1, borderColor: '#35353B', borderBottomWidth: 2, transform: [{ skewY: '-7deg' }] },
  mantelReturn: { position: 'absolute', right: 0, top: 2, width: '34%', height: 8, backgroundColor: '#5B5E62', borderWidth: 1, borderColor: '#35353B', borderBottomWidth: 2, transform: [{ skewY: '-18deg' }] },
  mantelHighlight: { position: 'absolute', left: 2, right: 2, top: 1, height: 1, backgroundColor: '#A1A19B' },
  mantelJoint: { position: 'absolute', left: '65%', top: 1, bottom: 0, width: 1, backgroundColor: '#31353A' },
  saltRing: { position: 'absolute', top: 1, bottom: 1, left: 0, right: 0, borderRadius: 100, borderWidth: 1, borderStyle: 'dotted', borderColor: '#E3D9BB', opacity: 0.8 },
  saltRingInner: { position: 'absolute', top: 3, bottom: 3, left: 4, right: 4, borderRadius: 100, borderWidth: 1, borderColor: '#D2C8AB', opacity: 0.22 },
  lampStem: { position: 'absolute', left: '46%', top: '19%', bottom: 3, width: 3, backgroundColor: '#8D632D', borderLeftWidth: 1, borderLeftColor: '#CFA658' },
  lampStemHighlight: { position: 'absolute', left: '50%', top: '28%', bottom: 5, width: 1, backgroundColor: '#D0AE64' },
  lampShadeTop: { position: 'absolute', top: 0, left: '25%', right: '25%', height: 3, backgroundColor: '#D6BD7D', borderTopWidth: 1, borderTopColor: '#EEE0B1' },
  lampShade: { position: 'absolute', top: 3, left: '14%', right: '14%', height: 12, backgroundColor: '#DBBE7D', borderLeftWidth: 2, borderLeftColor: '#F1DCA4', borderRightWidth: 2, borderRightColor: '#A1824C' },
  lampShadeEdge: { position: 'absolute', top: 15, left: '9%', right: '9%', height: 2, backgroundColor: '#9D743C' },
  lampBase: { position: 'absolute', bottom: 1, left: '21%', right: '21%', height: 3, backgroundColor: '#9D753E', borderTopWidth: 1, borderTopColor: '#C5A15D' },
  secondShadowLong: { position: 'absolute', bottom: 0, right: 0, width: '100%', height: 3, backgroundColor: '#27222D', opacity: 0.28, transform: [{ rotate: '-7deg' }] },
  secondShadowShort: { position: 'absolute', bottom: 1, right: 0, width: '66%', height: 3, backgroundColor: '#211E2A', opacity: 0.35, transform: [{ rotate: '8deg' }] },
  bellCord: { position: 'absolute', top: 0, bottom: 5, left: '47%', width: 1, backgroundColor: '#B29458', borderLeftWidth: 1, borderLeftColor: '#D1BC82' },
  bellCordGrip: { position: 'absolute', bottom: 1, left: '39%', width: 5, height: 6, borderWidth: 1, borderRadius: 3, borderColor: '#C6A267', backgroundColor: '#604B31' },
  focusRim: { position: 'absolute', top: 3, bottom: 3, left: 3, right: 3, borderWidth: 2, opacity: 0.65 },
  // Focus flare: the room's glow register at full, over a light wash.
  focusFlare: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  // Deepening sigils: thin angled line pair + a fatter low-opacity underlay
  // pair standing in for blur (Android-safe: no shadowRadius glow).
  sigilSpot: {
    position: 'absolute',
  },
  // Small etched marks sit on each room's own exposed timber or stone.
  sigilBox: {
    width: 14,
    height: 15,
    opacity: 0.52,
  },
  sigilLine: {
    position: 'absolute',
    top: 1,
    height: 12,
    borderRadius: 1,
  },
  sigilCrispLeft: {
    left: 4,
    width: 1,
    transform: [{ rotate: '24deg' }],
  },
  sigilCrispRight: {
    left: 9,
    width: 1,
    transform: [{ rotate: '-24deg' }],
  },
  sigilGlowLeft: {
    left: 3,
    width: 3,
    borderRadius: 4,
    opacity: 0.22,
    transform: [{ rotate: '24deg' }],
  },
  sigilGlowRight: {
    left: 8,
    width: 3,
    borderRadius: 4,
    opacity: 0.22,
    transform: [{ rotate: '-24deg' }],
  },
  dustMote: {
    position: 'absolute',
    bottom: '24%',
    width: 2,
    height: 2,
    borderRadius: 1,
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
  lockedReservedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  lockedReservedMark: {
    width: 14,
    height: 14,
    marginRight: 5,
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

