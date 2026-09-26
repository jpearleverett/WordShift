// Musical time for the edit. Every event in the trailer is authored as a bar /
// beat / eighth position on the bed's measured grid, or relative to one of its
// measured anchors, so picture and sound share one clock (src/grid.data.js is
// written by audio/measure.mjs).

import { GRID } from './grid.data.js';

export { GRID };
export const BEAT = GRID.beat;
export const BAR = GRID.bar;
export const EIGHTH = BEAT / 2;
export const SIXTEENTH = BEAT / 4;

/** Start of bar n (1-based), plus beats (1-based) and extra eighths. */
export const bar = (n, beat = 1, eighths = 0) => GRID.t0Bar1 + (n - 1) * BAR + (beat - 1) * BEAT + eighths * EIGHTH;

/** A measured structural anchor of the bed, in trailer time. */
export const anchor = (name) => {
  const v = GRID.anchors[name];
  if (v === undefined) throw new Error('unknown anchor ' + name);
  return v;
};

/** Trailer time -> position in the source file. */
export const fileTime = (t) => t + GRID.offset;
