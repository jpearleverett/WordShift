import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Text,
} from 'react-native';
import { Room, Animal, DialoguePhase } from '../../types/homeWorld';
import { RoomView } from './RoomView';
import { CandyColors } from '../../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// House dimensions
const ROOM_WIDTH = 160;
const ROOM_HEIGHT = 140;
const ROOM_GAP = 4;
const HOUSE_PADDING = 20;

// Full house dimensions based on layout
// 6 rows: top (full), 4 rows of 2, bottom (garden)
const HOUSE_WIDTH = ROOM_WIDTH * 2 + ROOM_GAP + HOUSE_PADDING * 2;
const HOUSE_HEIGHT = ROOM_HEIGHT * 6 + ROOM_GAP * 5 + HOUSE_PADDING * 2 + 80; // Extra for roof

interface HouseWorldProps {
  rooms: Room[];
  animals: Animal[];
  currentPhase: DialoguePhase;
  onAnimalPress: (animal: Animal) => void;
  onRoomPress: (room: Room) => void;
}

export const HouseWorld: React.FC<HouseWorldProps> = ({
  rooms,
  animals,
  currentPhase,
  onAnimalPress,
  onRoomPress,
}) => {
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(new Animated.Value(1)).current;
  const lastScale = useRef(1);

  // Group rooms by row for layout
  const roomsByRow = rooms.reduce((acc, room) => {
    const row = room.layoutPosition.row;
    if (!acc[row]) acc[row] = [];
    acc[row].push(room);
    return acc;
  }, {} as Record<number, Room[]>);

  // Get animal for a room
  const getAnimalForRoom = (roomId: string): Animal | null => {
    return animals.find(a => a.roomId === roomId) || null;
  };

  // Calculate room width based on whether it's full width or half
  const getRoomWidth = (row: number, roomsInRow: Room[]): number => {
    // Row 0 (top/attic) and row 5 (garden) are full width
    if (row === 0 || row === 5) {
      return ROOM_WIDTH * 2 + ROOM_GAP;
    }
    return ROOM_WIDTH;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (evt, gestureState) => {
        // Handle pinch zoom with two touches
        if (evt.nativeEvent.touches.length === 2) {
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) +
            Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          // Scale based on pinch
          const newScale = Math.max(0.5, Math.min(2, lastScale.current * (distance / 200)));
          setScale(newScale);
          scaleRef.setValue(newScale);
        }
      },
      onPanResponderRelease: () => {
        lastScale.current = scale;
      },
    })
  ).current;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      bounces={true}
      maximumZoomScale={2}
      minimumZoomScale={0.5}
      bouncesZoom={true}
    >
      <Animated.View
        style={[
          styles.houseContainer,
          {
            transform: [{ scale: scaleRef }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Sky background */}
        <View style={styles.skyBackground} />

        {/* Trees on sides */}
        <View style={styles.leftTree}>
          <Text style={styles.treeEmoji}>🌳</Text>
          <Text style={styles.treeEmoji}>🌲</Text>
        </View>
        <View style={styles.rightTree}>
          <Text style={styles.treeEmoji}>🌳</Text>
          <Text style={styles.treeEmoji}>🌲</Text>
        </View>

        {/* House frame */}
        <View style={styles.house}>
          {/* Roof */}
          <View style={styles.roof}>
            <View style={styles.roofMain} />
            <View style={styles.roofTrim} />
          </View>

          {/* House body with rooms */}
          <View style={styles.houseBody}>
            {Object.entries(roomsByRow)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([row, rowRooms]) => (
                <View
                  key={`row-${row}`}
                  style={[
                    styles.roomRow,
                    Number(row) === 5 && styles.gardenRow,
                  ]}
                >
                  {rowRooms.map((room, index) => (
                    <RoomView
                      key={room.id}
                      room={room}
                      animal={getAnimalForRoom(room.id)}
                      width={getRoomWidth(Number(row), rowRooms)}
                      height={ROOM_HEIGHT}
                      onAnimalPress={onAnimalPress}
                      onRoomPress={onRoomPress}
                      currentPhase={currentPhase}
                    />
                  ))}
                </View>
              ))}
          </View>

          {/* Foundation */}
          <View style={styles.foundation} />
        </View>

        {/* Ground */}
        <View style={styles.ground}>
          {/* Flowers and grass decorations */}
          <View style={styles.groundDecorations}>
            <Text style={styles.groundEmoji}>🌸</Text>
            <Text style={styles.groundEmoji}>🌷</Text>
            <Text style={styles.groundEmoji}>🌻</Text>
            <Text style={styles.groundEmoji}>🌺</Text>
          </View>
        </View>

        {/* Stream */}
        <View style={styles.stream}>
          <Text style={styles.streamEmoji}>💧</Text>
          <Text style={styles.streamEmoji}>💧</Text>
          <Text style={styles.streamEmoji}>💧</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB', // Sky blue
  },
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: SCREEN_HEIGHT,
  },
  houseContainer: {
    position: 'relative',
    width: HOUSE_WIDTH + 80, // Extra for trees
    alignItems: 'center',
  },
  skyBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'transparent',
  },
  leftTree: {
    position: 'absolute',
    left: 0,
    top: 50,
    alignItems: 'center',
  },
  rightTree: {
    position: 'absolute',
    right: 0,
    top: 50,
    alignItems: 'center',
  },
  treeEmoji: {
    fontSize: 50,
    marginVertical: 10,
  },
  house: {
    width: HOUSE_WIDTH,
    alignItems: 'center',
  },
  roof: {
    width: HOUSE_WIDTH + 20,
    height: 60,
    marginBottom: -5,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  roofMain: {
    width: '100%',
    height: 50,
    backgroundColor: '#5D4037',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  roofTrim: {
    position: 'absolute',
    bottom: 0,
    width: '110%',
    height: 15,
    backgroundColor: '#3E2723',
    borderRadius: 5,
  },
  houseBody: {
    backgroundColor: '#8B4513',
    padding: HOUSE_PADDING / 2,
    borderWidth: 4,
    borderColor: '#5D4037',
    borderTopWidth: 0,
  },
  roomRow: {
    flexDirection: 'row',
    gap: ROOM_GAP,
    marginBottom: ROOM_GAP,
  },
  gardenRow: {
    marginTop: 10,
  },
  foundation: {
    width: HOUSE_WIDTH,
    height: 20,
    backgroundColor: '#6D4C41',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  ground: {
    width: HOUSE_WIDTH + 100,
    height: 60,
    backgroundColor: '#228B22',
    borderRadius: 100,
    marginTop: -10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groundDecorations: {
    flexDirection: 'row',
    gap: 20,
  },
  groundEmoji: {
    fontSize: 24,
  },
  stream: {
    position: 'absolute',
    bottom: 0,
    right: 20,
    flexDirection: 'row',
    gap: 5,
    opacity: 0.7,
  },
  streamEmoji: {
    fontSize: 16,
  },
});

export default HouseWorld;
