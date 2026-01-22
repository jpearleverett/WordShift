
import { WORDS_3, WORDS_4, WORDS_5, WORDS_6, COMMON_WORDS } from '../constants';
import { PuzzleConfig, PuzzleSolutionStep, Difficulty } from '../types';

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
// WORD INTERESTINGNESS SCORING
// ============================================================================

// Letters that make words more interesting (less common, more visually striking)
const INTERESTING_LETTERS = new Set(['Q', 'X', 'Z', 'J', 'K', 'V', 'W', 'Y']);
const VERY_COMMON_LETTERS = new Set(['E', 'T', 'A', 'O', 'I', 'N', 'S', 'R']);

// Boring words to avoid (very common filler words)
const BORING_WORDS = new Set([
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HAD',
  'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'HAS', 'HIS', 'HOW', 'ITS', 'MAY',
  'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'WHO', 'DID', 'GET', 'HAS', 'HIM',
  'HIS', 'HOW', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO',
  'BOY', 'DID', 'ITS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'DAD',
  'MOM', 'SIS', 'BRO', 'THAT', 'WITH', 'HAVE', 'THIS', 'WILL', 'YOUR',
  'FROM', 'THEY', 'BEEN', 'HAVE', 'MANY', 'SOME', 'THEM', 'THAN', 'INTO',
  'JUST', 'OVER', 'SUCH', 'MAKE', 'LIKE', 'BACK', 'ONLY', 'COME', 'MADE',
  'AFTER', 'THINK', 'THESE', 'WOULD', 'ABOUT', 'COULD', 'WHICH', 'THEIR',
  'THERE', 'BEING', 'OTHER'
]);

// Fun/evocative words to prefer
const FUN_WORDS = new Set([
  'GHOST', 'MAGIC', 'SPARK', 'BLAZE', 'STORM', 'FLAME', 'FROST', 'SWIFT',
  'BRAVE', 'QUEST', 'DREAM', 'CROWN', 'JEWEL', 'ROYAL', 'NIGHT', 'LIGHT',
  'SHINE', 'GLOW', 'FLASH', 'TRICK', 'CHARM', 'SPELL', 'WITCH', 'DEMON',
  'ANGEL', 'FAIRY', 'PIXIE', 'BEAST', 'DRAGON', 'TIGER', 'SHARK', 'EAGLE',
  'SNAKE', 'WOLF', 'LION', 'BEAR', 'HAWK', 'JAZZ', 'FUNK', 'ROCK', 'PUNK',
  'GOLD', 'SILVER', 'RUBY', 'PEARL', 'ONYX', 'JADE', 'OPAL', 'CRYSTAL',
  'BLADE', 'SWORD', 'ARROW', 'SPEAR', 'SHIELD', 'ARMOR', 'HELM', 'CAPE',
  'CLOAK', 'ROBE', 'WAND', 'STAFF', 'ORB', 'GEM', 'RUNE', 'GLYPH', 'SIGIL',
  'ZAP', 'ZIP', 'ZOOM', 'FIZZ', 'BUZZ', 'JAZZ', 'JINX', 'JOLT', 'JUMBO',
  'QUIRK', 'QUAKE', 'QUEST', 'QUICK', 'QUIET', 'QUILL', 'QUOTE', 'QUOTA'
]);

/**
 * Score how "interesting" a word is (0-100)
 * Higher = more interesting/fun to play with
 */
