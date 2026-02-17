/**
 * Offline puzzle bank generator for WordShift — Reverse Variant EASY mode.
 *
 * Generates EASY-difficulty reverse-solvable puzzles (4-letter words, 3 rows)
 * one phase at a time, writing intermediate results to JSON files. Supports incremental
 * accumulation — re-run the same phase command and it picks up where it left off.
 * A final merge step combines all phases into src/data/puzzleBankReverseEasy.ts.
 *
 * EASY uses 4-letter words with 3 rows (2 moves), so generation is very fast.
 *
 * Run single phase batch:
 *   npx jest --config scripts/jest.config.js --no-coverage --testTimeout 600000 --maxWorkers=1 -t "phase 0" scripts/generateReverseEasyPuzzleBank.test.ts
 *
 * Run all phases sequentially:
 *   for p in 0 1 2 3 4; do npx jest --config scripts/jest.config.js --no-coverage --testTimeout 600000 --maxWorkers=1 -t "phase $p" scripts/generateReverseEasyPuzzleBank.test.ts; done
 *
 * Merge all phases into final TypeScript file:
 *   npx jest --config scripts/jest.config.js --no-coverage --testTimeout 30000 --maxWorkers=1 -t "merge" scripts/generateReverseEasyPuzzleBank.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// Mocks — must be before imports that use them
// ============================================================================

const generatedHistory: string[][] = [];
let mockPhase = 0;

jest.mock('../src/services/amberCurrency', () => ({
  getCurrentPhase: jest.fn(async () => mockPhase),
  getFullProgress: jest.fn(async () => ({ puzzlesSolved: 999 })),
}));

jest.mock('../src/services/wordHistory', () => ({
  getWordHistoryWithRecency: jest.fn(async () => {
    const recencyMap = new Map<string, number>();
    for (let puzzlesAgo = 0; puzzlesAgo < generatedHistory.length; puzzlesAgo++) {
      for (const word of generatedHistory[puzzlesAgo]) {
        if (!recencyMap.has(word)) {
          recencyMap.set(word, puzzlesAgo);
        }
      }
    }
    return recencyMap;
  }),
  calculateFreshnessPenalty: jest.fn((word: string, recencyMap: Map<string, number>) => {
    const puzzlesAgo = recencyMap.get(word);
    if (puzzlesAgo === undefined) return -5;
    if (puzzlesAgo < 15) return 100;
    if (puzzlesAgo < 40) {
      const progress = (puzzlesAgo - 15) / 25;
      return Math.round(50 - (progress * 40));
    }
    return 0;
  }),
  isInHardCooldown: jest.fn((word: string, recencyMap: Map<string, number>) => {
    const puzzlesAgo = recencyMap.get(word);
    return puzzlesAgo !== undefined && puzzlesAgo < 15;
  }),
  recordPuzzleWords: jest.fn(async (words: string[]) => {
    generatedHistory.unshift(words.map((w: string) => w.toUpperCase()));
    if (generatedHistory.length > 100) generatedHistory.length = 100;
  }),
}));

// ============================================================================
// Imports — after mocks
// ============================================================================

import { generateLocalPuzzle, isDreadWord, getWordPhaseTier, getSemanticCluster, solveReverse } from '../src/services/localGenerator';
import { PreGeneratedPuzzle } from '../src/data/puzzleBankTypes';

// ============================================================================
// Configuration
// ============================================================================

const PHASE_TARGETS: Record<number, number> = {
  0: 125,
  1: 100,
  2: 100,
  3: 100,
  4: 75,
};

const TOTAL_TARGET = Object.values(PHASE_TARGETS).reduce((a, b) => a + b, 0); // 500

// EASY reverse generates very fast (3 rows, 4-letter words), large batches OK.
const BATCH_SIZE = 50;

const TEMP_DIR = path.join(__dirname, '..', 'src', 'data');

function getTempPath(phase: number): string {
  return path.join(TEMP_DIR, `.reverseBankEasy_phase${phase}.json`);
}

// ============================================================================
// Helpers
// ============================================================================

function puzzleId(words: string[]): string {
  const key = words.join('-');
  return crypto.createHash('md5').update(key).digest('hex').slice(0, 12);
}

function computeDreadTier(words: string[]): number {
  let maxTier = 0;
  for (const word of words) {
    const tier = getWordPhaseTier(word);
    if (tier > maxTier) maxTier = tier;
  }
  return maxTier;
}

function computeDreadWordCount(words: string[]): number {
  return words.filter(w => isDreadWord(w)).length;
}

function computeSemanticTags(words: string[]): string[] {
  const tags = new Set<string>();
  for (const word of words) {
    const cluster = getSemanticCluster(word);
    if (cluster) tags.add(cluster);
  }
  return [...tags];
}

function serializeSteps(steps: import('../src/types').PuzzleSolutionStep[]): string {
  return steps.map(s => {
    const insertPos = s.insertionPosition !== undefined ? `,insertionPosition:${s.insertionPosition}` : '';
    const removePos = s.removalPosition !== undefined ? `,removalPosition:${s.removalPosition}` : '';
    return `{stepIndex:${s.stepIndex},sourceWord:'${s.sourceWord}',targetWord:'${s.targetWord}',letterToMove:'${s.letterToMove}',explanation:\`${s.explanation}\`${insertPos}${removePos}}`;
  }).join(',');
}

function serializePuzzle(p: PreGeneratedPuzzle): string {
  const solutionStr = serializeSteps(p.solution);
  const reverseSolutionStr = p.reverseSolution ? `,reverseSolution:[${serializeSteps(p.reverseSolution)}]` : '';

  return `{id:'${p.id}',words:[${p.words.map(w => `'${w}'`).join(',')}],solution:[${solutionStr}]${reverseSolutionStr},wordLength:${p.wordLength},qualityScore:${p.qualityScore},dreadTier:${p.dreadTier},dreadWordCount:${p.dreadWordCount},allWords:[${p.allWords.map(w => `'${w}'`).join(',')}],semanticTags:[${p.semanticTags.map(t => `'${t}'`).join(',')}]}`;
}

function loadExistingPuzzles(phase: number): PreGeneratedPuzzle[] {
  const tempPath = getTempPath(phase);
  const backupPath = tempPath + '.bak';

  // Try primary file first
  if (fs.existsSync(tempPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(tempPath, 'utf-8')) as PreGeneratedPuzzle[];
      if (data.length > 0) return data;
    } catch {
      // Primary corrupted — fall through to backup
    }
  }

  // Try backup if primary is missing or corrupted
  if (fs.existsSync(backupPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8')) as PreGeneratedPuzzle[];
      if (data.length > 0) {
        // Restore backup as primary
        fs.copyFileSync(backupPath, tempPath);
        process.stdout.write(`  Phase ${phase}: restored ${data.length} puzzles from backup\n`);
        return data;
      }
    } catch {
      // Backup also corrupted
    }
  }

  return [];
}

function savePuzzles(phase: number, puzzles: PreGeneratedPuzzle[]): void {
  const tempPath = getTempPath(phase);
  const backupPath = tempPath + '.bak';
  const writePath = tempPath + '.tmp';

  // Atomic write: write to .tmp, then rename (rename is atomic on Linux)
  fs.writeFileSync(writePath, JSON.stringify(puzzles, null, 2), 'utf-8');

  // Keep previous good version as backup before overwriting
  if (fs.existsSync(tempPath)) {
    fs.copyFileSync(tempPath, backupPath);
  }

  fs.renameSync(writePath, tempPath);
}

async function generateBatch(phase: number, target: number, existing: PreGeneratedPuzzle[]): Promise<PreGeneratedPuzzle[]> {
  mockPhase = phase;

  // Seed word history from recent existing puzzles for diversity.
  generatedHistory.length = 0;
  const recentExisting = existing.slice(-15);
  for (const p of recentExisting) {
    generatedHistory.push(p.words.map(w => w.toUpperCase()));
  }

  // Track existing chain keys to avoid duplicates
  const seenChains = new Set<string>();
  for (const p of existing) {
    seenChains.add(p.words.join('-'));
  }

  const remaining = target - existing.length;
  const batchTarget = Math.min(remaining, BATCH_SIZE);

  if (batchTarget <= 0) {
    process.stdout.write(`  Phase ${phase}: already at target (${existing.length}/${target})\n`);
    return [];
  }

  // Work with a mutable copy so we can save incrementally
  const accumulated = [...existing];
  const newPuzzles: PreGeneratedPuzzle[] = [];
  let attempts = 0;
  let failures = 0;
  const maxAttempts = batchTarget * 8;

  process.stdout.write(`\nPhase ${phase}: generating batch of ${batchTarget} EASY reverse (${existing.length}/${target} existing)...\n`);

  while (newPuzzles.length < batchTarget && attempts < maxAttempts) {
    attempts++;

    try {
      const puzzle = await generateLocalPuzzle('EASY', {
        requireReverseSolvable: true,
        relaxBoring: true,
      });
      const chainKey = puzzle.words.join('-');

      if (seenChains.has(chainKey)) continue;
      seenChains.add(chainKey);

      const id = puzzleId(puzzle.words);
      const dreadTier = computeDreadTier(puzzle.words);
      const dreadWordCount = computeDreadWordCount(puzzle.words);
      const allWords = [...new Set(puzzle.words.map(w => w.toUpperCase()))];
      const semanticTags = computeSemanticTags(puzzle.words);

      // Solve reverse path for hint support during reverse leg
      const reverseSolutionSteps = puzzle.reverseSolution
        ?? (puzzle.solution ? solveReverse(puzzle.words, puzzle.solution) : null);

      const newPuzzle: PreGeneratedPuzzle = {
        id,
        words: puzzle.words,
        solution: puzzle.solution || [],
        reverseSolution: reverseSolutionSteps ?? undefined,
        wordLength: puzzle.wordLength || 4,
        qualityScore: 50,
        dreadTier,
        dreadWordCount,
        allWords,
        semanticTags,
      };

      newPuzzles.push(newPuzzle);
      accumulated.push(newPuzzle);

      // Save immediately after each puzzle so progress survives crashes
      savePuzzles(phase, accumulated);

      const total = accumulated.length;
      process.stdout.write(`  Phase ${phase}: ${total}/${target} (+${newPuzzles.length} this batch, attempt ${attempts})\n`);
    } catch (err) {
      failures++;
    }

    // Force GC between puzzles to prevent heap fragmentation crashes
    if (typeof globalThis.gc === 'function') {
      globalThis.gc();
    }
  }

  process.stdout.write(`  Phase ${phase}: batch done — +${newPuzzles.length} new (${failures} failures)\n`);
  return newPuzzles;
}

// ============================================================================
// Per-phase generation tests (run one at a time; re-run to accumulate)
// ============================================================================

describe('Reverse EASY Puzzle Bank Generator', () => {
  for (const [phaseStr, target] of Object.entries(PHASE_TARGETS)) {
    const phase = parseInt(phaseStr);

    it(`generates phase ${phase} reverse EASY puzzles`, async () => {
      const existing = loadExistingPuzzles(phase);

      if (existing.length >= target) {
        process.stdout.write(`Phase ${phase}: already complete (${existing.length}/${target})\n`);
        expect(existing.length).toBeGreaterThanOrEqual(target);
        return;
      }

      const newPuzzles = await generateBatch(phase, target, existing);
      // generateBatch saves incrementally, so reload to get accurate count
      const combined = loadExistingPuzzles(phase);
      process.stdout.write(`Phase ${phase}: saved ${combined.length}/${target} total to temp file\n`);

      // Always pass — incremental progress is fine
      expect(combined.length).toBeGreaterThan(existing.length);
    }, 600000);
  }

  // ============================================================================
  // Merge step: combine all phase JSON files into the final TypeScript file
  // ============================================================================

  it('merges all phases into puzzleBankReverseEasy.ts', () => {
    const allPuzzles: PreGeneratedPuzzle[] = [];
    let allComplete = true;

    for (const phase of [0, 1, 2, 3, 4]) {
      const tempPath = getTempPath(phase);
      if (fs.existsSync(tempPath)) {
        const data = JSON.parse(fs.readFileSync(tempPath, 'utf-8')) as PreGeneratedPuzzle[];
        allPuzzles.push(...data);
        const target = PHASE_TARGETS[phase];
        const status = data.length >= target ? 'COMPLETE' : `${data.length}/${target}`;
        process.stdout.write(`Phase ${phase}: loaded ${data.length} puzzles [${status}]\n`);
        if (data.length < target) allComplete = false;
      } else {
        process.stdout.write(`Phase ${phase}: no data file found\n`);
        allComplete = false;
      }
    }

    process.stdout.write(`\n=== Total: ${allPuzzles.length}/${TOTAL_TARGET} puzzles ===\n`);

    if (!allComplete) {
      process.stdout.write(`WARNING: Not all phases are complete. Run more batches before merging.\n`);
    }

    // Distribution report
    const tierCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const p of allPuzzles) {
      tierCounts[p.dreadTier] = (tierCounts[p.dreadTier] || 0) + 1;
    }
    process.stdout.write(`Dread tier distribution:\n`);
    for (const [tier, count] of Object.entries(tierCounts)) {
      process.stdout.write(`  Tier ${tier}: ${count} puzzles\n`);
    }

    // Write output file
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'puzzleBankReverseEasy.ts');

    const fileContent = `// AUTO-GENERATED by scripts/generateReverseEasyPuzzleBank.test.ts
// Do not edit manually. Re-run the generator to update.
// Generated: ${new Date().toISOString()}
// Total puzzles: ${allPuzzles.length}
// All puzzles validated as reverse-solvable (requireReverseSolvable: true)
// Difficulty: EASY (4-letter words, 3 rows)

import { PreGeneratedPuzzle } from './puzzleBankTypes';

export const PUZZLE_BANK_REVERSE_EASY: PreGeneratedPuzzle[] = [
${allPuzzles.map(p => '  ' + serializePuzzle(p)).join(',\n')}
];
`;

    fs.writeFileSync(outputPath, fileContent, 'utf-8');
    process.stdout.write(`\nWrote ${allPuzzles.length} puzzles to ${outputPath}\n`);

    // Clean up temp files only if all complete
    if (allComplete) {
      for (const phase of [0, 1, 2, 3, 4]) {
        const tempPath = getTempPath(phase);
        const backupPath = tempPath + '.bak';
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }
      }
      process.stdout.write(`Cleaned up temp files.\n`);
    }

    expect(allPuzzles.length).toBeGreaterThanOrEqual(Math.floor(TOTAL_TARGET * 0.5));
  }, 30000);
});
