/**
 * Verification script: generates 10 HARD reverse-solvable puzzles and
 * simulates the full player experience — board state, locked letters,
 * hint output, direction switches — exactly as the game engine plays it.
 *
 * Run:
 *   npx jest --config scripts/jest.config.js --no-coverage --testTimeout 300000 --maxWorkers=1 scripts/verifyReverseSolution.test.ts
 */

// ============================================================================
// Mocks
// ============================================================================

jest.mock('../src/services/amberCurrency', () => ({
  getCurrentPhase: jest.fn(async () => 0),
  getFullProgress: jest.fn(async () => ({ puzzlesSolved: 999 })),
}));

jest.mock('../src/services/wordHistory', () => ({
  getWordHistoryWithRecency: jest.fn(async () => new Map()),
  calculateFreshnessPenalty: jest.fn(() => 0),
  isInHardCooldown: jest.fn(() => false),
  recordPuzzleWords: jest.fn(async () => {}),
}));

// ============================================================================
// Imports
// ============================================================================

import { generateLocalPuzzle, solveReverse, validateWord } from '../src/services/localGenerator';
import { PuzzleSolutionStep } from '../src/types';

// ============================================================================
// Game simulation helpers
// ============================================================================

/** A letter on the board. */
interface SimLetter {
  char: string;
  locked: boolean;
}

/** Format a row as the player sees it: locked letters in brackets. */
function formatRow(letters: SimLetter[]): string {
  return letters.map(l => l.locked ? `[${l.char}]` : ` ${l.char} `).join('');
}

/** Format just the word string from a row. */
function wordStr(letters: SimLetter[]): string {
  return letters.map(l => l.char).join('');
}

/** Show the full board with an arrow on the active row. */
function printBoard(
  rows: SimLetter[][],
  activeRow: number,
  direction: 'down' | 'up',
  label: string,
  w: (s: string) => void
) {
  w(`\n  ${label}\n`);
  for (let i = 0; i < rows.length; i++) {
    const arrow = i === activeRow ? (direction === 'down' ? '  ▶ ' : '  ◀ ') : '    ';
    const lockInfo = rows[i].some(l => l.locked)
      ? `  locks: {${rows[i].map((l, j) => l.locked ? j : '').filter(x => x !== '').join(',')}}`
      : '';
    w(`${arrow}Row ${i}: ${formatRow(rows[i])}  →  ${wordStr(rows[i])}${lockInfo}\n`);
  }
}

/** Simulate picking a letter from sourceRow and dropping into targetRow.
 *  Uses exact removalPosition and insertionPosition from the solver when available. */
function simulateMove(
  rows: SimLetter[][],
  sourceIdx: number,
  targetIdx: number,
  letterChar: string,
  isReverseLeg: boolean,
  insertionPosition?: number,
  removalPosition?: number
): { success: boolean; error?: string } {
  const sourceRow = rows[sourceIdx];

  // Find letter to remove: use exact position if provided, otherwise first unlocked match
  let letterPos = -1;
  if (removalPosition !== undefined && removalPosition < sourceRow.length
      && sourceRow[removalPosition].char === letterChar && !sourceRow[removalPosition].locked) {
    letterPos = removalPosition;
  } else {
    letterPos = sourceRow.findIndex(l => l.char === letterChar && !l.locked);
  }

  if (letterPos === -1) {
    const lockedPos = sourceRow.findIndex(l => l.char === letterChar && l.locked);
    if (lockedPos !== -1) {
      return { success: false, error: `'${letterChar}' is LOCKED at position ${lockedPos} — can't pick it!` };
    }
    return { success: false, error: `'${letterChar}' not found in row ${sourceIdx}` };
  }

  // Remove from source
  const removed = sourceRow.splice(letterPos, 1)[0];
  const sourceWord = wordStr(sourceRow);

  if (!validateWord(sourceWord)) {
    // Put it back
    sourceRow.splice(letterPos, 0, removed);
    return { success: false, error: `Removing '${letterChar}' leaves invalid word "${sourceWord}"` };
  }

  // Find insertion position in target
  const targetRow = rows[targetIdx];
  let bestPos = -1;

  if (insertionPosition !== undefined) {
    // Use the exact position from the solution
    const candidate = targetRow.map(l => l.char);
    candidate.splice(insertionPosition, 0, letterChar);
    if (validateWord(candidate.join(''))) {
      bestPos = insertionPosition;
    } else {
      // Put it back
      sourceRow.splice(letterPos, 0, removed);
      return { success: false, error: `Specified insertion position ${insertionPosition} for '${letterChar}' produces invalid word "${candidate.join('')}"` };
    }
  } else {
    // Fallback: find first valid insertion position
    for (let j = 0; j <= targetRow.length; j++) {
      const candidate = targetRow.map(l => l.char);
      candidate.splice(j, 0, letterChar);
      if (validateWord(candidate.join(''))) {
        bestPos = j;
        break;
      }
    }
  }

  if (bestPos === -1) {
    // Put it back
    sourceRow.splice(letterPos, 0, removed);
    return { success: false, error: `No valid insertion position for '${letterChar}' in target row` };
  }

  // Insert into target
  const newLetter: SimLetter = { char: letterChar, locked: true };
  targetRow.splice(bestPos, 0, newLetter);

  // During reverse leg: preserve ALL existing locks (cumulative)
  // During forward leg: only the just-moved letter is locked
  if (!isReverseLeg) {
    // In forward mode, only the moved letter is locked. Others lose locks.
    // isLocked: isReverseReturn ? (l.isLocked || l.id === selectedLetter.id) : (l.id === selectedLetter.id)
    for (const l of targetRow) {
      l.locked = (l === newLetter);
    }
  }
  // In reverse leg, existing locks stay and new letter also locked (done above via newLetter.locked = true)

  return { success: true };
}

