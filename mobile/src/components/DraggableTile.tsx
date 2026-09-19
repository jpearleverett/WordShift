import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Easing, Platform, StyleSheet, View } from 'react-native';
import { useDragOverlay } from './DragOverlay';
import { getDragShadowColor } from '../theme/colors';
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
  /**
   * Called while an ACTIVE drag moves — receives the live finger position
   * (page space). Fires on every move event once the drag threshold has been
   * crossed; the consumer is responsible for cheap ref-compare throttling
   * (e.g. only reacting when the estimated slot index changes). Keep the
   * handler light: it runs inside the PanResponder move path.
   */
  onMove?: (position: { x: number; y: number }) => void;
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
  /**
   * The uniform board scale (computeBoardScale) applied by an ANCESTOR of this
   * tile. The drag ghost is a child of that transform, so a raw page-space
   * delta renders at `dx * scale` — the ghost travelled at a fraction of the
   * finger's speed while the drop still committed at the finger (10% of the
   * drag distance on a 360dp phone, 22% on a 6-letter EXPERT board, which is
   * below 1 on every phone). The ghost's translate and lift are divided by it
   * so the rendered motion is page-space again.
   */
  boardScale?: number;
}

const DRAG_THRESHOLD = 10;
// The floating drag ghost used to ride directly under the finger, occluding
// both the tile itself and the ~18px slot beneath it (F7). Lifting the ghost
// above the finger keeps both visible; the same offset is subtracted from the
// position reported to onMove/onDragEnd so hit-testing still aims at the
// ghost's actual visible center rather than the (now-uncovered) fingertip.
const DRAG_LIFT_DP = 44;

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
  onMove,
  onTap,
  enabled,
  letterChar,
  phase = 0,
  onDragActiveChange,
  boardScale = 1,
}: DraggableTileProps) {
  const overlay = useDragOverlay();
  const overlayRef = useRef(overlay);
  const wrapperRef = useRef<View>(null);
  const ownerRef = useRef({});
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const childrenRef = useRef(children);
  const phaseRef = useRef(phase);
  useLayoutEffect(() => { overlayRef.current = overlay; childrenRef.current = children; phaseRef.current = phase; });
  useEffect(() => {
    return () => overlay?.clear(ownerRef.current);
  }, [overlay]);
  const [translateX] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(0));
  // Lift (F7): 0 at rest, springs to -DRAG_LIFT_DP once the drag activates so
  // the ghost rides above the finger instead of directly under it.
  const [liftAnim] = useState(() => new Animated.Value(0));
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const dragActivated = useRef(false);
  const [sourceOpacity] = useState(() => new Animated.Value(1));
  const [floatingOpacity] = useState(() => new Animated.Value(0));
  const [floatingScale] = useState(() => new Animated.Value(1));

  // Refs for callback props — PanResponder is created once and captures the
  // initial closure. Without refs, callbacks would be stale after re-renders.
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  const onMoveRef = useRef(onMove);
  const onTapRef = useRef(onTap);
  const enabledRef = useRef(enabled);
  const onDragActiveChangeRef = useRef(onDragActiveChange);
  // The board scale needs the same ref mirror as the callbacks, and for the
  // same reason: PanResponder is created ONCE and captures its closure
  // permanently, so a plain prop read inside onPanResponderMove would freeze at
  // the mount-time value (1) forever and counter-scale nothing.
  const scaleRef = useRef(boardScale);
  useLayoutEffect(() => { onDragStartRef.current = onDragStart; });
  useLayoutEffect(() => { onDragEndRef.current = onDragEnd; });
  useLayoutEffect(() => { onMoveRef.current = onMove; });
  useLayoutEffect(() => { onTapRef.current = onTap; });
  useLayoutEffect(() => { enabledRef.current = enabled; });
  useLayoutEffect(() => { onDragActiveChangeRef.current = onDragActiveChange; });
  useLayoutEffect(() => { scaleRef.current = boardScale; });

  // eslint-disable-next-line react-hooks/refs -- PanResponder registers callbacks; refs are read only when responder events fire.
  const [panResponder] = useState(() => (PanResponder.create({
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
        overlayRef.current?.clear(ownerRef.current);
        ownerRef.current = {};
        floatingScale.stopAnimation();
        floatingOpacity.stopAnimation();
        liftAnim.stopAnimation();
        isDragging.current = true;
        dragActivated.current = false;
        translateX.setValue(0);
        translateY.setValue(0);
        liftAnim.setValue(0);
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

          // The root overlay keeps the visual copy outside native ScrollView
          // clipping. Its measured footprint already includes the board scale;
          // page-space gesture deltas therefore stay unscaled in this layer.
          if (overlayRef.current && wrapperRef.current) {
            const dimensions = dimensionsRef.current;
            const child = childrenRef.current;
            const shadow = getDragShadowColor(phaseRef.current);
            overlayRef.current.show({
              owner: ownerRef.current,
              anchor: wrapperRef.current,
              render: frame => {
                const width = dimensions.width || frame.width;
                const height = dimensions.height || frame.height;
                return (
                  <Animated.View style={{
                    position: 'absolute', left: frame.x, top: frame.y,
                    width: frame.width, height: frame.height,
                    opacity: floatingOpacity,
                    transform: [{ translateX }, { translateY: Animated.add(translateY, liftAnim) }, { scale: floatingScale }],
                  }}>
                    <View style={[
                      styles.floatingTile,
                      {
                        left: (frame.width - width) / 2, top: (frame.height - height) / 2,
                        width, height, shadowColor: shadow,
                        transform: [{ scale: frame.width / width }],
                      },
                    ]}>{child}</View>
                  </Animated.View>
                );
              },
            });
          }

          // Show floating tile, dim source
          floatingOpacity.setValue(1);
          sourceOpacity.setValue(0.3);
          const settings = getSettingsSync();
          // Counter-scale the lift too, or the ghost rides only 44*s dp above
          // the finger while lines 164/177 subtract the full 44 — the aim point
          // and the visible centre would disagree by ~10dp on EXPERT.
          const liftScale = overlayRef.current ? 1 : scaleRef.current || 1;
          if (!settings.reducedMotion) {
            Animated.spring(floatingScale, {
              toValue: 1.1,
              friction: 8,
              tension: 200,
              useNativeDriver: true,
            }).start();
            Animated.spring(liftAnim, {
              toValue: -DRAG_LIFT_DP / liftScale,
              friction: 7,
              tension: 120,
              useNativeDriver: true,
            }).start();
          } else {
            liftAnim.setValue(-DRAG_LIFT_DP / liftScale);
          }
        }

        if (dragActivated.current) {
          // Divide by the live board scale so the ghost's RENDERED travel
          // equals the finger's page-space travel. The positions reported to
          // onMove/onDragEnd stay raw page space — estimateSlotIndex hit-tests
          // there and applies the scale itself.
          const s = overlayRef.current ? 1 : scaleRef.current || 1;
          translateX.setValue(dx / s);
          translateY.setValue(dy / s);
          // Live hover feedback: report the finger's page position, lifted by
          // the same DRAG_LIFT_DP the ghost visually rides at (F7) — the aim
          // point stays the ghost's visible center, not the covered fingertip.
          onMoveRef.current?.({
            x: startPos.current.x + dx,
            y: startPos.current.y + dy - DRAG_LIFT_DP,
          });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        isDragging.current = false;
        // Re-enable parent ScrollView
        onDragActiveChangeRef.current?.(false);

        if (dragActivated.current) {
          // Drag was active — fire drop callback with the finger position,
          // lifted by DRAG_LIFT_DP to match the ghost's visible center (F7).
          const dropX = startPos.current.x + gestureState.dx;
          const dropY = startPos.current.y + gestureState.dy - DRAG_LIFT_DP;

          const settings = getSettingsSync();
          const releasedOwner = ownerRef.current;
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
              if (ownerRef.current !== releasedOwner) return;
              // Reset after animation
              translateX.setValue(0);
              translateY.setValue(0);
              liftAnim.setValue(0);
              floatingScale.setValue(1);
              sourceOpacity.setValue(1);
              overlayRef.current?.clear(ownerRef.current);
            });
          } else {
            translateX.setValue(0);
            translateY.setValue(0);
            liftAnim.setValue(0);
            floatingOpacity.setValue(0);
            floatingScale.setValue(1);
            sourceOpacity.setValue(1);
            overlayRef.current?.clear(ownerRef.current);
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
        liftAnim.setValue(0);
        floatingOpacity.setValue(0);
        floatingScale.setValue(1);
        sourceOpacity.setValue(1);
        overlayRef.current?.clear(ownerRef.current);
      },
    })));

  const shadowColor = getDragShadowColor(phase);

  // RN's View accepts an Android-only `onClick` (the `topClick` event a
  // `focusable` view dispatches on an accessibility or keyboard activation)
  // that the TypeScript typings do not declare, so it is spread in typed
  // loosely rather than cast at the JSX attribute.
  // Android only: react-native-web forwards `onClick` to the DOM as a real
  // click handler, so on web it would fire beside the responder's own tap and
  // toggle the letter twice (select, then deselect); on Android a touch never
  // reaches performClick (ReactViewGroup consumes it for the JS responder), so
  // the prop there means exactly an assistive-tech or keyboard activation.
  const accessibilityClickProps: Record<string, unknown> = Platform.OS === 'android'
    ? { onClick: () => { if (enabledRef.current) onTapRef.current(); } }
    : {};

  return (
    <View ref={wrapperRef} collapsable={false} style={styles.wrapper} onLayout={event => { dimensionsRef.current = event.nativeEvent.layout; }}>
      {/* Source tile (dims during drag). This wrapper is the ONE accessibility
          node for a draggable letter (accessibility-devices-3). It is
          `focusable` with an `onClick` so an assistive-tech activation on
          Android (TalkBack sends ACTION_CLICK to a role=button node, which a
          bare PanResponder view never receives) selects the letter exactly like
          a tap; iOS VoiceOver synthesizes a touch at the element's centre, which
          the PanResponder already reads as a tap. The LetterTile content below
          is hidden from the tree so the letter is announced once, not twice
          (the second, hint-less "Letter X" stop was the inert one). */}
      <Animated.View
        style={{ opacity: sourceOpacity }}
        accessible={true}
        focusable={true}
        {...accessibilityClickProps}
        accessibilityRole="button"
        accessibilityLabel={letterChar ? `Letter ${letterChar}` : 'Letter'}
        accessibilityHint="Double tap to pick up this letter, then choose a drop slot"
        accessibilityState={{ disabled: !enabled }}
        {...panResponder.panHandlers}
      >
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {children}
        </View>
      </Animated.View>

      {/* Floating drag tile (follows finger). Never an accessibility stop: it
          is a visual copy of the letter above. */}
      {!overlay && <Animated.View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[
          styles.floatingTile,
          {
            opacity: floatingOpacity,
            transform: [
              { translateX },
              // Lifted above the raw finger translateY (F7) so the ghost
              // never occludes the tile it came from or the slot beneath it.
              { translateY: Animated.add(translateY, liftAnim) },
              { scale: floatingScale },
            ],
            shadowColor,
          },
        ]}
      >
        {children}
      </Animated.View>}
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
