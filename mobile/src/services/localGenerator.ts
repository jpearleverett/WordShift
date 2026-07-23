
import { WORDS_3, WORDS_4, WORDS_5, WORDS_6, WORDS_7, COMMON_WORDS } from '../constants';
import {
  analyzeStandardBranching,
  type PuzzleBranchingMetrics,
} from './puzzleBranching';

// Offline bank generation runs the search loops synchronously (no UI to keep
// responsive) and sets GENERATOR_NO_YIELD=1: the periodic setTimeout yields
// exist for the app's event loop, but under jest each yield allocates a
// timer+promise pair that the environment retains, and a 25s search window
// creates enough of them to exhaust the heap. In the app this is always false
// and the yields behave exactly as before.
const SKIP_EVENT_LOOP_YIELDS =
  typeof process !== 'undefined' && !!process.env && process.env.GENERATOR_NO_YIELD === '1';

import { PuzzleConfig, PuzzleSolutionStep, Difficulty } from '../types';
import {
  getWordHistoryWithRecency,
  calculateFreshnessPenalty,
  isInHardCooldown,
  recordPuzzleWords,
} from './wordHistory';
import { getCurrentPhase } from './amberCurrency';
import { DialoguePhase } from '../types/homeWorld';
import { isReverseChainSolvable } from './puzzleSolvability';

// Shipped-rules solvability check (COMMON_WORDS is the same dictionary the
// board validates against). Used as the FINAL acceptance gate for reverse
// chains so the generator can never again emit a chain that is unwinnable
// under the real move rules (the divergence that shipped 36 dead reverse
// boards): the internal isReverseSolvable follows the stored solution's
// forward letters, while this explores the full move space exactly as the
// player can.
const isValidWordForRules = (w: string): boolean => COMMON_WORDS.has(w.toUpperCase());

// Organize sets for dynamic access
const WORD_SETS: Record<number, Set<string>> = {
  3: new Set(WORDS_3),
  4: new Set(WORDS_4),
  5: new Set(WORDS_5),
  6: new Set(WORDS_6),
  7: new Set(WORDS_7),
};

// Word arrays for frequency-based scoring (index = relative commonness)
const WORD_ARRAYS: Record<number, string[]> = {
  3: WORDS_3,
  4: WORDS_4,
  5: WORDS_5,
  6: WORDS_6,
  7: WORDS_7,
};

// Precomputed word -> position maps for O(1) commonness lookup. The scorer runs
// in the generation hot loop and used wordArray.indexOf (O(n)); with the
// expanded dictionary (~2x) that linear scan is a real cost, so the position is
// mapped once at module load instead. Values are identical to indexOf.
const WORD_INDEX: Record<number, Map<string, number>> = {};
for (const key of Object.keys(WORD_ARRAYS)) {
  const len = Number(key);
  const arr = WORD_ARRAYS[len];
  const map = new Map<string, number>();
  for (let i = 0; i < arr.length; i++) map.set(arr[i], i);
  WORD_INDEX[len] = map;
}

/**
 * Frequency rank of a word within its length bucket: 0 = most common, ~1 =
 * rarest. The dictionary is TRUE-frequency-sorted, so this is an accurate
 * familiarity proxy. Powers the gated generator's 3-tier playable-vocabulary
 * policy: FEATURED words (the displayed chain + the answer words the player
 * must recognize) are kept within a per-difficulty rank ceiling, while the
 * generator still TRAVERSES the full dictionary graph for connectivity. Dread
 * words are exempted by the caller so the descent vocabulary still lands.
 * Returns 1 (treated as rarest) for a word absent from its length bucket.
 */
export function getFeaturedRank(word: string): number {
  const arr = WORD_ARRAYS[word.length];
  if (!arr || arr.length === 0) return 1;
  const idx = WORD_INDEX[word.length]?.get(word.toUpperCase());
  return idx === undefined ? 1 : idx / arr.length;
}

// ============================================================================
// PRE-COMPUTED ADJACENCY INDEX — instant candidate lookup for puzzle generation
// ============================================================================

interface InsertionTarget {
  /** The W-letter base word receiving the letter */
  baseWord: string;
  /** The W+1-letter word after insertion */
  result: string;
  /** Position where the letter was inserted */
  position: number;
}

/**
 * letter → InsertionTarget[] — all base words that can receive this letter
 * to form a valid (W+1)-letter word.
 */
type InsertionIndex = Map<string, InsertionTarget[]>;

const insertionIndexCache = new Map<number, InsertionIndex>();

/**
 * Build (or retrieve cached) the insertion index for a given word length.
 * For each base word of length W and each insertion position, checks all 26
 * letters to see if inserting produces a valid (W+1)-letter word.
 *
 * Cost: ~50-100ms per word length, computed once per session.
 * Memory: ~1-2 MB per word length.
 */
export function getInsertionIndex(wordLength: number): InsertionIndex {
  const cached = insertionIndexCache.get(wordLength);
  if (cached) return cached;

  const baseSet = WORD_SETS[wordLength];
  const maxSet = WORD_SETS[wordLength + 1];
  if (!baseSet || !maxSet) return new Map();

  const index: InsertionIndex = new Map();

  for (const word of baseSet) {
    for (let j = 0; j <= word.length; j++) {
      for (let c = 65; c <= 90; c++) {
        const letter = String.fromCharCode(c);
        const combined = word.slice(0, j) + letter + word.slice(j);
        if (maxSet.has(combined)) {
          let targets = index.get(letter);
          if (!targets) {
            targets = [];
            index.set(letter, targets);
          }
          targets.push({ baseWord: word, result: combined, position: j });
        }
      }
    }
  }

  insertionIndexCache.set(wordLength, index);
  return index;
}

export const validateWord = (word: string): boolean => {
  return COMMON_WORDS.has(word.toUpperCase());
};

// ============================================================================
// ANTI-BORING PATTERNS - Block obvious/cheap transformations
// ============================================================================

// Penalty values for boring transforms (higher = more penalty)
const PENALTY = {
  // Source removal penalties
  REMOVE_S_FROM_END: 60,      // Removing S from end (un-pluralizing)
  REMOVE_ED_FROM_END: 50,     // Removing D from -ED (un-past-tensing)
  REMOVE_ER_FROM_END: 40,     // Removing R from -ER (un-comparative)
  REMOVE_ING_G: 45,           // Removing G from -ING
  REMOVE_ING_N: 35,           // Removing N from -IN (partial -ING)
  REMOVE_LY_Y: 40,            // Removing Y from -LY (un-adverbing)
  REMOVE_PREFIX_VOWEL: 25,    // Removing a leading vowel

  // Target insertion penalties
  INSERT_S_AT_END: 70,        // Adding S at end (pluralizing) — most boring move
  INSERT_AT_START: 20,        // Adding at position 0 (prefix)
  INSERT_SUFFIX_AT_END: 35,   // Adding boring suffix letter at end
  INSERT_G_FOR_ING: 50,       // Adding G to form -ING
  INSERT_Y_FOR_LY: 45,        // Adding Y to form -LY
  GEMINATION: 30,             // Inserting a letter beside its own twin (POSE->POSSE): cheap, unvaried
} as const;

// Letters that are BORING when moved to/from word edges
const BORING_SUFFIX_LETTERS = new Set(['S', 'D', 'R', 'Y', 'E']);
const BORING_PREFIX_LETTERS = new Set(['A', 'I', 'U', 'E', 'O']);

// Common boring suffixes to detect (when removing creates these patterns)
const BORING_ENDINGS = ['ED', 'ER', 'LY', 'ES', 'EN', 'AL'];
const BORING_BEGINNINGS = ['RE', 'UN', 'IN', 'DE'];

/**
 * Check if a move is a boring suffix/prefix transformation
 * Returns a penalty score (higher = more boring, should be subtracted)
 */
function getBoringTransformPenalty(
  sourceWord: string,
  charIndex: number,
  char: string,
  targetWord: string,
  insertionIndex: number
): number {
  let penalty = 0;
  const sourceLen = sourceWord.length;
  const targetLen = targetWord.length;

  // === REMOVING FROM SOURCE ===

  // HEAVILY penalize removing S from end (pluralization)
  if (char === 'S' && charIndex === sourceLen - 1) {
    penalty += PENALTY.REMOVE_S_FROM_END;
  }

  // Penalize removing D from end (past tense -ED)
  if (char === 'D' && charIndex === sourceLen - 1 && sourceWord[sourceLen - 2] === 'E') {
    penalty += PENALTY.REMOVE_ED_FROM_END;
  }

  // Penalize removing R from end (comparative -ER)
  if (char === 'R' && charIndex === sourceLen - 1 && sourceWord[sourceLen - 2] === 'E') {
    penalty += PENALTY.REMOVE_ER_FROM_END;
  }

  // Penalize removing G from end when it's part of -ING
  if (char === 'G' && charIndex === sourceLen - 1 &&
      sourceLen >= 3 && sourceWord.slice(-3) === 'ING') {
    penalty += PENALTY.REMOVE_ING_G;
  }

  // Penalize removing N from end when followed by G (part of -ING removal sequence)
  if (char === 'N' && charIndex === sourceLen - 1 &&
      sourceLen >= 2 && sourceWord[sourceLen - 2] === 'I') {
    penalty += PENALTY.REMOVE_ING_N;
  }

  // Penalize removing Y from end (adverb -LY suffix)
  if (char === 'Y' && charIndex === sourceLen - 1 &&
      sourceLen >= 2 && sourceWord[sourceLen - 2] === 'L') {
    penalty += PENALTY.REMOVE_LY_Y;
  }

  // Penalize removing from position 0 (prefix removal)
  if (charIndex === 0 && BORING_PREFIX_LETTERS.has(char)) {
    penalty += PENALTY.REMOVE_PREFIX_VOWEL;
  }

  // === INSERTING INTO TARGET ===

  // HEAVILY penalize inserting S at end (making plural)
  if (char === 'S' && insertionIndex === targetLen) {
    penalty += PENALTY.INSERT_S_AT_END;
  }

  // Penalize inserting at position 0 (adding prefix)
  if (insertionIndex === 0) {
    penalty += PENALTY.INSERT_AT_START;
  }

  // Penalize inserting at end (adding suffix)
  if (insertionIndex === targetLen && BORING_SUFFIX_LETTERS.has(char)) {
    penalty += PENALTY.INSERT_SUFFIX_AT_END;
  }

  // Penalize inserting G at end to form -ING
  if (char === 'G' && insertionIndex === targetLen &&
      targetLen >= 2 && targetWord.slice(-2) === 'IN') {
    penalty += PENALTY.INSERT_G_FOR_ING;
  }

  // Penalize inserting Y at end to form -LY (adverb)
  if (char === 'Y' && insertionIndex === targetLen &&
      targetLen >= 1 && targetWord[targetLen - 1] === 'L') {
    penalty += PENALTY.INSERT_Y_FOR_LY;
  }

  // Penalize gemination: inserting a letter directly beside its own twin
  // (POSE->POSSE, CORAL->CORRAL, PURE->PUREE). Visually you just doubled a
  // letter — cheap and unvaried, previously unpenalized.
  if (targetWord[insertionIndex - 1] === char || targetWord[insertionIndex] === char) {
    penalty += PENALTY.GEMINATION;
  }

  return penalty;
}

/**
 * Check if the transformation creates an anagram-like result (same letters rearranged)
 * This is boring because it doesn't feel like a real transformation
 */
function isAnagramLike(word1: string, word2: string): boolean {
  // Count letter frequencies for each word
  const freq1: Record<string, number> = {};
  const freq2: Record<string, number> = {};
  for (const c of word1) freq1[c] = (freq1[c] || 0) + 1;
  for (const c of word2) freq2[c] = (freq2[c] || 0) + 1;

  // Count shared letters (min frequency of each letter)
  let shared = 0;
  for (const c of Object.keys(freq1)) {
    if (freq2[c]) shared += Math.min(freq1[c], freq2[c]);
  }

  // If more than 80% of letters are shared, it's anagram-like
  return shared >= Math.min(word1.length, word2.length) * 0.8;
}

// ============================================================================
// WORD INTERESTINGNESS SCORING
// ============================================================================

// Letters that make words more interesting (less common, more visually striking)
const INTERESTING_LETTERS = new Set(['Q', 'X', 'Z', 'J', 'K', 'V', 'W', 'Y']);
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const VERY_COMMON_LETTERS = new Set(['E', 'T', 'A', 'O', 'I', 'N', 'S', 'R']);

// Boring words to avoid (very common filler words)
const BORING_WORDS = new Set([
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HAD',
  'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'HAS', 'HIS', 'HOW', 'ITS', 'MAY',
  'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'WHO', 'DID', 'GET', 'HIM',
  'MAN', 'TWO', 'BOY', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'DAD',
  'MOM', 'SIS', 'BRO', 'THAT', 'WITH', 'HAVE', 'THIS', 'WILL', 'YOUR',
  'FROM', 'THEY', 'BEEN', 'MANY', 'SOME', 'THEM', 'THAN', 'INTO',
  'JUST', 'OVER', 'SUCH', 'MAKE', 'LIKE', 'BACK', 'ONLY', 'COME', 'MADE',
  'AFTER', 'THINK', 'THESE', 'WOULD', 'ABOUT', 'COULD', 'WHICH', 'THEIR',
  'THERE', 'BEING', 'OTHER'
]);

// Fun/evocative words to prefer - expanded list
const FUN_WORDS = new Set([
  // Fantasy/Magic
  'GHOST', 'MAGIC', 'SPARK', 'BLAZE', 'STORM', 'FLAME', 'FROST', 'SWIFT',
  'BRAVE', 'QUEST', 'DREAM', 'CROWN', 'JEWEL', 'ROYAL', 'NIGHT', 'LIGHT',
  'SHINE', 'GLOW', 'FLASH', 'TRICK', 'CHARM', 'SPELL', 'WITCH', 'DEMON',
  'ANGEL', 'FAIRY', 'PIXIE', 'BEAST', 'RUNE', 'GLYPH',
  // Animals
  'TIGER', 'SHARK', 'EAGLE', 'SNAKE', 'WOLF', 'LION', 'BEAR', 'HAWK',
  'DRAGON', 'WHALE', 'RAVEN', 'COBRA', 'VIPER', 'ORCA', 'LYNX', 'CRANE',
  // Gems/Precious
  'GOLD', 'RUBY', 'PEARL', 'ONYX', 'JADE', 'OPAL', 'AMBER', 'TOPAZ',
  // Action/Power
  'BLADE', 'SWORD', 'ARROW', 'SPEAR', 'POWER', 'FORCE', 'CLASH', 'CRUSH',
  'BLAST', 'STRIKE', 'SMASH', 'CRASH', 'BURST', 'SURGE', 'PULSE',
  // Sound/Energy
  'ZAP', 'ZIP', 'ZOOM', 'FIZZ', 'BUZZ', 'JAZZ', 'JINX', 'JOLT',
  'QUIRK', 'QUAKE', 'QUICK', 'WHIRL', 'SWIRL', 'TWIST', 'FLICK',
  // Nature/Elements
  'FROST', 'FLAME', 'FLOOD', 'WIND', 'STORM', 'RAIN', 'SNOW', 'LAVA',
  'THORN', 'BLOOM', 'GROVE', 'CLIFF', 'PEAK', 'DUNE', 'CAVE', 'REEF',
  // Mystery/Dark
  'DARK', 'VOID', 'SHADE', 'DUSK', 'DAWN', 'MIST', 'HAZE', 'GLOOM',
  'CRYPT', 'TOMB', 'HAUNT', 'CURSE', 'DOOM', 'FATE', 'OMEN'
]);

// ============================================================================
// PHASE-TIERED DREAD WORDS — Words that resonate at specific narrative phases
// Each tier represents when the word first becomes narratively relevant.
// The generator weights words by proximity to the current phase, creating
// natural vocabulary evolution: curiosity → emptiness → dread → cosmic horror.
// ============================================================================

