// Every event time in the trailer, authored on the bed's musical grid (see
// src/grid.js). Shots, captions and the score all read these, so moving one
// value moves picture and sound together.

import { bar, anchor, BEAT, EIGHTH, SIXTEENTH } from '../grid.js';

export const DURATION = 39.0;
export const FPS = 30;

const range = (n, t0, step) => Array.from({ length: n }, (_, i) => t0 + i * step);

export const E = {
  // --- S01 the first move (a oner through S03)
  S01: 0,
  L_LIFT: -0.02,                 // the L is already ~25% up at frame 0
  PANT_OPEN: 0.40,
  L_LAND: bar(1),                // 1.00, the first landing; the bed opens here
  SPROUT: bar(1, 1, 1) - 0.02,   // ~1.20
  L_LOCK: bar(1, 1, 1) + 0.08,   // ~1.30
  T_LIFT: bar(1, 3, 1),          // ~2.10 (PAY / PLANT holds first)
  EMBER_TALK: bar(1, 2) + 0.11,  // 1.55
  HEAR_OPEN: bar(1, 4),          // ~2.32
  T_LAND: bar(2),                // 2.76
  T_LOCK: bar(2) + 0.19,
  FLASH: [bar(2, 2), bar(2, 2, 1), bar(2, 3)], // PAY, PLAN, HEART
  GEMS: bar(2, 4),               // 4.09 amber bursts, PLAN unfurls into the blueprint
  CRANE: bar(2, 4) - 0.19,       // 3.90 camera starts to crane up
  S02: bar(3),                   // 4.53
  BLUEPRINT_LAY: bar(3, 3, 1),   // ~5.63
  GEM_BURST: bar(4),             // 6.29
  KNOCKS: range(6, bar(4, 2), EIGHTH), // 6.73 .. 7.83, timber snaps in
  DROP: anchor('drop'),          // 8.05 the bed's drop: the jungle room comes alive
  // --- S03 Gerald
  S03: anchor('drop'),
  SLOANE_POP: bar(5, 2),         // 8.50
  BUBBLE: bar(5, 3),             // 8.94
  TYPE_START: bar(5, 3) + 0.06,  // 9.00
  TYPE_CPS: 36,                  // Sloane types 36 characters a second, so Gerald lands early
  TYPE_END: bar(5, 3) + 0.06 + 52 / 36, // ~10.44; the full line then holds ~1.1 s
  MOTH_LAND: bar(6, 4),          // 11.14
  // --- S04 montage
  S04: bar(7),                   // 11.58
  M_CUTS: [bar(7), bar(7, 3, 1), bar(8, 2)],
  M_LANDS: [bar(7, 1, 1), bar(7, 4), bar(8, 2, 1)],
  WHIP: bar(8, 4) + SIXTEENTH,   // 14.78: GLITTER holds 0.8 s before the whip smears it
  // --- S05 cast crane
  S05: bar(9),                   // 15.11
  ROOF_CLEAR: bar(10, 3),        // 17.75
  // --- S06 where the day goes
  S06: bar(10, 3),
  DUSK_START: bar(10, 3) + 0.15, // 17.90
  DUSK_END: bar(12) + 0.2,       // ~20.60
  LAMPS: range(12, bar(11, 3), SIXTEENTH), // 19.52 .. 20.73
  FIREFLIES: bar(11, 4) + 0.24,  // ~20.2
  FILTER_IN: bar(12),            // 20.40 the music moves into the next room
  MUSIC_BOX: bar(12, 2),         // 20.84
  PUSH_KITCHEN: bar(12) + 0.2,
  // --- S07 Panko's jars
  S07: bar(12, 3),               // 21.28
  JARS_RACK: bar(12, 4) + 0.12,  // ~22.00 focus to Panko
  JARS_AWAY: bar(13) + 0.42,     // ~22.60 drift right with her
  JARS_BACK: anchor('breakOut'), // 23.93 the groove returns, slide back
  JARS_WRONG_NOTE: bar(14, 2) + 0.02, // 24.37
  PANKO_TURN: bar(14, 2) + 0.03,
  // --- S08 the fire draws
  S08: bar(14, 3),               // 24.81
  STROKES: range(5, bar(14, 4), EIGHTH), // 25.25 .. 26.13
  EMBER_LOOK: bar(15, 1) + 0.02, // 25.71
  EMBER_SMILE: bar(15, 2),       // 26.13
  EMBER_HEART: bar(15, 3),       // 26.57
  // --- S09 when you're away
  S09: bar(16),                  // 27.45
  CASCADE: range(12, bar(16, 3) + 0.06, SIXTEENTH), // ~28.40 .. 29.6
  BREATH: anchor('breath'),      // 31.18
  PROBABLY: anchor('breath') + 0.17,
  // --- S10 the sign / MOSTLY
  S10: anchor('hit'),            // 33.93
  LINE: anchor('hit') + 0.42,
  GLINT: anchor('hit') + 0.67,
  TREMBLE: anchor('hit') + 1.62,
  ROCK: anchor('hit') + 2.22,
  FLIP: anchor('preHit'),        // 36.59
  HOP: anchor('preHit') + 0.2,
  CLICK: anchor('finalHit'),     // 37.05 MOSTLY
  WIGGLE: anchor('finalHit') + 1.25,
  END: DURATION,
  BEAT, EIGHTH, SIXTEENTH,
};

/** On-screen captions (spec 3.4). Bubble and end line are anchored by their shots. */
export const CAPTIONS = [
  { id: 'c1', text: 'Move one letter.', voice: 'claim', in: 0.35, out: E.S02 - 0.11, line: 0 },
  { id: 'c2', text: 'Both words stay real.', voice: 'claim', in: 2.5, out: E.S02 - 0.11, line: 1 },
  { id: 'c3', text: 'Puzzles earn amber. Amber builds rooms.', voice: 'claim', in: 4.9, out: E.DROP - 0.01, line: 0 },
  { id: 'c5', text: 'Over 4,000 word puzzles.', voice: 'claim', in: E.M_LANDS[0] - 0.05, out: E.S05 - 0.16, line: 0 },
  { id: 'c6', text: 'Animal friends. Each with a room.', voice: 'claim', in: E.S05 + 0.19, out: E.ROOF_CLEAR - 0.13, line: 0 },
  { id: 'c7', text: "Panko's spice jars keep changing places.", voice: 'tease', in: E.S07 + 0.27, out: E.S08 - 0.25, line: 0 },
  { id: 'c8', text: "The animals talk about you when you're away.", voice: 'tease', in: E.S09 + 0.7, out: E.BREATH - 0.01, line: 0 },
  { id: 'c9', text: 'All good things.', voice: 'tease', in: E.S09 + 2.4, out: E.BREATH - 0.01, line: 1 },
  { id: 'c10', text: 'Probably.', voice: 'tease', size: 'big', in: E.PROBABLY, out: E.S10 - 0.24, line: 0 },
];

/** Captions for the SRT (bubble and end line included). */
export const SRT_LINES = [
  ...CAPTIONS.filter((c) => c.id !== 'c9' && c.id !== 'c2').map((c) => ({ in: c.in, out: c.out, text: c.text })),
  { in: 2.5, out: E.S02 - 0.11, text: 'Both words stay real.' },
  { in: E.S09 + 2.4, out: E.BREATH - 0.01, text: 'All good things.' },
  { in: E.BUBBLE, out: E.S04, text: 'Sloane: Three moths live in my fur. I call all three Gerald.' },
  { in: E.LINE, out: E.END, text: 'A cozy word game. MOSTLY' },
].sort((a, b) => a.in - b.in);
