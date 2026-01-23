import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  Text,
} from 'react-native';
import {
  GestureHandlerRootView,
  PinchGestureHandler,
  PanGestureHandler,
  State,
  PinchGestureHandlerGestureEvent,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { Room, Animal, DialoguePhase } from '../../types/homeWorld';
import { RoomView } from './RoomView';
import { CandyColors } from '../../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// House dimensions
const ROOM_WIDTH = 280;
const ROOM_HEIGHT = 140;
const ROOM_GAP = 4;
const HOUSE_PADDING = 20;
const HOUSE_WIDTH = ROOM_WIDTH + HOUSE_PADDING * 2;

// Zoom constraints
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.0;

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
  // Animated values
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Refs for gesture tracking
  const pinchRef = useRef<PinchGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);

  // State tracking for gestures
  const baseScale = useRef(1);
  const lastScale = useRef(1);
  const baseTranslateX = useRef(0);
  const baseTranslateY = useRef(0);

  // Cloud animations
  const cloud1X = useRef(new Animated.Value(-100)).current;
  const cloud2X = useRef(new Animated.Value(SCREEN_WIDTH + 50)).current;
  const cloud3X = useRef(new Animated.Value(SCREEN_WIDTH / 2)).current;

  useEffect(() => {
    const animateCloud = (cloudAnim: Animated.Value, startX: number, duration: number) => {
      const animate = () => {
        cloudAnim.setValue(startX > SCREEN_WIDTH / 2 ? SCREEN_WIDTH + 100 : -150);
        Animated.timing(cloudAnim, {
          toValue: startX > SCREEN_WIDTH / 2 ? -150 : SCREEN_WIDTH + 100,
          duration,
          useNativeDriver: true,
        }).start(() => animate());
      };
      animate();
    };

    animateCloud(cloud1X, -100, 45000);
    animateCloud(cloud2X, SCREEN_WIDTH + 50, 38000);
    animateCloud(cloud3X, SCREEN_WIDTH / 2, 52000);
  }, []);

  // Get only unlocked rooms, sorted by floor
  const unlockedRooms = rooms
    .filter(room => room.isUnlocked)
    .sort((a, b) => a.floor - b.floor);

  const getAnimalForRoom = (roomId: string): Animal | null => {
    return animals.find(a => a.roomId === roomId) || null;
  };

  const calculateHouseHeight = (): number => {
    return Math.max(1, unlockedRooms.length) * ROOM_HEIGHT +
           Math.max(0, unlockedRooms.length - 1) * ROOM_GAP +
           HOUSE_PADDING * 2;
  };

  // Pinch gesture handler
  const onPinchGestureEvent = (event: PinchGestureHandlerGestureEvent) => {
    const { scale: gestureScale } = event.nativeEvent;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, baseScale.current * gestureScale));
    scale.setValue(newScale);
  };

  const onPinchHandlerStateChange = (event: PinchGestureHandlerGestureEvent) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const currentScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, baseScale.current * event.nativeEvent.scale));
      baseScale.current = currentScale;
      lastScale.current = currentScale;

      // Smooth snap if too zoomed out
      if (currentScale < 0.7) {
        Animated.spring(scale, {
          toValue: 0.7,
          friction: 5,
          useNativeDriver: true,
        }).start(() => {
          baseScale.current = 0.7;
          lastScale.current = 0.7;
        });
      }
    }
  };

  // Pan gesture handler
  const onPanGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationX, translationY } = event.nativeEvent;

    // Scale translation by current scale for natural feeling
    const maxTranslate = 150 * lastScale.current;

    const newX = Math.max(-maxTranslate, Math.min(maxTranslate, baseTranslateX.current + translationX));
    const newY = Math.max(-maxTranslate, Math.min(maxTranslate, baseTranslateY.current + translationY));

    translateX.setValue(newX);
    translateY.setValue(newY);
  };

  const onPanHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, translationY } = event.nativeEvent;
      const maxTranslate = 150 * lastScale.current;

      baseTranslateX.current = Math.max(-maxTranslate, Math.min(maxTranslate, baseTranslateX.current + translationX));
      baseTranslateY.current = Math.max(-maxTranslate, Math.min(maxTranslate, baseTranslateY.current + translationY));
    }
  };

  const houseHeight = calculateHouseHeight();

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Fixed sky background */}
      <View style={styles.skyBackground}>
        <View style={styles.skyTop} />
        <View style={styles.skyMiddle} />
        <View style={styles.skyBottom} />
      </View>

      {/* Animated clouds - fixed to screen */}
      <Animated.View style={[styles.cloud, { top: 20, transform: [{ translateX: cloud1X }] }]} pointerEvents="none">
        <Text style={styles.cloudEmoji}>☁️</Text>
      </Animated.View>
      <Animated.View style={[styles.cloud, { top: 70, transform: [{ translateX: cloud2X }] }]} pointerEvents="none">
        <Text style={styles.cloudEmoji}>☁️</Text>
        <Text style={[styles.cloudEmoji, { marginLeft: 25 }]}>☁️</Text>
      </Animated.View>
      <Animated.View style={[styles.cloud, { top: 45, transform: [{ translateX: cloud3X }] }]} pointerEvents="none">
        <Text style={[styles.cloudEmoji, { fontSize: 38 }]}>☁️</Text>
      </Animated.View>

      {/* Sun - fixed position */}
      <View style={styles.sun} pointerEvents="none">
        <Text style={styles.sunEmoji}>☀️</Text>
      </View>

      {/* Birds - fixed position */}
      <View style={styles.birds} pointerEvents="none">
        <Text style={styles.birdEmoji}>🐦</Text>
        <Text style={[styles.birdEmoji, { marginLeft: 12, marginTop: -6 }]}>🐦</Text>
      </View>

      {/* Ground layer - fixed at bottom */}
      <View style={styles.groundLayer} pointerEvents="none">
        <View style={styles.grassStrip} />
        <View style={styles.dirtStrip} />
        <View style={styles.groundDecorations}>
          {['🍄', '🌸', '🌷', '🌻', '🌺', '🌼', '🌸', '🌷', '🍄'].map((emoji, i) => (
            <Text key={i} style={styles.groundEmoji}>{emoji}</Text>
          ))}
        </View>
      </View>

      {/* Gesture handlers with simultaneous recognition */}
      <PanGestureHandler
        ref={panRef}
        simultaneousHandlers={pinchRef}
        onGestureEvent={onPanGestureEvent}
        onHandlerStateChange={onPanHandlerStateChange}
        minDist={10}
        avgTouches
      >
        <Animated.View style={styles.gestureContainer}>
          <PinchGestureHandler
            ref={pinchRef}
            simultaneousHandlers={panRef}
            onGestureEvent={onPinchGestureEvent}
            onHandlerStateChange={onPinchHandlerStateChange}
          >
            <Animated.View
              style={[
                styles.transformContainer,
                {
                  transform: [
                    { translateX },
                    { translateY },
                    { scale },
                  ],
                },
              ]}
            >
              {/* Trees on left side */}
              <View style={[styles.treeGroup, styles.leftTrees]} pointerEvents="none">
                <Text style={styles.treeEmoji}>🌳</Text>
                <Text style={styles.smallTreeEmoji}>🌲</Text>
                <Text style={styles.bushEmoji}>🌿</Text>
              </View>

              {/* Trees on right side */}
              <View style={[styles.treeGroup, styles.rightTrees]} pointerEvents="none">
                <Text style={styles.treeEmoji}>🌳</Text>
                <Text style={styles.smallTreeEmoji}>🌲</Text>
                <Text style={styles.bushEmoji}>🌿</Text>
              </View>

              {/* Fence */}
              <View style={styles.fence} pointerEvents="none">
                {[...Array(6)].map((_, i) => (
                  <View key={i} style={styles.fencePost} />
                ))}
              </View>

              {/* House */}
              <View style={styles.houseContainer}>
                {/* Roof */}
                <View style={styles.roof}>
                  <View style={styles.chimney}>
                    <View style={styles.chimneyBody} />
                    <View style={styles.chimneyTop} />
                    <Text style={styles.smokeEmoji}>💨</Text>
                  </View>
                  <View style={styles.roofMain}>
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
                  <View style={styles.atticWindow}>
                    <View style={styles.atticWindowGlass} />
                    <View style={styles.atticWindowFrame} />
                  </View>
                </View>

                {/* House body with rooms */}
                <View style={[styles.houseBody, { minHeight: houseHeight - HOUSE_PADDING }]}>
                  <View style={styles.topTrim} />

                  {[...unlockedRooms].reverse().map((room) => (
                    <View key={room.id} style={styles.roomRow}>
                      <RoomView
                        room={room}
                        animal={getAnimalForRoom(room.id)}
                        width={ROOM_WIDTH}
                        height={ROOM_HEIGHT}
                        onAnimalPress={onAnimalPress}
                        onRoomPress={onRoomPress}
                        currentPhase={currentPhase}
                      />
                    </View>
                  ))}

                  {unlockedRooms.length === 0 && (
                    <View style={styles.emptyHouse}>
                      <Text style={styles.emptyHouseText}>🏠</Text>
                      <Text style={styles.emptyHouseSubtext}>Your house awaits!</Text>
                    </View>
                  )}
                </View>

                {/* Foundation */}
                <View style={styles.foundation}>
                  <View style={styles.stoneRow}>
                    {[...Array(6)].map((_, i) => (
                      <View key={i} style={styles.stone} />
                    ))}
                  </View>
                </View>
              </View>
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Fixed sky background
  skyBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  skyTop: {
    flex: 2,
    backgroundColor: '#87CEEB',
  },
  skyMiddle: {
    flex: 1,
    backgroundColor: '#9DD5ED',
  },
  skyBottom: {
    flex: 1,
    backgroundColor: '#B0E0E6',
  },

  // Clouds - fixed to screen
  cloud: {
    position: 'absolute',
    flexDirection: 'row',
    zIndex: 200,
  },
  cloudEmoji: {
    fontSize: 45,
    opacity: 0.9,
  },

  // Sun - fixed
  sun: {
    position: 'absolute',
    top: 15,
    right: 20,
    zIndex: 200,
  },
  sunEmoji: {
    fontSize: 50,
  },

  // Birds - fixed
  birds: {
    position: 'absolute',
    top: 50,
    left: 35,
    flexDirection: 'row',
    zIndex: 200,
  },
  birdEmoji: {
    fontSize: 20,
  },

  // Ground layer - fixed at bottom of screen
  groundLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    zIndex: 1,
  },
  grassStrip: {
    height: 50,
    backgroundColor: '#32CD32',
  },
  dirtStrip: {
    flex: 1,
    backgroundColor: '#8B4513',
  },
  groundDecorations: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  groundEmoji: {
    fontSize: 18,
  },

  // Gesture container
  gestureContainer: {
    flex: 1,
    zIndex: 10,
  },

  // Transform container
  transformContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 130,
  },

  // Trees
  treeGroup: {
    position: 'absolute',
    alignItems: 'center',
  },
  leftTrees: {
    left: 15,
    bottom: 5,
  },
  rightTrees: {
    right: 15,
    bottom: 5,
  },
  treeEmoji: {
    fontSize: 55,
  },
  smallTreeEmoji: {
    fontSize: 45,
    marginTop: -10,
  },
  bushEmoji: {
    fontSize: 32,
    marginTop: -12,
  },

  // Fence
  fence: {
    position: 'absolute',
    bottom: 20,
    left: 25,
    flexDirection: 'row',
    gap: 8,
  },
  fencePost: {
    width: 8,
    height: 30,
    backgroundColor: '#D2691E',
    borderRadius: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },

  // House container
  houseContainer: {
    alignItems: 'center',
  },

  // Roof
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

  // House body
  houseBody: {
    backgroundColor: '#A0522D',
    padding: HOUSE_PADDING / 2,
    borderWidth: 5,
    borderColor: '#5D4037',
    borderTopWidth: 0,
    alignItems: 'center',
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
    marginBottom: ROOM_GAP,
  },
  emptyHouse: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHouseText: {
    fontSize: 60,
    marginBottom: 10,
  },
  emptyHouseSubtext: {
    fontSize: 16,
    color: CandyColors.white,
    fontWeight: '700',
  },

  // Foundation
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
});

export default HouseWorld;
