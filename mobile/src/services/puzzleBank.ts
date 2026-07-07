import AsyncStorage from '@react-native-async-storage/async-storage';
import { PuzzleConfig, Difficulty } from '../types';
import type { PreGeneratedPuzzle } from '../data/puzzleBankTypes';
import { DialoguePhase } from '../types/homeWorld';
import { isInHardCooldown } from './wordHistory';
import { PuzzleVariant } from './puzzleVariety';
// Bank novelty/recency tuning lives in the central balance file (single source).
import {
  MAX_USED_TRACKED,
  BANK_RECENT_THRESHOLD,
  BANK_MEDIUM_THRESHOLD,
  BANK_RECENT_PENALTY,
  BANK_MEDIUM_PENALTY,
  BANK_NOVEL_BONUS_FULL,
  BANK_NOVEL_BONUS_MOST,
  BANK_NOVEL_BONUS_SOME,
} from '../constants/gameBalance';

// ---------------------------------------------------------------------------
// Bank Registry — single source of truth for all 12 puzzle banks
//
// Bank data is lazily loaded via require() thunks so the ~5.7MB of
// pre-generated puzzles is parsed only when a bank is first used,
// not at app startup. require() is synchronous in Metro/Node, so
// existing synchronous call paths keep working.
// ---------------------------------------------------------------------------

interface BankRegistryEntry {
  storageKey: string;
  loadBank: () => PreGeneratedPuzzle[];
  bankData: PreGeneratedPuzzle[] | null;
  cache: string[] | null;
  idToWords: Map<string, string[]> | null;
}

const BANK_REGISTRY: Record<string, BankRegistryEntry> = {
  standard:       { storageKey: 'wordshift_played_puzzle_ids',              loadBank: () => require('../data/puzzleBankHard').PUZZLE_BANK_HARD,                              bankData: null, cache: null, idToWords: null },
  std_easy:       { storageKey: 'wordshift_played_std_easy_puzzle_ids',     loadBank: () => require('../data/puzzleBankEasy').PUZZLE_BANK_EASY,                              bankData: null, cache: null, idToWords: null },
  std_medium:     { storageKey: 'wordshift_played_std_medium_puzzle_ids',   loadBank: () => require('../data/puzzleBankMedium').PUZZLE_BANK_MEDIUM,                          bankData: null, cache: null, idToWords: null },
  std_mp:         { storageKey: 'wordshift_played_std_mp_puzzle_ids',       loadBank: () => require('../data/puzzleBankMediumPlus').PUZZLE_BANK_MEDIUM_PLUS,                 bankData: null, cache: null, idToWords: null },
  reverse:        { storageKey: 'wordshift_played_reverse_puzzle_ids',      loadBank: () => require('../data/puzzleBankReverseHard').PUZZLE_BANK_REVERSE_HARD,               bankData: null, cache: null, idToWords: null },
  reverse_easy:   { storageKey: 'wordshift_played_reverse_easy_puzzle_ids', loadBank: () => require('../data/puzzleBankReverseEasy').PUZZLE_BANK_REVERSE_EASY,               bankData: null, cache: null, idToWords: null },
  reverse_medium: { storageKey: 'wordshift_played_reverse_medium_puzzle_ids', loadBank: () => require('../data/puzzleBankReverseMedium').PUZZLE_BANK_REVERSE_MEDIUM,         bankData: null, cache: null, idToWords: null },
  reverse_mp:     { storageKey: 'wordshift_played_reverse_mp_puzzle_ids',   loadBank: () => require('../data/puzzleBankReverseMediumPlus').PUZZLE_BANK_REVERSE_MEDIUM_PLUS,  bankData: null, cache: null, idToWords: null },
  ds_easy:        { storageKey: 'wordshift_played_ds_easy_puzzle_ids',      loadBank: () => require('../data/puzzleBankDoubleShiftEasy').PUZZLE_BANK_DOUBLE_SHIFT_EASY,      bankData: null, cache: null, idToWords: null },
  ds_medium:      { storageKey: 'wordshift_played_ds_medium_puzzle_ids',    loadBank: () => require('../data/puzzleBankDoubleShiftMedium').PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM,  bankData: null, cache: null, idToWords: null },
  ds_mp:          { storageKey: 'wordshift_played_ds_mp_puzzle_ids',        loadBank: () => require('../data/puzzleBankDoubleShiftMediumPlus').PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM_PLUS, bankData: null, cache: null, idToWords: null },
  ds_hard:        { storageKey: 'wordshift_played_ds_hard_puzzle_ids',      loadBank: () => require('../data/puzzleBankDoubleShiftHard').PUZZLE_BANK_DOUBLE_SHIFT_HARD,      bankData: null, cache: null, idToWords: null },
};

