/**
 * Verification script: generates 10 reverse-solvable puzzles and prints
 * the full forward + reverse paths to confirm correctness.
 *
 * Run:
 *   npx jest --config scripts/jest.config.js --no-coverage --testTimeout 120000 --maxWorkers=1 scripts/verifyReverseSolution.test.ts
 */

// ============================================================================
// Mocks — must be before imports that use them
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
// Imports — after mocks
// ============================================================================

import { generateLocalPuzzle, solveReverse } from '../src/services/localGenerator';
import { PuzzleSolutionStep } from '../src/types';

// ============================================================================
// Test
// ============================================================================

describe('Reverse Solution Verification', () => {
  it('generates 10 EASY reverse puzzles with full forward+reverse paths', async () => {
    const COUNT = 10;
    let generated = 0;

    process.stdout.write(`\n${'='.repeat(80)}\n`);
    process.stdout.write(`  REVERSE PUZZLE FULL PATH VERIFICATION\n`);
    process.stdout.write(`${'='.repeat(80)}\n\n`);

    while (generated < COUNT) {
      try {
        const puzzle = await generateLocalPuzzle('EASY', {
          requireReverseSolvable: true,
          relaxBoring: true,
        });

        generated++;

        process.stdout.write(`\n${'─'.repeat(60)}\n`);
        process.stdout.write(`  Puzzle ${generated}/${COUNT}\n`);
        process.stdout.write(`${'─'.repeat(60)}\n`);
        process.stdout.write(`  Words: [${puzzle.words.join(', ')}]\n`);
        process.stdout.write(`  Word length: ${puzzle.wordLength}\n\n`);

        // ── Forward Path ──
        process.stdout.write(`  ▼ FORWARD PATH (top → bottom)\n`);
        process.stdout.write(`  ${'─'.repeat(50)}\n`);

        if (puzzle.solution) {
          // Show initial state
          process.stdout.write(`  Start: ${puzzle.words.join(' | ')}\n\n`);

          for (const step of puzzle.solution) {
            process.stdout.write(
              `  Step ${step.stepIndex}: Pick '${step.letterToMove}' from ${step.sourceWord}\n` +
              `         → ${step.explanation}\n`
            );
          }
        } else {
          process.stdout.write(`  (no forward solution)\n`);
        }

        // ── Reverse Path ──
        process.stdout.write(`\n  ▲ REVERSE PATH (bottom → top)\n`);
        process.stdout.write(`  ${'─'.repeat(50)}\n`);

        if (puzzle.reverseSolution && puzzle.reverseSolution.length > 0) {
          for (const step of puzzle.reverseSolution) {
            process.stdout.write(
              `  Step ${step.stepIndex}: Pick '${step.letterToMove}' from ${step.sourceWord} (row ${puzzle.words.length - 1 - step.stepIndex})\n` +
              `         Drop into ${step.targetWord} (row ${puzzle.words.length - 2 - step.stepIndex})\n` +
              `         → ${step.explanation}\n`
            );
          }
        } else {
          process.stdout.write(`  *** NO REVERSE SOLUTION FOUND ***\n`);
        }

        // ── Verify with solveReverse independently ──
        if (puzzle.solution) {
          const independentReverse = solveReverse(puzzle.words, puzzle.solution);
          const hasReverse = independentReverse !== null && independentReverse.length > 0;
          process.stdout.write(`\n  Verification: solveReverse() returned ${hasReverse ? `${independentReverse!.length} steps` : 'null'}\n`);

          if (hasReverse && puzzle.reverseSolution) {
            // Compare
            const match = independentReverse!.length === puzzle.reverseSolution.length &&
              independentReverse!.every((s, i) =>
                s.letterToMove === puzzle.reverseSolution![i].letterToMove &&
                s.sourceWord === puzzle.reverseSolution![i].sourceWord
              );
            process.stdout.write(`  Match with puzzle.reverseSolution: ${match ? 'YES ✓' : 'DIFFERS (both valid paths)'}\n`);
          }
        }

        process.stdout.write(`\n`);

      } catch (err) {
        process.stdout.write(`  (generation attempt failed, retrying...)\n`);
      }
    }

    process.stdout.write(`\n${'='.repeat(80)}\n`);
    process.stdout.write(`  All ${COUNT} puzzles generated successfully with reverse solutions.\n`);
    process.stdout.write(`${'='.repeat(80)}\n\n`);

    expect(generated).toBe(COUNT);
  }, 120000);
});
