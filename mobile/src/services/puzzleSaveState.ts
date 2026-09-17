import AsyncStorage from '@react-native-async-storage/async-storage';
import { runTransientStorageOperation } from './persistenceStorage';
import { RowData, Letter, GameState, MoveDelta, PuzzleSolutionStep, Difficulty, GameMode } from '../types';
import { DialoguePhase } from '../types/homeWorld';
import { PuzzleVariant } from './puzzleVariety';

/**
 * Mid-puzzle save/restore service.
 *
 * Persists puzzle state to AsyncStorage after every valid move so players
 * don't lose progress on app crash, phone calls, or accidental closure.
 * Normal and daily boards have independent slots. Countdown checkpoints use
 * compact sidecars; all operations share the reset/cloud transaction queue.
 */

export type PuzzleSaveSlot = 'normal' | 'daily';
const PUZZLE_SAVE_KEYS: Record<PuzzleSaveSlot, string> = {
  normal: 'wordshift_in_progress_puzzle',
  daily: 'wordshift_in_progress_daily',
};

export interface SavedPuzzleState {
  /** Absent/0 = historical board dictionary; 1 = reviewed validity policy. */
  vocabularyVersion?: 0 | 1;
  rows: RowData[];
  activeRowIndex: number;
  selectedLetter: Letter | null;
  gameState: GameState;
  message: string;
  history: MoveDelta[];
  invalidAttempts: number;
  hintsUsed: number;
  /** Paid advice can be replayed after a relaunch without charging again. */
  hintDisclosures?: import('../hooks/usePuzzleGame').HintDisclosure[];
  /** Undos SPENT on this board so far. Optional because it is newer than the
   *  save shape and puzzleSaveState carries no schema version, so a pre-fix row
   *  legitimately has no value (restore falls through to 0 — identical to the
   *  old behaviour, no migration needed). It rides here because it is the third
   *  input to the Flawless tier alongside invalidAttempts and hintsUsed, and it
   *  was the only one of the three that did NOT survive a kill: a player who
   *  undid, force-quit and resumed finished credited with a Flawless Offering
   *  (ribbon, lifetime flawlessCount, the flawless achievements) on a board
   *  that was not flawless. */
  undosUsed?: number;
  undosRemaining: number;
  difficulty: Difficulty;
  currentWordLength: number;
  hint: string;
  solution: PuzzleSolutionStep[] | undefined;
  reverseSolution: PuzzleSolutionStep[] | undefined;
  gameMode: GameMode;
  currentVariant: PuzzleVariant;
  selectedVariant: PuzzleVariant;
  moveDirection: 'down' | 'up';
  /** @deprecated old progressive-reveal blind mode — kept so ancient saves parse. */
  blindRevealedRows?: number[];
  /** Blind Offering modifier active on this board (previews hidden). Restored so
   *  a kill+relaunch can't hand the player a free peek at the previews. */
  blindMode?: boolean;
  /** Undo-limit ("Challenge") modifier active on this board. Restored so a
   *  kill+relaunch keeps the finite undo budget (its remaining count rides in
   *  undosRemaining) instead of silently freeing undos. Stacks with blindMode. */
  undoLimited?: boolean;
  /** Lexicon (rare-word) modifier active on this board. Restored so a
   *  kill+relaunch keeps serving the same rare board (not a common swap). */
  lexiconMode?: boolean;
  /** Speed Shift modifier (the clock) armed on this board. Absent on saves
   *  written before speed became a modifier; restorePuzzleState infers it
   *  from a legacy `currentVariant: 'speed'` there. */
  speedMode?: boolean;
  /** Phase-5 Unbroken Weave mastery mode active on this board. */
  unbrokenWeaveMode?: boolean;
  /** Moved character values already spent by Unbroken Weave. */
  spentLetters?: string[];
  currentPhase: DialoguePhase;
  lastFormedWord: string | null;
  /** Double shift input cycle phase (null for non-double-shift puzzles). */
  doubleShiftPhase?: 'pick1' | 'pick2' | 'drop1' | 'drop2' | null;
  isPlayingDaily: boolean;
  /** Date for daily challenge saves (YYYY-MM-DD). Null for standard puzzles. */
  dailyDate?: string | null;
  /** Keep the original board's competition pool across app updates. */
  dailyBoardVersion?: string;
  /** Preserve first-daily practice eligibility when the process is restarted. */
  dailyEased?: boolean;
  /** Original timing origin, so a resume cannot earn an artificially short rank. */
  dailyStartedAt?: number;
  /** Board came from a friend-shared challenge link. Restored so a kill+relaunch
   *  can't convert a shared board (amber-only) into one that feeds phase progress. */
  isSharedChallenge?: boolean;
  /** THE marked final board (finale-armed serve). Restored so a kill+relaunch
   *  keeps the finale on the board that was served as final — its victory must
   *  still silence the fanfare and fire FINAL_PUZZLE_EVENT. */
  isFinalBoard?: boolean;
  /** Absolute timestamp (ms) when the speed timer expires. Null for non-speed variants. */
  speedTimerExpireAt?: number | null;
  /** Remaining speed-timer seconds at save time. Preferred over
   *  speedTimerExpireAt on restore so backgrounding/relaunch pauses the
   *  clock instead of expiring it (expireAt kept for old saves). */
  speedTimeRemainingSec?: number | null;
  savedAt: number;
}

