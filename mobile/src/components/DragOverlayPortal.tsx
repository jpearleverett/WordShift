/**
 * DragOverlayPortal
 *
 * A global overlay layer rendered at the App.tsx root level (above all screen content)
 * that displays the floating drag tile during drag-and-drop interactions.
 *
 * This fixes the Android z-index/elevation issue where tiles rendered inside a Row's
 * subtree clip behind sibling rows. By rendering the floating tile at the top of the
 * view hierarchy, it's guaranteed to appear above everything.
 *
 * Architecture:
 * - Shared Reanimated values are created here and passed down to DraggableTile via props
 * - DraggableTile writes position/scale/opacity in its gesture worklet (UI thread)
 * - This component reads those same values via useAnimatedStyle (UI thread)
 * - Result: zero-latency finger tracking with no JS bridge round-trips
 *
 * The tile appearance (letter, color, phase) is set once on drag start via runOnJS
 * and stored in a React ref — it doesn't change during the drag.
 */

import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  SharedValue,
} from 'react-native-reanimated';
import { Canvas, RoundedRect, BlurMask } from '@shopify/react-native-skia';
import { getTileColor, CandyColors } from '../theme/colors';
import { shouldSimplifyAnimations } from '../services/deviceTier';

// Tile appearance snapshot set once per drag
export interface DragTileSnapshot {
  char: string;
  phase: number;
  compact: boolean;
}

// Shared values that DraggableTile writes to and DragOverlayPortal reads from
export interface DragOverlaySharedValues {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
  /** Offset from finger to tile center — set on drag start, used to keep tile centered under finger */
  offsetX: SharedValue<number>;
  offsetY: SharedValue<number>;
}

// Hook that creates the shared values and snapshot management
export function useDragOverlay() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const snapshotRef = useRef<DragTileSnapshot | null>(null);
  // Force re-render when snapshot changes so the overlay picks up new tile info
  const [, setSnapshotVersion] = React.useState(0);

  const setSnapshot = useCallback((snapshot: DragTileSnapshot | null) => {
    snapshotRef.current = snapshot;
    setSnapshotVersion(v => v + 1);
  }, []);

  const sharedValues: DragOverlaySharedValues = {
    translateX,
    translateY,
    scale,
    opacity,
    offsetX,
    offsetY,
  };

  return { sharedValues, snapshotRef, setSnapshot };
}

// Standard tile dimensions (matches LetterTile.tsx)
const STD_BODY_W = 52;
const STD_BODY_H = 56;
const COMPACT_BODY_W = 42;
const COMPACT_BODY_H = 46;

/**
 * Simplified tile replica for the drag overlay.
 * Renders just the 3D candy body + letter — no animations, no glow canvas.
 * Designed to be lightweight since it's rendered at the root level.
 */
function MiniDragTile({ char, phase, compact }: DragTileSnapshot) {
  const tileColor = getTileColor(char);
  const bodyW = compact ? COMPACT_BODY_W : STD_BODY_W;
  const bodyH = compact ? COMPACT_BODY_H : STD_BODY_H;
  const fontSize = compact ? 21 : 26;

  // Use source-highlight colors (bright, per-letter color)
  const bgColor = tileColor.bg;
  const borderColor = tileColor.border;

  // Phase-aware shadow color for the drag
  const shadowColor = phase >= 5 ? '#7B6B8A'
    : phase >= 3 ? '#C03050'
    : '#FFD700';

  return (
    <View style={[styles.tileOuter, compact && { width: COMPACT_BODY_W, height: COMPACT_BODY_H + 8 }]}>
      {/* Main tile body */}
      <View
        style={[
          styles.tileBody,
          compact && { width: bodyW, height: bodyH, borderRadius: 12 },
          {
            backgroundColor: bgColor,
            borderBottomColor: borderColor,
            shadowColor,
          },
        ]}
      >
        {/* Top highlight (bevel effect) */}
        <View style={styles.bevelTop} />
        {/* Glossy shine overlay */}
        <View style={styles.glossyShine} />
        {/* Letter text */}
        <Text style={[styles.letterText, { fontSize, color: CandyColors.white }]}>
          {char}
        </Text>
        {/* Specular highlight dot */}
        <View style={styles.specularDot} />
      </View>
      {/* 3D bottom edge */}
      <View style={[styles.tileEdge, { backgroundColor: borderColor }]} />
    </View>
  );
}