function scoreWordInterestingness(word: string, wordLength: number): number {
  let score = 50; // Base score

  // Penalize boring common words heavily
  if (BORING_WORDS.has(word)) {
    score -= 30;
  }

  // Bonus for fun/evocative words
  if (FUN_WORDS.has(word)) {
    score += 25;
  }

  // Score based on letter composition
  let interestingLetterCount = 0;
  let veryCommonLetterCount = 0;
  const uniqueLetters = new Set(word.split(''));

  for (const letter of word) {
    if (INTERESTING_LETTERS.has(letter)) interestingLetterCount++;
    if (VERY_COMMON_LETTERS.has(letter)) veryCommonLetterCount++;
  }

  // Bonus for interesting letters
  score += interestingLetterCount * 8;

  // Small penalty for too many common letters
  if (veryCommonLetterCount >= word.length - 1) {
    score -= 10;
  }

  // Bonus for letter variety (no repeated letters)
  if (uniqueLetters.size === word.length) {
    score += 5;
  }

  // Use word position in dictionary as proxy for rarity
  // Words later in dictionary (less common) get slight bonus
  const wordArray = WORD_ARRAYS[wordLength];
  if (wordArray) {
    const index = wordArray.indexOf(word);
    if (index > wordArray.length * 0.7) {
      score += 10; // Rarer word bonus
    } else if (index < wordArray.length * 0.1) {
      score -= 5; // Very common word penalty
    }
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// MOVE QUALITY SCORING
// ============================================================================

/**
 * Score the quality of a letter move (0-100)
 * Considers: position variety, avoiding boring transforms
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

  // === Position Variety ===
  // Normalize position to 0 (start), 1 (middle), 2 (end)
  const normalizedSourcePos = charIndex === 0 ? 0 :
                              charIndex === sourceWord.length - 1 ? 2 : 1;

  // Bonus if this position hasn't been used recently
  if (!previousMovePositions.includes(normalizedSourcePos)) {
    score += 15;
  }

  // Extra bonus for middle positions (more interesting)
  if (normalizedSourcePos === 1) {
    score += 10;
  }

  // === Avoid Boring Transformations ===

  // Penalize if just adding/removing 'S' at end (pluralization)
  if (char === 'S' && charIndex === sourceWord.length - 1) {
    score -= 20;
  }

  // Penalize if just adding common suffixes/prefixes
  if (charIndex === 0 && ['A', 'I'].includes(char)) {
    score -= 10; // Common prefix removal
  }

  // Bonus if the letter lands in the middle of the target (more transformative)
  const normalizedTargetPos = insertionIndex === 0 ? 0 :
                              insertionIndex === targetWord.length ? 2 : 1;
  if (normalizedTargetPos === 1) {
    score += 10;
  }

  // Bonus for "surprising" letter (less common)
  if (INTERESTING_LETTERS.has(char)) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// CHAIN/PUZZLE QUALITY SCORING
// ============================================================================

// Simple phonetic/visual similarity groups for semantic distance estimation
const SEMANTIC_CLUSTERS: Record<string, Set<string>> = {
  animals: new Set(['CAT', 'DOG', 'BAT', 'RAT', 'PIG', 'COW', 'HEN', 'ANT', 'BEE', 'OWL', 'FOX', 'ELK', 'EMU', 'APE', 'BEAR', 'BIRD', 'BOAR', 'BULL', 'CALF', 'CARP', 'CLAM', 'COLT', 'CRAB', 'CROW', 'DEER', 'DOVE', 'DUCK', 'FAWN', 'FISH', 'FLEA', 'FOAL', 'FROG', 'GOAT', 'GULL', 'HARE', 'HAWK', 'LAMB', 'LARK', 'LION', 'LYNX', 'MINK', 'MOLE', 'MOTH', 'MULE', 'NEWT', 'ORCA', 'PONY', 'PUMA', 'SEAL', 'SLUG', 'SWAN', 'TOAD', 'WASP', 'WOLF', 'WORM', 'ZEBRA', 'EAGLE', 'HORSE', 'MOUSE', 'OTTER', 'PANDA', 'SHARK', 'SHEEP', 'SKUNK', 'SLOTH', 'SNAIL', 'SNAKE', 'SQUID', 'STORK', 'TIGER', 'TROUT', 'WHALE', 'BISON']),

  food: new Set(['EAT', 'ATE', 'PIE', 'JAM', 'HAM', 'EGG', 'NUT', 'PEA', 'TEA', 'BAKE', 'BEAN', 'BEEF', 'BITE', 'BOWL', 'BREW', 'CAKE', 'CHEW', 'CHIP', 'CHOP', 'COOK', 'CORN', 'CRAB', 'DINE', 'DISH', 'FEED', 'FISH', 'FOOD', 'FORK', 'LIME', 'MEAL', 'MEAT', 'MENU', 'MILK', 'MINT', 'OATS', 'PEAR', 'PLUM', 'PORK', 'RICE', 'SALT', 'SOUP', 'TART', 'TOAST', 'APPLE', 'BACON', 'BREAD', 'CANDY', 'CREAM', 'FEAST', 'FRUIT', 'GRAPE', 'HONEY', 'JUICE', 'LEMON', 'LUNCH', 'OLIVE', 'ONION', 'PASTA', 'PEACH', 'PIZZA', 'SALAD', 'SAUCE', 'SPICE', 'STEAK', 'SUGAR', 'SWEET', 'SYRUP', 'TASTE', 'TREAT', 'WHEAT']),

  nature: new Set(['SUN', 'SKY', 'SEA', 'BAY', 'DEW', 'FOG', 'ICE', 'MUD', 'OAK', 'ASH', 'ELM', 'FIR', 'IVY', 'BARK', 'BIRD', 'BUSH', 'CAVE', 'CLAY', 'COAL', 'DAWN', 'DUNE', 'DUST', 'FARM', 'FERN', 'FIRE', 'GALE', 'GLEN', 'GOLD', 'GULF', 'HAIL', 'HEAT', 'HILL', 'LAKE', 'LAND', 'LEAF', 'MOON', 'MOSS', 'PALM', 'PEAK', 'PINE', 'POND', 'RAIN', 'REEF', 'ROCK', 'ROOT', 'ROSE', 'SAND', 'SEED', 'SNOW', 'SOIL', 'STAR', 'STEM', 'TIDE', 'TREE', 'VALE', 'VINE', 'WAVE', 'WEED', 'WIND', 'WOOD', 'BEACH', 'BLOOM', 'BROOK', 'CLIFF', 'CLOUD', 'COAST', 'CORAL', 'CREEK', 'EARTH', 'FIELD', 'FLAME', 'FLORA', 'FROST', 'GRASS', 'GROVE', 'MARSH', 'OCEAN', 'PLANT', 'RIVER', 'SHORE', 'STORM', 'SWAMP', 'THORN', 'WATER', 'WOODS']),

  body: new Set(['ARM', 'EAR', 'EYE', 'GUM', 'GUT', 'HIP', 'JAW', 'LEG', 'LIP', 'RIB', 'TOE', 'BACK', 'BODY', 'BONE', 'BROW', 'CHIN', 'FACE', 'FIST', 'FOOT', 'HAIR', 'HAND', 'HEAD', 'HEEL', 'KNEE', 'LIMB', 'LUNG', 'NAIL', 'NECK', 'NOSE', 'PALM', 'SHIN', 'SKIN', 'SKULL', 'SPINE', 'TEETH', 'THUMB', 'WAIST', 'WRIST', 'ANKLE', 'BRAIN', 'CHEEK', 'CHEST', 'ELBOW', 'HEART', 'MOUTH', 'NERVE', 'ORGAN', 'SPINE', 'THIGH', 'TOOTH', 'TRUNK']),

  colors: new Set(['RED', 'TAN', 'AQUA', 'BLUE', 'CYAN', 'GOLD', 'GRAY', 'GREY', 'JADE', 'LIME', 'NAVY', 'PINK', 'PLUM', 'ROSE', 'RUBY', 'RUST', 'TEAL', 'AMBER', 'BLACK', 'BLUSH', 'BROWN', 'CORAL', 'CREAM', 'GREEN', 'IVORY', 'LEMON', 'LILAC', 'MAUVE', 'OLIVE', 'PEACH', 'WHITE', 'YELLOW', 'ORANGE', 'PURPLE', 'SILVER', 'VIOLET']),

  home: new Set(['BED', 'CUP', 'JAR', 'JUG', 'KEY', 'LID', 'MAT', 'MOP', 'MUG', 'PAN', 'PIN', 'POT', 'RUG', 'TUB', 'URN', 'BATH', 'BELL', 'BOLT', 'BOWL', 'BULB', 'DESK', 'DOOR', 'FORK', 'GATE', 'HALL', 'HOME', 'HOOK', 'IRON', 'KNOB', 'LAMP', 'LOCK', 'NAIL', 'OVEN', 'PAIL', 'PIPE', 'PLUG', 'RACK', 'ROOF', 'ROOM', 'ROPE', 'SHELF', 'SINK', 'SOFA', 'TILE', 'VASE', 'WALL', 'YARD', 'BASIN', 'BENCH', 'BLIND', 'BROOM', 'BRUSH', 'CHAIR', 'CHEST', 'CLOCK', 'COUCH', 'CRATE', 'DRAPE', 'FENCE', 'FLAME', 'FLOOR', 'FRAME', 'GLASS', 'HOUSE', 'KNIFE', 'LATCH', 'LIGHT', 'LINEN', 'PIANO', 'PLATE', 'PORCH', 'SHEET', 'SPOON', 'STAIR', 'STOOL', 'STOVE', 'TABLE', 'TORCH', 'TOWEL', 'TRUNK'])
};

/**
 * Get semantic cluster for a word (or null if not in any cluster)
 */
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

  // Both in same cluster = low distance
  if (cluster1 && cluster1 === cluster2) {
    return 20;
  }

  // Both in different clusters = high distance (best!)
  if (cluster1 && cluster2 && cluster1 !== cluster2) {
    return 90;
  }

  // One or both not in clusters - use letter similarity as fallback
  const letters1 = new Set(word1.split(''));
  const letters2 = new Set(word2.split(''));
  const intersection = new Set([...letters1].filter(x => letters2.has(x)));
  const union = new Set([...letters1, ...letters2]);

  // Jaccard distance (inverse of similarity)
  const similarity = intersection.size / union.size;
  return Math.round((1 - similarity) * 70) + 15; // Scale to 15-85 range
}

/**
 * Score an entire puzzle chain (0-100)
 */
function scorePuzzleChain(chain: PathNode[]): number {
  if (chain.length < 2) return 0;

  let totalScore = 0;
  const movePositions: number[] = [];

  // Score individual words
  const wordScores = chain.map(node => {
    const len = node.word.length;
    return scoreWordInterestingness(node.word, len);
  });
  const avgWordScore = wordScores.reduce((a, b) => a + b, 0) / wordScores.length;
  totalScore += avgWordScore * 0.3; // 30% weight

  // Score moves
  let moveScoreSum = 0;
  let moveCount = 0;
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
      moveScoreSum += moveScore;
      moveCount++;

      // Track position for variety scoring
      const normalizedPos = node.moveFromIndex === 0 ? 0 :
                           node.moveFromIndex === node.word.length - 1 ? 2 : 1;
      movePositions.push(normalizedPos);
    }
  }
  if (moveCount > 0) {
    totalScore += (moveScoreSum / moveCount) * 0.3; // 30% weight
  }

  // Score semantic distance (start to end)
  const startWord = chain[0].word;
  const endWord = chain[chain.length - 1].word;
  const semanticScore = calculateSemanticDistance(startWord, endWord);
  totalScore += semanticScore * 0.25; // 25% weight

  // Bonus for position variety across the chain
  const uniquePositions = new Set(movePositions).size;
  const positionVarietyBonus = (uniquePositions / 3) * 15; // Up to 15 points
  totalScore += positionVarietyBonus; // 15% weight

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
 */
