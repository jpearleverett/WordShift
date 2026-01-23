import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Room, Animal, RoomTheme, DialoguePhase } from '../../types/homeWorld';
import { ROOM_THEME_COLORS } from '../../services/homeWorldData';
import { AnimalSprite } from './AnimalSprite';
import { CandyColors } from '../../theme/colors';

interface RoomViewProps {
  room: Room;
  animal: Animal | null;
  width: number;
  height: number;
  onAnimalPress: (animal: Animal) => void;
  onRoomPress: (room: Room) => void;
  currentPhase: DialoguePhase;
}

// Room decorations by theme
const ROOM_DECORATIONS: Record<RoomTheme, string[]> = {
  bamboo: ['🎋', '🪴', '🏮', '🛏️'],
  aquarium: ['🐠', '🪸', '🫧', '🌿'],
  kitchen: ['🍳', '🫕', '🔥', '🥘'],
  jungle: ['🌴', '🌿', '🪴', '🛏️'],
  desert: ['🏜️', '🌵', '⛺', '🌙'],
  cozy_den: ['🔥', '🛋️', '📖', '🕯️'],
  study: ['📚', '🦉', '🪶', '💡'],
  office: ['💻', '📊', '☕', '🪴'],
  burrow: ['🪨', '🕯️', '🛋️', '🌱'],
  garden: ['🌸', '🌷', '☕', '🪻'],
};

export const RoomView: React.FC<RoomViewProps> = ({
  room,
  animal,
  width,
  height,
  onAnimalPress,
  onRoomPress,
  currentPhase,
}) => {
  const themeColors = ROOM_THEME_COLORS[room.theme];
  const decorations = ROOM_DECORATIONS[room.theme];

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
          <Text style={styles.lockedSubtext}>Tap to unlock</Text>
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
      {/* Wall pattern/texture */}
      <View style={[styles.wall, { backgroundColor: themeColors.wall }]} />

      {/* Floor */}
      <View style={[styles.floor, { backgroundColor: themeColors.floor }]} />

      {/* Room frame */}
      <View style={[styles.frame, { borderColor: themeColors.accent }]} />

      {/* Decorations */}
      <View style={styles.decorationsContainer}>
        {decorations.map((deco, index) => (
          <View
            key={`${room.id}-deco-${index}`}
            style={[
              styles.decoration,
              getDecorationPosition(index, width, height),
            ]}
          >
            <Text style={styles.decorationEmoji}>{deco}</Text>
          </View>
        ))}
      </View>

      {/* Room name plate */}
      <View style={styles.namePlate}>
        <Text style={styles.roomName}>{room.name}</Text>
      </View>

      {/* Animal if present and unlocked */}
      {animal && animal.isUnlocked && (
        <AnimalSprite
          animal={animal}
          roomWidth={width}
          roomHeight={height}
          onPress={onAnimalPress}
          currentPhase={currentPhase}
        />
      )}

      {/* Locked animal indicator */}
      {animal && !animal.isUnlocked && (
        <View style={styles.lockedAnimalContainer}>
          <View style={styles.lockedAnimalBadge}>
            <Text style={styles.lockedAnimalIcon}>🔒</Text>
            <Text style={styles.lockedAnimalText}>???</Text>
          </View>
        </View>
      )}
    </View>
  );
};

// Helper to position decorations
function getDecorationPosition(
  index: number,
  width: number,
  height: number
): { top?: number; left?: number; right?: number; bottom?: number } {
  const positions = [
    { top: 10, left: 10 },
    { top: 10, right: 10 },
    { bottom: 25, left: 15 },
    { bottom: 25, right: 15 },
  ];
  return positions[index % positions.length];
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  wall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '70%',
    opacity: 0.5,
  },
  floor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    opacity: 0.7,
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
  decorationsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decoration: {
    position: 'absolute',
    opacity: 0.8,
  },
  decorationEmoji: {
    fontSize: 20,
  },
  namePlate: {
    position: 'absolute',
    top: 8,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roomName: {
    color: CandyColors.white,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
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
  lockedAnimalContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
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
});

export default RoomView;