// Trail constants
const TRAIL_COUNT = 4;
const TRAIL_SAMPLE_INTERVAL = 3; // Sample every N frames
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Phase-aware trail color
function getTrailColor(phase: number): string {
  if (phase >= 5) return '#7B6B8A'; // ghostly mauve
  if (phase >= 3) return '#C03050'; // crimson
  return '#FFD700'; // golden
}

/**
 * Skia-rendered trail behind the floating drag tile.
 * Samples position every TRAIL_SAMPLE_INTERVAL frames and renders fading
 * rounded rects at previous positions — creates a satisfying motion trail.
 */
function DragTrailCanvas({ sharedValues, phase }: {
  sharedValues: DragOverlaySharedValues;
  phase: number;
}) {
  // Ring buffer of trail positions (stored as shared values for UI-thread access)
  const trailX = Array.from({ length: TRAIL_COUNT }, () => useSharedValue(0));
  const trailY = Array.from({ length: TRAIL_COUNT }, () => useSharedValue(0));
  const trailActive = useSharedValue(0); // 0 = hidden, 1 = active
  const frameCount = useSharedValue(0);
  const trailIndex = useSharedValue(0);

  // Sample positions on the UI thread
  useFrameCallback(() => {
    'worklet';
    if (sharedValues.opacity.value < 0.5) {
      trailActive.value = 0;
      frameCount.value = 0;
      return;
    }
    trailActive.value = 1;
    frameCount.value++;

    if (frameCount.value % TRAIL_SAMPLE_INTERVAL === 0) {
      const idx = trailIndex.value % TRAIL_COUNT;
      trailX[idx].value = sharedValues.translateX.value + sharedValues.offsetX.value;
      trailY[idx].value = sharedValues.translateY.value + sharedValues.offsetY.value;
      trailIndex.value++;
    }
  });

  const color = getTrailColor(phase);
  const tileW = 52;
  const tileH = 56;

  // Derived opacity/position values for each trail element
  const trailProps = trailX.map((_, i) => {
    const x = useDerivedValue(() => trailX[i].value);
    const y = useDerivedValue(() => trailY[i].value);
    // Older trail elements are more faded; newest is index (trailIndex - 1)
    const opacity = useDerivedValue(() => {
      if (trailActive.value < 0.5) return 0;
      const age = (trailIndex.value - 1 - i + TRAIL_COUNT) % TRAIL_COUNT;
      return Math.max(0, 0.25 - age * 0.06);
    });
    return { x, y, opacity };
  });

  return (
    <Canvas style={styles.trailCanvas} pointerEvents="none">
      {trailProps.map((tp, i) => (
        <RoundedRect
          key={i}
          x={tp.x}
          y={tp.y}
          width={tileW}
          height={tileH}
          r={14}
          color={color}
          opacity={tp.opacity}
        >
          <BlurMask blur={8} style="normal" />
        </RoundedRect>
      ))}
    </Canvas>
  );
}

interface DragOverlayPortalProps {
  sharedValues: DragOverlaySharedValues;
  snapshotRef: React.RefObject<DragTileSnapshot | null>;
}

export function DragOverlayPortal({ sharedValues, snapshotRef }: DragOverlayPortalProps) {
  const snapshot = snapshotRef.current;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: sharedValues.opacity.value,
    transform: [
      { translateX: sharedValues.translateX.value + sharedValues.offsetX.value },
      { translateY: sharedValues.translateY.value + sharedValues.offsetY.value },
      { scale: sharedValues.scale.value },
    ],
  }));

  // Only render trail on capable devices
  const showTrail = !shouldSimplifyAnimations();

  return (
    <>
      {/* Skia trail behind the tile — rendered fullscreen, samples shared values */}
      {showTrail && snapshot && (
        <DragTrailCanvas sharedValues={sharedValues} phase={snapshot.phase} />
      )}

      {/* Floating tile */}
      <Animated.View
        style={[styles.overlay, animatedStyle]}
        pointerEvents="none"
      >
        {snapshot && <MiniDragTile {...snapshot} />}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  trailCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
    zIndex: 99998,
    elevation: 98,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 99999,
    elevation: 99,
  },
  tileOuter: {
    width: STD_BODY_W,
    height: STD_BODY_H + 8,
    alignItems: 'center',
  },
  tileBody: {
    width: STD_BODY_W,
    height: STD_BODY_H,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  bevelTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  glossyShine: {
    position: 'absolute',
    top: 4,
    left: 6,
    right: 6,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 8,
  },
  letterText: {
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
    zIndex: 10,
  },
  specularDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 4,
  },
  tileEdge: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    right: 4,
    height: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: -1,
  },
});
