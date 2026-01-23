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

// Decoration with position and size info
interface Decoration {
  emoji: string;
  size: 'small' | 'medium' | 'large';
  position: 'wall-left' | 'wall-right' | 'wall-center' | 'floor-left' | 'floor-right' | 'floor-center' | 'corner-tl' | 'corner-tr';
}

// Enhanced room decorations by theme with furniture layout
const ROOM_FURNITURE: Record<RoomTheme, Decoration[]> = {
  bamboo: [
    { emoji: '🎋', size: 'large', position: 'corner-tl' },
    { emoji: '🪴', size: 'medium', position: 'floor-left' },
    { emoji: '🏮', size: 'small', position: 'wall-center' },
    { emoji: '🛏️', size: 'large', position: 'floor-right' },
    { emoji: '🎐', size: 'small', position: 'corner-tr' },
    { emoji: '🍃', size: 'small', position: 'wall-left' },
  ],
  aquarium: [
    { emoji: '🐠', size: 'small', position: 'wall-left' },
    { emoji: '🐟', size: 'small', position: 'wall-right' },
    { emoji: '🪸', size: 'medium', position: 'floor-left' },
    { emoji: '🫧', size: 'small', position: 'corner-tr' },
    { emoji: '🌿', size: 'medium', position: 'floor-right' },
    { emoji: '🐚', size: 'small', position: 'floor-center' },
    { emoji: '💎', size: 'small', position: 'corner-tl' },
  ],
  kitchen: [
    { emoji: '🍳', size: 'medium', position: 'wall-left' },
    { emoji: '🫕', size: 'large', position: 'floor-center' },
    { emoji: '🔥', size: 'small', position: 'wall-center' },
    { emoji: '🥘', size: 'medium', position: 'floor-left' },
    { emoji: '🧄', size: 'small', position: 'corner-tl' },
    { emoji: '🍶', size: 'small', position: 'floor-right' },
    { emoji: '🥄', size: 'small', position: 'corner-tr' },
  ],
  jungle: [
    { emoji: '🌴', size: 'large', position: 'corner-tl' },
    { emoji: '🌿', size: 'medium', position: 'floor-left' },
    { emoji: '🪻', size: 'small', position: 'floor-right' },
    { emoji: '🛏️', size: 'large', position: 'wall-center' },
    { emoji: '🦎', size: 'small', position: 'corner-tr' },
    { emoji: '🍃', size: 'small', position: 'wall-right' },
  ],
  desert: [
    { emoji: '🌵', size: 'large', position: 'corner-tl' },
    { emoji: '⛺', size: 'large', position: 'floor-center' },
    { emoji: '🌙', size: 'small', position: 'corner-tr' },
    { emoji: '⭐', size: 'small', position: 'wall-right' },
    { emoji: '🏜️', size: 'small', position: 'wall-left' },
    { emoji: '🦂', size: 'small', position: 'floor-left' },
  ],
  cozy_den: [
    { emoji: '🔥', size: 'large', position: 'wall-center' },
    { emoji: '🛋️', size: 'large', position: 'floor-center' },
    { emoji: '📖', size: 'small', position: 'floor-left' },
    { emoji: '🕯️', size: 'small', position: 'corner-tl' },
    { emoji: '🧶', size: 'small', position: 'floor-right' },
    { emoji: '🖼️', size: 'small', position: 'wall-left' },
    { emoji: '☕', size: 'small', position: 'corner-tr' },
  ],
  study: [
    { emoji: '📚', size: 'large', position: 'wall-left' },
    { emoji: '📚', size: 'large', position: 'wall-right' },
    { emoji: '🪶', size: 'small', position: 'floor-center' },
    { emoji: '💡', size: 'medium', position: 'corner-tr' },
    { emoji: '🕯️', size: 'small', position: 'corner-tl' },
    { emoji: '📜', size: 'small', position: 'floor-left' },
    { emoji: '🔮', size: 'small', position: 'floor-right' },
  ],
  office: [
    { emoji: '💻', size: 'large', position: 'floor-center' },
    { emoji: '📊', size: 'medium', position: 'wall-left' },
    { emoji: '☕', size: 'small', position: 'floor-right' },
    { emoji: '🪴', size: 'medium', position: 'corner-tl' },
    { emoji: '📋', size: 'small', position: 'wall-right' },
    { emoji: '🖨️', size: 'small', position: 'floor-left' },
  ],
  burrow: [
    { emoji: '🪨', size: 'large', position: 'wall-left' },
    { emoji: '🕯️', size: 'small', position: 'corner-tr' },
    { emoji: '🛋️', size: 'medium', position: 'floor-center' },
    { emoji: '🌱', size: 'small', position: 'corner-tl' },
    { emoji: '🦴', size: 'small', position: 'floor-left' },
    { emoji: '🪵', size: 'medium', position: 'floor-right' },
  ],
  garden: [
    { emoji: '🌸', size: 'medium', position: 'corner-tl' },
    { emoji: '🌷', size: 'medium', position: 'floor-left' },
    { emoji: '☕', size: 'small', position: 'floor-center' },
    { emoji: '🪻', size: 'medium', position: 'floor-right' },
    { emoji: '🌻', size: 'large', position: 'corner-tr' },
    { emoji: '🦋', size: 'small', position: 'wall-center' },
    { emoji: '🐝', size: 'small', position: 'wall-right' },
  ],
};

