export interface PuzzleBranchingMetrics {
  /** Number of complete standard-rule paths, saturated at pathCap. */
  completePathCount: number;
  /** Number of distinct reachable decision states explored, saturated at stateCap. */
  stateCount: number;
  /** Fraction of solvable decision states that have exactly one completing choice. */
  singleChoiceFraction: number;
  /**
   * Fraction of visited SOLVABLE decision states where the number of legal
   * moves exceeds the number of completing moves — i.e. a plausible wrong
   * turn exists at that step. This is the look-ahead reward signal: a trap
   * step only punishes players who commit without reading ahead.
   */
  trapStepFraction: number;
  /**
   * Fraction of ALL reachable states with zero completing moves (dead ends a
   * player can actually wander into). Reverse mode's depth comes from ~16%
   * dead-end states; standard banks average ~3.7%.
   */
  deadEndStateFraction: number;
  /** Bounded score contribution favoring alternate completing paths. */
  structuralBonus: number;
}

export interface PuzzleBranchingOptions {
  pathCap?: number;
  stateCap?: number;
}

interface Cell {
  char: string;
  locked: boolean;
}

const DEFAULT_PATH_CAP = 64;
const DEFAULT_STATE_CAP = 4_000;
// Raised 12 -> 15 for the trap-depth pass: a board already maxing path +
// choice diversity (12) can still gain up to the trap weight, so depth with
// traps genuinely outranks depth without.
const STRUCTURAL_BONUS_CAP = 15;
// Modest additive weight for trap presence (max +3 at trapStepFraction 1.0).
// Applied ONLY to multi-route boards: a trap with no alternate completing
// route is just frustration, so a single-route board never gains it.
const TRAP_BONUS_WEIGHT = 3;

function toCells(word: string): Cell[] {
  return word.split('').map(char => ({ char, locked: false }));
}

function rowWord(row: Cell[]): string {
  return row.map(cell => cell.char).join('');
}

function stateKey(rows: Cell[][], activeRow: number): string {
  return `${activeRow}|${rows
    .slice(activeRow)
    .map(row => row.map(cell => `${cell.char}${cell.locked ? '1' : '0'}`).join(''))
    .join('|')}`;
}

/**
 * Exhaustively analyzes a standard puzzle under the shipped pick/drop and
 * replacement-lock rules. Counts and work are capped so it is safe to use
 * during synchronous bank selection. Trap/dead-end awareness is computed
 * during the SAME traversal (no second pass): every visited state already
 * enumerates its legal moves, so counting how many of them complete is free.
 */
export function analyzeStandardBranching(
  words: string[],
  isValidWord: (word: string) => boolean,
  options: PuzzleBranchingOptions = {},
): PuzzleBranchingMetrics {
  if (words.length < 2) {
    return {
      completePathCount: 0,
      stateCount: 0,
      singleChoiceFraction: 1,
      trapStepFraction: 0,
      deadEndStateFraction: 0,
      structuralBonus: 0,
    };
  }

  const pathCap = Math.max(1, Math.floor(options.pathCap ?? DEFAULT_PATH_CAP));
  const stateCap = Math.max(1, Math.floor(options.stateCap ?? DEFAULT_STATE_CAP));
  const memo = new Map<string, number>();
  let stateCount = 0;
  let solvableDecisionStates = 0;
  let singleChoiceStates = 0;
  let trapStates = 0;
  let deadEndStates = 0;

  function countPaths(rows: Cell[][], activeRow: number): number {
    const key = stateKey(rows, activeRow);
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    if (stateCount >= stateCap) return 0;
    stateCount++;

    const source = rows[activeRow];
    const target = rows[activeRow + 1];
    const isFinalMove = activeRow === rows.length - 2;
    let completePaths = 0;
    let legalChoices = 0;
    let completingChoices = 0;
    // Dedupe by DISTINCT outcome, not by (removeAt, insertAt) index pair: two
    // mechanically-different moves that leave the identical board (e.g.
    // removing either 'O' from MOON, or inserting a letter beside its twin)
    // are the SAME choice to the player and must count once. Without this, a
    // repeated letter fakes multi-route (completePathCount 1->2,
    // singleChoiceFraction 1->0.5) with zero real decision. Signature captures
    // char + lock flag of both resulting rows, so genuinely different lock
    // positions (which constrain the future differently) still count apart.
    const seenOutcomes = new Set<string>();
    const cellSig = (cells: Cell[]): string =>
      cells.map(cell => `${cell.char}${cell.locked ? '1' : '0'}`).join('');

    for (let removeAt = 0; removeAt < source.length; removeAt++) {
      if (source[removeAt].locked) continue;
      const remaining = source.filter((_, index) => index !== removeAt);
      if (!isValidWord(rowWord(remaining))) continue;

      for (let insertAt = 0; insertAt <= target.length; insertAt++) {
        const nextTarget: Cell[] = [
          ...target.slice(0, insertAt).map(cell => ({ ...cell, locked: false })),
          { char: source[removeAt].char, locked: true },
          ...target.slice(insertAt).map(cell => ({ ...cell, locked: false })),
        ];
        if (!isValidWord(rowWord(nextTarget))) continue;

        const outcomeSig = `${cellSig(remaining)}>${cellSig(nextTarget)}`;
        if (seenOutcomes.has(outcomeSig)) continue;
        seenOutcomes.add(outcomeSig);

        legalChoices++;

        let pathsFromChoice = 1;
        if (!isFinalMove) {
          const nextRows = rows.slice();
          nextRows[activeRow] = remaining;
          nextRows[activeRow + 1] = nextTarget;
          pathsFromChoice = countPaths(nextRows, activeRow + 1);
        }

        if (pathsFromChoice > 0) {
          completingChoices++;
          completePaths = Math.min(pathCap, completePaths + pathsFromChoice);
        }
      }
    }

    if (completingChoices > 0) {
      solvableDecisionStates++;
      if (completingChoices === 1) singleChoiceStates++;
      if (legalChoices > completingChoices) trapStates++;
    } else {
      deadEndStates++;
    }

    memo.set(key, completePaths);
    return completePaths;
  }

  const completePathCount = countPaths(words.map(toCells), 0);
  const singleChoiceFraction = solvableDecisionStates > 0
    ? singleChoiceStates / solvableDecisionStates
    : 1;
  const trapStepFraction = solvableDecisionStates > 0
    ? trapStates / solvableDecisionStates
    : 0;
  const deadEndStateFraction = stateCount > 0
    ? deadEndStates / stateCount
    : 0;

  if (completePathCount === 0) {
    return {
      completePathCount,
      stateCount,
      singleChoiceFraction,
      trapStepFraction,
      deadEndStateFraction,
      structuralBonus: 0,
    };
  }

  const pathDiversity = Math.min(8, Math.log2(completePathCount) * 2);
  const choiceDiversity = (1 - singleChoiceFraction) * 4;
  // Trap depth only counts when an alternate completing route exists; on a
  // single-route board the "trap" is pure frustration and earns nothing.
  const trapDepth = completePathCount >= 2
    ? trapStepFraction * TRAP_BONUS_WEIGHT
    : 0;
  const structuralBonus = Math.min(
    STRUCTURAL_BONUS_CAP,
    pathDiversity + choiceDiversity + trapDepth,
  );

  return {
    completePathCount,
    stateCount,
    singleChoiceFraction,
    trapStepFraction,
    deadEndStateFraction,
    structuralBonus,
  };
}
