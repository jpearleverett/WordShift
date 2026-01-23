
import { WORDS_3, WORDS_4, WORDS_5, WORDS_6, COMMON_WORDS } from '../constants';
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
};

// Word arrays for frequency-based scoring (index = relative commonness)
const WORD_ARRAYS: Record<number, string[]> = {
  3: WORDS_3,
  4: WORDS_4,
  5: WORDS_5,
  6: WORDS_6,
};

export const validateWord = (word: string): boolean => {
  return COMMON_WORDS.has(word.toUpperCase());
};

// ============================================================================
// ANTI-BORING PATTERNS - Block obvious/cheap transformations
// ============================================================================

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
    penalty += 60; // Was 20, now much stronger
  }

  // Penalize removing D from end (past tense -ED)
  if (char === 'D' && charIndex === sourceLen - 1 && sourceWord[sourceLen - 2] === 'E') {
    penalty += 50;
  }

  // Penalize removing R from end (comparative -ER)
  if (char === 'R' && charIndex === sourceLen - 1 && sourceWord[sourceLen - 2] === 'E') {
    penalty += 40;
  }

  // Penalize removing G from end when it's part of -ING
  if (char === 'G' && charIndex === sourceLen - 1 &&
      sourceLen >= 3 && sourceWord.slice(-3) === 'ING') {
    penalty += 45;
  }

  // Penalize removing N from end when followed by G (part of -ING removal sequence)
  if (char === 'N' && charIndex === sourceLen - 1 &&
      sourceLen >= 2 && sourceWord[sourceLen - 2] === 'I') {
    penalty += 35;
  }

  // Penalize removing Y from end (adverb -LY suffix)
  if (char === 'Y' && charIndex === sourceLen - 1 &&
      sourceLen >= 2 && sourceWord[sourceLen - 2] === 'L') {
    penalty += 40;
  }

  // Penalize removing from position 0 (prefix removal)
  if (charIndex === 0 && BORING_PREFIX_LETTERS.has(char)) {
    penalty += 25;
  }

  // === INSERTING INTO TARGET ===

  // HEAVILY penalize inserting S at end (making plural)
  if (char === 'S' && insertionIndex === targetLen) {
    penalty += 70; // This is the most boring move possible
  }

  // Penalize inserting at position 0 (adding prefix)
  if (insertionIndex === 0) {
    penalty += 20;
  }

  // Penalize inserting at end (adding suffix)
  if (insertionIndex === targetLen && BORING_SUFFIX_LETTERS.has(char)) {
    penalty += 35;
  }

  // Penalize inserting G at end to form -ING
  if (char === 'G' && insertionIndex === targetLen &&
      targetLen >= 2 && targetWord.slice(-2) === 'IN') {
    penalty += 50;
  }

  // Penalize inserting Y at end to form -LY (adverb)
  if (char === 'Y' && insertionIndex === targetLen &&
      targetLen >= 1 && targetWord[targetLen - 1] === 'L') {
    penalty += 45;
  }

  return penalty;
}

/**
 * Check if the transformation creates an anagram-like result (same letters rearranged)
 * This is boring because it doesn't feel like a real transformation
 */
function isAnagramLike(word1: string, word2: string): boolean {
  const sorted1 = word1.split('').sort().join('');
  const sorted2 = word2.split('').sort().join('');
  // If more than 80% of letters are shared, it's anagram-like
  const shared = [...sorted1].filter((c, i) => sorted2[i] === c).length;
  return shared >= Math.min(sorted1.length, sorted2.length) * 0.8;
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

// Existential dread words - gradually introduced at higher phases
const DREAD_WORDS = new Set([
  // Phase 1 - Curious/wondering
  'THINK', 'PONDER', 'WONDER', 'DOUBT', 'MAYBE', 'COULD', 'MIGHT', 'SEEM',
  'DRIFT', 'WANDER', 'LOST', 'SEEK', 'FIND', 'QUESTION', 'ASK', 'WHY',
  // Phase 2 - Questioning existence
  'VOID', 'EMPTY', 'HOLLOW', 'SHELL', 'FADE', 'WANE', 'DECAY', 'WILT',
  'ALONE', 'APART', 'DETACH', 'FLOAT', 'DRIFT', 'SINK', 'FALL', 'DROP',
  'TIME', 'PASS', 'FLEETING', 'BRIEF', 'SHORT', 'GONE', 'PAST', 'WAS',
  // Phase 3 - Existential dread
  'DREAD', 'FEAR', 'DARK', 'COLD', 'NUMB', 'BLANK', 'STILL', 'QUIET',
  'END', 'FINAL', 'LAST', 'CEASE', 'STOP', 'HALT', 'DONE', 'OVER',
  'DUST', 'ASH', 'SHADOW', 'SHADE', 'GHOST', 'ECHO', 'TRACE', 'REMAIN',
  'VAST', 'INFINITE', 'ETERNAL', 'FOREVER', 'NEVER', 'ALWAYS', 'ENDLESS',
  // Phase 4 - Complete crisis
  'DOOM', 'OBLIVION', 'ABYSS', 'CHASM', 'RIFT', 'TEAR', 'REND', 'BREAK',
  'NOTHING', 'ZERO', 'NULL', 'BLANK', 'VOID', 'ABSENCE', 'LACK', 'WANT',
  'TRUTH', 'REAL', 'FAKE', 'FALSE', 'LIE', 'MASK', 'VEIL', 'HIDE',
  'WAKE', 'SLEEP', 'DREAM', 'NIGHTMARE', 'VISION', 'ILLUSION', 'MIRAGE',
  'HORIZON', 'EDGE', 'BRINK', 'VERGE', 'THRESHOLD', 'GATE', 'DOOR', 'PORTAL'
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

  // Bonus for dread words based on current phase
  // Higher phases = stronger preference for existential words
  if (DREAD_WORDS.has(word) && currentDreadPhase > 0) {
    // Phase 1: +5, Phase 2: +15, Phase 3: +25, Phase 4: +40
    const dreadBonus = currentDreadPhase * currentDreadPhase * 2.5;
    score += dreadBonus;
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

  const topCount = Math.ceil(scored.length * 0.6);
  const topWords = shuffle(scored.slice(0, topCount).map(s => s.word));
  const restWords = shuffle(scored.slice(topCount).map(s => s.word));

  return [...topWords, ...restWords];
}

export const generateLocalPuzzle = async (difficulty: Difficulty = 'MEDIUM'): Promise<PuzzleConfig> => {
  const targetRows = difficulty === 'EASY' ? 3 : difficulty === 'MEDIUM' ? 4 : 5;
  const wordLength = difficulty === 'HARD' ? 5 : 4;

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
    baseArray: Array.from(WORD_SETS[wordLength])
  };

  const GLOBAL_TIMEOUT = 2500;
  const CANDIDATES_TO_GENERATE = 3; // Generate 3 candidates for better selection
  const MIN_ACCEPTABLE_SCORE = 45; // Reject puzzles below this threshold
  const generatedPuzzles: GeneratedPuzzle[] = [];

  const state: GenState = {
    startTime: Date.now(),
    lastYieldTime: Date.now()
  };

  // Weight and filter words based on history
  const candidatesW1 = weightedShuffle(dicts.baseArray, wordLength, recencyMap);
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
            score: wordScore + insertionScore + Math.random() * 10
          });
          break;
        }
      }
    }

    potentialNextWords.sort((a, b) => b.score - a.score);
    const candidatesToExplore = potentialNextWords.slice(0, 25);

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
