import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'wordshift_word_history';
const MAX_HISTORY_SIZE = 150; // Track last 150 puzzles
const MAX_WORDS_TRACKED = 500; // Upper bound on total words tracked

// Cooldown periods (in puzzle count)
const HARD_COOLDOWN = 25; // Word can't appear at all in next 25 puzzles
const SOFT_COOLDOWN = 60; // Word gets penalty between 25-60 puzzles ago

interface WordHistoryData {
  // Array of puzzle word groups, most recent first. Each entry = one puzzle's words.
  puzzleGroups: string[][];
  // Legacy flat array for migration (optional)
  recentWords?: string[];
  // Timestamp of last update
  lastUpdated: number;
}

// In-memory cache
let historyCache: WordHistoryData | null = null;

/** Drop the in-memory cache after an external storage write (cloud restore). */
export function invalidateWordHistoryCache(): void {
  historyCache = null;
}


/**
 * Migrate legacy flat array format to grouped format
 */
function migrateLegacyHistory(data: { recentWords?: string[]; puzzleGroups?: string[][]; lastUpdated: number }): WordHistoryData {
  if (data.puzzleGroups && data.puzzleGroups.length > 0) {
    return { puzzleGroups: data.puzzleGroups, lastUpdated: data.lastUpdated };
  }
  // Legacy: flat array with ~5 words per puzzle
  const words = data.recentWords || [];
  const groups: string[][] = [];
  const approxWordsPerPuzzle = 5;
  for (let i = 0; i < words.length; i += approxWordsPerPuzzle) {
    groups.push(words.slice(i, i + approxWordsPerPuzzle));
  }
  return { puzzleGroups: groups, lastUpdated: data.lastUpdated };
}

/**
 * Load word history from AsyncStorage
 */
export async function loadWordHistory(): Promise<Set<string>> {
  try {
    if (historyCache) {
      const allWords = historyCache.puzzleGroups.flat();
      return new Set(allWords);
    }

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const raw = JSON.parse(stored);
      historyCache = migrateLegacyHistory(raw);
      return new Set(historyCache.puzzleGroups.flat());
    }
  } catch (error) {
    console.warn('Failed to load word history:', error);
  }

  historyCache = { puzzleGroups: [], lastUpdated: Date.now() };
  return new Set();
}

/**
 * Get the full history data with recency information
 * Returns Map of word -> puzzles ago (accurate per-puzzle grouping)
 */
export async function getWordHistoryWithRecency(): Promise<Map<string, number>> {
  try {
    if (!historyCache) {
      await loadWordHistory();
    }

    const recencyMap = new Map<string, number>();
    const groups = historyCache?.puzzleGroups || [];

    // Each group index = puzzles ago (0 = most recent)
    for (let puzzlesAgo = 0; puzzlesAgo < groups.length; puzzlesAgo++) {
      for (const word of groups[puzzlesAgo]) {
        // Only track the most recent occurrence
        if (!recencyMap.has(word)) {
          recencyMap.set(word, puzzlesAgo);
        }
      }
    }

    return recencyMap;
  } catch (error) {
    console.warn('Failed to get word history with recency:', error);
    return new Map();
  }
}

/**
 * Calculate freshness penalty for a word (higher = more penalty, should be subtracted)
 * Returns 0 for fresh words, up to 100 for very recently used words
 */
export function calculateFreshnessPenalty(
  word: string,
  recencyMap: Map<string, number>
): number {
  const puzzlesAgo = recencyMap.get(word);

  if (puzzlesAgo === undefined) {
    // Never used before - no penalty, small bonus actually
    return -5;
  }

  if (puzzlesAgo < HARD_COOLDOWN) {
    // Very recently used - heavy penalty (essentially exclude)
    return 100;
  }

  if (puzzlesAgo < SOFT_COOLDOWN) {
    // Moderately recently used - sliding penalty
    const progress = (puzzlesAgo - HARD_COOLDOWN) / (SOFT_COOLDOWN - HARD_COOLDOWN);
    // Penalty decreases from 50 to 10 as puzzlesAgo increases
    return Math.round(50 - (progress * 40));
  }

  // Old enough - minimal penalty
  return 0;
}

/**
 * Check if a word is in hard cooldown (should be excluded entirely)
 */
export function isInHardCooldown(
  word: string,
  recencyMap: Map<string, number>
): boolean {
  const puzzlesAgo = recencyMap.get(word);
  return puzzlesAgo !== undefined && puzzlesAgo < HARD_COOLDOWN;
}

/**
 * Record words from a completed puzzle
 */
export async function recordPuzzleWords(words: string[]): Promise<void> {
  try {
    if (!historyCache) {
      await loadWordHistory();
    }

    const puzzleGroup = words.map(w => w.toUpperCase());

    // Add new puzzle group at the beginning (most recent)
    const newGroups = [puzzleGroup, ...(historyCache?.puzzleGroups || [])];

    // Trim to max puzzles
    if (newGroups.length > MAX_HISTORY_SIZE) {
      newGroups.length = MAX_HISTORY_SIZE;
    }

    // Also trim if total words exceed max
    let totalWords = 0;
    let trimIndex = newGroups.length;
    for (let i = 0; i < newGroups.length; i++) {
      totalWords += newGroups[i].length;
      if (totalWords > MAX_WORDS_TRACKED) {
        trimIndex = i + 1;
        break;
      }
    }
    if (trimIndex < newGroups.length) {
      newGroups.length = trimIndex;
    }

    historyCache = {
      puzzleGroups: newGroups,
      lastUpdated: Date.now()
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(historyCache));
  } catch (error) {
    console.warn('Failed to record puzzle words:', error);
  }
}

/**
 * Clear all word history (for testing/reset)
 */
export async function clearWordHistory(): Promise<void> {
  try {
    historyCache = { puzzleGroups: [], lastUpdated: Date.now() };
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear word history:', error);
  }
}

/**
 * Get statistics about word history
 */
export async function getHistoryStats(): Promise<{
  totalWordsTracked: number;
  uniqueWords: number;
  oldestPuzzlesAgo: number;
}> {
  if (!historyCache) {
    await loadWordHistory();
  }

  const groups = historyCache?.puzzleGroups || [];
  const allWords = groups.flat();
  const uniqueWords = new Set(allWords).size;

  return {
    totalWordsTracked: allWords.length,
    uniqueWords,
    oldestPuzzlesAgo: groups.length
  };
}
