import { Share, Platform } from 'react-native';
import { Difficulty } from '../types';
import { incrementShareCount } from './achievements';

/**
 * Share results system for WordShift
 *
 * Generates Wordle-style emoji grids and shareable text
 * for puzzle completions and daily challenges.
 */

interface ShareableResult {
  stars: number;
  difficulty: Difficulty;
  level: number;
  hintsUsed: number;
  invalidAttempts: number;
  isDaily?: boolean;
  dailyDate?: string;
  moveCount: number;
  isChallenge?: boolean;
}

/**
 * Generate star display string
 */
function starString(stars: number): string {
  return (
    (stars >= 1 ? '⭐' : '☆') +
    (stars >= 2 ? '⭐' : '☆') +
    (stars >= 3 ? '⭐' : '☆')
  );
}

/**
 * Generate difficulty emoji
 */
function difficultyEmoji(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'EASY': return '🟢';
    case 'MEDIUM': return '🟡';
    case 'HARD': return '🔴';
  }
}

/**
 * Generate performance grid (based on hints/mistakes per step)
 * Shows green for clean steps, yellow for hint-needed, red for mistakes
 */
function performanceGrid(moveCount: number, hintsUsed: number, invalidAttempts: number): string {
  const squares: string[] = [];
  const totalMoves = moveCount;

  for (let i = 0; i < totalMoves; i++) {
    // Distribute mistakes and hints across moves for visual representation
    if (i < invalidAttempts && i < hintsUsed) {
      squares.push('🟥'); // Both hint and mistake
    } else if (i < invalidAttempts) {
      squares.push('🟧'); // Mistake
    } else if (i < hintsUsed) {
      squares.push('🟨'); // Hint used
    } else {
      squares.push('🟩'); // Clean move
    }
  }

  return squares.join('');
}

/**
 * Generate shareable text for a puzzle result
 */
export function generateShareText(result: ShareableResult): string {
  const lines: string[] = [];

  if (result.isDaily && result.dailyDate) {
    lines.push(`WordShift Daily ${result.dailyDate}`);
  } else {
    lines.push(`WordShift Lv.${result.level}`);
  }

  const challengeTag = result.isChallenge ? ' 🔒' : '';
  lines.push(`${starString(result.stars)} ${difficultyEmoji(result.difficulty)} ${result.difficulty}${challengeTag}`);
  lines.push(performanceGrid(result.moveCount, result.hintsUsed, result.invalidAttempts));

  if (result.isChallenge && result.hintsUsed === 0 && result.invalidAttempts <= 1) {
    lines.push('Challenge Mode — flawless!');
  } else if (result.hintsUsed === 0 && result.invalidAttempts <= 1) {
    lines.push('No hints, no mistakes!');
  }

  return lines.join('\n');
}

/**
 * Share puzzle result via system share sheet
 */
export async function sharePuzzleResult(result: ShareableResult): Promise<boolean> {
  const text = generateShareText(result);

  try {
    const shareResult = await Share.share(
      {
        message: text,
      },
      {
        dialogTitle: 'Share your WordShift result',
      }
    );

    if (shareResult.action === Share.sharedAction) {
      await incrementShareCount();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Failed to share:', err);
    return false;
  }
}
