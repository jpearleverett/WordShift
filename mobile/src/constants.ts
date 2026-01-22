
import { DICTIONARY_WORDS } from './dictionary';

// All unique words from dictionary (already filtered to 3-6 letters)
const ALL_UNIQUE_WORDS = DICTIONARY_WORDS;

export const WORDS_3 = ALL_UNIQUE_WORDS.filter(w => w.length === 3);
export const WORDS_4 = ALL_UNIQUE_WORDS.filter(w => w.length === 4);
export const WORDS_5 = ALL_UNIQUE_WORDS.filter(w => w.length === 5);
export const WORDS_6 = ALL_UNIQUE_WORDS.filter(w => w.length === 6);

// Combined for easy lookup
export const COMMON_WORDS = new Set(ALL_UNIQUE_WORDS);

// Fallback verified sequence (4 letters)
export const FALLBACK_PUZZLE = [
  "LIME",
  "TIME",
  "TIED",
  "TEND"
];

// Fallback verified sequence (5 letters) for Hard mode
export const FALLBACK_PUZZLE_HARD = [
  "STORE",
  "ROUTE",
  "VOTER",
  "COVET",
  "VOICE"
];
