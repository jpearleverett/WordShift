export interface PuzzleBranchingMetrics {
  /** Number of complete standard-rule paths, saturated at pathCap. */
  completePathCount: number;
  /** Number of distinct reachable decision states explored, saturated at stateCap. */
  stateCount: number;
  /** Fraction of solvable decision states that have exactly one completing choice. */
  singleChoiceFraction: number;
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
const STRUCTURAL_BONUS_CAP = 12;

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
 * during synchronous bank selection.
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
      structuralBonus: 0,
    };
  }

  const pathCap = Math.max(1, Math.floor(options.pathCap ?? DEFAULT_PATH_CAP));
  const stateCap = Math.max(1, Math.floor(options.stateCap ?? DEFAULT_STATE_CAP));
  const memo = new Map<string, number>();
  let stateCount = 0;
  let solvableDecisionStates = 0;
  let singleChoiceStates = 0;

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
    let completingChoices = 0;

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
    }

    memo.set(key, completePaths);
    return completePaths;
  }

  const completePathCount = countPaths(words.map(toCells), 0);
  const singleChoiceFraction = solvableDecisionStates > 0
    ? singleChoiceStates / solvableDecisionStates
    : 1;

  if (completePathCount === 0) {
    return { completePathCount, stateCount, singleChoiceFraction, structuralBonus: 0 };
  }

  const pathDiversity = Math.min(8, Math.log2(completePathCount) * 2);
  const choiceDiversity = (1 - singleChoiceFraction) * 4;
  const structuralBonus = Math.min(
    STRUCTURAL_BONUS_CAP,
    pathDiversity + choiceDiversity,
  );

  return {
    completePathCount,
    stateCount,
    singleChoiceFraction,
    structuralBonus,
  };
}
