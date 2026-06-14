import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
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
      <TouchableOpacity
        style={[
          styles.container,
          styles.lockedRoom,
          { width, height },
        ]}
        onPress={() => onRoomPress(room)}
        activeOpacity={0.7}
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
      </TouchableOpacity>
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

      {/* Empty room waiting for animal - show invite indicator */}
      {animal && !animal.isUnlocked && (
        <TouchableOpacity
          style={styles.lockedAnimalContainer}
          onPress={() => onRoomPress(room)}
          activeOpacity={0.8}
        >
          <View style={styles.inviteAnimalBadge}>
            <Text style={styles.inviteAnimalIcon}>✨</Text>
            <Text style={styles.inviteAnimalText}>
              {inviteCost === null
                ? 'Tap to Invite'
                : inviteCost === 0
                  ? 'Invite (FREE)'
                  : <>Invite <AmberInline /> {inviteCost}</>
              }
            </Text>
            {inviteCost !== null && inviteCost > 0 && (
              <Text style={styles.inviteAnimalCostSubtext}>
                {amberBalance >= inviteCost ? 'Tap to welcome' : <>You: <AmberInline /> {amberBalance}</>}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}

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
  lockedAnimalContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -35 }],
  },
  lockedAnimalBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: CandyColors.gray[400],
    borderStyle: 'dashed',
  },
  lockedAnimalIcon: {
    fontSize: 20,
  },
  lockedAnimalText: {
    color: CandyColors.gray[300],
    fontSize: 10,
    fontWeight: '700',
  },
  inviteAnimalBadge: {
    width: 104,
    minHeight: 76,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderWidth: 3,
    borderColor: CandyColors.yellow.main,
    shadowColor: CandyColors.yellow.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  inviteAnimalIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  inviteAnimalText: {
    color: CandyColors.purple.main,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  inviteAnimalCostSubtext: {
    marginTop: 2,
    color: CandyColors.gray[700],
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
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
