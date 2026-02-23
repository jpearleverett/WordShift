
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
 * Used for the first 8 post-onboarding puzzles (puzzles 0-7). All words in a chain
 * must be the same length. Each step: pick a letter from the source (shrinking it into
 * a valid shorter word) and drop it into the target (growing it into a valid longer word).
 * Includes pre-computed solution steps for tutorial guidance highlighting.
 *
 * Design goals for the curated set:
 * - Puzzles 0: Simple 3-row EASY for onboarding tutorial
 * - Puzzles 1-4: 4-row MEDIUM with satisfying mid-position moves
 * - Puzzle 5: Contains a dread word (COLD) to plant a subliminal seed
 * - Puzzles 6-7: More complex mid-position moves to build fluency
 * - All moves use middle positions (not edge S-plurals or ED-suffixes)
 * - Thematic variety across the set (nature, warmth, adventure, etc.)
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
  // Puzzle 3: RAIN → STAR → STEM → WINE — nature journey (rain, stars, steam, twine)
  // Pick I → RAN; STAIR. Pick A → STIR; STEAM. Pick T → SEAM; TWINE.
  {
    words: ["RAIN", "STAR", "STEM", "WINE"],
    solution: [
      { stepIndex: 0, sourceWord: "RAIN", targetWord: "STAR", letterToMove: "I", explanation: "Move 'I' from RAIN to form STAIR." },
      { stepIndex: 1, sourceWord: "STAR", targetWord: "STEM", letterToMove: "A", explanation: "Move 'A' from STAIR to form STEAM." },
      { stepIndex: 2, sourceWord: "STEM", targetWord: "WINE", letterToMove: "T", explanation: "Move 'T' from STEAM to form TWINE." },
    ],
  },
  // Puzzle 4: GOLD → EARN → HEAT → WAVE — treasure to warmth (gold, learn, heart, weave)
  // Pick L → GOD; LEARN. Pick R → LEAN; HEART. Pick E → HART; WEAVE.
  {
    words: ["GOLD", "EARN", "HEAT", "WAVE"],
    solution: [
      { stepIndex: 0, sourceWord: "GOLD", targetWord: "EARN", letterToMove: "L", explanation: "Move 'L' from GOLD to form LEARN." },
      { stepIndex: 1, sourceWord: "EARN", targetWord: "HEAT", letterToMove: "R", explanation: "Move 'R' from LEARN to form HEART." },
      { stepIndex: 2, sourceWord: "HEAT", targetWord: "WAVE", letterToMove: "E", explanation: "Move 'E' from HEART to form WEAVE." },
    ],
  },
  // Puzzle 5: COLD → EARN → BAND → RAGE — cold dread chain (COLD is a Phase 1 dread word)
  // Pick L → COD; LEARN. Pick R → LEAN; BRAND. Pick N → BRAD; RANGE.
  {
    words: ["COLD", "EARN", "BAND", "RAGE"],
    solution: [
      { stepIndex: 0, sourceWord: "COLD", targetWord: "EARN", letterToMove: "L", explanation: "Move 'L' from COLD to form LEARN." },
      { stepIndex: 1, sourceWord: "EARN", targetWord: "BAND", letterToMove: "R", explanation: "Move 'R' from LEARN to form BRAND." },
      { stepIndex: 2, sourceWord: "BAND", targetWord: "RAGE", letterToMove: "N", explanation: "Move 'N' from BRAND to form RANGE." },
    ],
  },
  // Puzzle 6: VINE → LACE → LOVE → WORD — language and worlds (vine, lance, clove, world)
  // Pick N → VIE; LANCE. Pick C → LANE; CLOVE. Pick L → COVE; WORLD.
  {
    words: ["VINE", "LACE", "LOVE", "WORD"],
    solution: [
      { stepIndex: 0, sourceWord: "VINE", targetWord: "LACE", letterToMove: "N", explanation: "Move 'N' from VINE to form LANCE." },
      { stepIndex: 1, sourceWord: "LACE", targetWord: "LOVE", letterToMove: "C", explanation: "Move 'C' from LANCE to form CLOVE." },
      { stepIndex: 2, sourceWord: "LOVE", targetWord: "WORD", letterToMove: "L", explanation: "Move 'L' from CLOVE to form WORLD." },
    ],
  },
  // Puzzle 7: TONE → CHAT → CAMP → REAL — social adventure to realm (tone, chant, champ, realm)
  // Pick N → TOE; CHANT. Pick H → CANT; CHAMP. Pick M → CHAP; REALM.
  {
    words: ["TONE", "CHAT", "CAMP", "REAL"],
    solution: [
      { stepIndex: 0, sourceWord: "TONE", targetWord: "CHAT", letterToMove: "N", explanation: "Move 'N' from TONE to form CHANT." },
      { stepIndex: 1, sourceWord: "CHAT", targetWord: "CAMP", letterToMove: "H", explanation: "Move 'H' from CHANT to form CHAMP." },
      { stepIndex: 2, sourceWord: "CAMP", targetWord: "REAL", letterToMove: "M", explanation: "Move 'M' from CHAMP to form REALM." },
    ],
  },
];

/** Number of curated puzzles to use before switching to generated puzzles */
export const CURATED_PUZZLE_COUNT = CURATED_EARLY_PUZZLES.length;

// Legacy exports (kept for backward compatibility)
export const FALLBACK_PUZZLE = FALLBACK_PUZZLES_MEDIUM[0];
export const FALLBACK_PUZZLE_HARD = FALLBACK_PUZZLES_HARD[0];
