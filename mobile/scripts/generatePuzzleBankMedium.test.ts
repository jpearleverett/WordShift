/**
 * Offline puzzle bank generator for WordShift.
 *
 * Generates 500 MEDIUM-difficulty standard-variant puzzles across all 5 phase tiers,
 * enriches them with metadata, and writes to src/data/puzzleBankMedium.ts.
 *
 * Run: cd mobile && npx jest --config scripts/jest.config.js --no-coverage --testTimeout 900000 scripts/generatePuzzleBankMedium.test.ts
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

const WORD_USAGE_CAP = Number(process.env.BANK_WORD_CAP ?? 3);
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

// ============================================================================
// Crash-safe checkpointing (mirrors the reverse generators)
// The generator process can die under long high-attempt runs; saving after
// every accepted puzzle makes any death resumable by simply re-running.
// ============================================================================

const CHECKPOINT_PATH = require('path').join(__dirname, '..', 'src', 'data', '.bank_generatePuzzleBankMedium_progress.json');

interface BankCheckpoint {
  phaseCounts: Record<string, number>;
  puzzles: unknown[];
}

function loadCheckpoint(): BankCheckpoint {
  try {
    const fsMod = require('fs');
    if (fsMod.existsSync(CHECKPOINT_PATH)) {
      const data = JSON.parse(fsMod.readFileSync(CHECKPOINT_PATH, 'utf-8'));
      if (data && Array.isArray(data.puzzles)) return data;
    }
  } catch { /* corrupted checkpoint: start fresh */ }
  return { phaseCounts: {}, puzzles: [] };
}