const saveCache = new Map<PuzzleSaveSlot, SavedPuzzleState>();
const signatures = new Map<PuzzleSaveSlot, string>();
let legacyMigrated = false;
let cacheEpoch = 0;

async function migrateLegacyDaily(): Promise<void> {
  if (legacyMigrated) return;
  const raw = await AsyncStorage.getItem(PUZZLE_SAVE_KEYS.normal);
  let oldState: SavedPuzzleState | null = null;
  try { oldState = raw ? JSON.parse(raw) : null; } catch {
    // Corruption in the normal slot must not disable the independent daily
    // slot, nor prevent an explicit clear/new-board save from recovering it.
  }
  if (raw && oldState?.isPlayingDaily === true) {
    // Write first: interruption can leave two copies, never lose the only one.
    if (!await AsyncStorage.getItem(PUZZLE_SAVE_KEYS.daily)) {
      await AsyncStorage.setItem(PUZZLE_SAVE_KEYS.daily, raw);
    }
    await AsyncStorage.removeItem(PUZZLE_SAVE_KEYS.normal);
    saveCache.delete('normal');
  }
  legacyMigrated = true;
}

async function readSlot(slot: PuzzleSaveSlot): Promise<SavedPuzzleState | null> {
  const cached = saveCache.get(slot);
  if (cached) return cached;
  const raw = await AsyncStorage.getItem(PUZZLE_SAVE_KEYS[slot]);
  if (!raw) return null;
  const state: SavedPuzzleState = JSON.parse(raw);
  if (state.undosRemaining == null) state.undosRemaining = Infinity;
  try {
    const clockRaw = await AsyncStorage.getItem(`${PUZZLE_SAVE_KEYS[slot]}_clock`);
    if (clockRaw) {
      const clock = JSON.parse(clockRaw);
      if (clock?.snapshotSavedAt === state.savedAt && clock.boardId === state.rows[0]?.id && Number.isFinite(clock.remaining) && clock.remaining >= 0) {
        state.speedTimeRemainingSec = clock.remaining;
        state.speedTimerExpireAt = clock.savedAt + clock.remaining * 1000;
      }
    }
  } catch {
    // A damaged/unreadable optional countdown must not discard the full board.
  }
  saveCache.set(slot, state);
  return state;
}

export function savePuzzleState(state: SavedPuzzleState): Promise<void> {
  const slot: PuzzleSaveSlot = state.isPlayingDaily ? 'daily' : 'normal';
  const epoch = cacheEpoch;
  return runTransientStorageOperation(async () => {
    if (epoch !== cacheEpoch) return;
    await migrateLegacyDaily();
    // Clock-only changes have their own tiny durable record. Ignore timestamps
    // for content equality so an unchanged board never re-writes its full JSON.
    const signature = JSON.stringify({ ...state, savedAt: 0, speedTimerExpireAt: null, speedTimeRemainingSec: null });
    if (signatures.get(slot) === signature) return;
    await AsyncStorage.setItem(PUZZLE_SAVE_KEYS[slot], JSON.stringify(state));
    saveCache.set(slot, state);
    signatures.set(slot, signature);
  });
}

/** Persist countdown ticks without serializing rows, solutions and history. */
export function savePuzzleClock(
  remaining: number,
  slot: PuzzleSaveSlot = 'normal',
  boardId?: string,
): Promise<void> {
  const epoch = cacheEpoch;
  return runTransientStorageOperation(async () => {
    if (epoch !== cacheEpoch || !Number.isFinite(remaining) || remaining < 0) return;
    await migrateLegacyDaily();
    const state = await readSlot(slot);
    if (!state || (boardId !== undefined && state.rows[0]?.id !== boardId)) return;
    if (!(state.speedMode || (state.currentVariant as string) === 'speed')) return;
    const savedAt = Date.now();
    await AsyncStorage.setItem(`${PUZZLE_SAVE_KEYS[slot]}_clock`, JSON.stringify({
      snapshotSavedAt: state.savedAt, boardId: state.rows[0]?.id, remaining, savedAt,
    }));
    saveCache.set(slot, { ...state, speedTimeRemainingSec: remaining, speedTimerExpireAt: savedAt + remaining * 1000 });
  });
}

export function loadPuzzleState(slot: PuzzleSaveSlot = 'normal'): Promise<SavedPuzzleState | null> {
  return runTransientStorageOperation(async () => {
    await migrateLegacyDaily();
    return readSlot(slot);
  }).catch(error => {
    console.warn('Failed to load puzzle state:', error);
    return null;
  });
}

/** Drop caches after external writes (cloud restore/reset), including queued old writes. */
export function invalidatePuzzleStateCache(): void {
  cacheEpoch++;
  saveCache.clear();
  signatures.clear();
  legacyMigrated = false;
}

export function clearPuzzleState(slot: PuzzleSaveSlot = 'normal'): Promise<void> {
  return runTransientStorageOperation(async () => {
    await migrateLegacyDaily();
    await AsyncStorage.removeItem(PUZZLE_SAVE_KEYS[slot]);
    // Once the board is gone, a failed optional-clock cleanup must not leave
    // its cached copy resumable (or suppress a later new-board write).
    saveCache.delete(slot);
    signatures.delete(slot);
    await AsyncStorage.removeItem(`${PUZZLE_SAVE_KEYS[slot]}_clock`);
  });
}
