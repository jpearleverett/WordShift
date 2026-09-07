import { useState } from 'react';

/**
 * Hand an arrival mark to a row's tiles ONLY in the layout generation it first
 * rendered in.
 *
 * Row mounts its arc and standard layouts under distinct keys, so every flip
 * between them remounts the row's tiles, and LetterTile plays its arrival
 * settle from its mount effect. An arrival mark outlives the flips around it
 * (a double-shift first drop's mark stays on the row until the second drop
 * lands), so an ungated tile replayed its landing every time the fan opened
 * or closed. The gate records the generation the mark first renders into and
 * returns it only while that generation is current: same generation, keep
 * passing it (a re-render must not change the prop on a mounted tile, or its
 * effect cleanup cuts the spring); any later generation, the fresh tile
 * mounts at rest.
 *
 * Everything here is render-phase state, never a ref read during render. The
 * generation is recorded and compared against the value THIS pass renders into
 * (`renderGen`), not the stale state: a drop from the fan lands the flip and
 * the mark in the same render, and recording the pre-flip generation withheld
 * the very first delivery of every tap-committed arrival, forever (React
 * re-runs the component for the render-phase updates, and by the committed
 * pass `layoutGen` had moved on while the recorded generation had not).
 * Pinned by arrivalGate.test.ts.
 */
export function useArrivalGate<T extends { moveId: number }>(arrival: T | null, arcMounted: boolean): T | null {
  const [layoutGen, setLayoutGen] = useState(0);
  const [prevArcMounted, setPrevArcMounted] = useState(arcMounted);
  const layoutFlipping = prevArcMounted !== arcMounted;
  if (layoutFlipping) {
    setPrevArcMounted(arcMounted);
    setLayoutGen((g) => g + 1);
  }
  const renderGen = layoutFlipping ? layoutGen + 1 : layoutGen;
  const [delivery, setDelivery] = useState<{ moveId: number; gen: number } | null>(null);
  if (arrival && delivery?.moveId !== arrival.moveId) {
    setDelivery({ moveId: arrival.moveId, gen: renderGen });
  }
  return arrival && delivery?.moveId === arrival.moveId && delivery.gen === renderGen ? arrival : null;
}
