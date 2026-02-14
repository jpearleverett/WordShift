
import { WORDS_3, WORDS_4, WORDS_5, WORDS_6, WORDS_7, COMMON_WORDS } from '../constants';
import { PuzzleConfig, PuzzleSolutionStep, Difficulty } from '../types';
import {
  getWordHistoryWithRecency,
  calculateFreshnessPenalty,
  isInHardCooldown,
  recordPuzzleWords,
} from './wordHistory';
import { getCurrentPhase } from './amberCurrency';
import { DialoguePhase } from '../types/homeWorld';

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
  // Change
  'SHIFT', 'CHANGE', 'MORPH', 'ALTER', 'VARY', 'FLUX', 'FLOW', 'TURN',
  'GROW', 'SHRINK', 'EXPAND', 'CONTRACT', 'SWELL', 'PULSE', 'CYCLE',
]);

// PHASE 2 — Questioning Existence (impermanence & isolation)
const DREAD_WORDS_PHASE_2 = new Set([
  // Emptiness
  'VOID', 'EMPTY', 'HOLLOW', 'SHELL', 'HUSK', 'VACANT', 'BARREN', 'BARE',
  'BLANK', 'NULL', 'ZERO', 'NONE', 'LACK', 'WANT', 'NEED', 'MISS',
  // Decay
  'FADE', 'WANE', 'DECAY', 'WILT', 'ROT', 'RUST', 'ERODE', 'WEAR',
  'CRUMBLE', 'FLAKE', 'PEEL', 'CRACK', 'CHIP', 'BREAK', 'FRAY', 'TATTER',
  // Isolation
  'ALONE', 'APART', 'DETACH', 'SPLIT', 'SEVER', 'CUT', 'DIVIDE', 'PART',
  'LONE', 'SOLO', 'SINGLE', 'ONLY', 'SOLE', 'MERE', 'REMOTE', 'DISTANT',
  // Movement/Falling
  'FLOAT', 'SINK', 'FALL', 'DROP', 'PLUNGE', 'DIVE', 'TUMBLE', 'SLIDE',
  'SLIP', 'TRIP', 'STUMBLE', 'TOPPLE', 'CRASH', 'LAND', 'SETTLE', 'REST',
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
  // Darkness & Cold
  'DARK', 'COLD', 'CHILL', 'FROST', 'ICE', 'FREEZE', 'FRIGID', 'COOL',
  'BLACK', 'NIGHT', 'SHADE', 'SHADOW', 'GLOOM', 'MURKY', 'DIM', 'FAINT',
  // Stillness & Silence
  'NUMB', 'STILL', 'QUIET', 'HUSH', 'MUTE', 'SILENT', 'CALM', 'PEACE',
  'STATIC', 'FROZEN', 'FIXED', 'STUCK', 'HALT', 'STOP', 'PAUSE', 'WAIT',
  // Endings
  'END', 'FINAL', 'LAST', 'CEASE', 'DONE', 'OVER', 'FINISH', 'CLOSE',
  'COMPLETE', 'CONCLUDE', 'TERMINATE', 'EXPIRE', 'LAPSE', 'ELAPSE',
  // Death imagery
  'DUST', 'ASH', 'GHOST', 'HAUNT', 'SPIRIT', 'SOUL', 'WRAITH',
  'GRAVE', 'TOMB', 'CRYPT', 'BURIAL', 'MOURN', 'GRIEVE', 'WEEP', 'SOB',
  'BONE', 'SKULL', 'CORPSE', 'REMAINS', 'RELIC', 'FOSSIL', 'MARK',
  // Remnants
  'ECHO', 'REMAIN', 'LINGER', 'PERSIST', 'ENDURE', 'SURVIVE', 'OUTLAST',
  'MEMORY', 'RECALL', 'RECORD', 'ARCHIVE', 'LEGACY', 'HEIR',
  // Vastness
  'VAST', 'HUGE', 'IMMENSE', 'MASSIVE', 'ENDLESS', 'BOUNDLESS', 'INFINITE',
  'ETERNAL', 'FOREVER', 'NEVER', 'ALWAYS', 'CONSTANT', 'PERPETUAL',
]);