function weightedShuffle(words: string[], wordLength: number): string[] {
  const scored = words.map(word => ({
    word,
    score: scoreWordInterestingness(word, wordLength) + Math.random() * 30 // Add randomness
  }));

  // Sort by score descending, then take a mix
  scored.sort((a, b) => b.score - a.score);

  // Take top 60% by score, shuffle them for variety
  const topCount = Math.ceil(scored.length * 0.6);
  const topWords = shuffle(scored.slice(0, topCount).map(s => s.word));
  const restWords = shuffle(scored.slice(topCount).map(s => s.word));

  return [...topWords, ...restWords];
}

export const generateLocalPuzzle = async (difficulty: Difficulty = 'MEDIUM'): Promise<PuzzleConfig> => {
  // Config based on difficulty
  const targetRows = difficulty === 'EASY' ? 3 : difficulty === 'MEDIUM' ? 4 : 5;
  const wordLength = difficulty === 'HARD' ? 5 : 4;

  // Select dictionaries based on word length
  const dicts = {
    min: WORD_SETS[wordLength - 1],
    base: WORD_SETS[wordLength],
    max: WORD_SETS[wordLength + 1],
    baseArray: Array.from(WORD_SETS[wordLength])
  };

  const GLOBAL_TIMEOUT = 2500; // Reduced for mobile performance
  const CANDIDATES_TO_GENERATE = 2; // Fewer candidates on mobile for speed
  const generatedPuzzles: GeneratedPuzzle[] = [];

  const state: GenState = {
    startTime: Date.now(),
    lastYieldTime: Date.now()
  };

  // Use weighted shuffle for smarter starting word selection
  const candidatesW1 = weightedShuffle(dicts.baseArray, wordLength);
  const attemptsPerCandidate = 20;
  let candidateIndex = 0;

  // Generate multiple puzzle candidates
  while (generatedPuzzles.length < CANDIDATES_TO_GENERATE &&
         candidateIndex < candidatesW1.length &&
         Date.now() - state.startTime < GLOBAL_TIMEOUT) {

    const w1 = candidatesW1[candidateIndex];
    candidateIndex++;

    // Try to find a valid path starting from this word
    const path = await findPath(
      [{ word: w1, tempState: w1 }],
      targetRows,
      new Set([w1]),
      dicts,
      GLOBAL_TIMEOUT,
      state,
      [] // previous move positions
    );

    if (path) {
      const score = scorePuzzleChain(path);
      generatedPuzzles.push({ chain: path, score });

      // Early exit if we found a great puzzle
      if (score >= 75 && generatedPuzzles.length >= 2) {
        break;
      }
    }
  }

  // Pick the best puzzle
  if (generatedPuzzles.length === 0) {
    throw new Error("Could not generate valid puzzle locally");
  }

  generatedPuzzles.sort((a, b) => b.score - a.score);
  const bestPuzzle = generatedPuzzles[0];
  const path = bestPuzzle.chain;

  // Convert path to solution format
  const words = path.map(n => n.word);
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
 */
async function findPath(
  chain: PathNode[],
  targetDepth: number,
  usedWords: Set<string>,
  dicts: { min: Set<string>, base: Set<string>, max: Set<string>, baseArray: string[] },
  timeoutLimit: number,
  state: GenState,
  previousMovePositions: number[]
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

    // Constraint: Don't move the letter just received
    if (currentNode.letterReceived && charToMove === currentNode.letterReceived) continue;

    const remainder = currentTempWord.slice(0, j) + currentTempWord.slice(j + 1);
    const isValidRemainder = currentDepth === 1 ? dicts.min.has(remainder) : dicts.base.has(remainder);

    if (isValidRemainder) {
      if (usedWords.has(remainder)) continue;

      // Calculate base move score for prioritization
      const normalizedPos = j === 0 ? 0 : j === currentTempWord.length - 1 ? 2 : 1;
      let moveScore = 50;

      // Prefer positions not used before
      if (!previousMovePositions.includes(normalizedPos)) {
        moveScore += 20;
      }

      // Prefer middle positions
      if (normalizedPos === 1) {
        moveScore += 15;
      }

      // Penalize boring S removal at end
      if (charToMove === 'S' && j === currentTempWord.length - 1) {
        moveScore -= 25;
      }

      // Bonus for interesting letters
      if (INTERESTING_LETTERS.has(charToMove)) {
        moveScore += 10;
      }

      validMoves.push({ charToMove, charIndex: j, remainder, moveScore });
    }
  }

  // Sort by move score (best first) with some randomness
  validMoves.sort((a, b) => (b.moveScore + Math.random() * 20) - (a.moveScore + Math.random() * 20));

  // Try moves in quality order
  for (const move of validMoves) {
    if (Date.now() - state.startTime > timeoutLimit) return null;

    const { charToMove, charIndex, remainder } = move;
    const normalizedSourcePos = charIndex === 0 ? 0 : charIndex === currentTempWord.length - 1 ? 2 : 1;

    // Find candidate next words, scored by quality
    const potentialNextWords: {
      word: string,
      tempState: string,
      insertionIndex: number,
      score: number
    }[] = [];

    for (const w of dicts.baseArray) {
      if (usedWords.has(w)) continue;

      // Check insertion positions
      for (let k = 0; k <= w.length; k++) {
        const combined = w.slice(0, k) + charToMove + w.slice(k);
        if (dicts.max.has(combined) && !usedWords.has(combined)) {
          // Score this candidate
          const wordScore = scoreWordInterestingness(w, w.length);
          const normalizedTargetPos = k === 0 ? 0 : k === w.length ? 2 : 1;
          const insertionBonus = normalizedTargetPos === 1 ? 10 : 0;

          potentialNextWords.push({
            word: w,
            tempState: combined,
            insertionIndex: k,
            score: wordScore + insertionBonus + Math.random() * 15
          });
          break; // Only need one valid insertion per word
        }
      }
    }

    // Sort by score and take top candidates
    potentialNextWords.sort((a, b) => b.score - a.score);
    const candidatesToExplore = potentialNextWords.slice(0, 30);

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
        newMovePositions
      );

      if (result) return result;
    }
  }

  return null;
}
