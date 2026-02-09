
import { DICTIONARY_WORDS } from './dictionary';

// All unique words from dictionary (3-7 letters)
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
  ["CAT", "CUT", "BUT"],
  ["RAN", "TAN", "TAP"],
  ["HIT", "SIT", "SET"],
  ["DOG", "DIG", "BIG"],
  ["PEN", "PIN", "WIN"],
  ["HOT", "HIT", "BIT"],
  ["RUN", "BUN", "BAN"],
  ["TOP", "TIP", "DIP"],
  ["CAN", "MAN", "MAP"],
  ["FUN", "FAN", "FAR"],
  ["NET", "NUT", "CUT"],
  ["GUM", "GUN", "FUN"],
  ["LOG", "FOG", "FIG"],
  ["POT", "ROT", "RAT"],
  ["SAD", "SAT", "SET"],
];

export const FALLBACK_PUZZLES_MEDIUM: string[][] = [
  ["LIME", "TIME", "TIED", "TEND"],
  ["COLD", "BOLD", "BONE", "TONE"],
  ["HEAT", "HEAR", "NEAR", "NEAT"],
  ["LAMP", "DAMP", "DAME", "GAME"],
  ["SORT", "PORT", "PORE", "CORE"],
  ["COLD", "BEND", "CUES", "CULT"],
  ["SALT", "HOOD", "GEEK", "TILE"],
  ["WARM", "HOOP", "TEEN", "SING"],
  ["WINE", "HERS", "RAMP", "PATH"],
  ["TALE", "HOSE", "RACK", "CARS"],
  ["HOPE", "PROS", "LEAN", "DIPS"],
  ["RACE", "LOVE", "FAIL", "POPS"],
  ["DRUM", "RUGS", "CARE", "RUIN"],
  ["GIFT", "LIPS", "HEAT", "BUFF"],
  ["BONE", "LACK", "LEAK", "RAIN"],
];

export const FALLBACK_PUZZLES_HARD: string[][] = [
  ["STORE", "ROUTE", "VOTER", "COVET", "VOICE"],
  ["HEART", "EARTH", "TEACH", "CHEAT", "WATCH"],
  ["STEAM", "CRATE", "CRIME", "VERSE", "BOARD"],
  ["CRANE", "CANER", "DANCE", "CANED", "ACNED"],
  ["LEMON", "MELON", "MODEL", "MOULD", "MOULT"],
  ["FLAME", "SEEPS", "DEATH", "TRADE", "WEDGE"],
  ["SHARP", "HADES", "PURSE", "CLOUD", "THEIR"],
  ["PROUD", "FORTH", "FORMS", "CHICK", "CLOUD"],
  ["DRIFT", "RIVER", "RIDES", "RATIO", "RHYME"],
  ["GRACE", "RACED", "DODGE", "RINSE", "GUIDE"],
  ["GHOST", "RAINS", "CAMPS", "FIELD", "TICKS"],
  ["HAVEN", "HEAVE", "GRILL", "TRUST", "CRATE"],
  ["REALM", "EAGER", "OWING", "DUPED", "USING"],
  ["TRACE", "MOORS", "CHANT", "BRADS", "STAIN"],
  ["CROWD", "PRIZE", "NURSE", "BLAME", "MATTE"],
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
