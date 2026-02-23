
import { DICTIONARY_WORDS } from '../dictionary';

// All unique words from dictionary (filtered to 3-7 letters)
const ALL_UNIQUE_WORDS = DICTIONARY_WORDS;

export const WORDS_3 = ALL_UNIQUE_WORDS.filter(w => w.length === 3);
export const WORDS_4 = ALL_UNIQUE_WORDS.filter(w => w.length === 4);
export const WORDS_5 = ALL_UNIQUE_WORDS.filter(w => w.length === 5);
export const WORDS_6 = ALL_UNIQUE_WORDS.filter(w => w.length === 6);
export const WORDS_7 = ALL_UNIQUE_WORDS.filter(w => w.length === 7);

// Combined for easy lookup
export const COMMON_WORDS = new Set(ALL_UNIQUE_WORDS);

// Pre-validated fallback puzzle pools — used when generation times out
// Each puzzle is a verified valid chain (every transition removes+inserts one letter, all words valid)
export const FALLBACK_PUZZLES_EASY: string[][] = [
  ["PEEP", "WHAT", "HERE"],
  ["CLIP", "WITH", "HERE"],
  ["DARE", "LIKE", "THAN"],
  ["BELT", "OVER", "TIME"],
  ["CUPS", "WITH", "HERE"],
  ["FITS", "USED", "WITH"],
  ["GONE", "SURE", "THAT"],
  ["POLL", "OVER", "TIME"],
  ["MAIL", "BEST", "LAST"],
  ["ARMY", "PART", "INTO"],
  ["ARTS", "THAT", "WILL"],
  ["BEEN", "YEAR", "GOOD"],
  ["WERE", "HERE", "OVER"],
  ["FIND", "LIKE", "THAN"],
  ["GLOW", "ABLE", "EACH"],
];

export const FALLBACK_PUZZLES_MEDIUM: string[][] = [
  ["SUIT", "SITE", "WHAT", "HERE"],
  ["LADS", "OVER", "TIME", "USED"],
  ["PLAY", "INTO", "BOTH", "WERE"],
  ["GOLD", "SURE", "THAT", "WILL"],
  ["BEAD", "WHAT", "HERE", "WERE"],
  ["RAIN", "MOST", "BOTH", "WERE"],
  ["SICK", "THAN", "WILL", "HERE"],
  ["GRAY", "SURE", "THAT", "WILL"],
  ["GANG", "YEAR", "PART", "INTO"],
  ["FORM", "OVER", "TIME", "USED"],
  ["LAND", "OVER", "TIME", "USED"],
  ["LIPS", "THAT", "WILL", "HERE"],
  ["CUTS", "THAT", "WILL", "HERE"],
  ["SEEM", "OVER", "TIME", "USED"],
  ["IRON", "TIME", "OVER", "INTO"],
];

export const FALLBACK_PUZZLES_MEDIUM_PLUS: string[][] = [
  ["SCRAP", "THERE", "LATER", "TIMES"],
  ["SHELL", "THERE", "LATER", "TIMES"],
  ["STEAL", "THERE", "LATER", "TIMES"],
  ["BEADS", "THERE", "LATER", "TIMES"],
  ["IDEAS", "THERE", "LATER", "TIMES"],
  ["VOTES", "THERE", "LATER", "TIMES"],
  ["LOOKS", "THERE", "LATER", "TIMES"],
  ["CELLS", "THERE", "LATER", "TIMES"],
  ["BRUSH", "TIMES", "THERE", "LATER"],
  ["SOLAR", "WORDS", "THERE", "LATER"],
  ["BLUSH", "WORDS", "THERE", "LATER"],
  ["TASKS", "LATER", "TIMES", "THERE"],
  ["WITCH", "RIGHT", "TIMES", "THERE"],
  ["PEARL", "SUPER", "THERE", "LATER"],
  ["WRIST", "THERE", "LATER", "TIMES"],
];

export const FALLBACK_PUZZLES_HARD: string[][] = [
  ["SCRAP", "THERE", "LATER", "TIMES", "THEIR"],
  ["SHELL", "THERE", "LATER", "TIMES", "THEIR"],
  ["CELLS", "THERE", "LATER", "TIMES", "THEIR"],
  ["STEAL", "THERE", "LATER", "TIMES", "THEIR"],
  ["WRIST", "THERE", "LATER", "TIMES", "THEIR"],
  ["BEADS", "THERE", "LATER", "TIMES", "THEIR"],
  ["BRUSH", "TIMES", "THERE", "LATER", "MAKES"],
  ["IDEAS", "THERE", "LATER", "TIMES", "THEIR"],
  ["PEARL", "SUPER", "THERE", "LATER", "TIMES"],
  ["SOLAR", "WORDS", "THERE", "LATER", "TIMES"],
  ["BLUSH", "WORDS", "THERE", "LATER", "TIMES"],
  ["TASKS", "LATER", "TIMES", "THERE", "ASKED"],
  ["VOTES", "THERE", "LATER", "TIMES", "THEIR"],
  ["WITCH", "RIGHT", "TIMES", "THERE", "LATER"],
  ["LOOKS", "THERE", "LATER", "TIMES", "THEIR"],
];

