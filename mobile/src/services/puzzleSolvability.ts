/**
 * Exhaustive solvability checking for puzzle chains under the SHIPPED game
 * rules — the single source of truth used by the bank CI guard
 * (bankSolvability.test.ts) and the one-time bank purge.
 *
 * Rules mirrored from usePuzzleGame.handleSlotPress exactly:
 * - A move picks an UNLOCKED letter from the active row; removing it must
 *   leave a valid word (dictionary lookup only), and inserting it at any
 *   position of the target row must form a valid word.
 * - Every dropped letter is inserted with isLocked=true. On the standard
 *   forward leg the target row's lock map is REPLACED (only the just-moved
 *   letter stays locked); on the reverse return leg and in double shift the
 *   locks are CUMULATIVE (existing locks are preserved).
 * - Standard/double-shift complete when the move from row rows.length-2
 *   commits. Reverse descends to the last row, flips, and completes when the
 *   ascent move into row 0 commits.
 * - Double shift: the first drop (drop1) commits with NO validation, and the
 *   final source (minus both letters) + final target (plus both letters)
 *   must be valid at drop2.
 *
 * Everything here is pure and dependency-free (no RN imports) so it runs in
 * Node scripts and jest alike.
 */

export type SolvabilityResult = 'solvable' | 'unsolvable' | 'inconclusive';

interface Cell {
  ch: string;
  locked: boolean;
}

const toCells = (word: string): Cell[] =>
  word.split('').map(ch => ({ ch, locked: false }));

const rowWord = (row: Cell[]): string => row.map(c => c.ch).join('');

/** Default node budget per puzzle — far above anything a real chain needs. */
const DEFAULT_NODE_CAP = 500_000;

/**
 * Standard chain: rows.length-1 forward moves, one letter each. The received
 * letter is locked when its row becomes the source.
 */
export function isStandardChainSolvable(
  words: string[],
  isValid: (w: string) => boolean,
  nodeCap: number = DEFAULT_NODE_CAP,
): SolvabilityResult {
  const n = words.length;
  let nodes = 0;
  let capped = false;

  function go(rows: Cell[][], active: number): boolean {
    if (++nodes > nodeCap) { capped = true; return false; }
    const src = rows[active];
    const tgt = rows[active + 1];
    for (let i = 0; i < src.length; i++) {
      if (src[i].locked) continue;
      const remaining = src.filter((_, k) => k !== i);
      if (!isValid(rowWord(remaining))) continue;
      for (let j = 0; j <= tgt.length; j++) {
        const nextTgt = [
          ...tgt.slice(0, j).map(c => ({ ...c, locked: false })),
          { ch: src[i].ch, locked: true },
          ...tgt.slice(j).map(c => ({ ...c, locked: false })),
        ];
        if (!isValid(rowWord(nextTgt))) continue;
        if (active === n - 2) return true; // completing move
        const nextRows = rows.slice();
        nextRows[active] = remaining;
        nextRows[active + 1] = nextTgt;
        if (go(nextRows, active + 1)) return true;
      }
    }
    return false;
  }

  const ok = go(words.map(toCells), 0);
  if (ok) return 'solvable';
  return capped ? 'inconclusive' : 'unsolvable';
}

/**
 * Reverse chain: descend rows 0..n-1 (standard lock semantics), then ascend
 * back with CUMULATIVE locking; completes when the move into row 0 commits.
 */
