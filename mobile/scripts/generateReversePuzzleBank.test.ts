/**
 * Offline puzzle bank generator for WordShift — Reverse Variant HARD mode.
 *
 * Generates HARD-difficulty reverse-solvable puzzles one phase at a time,
 * writing intermediate results to JSON files. Supports incremental
 * accumulation — re-run the same phase command and it picks up where it
 * left off. A final merge step combines all phases into
 * src/data/puzzleBankReverseHard.ts.
 *
 * Uses high-throughput brute-force sampling (~1s/puzzle, 100% success rate).
 *
 * Run single phase batch (generates up to BATCH_SIZE new puzzles, accumulates):
 *   npx jest --config scripts/jest.config.js --no-coverage --testTimeout 600000 --maxWorkers=1 -t "phase 0" scripts/generateReversePuzzleBank.test.ts
 *
 * Run all phases to completion (bash loop):
 *   See scripts/runReverseGenerator.sh
 *
 * Merge all phases into final TypeScript file:
 *   npx jest --config scripts/jest.config.js --no-coverage --testTimeout 30000 --maxWorkers=1 -t "merge" scripts/generateReversePuzzleBank.test.ts
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
  getCurrentPhase: async () => mockPhase,
  getFullProgress: async () => ({ puzzlesSolved: 999 }),
}));

// ============================================================================
// Bank-wide word saturation (diversity fix)
// The old mock reproduced the app's ROLLING recency window (last ~100 puzzles,
// 15-puzzle hard cooldown), which lets the DFS return to the same hub words
// dozens of times across a 500-puzzle bank. This model instead counts, for the
// WHOLE bank, how many accepted puzzles each word (start or formed) appears in:
//   - a word at the cap is treated as hard-cooldown (excluded from starts and
//     chain candidates inside the generator), and
//   - freshness penalties scale with usage so the search prefers unused words.
// The accept loop additionally hard-rejects any candidate puzzle that would
// push a word past the cap (covers formed words the DFS cannot see).
// ============================================================================

const WORD_USAGE_CAP = Number(process.env.BANK_WORD_CAP ?? 4);
const bankWordUsage = new Map<string, number>();

function collectPuzzleWords(puzzle: { words: string[]; solution?: { sourceWord: string; targetWord: string; explanation?: string }[]; reverseSolution?: { sourceWord: string; targetWord: string; explanation?: string }[] }): string[] {
  const seen = new Set<string>();
  for (const w of puzzle.words) seen.add(w.toUpperCase());
  for (const step of [...(puzzle.solution ?? []), ...(puzzle.reverseSolution ?? [])]) {
    if (step.sourceWord) seen.add(String(step.sourceWord).toUpperCase());
    if (step.targetWord) seen.add(String(step.targetWord).toUpperCase());
    const m = /form ([A-Z]+)/.exec(step.explanation ?? '');
    if (m) seen.add(m[1]);
  }
  return [...seen];
}

function exceedsUsageCap(words: string[]): boolean {
  return words.some(w => (bankWordUsage.get(w) ?? 0) >= WORD_USAGE_CAP);
}

function recordUsage(words: string[]): void {
  for (const w of words) bankWordUsage.set(w, (bankWordUsage.get(w) ?? 0) + 1);
}

jest.mock('../src/services/wordHistory', () => ({
  getWordHistoryWithRecency: async () => new Map(bankWordUsage),
  calculateFreshnessPenalty: (word: string, usage: Map<string, number>) => {
    const uses = usage.get(word) ?? 0;
    if (uses === 0) return -5; // small bonus for never-used words
    if (uses >= WORD_USAGE_CAP) return 100;
    return Math.round((uses / WORD_USAGE_CAP) * 85);
  },
  isInHardCooldown: (word: string, usage: Map<string, number>) => (usage.get(word) ?? 0) >= WORD_USAGE_CAP,
  recordPuzzleWords: async () => {}, // usage recorded on ACCEPT in the loop below
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

// Max puzzles to generate per process invocation (prevents OOM on constrained envs).
// Uses global.gc() between puzzles when available (run with --expose-gc).
// Saves incrementally after each puzzle so progress survives crashes.
const BATCH_SIZE = 500; // one-shot: savePuzzles() persists after every puzzle, so crash-resume is intact

const TEMP_DIR = path.join(__dirname, '..', 'src', 'data');

function getTempPath(phase: number): string {
  return path.join(TEMP_DIR, `.reverseBank_phase${phase}.json`);
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
  // Bank-wide word usage is seeded once from all phases in the main loop.

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
  const maxAttempts = batchTarget * 12;

  process.stdout.write(`\nPhase ${phase}: generating batch of ${batchTarget} (${existing.length}/${target} existing)...\n`);

  while (newPuzzles.length < batchTarget && attempts < maxAttempts) {
    attempts++;

    try {
      const puzzle = await generateLocalPuzzle('HARD', {
        requireReverseSolvable: true,
        relaxBoring: true,
      });
      const chainKey = puzzle.words.join('-');

      if (seenChains.has(chainKey)) continue;
      seenChains.add(chainKey);

          // Bank-wide diversity: reject any puzzle that would push a word past the cap
          const puzzleWords = collectPuzzleWords(puzzle);
          if (exceedsUsageCap(puzzleWords)) continue;

      const id = puzzleId(puzzle.words);
      const dreadTier = computeDreadTier(puzzle.words);
      const dreadWordCount = computeDreadWordCount(puzzle.words);
      const allWords = [...new Set(puzzle.words.map(w => w.toUpperCase()))];
      const semanticTags = computeSemanticTags(puzzle.words);

      // Solve reverse path for hint support during reverse leg
      const reverseSolutionSteps = puzzle.reverseSolution
        ?? (puzzle.solution ? solveReverse(puzzle.words, puzzle.solution) : null);

      // Budgeted solveReverse can (rarely) give up on a pathological chain;
      // a reverse-bank puzzle without a reverse hint path is not worth keeping.
      if (!reverseSolutionSteps) continue;

      const newPuzzle: PreGeneratedPuzzle = {
        id,
        words: puzzle.words,
        solution: puzzle.solution || [],
        reverseSolution: reverseSolutionSteps ?? undefined,
        wordLength: puzzle.wordLength || 5,
        qualityScore: 50,
        dreadTier,
        dreadWordCount,
        allWords,
        semanticTags,
      };

      newPuzzles.push(newPuzzle);
          recordUsage(puzzleWords);
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

describe('Reverse Puzzle Bank Generator', () => {
  // Seed bank-wide word usage from every phase's existing progress so resumes
    // keep the cap accurate across the whole bank, not just the current phase.
    bankWordUsage.clear();
    for (const phaseStr of Object.keys(PHASE_TARGETS)) {
      for (const p of loadExistingPuzzles(parseInt(phaseStr))) {
        recordUsage(collectPuzzleWords(p));
      }
    }

    for (const [phaseStr, target] of Object.entries(PHASE_TARGETS)) {
    const phase = parseInt(phaseStr);

    it(`generates phase ${phase} reverse puzzles`, async () => {
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

  it('merges all phases into puzzleBankReverseHard.ts', () => {
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
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'puzzleBankReverseHard.ts');

    const fileContent = `// AUTO-GENERATED by scripts/generateReversePuzzleBank.test.ts
// Do not edit manually. Re-run the generator to update.
// Generated: ${new Date().toISOString()}
// Total puzzles: ${allPuzzles.length}
// All puzzles validated as reverse-solvable (requireReverseSolvable: true)

import { PreGeneratedPuzzle } from './puzzleBankTypes';

export const PUZZLE_BANK_REVERSE_HARD: PreGeneratedPuzzle[] = [
${allPuzzles.map(p => '  ' + serializePuzzle(p)).join(',\n')}
];
`;

    fs.writeFileSync(outputPath, fileContent, 'utf-8');
    process.stdout.write(`\nWrote ${allPuzzles.length} puzzles to ${outputPath}\n`);

    // Clean up temp files only if all complete
    if (allComplete) {
      for (const phase of [0, 1, 2, 3, 4]) {
        const tempPath = getTempPath(phase);
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
      process.stdout.write(`Cleaned up temp files.\n`);
    }

    expect(allPuzzles.length).toBeGreaterThanOrEqual(Math.floor(TOTAL_TARGET * 0.5));
  }, 30000);
});
