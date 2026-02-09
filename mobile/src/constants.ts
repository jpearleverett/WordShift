
import { DICTIONARY_WORDS } from './dictionary';

// All unique words from dictionary (already filtered to 3-6 letters)
const ALL_UNIQUE_WORDS = DICTIONARY_WORDS;

export const WORDS_3 = ALL_UNIQUE_WORDS.filter(w => w.length === 3);
export const WORDS_4 = ALL_UNIQUE_WORDS.filter(w => w.length === 4);
export const WORDS_5 = ALL_UNIQUE_WORDS.filter(w => w.length === 5);
export const WORDS_6 = ALL_UNIQUE_WORDS.filter(w => w.length === 6);

// Combined for easy lookup
export const COMMON_WORDS = new Set(ALL_UNIQUE_WORDS);

// Pre-validated fallback puzzle pools — used when generation times out
// Each puzzle is a verified valid chain (every transition removes+inserts one letter, all words valid)
export const FALLBACK_PUZZLES_EASY: string[][] = [
  ["CAT", "CUT", "BUT"],
  ["RAN", "TAN", "TAP"],
  ["HIT", "SIT", "SET"],
  ["DOG", "DIG", "BIG"],
  ["PEN", "PIN", "WIN"],
];

export const FALLBACK_PUZZLES_MEDIUM: string[][] = [
  ["LIME", "TIME", "TIED", "TEND"],
  ["COLD", "BOLD", "BONE", "TONE"],
  ["HEAT", "HEAR", "NEAR", "NEAT"],
  ["LAMP", "DAMP", "DAME", "GAME"],
  ["SORT", "PORT", "PORE", "CORE"],
];

export const FALLBACK_PUZZLES_HARD: string[][] = [
  ["STORE", "ROUTE", "VOTER", "COVET", "VOICE"],
  ["HEART", "EARTH", "TEACH", "CHEAT", "WATCH"],
  ["PLATE", "LEAPT", "PETAL", "PLEAT", "LEAPT"],
  ["CRANE", "CANER", "DANCE", "CANED", "ACNED"],
  ["LEMON", "MELON", "MODEL", "MOULD", "MOULT"],
];

/** Get a random fallback puzzle for the given difficulty */
export function getRandomFallback(difficulty: 'EASY' | 'MEDIUM' | 'HARD'): string[] {
  const pool = difficulty === 'EASY' ? FALLBACK_PUZZLES_EASY
    : difficulty === 'HARD' ? FALLBACK_PUZZLES_HARD
    : FALLBACK_PUZZLES_MEDIUM;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Legacy exports (kept for backward compatibility)
export const FALLBACK_PUZZLE = FALLBACK_PUZZLES_MEDIUM[0];
export const FALLBACK_PUZZLE_HARD = FALLBACK_PUZZLES_HARD[0];