export function isReverseChainSolvable(
  words: string[],
  isValid: (w: string) => boolean,
  nodeCap: number = DEFAULT_NODE_CAP,
): SolvabilityResult {
  const n = words.length;
  let nodes = 0;
  let capped = false;

  function go(rows: Cell[][], active: number, dir: 'down' | 'up'): boolean {
    if (++nodes > nodeCap) { capped = true; return false; }
    const tgtIdx = dir === 'down' ? active + 1 : active - 1;
    const src = rows[active];
    const tgt = rows[tgtIdx];
    for (let i = 0; i < src.length; i++) {
      if (src[i].locked) continue;
      const remaining = src.filter((_, k) => k !== i);
      if (!isValid(rowWord(remaining))) continue;
      for (let j = 0; j <= tgt.length; j++) {
        const cumulative = dir === 'up';
        const nextTgt = [
          ...tgt.slice(0, j).map(c => ({ ...c, locked: cumulative ? c.locked : false })),
          { ch: src[i].ch, locked: true },
          ...tgt.slice(j).map(c => ({ ...c, locked: cumulative ? c.locked : false })),
        ];
        if (!isValid(rowWord(nextTgt))) continue;
        if (dir === 'up' && tgtIdx === 0) return true; // completing move
        const nextRows = rows.slice();
        nextRows[active] = remaining;
        nextRows[tgtIdx] = nextTgt;
        if (dir === 'down') {
          if (active === n - 2) {
            // Midpoint: flip to the ascent, starting from the last row.
            if (go(nextRows, n - 1, 'up')) return true;
          } else if (go(nextRows, active + 1, 'down')) {
            return true;
          }
        } else if (go(nextRows, active - 1, 'up')) {
          return true;
        }
      }
    }
    return false;
  }

  const ok = go(words.map(toCells), 0, 'down');
  if (ok) return 'solvable';
  return capped ? 'inconclusive' : 'unsolvable';
}

/**
 * Double shift: each step moves TWO letters from the active row into the next
 * (drop1 unvalidated, both words valid at drop2, both letters locked in the
 * target). Completes when the step from row rows.length-2 commits.
 */
export function isDoubleShiftChainSolvable(
  words: string[],
  isValid: (w: string) => boolean,
  nodeCap: number = DEFAULT_NODE_CAP,
): SolvabilityResult {
  const n = words.length;
  let nodes = 0;
  let capped = false;

  function go(rows: Cell[][], active: number): boolean {
    if (++nodes > nodeCap) { capped = true; return false; }
    const src = rows[active];
    const tgt = rows[active + 1];
    // Ordered pair (a first, b second) of distinct unlocked source letters.
    for (let a = 0; a < src.length; a++) {
      if (src[a].locked) continue;
      const afterA = src.filter((_, k) => k !== a);
      for (let b = 0; b < afterA.length; b++) {
        if (afterA[b].locked) continue;
        const finalSource = afterA.filter((_, k) => k !== b);
        // Final-source validity prunes before position enumeration (cheap).
        if (!isValid(rowWord(finalSource))) continue;
        for (let i = 0; i <= tgt.length; i++) {
          const intermediate = [
            ...tgt.slice(0, i).map(c => ({ ...c, locked: c.locked })),
            { ch: src[a].ch, locked: true },
            ...tgt.slice(i).map(c => ({ ...c, locked: c.locked })),
          ];
          for (let j = 0; j <= intermediate.length; j++) {
            const finalTarget = [
              ...intermediate.slice(0, j),
              { ch: afterA[b].ch, locked: true },
              ...intermediate.slice(j),
            ];
            if (!isValid(rowWord(finalTarget))) continue;
            if (active === n - 2) return true; // completing step
            const nextRows = rows.slice();
            nextRows[active] = finalSource;
            nextRows[active + 1] = finalTarget;
            if (go(nextRows, active + 1)) return true;
          }
        }
      }
    }
    return false;
  }

  const ok = go(words.map(toCells), 0);
  if (ok) return 'solvable';
  return capped ? 'inconclusive' : 'unsolvable';
}

/** Dispatcher keyed on the bank's variant family. */
export function isChainSolvable(
  variant: 'standard' | 'reverse' | 'double_shift',
  words: string[],
  isValid: (w: string) => boolean,
  nodeCap?: number,
): SolvabilityResult {
  if (variant === 'reverse') return isReverseChainSolvable(words, isValid, nodeCap);
  if (variant === 'double_shift') return isDoubleShiftChainSolvable(words, isValid, nodeCap);
  return isStandardChainSolvable(words, isValid, nodeCap);
}
