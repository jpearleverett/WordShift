import AsyncStorage from '@react-native-async-storage/async-storage';
import { PuzzleConfig, Difficulty } from '../types';
import { PreGeneratedPuzzle, PUZZLE_BANK_HARD } from '../data/puzzleBankHard';
import { DialoguePhase } from '../types/homeWorld';
import { isInHardCooldown } from './wordHistory';

const USED_PUZZLES_KEY = 'wordshift_played_puzzle_ids';
const MAX_USED_TRACKED = 500;

// In-memory cache (ordered array, most recently played first)
let usedPuzzleIds: string[] | null = null;

/**
 * Load played puzzle IDs from storage into cache.
 */
async function loadUsedPuzzles(): Promise<string[]> {
  if (usedPuzzleIds !== null) return usedPuzzleIds;
  try {
    const stored = await AsyncStorage.getItem(USED_PUZZLES_KEY);
    if (stored) {
      usedPuzzleIds = JSON.parse(stored);
      return usedPuzzleIds!;
    }
  } catch {
    // Fall through to empty
  }
  usedPuzzleIds = [];
  return usedPuzzleIds;
}

/**
 * Record a puzzle as played.
 */
async function markPuzzlePlayed(puzzleId: string): Promise<void> {
  const used = await loadUsedPuzzles();

  // Remove if already present (re-sort to front)
  const idx = used.indexOf(puzzleId);
  if (idx !== -1) used.splice(idx, 1);

  // Add to front (most recent)
  used.unshift(puzzleId);

  // Cap size
  if (used.length > MAX_USED_TRACKED) {
    used.length = MAX_USED_TRACKED;
  }

  usedPuzzleIds = used;

  try {
    await AsyncStorage.setItem(USED_PUZZLES_KEY, JSON.stringify(used));
  } catch {
    // Non-critical — will retry on next play
  }
}

/**
 * Get the appropriate puzzle bank for a difficulty level.
 * Returns null if no bank exists for this difficulty.
 */
function getBankForDifficulty(difficulty: Difficulty): PreGeneratedPuzzle[] | null {
  switch (difficulty) {
    case 'HARD':
      return PUZZLE_BANK_HARD.length > 0 ? PUZZLE_BANK_HARD : null;
    // Future: case 'MEDIUM': return PUZZLE_BANK_MEDIUM;
    default:
      return null;
  }
}

/**
 * Score a puzzle's suitability for the current game context.
 * Higher = better match.
 */
function scorePuzzleForContext(
  puzzle: PreGeneratedPuzzle,
  phase: DialoguePhase,
  usedSet: Set<string>,
  recencyMap: Map<string, number>
): number {
  let score = 0;

  // Phase-appropriateness scoring (heaviest weight)
  const idealTier = phase as number;
  const tierDiff = Math.abs(puzzle.dreadTier - idealTier);
  if (tierDiff === 0) score += 40;
  else if (tierDiff === 1) score += 20;
  else if (tierDiff === 2) score += 5;
  else score -= 10;

  // Slight preference for puzzles that lead the phase by 1
  // (matching the "visual changes precede dialogue" principle)
  if (puzzle.dreadTier === idealTier + 1) score += 10;

  // Word freshness penalty
  let overlapCount = 0;
  for (const word of puzzle.allWords) {
    if (isInHardCooldown(word, recencyMap)) {
      score -= 30;
      overlapCount++;
    }
  }
  // If more than half the words are in cooldown, heavy exclusion penalty
  if (overlapCount > puzzle.allWords.length / 2) score -= 100;

  // Random jitter (prevents deterministic ordering)
  score += Math.random() * 15;

  return score;
}

/**
 * Select a puzzle from the pre-generated bank.
 *
 * Returns a PuzzleConfig ready for initGame(), or null if no bank exists
 * for the requested difficulty.
 *
 * When all puzzles have been played, recycles the oldest-played puzzles.
 */
export async function selectPreGeneratedPuzzle(
  difficulty: Difficulty,
  phase: DialoguePhase,
  recencyMap: Map<string, number>
): Promise<PuzzleConfig | null> {
  const bank = getBankForDifficulty(difficulty);
  if (!bank) return null;

  const used = await loadUsedPuzzles();
  const usedSet = new Set(used);

  // Filter out already-played puzzles
  let available = bank.filter(p => !usedSet.has(p.id));

  // If all puzzles exhausted, recycle the oldest-played half
  if (available.length === 0) {
    const halfIdx = Math.floor(used.length / 2);
    const recycledIds = new Set(used.slice(halfIdx));

    // Remove recycled IDs from the used list
    usedPuzzleIds = used.slice(0, halfIdx);
    try {
      await AsyncStorage.setItem(USED_PUZZLES_KEY, JSON.stringify(usedPuzzleIds));
    } catch {
      // Non-critical
    }

    available = bank.filter(p => recycledIds.has(p.id));

    // If still empty (shouldn't happen), return all
    if (available.length === 0) {
      available = [...bank];
      usedPuzzleIds = [];
      try {
        await AsyncStorage.setItem(USED_PUZZLES_KEY, JSON.stringify([]));
      } catch {
        // Non-critical
      }
    }
  }

  // Score all available puzzles for current context
  const scored = available.map(p => ({
    puzzle: p,
    score: scorePuzzleForContext(p, phase, usedSet, recencyMap),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Pick randomly from top 5 (for variety)
  const topN = Math.min(5, scored.length);
  const selected = scored[Math.floor(Math.random() * topN)];

  // Mark as played
  await markPuzzlePlayed(selected.puzzle.id);

  // Convert to PuzzleConfig
  return {
    words: selected.puzzle.words,
    hint: `Start by shifting '${selected.puzzle.solution[0]?.letterToMove ?? '?'}'`,
    solution: selected.puzzle.solution,
    wordLength: selected.puzzle.wordLength,
  };
}

/**
 * Clear played puzzle tracking (for Reset All Data).
 */
export async function clearPlayedPuzzles(): Promise<void> {
  usedPuzzleIds = [];
  try {
    await AsyncStorage.removeItem(USED_PUZZLES_KEY);
  } catch {
    // Non-critical
  }
}
