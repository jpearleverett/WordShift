import { Share, Platform } from 'react-native';
import { Difficulty } from '../types';
import { incrementShareCount } from './achievements';

/**
 * Share results system for WordShift
 *
 * Generates Wordle-style emoji grids and shareable text
 * for puzzle completions and daily challenges.
 *
 * At higher phases, share text captures narrative moments
 * (eerie victory titles, named incantations) to create
 * intrigue without spoiling the arc for new players.
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
  /** Word chain for enhanced sharing (e.g., ["FLAME", "FAME", "FRAME"]) */
  wordChain?: string[];
  /** Post-puzzle animal whisper text */
  animalWhisper?: string;
  /** Current narrative phase (for theming) */
  phase?: number;
  /** Named incantation for the puzzle chain (Phase 2+) */
  incantationName?: string;
  /** Victory title text (phase-aware — "PERFECT!" → "WHY DOES IT MATTER?") */
  victoryTitle?: string;
  /** Total words offered to the arrangement (cumulative count) */
  totalWordsOffered?: number;
  /** Share frame style from cosmetics */
  shareFrame?: string;
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
    case 'MEDIUM_PLUS': return '🟠';
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
 * Generate the word chain display (e.g., "FLAME → FAME → FRAME")
 */
function formatWordChain(words: string[], phase: number): string {
  if (phase >= 3) {
    // Vertical chain for dark phases
    return words.join('\n↓\n');
  }
  return words.join(' → ');
}

/**
 * Phase-aware tagline for the share footer.
 * Creates intrigue at higher phases without spoiling the narrative.
 * New players see something intriguing; existing players recognize the tone shift.
 */
function getShareTagline(phase: number): string | null {
  if (phase <= 1) return null;
  if (phase === 2) return 'The words are changing.';
  if (phase === 3) return 'Something is listening.';
  if (phase === 4) return 'The arrangement continues.';
  return 'The pattern hums.'; // Phase 5
}

/**
 * Apply share frame decorations based on cosmetic frame style
 */
function applyFrame(lines: string[], frameStyle?: string): string[] {
  if (!frameStyle || frameStyle === 'frame_basic') return lines;

  switch (frameStyle) {
    case 'frame_animal_border': {
      const animals = '🦊🦉🦔🦎🦫🦊🦥🐻🐰🐼';
      return [animals, ...lines, animals];
    }
    case 'frame_ritual': {
      return ['◈━━━━━━━━━━◈', ...lines, '◈━━━━━━━━━━◈'];
    }
    case 'frame_streak': {
      return ['🔥━━━━━━━━━━🔥', ...lines, '🔥━━━━━━━━━━🔥'];
    }
    default:
      return lines;
  }
}

/**
 * Generate shareable text for a puzzle result
 */
export function generateShareText(result: ShareableResult): string {
  const lines: string[] = [];
  const phase = result.phase || 0;

  if (result.isDaily && result.dailyDate) {
    lines.push(`WordShift Daily ${result.dailyDate}`);
  } else {
    lines.push(`WordShift Lv.${result.level}`);
  }

  const challengeTag = result.isChallenge ? ' 🔒' : '';
  lines.push(`${starString(result.stars)} ${difficultyEmoji(result.difficulty)} ${result.difficulty}${challengeTag}`);
  lines.push(performanceGrid(result.moveCount, result.hintsUsed, result.invalidAttempts));

  // Victory title capture (Phase 2+ — the eerie titles are the viral hook)
  if (result.victoryTitle && phase >= 2) {
    // Clean up any newlines in the title (e.g., "WHY DOES\nIT MATTER?" → single line)
    const cleanTitle = result.victoryTitle.replace(/\n/g, ' ');
    lines.push('');
    lines.push(cleanTitle);
  }

  // Word chain (enhanced sharing)
  if (result.wordChain && result.wordChain.length > 0) {
    lines.push('');
    lines.push(formatWordChain(result.wordChain, phase));
  }

  // Named incantation (Phase 2+)
  if (result.incantationName) {
    lines.push(`"${result.incantationName}"`);
  }

  if (result.isChallenge && result.hintsUsed === 0 && result.invalidAttempts <= 1) {
    lines.push('Challenge Mode — flawless!');
  } else if (result.hintsUsed === 0 && result.invalidAttempts <= 1) {
    lines.push('No hints, no mistakes!');
  }

  // Total words offered (Phase 3+ — creates "how deep are you?" intrigue)
  if (result.totalWordsOffered && result.totalWordsOffered >= 100 && phase >= 3) {
    lines.push(`${result.totalWordsOffered} words offered.`);
  }

  // Animal whisper
  if (result.animalWhisper) {
    lines.push('');
    lines.push(`"${result.animalWhisper}"`);
  }

  // Phase-aware tagline (creates intrigue for viewers)
  const tagline = getShareTagline(phase);
  if (tagline) {
    lines.push('');
    lines.push(tagline);
  }

  // Apply cosmetic frame
  const framed = applyFrame(lines, result.shareFrame);
  return framed.join('\n');
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
