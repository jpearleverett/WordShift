/**
 * HOUSE ASKS — on some standard boards the house quietly asks one small thing
 * of the arrangement: a specific letter must travel ('move'), or must be left
 * untouched ('keep'). Both ask kinds are derived from the board's STORED
 * solution, so every ask is satisfiable by construction: replaying the stored
 * route keeps a 'move' ask (the route moves that letter) and keeps a 'keep'
 * ask (the route never moves that letter). On multi-route boards the ask
 * selects BETWEEN routes, which is the point. Soft-fail: an unkept ask is
 * simply never mentioned again (App.tsx owns that silence).
 *
 * Pure module — no storage, no side effects, deterministic given `rng`.
 * App.tsx owns the roll gate, the indicator badge, and victory evaluation.
 *
 * Letter-CHARACTER semantics throughout: asks name a character ("the E"),
 * never a specific tile, and evaluation compares committed-move characters.
 */

import type { PuzzleSolutionStep } from '../types';

export type HouseAskKind = 'move' | 'keep';

export interface HouseAsk {
  kind: HouseAskKind;
  /** Single uppercase character the ask is about. */
  letter: string;
}

/** Shape of usePuzzleGame's committed-move summary entries. */
export interface CommittedMoveSummary {
  letter: string;
  fromRow: number;
}

/**
 * Derive every sound ask candidate for a board, in deterministic order:
 * 'move' candidates first (unique solution-moved characters, in step order),
 * then 'keep' candidates (unique never-moved characters, in row-scan order).
 *
 * 'keep' candidates are drawn from the NON-final start rows only. In standard
 * play letters only ever travel downward into the next row, so the final row
 * is purely a receiver — its letters cannot move, and asking the player to
 * "leave them be" would be a hollow ask. Documented simplification: a
 * character that appears in BOTH the final row and an earlier row stays a
 * candidate via its earlier appearance (that instance genuinely could travel);
 * only characters whose sole presence is the final row are excluded.
 *
 * Returns [] (no sound candidate) when:
 * - there is no stored solution, or it is empty (an ask derived from nothing
 *   cannot promise satisfiability);
 * - any step is not a plain single-letter standard step (double-shift
 *   `lettersToMove` steps, or a malformed `letterToMove`, make the
 *   never-moved computation unsound — asks are standard-only);
 * - the board has fewer than two start rows (no move can exist).
 */
export function deriveHouseAskCandidates(
  solutionSteps: readonly PuzzleSolutionStep[] | undefined,
  startWords: readonly string[],
): HouseAsk[] {
  if (!solutionSteps || solutionSteps.length === 0) return [];
  if (!startWords || startWords.length < 2) return [];

  // 'move' candidates: characters the stored solution moves, step order,
  // deduplicated on first occurrence.
  const moved: string[] = [];
  for (const step of solutionSteps) {
    if (
      !step ||
      step.lettersToMove !== undefined ||
      typeof step.letterToMove !== 'string' ||
      step.letterToMove.length !== 1
    ) {
      return [];
    }
    const ch = step.letterToMove.toUpperCase();
    if (!moved.includes(ch)) moved.push(ch);
  }
  const movedSet = new Set(moved);

  // 'keep' candidates: characters present in a non-final start row that the
  // stored solution never moves (see final-row note in the doc comment).
  const keep: string[] = [];
  for (let i = 0; i < startWords.length - 1; i++) {
    const word = startWords[i] ?? '';
    for (const raw of word.toUpperCase().split('')) {
      if (!movedSet.has(raw) && !keep.includes(raw)) keep.push(raw);
    }
  }

  return [
    ...moved.map((letter): HouseAsk => ({ kind: 'move', letter })),
    ...keep.map((letter): HouseAsk => ({ kind: 'keep', letter })),
  ];
}

/**
 * Pick one ask for a board, uniformly over all sound candidates. Returns null
 * when no sound candidate exists. Deterministic given `rng` (a single rng()
 * draw indexes the deterministic candidate order from
 * deriveHouseAskCandidates).
 */
export function pickHouseAsk(
  solutionSteps: readonly PuzzleSolutionStep[] | undefined,
  startWords: readonly string[],
  rng: () => number = Math.random,
): HouseAsk | null {
  const candidates = deriveHouseAskCandidates(solutionSteps, startWords);
  if (candidates.length === 0) return null;
  const index = Math.min(
    candidates.length - 1,
    Math.max(0, Math.floor(rng() * candidates.length)),
  );
  return candidates[index];
}

/**
 * Whether the ask was kept, judged against the committed move history
 * (character semantics, case-insensitive):
 * - 'move' is kept iff SOME committed move's letter matches the ask letter;
 * - 'keep' is kept iff NO committed move's letter matches the ask letter.
 * An empty history therefore keeps a 'keep' ask and fails a 'move' ask
 * (though in practice a completed board always has committed moves).
 */
export function evaluateHouseAsk(
  ask: HouseAsk,
  moveHistorySummary: readonly CommittedMoveSummary[],
): boolean {
  const letter = ask.letter.toUpperCase();
  const movedIt = moveHistorySummary.some(
    (m) => (m.letter ?? '').toUpperCase() === letter,
  );
  return ask.kind === 'move' ? movedIt : !movedIt;
}
