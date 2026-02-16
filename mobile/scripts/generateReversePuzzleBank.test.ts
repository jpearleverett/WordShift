/**
 * Offline puzzle bank generator for WordShift — Reverse Variant HARD mode.
 *
 * Generates HARD-difficulty reverse-solvable puzzles one phase at a time,
 * writing intermediate results to JSON files. A final merge step combines
 * all phases into src/data/puzzleBankReverseHard.ts.
 *
 * Uses high-throughput brute-force sampling to find reverse-solvable chains at ~1s/puzzle.
 *
 * Run single phase:
 *   PHASE=0 npx jest --config scripts/jest.config.js --no-coverage --testTimeout 600000 --maxWorkers=1 scripts/generateReversePuzzleBank.test.ts
 *
 * Run all phases + merge:
 *   for p in 0 1 2 3 4; do PHASE=$p npx jest --config scripts/jest.config.js --no-coverage --testTimeout 600000 --maxWorkers=1 -t "phase $p" scripts/generateReversePuzzleBank.test.ts; done
 *   MERGE=1 npx jest --config scripts/jest.config.js --no-coverage --testTimeout 30000 --maxWorkers=1 -t "merge" scripts/generateReversePuzzleBank.test.ts
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

import { generateLocalPuzzle, isDreadWord, getWordPhaseTier, getSemanticCluster } from '../src/services/localGenerator';
import { PreGeneratedPuzzle } from '../src/data/puzzleBankTypes';

// ============================================================================
// Generation targets per phase
// ============================================================================

const PHASE_TARGETS: Record<number, number> = {
  0: 10,
  1: 8,
  2: 8,
  3: 8,
  4: 6,
};

const TOTAL_TARGET = Object.values(PHASE_TARGETS).reduce((a, b) => a + b, 0);

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

function serializePuzzle(p: PreGeneratedPuzzle): string {
  const solutionStr = p.solution.map(s =>
    `{stepIndex:${s.stepIndex},sourceWord:'${s.sourceWord}',targetWord:'${s.targetWord}',letterToMove:'${s.letterToMove}',explanation:\`${s.explanation}\`}`
  ).join(',');

  return `{id:'${p.id}',words:[${p.words.map(w => `'${w}'`).join(',')}],solution:[${solutionStr}],wordLength:${p.wordLength},qualityScore:${p.qualityScore},dreadTier:${p.dreadTier},dreadWordCount:${p.dreadWordCount},allWords:[${p.allWords.map(w => `'${w}'`).join(',')}],semanticTags:[${p.semanticTags.map(t => `'${t}'`).join(',')}]}`;
}

async function generatePhase(phase: number, target: number): Promise<PreGeneratedPuzzle[]> {
  mockPhase = phase;
  const puzzles: PreGeneratedPuzzle[] = [];
  const seenChains = new Set<string>();
  let attempts = 0;
  let failures = 0;
  const maxAttempts = target * 8;

  process.stdout.write(`\nPhase ${phase}: generating ${target} reverse puzzles...\n`);

  while (puzzles.length < target && attempts < maxAttempts) {
    attempts++;

    try {
      const puzzle = await generateLocalPuzzle('HARD', {
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

      puzzles.push({
        id,
        words: puzzle.words,
        solution: puzzle.solution || [],
        wordLength: puzzle.wordLength || 5,
        qualityScore: 50,
        dreadTier,
        dreadWordCount,
        allWords,
        semanticTags,
      });

      process.stdout.write(`  Phase ${phase}: ${puzzles.length}/${target} (attempt ${attempts})\n`);
    } catch (err) {
      failures++;
    }
  }

  process.stdout.write(`  Phase ${phase}: completed ${puzzles.length}/${target} (${attempts} attempts, ${failures} failures)\n`);
  return puzzles;
}

// ============================================================================
// Per-phase generation tests (run one at a time to avoid OOM)
// ============================================================================

describe('Reverse Puzzle Bank Generator', () => {
  for (const [phaseStr, target] of Object.entries(PHASE_TARGETS)) {
    const phase = parseInt(phaseStr);

    it(`generates phase ${phase} reverse puzzles`, async () => {
      const puzzles = await generatePhase(phase, target);

      // Write intermediate results to JSON
      const tempPath = getTempPath(phase);
      fs.writeFileSync(tempPath, JSON.stringify(puzzles, null, 2), 'utf-8');
      process.stdout.write(`Wrote ${puzzles.length} puzzles to ${tempPath}\n`);

      expect(puzzles.length).toBeGreaterThanOrEqual(Math.floor(target * 0.5));
    }, 600000);
  }

  // ============================================================================
  // Merge step: combine all phase JSON files into the final TypeScript file
  // ============================================================================

  it('merges all phases into puzzleBankReverseHard.ts', () => {
    const allPuzzles: PreGeneratedPuzzle[] = [];

    for (const phase of [0, 1, 2, 3, 4]) {
      const tempPath = getTempPath(phase);
      if (fs.existsSync(tempPath)) {
        const data = JSON.parse(fs.readFileSync(tempPath, 'utf-8')) as PreGeneratedPuzzle[];
        allPuzzles.push(...data);
        process.stdout.write(`Phase ${phase}: loaded ${data.length} puzzles\n`);
      } else {
        process.stdout.write(`Phase ${phase}: no data file found at ${tempPath}\n`);
      }
    }

    process.stdout.write(`\n=== Total: ${allPuzzles.length} puzzles ===\n`);

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

    // Clean up temp files
    for (const phase of [0, 1, 2, 3, 4]) {
      const tempPath = getTempPath(phase);
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }

    expect(allPuzzles.length).toBeGreaterThanOrEqual(Math.floor(TOTAL_TARGET * 0.5));
  }, 30000);
});