// PHASE 4 — Complete Crisis (cosmic horror & finality)
const DREAD_WORDS_PHASE_4 = new Set([
  // Destruction
  'DOOM', 'RUIN', 'RAVAGE', 'WRECK', 'DESTROY', 'ANNIHILATE', 'OBLITERATE',
  'ABYSS', 'CHASM', 'RIFT', 'TEAR', 'REND', 'SHATTER', 'SMASH', 'CRUSH',
  'COLLAPSE', 'IMPLODE', 'EXPLODE', 'BURST', 'RUPTURE', 'FRACTURE',
  // Nothingness
  'NOTHING', 'OBLIVION', 'ABSENCE', 'VACUUM',
  'FORMLESS', 'SHAPELESS', 'NAMELESS', 'FACELESS', 'UNKNOWN', 'UNSEEN',
  // Truth & Illusion
  'TRUTH', 'REAL', 'FAKE', 'FALSE', 'LIE', 'MASK', 'VEIL', 'HIDE',
  'DECEIVE', 'TRICK', 'FOOL', 'SHAM', 'FRAUD', 'HOAX', 'RUSE', 'GUISE',
  // Dreams & Unreality
  'WAKE', 'SLEEP', 'DREAM', 'VISION', 'MIRAGE', 'PHANTOM', 'SPECTER',
  'DELUSION', 'FANCY', 'WHIM', 'FIGMENT', 'FANTASY', 'REVERIE',
  // Boundaries & Thresholds
  'HORIZON', 'EDGE', 'BRINK', 'VERGE', 'BORDER', 'MARGIN', 'RIM', 'FRINGE',
  'LIMIT', 'BOUND', 'EXTENT', 'REACH', 'SCOPE', 'RANGE',
  'GATE', 'DOOR', 'PORTAL', 'PASSAGE', 'THRESHOLD', 'ENTRY', 'EXIT',
  // Cosmic/Existential
  'COSMOS', 'SPACE', 'STAR', 'MOON', 'SUN', 'PLANET', 'ORBIT', 'SPHERE',
  'TIMELESS', 'AGELESS', 'DEATHLESS', 'UNDYING',
  'MORTAL', 'FINITE', 'FLEETING', 'TRANSIENT', 'MOMENTARY',
  // Transformation
  'BECOME', 'TRANSFORM', 'TRANSMUTE', 'CONVERT', 'EVOLVE',
  'DISSOLVE', 'MELT', 'VANISH', 'DISAPPEAR', 'EVAPORATE', 'DISPERSE',
  // Final words
  'FAREWELL', 'GOODBYE', 'ADIEU', 'PARTING', 'LEAVE', 'DEPART', 'GO',
  'ACCEPT', 'SUBMIT', 'YIELD', 'SURRENDER', 'RELEASE', 'LET', 'ALLOW',
  'SLUMBER', 'REPOSE',
]);

