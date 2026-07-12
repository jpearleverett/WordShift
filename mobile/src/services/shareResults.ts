import { Share, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty } from '../types';
import { incrementShareCount } from './achievements';
import { PLAY_STORE_URL } from '../constants/links';

/**
 * Share results system for WordShift
 *
 * Generates Wordle-style emoji grids and shareable text
 * for puzzle completions and daily challenges.
 */

/** Outcome of a single committed move, in play order */
export type MoveOutcome = 'clean' | 'hint' | 'mistake' | 'both';

export interface ShareableResult {
  stars: number;
  difficulty: Difficulty;
  hintsUsed: number;
  invalidAttempts: number;
  /**
   * Per-move outcomes in the order they happened. When present, the share grid
   * is honest — one square per actual move. When absent, falls back to the
   * legacy distribution (colors the first N squares regardless of position).
   */
  moveOutcomes?: MoveOutcome[];
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

// ─── Spoiler-safe intrigue taglines (early shares) ──────────────────────────
//
// The spoiler-free grid is the growth engine, but at the bright phases the card
// carried no curiosity. These add a faint wrongness ("Mostly." / "For now.")
// that hints "there is more here than it looks" WITHOUT naming or revealing the
// turn. Used ONLY on Phase 0-1 non-daily cards (see pickShareIntrigueTagline);
// daily cards (same puzzle for everyone) and dark-phase cards (the player is
// already in it) keep their existing phaseNarrative tagline untouched. Exported
// so the noEmDashes sweep covers them. No em dashes.

export const SHARE_INTRIGUE_TAGLINES: Record<0 | 1, string[]> = {
  0: [
    'A cozy little word game. Mostly.',
    'Cute animals, cozy words. For now.',
    'It is very relaxing. You should play.',
    'Friendly animals. Nothing more. Truly.',
  ],
  1: [
    'Still just a cozy word game. Mostly.',
    'The animals are so friendly. For now.',
    'Nothing to worry about here. Come play.',
    'It stays warm and quiet. Mostly.',
  ],
};

/**
 * Stable, render-independent seed from a share result (same result → same pick,
 * so the choice never flickers across re-renders and the captured PNG matches
 * the preview). Not security-sensitive; just a spread over the small pool.
 */
function intrigueSeed(result: ShareableResult): number {
  const basis = [
    result.wordChain?.join('') ?? '',
    result.moveCount,
    result.stars,
    result.hintsUsed,
    result.invalidAttempts,
    result.difficulty,
  ].join('|');
  let h = 0;
  for (let i = 0; i < basis.length; i++) {
    h = (h * 31 + basis.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Pick a spoiler-safe intrigue tagline for the share card, or null when the
 * card should keep its existing phaseNarrative tagline instead (daily shares,
 * and any dark phase >= 2). Deterministic per result.
 */
export function pickShareIntrigueTagline(result: ShareableResult): string | null {
  if (result.isDaily) return null; // daily stays spoiler-free / unchanged
  const phase = Math.round(result.phase ?? 0);
  if (phase !== 0 && phase !== 1) return null; // dark phases keep their tagline
  const pool = SHARE_INTRIGUE_TAGLINES[phase];
  return pool[intrigueSeed(result) % pool.length];
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

const OUTCOME_SQUARES: Record<MoveOutcome, string> = {
  clean: '🟩',
  hint: '🟨',
  mistake: '🟧',
  both: '🟥',
};

/**
 * Generate performance grid.
 *
 * With `moveOutcomes` (preferred): one square per actual move, in play order —
 * an honest record of where hints/mistakes happened.
 * Without: legacy fallback that distributes hint/mistake counts across the
 * first squares (positional fiction, kept for callers that lack per-move data).
 */
function performanceGrid(
  moveCount: number,
  hintsUsed: number,
  invalidAttempts: number,
  moveOutcomes?: MoveOutcome[]
): string {
  if (moveOutcomes && moveOutcomes.length > 0) {
    return moveOutcomes.map((outcome) => OUTCOME_SQUARES[outcome]).join('');
  }

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
  lines.push(
    performanceGrid(result.moveCount, result.hintsUsed, result.invalidAttempts, result.moveOutcomes)
  );

  // Daily challenges are the same puzzle for everyone today, so the word chain
  // and the (word-bearing) incantation name would SPOIL it for friends. Keep the
  // grid (the Wordle-style spoiler-free signal) and omit the words for daily.
  const spoilerSafe = !result.isDaily;

  // Word chain (enhanced sharing) — non-daily only.
  if (spoilerSafe && result.wordChain && result.wordChain.length > 0) {
    const phase = result.phase || 0;
    lines.push('');
    lines.push(formatWordChain(result.wordChain, phase));
  }

  // Named incantation (Phase 2+) — non-daily only (it names the words).
  if (spoilerSafe && result.incantationName) {
    lines.push(`"${result.incantationName}"`);
  }

  if (result.isChallenge && result.hintsUsed === 0 && result.invalidAttempts <= 1) {
    lines.push('Challenge Mode. Flawless!');
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
  // Custom-scheme link for recipients who already have the app installed…
  lines.push(challengeLink);
  // …plus a real install CTA for everyone else (custom schemes are dead links
  // without the app).
  lines.push(`Get WordShift: ${PLAY_STORE_URL}`);

  // Apply cosmetic frame
  const framed = applyFrame(lines, result.shareFrame);
  return framed.join('\n');
}

// ─── Friend challenge links ─────────────────────────────────────────────────

const CHALLENGE_LINK_PREFIX = 'wordshift://challenge/p?w=';
const CHALLENGE_WORD_RE = /^[A-Z]{3,7}$/;
/**
 * Single source of truth for the friend-challenge chain size. Shared by
 * encode/decodeChallengeLink here and usePuzzleGame.startSharedChallengeGame —
 * keep them importing these rather than restating the bound.
 */
export const MIN_CHALLENGE_WORDS = 3;
export const MAX_CHALLENGE_WORDS = 6;

function isValidChallengeWords(words: unknown): words is string[] {
  return (
    Array.isArray(words) &&
    words.length >= MIN_CHALLENGE_WORDS &&
    words.length <= MAX_CHALLENGE_WORDS &&
    words.every((w) => typeof w === 'string' && CHALLENGE_WORD_RE.test(w))
  );
}

/**
 * Encode a starting word chain as a friend-challenge deep link:
 * 'wordshift://challenge/p?w=WORD1-WORD2-…'.
 * Requires 3-6 words, each 3-7 uppercase A-Z letters; throws otherwise.
 */
export function encodeChallengeLink(words: string[]): string {
  if (!isValidChallengeWords(words)) {
    throw new Error('encodeChallengeLink: expected 3-6 words of 3-7 uppercase A-Z letters');
  }
  return CHALLENGE_LINK_PREFIX + words.join('-');
}

/**
 * Strictly parse a friend-challenge deep link back into its word chain.
 * Input is untrusted (arbitrary inbound URL) — returns null on ANY deviation
 * from the exact encodeChallengeLink format.
 */
export function decodeChallengeLink(url: string): string[] | null {
  if (typeof url !== 'string' || !url.startsWith(CHALLENGE_LINK_PREFIX)) return null;
  const payload = url.slice(CHALLENGE_LINK_PREFIX.length);
  // Payload may contain ONLY uppercase letters and dashes — rejects extra query
  // params, fragments, encodings, whitespace, and anything injection-shaped.
  if (!/^[A-Z-]+$/.test(payload)) return null;
  const words = payload.split('-');
  if (!isValidChallengeWords(words)) return null;
  return words;
}

/**
 * Build share text for challenging a friend with a specific starting chain.
 * The starting words ARE the challenge (non-daily), so encoding them in the
 * link is not a spoiler; nothing beyond the starting chain is included.
 */
export function buildChallengeShareText(words: string[], playerName?: string): string {
  const link = encodeChallengeLink(words);
  const taunt = playerName
    ? `${playerName} challenges you to a WordShift puzzle. Think you can shift it?`
    : 'I challenge you to a WordShift puzzle. Think you can shift it?';
  return [taunt, link, `Get WordShift: ${PLAY_STORE_URL}`].join('\n');
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
 * Record a successful share: bump the share-count achievement stat and credit
 * the once-per-day share bonus. Shared by the text and image share paths so the
 * bonus is granted exactly once regardless of which path ran.
 */
export async function recordShareSuccess(): Promise<void> {
  await incrementShareCount();
  await maybeAwardDailyShareBonus();
}

/**
 * Share pre-built friend-challenge text via the system share sheet.
 * Mirrors sharePuzzleResult: a completed share records success (share-count
 * achievement + once-per-day amber bonus) exactly like the other share paths.
 */
export async function shareChallengeText(text: string): Promise<boolean> {
  try {
    const shareResult = await Share.share({ message: text });
    if (shareResult.action === Share.sharedAction) {
      await recordShareSuccess();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Failed to share challenge:', err);
    return false;
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
      await recordShareSuccess();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Failed to share:', err);
    return false;
  }
}