// Get position styles for decoration
function getDecorationStyle(
  position: Decoration['position'],
  size: Decoration['size'],
  width: number,
  height: number
): { top?: number; left?: number; right?: number; bottom?: number; fontSize: number } {
  const sizes = {
    small: 14,
    medium: 20,
    large: 28,
  };
  const fontSize = sizes[size];

  switch (position) {
    case 'corner-tl':
      return { top: 8, left: 8, fontSize };
    case 'corner-tr':
      return { top: 8, right: 8, fontSize };
    case 'wall-left':
      return { top: 30, left: 10, fontSize };
    case 'wall-right':
      return { top: 30, right: 10, fontSize };
    case 'wall-center':
      return { top: 25, left: width / 2 - fontSize / 2, fontSize };
    case 'floor-left':
      return { bottom: 15, left: 10, fontSize };
    case 'floor-right':
      return { bottom: 15, right: 10, fontSize };
    case 'floor-center':
      return { bottom: 20, left: width / 2 - fontSize / 2, fontSize };
    default:
      return { top: 10, left: 10, fontSize };
  }
}

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
  const furniture = ROOM_FURNITURE[room.theme];

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

      {/* Wall details - different patterns per theme */}
      {(room.theme === 'study' || room.theme === 'cozy_den') && (
        <View style={styles.wallPattern}>
          <View style={[styles.wallStripe, { backgroundColor: themeColors.accent }]} />
          <View style={[styles.wallStripe, { backgroundColor: themeColors.accent }]} />
        </View>
      )}

      {/* Floor */}
      <View style={[styles.floor, { backgroundColor: themeColors.floor }]} />

      {/* Floor pattern for some themes */}
      {(room.theme === 'kitchen' || room.theme === 'office') && (
        <View style={styles.floorPattern}>
          <View style={[styles.floorTile, { backgroundColor: 'rgba(0,0,0,0.1)' }]} />
          <View style={[styles.floorTile, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
          <View style={[styles.floorTile, { backgroundColor: 'rgba(0,0,0,0.1)' }]} />
        </View>
      )}

      {/* Window for some rooms */}
      {(room.theme === 'study' || room.theme === 'kitchen' || room.theme === 'cozy_den') && (
        <View style={styles.window}>
          <View style={styles.windowGlass} />
          <View style={styles.windowFrame} />
        </View>
      )}

      {/* Room frame */}
      <View style={[styles.frame, { borderColor: themeColors.accent }]} />

      {/* Furniture and Decorations */}
      <View style={styles.decorationsContainer}>
        {furniture.map((deco, index) => {
          const posStyle = getDecorationStyle(deco.position, deco.size, width, height);
          return (
            <View
              key={`${room.id}-deco-${index}`}
              style={[
                styles.decoration,
                {
                  top: posStyle.top,
                  left: posStyle.left,
                  right: posStyle.right,
                  bottom: posStyle.bottom,
                },
              ]}
            >
              <Text style={{ fontSize: posStyle.fontSize, opacity: 0.9 }}>
                {deco.emoji}
              </Text>
            </View>
          );
        })}
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
    opacity: 0.6,
  },
  wallPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '70%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  wallStripe: {
    width: 3,
    height: '60%',
    opacity: 0.2,
    borderRadius: 2,
  },
  floor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    opacity: 0.8,
  },
  floorPattern: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    flexDirection: 'row',
  },
  floorTile: {
    flex: 1,
    height: '100%',
  },
  window: {
    position: 'absolute',
    top: 15,
    right: 25,
    width: 30,
    height: 35,
    borderRadius: 3,
    overflow: 'hidden',
  },
  windowGlass: {
    flex: 1,
    backgroundColor: '#87CEEB',
    opacity: 0.5,
  },
  windowFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: '#8B4513',
    borderRadius: 3,
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
    pointerEvents: 'none',
  },
  decoration: {
    position: 'absolute',
  },
  namePlate: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
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