// Build tier lookup map — each word gets its earliest (lowest) tier.
// This determines when a word first becomes narratively relevant.
const DREAD_WORD_TIER = new Map<string, number>();
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

  // Use word position in dictionary as proxy for rarity
  const wordArray = WORD_ARRAYS[wordLength];
  if (wordArray) {
    const index = wordArray.indexOf(word);
    if (index > wordArray.length * 0.7) {
      score += 12; // Rarer word bonus
    } else if (index < wordArray.length * 0.1) {
      score -= 8; // Very common word penalty
    }
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
  previousMovePositions: number[]
): number {
  let score = 50;
  const char = sourceWord[charIndex];

  // === Anti-Boring Penalty ===
  const boringPenalty = getBoringTransformPenalty(
    sourceWord, charIndex, char, targetWord, insertionIndex
  );
  score -= boringPenalty;

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

function getSemanticCluster(word: string): string | null {
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
function scorePuzzleChain(chain: PathNode[], recencyMap?: Map<string, number>): number {
  if (chain.length < 2) return 0;

  let totalScore = 0;
  const movePositions: number[] = [];

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
      const moveScore = scoreMoveQuality(
        node.word,
        node.moveFromIndex,
        nextNode.word,
        node.moveToIndex || 0,
        movePositions
      );

      // Track if any move is very boring
      if (moveScore < 20) hasBoringMove = true;

      moveScoreSum += moveScore;
      moveCount++;

      const normalizedPos = node.moveFromIndex === 0 ? 0 :
                           node.moveFromIndex === node.word.length - 1 ? 2 : 1;
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

interface PathNode {
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

export const generateLocalPuzzle = async (
  difficulty: Difficulty = 'MEDIUM',
  overrides?: { wordLength?: number; targetRows?: number; startWord?: string }
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

  const GLOBAL_TIMEOUT = 2500;
  const CANDIDATES_TO_GENERATE = forcedStartWord ? 1 : 3; // Forced starts prioritize continuity over variety
  const MIN_ACCEPTABLE_SCORE = forcedStartWord ? 0 : 45; // Chain continuity should accept any valid path
  const generatedPuzzles: GeneratedPuzzle[] = [];

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
      recencyMap
    );

    if (path) {
      const score = scorePuzzleChain(path, recencyMap);

      // Only accept puzzles above minimum threshold
      if (score >= MIN_ACCEPTABLE_SCORE) {
        generatedPuzzles.push({ chain: path, score });

        // Early exit if we found a great puzzle
        if (score >= 70 && generatedPuzzles.length >= 2) {
          break;
        }
      }
    }
  }

  if (generatedPuzzles.length === 0) {
    throw new Error("Could not generate valid puzzle locally");
  }

  generatedPuzzles.sort((a, b) => b.score - a.score);
  const bestPuzzle = generatedPuzzles[0];
  const path = bestPuzzle.chain;

  const words = path.map(n => n.word);

  // Record these words in history for future diversity
  await recordPuzzleWords(words);

  const solution: PuzzleSolutionStep[] = [];

  for (let s = 0; s < path.length - 1; s++) {
    const sourceNode = path[s];
    const targetNode = path[s + 1];

    solution.push({
      stepIndex: s,
      sourceWord: sourceNode.word,
      targetWord: targetNode.word,
      letterToMove: sourceNode.letterToGive!,
      explanation: `Move '${sourceNode.letterToGive}' from ${sourceNode.word} to form ${targetNode.word}.`
    });
  }

  return {
    words,
    hint: `Start by shifting '${solution[0].letterToMove}'`,
    solution,
    wordLength
  };
};

/**
 * Recursive Depth-First Search with quality awareness
 * Now considers word history for diversity
 */
async function findPath(
  chain: PathNode[],
  targetDepth: number,
  usedWords: Set<string>,
  dicts: { min: Set<string>, base: Set<string>, max: Set<string>, baseArray: string[] },
  timeoutLimit: number,
  state: GenState,
  previousMovePositions: number[],
  recencyMap?: Map<string, number>
): Promise<PathNode[] | null> {
  const now = Date.now();
  if (now - state.startTime > timeoutLimit) {
    return null;
  }

  if (now - state.lastYieldTime > 15) {
    await new Promise(resolve => setTimeout(resolve, 0));
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

      // Apply boring transform penalties at search time
      if (charToMove === 'S' && j === currentTempWord.length - 1) {
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

    for (const w of dicts.baseArray) {
      if (usedWords.has(w)) continue;

      // Skip words in hard cooldown for diversity
      if (recencyMap && isInHardCooldown(w, recencyMap)) continue;

      for (let k = 0; k <= w.length; k++) {
        const combined = w.slice(0, k) + charToMove + w.slice(k);
        if (dicts.max.has(combined) && !usedWords.has(combined)) {
          // Include recency in word scoring
          const wordScore = scoreWordInterestingness(w, w.length, recencyMap);

          // Calculate insertion quality
          let insertionScore = 0;
          const normalizedTargetPos = k === 0 ? 0 : k === w.length ? 2 : 1;

          // STRONG bonus for middle insertion
          if (normalizedTargetPos === 1) {
            insertionScore += 25;
          } else {
            insertionScore -= 15; // Penalize edge insertions
          }

          // Apply boring transform penalty (strong weight during search)
          const boringPenalty = getBoringTransformPenalty(
            currentTempWord, charIndex, charToMove, w, k
          );
          insertionScore -= boringPenalty * 0.8;

          potentialNextWords.push({
            word: w,
            tempState: combined,
            insertionIndex: k,
            score: wordScore + insertionScore + Math.random() * 25
          });
        }
      }
    }

    potentialNextWords.sort((a, b) => b.score - a.score);
    const candidatesToExplore = shuffle(potentialNextWords.slice(0, 25));

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
        recencyMap
      );

      if (result) return result;
    }
  }

  return null;
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
 * Phase 2: innocent names. Phase 3: shadowy. Phase 4: ritual.
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

  // Phase 2 templates - innocent, playful naming
  const phase2Templates = [
    `The ${first} Dance`,
    `A ${first}'s Journey`,
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

  const templates = phase >= 4 ? phase4Templates : phase >= 3 ? phase3Templates : phase2Templates;
  // Deterministic pick based on word content
  const hash = words.join('').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return templates[hash % templates.length];
}