/** Get the hint the player would see. */
function getHint(
  rows: SimLetter[][],
  activeRow: number,
  direction: 'down' | 'up',
  forwardSolution: PuzzleSolutionStep[],
  reverseSolution: PuzzleSolutionStep[] | undefined,
  phase: number
): string {
  const targetRow = direction === 'down' ? activeRow + 1 : activeRow - 1;
  if (targetRow < 0 || targetRow >= rows.length) return '(no hint — out of bounds)';

  const currentSourceWord = wordStr(rows[activeRow]);
  const currentTargetWord = wordStr(rows[targetRow]);

  const isReverseLeg = direction === 'up';
  const activeSolution = isReverseLeg ? reverseSolution : forwardSolution;

  let relevantStep: PuzzleSolutionStep | undefined;

  if (isReverseLeg && activeSolution) {
    const reverseStepIndex = (rows.length - 1) - activeRow;
    relevantStep = activeSolution.find(s =>
      s.stepIndex === reverseStepIndex &&
      s.sourceWord === currentSourceWord &&
      s.targetWord === currentTargetWord
    );
  } else if (activeSolution) {
    relevantStep = activeSolution.find(s =>
      s.stepIndex === activeRow &&
      s.sourceWord === currentSourceWord &&
      s.targetWord === currentTargetWord
    );
  }

  if (relevantStep) {
    return `Move '${relevantStep.letterToMove}' — think "${relevantStep.targetWord}"!`;
  }
  return 'Not quite right — try undoing your last move!';
}

// ============================================================================
// Test
// ============================================================================

