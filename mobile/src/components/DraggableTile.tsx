import React, { useRef } from 'react';
import { Animated, PanResponder, Easing, StyleSheet, View } from 'react-native';
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
  /** Letter character for the accessibility label */
  letterChar?: string;
  /** Phase for styling the drag shadow */
  phase?: number;
  /** Called when drag activation state changes — used to disable parent ScrollView during drag */
  onDragActiveChange?: (active: boolean) => void;
}

const DRAG_THRESHOLD = 10;

/**
 * Wraps a LetterTile child with drag-and-drop capability.
 *
 * On short press: fires `onTap` (existing letter selection behavior).
 * On drag beyond threshold: shows a floating copy following the finger,
 * dims the source tile, and fires `onDragEnd` with the finger's final position.
 *
 * The parent (Row/App) is responsible for hit-testing the drop position
 * against slot rects and triggering the appropriate slot press.
 *
 * Uses refs for all callback props to avoid stale closures in PanResponder
 * (PanResponder is created once in a ref and never recreated).
 */
export function DraggableTile({
  children,
  onDragStart,
  onDragEnd,
  onTap,
  enabled,
  letterChar,
  phase = 0,
  onDragActiveChange,
}: DraggableTileProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const dragActivated = useRef(false);
  const sourceOpacity = useRef(new Animated.Value(1)).current;
  const floatingOpacity = useRef(new Animated.Value(0)).current;
  const floatingScale = useRef(new Animated.Value(1)).current;

  // Refs for callback props — PanResponder is created once and captures the
  // initial closure. Without refs, callbacks would be stale after re-renders.
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  const onTapRef = useRef(onTap);
  const enabledRef = useRef(enabled);
  const onDragActiveChangeRef = useRef(onDragActiveChange);
  onDragStartRef.current = onDragStart;
  onDragEndRef.current = onDragEnd;
  onTapRef.current = onTap;
  enabledRef.current = enabled;
  onDragActiveChangeRef.current = onDragActiveChange;

  const panResponder = useRef(
    PanResponder.create({
      // Capture phase: claim responder before ScrollView can intercept
      onStartShouldSetPanResponderCapture: () => enabledRef.current,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (!enabledRef.current) return false;
        const { dx, dy } = gestureState;
        return Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD;
      },
      onStartShouldSetPanResponder: () => enabledRef.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!enabledRef.current) return false;
        const { dx, dy } = gestureState;
        return Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD;
      },
      // Refuse to surrender responder once drag is active
      onPanResponderTerminationRequest: () => !dragActivated.current,
      onPanResponderGrant: (evt) => {
        startPos.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
        };
        isDragging.current = true;
        dragActivated.current = false;
        translateX.setValue(0);
        translateY.setValue(0);
        // Disable parent ScrollView immediately on touch to prevent scroll race
        onDragActiveChangeRef.current?.(true);
      },
      onPanResponderMove: (_, gestureState) => {
        if (!isDragging.current) return;
        const { dx, dy } = gestureState;

        // Activate drag after threshold
        if (!dragActivated.current && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
          dragActivated.current = true;
          hapticSelection();
          onDragStartRef.current();

          // Show floating tile, dim source
          floatingOpacity.setValue(1);
          sourceOpacity.setValue(0.3);
          const settings = getSettingsSync();
          if (!settings.reducedMotion) {
            Animated.spring(floatingScale, {
              toValue: 1.1,
              friction: 8,
              tension: 200,
              useNativeDriver: true,
            }).start();
          }
        }

        if (dragActivated.current) {
          translateX.setValue(dx);
          translateY.setValue(dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        isDragging.current = false;
        // Re-enable parent ScrollView
        onDragActiveChangeRef.current?.(false);

        if (dragActivated.current) {
          // Drag was active — fire drop callback with finger position
          const dropX = startPos.current.x + gestureState.dx;
          const dropY = startPos.current.y + gestureState.dy;

          const settings = getSettingsSync();
          if (!settings.reducedMotion) {
            // Pop-then-collapse: brief scale-up "impact" → shrink to nothing
            Animated.sequence([
              // Pop: quick scale burst
              Animated.timing(floatingScale, {
                toValue: 1.15,
                duration: DROP_IMPACT_POP_MS,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              // Collapse: shrink to zero + fade
              Animated.parallel([
                Animated.timing(floatingScale, {
                  toValue: 0,
                  duration: DROP_IMPACT_COLLAPSE_MS,
                  easing: Easing.in(Easing.quad),
                  useNativeDriver: true,
                }),
                Animated.timing(floatingOpacity, {
                  toValue: 0,
                  duration: DROP_IMPACT_COLLAPSE_MS,
                  useNativeDriver: true,
                }),
              ]),
            ]).start(() => {
              // Reset after animation
              translateX.setValue(0);
              translateY.setValue(0);
              floatingScale.setValue(1);
              sourceOpacity.setValue(1);
            });
          } else {
            translateX.setValue(0);
            translateY.setValue(0);
            floatingOpacity.setValue(0);
            floatingScale.setValue(1);
            sourceOpacity.setValue(1);
          }

          onDragEndRef.current({ x: dropX, y: dropY });
        } else {
          // No drag — treat as tap
          sourceOpacity.setValue(1);
          floatingOpacity.setValue(0);
          onTapRef.current();
        }

        dragActivated.current = false;
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        dragActivated.current = false;
        // Re-enable parent ScrollView on termination
        onDragActiveChangeRef.current?.(false);
        translateX.setValue(0);
        translateY.setValue(0);
        floatingOpacity.setValue(0);
        floatingScale.setValue(1);
        sourceOpacity.setValue(1);
      },
    })
  ).current;

  const shadowColor = phase >= 5 ? '#7B6B8A80'   // ghostly mauve (terrible peace)
    : phase >= 3 ? '#8030508C'                    // crimson (cult/dread)
    : '#FFD70050';                                // golden (bright days)

  return (
    <View style={styles.wrapper}>
      {/* Source tile (dims during drag) */}
      <Animated.View
        style={{ opacity: sourceOpacity }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={letterChar ? `Letter ${letterChar}` : 'Letter'}
        accessibilityHint="Double tap to pick up this letter, then choose a drop slot"
        accessibilityState={{ disabled: !enabled }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>

      {/* Floating drag tile (follows finger) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.floatingTile,
          {
            opacity: floatingOpacity,
            transform: [
              { translateX },
              { translateY },
              { scale: floatingScale },
            ],
            shadowColor,
          },
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
