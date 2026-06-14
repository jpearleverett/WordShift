import { Share, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty } from '../types';
import { incrementShareCount } from './achievements';

/**
 * Share results system for WordShift
 *
 * Generates Wordle-style emoji grids and shareable text
 * for puzzle completions and daily challenges.
 */

export interface ShareableResult {
  stars: number;
  difficulty: Difficulty;
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
  /** Share frame style from cosmetics */
  shareFrame?: string;
}

function getChallengeLink(result: ShareableResult): string {
  if (result.isDaily) {
    return `wordshift://challenge/daily${result.dailyDate ? `?date=${result.dailyDate}` : ''}`;
  }
  return 'wordshift://home';
}

function getChallengeCTA(result: ShareableResult): string {
  return result.isDaily
    ? "Take today's daily challenge:"
    : 'Play WordShift:';
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
  const challengeLink = getChallengeLink(result);

  if (result.isDaily && result.dailyDate) {
    lines.push(`WordShift Daily ${result.dailyDate}`);
  } else {
    lines.push('WordShift');
  }

  const challengeTag = result.isChallenge ? ' 🔒' : '';
  lines.push(`${starString(result.stars)} ${difficultyEmoji(result.difficulty)} ${result.difficulty}${challengeTag}`);
  lines.push(performanceGrid(result.moveCount, result.hintsUsed, result.invalidAttempts));

  // Word chain (enhanced sharing)
  if (result.wordChain && result.wordChain.length > 0) {
    const phase = result.phase || 0;
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

  // Animal whisper
  if (result.animalWhisper) {
    lines.push('');
    lines.push(`"${result.animalWhisper}"`);
  }

  lines.push('');
  lines.push(getChallengeCTA(result));
  lines.push(challengeLink);

  // Apply cosmetic frame
  const framed = applyFrame(lines, result.shareFrame);
  return framed.join('\n');
}

const SHARE_BONUS_KEY = 'wordshift_share_bonus_date';

/** Amber credited for the first completed share each day */
export const DAILY_SHARE_BONUS_AMBER = 5;

function localDayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/**
 * Whether today's share bonus is still unclaimed (for UI hints).
 */
export async function isDailyShareBonusAvailable(): Promise<boolean> {
  try {
    const last = await AsyncStorage.getItem(SHARE_BONUS_KEY);
    return last !== localDayKey();
  } catch {
    return false;
  }
}

/**
 * Credit a small amber bonus for the first completed share of the day.
 * Returns the amount awarded (0 if already claimed today or on failure).
 */
export async function maybeAwardDailyShareBonus(): Promise<number> {
  try {
    const dayKey = localDayKey();
    const last = await AsyncStorage.getItem(SHARE_BONUS_KEY);
    if (last === dayKey) return 0;
    await AsyncStorage.setItem(SHARE_BONUS_KEY, dayKey);
    // Lazy require keeps this module free of an amberCurrency import cycle
    const { awardBonusAmber } = require('./amberCurrency');
    await awardBonusAmber(DAILY_SHARE_BONUS_AMBER, 'daily_share');
    return DAILY_SHARE_BONUS_AMBER;
  } catch {
    return 0;
  }
}

/**
 * Share puzzle result via system share sheet
 */
export async function sharePuzzleResult(result: ShareableResult): Promise<boolean> {
  const text = generateShareText(result);
  const challengeLink = getChallengeLink(result);

  try {
    const shareResult = await Share.share(
      {
        message: text,
        url: Platform.OS === 'ios' ? challengeLink : undefined,
      },
      {
        dialogTitle: 'Share your WordShift result',
      }
    );

    if (shareResult.action === Share.sharedAction) {
      await incrementShareCount();
      await maybeAwardDailyShareBonus();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Failed to share:', err);
    return false;
  }
}
