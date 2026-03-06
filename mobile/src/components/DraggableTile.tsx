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
import { hapticSelection, hapticHeavy } from '../services/haptics';
import { DROP_IMPACT_POP_MS, DROP_IMPACT_COLLAPSE_MS } from '../constants/timing';
import type { DragOverlaySharedValues, DragTileSnapshot } from './DragOverlayPortal';

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
  /** Shared values for the global drag overlay layer (rendered at App.tsx level) */
  overlaySharedValues?: DragOverlaySharedValues;
  /** Called to set the tile snapshot for the overlay on drag start */
  onSetDragSnapshot?: (snapshot: DragTileSnapshot | null) => void;
  /** The letter character for the overlay tile snapshot */
  letterChar?: string;
  /** Whether to use compact tile in overlay */
  compact?: boolean;
}

const DRAG_THRESHOLD = 10;

/**
 * Wraps a LetterTile child with drag-and-drop capability using
 * react-native-gesture-handler + react-native-reanimated.
 *
 * On short press: fires `onTap` (existing letter selection behavior).
 * On drag beyond threshold: activates a floating copy in the global
 * DragOverlayPortal (rendered at App.tsx level, above all rows),
 * dims the source tile, and fires `onDragEnd` on release.
 *
 * The floating tile position is written directly to shared values in the
 * gesture worklet — zero JS bridge, pure UI-thread tracking.
 */
export function DraggableTile({
  children,
  onDragStart,
  onDragEnd,
  onTap,
  enabled,
  phase = 0,
  onDragActiveChange,
  overlaySharedValues,
  onSetDragSnapshot,
  letterChar,
  compact = false,
}: DraggableTileProps) {
  // Source tile animation (dims + shrinks during drag)
  const sourceOpacity = useSharedValue(1);
  const sourceScale = useSharedValue(1);

  // Track drag state across gesture callbacks
  const dragActivated = useSharedValue(false);
  const startAbsX = useSharedValue(0);
  const startAbsY = useSharedValue(0);

  // Refs for latest callback props
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  const onTapRef = useRef(onTap);
  const onDragActiveChangeRef = useRef(onDragActiveChange);
  const onSetDragSnapshotRef = useRef(onSetDragSnapshot);
  onDragStartRef.current = onDragStart;
  onDragEndRef.current = onDragEnd;
  onTapRef.current = onTap;
  onDragActiveChangeRef.current = onDragActiveChange;
  onSetDragSnapshotRef.current = onSetDragSnapshot;

  // JS-thread callbacks
  const jsDragStart = useCallback(() => {
    hapticSelection();
    // Set the tile snapshot for the overlay
    if (onSetDragSnapshotRef.current && letterChar) {
      onSetDragSnapshotRef.current({ char: letterChar, phase, compact });
    }
    onDragStartRef.current();
  }, [letterChar, phase, compact]);

  const jsDragEnd = useCallback((x: number, y: number) => {
    hapticHeavy(); // Satisfying heavy haptic on drop landing
    onDragEndRef.current({ x, y });
  }, []);

  const jsTap = useCallback(() => {
    onTapRef.current();
  }, []);

  const jsDragActiveChange = useCallback((active: boolean) => {
    onDragActiveChangeRef.current?.(active);
  }, []);

  const jsClearSnapshot = useCallback(() => {
    if (onSetDragSnapshotRef.current) {
      onSetDragSnapshotRef.current(null);
    }
  }, []);

  const ov = overlaySharedValues;

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .minDistance(DRAG_THRESHOLD)
    .onBegin((e) => {
      'worklet';
      // Record the absolute position of the tile on screen
      startAbsX.value = e.absoluteX - e.x;
      startAbsY.value = e.absoluteY - e.y;
      dragActivated.value = false;
      runOnJS(jsDragActiveChange)(true);
    })
    .onStart((e) => {
      'worklet';
      // Drag threshold crossed — activate drag mode
      dragActivated.value = true;

      // Ghost the source tile with spring (smooth, not instant)
      sourceOpacity.value = withSpring(0.25, { damping: 20, stiffness: 300 });
      sourceScale.value = withSpring(0.9, { damping: 20, stiffness: 300 });

      // Position the overlay tile at the finger's absolute position
      if (ov) {
        // Calculate tile center offset (tile is ~26px wide from center)
        const tileCenterX = compact ? 21 : 26;
        const tileCenterY = compact ? 30 : 32;
        ov.offsetX.value = -tileCenterX;
        ov.offsetY.value = -tileCenterY;
        ov.translateX.value = e.absoluteX;
        ov.translateY.value = e.absoluteY;
        ov.scale.value = withSpring(1.12, { damping: 12, stiffness: 200 });
        ov.opacity.value = 1;
      }

      runOnJS(jsDragStart)();
    })
    .onUpdate((e) => {
      'worklet';
      if (dragActivated.value && ov) {
        // Update overlay position — pure UI thread, zero latency
        ov.translateX.value = e.absoluteX;
        ov.translateY.value = e.absoluteY;
      }
    })
    .onEnd((e) => {
      'worklet';
      if (dragActivated.value) {
        const dropX = e.absoluteX;
        const dropY = e.absoluteY;

        // Pop-then-collapse animation on the overlay
        if (ov) {
          ov.scale.value = withSequence(
            withTiming(1.2, {
              duration: DROP_IMPACT_POP_MS,
              easing: Easing.out(Easing.back(1.5)),
            }),
            withTiming(0, {
              duration: DROP_IMPACT_COLLAPSE_MS,
              easing: Easing.in(Easing.quad),
            }),
          );
          ov.opacity.value = withTiming(0, {
            duration: DROP_IMPACT_POP_MS + DROP_IMPACT_COLLAPSE_MS,
          });
        }

        runOnJS(jsDragEnd)(dropX, dropY);
      }
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(jsDragActiveChange)(false);
      if (dragActivated.value) {
        // Drag completed — restore source tile with spring
        sourceOpacity.value = withSpring(1, { damping: 15, stiffness: 200 });
        sourceScale.value = withSpring(1, { damping: 15, stiffness: 200 });

        // Reset overlay after collapse animation
        if (ov) {
          ov.translateX.value = withTiming(0, { duration: 0 });
          ov.translateY.value = withTiming(0, { duration: 0 });
          ov.scale.value = withTiming(1, { duration: 0 });
        }
        // Clear snapshot after animation completes
        runOnJS(jsClearSnapshot)();
      } else {
        // Gesture failed (tap — finger lifted before minDistance) — fire tap
        runOnJS(jsTap)();
        sourceOpacity.value = 1;
        sourceScale.value = 1;
        if (ov) {
          ov.opacity.value = 0;
        }
      }
      dragActivated.value = false;
    });

  const sourceStyle = useAnimatedStyle(() => ({
    opacity: sourceOpacity.value,
    transform: [{ scale: sourceScale.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={sourceStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
});
