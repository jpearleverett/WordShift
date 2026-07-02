import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageSourcePropType,
  Pressable,
} from 'react-native';
import { AmberInline } from '../AmberInline';
import { Room, Animal, RoomTheme, DialoguePhase } from '../../types/homeWorld';
import { ROOM_THEME_COLORS } from '../../services/homeWorldData';
import { AnimalSprite } from './AnimalSprite';
import { CandyColors } from '../../theme/colors';

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
  ritualWords?: string[];
  unlockCost?: number | null;
  amberBalance?: number;
  inviteCost?: number | null;
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
  ritualWords = [],
  unlockCost = null,
  amberBalance = 0,
  inviteCost = null,
}) => {
  const themeColors = ROOM_THEME_COLORS[room.theme];

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

      {/* Room frame */}
      <View style={[styles.frame, { borderColor: themeColors.accent }]} />

      {/* Room name plate */}
      <View style={styles.namePlate}>
        <Text style={styles.roomName}>{room.name}</Text>
        {isRoomUpgraded && <Text style={styles.upgradeBadge}>✦</Text>}
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
      {animal && !animal.isUnlocked && (() => {
        const chip = getInviteChipContent(inviteCost, amberBalance);
        return (
          <View style={styles.inviteCenterWrap} pointerEvents="box-none">
            <Pressable
              style={({ pressed }) => [pressed && styles.pressed]}
              onPress={() => onRoomPress(room)}
              accessibilityRole="button"
              accessibilityLabel={getInviteAccessibilityLabel(room.name, inviteCost)}
            >
              <View style={styles.inviteAnimalBadge}>
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
    color: CandyColors.white,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  upgradeBadge: {
    fontSize: 8,
    color: '#FFD700',
    marginLeft: 3,
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
  lockIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  lockedText: {
    color: CandyColors.white,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  lockedSubtext: {
    color: CandyColors.gray[300],
    fontSize: 10,
  },
  lockedSubtextAffordable: {
    color: '#D6FFD6',
    fontWeight: '700',
  },
  lockedSubtextMuted: {
    color: CandyColors.gray[300],
  },
  lockedCost: {
    color: CandyColors.yellow.main,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
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
  inviteAnimalBadge: {
    minWidth: 96,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: CandyColors.yellow.main,
    shadowColor: CandyColors.yellow.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
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
    color: CandyColors.purple.main,
    fontSize: 12,
    fontWeight: '800',
  },
  inviteAnimalText: {
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
    position: 'absolute',
    fontWeight: '700',
    letterSpacing: 2,
  },
});

export default RoomView;
