/**
 * FlyingTileGhost — the cross-row travel of a tap-committed move (audit F1).
 *
 * A ghost copy of the moved letter tile flies from the source tile's window
 * position into the landing slot, converging exactly where the real arriving
 * tile is playing its arrival settle (which starts small, at scale 0.65), so
 * the ghost visually "becomes" the tile as it lands. Purely additive: the
 * committed board state never waits on it, it captures no touches
 * (pointerEvents "none"), and reduced-motion / low-tier devices never mount
 * it (App gates the flight before setting state).
 *
 * Rendered by App as a window-coordinate overlay (the StarBurst precedent):
 * absolute at the source center, animated by translate to the target center.
 * Uses the real LetterTile for pixel-faithful candy chrome; the ghost letter
 * is locked (the arriving tile lands locked) and never interactable.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LetterTile } from '../LetterTile';
import { STANDARD_TILE_W, COMPACT_TILE_W } from '../../constants/tileLayout';
import { TILE_FLIGHT_MS, TILE_FLIGHT_LIFT_DP } from '../../constants/timing';

/** One flight, resolved to window coordinates of the tile CENTERS. */
export interface TileFlight {
  /** The arrival moveId — dedupes stale flights. */
  id: number;
  char: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Compact tiles (word length >= 6) at the landing row. */
  compact: boolean;
  phase: number;
}

const STANDARD_OUTER_H = 64;
const COMPACT_OUTER_H = 52;

interface Props {
  flight: TileFlight | null;
  onDone: (id: number) => void;
}

export const FlyingTileGhost: React.FC<Props> = ({ flight, onDone }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const flightIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!flight) return;
    if (flightIdRef.current === flight.id) return;
    flightIdRef.current = flight.id;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: TILE_FLIGHT_MS,
      // Fast leave, soft land — the tile is "thrown" down the chain.
      easing: Easing.bezier(0.25, 0.6, 0.35, 1),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) onDone(flight.id);
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the flight id; onDone is stable
  }, [flight?.id]);

  if (!flight) return null;

  const w = flight.compact ? COMPACT_TILE_W : STANDARD_TILE_W;
  const h = flight.compact ? COMPACT_OUTER_H : STANDARD_OUTER_H;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, flight.toX - flight.fromX],
  });
  // The vertical path gets a slight upward bow (the "throw"): overshoot the
  // straight line early, settle into the target. Two-segment interpolation
  // keeps it on the native driver.
  const dy = flight.toY - flight.fromY;
  const lift = dy >= 0 ? -TILE_FLIGHT_LIFT_DP : TILE_FLIGHT_LIFT_DP;
  const translateY = progress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, dy * 0.35 + lift, dy],
  });
  // A whisper of grow-then-settle so the flight reads as lift-off, matching
  // the arrival settle it hands over to (which starts at 0.65 and springs up).
  const scale = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 1.08, 0.9],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.85, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={{
          position: 'absolute',
          left: flight.fromX - w / 2,
          top: flight.fromY - h / 2,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        }}
      >
        <LetterTile
          letter={{ id: `flight_${flight.id}`, char: flight.char, isLocked: true }}
          phase={flight.phase}
          compact={flight.compact}
          isInteractable={false}
        />
      </Animated.View>
    </View>
  );
};