// PHASE 1 — Curiosity & Wondering (subtle philosophical undertones)
const DREAD_WORDS_PHASE_1 = new Set([
  // Questioning
  'THINK', 'PONDER', 'WONDER', 'DOUBT', 'MAYBE', 'COULD', 'MIGHT', 'SEEM',
  'ASK', 'WHY', 'HOW', 'WHAT', 'WHEN', 'WHERE', 'WHO', 'QUERY',
  // Searching
  'DRIFT', 'WANDER', 'LOST', 'SEEK', 'FIND', 'SEARCH', 'QUEST', 'HUNT',
  'ROAM', 'STRAY', 'MEANDER', 'EXPLORE', 'PROBE', 'SCAN', 'TRACE',
  // Perception
  'SENSE', 'FEEL', 'NOTICE', 'WATCH', 'GAZE', 'PEER', 'GLIMPSE', 'VIEW',
  'AWARE', 'ALERT', 'AWAKE', 'KNOW', 'LEARN', 'GRASP', 'REALIZE',
  'STARE', 'LOOK', 'SEEN', 'SIGHT',
  // Light & atmosphere
  'GLOW', 'GLEAM', 'SHINE', 'SPARK', 'LIGHT', 'HAZE', 'MISTY', 'FOGGY', 'BLUR',
  // Strangeness
  'EERIE', 'WEIRD', 'ODD', 'GRIM', 'AWE',
  // 3-letter curiosity
  'CUE', 'SPY', 'PRY', 'DIG',
  // Change
  'SHIFT', 'CHANGE', 'MORPH', 'ALTER', 'VARY', 'FLUX', 'FLOW', 'TURN',
  'GROW', 'SHRINK', 'EXPAND', 'SWELL', 'PULSE', 'CYCLE',
  'WHIRL', 'SWIRL', 'TWIST', 'WEAVE', 'BLEND', 'FORGE', 'MOLD', 'SHAPE', 'FORM', 'CRAFT',
  // Pattern & signal
  'SIGN', 'CLUE', 'HINT', 'OMEN', 'TOKEN', 'TRAIL', 'PATH', 'GUIDE', 'LEAD', 'LINK',
  // Foundation
  'DEEP', 'INNER', 'CORE', 'ROOT', 'SEED', 'BROOD', 'RIPPLE',
]);

// PHASE 2 — Questioning Existence (impermanence & isolation)
const DREAD_WORDS_PHASE_2 = new Set([
  // Emptiness
  'VOID', 'EMPTY', 'HOLLOW', 'SHELL', 'HUSK', 'VACANT', 'BARREN', 'BARE',
  'BLANK', 'NULL', 'ZERO', 'NONE', 'LACK', 'WANT', 'NEED', 'MISS',
  // Decay
  'FADE', 'WANE', 'DECAY', 'WILT', 'ROT', 'RUST', 'ERODE', 'WEAR',
  'CRUMBLE', 'FLAKE', 'PEEL', 'CRACK', 'CHIP', 'BREAK', 'FRAY', 'TATTER',
  'WASTE', 'WARP', 'FADED', 'STALE', 'DUSTY', 'RUSTED',
  // Weakness & weariness
  'LEAN', 'THIN', 'FRAIL', 'WEAK', 'TIRED', 'WEARY', 'SPENT', 'DRAIN', 'WARY',
  // Pain
  'SCAR', 'WOUND', 'STING', 'ACHE', 'HURT',
  // Isolation
  'ALONE', 'APART', 'DETACH', 'SPLIT', 'SEVER', 'CUT', 'DIVIDE', 'PART',
  'LONE', 'SOLO', 'SINGLE', 'ONLY', 'SOLE', 'MERE', 'REMOTE', 'DISTANT',
  'LEFT', 'EXILE',
  // Bleakness
  'BLEAK', 'STARK', 'DINGY', 'DRAB', 'PLAIN', 'GRAY', 'LOW',
  // 3-letter emptiness/decay
  'RUE', 'ILL', 'EBB', 'DRY', 'OLD', 'WAN', 'SAG', 'RUT', 'SAP',
  // Atmosphere
  'MIST', 'FOG', 'DUSK', 'MARSH', 'SWAMP', 'BOG',
  // Below
  'OUTER', 'BELOW', 'UNDER', 'DEPTH',
  // Movement/Falling
  'FLOAT', 'SINK', 'FALL', 'DROP', 'PLUNGE', 'DIVE', 'TUMBLE', 'SLIDE',
  'SLIP', 'TRIP', 'STUMBLE', 'TOPPLE', 'CRASH', 'LAND', 'SETTLE', 'REST', 'SUNKEN',
  // Time
  'TIME', 'PASS', 'BRIEF', 'SHORT', 'GONE', 'PAST', 'WAS', 'WERE',
  'MOMENT', 'INSTANT', 'FLASH', 'BLINK', 'SWIFT', 'QUICK', 'HASTY', 'RUSH',
  'AGE', 'ERA', 'EPOCH', 'SPAN', 'TERM', 'PHASE', 'STAGE',
]);

// PHASE 3 — Existential Dread (mortality & darkness)
const DREAD_WORDS_PHASE_3 = new Set([
  // Fear & Dread
  'DREAD', 'FEAR', 'FRIGHT', 'TERROR', 'HORROR', 'PANIC', 'ALARM', 'SHOCK',
  'WORRY', 'FRET', 'ANGST', 'STRESS', 'STRAIN', 'TENSE', 'RIGID', 'STIFF',
  // Malice
  'CURSE', 'CURSED', 'BANE', 'WRATH', 'SPITE', 'SCORN', 'CRUEL', 'HARSH', 'STERN',
  // Darkness & Cold
  'DARK', 'DARKLY', 'COLD', 'CHILL', 'FROST', 'ICE', 'FREEZE', 'FRIGID', 'COOL',
  'BLACK', 'NIGHT', 'SHADE', 'SHADOW', 'SHROUD', 'GLOOM', 'MURKY', 'DIM', 'FAINT',
  'DIRE', 'SOOT', 'DAMP', 'BLOT',
  // Bodily horror
  'BLOOD', 'FLESH', 'SKIN', 'CLAW', 'FANG', 'BLEED', 'SWEAT', 'SHIVER',
  'VEIN', 'LIMB', 'GUTS',
  // Predation
  'PREY', 'CRAWL', 'CREEP', 'LURK', 'STALK',
  // Stillness & Silence
  'NUMB', 'STILL', 'QUIET', 'HUSH', 'MUTE', 'SILENT', 'CALM', 'PEACE',
  'STATIC', 'FROZEN', 'FIXED', 'STUCK', 'HALT', 'STOP', 'PAUSE', 'WAIT',
  // Endings
  'END', 'FINAL', 'LAST', 'CEASE', 'DONE', 'OVER', 'FINISH', 'CLOSE',
  'EXPIRE', 'LAPSE', 'ELAPSE',
  // Death imagery
  'DEAD', 'KILL', 'DEATH', 'DYING', 'SLAIN', 'SLAY', 'DROWN', 'CHOKE',
  'DUST', 'ASH', 'GHOST', 'HAUNT', 'SPIRIT', 'SOUL', 'WRAITH',
  'GRAVE', 'TOMB', 'CRYPT', 'BURIAL', 'MOURN', 'GRIEVE', 'WEEP', 'SOB',
  'BONE', 'SKULL', 'CORPSE', 'RELIC', 'FOSSIL', 'MARK', 'COFFIN',
  // Restraint & entrapment
  'GRIP', 'SEIZE', 'CHAIN', 'SNARE', 'TRAP', 'CAGE',
  'KNOT', 'CORD', 'LOCK', 'HELD',
  // Sounds of dread
  'WAIL', 'HOWL', 'MOAN', 'GLARE', 'SNEER', 'GROWL', 'HISS', 'TOLL', 'BELL',
  // Violence
  'QUAKE', 'POUND', 'SLIT', 'GASH', 'GORE', 'STAB', 'TORN', 'HACK', 'CHOP',
  // Suffering
  'AGONY', 'GRIEF', 'WOE', 'SORROW', 'BITTER', 'BURDEN',
  // 3-letter dread
  'DIE', 'CRY', 'WAR', 'IRE', 'HEX', 'RAW', 'SIN', 'MAR', 'RIP', 'ROB', 'JAB',
  // Places of dread
  'VAULT', 'LAIR', 'DEN', 'PIT',
  // Remnants
  'ECHO', 'REMAIN', 'REMAINS', 'LINGER', 'PERSIST', 'ENDURE', 'SURVIVE', 'OUTLAST',
  'MEMORY', 'RECALL', 'RECORD', 'ARCHIVE', 'LEGACY', 'HEIR',
  // Decay (6-7 letter)
  'WITHER', 'ERASED', 'BROKEN', 'FESTER', 'PLAGUE',
  // Vastness
  'VAST', 'HUGE', 'IMMENSE', 'MASSIVE', 'ENDLESS',
  'ETERNAL', 'FOREVER', 'NEVER', 'ALWAYS',
]);

// PHASE 4 — Complete Crisis (cosmic horror & finality)
const DREAD_WORDS_PHASE_4 = new Set([
  // Destruction
  'DOOM', 'RUIN', 'RAVAGE', 'WRECK', 'DESTROY',
  'ABYSS', 'CHASM', 'RIFT', 'TEAR', 'REND', 'SHATTER', 'SMASH', 'CRUSH',
  'IMPLODE', 'EXPLODE', 'BURST', 'RUPTURE', 'DEVOUR', 'MOLTEN',
  // Nothingness
  'NOTHING', 'ABSENCE', 'VACUUM',
  'UNKNOWN', 'UNSEEN',
  // Ritual & sacred
  'ALTAR', 'IDOL', 'CULT', 'RITE', 'OATH', 'PACT', 'SPELL', 'CHANT',
  'SACRED', 'RITUAL', 'OCCULT', 'ARCANE', 'SUMMON', 'INVOKE', 'BECKON',
  'PRAY', 'TOME', 'ROBE', 'SEAL', 'ARCH',
  // Submission
  'BIND', 'CLAIM', 'OFFER', 'SERVE', 'KNEEL', 'BOW', 'OBEY', 'HEED',
  'SWEAR', 'SWORN', 'ACCEPT', 'SUBMIT', 'YIELD', 'RELEASE', 'LET', 'ALLOW',
  // Truth & Illusion
  'TRUTH', 'REAL', 'FAKE', 'FALSE', 'LIE', 'MASK', 'VEIL', 'HIDE',
  'TRICK', 'FOOL', 'SHAM', 'FRAUD', 'HOAX', 'RUSE', 'GUISE', 'DECEIVE',
  // Dreams & Unreality
  'WAKE', 'SLEEP', 'DREAM', 'VISION', 'MIRAGE', 'PHANTOM', 'SPECTER',
  'FANCY', 'WHIM', 'FIGMENT', 'FANTASY', 'REVERIE',
  // Boundaries & Thresholds
  'HORIZON', 'EDGE', 'BRINK', 'VERGE', 'BORDER', 'MARGIN', 'RIM', 'FRINGE',
  'LIMIT', 'BOUND', 'EXTENT', 'REACH', 'SCOPE', 'RANGE',
  'GATE', 'DOOR', 'PORTAL', 'PASSAGE', 'ENTRY', 'EXIT',
  // Entities & powers
  'DEMON', 'FIEND', 'BEAST', 'WITCH', 'TITAN', 'GIANT',
  'CHAOS', 'POWER', 'FORCE', 'SURGE', 'FLOOD', 'STORM',
  'FURY', 'RAGE', 'WELD', 'FUSE',
  // Cosmic/Existential
  'COSMOS', 'SPACE', 'STAR', 'MOON', 'SUN', 'PLANET', 'ORBIT', 'SPHERE',
  'REALM', 'PLANE', 'WORLD',
  'AGELESS', 'UNDYING', 'MORTAL', 'FINITE',
  // Awakening
  'WOKEN', 'RISEN', 'ARISE', 'STIR', 'DWELL', 'ABIDE', 'AWAIT',
  // Fire
  'EMBER', 'FLAME', 'BLAZE', 'TORCH',
  // Weaving
  'WOVEN', 'THREAD',
  // 3-letter cosmic/ritual
  'VOW', 'ORB', 'ODE', 'KEY', 'FOE', 'DYE', 'BAN',
  // Transformation
  'BECOME', 'CONVERT', 'EVOLVE',
  'MELT', 'VANISH',
  // Endings & fate
  'FATE', 'FELL',
  // Final words
  'GOODBYE', 'ADIEU', 'PARTING', 'LEAVE', 'DEPART',
  'SLUMBER', 'REPOSE',
]);

// Build tier lookup map — each word gets its earliest (lowest) tier.
// This determines when a word first becomes narratively relevant.
export const DREAD_WORD_TIER = new Map<string, number>();
function _buildTierMap() {
  const tiers: [Set<string>, number][] = [
    [DREAD_WORDS_PHASE_1, 1],
    [DREAD_WORDS_PHASE_2, 2],
    [DREAD_WORDS_PHASE_3, 3],
    [DREAD_WORDS_PHASE_4, 4],
  ];
  for (const [words, tier] of tiers) {
    for (const w of words) {
      if (!DREAD_WORD_TIER.has(w)) DREAD_WORD_TIER.set(w, tier);
    }
  }
}
_buildTierMap();

/**
 * The strongest dread word in a list (highest tier wins; ties → first seen), or
 * null if none are dread words. Used to name a dread offering "by name" when the
 * player feeds the pit.
 */
export function getStrongestDreadWord(words: string[]): { word: string; tier: number } | null {
  let best: { word: string; tier: number } | null = null;
  for (const raw of words) {
    const w = raw.toUpperCase();
    const tier = DREAD_WORD_TIER.get(w);
    if (tier != null && (!best || tier > best.tier)) {
      best = { word: w, tier };
    }
  }
  return best;
}

// Combined set (backward compat for isDreadWord, calculateRitualEnergy, extractTriggerWords)
const DREAD_WORDS = new Set([
  ...DREAD_WORDS_PHASE_1,
  ...DREAD_WORDS_PHASE_2,
  ...DREAD_WORDS_PHASE_3,
  ...DREAD_WORDS_PHASE_4,
]);

// Current phase for word selection (cached, updated during generation)
let currentDreadPhase: DialoguePhase = 0;

/**
 * Score how "interesting" a word is (0-100)
 * Higher = more interesting/fun to play with
 * Now includes freshness penalty based on word history
 * And dread word bonus based on current phase
 */
