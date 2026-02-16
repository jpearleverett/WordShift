/**
 * Offline puzzle bank generator for WordShift.
 *
 * Generates 500 HARD-difficulty standard-variant puzzles across all 5 phase tiers,
 * enriches them with metadata, and writes to src/data/puzzleBankHard.ts.
 *
 * Run: cd mobile && npx jest --config scripts/jest.config.js --no-coverage --testTimeout 900000
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// Mocks — must be before imports that use them
// ============================================================================

// Accumulated word history across all generated puzzles (for diversity)
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

import { generateLocalPuzzle, isDreadWord, getWordPhaseTier, getSemanticCluster } from '../src/services/localGenerator';
import { PuzzleSolutionStep } from '../src/types';

// ============================================================================
// Types
// ============================================================================

interface PreGeneratedPuzzle {
  id: string;
  words: string[];
  solution: PuzzleSolutionStep[];
  wordLength: number;
  qualityScore: number;
  dreadTier: number;
  dreadWordCount: number;
  allWords: string[];
  semanticTags: string[];
}

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
  const solutionStr = p.solution.map(s =>
    `{stepIndex:${s.stepIndex},sourceWord:'${s.sourceWord}',targetWord:'${s.targetWord}',letterToMove:'${s.letterToMove}',explanation:\`${s.explanation}\`}`
  ).join(',');

  return `{id:'${p.id}',words:[${p.words.map(w => `'${w}'`).join(',')}],solution:[${solutionStr}],wordLength:${p.wordLength},qualityScore:${p.qualityScore},dreadTier:${p.dreadTier},dreadWordCount:${p.dreadWordCount},allWords:[${p.allWords.map(w => `'${w}'`).join(',')}],semanticTags:[${p.semanticTags.map(t => `'${t}'`).join(',')}]}`;
}

// ============================================================================
// Main generation test
// ============================================================================

describe('Puzzle Bank Generator', () => {
  it('generates 500 HARD standard puzzles', async () => {
    const allPuzzles: PreGeneratedPuzzle[] = [];
    const seenChains = new Set<string>();
    let totalAttempts = 0;
    let totalFailures = 0;

    for (const [phaseStr, target] of Object.entries(PHASE_TARGETS)) {
      const phase = parseInt(phaseStr);
      mockPhase = phase;
      let phaseCount = 0;
      let phaseAttempts = 0;
      const maxAttemptsPerPhase = target * 3; // Allow 3x retries

      process.stdout.write(`\nPhase ${phase}: generating ${target} puzzles...\n`);

      while (phaseCount < target && phaseAttempts < maxAttemptsPerPhase) {
        phaseAttempts++;
        totalAttempts++;

        try {
          const puzzle = await generateLocalPuzzle('HARD');
          const chainKey = puzzle.words.join('-');

          // Deduplicate
          if (seenChains.has(chainKey)) {
            continue;
          }
          seenChains.add(chainKey);

          const id = puzzleId(puzzle.words);
          const dreadTier = computeDreadTier(puzzle.words);
          const dreadWordCount = computeDreadWordCount(puzzle.words);
          const allWords = [...new Set(puzzle.words.map(w => w.toUpperCase()))];
          const semanticTags = computeSemanticTags(puzzle.words);

          const preGenPuzzle: PreGeneratedPuzzle = {
            id,
            words: puzzle.words,
            solution: puzzle.solution || [],
            wordLength: puzzle.wordLength || 5,
            qualityScore: 50, // All generated puzzles pass the 45 threshold; use 50 as default
            dreadTier,
            dreadWordCount,
            allWords,
            semanticTags,
          };

          allPuzzles.push(preGenPuzzle);
          phaseCount++;

          if (phaseCount % 10 === 0) {
            process.stdout.write(`  Phase ${phase}: ${phaseCount}/${target}\n`);
          }
        } catch (err) {
          totalFailures++;
          // Generation timeout or failure — retry
        }
      }

      process.stdout.write(`  Phase ${phase}: completed ${phaseCount}/${target} (${phaseAttempts} attempts)\n`);
    }

    // Report
    process.stdout.write(`\n=== Generation Complete ===\n`);
    process.stdout.write(`Total puzzles: ${allPuzzles.length}\n`);
    process.stdout.write(`Total attempts: ${totalAttempts}\n`);
    process.stdout.write(`Total failures: ${totalFailures}\n`);

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
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'puzzleBankHard.ts');

    const fileContent = `// AUTO-GENERATED by scripts/generatePuzzleBank.test.ts
// Do not edit manually. Re-run the generator to update.
// Generated: ${new Date().toISOString()}
// Total puzzles: ${allPuzzles.length}

import { PuzzleSolutionStep } from '../types';

export interface PreGeneratedPuzzle {
  /** Stable ID (deterministic hash of word chain) */
  id: string;
  /** The word chain */
  words: string[];
  /** Step-by-step solution for hints */
  solution: PuzzleSolutionStep[];
  /** Word length (5 for HARD) */
  wordLength: number;
  /** Quality score (0-100) */
  qualityScore: number;
  /** Highest dread word tier present (0 = no dread words, 1-4 = phase tier) */
  dreadTier: number;
  /** Number of dread words in the chain */
  dreadWordCount: number;
  /** All unique words in the chain (for fast word-overlap checking) */
  allWords: string[];
  /** Semantic clusters touched */
  semanticTags: string[];
}

export const PUZZLE_BANK_HARD: PreGeneratedPuzzle[] = [
${allPuzzles.map(p => '  ' + serializePuzzle(p)).join(',\n')}
];
`;

    fs.writeFileSync(outputPath, fileContent, 'utf-8');
    process.stdout.write(`\nWrote ${allPuzzles.length} puzzles to ${outputPath}\n`);

    // Assertions
    expect(allPuzzles.length).toBeGreaterThanOrEqual(TOTAL_TARGET * 0.9); // Allow 10% shortfall
    expect(allPuzzles.length).toBeLessThanOrEqual(TOTAL_TARGET + 50);
  }, 900000); // 15 minute timeout
});
