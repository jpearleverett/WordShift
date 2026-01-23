import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'wordshift_word_history';
const MAX_HISTORY_SIZE = 100; // Track last 100 puzzles worth of words
const WORDS_PER_PUZZLE = 5; // Approximate words per puzzle
const MAX_WORDS_TRACKED = MAX_HISTORY_SIZE * WORDS_PER_PUZZLE;

// Cooldown periods (in puzzle count)
const HARD_COOLDOWN = 15; // Word can't appear at all in next 15 puzzles
const SOFT_COOLDOWN = 40; // Word gets penalty between 15-40 puzzles ago

interface WordHistoryData {
  // Array of words, most recent first. Index = how many puzzles ago
  recentWords: string[];
  // Timestamp of last update
  lastUpdated: number;
}

// In-memory cache
let historyCache: WordHistoryData | null = null;

/**
 * Load word history from AsyncStorage
 */
export async function loadWordHistory(): Promise<Set<string>> {
  try {
    if (historyCache) {
      return new Set(historyCache.recentWords);
    }

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      historyCache = JSON.parse(stored);
      return new Set(historyCache!.recentWords);
    }
  } catch (error) {
    console.warn('Failed to load word history:', error);
  }

  historyCache = { recentWords: [], lastUpdated: Date.now() };
  return new Set();
}

/**
 * Get the full history data with recency information
 */
export async function getWordHistoryWithRecency(): Promise<Map<string, number>> {
  try {
    if (!historyCache) {
      await loadWordHistory();
    }

    // Map of word -> puzzles ago (lower = more recent)
    const recencyMap = new Map<string, number>();
    const words = historyCache?.recentWords || [];

    // Group words by puzzle (approximately WORDS_PER_PUZZLE words per puzzle)
    for (let i = 0; i < words.length; i++) {
      const puzzlesAgo = Math.floor(i / WORDS_PER_PUZZLE);
      const word = words[i];
      // Only track the most recent occurrence
      if (!recencyMap.has(word)) {
        recencyMap.set(word, puzzlesAgo);
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

    // Add new words at the beginning (most recent)
    const newRecentWords = [
      ...words.map(w => w.toUpperCase()),
      ...(historyCache?.recentWords || [])
    ];

    // Trim to max size
    if (newRecentWords.length > MAX_WORDS_TRACKED) {
      newRecentWords.length = MAX_WORDS_TRACKED;
    }

    historyCache = {
      recentWords: newRecentWords,
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
    historyCache = { recentWords: [], lastUpdated: Date.now() };
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

  const words = historyCache?.recentWords || [];
  const uniqueWords = new Set(words).size;

  return {
    totalWordsTracked: words.length,
    uniqueWords,
    oldestPuzzlesAgo: Math.floor(words.length / WORDS_PER_PUZZLE)
  };
}