/**
 * Get the puzzle data for a bank, loading it on first access.
 */
function getBank(bankKey: string): PreGeneratedPuzzle[] {
  const entry = BANK_REGISTRY[bankKey] ?? BANK_REGISTRY['standard'];
  if (!entry.bankData) {
    entry.bankData = entry.loadBank();
  }
  return entry.bankData;
}

// Per-bank word frequency — the generator's adjacency bias makes "hub" words
// (MATER, CATER, LATER...) appear in dozens of puzzles per bank. Selection
// penalizes them so the long tail of vocabulary actually surfaces.
const bankWordFrequency = new Map<string, Map<string, number>>();

function getBankWordFrequency(bankKey: string): Map<string, number> {
  let freq = bankWordFrequency.get(bankKey);
  if (!freq) {
    freq = new Map();
    for (const puzzle of getBank(bankKey)) {
      for (const word of puzzle.allWords) {
        freq.set(word, (freq.get(word) ?? 0) + 1);
      }
    }
    bankWordFrequency.set(bankKey, freq);
  }
  return freq;
}

/**
 * Derive a "bank key" from difficulty + variant to route to the correct
 * storage, cache, and bank data. Returns a discriminator string.
 */
function getBankKey(difficulty: Difficulty, variant: PuzzleVariant): string {
  // Double shift variants — each difficulty has its own bank (3/4/5/6 rows, all 5-letter words)
  if (variant === 'double_shift') {
    if (difficulty === 'EASY') return 'ds_easy';
    if (difficulty === 'MEDIUM') return 'ds_medium';
    if (difficulty === 'MEDIUM_PLUS') return 'ds_mp';
    return 'ds_hard';
  }
  if (difficulty === 'EASY' && variant === 'reverse') {
    return 'reverse_easy';
  }
  if (difficulty === 'MEDIUM' && variant === 'reverse') {
    return 'reverse_medium';
  }
  if (difficulty === 'MEDIUM_PLUS' && variant === 'reverse') {
    return 'reverse_mp';
  }
  if (variant === 'reverse') {
    return 'reverse';
  }
  // Standard variant — route by difficulty
  if (difficulty === 'EASY') return 'std_easy';
  if (difficulty === 'MEDIUM') return 'std_medium';
  if (difficulty === 'MEDIUM_PLUS') return 'std_mp';
  return 'standard';
}

/**
 * Determine the storage key and cache for a given bank key.
 */
function getStorageConfig(bankKey: string): {
  key: string;
  getCache: () => string[] | null;
  setCache: (val: string[] | null) => void;
} {
  const entry = BANK_REGISTRY[bankKey] ?? BANK_REGISTRY['standard'];
  return {
    key: entry.storageKey,
    getCache: () => entry.cache,
    setCache: (val) => { entry.cache = val; },
  };
}

/**
 * Get or build the ID→allWords lookup map for a bank.
 * Built lazily from bank data on first access.
 */
function getIdToWordsMap(bankKey: string): Map<string, string[]> {
  const entry = BANK_REGISTRY[bankKey] ?? BANK_REGISTRY['standard'];
  if (!entry.idToWords) {
    entry.idToWords = new Map();
    for (const p of getBank(bankKey)) {
      entry.idToWords.set(p.id, p.allWords);
    }
  }
  return entry.idToWords;
}