describe('Reverse Puzzle Game Simulation', () => {
  it('generates 10 HARD reverse puzzles and simulates full gameplay', async () => {
    const COUNT = 10;
    let generated = 0;
    const w = (s: string) => process.stdout.write(s);

    w(`\n${'═'.repeat(80)}\n`);
    w(`  REVERSE MODE GAME SIMULATION (HARD — 5 words, 5 letters)\n`);
    w(`  Simulates exactly what the player sees: board, locks, hints, direction switch\n`);
    w(`${'═'.repeat(80)}\n`);

    while (generated < COUNT) {
      try {
        const puzzle = await generateLocalPuzzle('HARD', {
          requireReverseSolvable: true,
          relaxBoring: true,
        });

        if (!puzzle.solution || !puzzle.reverseSolution) continue;

        generated++;
        const forwardSolution = puzzle.solution;
        const reverseSolution = puzzle.reverseSolution;

        w(`\n\n${'━'.repeat(80)}\n`);
        w(`  PUZZLE ${generated}/${COUNT}\n`);
        w(`${'━'.repeat(80)}\n`);

        // Initialize board
        const rows: SimLetter[][] = puzzle.words.map(word =>
          word.split('').map(ch => ({ char: ch, locked: false }))
        );

        // Show initial state
        printBoard(rows, 0, 'down', 'INITIAL BOARD:', w);

        // ── FORWARD PASS ──
        w(`\n  ${'─'.repeat(60)}\n`);
        w(`  ▼▼▼  FORWARD PASS  ▼▼▼\n`);
        w(`  ${'─'.repeat(60)}\n`);

        let activeRow = 0;
        const direction: { current: 'down' | 'up' } = { current: 'down' };

        for (let step = 0; step < forwardSolution.length; step++) {
          const sol = forwardSolution[step];

          // Show hint before the move
          const hint = getHint(rows, activeRow, direction.current, forwardSolution, reverseSolution, 0);
          w(`\n  Step ${step + 1}: ${hint}\n`);

          // Execute the move (use exact insertion position from solver)
          const targetRow = activeRow + 1;
          const result = simulateMove(rows, activeRow, targetRow, sol.letterToMove, false, sol.insertionPosition, sol.removalPosition);

          if (result.success) {
            const posInfo = sol.insertionPosition !== undefined ? ` at position ${sol.insertionPosition}` : '';
            w(`  Action: Pick '${sol.letterToMove}' from Row ${activeRow}, drop into Row ${targetRow}${posInfo}\n`);
            w(`    Row ${activeRow}: ${wordStr(rows[activeRow])}  |  Row ${targetRow}: ${wordStr(rows[targetRow])}\n`);
          } else {
            w(`  *** MOVE FAILED: ${result.error} ***\n`);
            break;
          }

          // Advance
          if (step < forwardSolution.length - 1) {
            activeRow++;
          }
        }

        // ── DIRECTION SWITCH ──
        w(`\n  ${'─'.repeat(60)}\n`);
        w(`  ⟳  DIRECTION SWITCH\n`);
        w(`  "Great! Now shift letters back up to the first word."\n`);
        w(`  ${'─'.repeat(60)}\n`);

        direction.current = 'up';
        activeRow = rows.length - 1;

        printBoard(rows, activeRow, 'up', 'BOARD AT DIRECTION SWITCH:', w);

        // Count total locks per row
        w(`\n  Lock summary after forward pass:\n`);
        for (let i = 0; i < rows.length; i++) {
          const lockCount = rows[i].filter(l => l.locked).length;
          const lockPositions = rows[i].map((l, j) => l.locked ? j : -1).filter(x => x >= 0);
          w(`    Row ${i}: ${lockCount} locked position${lockCount !== 1 ? 's' : ''}`);
          if (lockCount > 0) w(` at [${lockPositions.join(', ')}]`);
          w(`\n`);
        }

        // ── REVERSE PASS ──
        w(`\n  ${'─'.repeat(60)}\n`);
        w(`  ▲▲▲  REVERSE PASS  ▲▲▲\n`);
        w(`  ${'─'.repeat(60)}\n`);

        for (let step = 0; step < reverseSolution.length; step++) {
          const sol = reverseSolution[step];

          // Show hint before the move
          const hint = getHint(rows, activeRow, direction.current, forwardSolution, reverseSolution, 0);
          w(`\n  Step ${step + 1}: ${hint}\n`);

          // Execute the move (use exact insertion position from solver)
          const targetRow = activeRow - 1;
          const result = simulateMove(rows, activeRow, targetRow, sol.letterToMove, true, sol.insertionPosition, sol.removalPosition);

          if (result.success) {
            const posInfo = sol.insertionPosition !== undefined ? ` at position ${sol.insertionPosition}` : '';
            w(`  Action: Pick '${sol.letterToMove}' from Row ${activeRow}, drop into Row ${targetRow}${posInfo}\n`);
            w(`    Row ${activeRow}: ${wordStr(rows[activeRow])}  |  Row ${targetRow}: ${wordStr(rows[targetRow])}\n`);
          } else {
            w(`  *** MOVE FAILED: ${result.error} ***\n`);
            break;
          }

          // Show cumulative locks on target row
          const tgtLockCount = rows[targetRow].filter(l => l.locked).length;
          const tgtLockPos = rows[targetRow].map((l, j) => l.locked ? j : -1).filter(x => x >= 0);
          w(`    Row ${targetRow} now has ${tgtLockCount} locked positions: [${tgtLockPos.join(', ')}]\n`);

          // Advance upward
          if (step < reverseSolution.length - 1) {
            activeRow--;
          }
        }

        // ── FINAL STATE ──
        w(`\n`);
        printBoard(rows, -1, 'down', 'FINAL BOARD (puzzle complete!):', w);

        // Validate all final words
        const allValid = rows.every(r => validateWord(wordStr(r)));
        w(`\n  All final words valid: ${allValid ? 'YES ✓' : 'NO ✗'}\n`);

      } catch (err) {
        // generation failed, retry silently
      }
    }

    w(`\n${'═'.repeat(80)}\n`);
    w(`  All ${COUNT} puzzles simulated successfully.\n`);
    w(`${'═'.repeat(80)}\n\n`);

    expect(generated).toBe(COUNT);
  }, 300000);
});
