import React, { useRef, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { getSettingsSync } from '../services/settings';
import { hapticSelection } from '../services/haptics';
import { DROP_IMPACT_POP_MS, DROP_IMPACT_COLLAPSE_MS } from '../constants/timing';

interface DraggableTileProps {
  /** The rendered child (LetterTile wrapped in its container) */
  children: React.ReactNode;
  /** Called when drag starts (selects the letter, same as tap) */
  onDragStart: () => void;
  /** Called when drag ends over a valid area — receives finger position */
  onDragEnd: (position: { x: number; y: number }) => void;
  /** Called on simple tap (no drag gesture activated) */
  onTap: () => void;
  /** Whether this tile can be interacted with */
  enabled: boolean;
  /** Phase for styling the drag shadow */
  phase?: number;
  /** Called when drag activation state changes — used to disable parent ScrollView during drag */
  onDragActiveChange?: (active: boolean) => void;
}

const DRAG_THRESHOLD = 10;

/**
 * Wraps a LetterTile child with drag-and-drop capability using
 * react-native-gesture-handler + react-native-reanimated.
 *
 * On short press: fires `onTap` (existing letter selection behavior).
 * On drag beyond threshold: shows a floating copy following the finger
 * on the UI thread, dims the source tile, and fires `onDragEnd`.
 *
 * Uses RNGH Gesture.Pan() with Reanimated shared values for buttery-smooth
 * UI-thread drag tracking. All game callbacks are dispatched via runOnJS.
 */
export function DraggableTile({
  children,
  onDragStart,
  onDragEnd,
  onTap,
  enabled,
  phase = 0,
  onDragActiveChange,
}: DraggableTileProps) {
  // Shared values for UI-thread drag tracking
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const sourceOpacity = useSharedValue(1);
  const floatingOpacity = useSharedValue(0);
  const floatingScale = useSharedValue(1);

  // Track drag state across gesture callbacks
  const dragActivated = useSharedValue(false);
  const startPageX = useSharedValue(0);
  const startPageY = useSharedValue(0);

  // Refs for latest callback props (gesture callbacks are worklets,
  // runOnJS will call the latest ref value)
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  const onTapRef = useRef(onTap);
  const onDragActiveChangeRef = useRef(onDragActiveChange);
  onDragStartRef.current = onDragStart;
  onDragEndRef.current = onDragEnd;
  onTapRef.current = onTap;
  onDragActiveChangeRef.current = onDragActiveChange;

  // JS-thread callbacks dispatched from worklets via runOnJS (memoized — refs handle staleness)
  const jsDragStart = useCallback(() => {
    hapticSelection();
    onDragStartRef.current();
  }, []);
  const jsDragEnd = useCallback((x: number, y: number) => {
    onDragEndRef.current({ x, y });
  }, []);
  const jsTap = useCallback(() => {
    onTapRef.current();
  }, []);
  const jsDragActiveChange = useCallback((active: boolean) => {
    onDragActiveChangeRef.current?.(active);
  }, []);

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .minDistance(DRAG_THRESHOLD)
    .onBegin((e) => {
      'worklet';
      startPageX.value = e.absoluteX - e.x;
      startPageY.value = e.absoluteY - e.y;
      dragActivated.value = false;
      translateX.value = 0;
      translateY.value = 0;
      runOnJS(jsDragActiveChange)(true);
    })
    .onStart(() => {
      'worklet';
      // Drag threshold crossed — activate drag mode
      dragActivated.value = true;
      floatingOpacity.value = 1;
      sourceOpacity.value = 0.3;
      floatingScale.value = withSpring(1.1, { damping: 14, stiffness: 200 });
      runOnJS(jsDragStart)();
    })
    .onUpdate((e) => {
      'worklet';
      if (dragActivated.value) {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      'worklet';
      if (dragActivated.value) {
        const dropX = startPageX.value + e.x;
        const dropY = startPageY.value + e.y;

        // Pop-then-collapse animation on UI thread
        floatingScale.value = withSequence(
          withTiming(1.15, {
            duration: DROP_IMPACT_POP_MS,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(0, {
            duration: DROP_IMPACT_COLLAPSE_MS,
            easing: Easing.in(Easing.quad),
          }),
        );
        floatingOpacity.value = withTiming(0, {
          duration: DROP_IMPACT_POP_MS + DROP_IMPACT_COLLAPSE_MS,
        });

        runOnJS(jsDragEnd)(dropX, dropY);
      }
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(jsDragActiveChange)(false);
      if (dragActivated.value) {
        // Drag completed — reset after collapse animation plays
        translateX.value = withTiming(0, { duration: 0 });
        translateY.value = withTiming(0, { duration: 0 });
        floatingScale.value = withTiming(1, { duration: 0 });
        sourceOpacity.value = withTiming(1, {
          duration: DROP_IMPACT_POP_MS + DROP_IMPACT_COLLAPSE_MS,
        });
      } else {
        // Gesture failed (tap — finger lifted before minDistance) — fire tap callback
        runOnJS(jsTap)();
        sourceOpacity.value = 1;
        floatingOpacity.value = 0;
      }
      dragActivated.value = false;
    });

  const sourceStyle = useAnimatedStyle(() => ({
    opacity: sourceOpacity.value,
  }));

  const floatingStyle = useAnimatedStyle(() => ({
    opacity: floatingOpacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: floatingScale.value },
    ],
  }));

  const shadowColor = phase >= 5 ? '#7B6B8A80'   // ghostly mauve (terrible peace)
    : phase >= 3 ? '#8030508C'                    // crimson (cult/dread)
    : '#FFD70050';                                // golden (bright days)

  return (
    <View style={styles.wrapper}>
      {/* Source tile (dims during drag) */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={sourceStyle}>
          {children}
        </Animated.View>
      </GestureDetector>

      {/* Floating drag tile (follows finger on UI thread) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.floatingTile,
          { shadowColor },
          floatingStyle,
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  floatingTile: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
});