/**
 * Derive a word→bankPuzzlesAgo recency map from the played puzzle ID history.
 * This gives the bank selection a much longer memory than the general word
 * history (which only tracks the last 15 puzzles in hard cooldown). Each word
 * maps to how many bank selections ago it was last seen (0 = most recent).
 * Words not in the map have never appeared in a played bank puzzle.
 */
function deriveBankWordRecency(
  usedIds: string[],
  bankKey: string
): Map<string, number> {
  const idToWords = getIdToWordsMap(bankKey);
  const recency = new Map<string, number>();

  for (let i = 0; i < usedIds.length; i++) {
    const words = idToWords.get(usedIds[i]);
    if (!words) continue;
    for (const w of words) {
      // Only track the most recent (lowest index) occurrence
      if (!recency.has(w)) {
        recency.set(w, i);
      }
    }
  }

  return recency;
}

/**
 * Load played puzzle IDs from storage into cache.
 */
async function loadUsedPuzzles(bankKey: string = 'standard'): Promise<string[]> {
  const config = getStorageConfig(bankKey);
  const cached = config.getCache();
  if (cached !== null) return cached;
  try {
    const stored = await AsyncStorage.getItem(config.key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Corrupted storage must not poison the played-puzzle tracking
      if (Array.isArray(parsed)) {
        config.setCache(parsed);
        return parsed;
      }
    }
  } catch {
    // Fall through to empty
  }
  config.setCache([]);
  return [];
}

/**
 * Record a puzzle as played.
 */
async function markPuzzlePlayed(puzzleId: string, bankKey: string = 'standard'): Promise<void> {
  const config = getStorageConfig(bankKey);
  const used = await loadUsedPuzzles(bankKey);

  // Remove if already present (re-sort to front)
  const idx = used.indexOf(puzzleId);
  if (idx !== -1) used.splice(idx, 1);

  // Add to front (most recent)
  used.unshift(puzzleId);

  // Cap size
  if (used.length > MAX_USED_TRACKED) {
    used.length = MAX_USED_TRACKED;
  }

  config.setCache(used);

  try {
    await AsyncStorage.setItem(config.key, JSON.stringify(used));
  } catch {
    // Non-critical — will retry on next play
  }
}

/**
 * Get the appropriate puzzle bank for a difficulty level and variant.
 * Returns null if no bank exists for this combination.
 */
function getBankForSelection(difficulty: Difficulty, variant: PuzzleVariant): PreGeneratedPuzzle[] | null {
  // Only standard, reverse, and double_shift variants have pre-generated banks.
  // Speed variant generates on-device in real-time.
  if (variant !== 'standard' && variant !== 'reverse' && variant !== 'double_shift') return null;

  const bankKey = getBankKey(difficulty, variant);
  if (!BANK_REGISTRY[bankKey]) return null;
  const bank = getBank(bankKey);
  return bank.length > 0 ? bank : null;
}

/**
 * Score a puzzle's suitability for the current game context.
 * Higher = better match.
 *
 * Scoring layers (in priority order):
 * 1. Phase appropriateness — heaviest weight, matches puzzle dread tier to narrative phase
 * 2. Word history cooldown — short-term (15 puzzles) hard exclusion from general word history
 * 3. Bank word novelty — long-term (150 bank selections) graduated penalty for repeated words
 * 4. Random jitter — prevents deterministic ordering within similar scores
 */