function saveCheckpoint(cp: BankCheckpoint): void {
  const fsMod = require('fs');
  const tmp = CHECKPOINT_PATH + '.tmp';
  fsMod.writeFileSync(tmp, JSON.stringify(cp), 'utf-8');
  fsMod.renameSync(tmp, CHECKPOINT_PATH); // atomic on Linux
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

import { generateLocalPuzzle, isDreadWord, getWordPhaseTier, getSemanticCluster } from '../src/services/localGenerator';
import { PreGeneratedPuzzle } from '../src/data/puzzleBankTypes';

// ============================================================================
// Generation targets per phase
// ============================================================================

const PHASE_TARGETS: Record<number, number> = {
  0: 120,
  1: 100,
  2: 100,
  3: 100,
  4: 80,
};

const TOTAL_TARGET = Object.values(PHASE_TARGETS).reduce((a, b) => a + b, 0);

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

function serializePuzzle(p: PreGeneratedPuzzle): string {
  const solutionStr = p.solution.map(s => {
    const insertPos = s.insertionPosition !== undefined ? `,insertionPosition:${s.insertionPosition}` : '';
    const removePos = s.removalPosition !== undefined ? `,removalPosition:${s.removalPosition}` : '';
    return `{stepIndex:${s.stepIndex},sourceWord:'${s.sourceWord}',targetWord:'${s.targetWord}',letterToMove:'${s.letterToMove}',explanation:\`${s.explanation}\`${insertPos}${removePos}}`;
  }).join(',');

  return `{id:'${p.id}',words:[${p.words.map(w => `'${w}'`).join(',')}],solution:[${solutionStr}],wordLength:${p.wordLength},qualityScore:${p.qualityScore},dreadTier:${p.dreadTier},dreadWordCount:${p.dreadWordCount},allWords:[${p.allWords.map(w => `'${w}'`).join(',')}],semanticTags:[${p.semanticTags.map(t => `'${t}'`).join(',')}]}`;
}

// ============================================================================
// Main generation test
// ============================================================================

describe('Puzzle Bank Generator — MEDIUM Standard', () => {
  it('generates 500 MEDIUM standard puzzles', async () => {
    // Resume from checkpoint: reload accepted puzzles, chain dedup, per-phase
    // counts, and the bank-wide word usage so the cap stays accurate.
    const checkpoint = loadCheckpoint();
    const allPuzzles: PreGeneratedPuzzle[] = checkpoint.puzzles as PreGeneratedPuzzle[];
    const seenChains = new Set<string>();
    for (const p of allPuzzles) {
      seenChains.add(p.words.join('-'));
      recordUsage(collectPuzzleWords(p as { words: string[]; solution?: { sourceWord: string; targetWord: string; explanation?: string }[] }));
    }
    let totalAttempts = 0;
    let totalFailures = 0;

    for (const [phaseStr, target] of Object.entries(PHASE_TARGETS)) {
      const phase = parseInt(phaseStr);
      mockPhase = phase;
      let phaseCount = checkpoint.phaseCounts[phaseStr] ?? 0;
      let phaseAttempts = 0;
      const maxAttemptsPerPhase = target * 10;

      process.stdout.write(`\nPhase ${phase}: generating ${target} puzzles...\n`);

      while (phaseCount < target && phaseAttempts < maxAttemptsPerPhase) {
        phaseAttempts++;
        totalAttempts++;

        try {
          const puzzle = await generateLocalPuzzle('MEDIUM');
          const chainKey = puzzle.words.join('-');

          if (seenChains.has(chainKey)) {
            continue;
          }
          seenChains.add(chainKey);

          // Bank-wide diversity: reject any puzzle that would push a word past the cap
          const puzzleWords = collectPuzzleWords(puzzle);
          if (exceedsUsageCap(puzzleWords)) continue;

          const id = puzzleId(puzzle.words);
          const dreadTier = computeDreadTier(puzzle.words);
          const dreadWordCount = computeDreadWordCount(puzzle.words);
          const allWords = [...new Set(puzzle.words.map(w => w.toUpperCase()))];
          const semanticTags = computeSemanticTags(puzzle.words);

          const preGenPuzzle: PreGeneratedPuzzle = {
            id,
            words: puzzle.words,
            solution: puzzle.solution || [],
            wordLength: puzzle.wordLength || 4,
            qualityScore: 50,
            dreadTier,
            dreadWordCount,
            allWords,
            semanticTags,
          };

          allPuzzles.push(preGenPuzzle);
          recordUsage(puzzleWords);
          checkpoint.phaseCounts[phaseStr] = phaseCount + 1;
          saveCheckpoint(checkpoint);
          phaseCount++;

          if (phaseCount % 10 === 0) {
            process.stdout.write(`  Phase ${phase}: ${phaseCount}/${target}\n`);
          }
        } catch (err) {
          totalFailures++;
        }
      }

      process.stdout.write(`  Phase ${phase}: completed ${phaseCount}/${target} (${phaseAttempts} attempts)\n`);
    }

    // Report
    process.stdout.write(`\n=== Generation Complete ===\n`);
    process.stdout.write(`Total puzzles: ${allPuzzles.length}\n`);
    process.stdout.write(`Total attempts: ${totalAttempts}\n`);
    process.stdout.write(`Total failures: ${totalFailures}\n`);

    const tierCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const p of allPuzzles) {
      tierCounts[p.dreadTier] = (tierCounts[p.dreadTier] || 0) + 1;
    }
    process.stdout.write(`Dread tier distribution:\n`);
    for (const [tier, count] of Object.entries(tierCounts)) {
      process.stdout.write(`  Tier ${tier}: ${count} puzzles\n`);
    }

    // Write output file
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'puzzleBankMedium.ts');

    const fileContent = `// AUTO-GENERATED by scripts/generatePuzzleBankMedium.test.ts
// Do not edit manually. Re-run the generator to update.
// Generated: ${new Date().toISOString()}
// Total puzzles: ${allPuzzles.length}

import { PreGeneratedPuzzle } from './puzzleBankTypes';

export const PUZZLE_BANK_MEDIUM: PreGeneratedPuzzle[] = [
${allPuzzles.map(p => '  ' + serializePuzzle(p)).join(',\n')}
];
`;

    fs.writeFileSync(outputPath, fileContent, 'utf-8');
    process.stdout.write(`\nWrote ${allPuzzles.length} puzzles to ${outputPath}\n`);

    expect(allPuzzles.length).toBeGreaterThanOrEqual(TOTAL_TARGET * 0.9);
    expect(allPuzzles.length).toBeLessThanOrEqual(TOTAL_TARGET + 50);
  }, 900000);
});
