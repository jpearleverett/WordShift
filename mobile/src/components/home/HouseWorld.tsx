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
const HOUSE_HEIGHT = ROOM_HEIGHT * 6 + ROOM_GAP * 5 + HOUSE_PADDING * 2 + 120; // Extra for roof

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

  // Cloud animation
  const cloud1X = useRef(new Animated.Value(-50)).current;
  const cloud2X = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  useEffect(() => {
    // Animate clouds
    const animateClouds = () => {
      Animated.loop(
        Animated.timing(cloud1X, {
          toValue: SCREEN_WIDTH + 100,
          duration: 40000,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.timing(cloud2X, {
          toValue: -150,
          duration: 35000,
          useNativeDriver: true,
        })
      ).start();
    };
    animateClouds();
  }, []);

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
      {/* Animated clouds */}
      <Animated.View
        style={[
          styles.cloud,
          styles.cloud1,
          { transform: [{ translateX: cloud1X }] },
        ]}
      >
        <Text style={styles.cloudEmoji}>☁️</Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.cloud,
          styles.cloud2,
          { transform: [{ translateX: cloud2X }] },
        ]}
      >
        <Text style={styles.cloudEmoji}>☁️</Text>
        <Text style={[styles.cloudEmoji, { marginLeft: 20 }]}>☁️</Text>
      </Animated.View>

      {/* Sun */}
      <View style={styles.sun}>
        <Text style={styles.sunEmoji}>☀️</Text>
      </View>

      {/* Birds */}
      <View style={styles.birds}>
        <Text style={styles.birdEmoji}>🐦</Text>
        <Text style={[styles.birdEmoji, { marginLeft: 10, marginTop: -5 }]}>🐦</Text>
      </View>

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
          <Text style={styles.bushEmoji}>🌿</Text>
        </View>
        <View style={styles.rightTree}>
          <Text style={styles.treeEmoji}>🌳</Text>
          <Text style={styles.treeEmoji}>🌲</Text>
          <Text style={styles.bushEmoji}>🌿</Text>
        </View>

        {/* House frame */}
        <View style={styles.house}>
          {/* Roof */}
          <View style={styles.roof}>
            {/* Chimney */}
            <View style={styles.chimney}>
              <View style={styles.chimneyBody} />
              <View style={styles.chimneyTop} />
              <Text style={styles.smokeEmoji}>💨</Text>
            </View>
            <View style={styles.roofMain}>
              {/* Roof shingles pattern */}
              <View style={styles.roofPattern}>
                <View style={styles.shingleRow}>
                  {[...Array(8)].map((_, i) => (
                    <View key={i} style={styles.shingle} />
                  ))}
                </View>
                <View style={[styles.shingleRow, { marginLeft: 10 }]}>
                  {[...Array(7)].map((_, i) => (
                    <View key={i} style={styles.shingle} />
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.roofTrim} />
            {/* Attic window */}
            <View style={styles.atticWindow}>
              <View style={styles.atticWindowGlass} />
              <View style={styles.atticWindowFrame} />
            </View>
          </View>

          {/* House body with rooms */}
          <View style={styles.houseBody}>
            {/* Decorative trim at top */}
            <View style={styles.topTrim} />

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
          <View style={styles.foundation}>
            {/* Stone pattern */}
            <View style={styles.stoneRow}>
              {[...Array(6)].map((_, i) => (
                <View key={i} style={styles.stone} />
              ))}
            </View>
          </View>

          {/* Front door decoration */}
          <View style={styles.doorMat}>
            <Text style={styles.doorMatEmoji}>🚪</Text>
          </View>
        </View>

        {/* Ground */}
        <View style={styles.ground}>
          {/* Grass texture */}
          <View style={styles.grassLayer} />
          {/* Flowers and grass decorations */}
          <View style={styles.groundDecorations}>
            <Text style={styles.groundEmoji}>🌸</Text>
            <Text style={styles.groundEmoji}>🌷</Text>
            <Text style={styles.groundEmoji}>🌻</Text>
            <Text style={styles.groundEmoji}>🌺</Text>
            <Text style={styles.groundEmoji}>🌼</Text>
          </View>
          {/* Mushrooms */}
          <View style={styles.mushrooms}>
            <Text style={styles.mushroomEmoji}>🍄</Text>
            <Text style={styles.mushroomEmoji}>🍄</Text>
          </View>
        </View>

        {/* Stream/Path */}
        <View style={styles.path}>
          <View style={styles.pathStone} />
          <View style={styles.pathStone} />
          <View style={styles.pathStone} />
          <View style={styles.pathStone} />
        </View>

        {/* Stream */}
        <View style={styles.stream}>
          <Text style={styles.streamEmoji}>💧</Text>
          <Text style={styles.streamEmoji}>💧</Text>
          <Text style={styles.streamEmoji}>💧</Text>
        </View>

        {/* Fence */}
        <View style={styles.fence}>
          {[...Array(5)].map((_, i) => (
            <View key={i} style={styles.fencePost} />
          ))}
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
  cloud: {
    position: 'absolute',
    flexDirection: 'row',
    zIndex: 10,
  },
  cloud1: {
    top: 60,
  },
  cloud2: {
    top: 100,
  },
  cloudEmoji: {
    fontSize: 40,
    opacity: 0.8,
  },
  sun: {
    position: 'absolute',
    top: 50,
    right: 30,
    zIndex: 5,
  },
  sunEmoji: {
    fontSize: 50,
  },
  birds: {
    position: 'absolute',
    top: 80,
    left: 50,
    flexDirection: 'row',
    zIndex: 5,
  },
  birdEmoji: {
    fontSize: 20,
  },
  houseContainer: {
    position: 'relative',
    width: HOUSE_WIDTH + 100, // Extra for trees
    alignItems: 'center',
    marginTop: 60,
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
    left: -10,
    top: 80,
    alignItems: 'center',
  },
  rightTree: {
    position: 'absolute',
    right: -10,
    top: 80,
    alignItems: 'center',
  },
  treeEmoji: {
    fontSize: 50,
    marginVertical: 5,
  },
  bushEmoji: {
    fontSize: 30,
    marginTop: -10,
  },
  house: {
    width: HOUSE_WIDTH,
    alignItems: 'center',
  },
  roof: {
    width: HOUSE_WIDTH + 30,
    height: 80,
    marginBottom: -5,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  chimney: {
    position: 'absolute',
    top: -20,
    right: 60,
    alignItems: 'center',
    zIndex: 10,
  },
  chimneyBody: {
    width: 25,
    height: 40,
    backgroundColor: '#8B4513',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  chimneyTop: {
    width: 32,
    height: 8,
    backgroundColor: '#5D4037',
    borderRadius: 2,
    marginTop: -2,
  },
  smokeEmoji: {
    fontSize: 18,
    position: 'absolute',
    top: -25,
    opacity: 0.6,
  },
  roofMain: {
    width: '100%',
    height: 60,
    backgroundColor: '#5D4037',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    overflow: 'hidden',
  },
  roofPattern: {
    flex: 1,
    paddingTop: 15,
    paddingHorizontal: 20,
  },
  shingleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 5,
  },
  shingle: {
    width: 30,
    height: 15,
    backgroundColor: '#4E342E',
    borderRadius: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  roofTrim: {
    position: 'absolute',
    bottom: 0,
    width: '110%',
    height: 15,
    backgroundColor: '#3E2723',
    borderRadius: 5,
  },
  atticWindow: {
    position: 'absolute',
    top: 20,
    width: 35,
    height: 30,
    borderRadius: 20,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    overflow: 'hidden',
  },
  atticWindowGlass: {
    flex: 1,
    backgroundColor: '#FFE4B5',
    opacity: 0.8,
  },
  atticWindowFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: '#5D4037',
    borderRadius: 20,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  houseBody: {
    backgroundColor: '#A0522D',
    padding: HOUSE_PADDING / 2,
    borderWidth: 5,
    borderColor: '#5D4037',
    borderTopWidth: 0,
  },
  topTrim: {
    position: 'absolute',
    top: 0,
    left: -5,
    right: -5,
    height: 8,
    backgroundColor: '#8B4513',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
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
    height: 25,
    backgroundColor: '#6D4C41',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stoneRow: {
    flexDirection: 'row',
    gap: 5,
  },
  stone: {
    width: 50,
    height: 15,
    backgroundColor: '#5D4037',
    borderRadius: 3,
  },
  doorMat: {
    position: 'absolute',
    bottom: -30,
    alignSelf: 'center',
  },
  doorMatEmoji: {
    fontSize: 30,
  },
  ground: {
    width: HOUSE_WIDTH + 120,
    height: 70,
    backgroundColor: '#228B22',
    borderRadius: 100,
    marginTop: -10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  grassLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#32CD32',
    borderRadius: 100,
  },
  groundDecorations: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 10,
  },
  groundEmoji: {
    fontSize: 22,
  },
  mushrooms: {
    position: 'absolute',
    left: 20,
    bottom: 10,
    flexDirection: 'row',
    gap: 5,
  },
  mushroomEmoji: {
    fontSize: 16,
  },
  path: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    gap: 8,
  },
  pathStone: {
    width: 25,
    height: 12,
    backgroundColor: '#808080',
    borderRadius: 6,
    opacity: 0.8,
  },
  stream: {
    position: 'absolute',
    bottom: 0,
    right: 30,
    flexDirection: 'row',
    gap: 5,
    opacity: 0.7,
  },
  streamEmoji: {
    fontSize: 16,
  },
  fence: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    flexDirection: 'row',
    gap: 10,
  },
  fencePost: {
    width: 8,
    height: 25,
    backgroundColor: '#D2691E',
    borderRadius: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
});

export default HouseWorld;