function scorePuzzleForContext(
  puzzle: PreGeneratedPuzzle,
  phase: DialoguePhase,
  usedSet: Set<string>,
  recencyMap: Map<string, number>,
  bankWordRecency: Map<string, number>,
  wordFrequency: Map<string, number>
): number {
  let score = 0;

  // Phase-appropriateness scoring (heaviest weight)
  const idealTier = phase as number;
  const tierDiff = Math.abs(puzzle.dreadTier - idealTier);
  if (tierDiff === 0) score += 40;
  else if (tierDiff === 1) score += 20;
  else if (tierDiff === 2) score += 5;
  else score -= 10;

  // NOTE: the old "+10 lead bonus" for tier=phase+1 was removed in the
  // dread-supply pass. It pre-drained the NEXT phase's (scarce) tier-4
  // puzzles during phase 3, so by the time the black sky arrived the dread
  // boards were already spent and the climax served bright tier-0 words. The
  // tier-match weighting above is enough to steer the vocabulary; the finale
  // now gets its dread supply from the Phase-4 recycle in
  // selectPreGeneratedPuzzle instead of by leading ahead.

  // Word freshness penalty (short-term, from general word history)
  let overlapCount = 0;
  for (const word of puzzle.allWords) {
    if (isInHardCooldown(word, recencyMap)) {
      score -= 30;
      overlapCount++;
    }
  }
  // If more than half the words are in cooldown, heavy exclusion penalty
  if (overlapCount > puzzle.allWords.length / 2) score -= 100;

  // Bank word novelty scoring (long-term memory of bank selections)
  // This fills the gap after the 15-puzzle word history cooldown expires.
  // With only ~780 unique words across 500 standard puzzles (562 for reverse),
  // the general cooldown forgets too quickly — this ensures the selection
  // keeps preferring puzzles with words the player hasn't seen recently.
  let novelWords = 0;
  for (const word of puzzle.allWords) {
    const bankPuzzlesAgo = bankWordRecency.get(word);
    if (bankPuzzlesAgo === undefined) {
      // Never seen from this bank — genuinely novel
      novelWords++;
    } else if (bankPuzzlesAgo < BANK_RECENT_THRESHOLD) {
      // Seen recently in bank — strong penalty
      // (0-14 range overlaps with wordHistory hard cooldown, which already
      //  applies -30. This adds bank-specific penalty for the 15-49 range.)
      if (bankPuzzlesAgo >= 15) {
        score += BANK_RECENT_PENALTY;
      }
    } else if (bankPuzzlesAgo < BANK_MEDIUM_THRESHOLD) {
      // Seen a while ago — moderate penalty
      score += BANK_MEDIUM_PENALTY;
    }
    // 150+ bank selections ago: word has effectively refreshed
  }

  // Bonus for puzzles with novel words — strongly prefer fresh vocabulary
  if (novelWords === puzzle.allWords.length) {
    score += BANK_NOVEL_BONUS_FULL;
  } else if (novelWords >= 3) {
    score += BANK_NOVEL_BONUS_MOST;
  } else if (novelWords >= 1) {
    score += BANK_NOVEL_BONUS_SOME;
  }

  // Hub-word penalty: words the generator over-used across this bank cost
  // score regardless of play history, so the vocabulary long tail surfaces.
  for (const word of puzzle.allWords) {
    const freq = wordFrequency.get(word) ?? 0;
    if (freq >= 30) score -= 14;
    else if (freq >= 18) score -= 9;
    else if (freq >= 10) score -= 4;
  }

  // Random jitter (prevents deterministic ordering)
  score += Math.random() * 15;

  return score;
}

/**
 * Select a puzzle from the pre-generated bank.
 *
 * Returns a PuzzleConfig ready for initGame(), or null if no bank exists
 * for the requested difficulty/variant combination.
 *
 * When all puzzles have been played, recycles the oldest-played puzzles.
 */