function scoreWordInterestingness(
  word: string,
  wordLength: number,
  recencyMap?: Map<string, number>
): number {
  let score = 50; // Base score

  // Apply freshness penalty if history is available
  if (recencyMap) {
    const freshnessPenalty = calculateFreshnessPenalty(word, recencyMap);
    score -= freshnessPenalty;
  }

  // Penalize boring common words heavily
  if (BORING_WORDS.has(word)) {
    score -= 35;
  }

  // Bonus for fun/evocative words
  if (FUN_WORDS.has(word)) {
    score += 30;
  }

  // Phase-tiered dread word scoring — strongly prefers words from the current
  // phase's vocabulary, with diminishing bonuses for adjacent tiers.
  // This creates natural word evolution: curiosity → emptiness → dread → cosmic.
  if (currentDreadPhase > 0) {
    const tier = DREAD_WORD_TIER.get(word);
    if (tier) {
      // Base bonus scales quadratically with phase
      const baseBonus = currentDreadPhase * currentDreadPhase * 2.5;
      // Tier proximity: current phase tier gets full bonus, adjacent tiers less
      const tierDiff = Math.abs(tier - currentDreadPhase);
      const multiplier = tierDiff === 0 ? 1.0 : tierDiff === 1 ? 0.5 : 0.15;
      score += baseBonus * multiplier;
    }
  }

  // Score based on letter composition
  let interestingLetterCount = 0;
  let veryCommonLetterCount = 0;
  let vowelCount = 0;
  const uniqueLetters = new Set(word.split(''));

  for (const letter of word) {
    if (INTERESTING_LETTERS.has(letter)) interestingLetterCount++;
    if (VERY_COMMON_LETTERS.has(letter)) veryCommonLetterCount++;
    if (VOWELS.has(letter)) vowelCount++;
  }

  // Bonus for interesting letters
  score += interestingLetterCount * 10;

  // Small penalty for too many common letters
  if (veryCommonLetterCount >= word.length - 1) {
    score -= 15;
  }

  // Bonus for letter variety (no repeated letters)
  if (uniqueLetters.size === word.length) {
    score += 8;
  }

  // Slight bonus for balanced vowel/consonant ratio
  const vowelRatio = vowelCount / word.length;
  if (vowelRatio >= 0.3 && vowelRatio <= 0.5) {
    score += 5;
  }

  // Use word position in dictionary as a proxy for familiarity, and reward
  // the MAINSTREAM sweet spot (2026-07 de-rarify pass). The old scoring gave
  // +12 to the rarest 30% of the dictionary — it optimized for obscurity,
  // confusing rarity with fun. Players enjoy RECOGNIZING words; obscure ones
  // read as unfair, not clever.
  const wordArray = WORD_ARRAYS[wordLength];
  if (wordArray) {
    // O(1) position lookup (was wordArray.indexOf); -1 when absent, matching
    // indexOf's old return so the branch behavior below is unchanged.
    const index = WORD_INDEX[wordLength]?.get(word) ?? -1;
    if (index < wordArray.length * 0.1) {
      score -= 8; // Ultra-common head: boring filler words (unchanged)
    } else if (index < wordArray.length * 0.6) {
      score += 8; // Mainstream band [10%, 60%): the words players enjoy recognizing
    } else if (index >= wordArray.length * 0.85) {
      score -= 10; // Obscure tail [85%+): rare words read as unfair
    }
    // [60%, 85%) stays neutral: uncommon-but-fair.
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// TRANSFORMATION SURPRISE SCORING
// ============================================================================

/**
 * Score how "surprising" a transformation is
 * Higher = more aha! moment potential
 */
function scoreTransformationSurprise(
  sourceWord: string,
  targetWord: string,
  movedLetter: string,
  insertionIndex: number
): number {
  let score = 50;

  // Bonus if the letter moves to the middle (unexpected position)
  const middleStart = Math.floor(targetWord.length / 3);
  const middleEnd = Math.ceil((targetWord.length * 2) / 3);
  if (insertionIndex >= middleStart && insertionIndex <= middleEnd) {
    score += 20;
  }

  // Bonus if consonant moves into vowel-heavy area or vice versa
  const isVowel = VOWELS.has(movedLetter);
  const surroundingArea = targetWord.slice(
    Math.max(0, insertionIndex - 1),
    insertionIndex + 2
  );
  const surroundingVowels = [...surroundingArea].filter(c => VOWELS.has(c)).length;
  const surroundingVowelRatio = surroundingVowels / surroundingArea.length;

  if (isVowel && surroundingVowelRatio < 0.3) {
    score += 15; // Vowel into consonant-heavy area
  } else if (!isVowel && surroundingVowelRatio > 0.6) {
    score += 15; // Consonant into vowel-heavy area
  }

  // Penalize if anagram-like (same letters just rearranged)
  if (isAnagramLike(sourceWord, targetWord)) {
    score -= 25;
  }

  // Bonus for interesting letter being moved
  if (INTERESTING_LETTERS.has(movedLetter)) {
    score += 15;
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// MOVE QUALITY SCORING (Enhanced)
// ============================================================================

/**
 * Score the quality of a letter move (0-100)
 * Now includes anti-boring and surprise scoring
 */
function scoreMoveQuality(
  sourceWord: string,
  charIndex: number,
  targetWord: string,
  insertionIndex: number,
  previousMovePositions: number[],
  relaxBoring?: boolean
): number {
  let score = 50;
  const char = sourceWord[charIndex];

  // === Anti-Boring Penalty (skipped for reverse mode) ===
  if (!relaxBoring) {
    const boringPenalty = getBoringTransformPenalty(
      sourceWord, charIndex, char, targetWord, insertionIndex
    );
    score -= boringPenalty;
  }

  // === Position Variety ===
  const normalizedSourcePos = charIndex === 0 ? 0 :
                              charIndex === sourceWord.length - 1 ? 2 : 1;

  if (!previousMovePositions.includes(normalizedSourcePos)) {
    score += 15;
  }

  // Strong bonus for middle positions
  if (normalizedSourcePos === 1) {
    score += 20;
  }

  // === Transformation Surprise ===
  const surpriseScore = scoreTransformationSurprise(
    sourceWord, targetWord, char, insertionIndex
  );
  score += (surpriseScore - 50) * 0.5; // Weight it at 50%

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// SEMANTIC DISTANCE & JOURNEY SCORING (Enhanced)
// ============================================================================

// Semantic clusters for journey scoring
const SEMANTIC_CLUSTERS: Record<string, Set<string>> = {
  animals: new Set(['CAT', 'DOG', 'BAT', 'RAT', 'PIG', 'COW', 'HEN', 'ANT', 'BEE', 'OWL', 'FOX', 'ELK', 'EMU', 'APE', 'BEAR', 'BIRD', 'BOAR', 'BULL', 'CALF', 'CARP', 'CLAM', 'COLT', 'CRAB', 'CROW', 'DEER', 'DOVE', 'DUCK', 'FAWN', 'FISH', 'FLEA', 'FOAL', 'FROG', 'GOAT', 'GULL', 'HARE', 'HAWK', 'LAMB', 'LARK', 'LION', 'LYNX', 'MINK', 'MOLE', 'MOTH', 'MULE', 'NEWT', 'ORCA', 'PONY', 'PUMA', 'SEAL', 'SLUG', 'SWAN', 'TOAD', 'WASP', 'WOLF', 'WORM', 'ZEBRA', 'EAGLE', 'HORSE', 'MOUSE', 'OTTER', 'PANDA', 'SHARK', 'SHEEP', 'SKUNK', 'SLOTH', 'SNAIL', 'SNAKE', 'SQUID', 'STORK', 'TIGER', 'TROUT', 'WHALE', 'BISON', 'RAVEN', 'CRANE', 'VIPER', 'COBRA']),

  food: new Set(['EAT', 'ATE', 'PIE', 'JAM', 'HAM', 'EGG', 'NUT', 'PEA', 'TEA', 'BAKE', 'BEAN', 'BEEF', 'BITE', 'BOWL', 'BREW', 'CAKE', 'CHEW', 'CHIP', 'CHOP', 'COOK', 'CORN', 'DINE', 'DISH', 'FEED', 'FOOD', 'FORK', 'LIME', 'MEAL', 'MEAT', 'MENU', 'MILK', 'MINT', 'OATS', 'PEAR', 'PLUM', 'PORK', 'RICE', 'SALT', 'SOUP', 'TART', 'TOAST', 'APPLE', 'BACON', 'BREAD', 'CANDY', 'CREAM', 'FEAST', 'FRUIT', 'GRAPE', 'HONEY', 'JUICE', 'LEMON', 'LUNCH', 'OLIVE', 'ONION', 'PASTA', 'PEACH', 'PIZZA', 'SALAD', 'SAUCE', 'SPICE', 'STEAK', 'SUGAR', 'SWEET', 'SYRUP', 'TASTE', 'TREAT', 'WHEAT']),

  nature: new Set(['SUN', 'SKY', 'SEA', 'BAY', 'DEW', 'FOG', 'ICE', 'MUD', 'OAK', 'ASH', 'ELM', 'FIR', 'IVY', 'BARK', 'BUSH', 'CAVE', 'CLAY', 'COAL', 'DAWN', 'DUNE', 'DUST', 'FARM', 'FERN', 'FIRE', 'GALE', 'GLEN', 'GOLD', 'GULF', 'HAIL', 'HEAT', 'HILL', 'LAKE', 'LAND', 'LEAF', 'MOON', 'MOSS', 'PALM', 'PEAK', 'PINE', 'POND', 'RAIN', 'REEF', 'ROCK', 'ROOT', 'ROSE', 'SAND', 'SEED', 'SNOW', 'SOIL', 'STAR', 'STEM', 'TIDE', 'TREE', 'VALE', 'VINE', 'WAVE', 'WEED', 'WIND', 'WOOD', 'BEACH', 'BLOOM', 'BROOK', 'CLIFF', 'CLOUD', 'COAST', 'CORAL', 'CREEK', 'EARTH', 'FIELD', 'FLAME', 'FLORA', 'FROST', 'GRASS', 'GROVE', 'MARSH', 'OCEAN', 'PLANT', 'RIVER', 'SHORE', 'STORM', 'SWAMP', 'THORN', 'WATER', 'WOODS', 'LAVA', 'MIST', 'HAZE']),

  body: new Set(['ARM', 'EAR', 'EYE', 'GUM', 'GUT', 'HIP', 'JAW', 'LEG', 'LIP', 'RIB', 'TOE', 'BACK', 'BODY', 'BONE', 'BROW', 'CHIN', 'FACE', 'FIST', 'FOOT', 'HAIR', 'HAND', 'HEAD', 'HEEL', 'KNEE', 'LIMB', 'LUNG', 'NAIL', 'NECK', 'NOSE', 'PALM', 'SHIN', 'SKIN', 'SKULL', 'SPINE', 'TEETH', 'THUMB', 'WAIST', 'WRIST', 'ANKLE', 'BRAIN', 'CHEEK', 'CHEST', 'ELBOW', 'HEART', 'MOUTH', 'NERVE', 'ORGAN', 'THIGH', 'TOOTH', 'TRUNK']),

  colors: new Set(['RED', 'TAN', 'AQUA', 'BLUE', 'CYAN', 'GOLD', 'GRAY', 'GREY', 'JADE', 'LIME', 'NAVY', 'PINK', 'PLUM', 'ROSE', 'RUBY', 'RUST', 'TEAL', 'AMBER', 'BLACK', 'BLUSH', 'BROWN', 'CORAL', 'CREAM', 'GREEN', 'IVORY', 'LEMON', 'LILAC', 'MAUVE', 'OLIVE', 'PEACH', 'WHITE', 'ORANGE', 'PURPLE', 'SILVER', 'VIOLET']),

  home: new Set(['BED', 'CUP', 'JAR', 'JUG', 'KEY', 'LID', 'MAT', 'MOP', 'MUG', 'PAN', 'PIN', 'POT', 'RUG', 'TUB', 'URN', 'BATH', 'BELL', 'BOLT', 'BOWL', 'BULB', 'DESK', 'DOOR', 'FORK', 'GATE', 'HALL', 'HOME', 'HOOK', 'IRON', 'KNOB', 'LAMP', 'LOCK', 'NAIL', 'OVEN', 'PAIL', 'PIPE', 'PLUG', 'RACK', 'ROOF', 'ROOM', 'ROPE', 'SHELF', 'SINK', 'SOFA', 'TILE', 'VASE', 'WALL', 'YARD', 'BASIN', 'BENCH', 'BLIND', 'BROOM', 'BRUSH', 'CHAIR', 'CHEST', 'CLOCK', 'COUCH', 'CRATE', 'DRAPE', 'FENCE', 'FLOOR', 'FRAME', 'GLASS', 'HOUSE', 'KNIFE', 'LATCH', 'LIGHT', 'LINEN', 'PIANO', 'PLATE', 'PORCH', 'SHEET', 'SPOON', 'STAIR', 'STOOL', 'STOVE', 'TABLE', 'TORCH', 'TOWEL']),

  action: new Set(['RUN', 'HIT', 'CUT', 'DIG', 'FLY', 'RIP', 'SIT', 'WIN', 'BANG', 'BASH', 'BEAT', 'BLOW', 'BURN', 'CALL', 'DASH', 'DIVE', 'DRAG', 'DRAW', 'DROP', 'DUMP', 'FALL', 'FLEE', 'FLIP', 'GRAB', 'GRIP', 'HACK', 'HAUL', 'HIDE', 'HOLD', 'HUNT', 'HURT', 'JUMP', 'KICK', 'KILL', 'LEAD', 'LEAP', 'LIFT', 'LOST', 'MOVE', 'OPEN', 'PASS', 'PICK', 'PLAY', 'PULL', 'PUSH', 'READ', 'REST', 'RIDE', 'RISE', 'ROLL', 'RUSH', 'SAVE', 'SEEK', 'SHOW', 'SHUT', 'SINK', 'SKIP', 'SLAM', 'SLIP', 'SNAP', 'SPIN', 'STAY', 'STEP', 'STOP', 'SWIM', 'TAKE', 'TALK', 'TEAR', 'TELL', 'TOSS', 'TRAP', 'TRIP', 'TURN', 'WALK', 'WARN', 'WASH', 'WORK', 'WRAP', 'CLASH', 'CLIMB', 'CRAWL', 'DANCE', 'DRIVE', 'FIGHT', 'FLOAT', 'MARCH', 'REACH', 'SHAKE', 'SHOOT', 'SHOUT', 'SLIDE', 'SPEAK', 'STAND', 'STEAL', 'SWING', 'THROW', 'TOUCH', 'WATCH', 'WRITE']),

  // Existential/philosophical words - for darker phases
  existential: new Set(['VOID', 'EMPTY', 'HOLLOW', 'FADE', 'WANE', 'DECAY', 'ALONE', 'LOST', 'DRIFT', 'SINK', 'FALL', 'TIME', 'PASS', 'GONE', 'END', 'LAST', 'CEASE', 'DUST', 'ASH', 'SHADOW', 'SHADE', 'GHOST', 'ECHO', 'VAST', 'DOOM', 'ABYSS', 'RIFT', 'BREAK', 'TRUTH', 'REAL', 'FAKE', 'WAKE', 'SLEEP', 'DREAM', 'EDGE', 'BRINK', 'DREAD', 'FEAR', 'COLD', 'NUMB', 'DARK', 'STILL', 'QUIET', 'FINAL', 'OVER', 'DONE'])
};

export function getSemanticCluster(word: string): string | null {
  for (const [cluster, words] of Object.entries(SEMANTIC_CLUSTERS)) {
    if (words.has(word)) return cluster;
  }
  return null;
}

/**
 * Calculate semantic distance between two words (0-100)
 * Higher = more different/interesting transformation
 */
function calculateSemanticDistance(word1: string, word2: string): number {
  const cluster1 = getSemanticCluster(word1);
  const cluster2 = getSemanticCluster(word2);

  // Both in same cluster = low distance (boring)
  if (cluster1 && cluster1 === cluster2) {
    return 15;
  }

  // Both in different clusters = high distance (great!)
  if (cluster1 && cluster2 && cluster1 !== cluster2) {
    return 95;
  }

  // One or both not in clusters - use letter similarity as fallback
  const letters1 = new Set(word1.split(''));
  const letters2 = new Set(word2.split(''));
  const intersection = new Set([...letters1].filter(x => letters2.has(x)));
  const union = new Set([...letters1, ...letters2]);

  const similarity = intersection.size / union.size;
  return Math.round((1 - similarity) * 70) + 15;
}

/**
 * Score the "semantic journey" of a puzzle chain
 * Bonus for traversing multiple semantic clusters
 */
function scoreSemanticJourney(chain: PathNode[]): number {
  const clusters = chain.map(node => getSemanticCluster(node.word)).filter(c => c !== null);
  const uniqueClusters = new Set(clusters);

  // Bonus for visiting multiple clusters
  if (uniqueClusters.size >= 3) return 30;
  if (uniqueClusters.size >= 2) return 15;
  return 0;
}

/**
 * Score an entire puzzle chain (0-100)
 * Enhanced with journey scoring, stricter boring penalties, and freshness
 */
export function scorePuzzleChain(chain: PathNode[], recencyMap?: Map<string, number>, relaxBoring?: boolean): number {
  if (chain.length < 2) return 0;

  let totalScore = 0;
  const movePositions: number[] = [];
  const movedLetters: string[] = [];
  const formedWords: string[] = [];

  // Score individual words (25% weight) - includes freshness penalty
  const wordScores = chain.map(node => {
    const len = node.word.length;
    return scoreWordInterestingness(node.word, len, recencyMap);
  });
  const avgWordScore = wordScores.reduce((a, b) => a + b, 0) / wordScores.length;
  totalScore += avgWordScore * 0.25;

  // Score moves (35% weight) - increased from 30%
  let moveScoreSum = 0;
  let moveCount = 0;
  let hasBoringMove = false;

  for (let i = 0; i < chain.length - 1; i++) {
    const node = chain[i];
    if (node.letterToGive && node.moveFromIndex !== undefined) {
      const nextNode = chain[i + 1];
      // moveFromIndex indexes into the row's CURRENT state (tempState, after it
      // received the previous move's letter), NOT the original displayed word.
      // Passing node.word here made sourceWord[charIndex] undefined on every
      // move past the first, silently disabling ALL removal-side anti-boring
      // penalties (and misclassifying an end-of-word S-pull as a rewarded
      // middle move). Use the real source state so the scorer works on every
      // move. Target side stays nextNode.word: moveToIndex is the insertion
      // position into the PRE-insertion target (matches SolutionStep).
      const sourceState = node.tempState ?? node.word;
      const moveScore = scoreMoveQuality(
        sourceState,
        node.moveFromIndex,
        nextNode.word,
        node.moveToIndex || 0,
        movePositions,
        relaxBoring
      );

      // Track if any move is very boring (skipped for reverse mode)
      if (!relaxBoring && moveScore < 20) hasBoringMove = true;

      moveScoreSum += moveScore;
      moveCount++;
      movedLetters.push(node.letterToGive);
      formedWords.push(nextNode.tempState ?? nextNode.word);

      const normalizedPos = node.moveFromIndex === 0 ? 0 :
                           node.moveFromIndex === sourceState.length - 1 ? 2 : 1;
      movePositions.push(normalizedPos);
    }
  }

  if (moveCount > 0) {
    totalScore += (moveScoreSum / moveCount) * 0.35;
  }

  // Heavy penalty if any move is boring
  if (hasBoringMove) {
    totalScore -= 20;
  }

  // === Chain-level variety (skipped for reverse, which has its own scoring) ===
  // Attacks the S-shuffle monotony the current banks are dominated by: same
  // letter moved twice, S doing most of the moving, plural-shaped answers.
  if (!relaxBoring && moveCount > 0) {
    // Repeating the same moved letter (S then S) is monotony, not variety —
    // position variety alone never caught it.
    const uniqueMoved = new Set(movedLetters).size;
    totalScore -= 14 * (moveCount - uniqueMoved);

    // S is the runaway most-moved letter (~22% of HARD moves). A single S-move
    // is fine; TWO or more on one board is the S-shuffle. Penalize per extra
    // S-move so it scales with the abuse and never punishes one S.
    const sMoves = movedLetters.filter(c => c === 'S').length;
    totalScore -= 20 * Math.max(0, sMoves - 1);

    // Plural-shaped answers: formed words ending in S ran 30-45% of moves in the
    // banks; push it down toward a third.
    const pluralFormed = formedWords.filter(w => w.endsWith('S')).length;
    const pluralShare = pluralFormed / moveCount;
    if (pluralShare > 0.34) {
      totalScore -= Math.round(15 * (pluralShare - 0.34) / 0.66);
    }
  }

  // Score semantic distance start→end (20% weight)
  const startWord = chain[0].word;
  const endWord = chain[chain.length - 1].word;
  const semanticScore = calculateSemanticDistance(startWord, endWord);
  totalScore += semanticScore * 0.20;

  // Score semantic journey (10% weight) - NEW
  const journeyScore = scoreSemanticJourney(chain);
  totalScore += journeyScore * 0.10;

  // Position variety bonus (10% weight)
  const uniquePositions = new Set(movePositions).size;
  const positionVarietyBonus = (uniquePositions / 3) * 10;
  totalScore += positionVarietyBonus;

  // Standard-board decision depth: reward chains that leave the player more
  // than one completing route. This is deliberately a bounded final nudge,
  // not a hard gate, so vocabulary, move quality, and generation latency stay
  // primary. Reverse generation uses different lock semantics and already has
  // its own flexibility scoring, so it skips this standard-rule metric.
  if (!relaxBoring) {
    const branching = analyzeStandardBranching(
      chain.map(node => node.word),
      validateWord,
      { pathCap: 8, stateCap: 500 },
    );
    totalScore += Math.min(10, branching.structuralBonus * 0.75);
    // Single-route boards are a forced rail. -3 was too weak to steer the
    // best-of-3 pick away from them; -8 makes on-device standard generation
    // lean multi-route to match the gated banks (the gated generator still
    // hard-rejects single-route boards on top of this).
    if (branching.completePathCount <= 1) totalScore -= 8;
  }

  return Math.round(Math.max(0, Math.min(100, totalScore)));
}

// ============================================================================
// PUZZLE GENERATION
// ============================================================================

function shuffle<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export interface PathNode {
  word: string;
  tempState?: string;
  letterReceived?: string;
  letterToGive?: string;
  moveFromIndex?: number;
  moveToIndex?: number;
}

interface GenState {
  startTime: number;
  lastYieldTime: number;
}

interface GeneratedPuzzle {
  chain: PathNode[];
  score: number;
}

/**
 * Weight candidates by interestingness score for smarter selection
 * Filters out words in hard cooldown and penalizes recently used words
 */
function weightedShuffle(
  words: string[],
  wordLength: number,
  recencyMap?: Map<string, number>
): string[] {
  // Filter out words in hard cooldown
  const availableWords = recencyMap
    ? words.filter(word => !isInHardCooldown(word, recencyMap))
    : words;

  const scored = availableWords.map(word => ({
    word,
    score: scoreWordInterestingness(word, wordLength, recencyMap) + Math.random() * 30
  }));

  scored.sort((a, b) => b.score - a.score);

  const topCount = Math.ceil(scored.length * 0.75);
  const topWords = shuffle(scored.slice(0, topCount).map(s => s.word));
  const restWords = shuffle(scored.slice(topCount).map(s => s.word));

  return [...topWords, ...restWords];
}

// ============================================================================
// PRE-COMPUTED REMOVAL INDEX — for reverse-first chain generation
// Maps (W+1)-letter words to their valid single-letter removals.
// ============================================================================

interface RemovalTarget {
  /** The (W+1)-letter source word */
  sourceWord: string;
  /** The W-letter word after removal */
  remainder: string;
  /** The letter that was removed */
  letter: string;
  /** Position from which the letter was removed */
  position: number;
}

const removalIndexCache = new Map<number, Map<string, RemovalTarget[]>>();

/**
 * Build (or retrieve cached) the removal index for a given base word length W.
 * For each (W+1)-letter word and each position, checks if removing the letter
 * at that position produces a valid W-letter word.
 *
 * Returns: Map<sourceWord(W+1), RemovalTarget[]>
 */
function getRemovalIndex(wordLength: number): Map<string, RemovalTarget[]> {
  const cached = removalIndexCache.get(wordLength);
  if (cached) return cached;

  const baseSet = WORD_SETS[wordLength];
  const maxSet = WORD_SETS[wordLength + 1];
  if (!baseSet || !maxSet) return new Map();

  const index = new Map<string, RemovalTarget[]>();

  for (const word of maxSet) {
    const targets: RemovalTarget[] = [];
    for (let j = 0; j < word.length; j++) {
      const remainder = word.slice(0, j) + word.slice(j + 1);
      if (baseSet.has(remainder)) {
        targets.push({
          sourceWord: word,
          remainder,
          letter: word[j],
          position: j,
        });
      }
    }
    if (targets.length > 0) {
      index.set(word, targets);
    }
  }

  removalIndexCache.set(wordLength, index);
  return index;
}

// ============================================================================
// REVERSE-FIRST CHAIN GENERATOR
// Builds chains bottom-to-top that are reverse-solvable by construction,
// then validates the (much easier) forward path.
// ============================================================================

interface ReverseChainNode {
  /** The original W-letter word for this row */
  word: string;
  /** Post-forward state of this row (may be W-1, W, or W+1 letters) */
  postForwardState: string;
  /** Locked positions in this row (from forward play) */
  lockedPositions: Set<number>;
}

/**
 * Generate a puzzle chain that is reverse-solvable.
 *
 * Uses high-throughput brute-force sampling: rapidly builds random valid chains
 * and checks each with isReverseSolvable. At ~6400 checks/sec and ~0.02% pass rate,
 * finds a valid chain in ~1-3 seconds on average.
 *
 * The speed comes from:
 * - Pre-computed insertion index for instant candidate lookup
 * - isReverseSolvable returning false very quickly for non-solvable chains (~0.1ms)
 * - Tight synchronous loop with no async overhead
 *
 * Returns a PathNode[] chain (top-to-bottom order) or null if no chain found.
 */
async function generateReverseChain(
  targetRows: number,
  wordLength: number,
  dicts: { min: Set<string>, base: Set<string>, max: Set<string>, baseArray: string[] },
  timeoutMs: number,
  recencyMap?: Map<string, number>
): Promise<PathNode[] | null> {
  const startTime = Date.now();
  const insertionIdx = getInsertionIndex(wordLength);
  const numSteps = targetRows - 1;

  // Pre-build all insertion targets per letter as arrays for fast random access
  const targetsByLetter = new Map<string, InsertionTarget[]>();
  for (let c = 65; c <= 90; c++) {
    const letter = String.fromCharCode(c);
    const targets = insertionIdx.get(letter);
    if (targets && targets.length > 0) {
      targetsByLetter.set(letter, targets);
    }
  }

  let bestChain: PathNode[] | null = null;
  let bestScore = -1;
  let checksCount = 0;

  // Yield to the event loop once per frame so the UI stays responsive during
  // reverse generation (which can run up to ~25s). This used to be 200ms, ~13x
  // coarser than the standard/double generators (both yield at 15ms), which let
  // the JS thread stall in 200ms chunks while a reverse board was searched.
  const YIELD_INTERVAL = 15;
  let lastYield = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Yield periodically
    if (Date.now() - lastYield > YIELD_INTERVAL) {
      if (!SKIP_EVENT_LOOP_YIELDS) await new Promise(resolve => setTimeout(resolve, 0));
      lastYield = Date.now();
    }

    // Pick a random start word
    const w0 = dicts.baseArray[Math.floor(Math.random() * dicts.baseArray.length)];

    // Try to build a chain from w0 by making random valid moves at each step
    const chain: PathNode[] = [{ word: w0, tempState: w0 }];
    const usedWords = new Set([w0]);
    const solution: PuzzleSolutionStep[] = [];
    let valid = true;

    let currentTempWord = w0;
    let letterReceived: string | undefined = undefined;

    for (let step = 0; step < numSteps; step++) {
      // Find valid letter removals from currentTempWord
      const removals: Array<{ charIndex: number; char: string; remainder: string }> = [];

      for (let j = 0; j < currentTempWord.length; j++) {
        const char = currentTempWord[j];
        if (letterReceived && char === letterReceived) continue;

        const remainder = currentTempWord.slice(0, j) + currentTempWord.slice(j + 1);
        const isValid = step === 0 ? dicts.min.has(remainder) : dicts.base.has(remainder);
        if (isValid && !usedWords.has(remainder)) {
          removals.push({ charIndex: j, char, remainder });
        }
      }

      if (removals.length === 0) { valid = false; break; }

      // Pick a random removal
      const removal = removals[Math.floor(Math.random() * removals.length)];
      const { charIndex, char, remainder } = removal;

      // Find valid insertion targets for this letter
      const targets = targetsByLetter.get(char);
      if (!targets || targets.length === 0) { valid = false; break; }

      // Pick a random target (shuffle a subset)
      const maxTries = Math.min(targets.length, 20);
      let found = false;

      for (let attempt = 0; attempt < maxTries; attempt++) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        if (usedWords.has(t.baseWord) || usedWords.has(t.result)) continue;
        if (recencyMap && isInHardCooldown(t.baseWord, recencyMap)) continue;

        // Build chain node
        const updatedPrev: PathNode = {
          ...chain[chain.length - 1],
          letterToGive: char,
          moveFromIndex: charIndex,
          moveToIndex: t.position,
        };
        chain[chain.length - 1] = updatedPrev;

        solution.push({
          stepIndex: step,
          sourceWord: chain[step].tempState ?? chain[step].word,
          targetWord: t.baseWord,
          letterToMove: char,
          explanation: '',
          insertionPosition: t.position,
          removalPosition: charIndex,
        });

        chain.push({
          word: t.baseWord,
          tempState: t.result,
          letterReceived: char,
        });

        usedWords.add(remainder);
        usedWords.add(t.baseWord);
        usedWords.add(t.result);

        currentTempWord = t.result;
        letterReceived = char;
        found = true;
        break;
      }

      if (!found) { valid = false; break; }
    }

    if (!valid || chain.length !== targetRows) continue;

    // Check reverse solvability (fast — ~0.1ms per check)
    const words = chain.map(n => n.word);
    checksCount++;

    if (
      isReverseSolvable(words, solution) &&
      // Final gate under the SHIPPED rules — no more unwinnable reverse boards.
      isReverseChainSolvable(words, isValidWordForRules) === 'solvable'
    ) {
      const score = scorePuzzleChain(chain, recencyMap, true);
      if (score > bestScore) {
        bestChain = chain;
        bestScore = score;

        // If we found a decent puzzle, return it. If quality is low, keep looking
        // for a better one (up to 2 more seconds).
        if (score >= 30 || Date.now() - startTime > timeoutMs - 2000) {
          return bestChain;
        }
      }
    }
  }

  return bestChain;
}

/**
 * Quality floor for forced-start generation (echo puzzles seed a word from the
 * player's ritual history). Echo boards are the descent's showcase moment, so
 * they no longer bypass the quality gate entirely (the old floor was 0) — but
 * the floor stays modest because the start word is non-negotiable, and if no
 * chain clears it within the attempt budget the best valid chain is accepted
 * anyway (see bestBelowFloor) so echo generation never starts failing.
 */
export const FORCED_START_MIN_SCORE = 20;

/**
 * Final-pick preference for standard generation: among the finished
 * candidates, the highest-scoring one with 2+ complete routes wins; when
 * every candidate is single-route, the best-scoring candidate ships
 * unchanged. Generic over the candidate shape (the path-count lookup is
 * injected) so the rule is directly testable without live generation.
 */
export function pickMultiRouteCandidate<T extends { score: number }>(
  candidates: readonly T[],
  getCompletePathCount: (candidate: T) => number,
  hasTrap?: (candidate: T) => boolean,
): T | null {
  if (candidates.length === 0) return null;
  let bestOverall = candidates[0];
  let bestMultiRoute: T | null = null;
  for (const candidate of candidates) {
    if (candidate.score > bestOverall.score) bestOverall = candidate;
    if (getCompletePathCount(candidate) >= 2) {
      // Score stays primary; trap presence only breaks EXACT score ties among
      // qualifying multi-route candidates (a plausible wrong turn is planning
      // depth when an alternate completing route exists). Single-route
      // candidates never gain from traps: they stay in the fallback below.
      if (
        bestMultiRoute === null ||
        candidate.score > bestMultiRoute.score ||
        (hasTrap !== undefined &&
          candidate.score === bestMultiRoute.score &&
          hasTrap(candidate) &&
          !hasTrap(bestMultiRoute))
      ) {
        bestMultiRoute = candidate;
      }
    }
  }
  return bestMultiRoute ?? bestOverall;
}

export const generateLocalPuzzle = async (
  difficulty: Difficulty = 'MEDIUM',
  overrides?: { wordLength?: number; targetRows?: number; startWord?: string; requireReverseSolvable?: boolean; relaxBoring?: boolean }
): Promise<PuzzleConfig> => {
  const targetRows = overrides?.targetRows ?? (
    difficulty === 'EASY' ? 3 :
    difficulty === 'MEDIUM' ? 4 :
    difficulty === 'MEDIUM_PLUS' ? 4 :
    5 // HARD
  );
  const wordLength = overrides?.wordLength ?? (
    difficulty === 'EASY' ? 4 :
    difficulty === 'MEDIUM' ? 4 :
    difficulty === 'MEDIUM_PLUS' ? 5 :
    5 // HARD
  );
  const forcedStartWord = overrides?.startWord?.toUpperCase();
  const requireReverse = overrides?.requireReverseSolvable ?? false;
  const relaxBoring = overrides?.relaxBoring ?? requireReverse;

  // Load word history for diversity scoring
  const recencyMap = await getWordHistoryWithRecency();

  // Load current phase for dread word selection
  try {
    currentDreadPhase = await getCurrentPhase();
  } catch {
    currentDreadPhase = 0;
  }

  const dicts = {
    min: WORD_SETS[wordLength - 1],
    base: WORD_SETS[wordLength],
    max: WORD_SETS[wordLength + 1],
    baseArray: shuffle(Array.from(WORD_SETS[wordLength]))
  };

  // --- Reverse-first generation path ---
  // When reverse solvability is required, use the dedicated reverse-aware
  // generator that builds chains with removal flexibility scoring and
  // incremental reverse pruning. This produces chains that pass
  // isReverseSolvable at much higher rates than the standard forward DFS.
  if (requireReverse && !forcedStartWord) {
    const REVERSE_TIMEOUT = 25000;
    const path = await generateReverseChain(
      targetRows,
      wordLength,
      dicts,
      REVERSE_TIMEOUT,
      recencyMap
    );

    if (!path) {
      throw new Error("Could not generate valid puzzle locally");
    }

    const words = path.map(n => n.word);
    await recordPuzzleWords(words);

    const solution: PuzzleSolutionStep[] = [];
    for (let s = 0; s < path.length - 1; s++) {
      const sourceState = path[s].tempState ?? path[s].word;
      const targetResult = path[s + 1].tempState ?? path[s + 1].word;
      solution.push({
        stepIndex: s,
        sourceWord: sourceState,
        targetWord: path[s + 1].word,
        letterToMove: path[s].letterToGive!,
        explanation: `Move '${path[s].letterToGive}' from ${sourceState} to form ${targetResult}.`,
        insertionPosition: path[s].moveToIndex,
        removalPosition: path[s].moveFromIndex,
      });
    }

    // Solve the reverse path to capture reverse solution steps for hints.
    // This also updates the forward solution's insertionPositions to match
    // the specific forward placement that makes the reverse path work.
    const reverseSolution = solveReverse(words, solution);

    return {
      words,
      hint: `Start by shifting '${solution[0].letterToMove}'`,
      solution,
      reverseSolution: reverseSolution ?? undefined,
      wordLength
    };
  }

  // --- Standard forward generation path ---
  const GLOBAL_TIMEOUT = 2500;
  const CANDIDATES_TO_GENERATE = forcedStartWord ? 1 : 3;
  const MIN_ACCEPTABLE_SCORE = forcedStartWord ? FORCED_START_MIN_SCORE : 45;
  const generatedPuzzles: GeneratedPuzzle[] = [];
  // Graceful relaxation for forced-start (echo) generation: remember the best
  // below-floor chain so, if no attempt clears the floor within the budget,
  // we ship that instead of failing (echo boards must never stop generating).
  let bestBelowFloor: GeneratedPuzzle | null = null;

  const state: GenState = {
    startTime: Date.now(),
    lastYieldTime: Date.now()
  };

  // Weight and filter words based on history
  const candidatesW1 = forcedStartWord
    ? [forcedStartWord, forcedStartWord, forcedStartWord, forcedStartWord]
    : weightedShuffle(dicts.baseArray, wordLength, recencyMap);

  if (forcedStartWord && !dicts.base.has(forcedStartWord)) {
    throw new Error(`Forced start word "${forcedStartWord}" is not valid for word length ${wordLength}`);
  }
  let candidateIndex = 0;

  while (generatedPuzzles.length < CANDIDATES_TO_GENERATE &&
         candidateIndex < candidatesW1.length &&
         Date.now() - state.startTime < GLOBAL_TIMEOUT) {

    const w1 = candidatesW1[candidateIndex];
    candidateIndex++;

    const path = await findPath(
      [{ word: w1, tempState: w1 }],
      targetRows,
      new Set([w1]),
      dicts,
      GLOBAL_TIMEOUT,
      state,
      [],
      recencyMap,
      relaxBoring,
      requireReverse
    );

    if (path) {
      const score = scorePuzzleChain(path, recencyMap, relaxBoring);

      // Only accept puzzles above minimum threshold
      if (score >= MIN_ACCEPTABLE_SCORE) {
        generatedPuzzles.push({ chain: path, score });

        // Early exit if we found a great puzzle
        if (score >= 70 && generatedPuzzles.length >= 2) {
          break;
        }
      } else if (forcedStartWord && (!bestBelowFloor || score > bestBelowFloor.score)) {
        bestBelowFloor = { chain: path, score };
      }
    }
  }

  if (generatedPuzzles.length === 0) {
    if (forcedStartWord && bestBelowFloor) {
      // No forced-start chain cleared the quality floor within the attempt
      // budget — accept the best valid chain rather than failing (the old
      // floor-0 behavior, kept as the relaxation path).
      generatedPuzzles.push(bestBelowFloor);
    } else {
      throw new Error("Could not generate valid puzzle locally");
    }
  }

  generatedPuzzles.sort((a, b) => b.score - a.score);
  // Delivered-experience preference at the final pick: most chains have
  // exactly one complete route, so when several finished candidates exist,
  // ship the highest-scoring one that leaves the player 2+ real routes (the
  // best single-route candidate when none qualifies). Skipped for
  // forced-start (echo) boards, whose non-negotiable seed word already
  // starves the candidate pool, and for reverse-required chains, whose lock
  // semantics this standard-rule metric does not model. At most 3 finished
  // candidates are analyzed with tight caps AFTER the search loop ends, so
  // generation latency and the existing timeout behavior are untouched.
  let bestPuzzle: GeneratedPuzzle;
  if (forcedStartWord || requireReverse || generatedPuzzles.length < 2) {
    bestPuzzle = generatedPuzzles[0];
  } else {
    // Analyze each finished candidate at most once (both getters share the
    // memo), keeping the tight caps and post-search timing unchanged.
    const candidateMetrics = new Map<GeneratedPuzzle, PuzzleBranchingMetrics>();
    const metricsFor = (candidate: GeneratedPuzzle): PuzzleBranchingMetrics => {
      let metrics = candidateMetrics.get(candidate);
      if (!metrics) {
        metrics = analyzeStandardBranching(
          candidate.chain.map(node => node.word),
          validateWord,
          { pathCap: 8, stateCap: 500 },
        );
        candidateMetrics.set(candidate, metrics);
      }
      return metrics;
    };
    bestPuzzle = pickMultiRouteCandidate(
      generatedPuzzles,
      candidate => metricsFor(candidate).completePathCount,
      candidate => metricsFor(candidate).trapStepFraction > 0,
    ) ?? generatedPuzzles[0];
  }
  const path = bestPuzzle.chain;

  const words = path.map(n => n.word);

  // Record these words in history for future diversity
  await recordPuzzleWords(words);

  const solution: PuzzleSolutionStep[] = [];

  for (let s = 0; s < path.length - 1; s++) {
    const sourceNode = path[s];
    const targetNode = path[s + 1];
    const sourceState = sourceNode.tempState ?? sourceNode.word;
    const targetResult = targetNode.tempState ?? targetNode.word;

    solution.push({
      stepIndex: s,
      sourceWord: sourceState,
      targetWord: targetNode.word,
      letterToMove: sourceNode.letterToGive!,
      explanation: `Move '${sourceNode.letterToGive}' from ${sourceState} to form ${targetResult}.`,
      insertionPosition: sourceNode.moveToIndex,
      removalPosition: sourceNode.moveFromIndex,
    });
  }

  return {
    words,
    hint: `Start by shifting '${solution[0].letterToMove}'`,
    solution,
    wordLength,
    // Real chain score of the delivered board (0-100). Consumers that persist
    // banks store this instead of a flat 50 so within-bank selection can rank
    // by genuine quality (see puzzleBank scorePuzzleForContext + A7).
    qualityScore: bestPuzzle.score,
  };
};

/**
 * Validate that a puzzle's reverse path is solvable.
 *
 * Simulates the forward pass using solution steps to compute the post-forward
 * board state, then checks if a valid DFS path exists from the last row back
 * to row 0 (each step: pick a letter from source → valid shorter word,
 * drop it into target → valid longer word).
 *
 * Accounts for cumulative locked-letter mechanic: every letter that was shifted
 * during the forward pass stays locked in its destination row for the entire
 * reverse leg. Additionally, letters shifted during the reverse leg accumulate
 * locks in their target rows. The validator tracks per-row locked position sets
 * and adjusts positions when letters are inserted or removed.
 *
 * Since the player can choose ANY valid insertion position during the forward
 * pass, the validator tries ALL valid insertion positions at each step and
 * returns true if ANY combination of positions yields a reverse-solvable board.
 */
export function isReverseSolvable(
  words: string[],
  solution: PuzzleSolutionStep[]
): boolean {
  if (!solution || solution.length === 0 || words.length < 2) return false;

  const wordLength = words[0].length;
  const minDict = WORD_SETS[wordLength - 1];
  const baseDict = WORD_SETS[wordLength];
  const maxDict = WORD_SETS[wordLength + 1];

  if (!minDict || !baseDict || !maxDict) return false;

  // Work budget: the removal x insertion combinations multiply per step, and
  // every complete combination runs a solver capped at ~100k iterations. On
  // pathological chains that product allocates faster than the GC can reclaim
  // (observed: heap-limit abort inside a single call), so the whole search is
  // capped at a fixed number of leaf solver calls. Exhaustion = "not solvable",
  // which merely skips that candidate chain during generation.
  let leafBudget = 20000;

  // Recursively try all valid insertion positions for each forward step.
  // Returns true if any combination leads to a reverse-solvable board.
  function tryForwardStep(
    stepIdx: number,
    rowLetters: string[][],
    lockedSets: Set<number>[]
  ): boolean {
    if (leafBudget <= 0) return false;
    if (stepIdx >= solution.length) {
      // All forward steps done — check reverse solvability
      leafBudget--;
      const postForwardRows = rowLetters.map(r => r.join(''));
      return canSolveReverseIterative(postForwardRows, minDict, baseDict, maxDict, wordLength, lockedSets);
    }

    const step = solution[stepIdx];
    const srcRow = rowLetters[step.stepIndex];
    const srcLocked = lockedSets[step.stepIndex];

    // Find ALL unlocked positions where the letter to move exists.
    const unlockedPositions: number[] = [];
    for (let i = 0; i < srcRow.length; i++) {
      if (srcRow[i] === step.letterToMove && !srcLocked.has(i)) {
        unlockedPositions.push(i);
      }
    }
    if (unlockedPositions.length === 0) return false;

    // Only validate remainder when there are duplicate occurrences (disambiguation needed).
    // When unique, just use that position directly.
    const validRemovePositions = unlockedPositions.length === 1
      ? unlockedPositions
      : unlockedPositions.filter(i => {
          const remainder = srcRow.slice(0, i).join('') + srcRow.slice(i + 1).join('');
          return baseDict.has(remainder);
        });
    if (validRemovePositions.length === 0) return false;

    // Try each valid removal position × each valid insertion position
    const tgtRow = rowLetters[step.stepIndex + 1];
    const tgtStr = tgtRow.join('');

    for (const letterIdx of validRemovePositions) {
      const shiftedSrcLocked = new Set<number>();
      for (const pos of srcLocked) {
        if (pos < letterIdx) shiftedSrcLocked.add(pos);
        else if (pos > letterIdx) shiftedSrcLocked.add(pos - 1);
      }

      const newSrcRow = [...srcRow];
      newSrcRow.splice(letterIdx, 1);

      for (let k = 0; k <= tgtRow.length; k++) {
        const combined = tgtStr.slice(0, k) + step.letterToMove + tgtStr.slice(k);
        if (!maxDict.has(combined)) continue;

        const newRowLetters = rowLetters.map(r => [...r]);
        newRowLetters[step.stepIndex] = newSrcRow;
        const newTgtRow = [...tgtRow];
        newTgtRow.splice(k, 0, step.letterToMove);
        newRowLetters[step.stepIndex + 1] = newTgtRow;

        const newLockedSets = lockedSets.map(s => new Set(s));
        newLockedSets[step.stepIndex] = shiftedSrcLocked;
        newLockedSets[step.stepIndex + 1] = new Set(lockedSets[step.stepIndex + 1]);
        newLockedSets[step.stepIndex + 1].add(k);

        if (tryForwardStep(stepIdx + 1, newRowLetters, newLockedSets)) {
          return true;
        }
      }
    }

    return false;
  }

  const initialRowLetters = words.map(w => w.split(''));
  const initialLockedSets: Set<number>[] = words.map(() => new Set<number>());

  return tryForwardStep(0, initialRowLetters, initialLockedSets);
}

/**
 * Fast approximation of isReverseSolvable for use during chain generation.
 * Instead of exhaustively trying ALL forward insertion position combinations,
 * samples a limited number of random combinations. This is ~50-100x faster
 * than the full check with some false negatives (may miss valid chains).
 *
 * For each forward step, picks up to 2 random valid insertion positions,
 * giving at most 2^numSteps combinations (16 for HARD). Uses a reduced
 * MAX_ITERATIONS for the reverse DFS.
 */
function isReverseSolvableFast(
  words: string[],
  solution: PuzzleSolutionStep[]
): boolean {
  if (!solution || solution.length === 0 || words.length < 2) return false;

  const wordLength = words[0].length;
  const minDict = WORD_SETS[wordLength - 1];
  const baseDict = WORD_SETS[wordLength];
  const maxDict = WORD_SETS[wordLength + 1];

  if (!minDict || !baseDict || !maxDict) return false;

  // Collect valid insertion positions per step
  type StepPositions = Array<{
    k: number; // insertion position
    newRowLetters: string[][];
    newLockedSets: Set<number>[];
  }>;

  // Build all valid forward states step by step, sampling at each level
  function buildForwardStates(
    stepIdx: number,
    rowLetters: string[][],
    lockedSets: Set<number>[],
    maxPerStep: number
  ): Array<{ rows: string[]; lockedSets: Set<number>[] }> {
    if (stepIdx >= solution.length) {
      return [{ rows: rowLetters.map(r => r.join('')), lockedSets }];
    }

    const step = solution[stepIdx];
    const srcRow = rowLetters[step.stepIndex];
    const srcLocked = lockedSets[step.stepIndex];

    // Find ALL unlocked positions where the letter to move exists.
    const unlockedPositions: number[] = [];
    for (let i = 0; i < srcRow.length; i++) {
      if (srcRow[i] === step.letterToMove && !srcLocked.has(i)) {
        unlockedPositions.push(i);
      }
    }
    if (unlockedPositions.length === 0) return [];

    // Only validate remainder when there are duplicate occurrences (disambiguation needed).
    const validRemovePositions = unlockedPositions.length === 1
      ? unlockedPositions
      : unlockedPositions.filter(i => {
          const remainder = srcRow.slice(0, i).join('') + srcRow.slice(i + 1).join('');
          return baseDict.has(remainder);
        });
    if (validRemovePositions.length === 0) return [];

    const tgtRow = rowLetters[step.stepIndex + 1];
    const tgtStr = tgtRow.join('');

    const results: Array<{ rows: string[]; lockedSets: Set<number>[] }> = [];

    for (const letterIdx of validRemovePositions) {
      const shiftedSrcLocked = new Set<number>();
      for (const pos of srcLocked) {
        if (pos < letterIdx) shiftedSrcLocked.add(pos);
        else if (pos > letterIdx) shiftedSrcLocked.add(pos - 1);
      }

      const newSrcRow = [...srcRow];
      newSrcRow.splice(letterIdx, 1);

      // Find all valid insertion positions
      const validPositions: number[] = [];
      for (let k = 0; k <= tgtRow.length; k++) {
        const combined = tgtStr.slice(0, k) + step.letterToMove + tgtStr.slice(k);
        if (maxDict.has(combined)) validPositions.push(k);
      }

      if (validPositions.length === 0) continue;

      // Sample: shuffle and take up to maxPerStep
      const sampled = shuffle(validPositions).slice(0, maxPerStep);

      for (const k of sampled) {
        const newRowLetters = rowLetters.map(r => [...r]);
        newRowLetters[step.stepIndex] = newSrcRow;
        const newTgtRow = [...tgtRow];
        newTgtRow.splice(k, 0, step.letterToMove);
        newRowLetters[step.stepIndex + 1] = newTgtRow;

        const newLockedSets = lockedSets.map(s => new Set(s));
        newLockedSets[step.stepIndex] = shiftedSrcLocked;
        const shiftedTgtLocked = new Set<number>();
        for (const pos of lockedSets[step.stepIndex + 1]) {
          if (pos < k) shiftedTgtLocked.add(pos);
          else shiftedTgtLocked.add(pos + 1);
        }
        shiftedTgtLocked.add(k);
        newLockedSets[step.stepIndex + 1] = shiftedTgtLocked;

        results.push(...buildForwardStates(stepIdx + 1, newRowLetters, newLockedSets, maxPerStep));
      }
    }

    return results;
  }

  const initialRowLetters = words.map(w => w.split(''));
  const initialLockedSets: Set<number>[] = words.map(() => new Set<number>());

  // Sample up to 2 positions per step → max 16 combinations for 4-step HARD
  const forwardStates = buildForwardStates(0, initialRowLetters, initialLockedSets, 2);

  // Check each sampled forward state with a reduced iteration limit
  for (const st of forwardStates) {
    if (canSolveReverseIterative(st.rows, minDict, baseDict, maxDict, wordLength, st.lockedSets, 15000)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if the reverse path from bottom to top is solvable.
 * Uses iterative depth-first search with backtracking.
 *
 * Tracks per-row locked position sets. All letters shifted during the forward
 * pass remain locked. Letters shifted during the reverse leg accumulate in the
 * target row's locked set. When a letter is removed at position i, locked
 * positions > i shift left. When a letter is inserted at position j, locked
 * positions >= j shift right and j is added.
 */
function canSolveReverseIterative(
  startRows: string[],
  minDict: Set<string>,
  baseDict: Set<string>,
  maxDict: Set<string>,
  wordLength: number,
  initialLockedSets: Set<number>[],
  maxIterationsOverride?: number
): boolean {
  const numSteps = startRows.length - 1;

  interface Frame {
    rows: string[];
    step: number;
    moveIdx: number;
    lockedSets: Set<number>[];
  }

  // Enumerate all possible moves for a given step, skipping locked positions
  function getMoves(
    sourceWord: string,
    targetWord: string,
    step: number,
    sourceLockedSet: Set<number>
  ): Array<{ newSource: string; newTarget: string; insertPos: number; removePos: number }> {
    const isLastStep = step === numSteps - 1;
    const moves: Array<{ newSource: string; newTarget: string; insertPos: number; removePos: number }> = [];

    for (let i = 0; i < sourceWord.length; i++) {
      // Skip all locked positions — these letters cannot be picked
      if (sourceLockedSet.has(i)) continue;

      const letter = sourceWord[i];
      const remainder = sourceWord.slice(0, i) + sourceWord.slice(i + 1);

      if (!baseDict.has(remainder)) continue;

      for (let j = 0; j <= targetWord.length; j++) {
        const combined = targetWord.slice(0, j) + letter + targetWord.slice(j);

        const isCombinedValid = isLastStep
          ? baseDict.has(combined)
          : maxDict.has(combined);
        if (!isCombinedValid) continue;

        moves.push({ newSource: remainder, newTarget: combined, insertPos: j, removePos: i });
      }
    }
    return moves;
  }

  // Update locked positions after removing a letter at removePos from a row
  function shiftLockedAfterRemoval(locked: Set<number>, removePos: number): Set<number> {
    const shifted = new Set<number>();
    for (const pos of locked) {
      if (pos < removePos) shifted.add(pos);
      else if (pos > removePos) shifted.add(pos - 1);
      // pos === removePos shouldn't happen (we skip locked), but drop it if so
    }
    return shifted;
  }

  // Update locked positions after inserting a letter at insertPos into a row
  function shiftLockedAfterInsertion(locked: Set<number>, insertPos: number): Set<number> {
    const shifted = new Set<number>();
    for (const pos of locked) {
      if (pos < insertPos) shifted.add(pos);
      else shifted.add(pos + 1); // pos >= insertPos shifts right
    }
    shifted.add(insertPos); // the inserted letter is now locked
    return shifted;
  }

  const stack: Frame[] = [{
    rows: [...startRows],
    step: 0,
    moveIdx: 0,
    lockedSets: initialLockedSets.map(s => new Set(s)),
  }];

  let iterations = 0;
  const MAX_ITERATIONS = maxIterationsOverride ?? (numSteps >= 4 ? 100000 : 50000);

  while (stack.length > 0) {
    if (++iterations > MAX_ITERATIONS) return false; // Safety cutoff

    const frame = stack[stack.length - 1];
    const sourceRowIdx = startRows.length - 1 - frame.step;
    const targetRowIdx = sourceRowIdx - 1;

    const sourceWord = frame.rows[sourceRowIdx];
    const targetWord = frame.rows[targetRowIdx];

    const moves = getMoves(sourceWord, targetWord, frame.step, frame.lockedSets[sourceRowIdx]);

    if (frame.moveIdx >= moves.length) {
      stack.pop();
      if (stack.length > 0) stack[stack.length - 1].moveIdx++;
      continue;
    }

    const move = moves[frame.moveIdx];

    // Apply the move to get new state
    const newRows = [...frame.rows];
    newRows[sourceRowIdx] = move.newSource;
    newRows[targetRowIdx] = move.newTarget;

    if (frame.step === numSteps - 1) {
      return true;
    }

    // Update locked sets for the affected rows
    const newLockedSets = frame.lockedSets.map(s => new Set(s));
    newLockedSets[sourceRowIdx] = shiftLockedAfterRemoval(frame.lockedSets[sourceRowIdx], move.removePos);
    newLockedSets[targetRowIdx] = shiftLockedAfterInsertion(frame.lockedSets[targetRowIdx], move.insertPos);

    stack.push({
      rows: newRows,
      step: frame.step + 1,
      moveIdx: 0,
      lockedSets: newLockedSets,
    });
  }

  return false;
}

/**
 * Like isReverseSolvable, but returns the actual reverse solution steps
 * when a valid reverse path is found. Returns null if not solvable.
 *
 * The returned steps describe the reverse leg (bottom-to-top), where
 * stepIndex 0 = first reverse move from the bottom row upward, etc.
 * Each step's sourceWord/targetWord reflect the board state at that point
 * (post-forward-pass), so hints can match against the live board.
 */
export function solveReverse(
  words: string[],
  solution: PuzzleSolutionStep[]
): PuzzleSolutionStep[] | null {
  if (!solution || solution.length === 0 || words.length < 2) return null;

  const wordLength = words[0].length;
  const minDict = WORD_SETS[wordLength - 1];
  const baseDict = WORD_SETS[wordLength];
  const maxDict = WORD_SETS[wordLength + 1];

  if (!minDict || !baseDict || !maxDict) return null;

  // Work budget — same rationale as isReverseSolvable: cap the number of leaf
  // solver calls so one pathological chain can never allocation-storm the heap.
  // Exhaustion returns null; callers already treat a missing reverse solution
  // as "no hint path" (and the bank generators skip such puzzles).
  let leafBudget = 40000;

  // Recursively try all valid removal + insertion position combinations for each
  // forward step. When a reverse-solvable combination is found, capture and return
  // the reverse steps. Also tracks which positions were chosen so we can update the
  // forward solution steps — this ensures hints guide the player to the exact moves
  // that make the reverse path work.
  function tryForwardStepWithSolution(
    stepIdx: number,
    rowLetters: string[][],
    lockedSets: Set<number>[],
    forwardPositions: Array<{ removePos: number; insertPos: number }>
  ): PuzzleSolutionStep[] | null {
    if (leafBudget <= 0) return null;
    if (stepIdx >= solution.length) {
      // All forward steps done — solve reverse and capture steps
      leafBudget--;
      const postForwardRows = rowLetters.map(r => r.join(''));
      const reverseResult = solveReverseIterative(postForwardRows, minDict, baseDict, maxDict, wordLength, lockedSets);
      if (reverseResult !== null) {
        // Update the forward solution's positions to match the exact
        // removal + insertion that makes the reverse path work
        for (let i = 0; i < forwardPositions.length; i++) {
          solution[i].insertionPosition = forwardPositions[i].insertPos;
          solution[i].removalPosition = forwardPositions[i].removePos;
        }
      }
      return reverseResult;
    }

    const step = solution[stepIdx];
    const srcRow = rowLetters[step.stepIndex];
    const srcLocked = lockedSets[step.stepIndex];

    // Find ALL unlocked positions where the letter to move exists.
    const unlockedPositions: number[] = [];
    for (let i = 0; i < srcRow.length; i++) {
      if (srcRow[i] === step.letterToMove && !srcLocked.has(i)) {
        unlockedPositions.push(i);
      }
    }
    if (unlockedPositions.length === 0) return null;

    // Only validate remainder when there are duplicate occurrences (disambiguation needed).
    // For words like CHASES with two S's, removing position 3 vs 5 yields different
    // remaining words (CHAES vs CHASE). We must try all to find the right one.
    const validRemovePositions = unlockedPositions.length === 1
      ? unlockedPositions
      : unlockedPositions.filter(i => {
          const remainder = srcRow.slice(0, i).join('') + srcRow.slice(i + 1).join('');
          const removalDict = srcRow.length > wordLength ? baseDict : minDict;
          return removalDict.has(remainder);
        });
    if (validRemovePositions.length === 0) return null;

    // Try each valid removal position × each valid insertion position
    const tgtRow = rowLetters[step.stepIndex + 1];
    const tgtStr = tgtRow.join('');

    for (const letterIdx of validRemovePositions) {
      const shiftedSrcLocked = new Set<number>();
      for (const pos of srcLocked) {
        if (pos < letterIdx) shiftedSrcLocked.add(pos);
        else if (pos > letterIdx) shiftedSrcLocked.add(pos - 1);
      }

      const newSrcRow = [...srcRow];
      newSrcRow.splice(letterIdx, 1);

      for (let k = 0; k <= tgtRow.length; k++) {
        const combined = tgtStr.slice(0, k) + step.letterToMove + tgtStr.slice(k);
        if (!maxDict.has(combined)) continue;

        // Build new state with this removal + insertion combination
        const newRowLetters = rowLetters.map(r => [...r]);
        newRowLetters[step.stepIndex] = newSrcRow;
        const newTgtRow = [...tgtRow];
        newTgtRow.splice(k, 0, step.letterToMove);
        newRowLetters[step.stepIndex + 1] = newTgtRow;

        const newLockedSets = lockedSets.map(s => new Set(s));
        newLockedSets[step.stepIndex] = shiftedSrcLocked;
        newLockedSets[step.stepIndex + 1] = new Set(lockedSets[step.stepIndex + 1]);
        newLockedSets[step.stepIndex + 1].add(k);

        const result = tryForwardStepWithSolution(
          stepIdx + 1, newRowLetters, newLockedSets,
          [...forwardPositions, { removePos: letterIdx, insertPos: k }]
        );
        if (result !== null) {
          return result;
        }
      }
    }

    return null;
  }

  const initialRowLetters = words.map(w => w.split(''));
  const initialLockedSets: Set<number>[] = words.map(() => new Set<number>());

  return tryForwardStepWithSolution(0, initialRowLetters, initialLockedSets, []);
}

/**
 * Iterative DFS reverse solver that captures the solution path.
 * Returns the reverse solution steps (bottom-to-top) or null if not solvable.
 */
function solveReverseIterative(
  startRows: string[],
  minDict: Set<string>,
  baseDict: Set<string>,
  maxDict: Set<string>,
  wordLength: number,
  initialLockedSets: Set<number>[],
): PuzzleSolutionStep[] | null {
  const numSteps = startRows.length - 1;

  interface Frame {
    rows: string[];
    step: number;
    moveIdx: number;
    lockedSets: Set<number>[];
    /** The move that was applied to reach this frame (undefined for root). */
    appliedMove?: {
      letter: string;
      removePos: number;
      insertPos: number;
      sourceRowIdx: number;
      targetRowIdx: number;
      sourceWordBefore: string;
      targetWordBefore: string;
      newTarget: string;
    };
  }

  function getMoves(
    sourceWord: string,
    targetWord: string,
    step: number,
    sourceLockedSet: Set<number>
  ): Array<{ newSource: string; newTarget: string; insertPos: number; removePos: number; letter: string }> {
    const isLastStep = step === numSteps - 1;
    const moves: Array<{ newSource: string; newTarget: string; insertPos: number; removePos: number; letter: string }> = [];

    for (let i = 0; i < sourceWord.length; i++) {
      if (sourceLockedSet.has(i)) continue;

      const letter = sourceWord[i];
      const remainder = sourceWord.slice(0, i) + sourceWord.slice(i + 1);

      if (!baseDict.has(remainder)) continue;

      for (let j = 0; j <= targetWord.length; j++) {
        const combined = targetWord.slice(0, j) + letter + targetWord.slice(j);

        const isCombinedValid = isLastStep
          ? baseDict.has(combined)
          : maxDict.has(combined);
        if (!isCombinedValid) continue;

        moves.push({ newSource: remainder, newTarget: combined, insertPos: j, removePos: i, letter });
      }
    }
    return moves;
  }

  function shiftLockedAfterRemoval(locked: Set<number>, removePos: number): Set<number> {
    const shifted = new Set<number>();
    for (const pos of locked) {
      if (pos < removePos) shifted.add(pos);
      else if (pos > removePos) shifted.add(pos - 1);
    }
    return shifted;
  }

  function shiftLockedAfterInsertion(locked: Set<number>, insertPos: number): Set<number> {
    const shifted = new Set<number>();
    for (const pos of locked) {
      if (pos < insertPos) shifted.add(pos);
      else shifted.add(pos + 1);
    }
    shifted.add(insertPos);
    return shifted;
  }

  const stack: Frame[] = [{
    rows: [...startRows],
    step: 0,
    moveIdx: 0,
    lockedSets: initialLockedSets.map(s => new Set(s)),
  }];

  let iterations = 0;
  const MAX_ITERATIONS = numSteps >= 4 ? 100000 : 50000;

  while (stack.length > 0) {
    if (++iterations > MAX_ITERATIONS) return null;

    const frame = stack[stack.length - 1];
    const sourceRowIdx = startRows.length - 1 - frame.step;
    const targetRowIdx = sourceRowIdx - 1;

    const sourceWord = frame.rows[sourceRowIdx];
    const targetWord = frame.rows[targetRowIdx];

    const moves = getMoves(sourceWord, targetWord, frame.step, frame.lockedSets[sourceRowIdx]);

    if (frame.moveIdx >= moves.length) {
      stack.pop();
      if (stack.length > 0) stack[stack.length - 1].moveIdx++;
      continue;
    }

    const move = moves[frame.moveIdx];

    const newRows = [...frame.rows];
    newRows[sourceRowIdx] = move.newSource;
    newRows[targetRowIdx] = move.newTarget;

    if (frame.step === numSteps - 1) {
      // Solution found! Build the reverse solution steps from the stack.
      const reverseSteps: PuzzleSolutionStep[] = [];

      // Collect moves from stack frames (skip root which has no appliedMove)
      for (let i = 1; i < stack.length; i++) {
        const f = stack[i];
        if (f.appliedMove) {
          reverseSteps.push({
            stepIndex: f.step - 1,
            sourceWord: f.appliedMove.sourceWordBefore,
            targetWord: f.appliedMove.targetWordBefore,
            letterToMove: f.appliedMove.letter,
            explanation: `Move '${f.appliedMove.letter}' from ${f.appliedMove.sourceWordBefore} to form ${f.appliedMove.newTarget}.`,
            insertionPosition: f.appliedMove.insertPos,
          });
        }
      }

      // Add the final move (current frame's move, not yet pushed)
      reverseSteps.push({
        stepIndex: frame.step,
        sourceWord: sourceWord,
        targetWord: targetWord,
        letterToMove: move.letter,
        explanation: `Move '${move.letter}' from ${sourceWord} to form ${move.newTarget}.`,
        insertionPosition: move.insertPos,
      });

      return reverseSteps;
    }

    const newLockedSets = frame.lockedSets.map(s => new Set(s));
    newLockedSets[sourceRowIdx] = shiftLockedAfterRemoval(frame.lockedSets[sourceRowIdx], move.removePos);
    newLockedSets[targetRowIdx] = shiftLockedAfterInsertion(frame.lockedSets[targetRowIdx], move.insertPos);

    stack.push({
      rows: newRows,
      step: frame.step + 1,
      moveIdx: 0,
      lockedSets: newLockedSets,
      appliedMove: {
        letter: move.letter,
        removePos: move.removePos,
        insertPos: move.insertPos,
        sourceRowIdx,
        targetRowIdx,
        sourceWordBefore: sourceWord,
        targetWordBefore: targetWord,
        newTarget: move.newTarget,
      },
    });
  }

  return null;
}

/**
 * Count how many non-locked positions in a (W+1)-letter word can be removed
 * to form valid W-letter words. Higher = more reverse-move options available.
 * Used to bias forward DFS toward chains with high reverse-solvability potential.
 */
function getRemovalFlexibility(
  resultWord: string,
  lockedPosition: number,
  baseDict: Set<string>
): number {
  let flex = 0;
  for (let p = 0; p < resultWord.length; p++) {
    if (p === lockedPosition) continue; // This position will be locked
    const after = resultWord.slice(0, p) + resultWord.slice(p + 1);
    if (baseDict.has(after)) flex++;
  }
  return flex;
}

/**
 * Quick check: can the last reverse step (from row 1 back to row 0) succeed?
 * This is the cheapest partial reverse check — if this fails, the chain is
 * definitely not reverse-solvable. Used as an early pruning heuristic.
 *
 * Given the post-forward state of rows 0 and 1 plus the locked set for row 1,
 * checks if there exists at least one valid (pick from row1, insert into row0)
 * move where the picked position is not locked.
 */
function canReverseLastStep(
  row1Word: string,
  row0Word: string,
  row1Locked: Set<number>,
  baseDict: Set<string>
): boolean {
  for (let i = 0; i < row1Word.length; i++) {
    if (row1Locked.has(i)) continue;
    const letter = row1Word[i];
    const remainder = row1Word.slice(0, i) + row1Word.slice(i + 1);
    if (!baseDict.has(remainder)) continue;
    for (let j = 0; j <= row0Word.length; j++) {
      const combined = row0Word.slice(0, j) + letter + row0Word.slice(j);
      if (baseDict.has(combined)) return true;
    }
  }
  return false;
}

/**
 * Simulate the forward pass for a partial chain, computing the post-forward
 * row states and locked position sets. Returns null if the simulation fails
 * (invalid step), or { rows, lockedSets } on success.
 *
 * This runs tryForwardStep logic but non-recursively: it tries ALL valid
 * insertion positions at each step and returns the set of resulting states.
 * For pruning we only need to know if ANY combination has reverse potential.
 */
function simulateForwardStates(
  chain: PathNode[],
  wordLength: number
): Array<{ rows: string[]; lockedSets: Set<number>[] }> | null {
  const maxDict = WORD_SETS[wordLength + 1];
  if (!maxDict) return null;

  // Initial state: all original words, no locks
  const words = chain.map(n => n.word);
  let states: Array<{ rows: string[]; lockedSets: Set<number>[] }> = [{
    rows: [...words],
    lockedSets: words.map(() => new Set<number>()),
  }];

  for (let stepIdx = 0; stepIdx < chain.length - 1; stepIdx++) {
    const node = chain[stepIdx];
    if (!node.letterToGive) break; // Incomplete chain (current node has no move yet)

    const nextStates: Array<{ rows: string[]; lockedSets: Set<number>[] }> = [];
    for (const st of states) {
      const srcRow = st.rows[stepIdx].split('');
      const letterIdx = srcRow.indexOf(node.letterToGive);
      if (letterIdx === -1) continue;

      // Shift source locked positions after removal
      const shiftedSrcLocked = new Set<number>();
      for (const pos of st.lockedSets[stepIdx]) {
        if (pos < letterIdx) shiftedSrcLocked.add(pos);
        else if (pos > letterIdx) shiftedSrcLocked.add(pos - 1);
      }

      const newSrcRow = [...srcRow];
      newSrcRow.splice(letterIdx, 1);

      // Try each valid insertion position in the target row
      const tgtStr = st.rows[stepIdx + 1];
      for (let k = 0; k <= tgtStr.length; k++) {
        const combined = tgtStr.slice(0, k) + node.letterToGive + tgtStr.slice(k);
        if (!maxDict.has(combined)) continue;

        const newRows = [...st.rows];
        newRows[stepIdx] = newSrcRow.join('');
        newRows[stepIdx + 1] = combined;

        const newLockedSets = st.lockedSets.map(s => new Set(s));
        newLockedSets[stepIdx] = shiftedSrcLocked;
        const tgtLocked = new Set(st.lockedSets[stepIdx + 1]);
        // Shift existing locked positions after insertion
        const shiftedTgtLocked = new Set<number>();
        for (const pos of tgtLocked) {
          if (pos < k) shiftedTgtLocked.add(pos);
          else shiftedTgtLocked.add(pos + 1);
        }
        shiftedTgtLocked.add(k); // The inserted letter is locked
        newLockedSets[stepIdx + 1] = shiftedTgtLocked;

        nextStates.push({ rows: newRows, lockedSets: newLockedSets });
      }
    }

    if (nextStates.length === 0) return null;
    // Cap states to avoid explosion (keep a representative sample)
    states = nextStates.length > 50 ? nextStates.slice(0, 50) : nextStates;
  }

  return states;
}

/**
 * Incremental reverse feasibility check for a partial chain during forward DFS.
 * Returns true if at least one forward-state combination has some reverse potential.
 *
 * For chains of length 3+, simulates the forward pass to get post-forward states,
 * then checks if the last reverse step (row 1 → row 0) is feasible for at least
 * one forward-state combination. This catches chains that are definitely NOT
 * reverse-solvable early, avoiding wasted DFS exploration.
 */
function isPartialReverseViable(
  chain: PathNode[],
  wordLength: number,
  baseDict: Set<string>
): boolean {
  // Only worth checking when we have 3+ rows (at least 2 completed forward steps)
  if (chain.length < 3) return true;

  const states = simulateForwardStates(chain, wordLength);
  if (!states || states.length === 0) return false;

  // Check if at least one state can do the last reverse step (row 1 → row 0)
  for (const st of states) {
    const row1 = st.rows[1];
    const row0 = st.rows[0];
    const row1Locked = st.lockedSets[1];
    if (canReverseLastStep(row1, row0, row1Locked, baseDict)) {
      return true;
    }
  }

  return false;
}

/**
 * Recursive Depth-First Search with quality awareness.
 * Uses a pre-computed adjacency index for fast candidate lookup.
 * When relaxBoring is true (reverse mode), skips anti-boring penalties
 * and explores more candidates to maximize the chance of finding a
 * reverse-solvable chain.
 *
 * When requireReverse is true, two optimizations activate:
 * 1. Removal flexibility scoring: candidates whose (W+1)-letter intermediate
 *    state has more valid single-letter removals (excluding the locked position)
 *    are scored higher, biasing toward reverse-friendly chains.
 * 2. Incremental reverse pruning: at depth 3+, a partial reverse feasibility
 *    check prunes branches where the last reverse step is already impossible.
 */
async function findPath(
  chain: PathNode[],
  targetDepth: number,
  usedWords: Set<string>,
  dicts: { min: Set<string>, base: Set<string>, max: Set<string>, baseArray: string[] },
  timeoutLimit: number,
  state: GenState,
  previousMovePositions: number[],
  recencyMap?: Map<string, number>,
  relaxBoring?: boolean,
  requireReverse?: boolean
): Promise<PathNode[] | null> {
  const now = Date.now();
  if (now - state.startTime > timeoutLimit) {
    return null;
  }

  if (now - state.lastYieldTime > 15) {
    if (!SKIP_EVENT_LOOP_YIELDS) await new Promise(resolve => setTimeout(resolve, 0));
    state.lastYieldTime = Date.now();
  }

  const currentDepth = chain.length;

  if (currentDepth === targetDepth) {
    return chain;
  }

  const currentNode = chain[currentDepth - 1];
  const currentTempWord = currentNode.tempState!;

  // Find all valid letters we can remove, scored by quality
  const validMoves: {
    charToMove: string,
    charIndex: number,
    remainder: string,
    moveScore: number
  }[] = [];

  for (let j = 0; j < currentTempWord.length; j++) {
    const charToMove = currentTempWord[j];

    if (currentNode.letterReceived && charToMove === currentNode.letterReceived) continue;

    const remainder = currentTempWord.slice(0, j) + currentTempWord.slice(j + 1);
    const isValidRemainder = currentDepth === 1 ? dicts.min.has(remainder) : dicts.base.has(remainder);

    if (isValidRemainder) {
      if (usedWords.has(remainder)) continue;

      const normalizedPos = j === 0 ? 0 : j === currentTempWord.length - 1 ? 2 : 1;
      let moveScore = 50;

      if (!previousMovePositions.includes(normalizedPos)) {
        moveScore += 20;
      }

      // STRONG preference for middle positions
      if (normalizedPos === 1) {
        moveScore += 25;
      } else {
        moveScore -= 10; // Penalize edge positions
      }

      // Apply boring transform penalties at search time (skipped for reverse)
      if (!relaxBoring && charToMove === 'S' && j === currentTempWord.length - 1) {
        moveScore -= 40; // Heavy penalty for S at end
      }

      if (INTERESTING_LETTERS.has(charToMove)) {
        moveScore += 15;
      }

      validMoves.push({ charToMove, charIndex: j, remainder, moveScore });
    }
  }

  // Sort by move score (best first) with some randomness
  validMoves.sort((a, b) => (b.moveScore + Math.random() * 15) - (a.moveScore + Math.random() * 15));

  // Use the pre-computed adjacency index for instant candidate lookup
  // Base word length is always chain[0].word.length (the puzzle's word length)
  const baseWordLength = chain[0].word.length;
  const insertionIdx = getInsertionIndex(baseWordLength);

  for (const move of validMoves) {
    if (Date.now() - state.startTime > timeoutLimit) return null;

    const { charToMove, charIndex, remainder } = move;
    const normalizedSourcePos = charIndex === 0 ? 0 : charIndex === currentTempWord.length - 1 ? 2 : 1;

    const potentialNextWords: {
      word: string,
      tempState: string,
      insertionIndex: number,
      score: number
    }[] = [];

    // Look up all base words that can receive this letter via adjacency index
    const targets = insertionIdx.get(charToMove);
    if (targets) {
      for (const t of targets) {
        if (usedWords.has(t.baseWord)) continue;
        if (usedWords.has(t.result)) continue;

        // Skip words in hard cooldown for diversity
        if (recencyMap && isInHardCooldown(t.baseWord, recencyMap)) continue;

        // Include recency in word scoring
        const wordScore = scoreWordInterestingness(t.baseWord, t.baseWord.length, recencyMap);

        // Calculate insertion quality
        let insertionScore = 0;
        const normalizedTargetPos = t.position === 0 ? 0 : t.position === t.baseWord.length ? 2 : 1;

        // STRONG bonus for middle insertion
        if (normalizedTargetPos === 1) {
          insertionScore += 25;
        } else {
          insertionScore -= 15; // Penalize edge insertions
        }

        // Apply boring transform penalty (skipped for reverse mode)
        if (!relaxBoring) {
          const boringPenalty = getBoringTransformPenalty(
            currentTempWord, charIndex, charToMove, t.baseWord, t.position
          );
          insertionScore -= boringPenalty * 0.8;
        }

        // Reverse-aware scoring: prefer candidates whose intermediate state
        // has more valid single-letter removals (excluding the locked position).
        // This strongly biases toward chains with high reverse-solvability potential.
        let reverseFlexBonus = 0;
        if (requireReverse) {
          const flex = getRemovalFlexibility(t.result, t.position, dicts.base);
          // flex of 0-1 is dangerous (may block reverse), 2+ is good, 3+ is great
          reverseFlexBonus = flex * 20;
          // Heavily penalize candidates with 0 removal flexibility (dead end for reverse)
          if (flex === 0) reverseFlexBonus = -80;
        }

        potentialNextWords.push({
          word: t.baseWord,
          tempState: t.result,
          insertionIndex: t.position,
          score: wordScore + insertionScore + reverseFlexBonus + Math.random() * 25
        });
      }
    }

    potentialNextWords.sort((a, b) => b.score - a.score);
    // Reverse mode explores more candidates since the adjacency index makes
    // enumeration fast and we need to maximize reverse-solvable chain discovery
    const maxCandidates = relaxBoring ? 60 : 25;
    const candidatesToExplore = shuffle(potentialNextWords.slice(0, maxCandidates));

    for (const nextCandidate of candidatesToExplore) {
      if (Date.now() - state.startTime > timeoutLimit) return null;

      const updatedCurrentNode = {
        ...currentNode,
        letterToGive: charToMove,
        moveFromIndex: charIndex,
        moveToIndex: nextCandidate.insertionIndex
      };
      const newChain = [...chain.slice(0, -1), updatedCurrentNode];

      const nextNode: PathNode = {
        word: nextCandidate.word,
        tempState: nextCandidate.tempState,
        letterReceived: charToMove
      };

      // Incremental reverse pruning: at depth 3+, check if the partial chain
      // still has reverse potential before recursing deeper. This catches dead
      // branches early where locked positions already block the last reverse step.
      if (requireReverse && currentDepth >= 2) {
        const partialChain = [...newChain, nextNode];
        if (!isPartialReverseViable(partialChain, baseWordLength, dicts.base)) {
          continue; // Prune: this branch cannot produce a reverse-solvable chain
        }
      }

      const newUsed = new Set(usedWords);
      newUsed.add(remainder);
      newUsed.add(nextCandidate.word);
      newUsed.add(nextCandidate.tempState);

      const newMovePositions = [...previousMovePositions, normalizedSourcePos];

      const result = await findPath(
        [...newChain, nextNode],
        targetDepth,
        newUsed,
        dicts,
        timeoutLimit,
        state,
        newMovePositions,
        recencyMap,
        relaxBoring,
        requireReverse
      );

      if (result) return result;
    }
  }

  return null;
}

// ============================================================================
// DOUBLE SHIFT — Move 2 letters per step instead of 1
// ============================================================================

/**
 * Double Insertion Index: maps sorted letter pairs to valid transformations.
 *
 * For each (W+2)-letter word (i.e. 7-letter for W=5), enumerate all C(W+2, 2)
 * pairs of positions. If removing those 2 letters produces a valid W-letter word,
 * record the transformation keyed by the sorted letter pair.
 *
 * During generation, we look up which W-letter base words can receive a specific
 * pair of letters to form a valid (W+2)-letter word.
 */
interface DoubleInsertionTarget {
  /** The W-letter base word receiving the letters */
  baseWord: string;
  /** The (W+2)-letter word after both insertions */
  result: string;
  /**
   * Positions in the result word where the 2 letters sit.
   * These are the positions that, when removed from result, yield baseWord.
   */
  resultPositions: [number, number];
}

type DoubleInsertionIndex = Map<string, DoubleInsertionTarget[]>;

const doubleInsertionIndexCache = new Map<number, DoubleInsertionIndex>();

/** Normalize a letter pair to a canonical sorted key (e.g., "EL" not "LE"). */
function letterPairKey(a: string, b: string): string {
  return a <= b ? a + b : b + a;
}

/**
 * Build (or retrieve cached) the double insertion index for word length W.
 * Iterates all (W+2)-letter words and finds valid 2-letter removals.
 */
export function getDoubleInsertionIndex(wordLength: number): DoubleInsertionIndex {
  const cached = doubleInsertionIndexCache.get(wordLength);
  if (cached) return cached;

  const baseSet = WORD_SETS[wordLength];
  const maxSet = WORD_SETS[wordLength + 2];
  if (!baseSet || !maxSet) return new Map();

  const index: DoubleInsertionIndex = new Map();

  for (const resultWord of maxSet) {
    const len = resultWord.length;
    // Enumerate all pairs of positions to remove
    for (let i = 0; i < len - 1; i++) {
      for (let j = i + 1; j < len; j++) {
        // Remove positions j then i (j > i, so indices stay correct)
        const remainder = resultWord.slice(0, i) + resultWord.slice(i + 1, j) + resultWord.slice(j + 1);
        if (baseSet.has(remainder)) {
          const key = letterPairKey(resultWord[i], resultWord[j]);
          let targets = index.get(key);
          if (!targets) {
            targets = [];
            index.set(key, targets);
          }
          targets.push({
            baseWord: remainder,
            result: resultWord,
            resultPositions: [i, j],
          });
        }
      }
    }
  }

  doubleInsertionIndexCache.set(wordLength, index);
  return index;
}

/**
 * Find all valid 2-letter removals from a word.
 * Returns pairs where removing the 2 letters leaves a valid shorter word.
 */
function findDoubleRemovals(
  word: string,
  validSet: Set<string>,
  lockedPositions?: Set<number>
): Array<{
  letters: [string, string];
  positions: [number, number];
  remainder: string;
}> {
  const results: Array<{
    letters: [string, string];
    positions: [number, number];
    remainder: string;
  }> = [];

  const len = word.length;
  for (let i = 0; i < len - 1; i++) {
    // Skip locked positions (letters received from previous row)
    if (lockedPositions?.has(i)) continue;

    for (let j = i + 1; j < len; j++) {
      if (lockedPositions?.has(j)) continue;

      const remainder = word.slice(0, i) + word.slice(i + 1, j) + word.slice(j + 1);
      if (validSet.has(remainder)) {
        results.push({
          letters: [word[i], word[j]],
          positions: [i, j],
          remainder,
        });
      }
    }
  }

  return results;
}

interface DoubleShiftPathNode {
  /** The base W-letter word for this row */
  word: string;
  /**
   * Current state of this row:
   * - Row 0: same as word (W letters)
   * - Other rows: W+2 letters (word + 2 received letters)
   */
  tempState: string;
  /** The 2 letters received from the previous row */
  lettersReceived?: [string, string];
  /** Positions in tempState where received letters were inserted (locked) */
  receivedPositions?: [number, number];
  /** The 2 letters to give to the next row */
  lettersToGive?: [string, string];
  /** Removal positions in tempState for the 2 letters */
  moveFromPositions?: [number, number];
  /** Positions in the result word where the 2 letters sit */
  moveToPositions?: [number, number];
}

interface DoubleShiftGenState {
  startTime: number;
  lastYieldTime: number;
  iterations: number;
}

/**
 * DFS to build a double-shift chain.
 *
 * At each step, removes 2 letters from the current row's tempState and inserts
 * them into a candidate base word to form a valid (W+2)-letter word.
 *
 * Row 0 tempState is W letters, so removal produces a (W-2)-letter intermediate.
 * Rows 1+ tempState is (W+2) letters, so removal produces a W-letter intermediate.
 */
async function findDoubleShiftPath(
  chain: DoubleShiftPathNode[],
  targetDepth: number,
  usedWords: Set<string>,
  wordLength: number,
  dicts: { min2: Set<string>; base: Set<string>; max2: Set<string> },
  doubleIdx: DoubleInsertionIndex,
  timeoutLimit: number,
  state: DoubleShiftGenState,
  recencyMap?: Map<string, number>,
): Promise<DoubleShiftPathNode[] | null> {
  if (Date.now() - state.startTime > timeoutLimit) return null;

  state.iterations++;
  if (state.iterations % 500 === 0) {
    if (Date.now() - state.lastYieldTime > 15) {
      if (!SKIP_EVENT_LOOP_YIELDS) await new Promise(resolve => setTimeout(resolve, 0));
      state.lastYieldTime = Date.now();
    }
  }

  const currentDepth = chain.length;
  if (currentDepth === targetDepth) return chain;

  const currentNode = chain[currentDepth - 1];
  const currentTemp = currentNode.tempState;

  // Determine which set validates the remainder after removal
  const isStartRow = currentDepth === 1;
  const remainderSet = isStartRow ? dicts.min2 : dicts.base;

  // Find all valid 2-letter removals (excluding locked positions from received letters)
  const lockedPositions = currentNode.receivedPositions
    ? new Set(currentNode.receivedPositions)
    : undefined;
  const removals = findDoubleRemovals(currentTemp, remainderSet, lockedPositions);

  // Score and sort removals
  const scoredRemovals = removals.map(r => {
    let score = 50;
    // Prefer middle removals
    const mid = currentTemp.length / 2;
    const avgPos = (r.positions[0] + r.positions[1]) / 2;
    const midDist = Math.abs(avgPos - mid);
    score += (mid - midDist) * 5;
    // Prefer interesting letters
    if (INTERESTING_LETTERS.has(r.letters[0])) score += 10;
    if (INTERESTING_LETTERS.has(r.letters[1])) score += 10;
    // Penalize common boring patterns
    const lastPos = currentTemp.length - 1;
    if (r.letters[1] === 'S' && r.positions[1] === lastPos) score -= 30;
    if (r.letters[0] === 'S' && r.positions[0] === lastPos) score -= 30;
    // Strongly penalize adjacent removals — moving a letter pair as a block is less
    // interesting than splitting letters from different parts of the word.
    // The gap between removal positions is the primary quality signal for double shift.
    const posGap = r.positions[1] - r.positions[0];
    if (posGap === 1) score -= 50; // Adjacent: feels like moving a suffix chunk (ED, LY, ER)
    else if (posGap === 2) score += 8; // Moderate separation: decent
    else if (posGap >= 3) score += 25; // Well-separated: strategic, rewarding
    score += Math.random() * 15;
    return { ...r, score };
  });

  scoredRemovals.sort((a, b) => b.score - a.score);
  const maxRemovals = Math.min(scoredRemovals.length, 15);

  for (let ri = 0; ri < maxRemovals; ri++) {
    if (Date.now() - state.startTime > timeoutLimit) return null;

    const removal = scoredRemovals[ri];
    const key = letterPairKey(removal.letters[0], removal.letters[1]);
    const targets = doubleIdx.get(key);
    if (!targets) continue;

    // Score and filter insertion targets
    const candidates: Array<{
      baseWord: string;
      result: string;
      resultPositions: [number, number];
      score: number;
    }> = [];

    for (const t of targets) {
      if (usedWords.has(t.baseWord)) continue;
      if (usedWords.has(t.result)) continue;
      if (recencyMap && isInHardCooldown(t.baseWord, recencyMap)) continue;

      let score = scoreWordInterestingness(t.baseWord, t.baseWord.length, recencyMap);
      // Prefer middle insertion positions
      const mid = t.result.length / 2;
      const avgInsPos = (t.resultPositions[0] + t.resultPositions[1]) / 2;
      score += (mid - Math.abs(avgInsPos - mid)) * 3;
      // Strongly penalize adjacent insertion positions — letters landing as a block is less
      // interesting. Separated landings create a more strategic, satisfying puzzle feel.
      const insertGap = Math.abs(t.resultPositions[1] - t.resultPositions[0]);
      if (insertGap === 1) score -= 40; // Adjacent insertion: chunky, less strategic
      else if (insertGap === 2) score += 8; // Moderate separation: decent
      else if (insertGap >= 3) score += 20; // Well-separated: letters split across the word
      score += Math.random() * 15;
      candidates.push({ ...t, score });
    }

    candidates.sort((a, b) => b.score - a.score);
    const maxCandidates = Math.min(candidates.length, 20);
    const toExplore = shuffle(candidates.slice(0, maxCandidates));

    for (const cand of toExplore) {
      if (Date.now() - state.startTime > timeoutLimit) return null;

      const updatedCurrentNode: DoubleShiftPathNode = {
        ...currentNode,
        lettersToGive: removal.letters,
        moveFromPositions: removal.positions,
        moveToPositions: cand.resultPositions,
      };

      const nextNode: DoubleShiftPathNode = {
        word: cand.baseWord,
        tempState: cand.result,
        lettersReceived: removal.letters,
        receivedPositions: cand.resultPositions,
      };

      const newChain = [...chain.slice(0, -1), updatedCurrentNode, nextNode];
      const newUsed = new Set(usedWords);
      newUsed.add(removal.remainder);
      newUsed.add(cand.baseWord);
      newUsed.add(cand.result);

      const result = await findDoubleShiftPath(
        newChain,
        targetDepth,
        newUsed,
        wordLength,
        dicts,
        doubleIdx,
        timeoutLimit,
        state,
        recencyMap,
      );

      if (result) return result;
    }
  }

  return null;
}

/**
 * Score a double-shift puzzle chain (0-100).
 * Simplified scoring: word interestingness + semantic distance.
 */
function scoreDoubleShiftChain(chain: DoubleShiftPathNode[], recencyMap?: Map<string, number>): number {
  if (chain.length < 2) return 0;

  let totalScore = 0;

  // Word interestingness (40%)
  const wordScores = chain.map(node => scoreWordInterestingness(node.word, node.word.length, recencyMap));
  const avgWordScore = wordScores.reduce((a, b) => a + b, 0) / wordScores.length;
  totalScore += avgWordScore * 0.4;

  // Semantic distance start→end (30%)
  const semanticScore = calculateSemanticDistance(chain[0].word, chain[chain.length - 1].word);
  totalScore += semanticScore * 0.3;

  // Semantic journey (15%)
  const journeyScore = scoreSemanticJourney(chain as unknown as PathNode[]);
  totalScore += journeyScore * 0.15;

  // Dread word bonus (15%)
  let dreadScore = 0;
  for (const node of chain) {
    const tier = DREAD_WORD_TIER.get(node.word);
    if (tier) dreadScore += 15;
  }
  totalScore += Math.min(30, dreadScore) * 0.15;

  // Letter separation bonus (additive) — reward moves where the 2 shifted letters
  // come from / land in non-adjacent positions (more strategic, less suffix-chunky).
  // This is a major quality signal for double shift: puzzles where letters are plucked
  // from and placed into distinct parts of the word feel far more satisfying.
  let separationScore = 0;
  let totalMoves = 0;
  for (const node of chain) {
    if (node.moveFromPositions) {
      const removalGap = node.moveFromPositions[1] - node.moveFromPositions[0];
      if (removalGap >= 3) separationScore += 3;      // Well-separated: full bonus
      else if (removalGap === 2) separationScore += 1; // Moderate: partial credit
      // Adjacent (gap=1): no points
      totalMoves++;
    }
    if (node.moveToPositions) {
      const insertGap = Math.abs(node.moveToPositions[1] - node.moveToPositions[0]);
      if (insertGap >= 3) separationScore += 3;      // Well-separated: full bonus
      else if (insertGap === 2) separationScore += 1; // Moderate: partial credit
      // Adjacent (gap=1): no points
      totalMoves++;
    }
  }
  if (totalMoves > 0) {
    // Max possible: totalMoves * 3 points. Normalize to 0-1 and scale.
    const separationRate = separationScore / (totalMoves * 3);
    totalScore += separationRate * 20; // Up to +20 bonus for fully separated chains
  }

  return Math.round(Math.max(0, Math.min(110, totalScore)));
}

/**
 * Generate a double-shift puzzle.
 *
 * Double shift moves 2 letters per step instead of 1:
 * - All displayed words are W letters (W=5 for all difficulties)
 * - Each step: remove 2 letters from W-letter word → (W-2)-letter intermediate (must be valid)
 * - Insert those 2 letters into a (W-2)-letter base → W-letter result (forming a (W+2)-letter tempState in the target)
 *
 * Currently supports W=5 only (uses WORDS_3, WORDS_5, WORDS_7).
 * W=5 is the only viable word length: W-2=3 and W+2=7 must both exist
 * in the dictionary (which covers 3-7 letters).
 *
 * @param difficulty Controls row count: EASY=3, MEDIUM=4, MEDIUM_PLUS=5, HARD=6
 * @param overrides Optional word length and row count overrides
 * @returns PuzzleConfig with isDoubleShift=true
 */
export async function generateDoubleShiftPuzzle(
  difficulty: Difficulty = 'MEDIUM',
  overrides?: { wordLength?: number; targetRows?: number }
): Promise<PuzzleConfig> {
  const wordLength = overrides?.wordLength ?? 5;
  const targetRows = overrides?.targetRows ?? (
    difficulty === 'EASY' ? 3 :
    difficulty === 'MEDIUM' ? 4 :
    difficulty === 'MEDIUM_PLUS' ? 5 :
    6 // HARD
  );

  const recencyMap = await getWordHistoryWithRecency();

  try {
    currentDreadPhase = await getCurrentPhase();
  } catch {
    currentDreadPhase = 0;
  }

  const dicts = {
    min2: WORD_SETS[wordLength - 2],  // 3-letter words (remainder after removing 2 from row 0)
    base: WORD_SETS[wordLength],       // 5-letter words (all displayed words)
    max2: WORD_SETS[wordLength + 2],   // 7-letter words (tempState after inserting 2)
  };

  if (!dicts.min2 || !dicts.base || !dicts.max2) {
    throw new Error(`Double shift requires word sets for lengths ${wordLength - 2}, ${wordLength}, ${wordLength + 2}`);
  }

  const doubleIdx = getDoubleInsertionIndex(wordLength);
  const TIMEOUT = 5000; // 5 second timeout
  const CANDIDATES_TO_GENERATE = 3;
  const MIN_ACCEPTABLE_SCORE = 30;

  const state: DoubleShiftGenState = {
    startTime: Date.now(),
    lastYieldTime: Date.now(),
    iterations: 0,
  };

  const baseArray = shuffle(Array.from(dicts.base));
  const candidates = weightedShuffle(baseArray, wordLength, recencyMap);

  const generatedPuzzles: Array<{ chain: DoubleShiftPathNode[]; score: number }> = [];
  let candidateIndex = 0;

  while (
    generatedPuzzles.length < CANDIDATES_TO_GENERATE &&
    candidateIndex < candidates.length &&
    Date.now() - state.startTime < TIMEOUT
  ) {
    const w0 = candidates[candidateIndex];
    candidateIndex++;

    const path = await findDoubleShiftPath(
      [{ word: w0, tempState: w0 }],
      targetRows,
      new Set([w0]),
      wordLength,
      dicts,
      doubleIdx,
      TIMEOUT,
      state,
      recencyMap,
    );

    if (path) {
      const score = scoreDoubleShiftChain(path, recencyMap);
      if (score >= MIN_ACCEPTABLE_SCORE) {
        generatedPuzzles.push({ chain: path, score });
        if (score >= 60 && generatedPuzzles.length >= 2) break;
      }
    }
  }

  if (generatedPuzzles.length === 0) {
    throw new Error('Could not generate valid double-shift puzzle');
  }

  generatedPuzzles.sort((a, b) => b.score - a.score);
  const bestPuzzle = generatedPuzzles[0];
  const path = bestPuzzle.chain;

  const words = path.map(n => n.word);
  await recordPuzzleWords(words);

  // Build solution steps with both letters per step
  const solution: PuzzleSolutionStep[] = [];
  for (let s = 0; s < path.length - 1; s++) {
    const sourceNode = path[s];
    const targetNode = path[s + 1];
    const letters = sourceNode.lettersToGive!;

    solution.push({
      stepIndex: s,
      sourceWord: sourceNode.tempState,
      targetWord: targetNode.word,
      letterToMove: letters[0], // Primary for backward compat
      lettersToMove: letters,
      explanation: `Move '${letters[0]}' and '${letters[1]}' from ${sourceNode.tempState} to form ${targetNode.tempState}.`,
      insertionPosition: sourceNode.moveToPositions?.[0],
      insertionPositions: sourceNode.moveToPositions,
      removalPosition: sourceNode.moveFromPositions?.[0],
      removalPositions: sourceNode.moveFromPositions,
    });
  }

  return {
    words,
    hint: `Start by shifting '${solution[0].lettersToMove?.[0]}' and '${solution[0].lettersToMove?.[1]}'`,
    solution,
    wordLength,
    isDoubleShift: true,
  };
}

// ============================================================================
// RITUAL MECHANICS - Connecting puzzles to the narrative
// ============================================================================

/**
 * Calculate the "ritual energy" of a completed puzzle chain.
 * This is based on how many dread/ritual words appear in the chain.
 * Higher ritual energy means the puzzle contributes more to the summoning narrative.
 * Used to accelerate phase progression when the player naturally encounters dark words.
 *
 * @param words The completed word chain
 * @param phase Current narrative phase
 * @returns Ritual energy score (0-10, where 0 = mundane words, 10 = deeply ritual)
 */
export function calculateRitualEnergy(words: string[], phase: number): number {
  if (phase < 1) return 0; // No ritual energy at Phase 0

  let dreadCount = 0;
  for (const word of words) {
    if (DREAD_WORDS.has(word.toUpperCase())) {
      dreadCount++;
    }
  }

  // Scale: 0 dread words = 0 energy, all dread = 10
  const ratio = dreadCount / Math.max(words.length, 1);
  const baseEnergy = ratio * 8;

  // Phase multiplier: higher phases amplify ritual energy
  const phaseMultiplier = 1 + (phase * 0.25);

  return Math.min(10, Math.round(baseEnergy * phaseMultiplier * 10) / 10);
}

/**
 * Extract trigger words from a completed puzzle chain.
 * These are words that specific animals will react to when the player visits them.
 *
 * @param words The completed word chain (all words including intermediates)
 * @returns Array of notable trigger words found in the chain
 */
export function extractTriggerWords(words: string[]): string[] {
  const triggers: string[] = [];
  for (const word of words) {
    const upper = word.toUpperCase();
    if (DREAD_WORDS.has(upper) || FUN_WORDS.has(upper)) {
      triggers.push(upper);
    }
  }
  return triggers;
}

/**
 * Check if a word is in the dread words set.
 * Used for visual feedback during puzzles (dread pulse effect at Phase 2+).
 */
export function isDreadWord(word: string): boolean {
  return DREAD_WORDS.has(word.toUpperCase());
}

/**
 * Get the narrative phase tier a word belongs to.
 * Returns 0 if the word is not a dread word, 1-4 for its phase tier.
 * Used by UI components to determine visual resonance effects on tiles.
 *
 * Tier 1: Curiosity (THINK, DRIFT, WONDER)
 * Tier 2: Emptiness (VOID, EMPTY, FADE)
 * Tier 3: Dread (DOOM, DARK, GRAVE)
 * Tier 4: Cosmic horror (ABYSS, RIFT, PORTAL)
 */
export function getWordPhaseTier(word: string): number {
  return DREAD_WORD_TIER.get(word.toUpperCase()) ?? 0;
}

/**
 * Generate a name for a puzzle chain (incantation name).
 * Phase 2: innocent names. Phase 3: shadowy. Phase 4: ritual. Phase 5: serene.
 * Returns null at Phase 0-1.
 */
export function getIncantationName(words: string[], phase: number): string | null {
  if (phase < 2) return null;
  if (words.length === 0) return null;

  const firstWord = words[0].toUpperCase();
  const lastWord = words[words.length - 1].toUpperCase();

  // Capitalize first letter, lowercase rest for display
  const formatWord = (w: string) => w.charAt(0) + w.slice(1).toLowerCase();
  const first = formatWord(firstWord);
  const last = formatWord(lastWord);
  // a/an by the word's leading sound (vowel letter is a close-enough proxy here)
  const firstArticle = /^[AEIOU]/.test(firstWord) ? 'An' : 'A';

  // Phase 2 templates - innocent, playful naming
  const phase2Templates = [
    `The ${first} Dance`,
    `${firstArticle} ${first}'s Journey`,
    `${first} & ${last}`,
    `From ${first} to ${last}`,
    `The ${last} Waltz`,
  ];

  // Phase 3 templates - shadows and shifting
  const phase3Templates = [
    `The ${first}'s Shadow`,
    `${first} to ${last}`,
    `The Shifting of ${first}`,
    `${last} Emerges`,
    `From ${first}, ${last}`,
  ];

  // Phase 4 templates - ritual and offering
  const phase4Templates = [
    `Offering: ${first} to ${last}`,
    `The ${first} Speaks`,
    `Incantation of ${last}`,
    `${first} Descends to ${last}`,
    `The ${last} Opens`,
    `The ${first} Offering`,
  ];

  const phase5Templates = [
    `${first} settles into ${last}`,
    `The Weave of ${last}`,
    `${first} Becomes ${last}`,
    `The ${last} Abides`,
    `${first} Returns as ${last}`,
  ];

  const templates = phase >= 5 ? phase5Templates : phase >= 4 ? phase4Templates : phase >= 3 ? phase3Templates : phase2Templates;
  // Deterministic pick based on word content
  const hash = words.join('').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return templates[hash % templates.length];
}