/** Get a random fallback puzzle for the given difficulty */
export function getRandomFallback(difficulty: 'EASY' | 'MEDIUM' | 'MEDIUM_PLUS' | 'HARD'): string[] {
  const pool = difficulty === 'EASY' ? FALLBACK_PUZZLES_EASY
    : difficulty === 'HARD' ? FALLBACK_PUZZLES_HARD
    : difficulty === 'MEDIUM_PLUS' ? FALLBACK_PUZZLES_MEDIUM_PLUS
    : FALLBACK_PUZZLES_MEDIUM;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Curated early-game puzzles — hand-picked & verified pick-and-drop chains.
 * Used for the first 3 post-onboarding puzzles (puzzles 0-2). All words in a chain
 * must be the same length. Each step: pick a letter from the source (shrinking it into
 * a valid shorter word) and drop it into the target (growing it into a valid longer word).
 * Includes pre-computed solution steps for tutorial guidance highlighting.
 */
export interface CuratedPuzzle {
  words: string[];
  solution: { stepIndex: number; sourceWord: string; targetWord: string; letterToMove: string; explanation: string }[];
}

export const CURATED_EARLY_PUZZLES: CuratedPuzzle[] = [
  // Puzzle 0 (tutorial): GLOW → ABLE → EACH — simple 3-row for EASY onboarding
  // Pick G from GLOW → LOW; drop into ABLE → GABLE. Pick B from GABLE → GALE; drop into EACH → BEACH.
  {
    words: ["GLOW", "ABLE", "EACH"],
    solution: [
      { stepIndex: 0, sourceWord: "GLOW", targetWord: "ABLE", letterToMove: "G", explanation: "Move 'G' from GLOW to form GABLE." },
      { stepIndex: 1, sourceWord: "ABLE", targetWord: "EACH", letterToMove: "B", explanation: "Move 'B' from GABLE to form BEACH." },
    ],
  },
  // Puzzle 1: LAMP → OVER → TIME → USED — 4-row MEDIUM, satisfying mid-position moves
  // Pick L → AMP; LOVER. Pick R → LOVE; TIMER. Pick M → TIER; MUSED.
  {
    words: ["LAMP", "OVER", "TIME", "USED"],
    solution: [
      { stepIndex: 0, sourceWord: "LAMP", targetWord: "OVER", letterToMove: "L", explanation: "Move 'L' from LAMP to form LOVER." },
      { stepIndex: 1, sourceWord: "OVER", targetWord: "TIME", letterToMove: "R", explanation: "Move 'R' from LOVER to form TIMER." },
      { stepIndex: 2, sourceWord: "TIME", targetWord: "USED", letterToMove: "M", explanation: "Move 'M' from TIMER to form MUSED." },
    ],
  },
  // Puzzle 2: FIRE → USED → LIKE → THAN — 4-row MEDIUM, thematic fire-to-thank chain
  // Pick F → IRE; FUSED. Pick D → FUSE; LIKED. Pick K → LIED; THANK.
  {
    words: ["FIRE", "USED", "LIKE", "THAN"],
    solution: [
      { stepIndex: 0, sourceWord: "FIRE", targetWord: "USED", letterToMove: "F", explanation: "Move 'F' from FIRE to form FUSED." },
      { stepIndex: 1, sourceWord: "USED", targetWord: "LIKE", letterToMove: "D", explanation: "Move 'D' from FUSED to form LIKED." },
      { stepIndex: 2, sourceWord: "LIKE", targetWord: "THAN", letterToMove: "K", explanation: "Move 'K' from LIKED to form THANK." },
    ],
  },
  // Puzzle 3: TALE → MEAL → PACE → SOIL — 4-row MEDIUM, grounded thematic journey
  // Pick T → ALE; METAL. Pick L → META; PLACE. Pick P → LACE; SPOIL.
  // "SPOIL" seeds subtle wrongness (innocuous at Phase 0, resonant later)
  {
    words: ["TALE", "MEAL", "PACE", "SOIL"],
    solution: [
      { stepIndex: 0, sourceWord: "TALE", targetWord: "MEAL", letterToMove: "T", explanation: "Move 'T' from TALE to form METAL." },
      { stepIndex: 1, sourceWord: "MEAL", targetWord: "PACE", letterToMove: "L", explanation: "Move 'L' from METAL to form PLACE." },
      { stepIndex: 2, sourceWord: "PACE", targetWord: "SOIL", letterToMove: "P", explanation: "Move 'P' from PLACE to form SPOIL." },
    ],
  },
  // Puzzle 4: RIDE → FINS → AIDE → WAKE — 4-row MEDIUM, journey to awakening
  // Pick E → RID; FINES. Pick S → FINE; ASIDE. Pick A → SIDE; AWAKE.
  // "AWAKE" is innocent now (morning energy), ominous in retrospect (the entity awakening)
  {
    words: ["RIDE", "FINS", "AIDE", "WAKE"],
    solution: [
      { stepIndex: 0, sourceWord: "RIDE", targetWord: "FINS", letterToMove: "E", explanation: "Move 'E' from RIDE to form FINES." },
      { stepIndex: 1, sourceWord: "FINS", targetWord: "AIDE", letterToMove: "S", explanation: "Move 'S' from FINES to form ASIDE." },
      { stepIndex: 2, sourceWord: "AIDE", targetWord: "WAKE", letterToMove: "A", explanation: "Move 'A' from ASIDE to form AWAKE." },
    ],
  },
];

/** Number of curated puzzles to use before switching to generated puzzles */
export const CURATED_PUZZLE_COUNT = CURATED_EARLY_PUZZLES.length;

// Legacy exports (kept for backward compatibility)
export const FALLBACK_PUZZLE = FALLBACK_PUZZLES_MEDIUM[0];
export const FALLBACK_PUZZLE_HARD = FALLBACK_PUZZLES_HARD[0];