export async function selectPreGeneratedPuzzle(
  difficulty: Difficulty,
  phase: DialoguePhase,
  recencyMap: Map<string, number>,
  variant: PuzzleVariant = 'standard'
): Promise<PuzzleConfig | null> {
  const bank = getBankForSelection(difficulty, variant);
  if (!bank) return null;

  const bankKey = getBankKey(difficulty, variant);
  const storageConfig = getStorageConfig(bankKey);
  const used = await loadUsedPuzzles(bankKey);
  const usedSet = new Set(used);

  // Filter out already-played puzzles
  let available = bank.filter(p => !usedSet.has(p.id));

  // Phase 4+ dread recycle: the dread-tiered puzzles are scarce and get
  // consumed early, so without this the cult reveal and the whole Phase-5
  // endgame serve bright tier-0 words under a black sky (the FUN->VOID arc
  // playing backwards). Fold PLAYED high-tier puzzles back into the candidate
  // pool so dread boards can repeat rather than waiting for full-bank
  // exhaustion. Unplayed puzzles still win on freshness/novelty scoring, so
  // fresh dread is preferred while it lasts; only the recycled dread fills in
  // once it runs out.
  if ((phase as number) >= 4) {
    const dreadFloor = Math.max(3, (phase as number) - 1);
    const playedDread = bank.filter(p => usedSet.has(p.id) && p.dreadTier >= dreadFloor);
    if (playedDread.length > 0) {
      // De-dup by id (a puzzle is either unplayed-available or played-dread).
      const seen = new Set(available.map(p => p.id));
      for (const p of playedDread) {
        if (!seen.has(p.id)) available.push(p);
      }
    }
  }

  // If all puzzles exhausted, recycle the oldest-played half
  if (available.length === 0) {
    const halfIdx = Math.floor(used.length / 2);
    const recycledIds = new Set(used.slice(halfIdx));

    // Remove recycled IDs from the used list
    const trimmed = used.slice(0, halfIdx);
    storageConfig.setCache(trimmed);
    try {
      await AsyncStorage.setItem(storageConfig.key, JSON.stringify(trimmed));
    } catch {
      // Non-critical
    }

    available = bank.filter(p => recycledIds.has(p.id));

    // If still empty (shouldn't happen), return all
    if (available.length === 0) {
      available = [...bank];
      storageConfig.setCache([]);
      try {
        await AsyncStorage.setItem(storageConfig.key, JSON.stringify([]));
      } catch {
        // Non-critical
      }
    }
  }

  // Derive bank-specific word recency from played puzzle history.
  // This gives the scoring function a long-term memory of which words
  // the player has already seen from this bank, far beyond the 15-puzzle
  // general word history cooldown.
  const bankWordRecency = deriveBankWordRecency(used, bankKey);

  // Score all available puzzles for current context
  const scored = available.map(p => ({
    puzzle: p,
    score: scorePuzzleForContext(p, phase, usedSet, recencyMap, bankWordRecency, getBankWordFrequency(bankKey)),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Pick randomly from the top 10 (wider pool = more vocabulary variety)
  const topN = Math.min(10, scored.length);
  const selected = scored[Math.floor(Math.random() * topN)];

  // Mark as played
  await markPuzzlePlayed(selected.puzzle.id, bankKey);

  // Convert to PuzzleConfig
  const sol0 = selected.puzzle.solution[0];
  const isDS = selected.puzzle.isDoubleShift === true;
  const hint = isDS && sol0?.lettersToMove
    ? `Start by shifting '${sol0.lettersToMove[0]}' and '${sol0.lettersToMove[1]}'`
    : `Start by shifting '${sol0?.letterToMove ?? '?'}'`;

  return {
    words: selected.puzzle.words,
    hint,
    solution: selected.puzzle.solution,
    reverseSolution: selected.puzzle.reverseSolution,
    wordLength: selected.puzzle.wordLength,
    isDoubleShift: isDS || undefined,
  };
}

/**
 * Clear played puzzle tracking (for Reset All Data).
 */
export async function clearPlayedPuzzles(): Promise<void> {
  const keys: string[] = [];
  for (const entry of Object.values(BANK_REGISTRY)) {
    entry.cache = null;
    entry.idToWords = null;
    keys.push(entry.storageKey);
  }
  try {
    await AsyncStorage.multiRemove(keys);
  } catch {
    // Non-critical
  }
}
