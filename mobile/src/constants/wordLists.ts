
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

// Replaced in the solvability pass (see FALLBACK_PUZZLES_HARD note): the old
// pool repeated THERE/LATER/TIMES and its first entry was unwinnable. These
// are word-disjoint verified chains from the MEDIUM_PLUS bank.
export const FALLBACK_PUZZLES_MEDIUM_PLUS: string[][] = [
  ["GIVEN", "CHATS", "CURED", "CRAVE"],
  ["AWOKE", "HUNTS", "SAVED", "JUDGE"],
  ["SKILL", "SPIED", "MEALS", "EATER"],
  ["FINED", "HAVEN", "SAILS", "BEATS"],
  ["UNITY", "FLING", "ARMED", "OVERS"],
  ["PSALM", "REIGN", "RACED", "AVERT"],
  ["RELAY", "HIRED", "SELLS", "CRIES"],
  ["GRAIN", "DIVER", "CURES", "FEATS"],
  ["COAST", "SWING", "LIGHT", "FAVOR"],
  ["BLANK", "BINDS", "CATER", "SHINE"],
  ["ROVER", "CAVED", "CURVE", "CARED"],
  ["CAGES", "HARMS", "NAPPY", "DEMOS"],
  ["BURLY", "PACED", "EVILS", "INANE"],
  ["TWAIN", "GRINS", "PEACH", "HOPED"],
  ["TIRES", "BEADS", "PLANT", "FACES"],
];

// Replaced in the solvability pass: the old pool was 15 near-identical
// THERE/LATER/TIMES chains and its first entry was mathematically unwinnable
// under the shipped rules. These 15 are word-disjoint chains sampled from the
// verified HARD bank — every one exhaustively solved by
// services/puzzleSolvability.ts (pinned in bankSolvability.test.ts).
export const FALLBACK_PUZZLES_HARD: string[][] = [
  ["SHARP", "CURED", "BEARS", "DIVES", "SOLES"],
  ["CAMEL", "REPAY", "STIRS", "CHEFS", "UNION"],
  ["MOUTH", "PONDS", "CRIES", "SPIED", "BRAVE"],
  ["TRICK", "MOVES", "CHAPS", "SAVED", "FINER"],
  ["BLOWN", "BROWS", "CATER", "BAKES", "SPARE"],
  ["TWIGS", "MATER", "GATED", "CROWS", "PACES"],
  ["KNITS", "DOORS", "REIGN", "RIDES", "LOSES"],
  ["TWAIN", "MANIC", "RAMPS", "TOLLS", "MEALS"],
  ["SCREW", "LACKS", "QUITS", "OWING", "TYING"],
  ["ALLEY", "WAVES", "LIGHT", "BINDS", "MOUSE"],
  ["NEEDY", "FLING", "RIGHT", "TICKS", "PARKS"],
  ["HARDY", "STORM", "FARED", "FIEND", "WIDOW"],
  ["GHOST", "RACED", "CURVE", "STARE", "BAKER"],
  ["FUNKY", "CRUST", "LOCKS", "CARED", "CURSE"],
  ["GOERS", "FAMED", "SACKS", "TRUCK", "DOVES"],
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
 * Index 0 is the onboarding tutorial board; the full set is served while
 * puzzlesSolved < CURATED_PUZZLE_COUNT (5). All words in a chain must be the
 * same length. Each step: pick a letter from the source (shrinking it into
 * a valid shorter word) and drop it into the target (growing it into a valid longer word).
 * Includes pre-computed solution steps for tutorial guidance highlighting.
 */
export interface CuratedPuzzle {
  words: string[];
  solution: { stepIndex: number; sourceWord: string; targetWord: string; letterToMove: string; explanation: string }[];
}

export const CURATED_EARLY_PUZZLES: CuratedPuzzle[] = [
  // Puzzle 0 (tutorial): PLAY → PANT → HEAR — gentle 3-row intro with warm, common
  // words (PLANT, HEART) so a first-timer isn't tripped up by an obscure word.
  // Pick L from PLAY → PAY; drop into PANT → PLANT. Pick T from PLANT → PLAN; drop into HEAR → HEART.
  {
    words: ["PLAY", "PANT", "HEAR"],
    solution: [
      { stepIndex: 0, sourceWord: "PLAY", targetWord: "PANT", letterToMove: "L", explanation: "Move 'L' from PLAY to form PLANT." },
      { stepIndex: 1, sourceWord: "PANT", targetWord: "HEAR", letterToMove: "T", explanation: "Move 'T' from PLANT to form HEART." },
    ],
  },
  // Puzzle 1: SEAT → SPIN → PORT → EACH — 4-row MEDIUM, the first solo board.
  // Every solution word is a common everyday word (no MUSED-style traps), and
  // the chain has SIX genuinely distinct solution paths under the shipped
  // rules (verified by exhaustive enumeration: SPINE>SPORT>PEACH,
  // SPINS>SPORT>PEACH, SPINS>SPORT>REACH, SPINS>PORTS>REACH, ...), so a new
  // player's own idea can also be right.
  // Pick E → SAT; SPINE. Pick S → PINE; SPORT. Pick P → SORT; PEACH.
  {
    words: ["SEAT", "SPIN", "PORT", "EACH"],
    solution: [
      { stepIndex: 0, sourceWord: "SEAT", targetWord: "SPIN", letterToMove: "E", explanation: "Move 'E' from SEAT to form SPINE." },
      { stepIndex: 1, sourceWord: "SPIN", targetWord: "PORT", letterToMove: "S", explanation: "Move 'S' from SPINE to form SPORT." },
      { stepIndex: 2, sourceWord: "PORT", targetWord: "EACH", letterToMove: "P", explanation: "Move 'P' from SPORT to form PEACH." },
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
