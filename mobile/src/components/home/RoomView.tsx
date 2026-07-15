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
import { AmberInline } from '../AmberInline';
import { Room, Animal, RoomTheme, DialoguePhase } from '../../types/homeWorld';
import { ROOM_THEME_COLORS } from '../../services/homeWorldData';
import { AnimalSprite } from './AnimalSprite';
import { CandyColors } from '../../theme/colors';
import { getPixelSkin, CARD_CORNER_DP, CARD_EDGE_DP } from '../../theme/pixelSkin.generated';
import { NineSliceFrame } from '../ui/NineSlice';
import { BODY_FONT, BODY_FONT_BOLD } from '../../theme/fonts';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';

// Room background images - maps theme to image asset
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

// Phase-appropriate windows. The room art paints bright day-sky windows that
// read as noon under a dusk/night sky. These masks (white on transparent,
// window sky only — see scripts/tools/processRawWorldArt.mjs) let us recolor
// just the window to the current phase. Only the rooms with a clear sky window
// have a mask; the aquarium (water), desert (already night), and windowless
// rooms are deliberately absent.
const ROOM_WINDOW_MASKS: Partial<Record<RoomTheme, ImageSourcePropType>> = {
  cozy_den: require('../../../assets/rooms/windows/cozy_den.png'),
  kitchen: require('../../../assets/rooms/windows/kitchen.png'),
  study: require('../../../assets/rooms/windows/study.png'),
  office: require('../../../assets/rooms/windows/office.png'),
  garden: require('../../../assets/rooms/windows/garden.png'),
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

// Word echo configuration by phase (ritual words inscribed in rooms)
const WORD_ECHO_CONFIG: Record<number, { count: number; opacity: number; fontSize: number; color: string }> = {
  2: { count: 3, opacity: 0.08, fontSize: 9, color: '#FFFFFF' },
  3: { count: 4, opacity: 0.15, fontSize: 10, color: '#9B7FCF' },
  4: { count: 5, opacity: 0.25, fontSize: 11, color: '#8B2252' },
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
  /** Tier-1 hearth glow (the replacement for the old sparkle glyph). */
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

/** Wall spots for up to 4 sigil marks (percent insets; mirrored pairs). */
const SIGIL_SPOTS: { top: string; left?: string; right?: string }[] = [
  { top: '26%', left: '9%' },
  { top: '24%', right: '9%' },
  { top: '58%', right: '5%' },
  { top: '60%', left: '5%' },
];

/**
 * Tier-1 hearth glow: 2-3 stacked feathered ovals with a slow native-driven
 * opacity breathing. Static (steady glow) under reduced motion / low tier.
 */
const HearthGlow: React.FC<{ maxOpacity: number; scale: number; animate: boolean }> = ({
  maxOpacity,
  scale,
  animate,
}) => {
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
        styles.hearthGlowWrap,
        {
          opacity: animate ? breathe.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) : 1,
          transform: [{ scale }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.hearthGlowOuter, { opacity: maxOpacity * 0.45 }]} />
      <View style={[styles.hearthGlowMid, { opacity: maxOpacity * 0.7 }]} />
      <View style={[styles.hearthGlowCore, { opacity: maxOpacity }]} />
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
  // Decorative-layer motion gate (breathing glow, motes). The layers still
  // render statically under reduced motion; only the movement is skipped.
  const embellishMotion = !getSettingsSync().reducedMotion && !shouldSimplifyAnimations();

  if (!room.isUnlocked) {
    // Locked room appearance
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
        <View style={styles.lockedOverlay}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockedText}>{room.name}</Text>
          {unlockCost !== null ? (
            <>
              <Text style={styles.lockedCost}>Build: <AmberInline /> {unlockCost}</Text>
              <Text
                style={[
                  styles.lockedSubtext,
                  amberBalance >= unlockCost ? styles.lockedSubtextAffordable : styles.lockedSubtextMuted,
                ]}
              >
                {amberBalance >= unlockCost
                  ? 'Tap to build this room'
                  : <><AmberInline /> {amberBalance} / {unlockCost}</>}
              </Text>
            </>
          ) : (
            <Text style={styles.lockedSubtext}>Tap to unlock</Text>
          )}
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
            <HearthGlow
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

      {/* Room name plate */}
      <View style={styles.namePlate}>
        <Text style={styles.roomName}>{room.name}</Text>
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
  namePlate: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  roomName: {
    fontFamily: BODY_FONT_BOLD,
    color: CandyColors.white,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  // Hearth glow: bottom-center stack of feathered warm ovals (core brightest).
  hearthGlowWrap: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    width: 120,
    height: 70,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  hearthGlowOuter: {
    position: 'absolute',
    bottom: 0,
    width: 120,
    height: 64,
    borderRadius: 999,
    backgroundColor: '#F2953F',
  },
  hearthGlowMid: {
    position: 'absolute',
    bottom: 6,
    width: 82,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FFB65C',
  },
  hearthGlowCore: {
    position: 'absolute',
    bottom: 12,
    width: 48,
    height: 26,
    borderRadius: 999,
    backgroundColor: '#FFD9A0',
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
  lockedRoom: {
    backgroundColor: CandyColors.gray[700],
  },
  lockedOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  // Compact: the whole stack (icon + name + cost + progress) must fit the
  // ~123dp room height with the body face's tall metrics, or the bottom line
  // overlaps the room's lower frame (the "Bamboo Attic 147/400" defect).
  lockIcon: {
    fontFamily: BODY_FONT,
    fontSize: 22,
    marginBottom: 2,
  },
  lockedText: {
    fontFamily: BODY_FONT_BOLD,
    color: CandyColors.white,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  lockedSubtext: {
    fontFamily: BODY_FONT,
    color: CandyColors.gray[300],
    fontSize: 10,
  },
  lockedSubtextAffordable: {
    fontFamily: BODY_FONT_BOLD,
    color: '#D6FFD6',
    fontWeight: '700',
  },
  lockedSubtextMuted: {
    color: CandyColors.gray[300],
  },
  lockedCost: {
    fontFamily: BODY_FONT_BOLD,
    color: CandyColors.yellow.main,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
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
    fontSize: 12,
    fontWeight: '800',
  },
  inviteAnimalText: {
    fontFamily: BODY_FONT_BOLD,
    color: CandyColors.purple.main,
    fontSize: 12,
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
    fontSize: 10,
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
