
import DICTIONARY_RAW from './dictionary.txt?raw';

// Process the raw dictionary string (one word per line)
const RAW_WORDS = DICTIONARY_RAW
  .toUpperCase()
  .split(/\r?\n/)
  .map(w => w.trim())
  .filter(w => w.length >= 3 && w.length <= 6 && /^[A-Z]+$/.test(w));

// De-duplicate just in case
const ALL_UNIQUE_WORDS = Array.from(new Set(RAW_WORDS));

export const WORDS_3 = ALL_UNIQUE_WORDS.filter(w => w.length === 3);
export const WORDS_4 = ALL_UNIQUE_WORDS.filter(w => w.length === 4);
export const WORDS_5 = ALL_UNIQUE_WORDS.filter(w => w.length === 5);
export const WORDS_6 = ALL_UNIQUE_WORDS.filter(w => w.length === 6);

// Combined for easy lookup
export const COMMON_WORDS = new Set(ALL_UNIQUE_WORDS);

// Fallback verified sequence (4 letters)
// LIME -> TIME -> TIED -> TEND
export const FALLBACK_PUZZLE = [
  "LIME",
  "TIME",
  "TIED",
  "TEND"
];

// Fallback verified sequence (5 letters) for Hard mode
// STORE -> ROUTE -> VOTER -> COVET -> VOICE
export const FALLBACK_PUZZLE_HARD = [
  "STORE",
  "ROUTE",
  "VOTER",
  "COVET",
  "VOICE"
];
