/**
 * Branching top-up generator for WordShift — MEDIUM_PLUS + HARD standard banks.
 *
 * The shipped standard banks are majority single-solution-path. This script
 * generates ADDITIONAL puzzles for src/data/puzzleBankMediumPlus.ts and
 * src/data/puzzleBankHard.ts, accepting only genuinely multi-path boards:
 * analyzeStandardBranching must report completePathCount >= 2 AND
 * singleChoiceFraction <= 0.65 (the same analyzer + validity callback
 * puzzleBank.ts uses at selection time). Existing puzzles are kept verbatim;
 * additions are appended in the same serialized format.
 *
 * Run: cd mobile && NODE_OPTIONS=--max-old-space-size=4096 npx jest --config scripts/jest.config.js --no-coverage --forceExit --testTimeout 600000 scripts/generateBranchingTopUpB.test.ts
 * Crash/timeout-safe: per-accept checkpoints resume on re-run; each run also
 * finalizes (writes the bank files) with whatever it has before the deadline.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// Mocks — must be before imports that use them
// ============================================================================

let mockPhase = 0;

jest.mock('../src/services/amberCurrency', () => ({
  getCurrentPhase: async () => mockPhase,
  getFullProgress: async () => ({ puzzlesSolved: 999 }),
}));

// ============================================================================
// Bank-wide word saturation (diversity guard)
// Same model as the bank generators: count, for the WHOLE bank (existing
// puzzles + accepted additions), how many puzzles each visible word appears
// in. A word at the per-bank cap (pinned in src/__tests__/bankDiversity.test.ts)
// is treated as hard-cooldown inside the generator, and the accept loop
// hard-rejects any candidate that would push a word past the cap.
// ============================================================================

let bankWordUsage = new Map<string, number>();
let currentWordCap = 8;

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
  return words.some(w => (bankWordUsage.get(w) ?? 0) >= currentWordCap);
}

function recordUsage(words: string[]): void {
  for (const w of words) bankWordUsage.set(w, (bankWordUsage.get(w) ?? 0) + 1);
}

jest.mock('../src/services/wordHistory', () => ({
  getWordHistoryWithRecency: async () => new Map(bankWordUsage),
  calculateFreshnessPenalty: (word: string, usage: Map<string, number>) => {
    const uses = usage.get(word) ?? 0;
    if (uses === 0) return -5; // small bonus for never-used words
    if (uses >= currentWordCap) return 100;
    return Math.round((uses / currentWordCap) * 85);
  },
  isInHardCooldown: (word: string, usage: Map<string, number>) => (usage.get(word) ?? 0) >= currentWordCap,
  recordPuzzleWords: async () => {}, // usage recorded on ACCEPT in the loop below
}));

// ============================================================================
// Crash-safe checkpointing (mirrors the bank generators)
// One checkpoint file per bank; saved after every accepted puzzle so a killed
// or timed-out run resumes exactly where it left off. Cumulative attempt
// counts persist too, so the per-bank attempt budget spans re-runs.
// ============================================================================

interface TopUpCheckpoint {
  phaseCounts: Record<string, number>;
  phaseAttempts: Record<string, number>;
  puzzles: unknown[];
}

function checkpointPath(bankKey: string): string {
  return require('path').join(__dirname, '..', 'src', 'data', `.bank_topupB_${bankKey}_progress.json`);
}

function loadCheckpoint(bankKey: string): TopUpCheckpoint {
  try {
    const fsMod = require('fs');
    const p = checkpointPath(bankKey);
    if (fsMod.existsSync(p)) {
      const data = JSON.parse(fsMod.readFileSync(p, 'utf-8'));
      if (data && Array.isArray(data.puzzles)) {
        return {
          phaseCounts: data.phaseCounts ?? {},
          phaseAttempts: data.phaseAttempts ?? {},
          puzzles: data.puzzles,
        };
      }
    }
  } catch { /* corrupted checkpoint: start fresh */ }
  return { phaseCounts: {}, phaseAttempts: {}, puzzles: [] };
}

function saveCheckpoint(bankKey: string, cp: TopUpCheckpoint): void {
  const fsMod = require('fs');
  const p = checkpointPath(bankKey);
  const tmp = p + '.tmp';
  fsMod.writeFileSync(tmp, JSON.stringify(cp), 'utf-8');
  fsMod.renameSync(tmp, p); // atomic on Linux
}

// ============================================================================
// Imports — after mocks
// ============================================================================

import { generateLocalPuzzle, isDreadWord, getWordPhaseTier, getSemanticCluster } from '../src/services/localGenerator';
import { analyzeStandardBranching } from '../src/services/puzzleBranching';
import { COMMON_WORDS } from '../src/constants/wordLists';
import { PreGeneratedPuzzle } from '../src/data/puzzleBankTypes';
import { PUZZLE_BANK_MEDIUM_PLUS } from '../src/data/puzzleBankMediumPlus';
import { PUZZLE_BANK_HARD } from '../src/data/puzzleBankHard';

// ============================================================================
// Targets: +100 per bank, phase spread proportional to the original
// generators' PHASE_TARGETS {0:120, 1:100, 2:100, 3:100, 4:80} (out of 500).
// ============================================================================

const PHASE_TARGETS: Record<number, number> = {
  0: 24,
  1: 20,
  2: 20,
  3: 20,
  4: 16,
};

// The initial 1500-attempt budget completed in ~70s/bank and yielded only 8
// HARD accepts (word-cap rejections dominate in the saturated HARD bank), so
// the budget was raised per bank; wall-clock deadlines still bound every run.

// Each run finalizes before the external 600s timeout: generation stops at
// this wall-clock deadline and the bank files are written with what exists.
const RUN_DEADLINE_MS = 550_000;

// Acceptance gate (the point of this pass): multiple real completing routes.
const MIN_COMPLETE_PATHS = 2;
const MAX_SINGLE_CHOICE_FRACTION = 0.65;

interface BankConfig {
  key: string;
  difficulty: 'MEDIUM_PLUS' | 'HARD';
  /** Per-bank word saturation cap pinned in src/__tests__/bankDiversity.test.ts. */
  wordCap: number;
  /** Per-phase attempt budget = phase target * this (cumulative across runs). */
  attemptsPerPhaseUnit: number;
  existing: PreGeneratedPuzzle[];
  fileName: string;
  exportName: string;
  originalGenerator: string;
  /** puzzleBankHard.ts re-exports the puzzle type; preserve that line. */
  typeReExport: boolean;
}

const BANK_CONFIGS: BankConfig[] = [
  {
    key: 'mediumplus',
    difficulty: 'MEDIUM_PLUS',
    wordCap: 8,
    attemptsPerPhaseUnit: 100,
    existing: PUZZLE_BANK_MEDIUM_PLUS,
    fileName: 'puzzleBankMediumPlus.ts',
    exportName: 'PUZZLE_BANK_MEDIUM_PLUS',
    originalGenerator: 'scripts/generatePuzzleBankMediumPlus.test.ts',
    typeReExport: false,
  },
  {
    key: 'hard',
    difficulty: 'HARD',
    wordCap: 10,
    // HARD acceptance is word-cap-bound (the bank's dread vocabulary is
    // saturated), so its budget is effectively deadline-bound instead.
    attemptsPerPhaseUnit: 500,
    existing: PUZZLE_BANK_HARD,
    fileName: 'puzzleBankHard.ts',
    exportName: 'PUZZLE_BANK_HARD',
    originalGenerator: 'scripts/generatePuzzleBank.test.ts',
    typeReExport: true,
  },
];

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

function isBranchingRich(words: string[]): boolean {
  // Mirror puzzleBank.ts: the analyzer's validity callback is COMMON_WORDS.
  const metrics = analyzeStandardBranching(
    words,
    word => COMMON_WORDS.has(word.toUpperCase()),
  );
  return (
    metrics.completePathCount >= MIN_COMPLETE_PATHS &&
    metrics.singleChoiceFraction <= MAX_SINGLE_CHOICE_FRACTION
  );
}

function writeBankFile(
  config: BankConfig,
  finalPuzzles: PreGeneratedPuzzle[],
  baseCount: number,
  topUpCount: number,
): void {
  const outputPath = path.join(__dirname, '..', 'src', 'data', config.fileName);
  const typeLine = config.typeReExport
    ? `export type { PreGeneratedPuzzle } from './puzzleBankTypes';\n`
    : '';

  const fileContent = `// AUTO-GENERATED by ${config.originalGenerator}
// Branching top-up additions: scripts/generateBranchingTopUpB.test.ts
// Do not edit manually. Re-run the generators to update.
// Generated: ${new Date().toISOString()}
// Total puzzles: ${finalPuzzles.length} (${baseCount} base + ${topUpCount} branching top-up)

import { PreGeneratedPuzzle } from './puzzleBankTypes';
${typeLine}
export const ${config.exportName}: PreGeneratedPuzzle[] = [
${finalPuzzles.map(p => '  ' + serializePuzzle(p)).join(',\n')}
];
`;

  fs.writeFileSync(outputPath, fileContent, 'utf-8');
  process.stdout.write(`Wrote ${finalPuzzles.length} puzzles to ${outputPath}\n`);
}

// ============================================================================
// Main generation test
// ============================================================================

describe('Branching Top-Up Generator — MEDIUM_PLUS + HARD Standard', () => {
  it('appends multi-path standard puzzles to both banks', async () => {
    const runStart = Date.now();
    const runDeadline = runStart + RUN_DEADLINE_MS;

    for (let bankIndex = 0; bankIndex < BANK_CONFIGS.length; bankIndex++) {
      const config = BANK_CONFIGS[bankIndex];
      const isLastBank = bankIndex === BANK_CONFIGS.length - 1;
      // Split remaining wall-clock evenly across remaining banks so the last
      // bank always gets its share of the run.
      const bankDeadline = isLastBank
        ? runDeadline
        : Date.now() + Math.floor((runDeadline - Date.now()) / (BANK_CONFIGS.length - bankIndex));

      currentWordCap = config.wordCap;
      bankWordUsage = new Map<string, number>();

      // Seed dedup + word saturation from the shipped bank. After a previous
      // completed run, the shipped bank already contains earlier additions;
      // checkpoint puzzles are deduped against it so nothing double-counts.
      const existingChains = new Set<string>();
      for (const p of config.existing) {
        existingChains.add(p.words.join('-'));
        recordUsage(collectPuzzleWords(p));
      }

      const checkpoint = loadCheckpoint(config.key);
      const additions = checkpoint.puzzles as PreGeneratedPuzzle[];
      const seenChains = new Set<string>(existingChains);
      for (const p of additions) {
        const chainKey = p.words.join('-');
        if (!existingChains.has(chainKey)) recordUsage(collectPuzzleWords(p));
        seenChains.add(chainKey);
      }

      const totalTarget = Object.values(PHASE_TARGETS).reduce((a, b) => a + b, 0);
      process.stdout.write(`\n=== ${config.difficulty}: bank ${config.existing.length}, top-up so far ${additions.length}/${totalTarget}, word cap ${config.wordCap} ===\n`);

      let runAttempts = 0;
      let runAccepts = 0;
      let rejectedDup = 0;
      let rejectedCap = 0;
      let rejectedBranching = 0;
      let genFailures = 0;

      const phaseEntries = Object.entries(PHASE_TARGETS);
      for (let phaseIndex = 0; phaseIndex < phaseEntries.length; phaseIndex++) {
        const [phaseStr, target] = phaseEntries[phaseIndex];
        const phase = parseInt(phaseStr);
        mockPhase = phase;
        let phaseCount = checkpoint.phaseCounts[phaseStr] ?? 0;
        let phaseAttempts = checkpoint.phaseAttempts[phaseStr] ?? 0;
        const phaseBudget = target * config.attemptsPerPhaseUnit;

        if (phaseCount >= target || phaseAttempts >= phaseBudget) {
          process.stdout.write(`  Phase ${phase}: done (${phaseCount}/${target}, ${phaseAttempts} attempts)\n`);
          continue;
        }

        // Slice the bank's remaining wall-clock across the remaining phases
        // proportionally to their targets, so an attempt-rich early phase
        // cannot consume the whole deadline before later phases run.
        const remainingTargets = phaseEntries
          .slice(phaseIndex)
          .reduce((sum, [, t]) => sum + t, 0);
        const phaseDeadline = Math.min(
          bankDeadline,
          Date.now() + Math.floor((bankDeadline - Date.now()) * (target / remainingTargets)),
        );

        while (phaseCount < target && phaseAttempts < phaseBudget && Date.now() < phaseDeadline) {
          phaseAttempts++;
          runAttempts++;
          checkpoint.phaseAttempts[phaseStr] = phaseAttempts;

          try {
            const puzzle = await generateLocalPuzzle(config.difficulty);
            const chainKey = puzzle.words.join('-');

            if (seenChains.has(chainKey)) {
              rejectedDup++;
              continue;
            }
            seenChains.add(chainKey);

            // Bank-wide diversity: reject any puzzle that would push a word past the cap
            const puzzleWords = collectPuzzleWords(puzzle);
            if (exceedsUsageCap(puzzleWords)) {
              rejectedCap++;
              continue;
            }

            // The point of this pass: only accept genuinely multi-path boards.
            if (!isBranchingRich(puzzle.words)) {
              rejectedBranching++;
              continue;
            }

            const id = puzzleId(puzzle.words);
            const dreadTier = computeDreadTier(puzzleWords);
            const dreadWordCount = computeDreadWordCount(puzzleWords);
            const semanticTags = computeSemanticTags(puzzleWords);

            const preGenPuzzle: PreGeneratedPuzzle = {
              id,
              words: puzzle.words,
              solution: puzzle.solution || [],
              wordLength: puzzle.wordLength || 5,
              qualityScore: 50,
              dreadTier,
              dreadWordCount,
              allWords: puzzleWords,
              semanticTags,
            };

            additions.push(preGenPuzzle);
            recordUsage(puzzleWords);
            checkpoint.phaseCounts[phaseStr] = phaseCount + 1;
            saveCheckpoint(config.key, checkpoint);
            phaseCount++;
            runAccepts++;

            if (phaseCount % 5 === 0) {
              process.stdout.write(`  Phase ${phase}: ${phaseCount}/${target} (${phaseAttempts} attempts)\n`);
            }
          } catch {
            genFailures++;
          }
        }

        process.stdout.write(`  Phase ${phase}: ${phaseCount}/${target} (${phaseAttempts}/${phaseBudget} attempts)\n`);
        if (Date.now() >= bankDeadline) {
          process.stdout.write(`  Deadline reached for ${config.difficulty}; finalizing with current progress.\n`);
          break;
        }
      }

      // Persist attempt counters even when nothing new was accepted this run.
      saveCheckpoint(config.key, checkpoint);

      const totalAttemptsSoFar = Object.values(checkpoint.phaseAttempts).reduce((a, b) => a + b, 0);
      const bankAttemptBudget = totalTarget * config.attemptsPerPhaseUnit;
      process.stdout.write(`  ${config.difficulty} this run: ${runAccepts} accepted / ${runAttempts} attempts ` +
        `(dup ${rejectedDup}, cap ${rejectedCap}, branching ${rejectedBranching}, genFail ${genFailures})\n`);
      process.stdout.write(`  ${config.difficulty} cumulative: ${additions.length}/${totalTarget} accepted, ` +
        `${totalAttemptsSoFar}/${bankAttemptBudget} attempts\n`);

      // Finalize: existing puzzles verbatim + additions not already baked in.
      const newAdditions = additions.filter(p => !existingChains.has(p.words.join('-')));
      if (newAdditions.length > 0) {
        const finalPuzzles = [...config.existing, ...newAdditions];
        const bakedIn = additions.length - newAdditions.length;
        writeBankFile(config, finalPuzzles, config.existing.length - bakedIn, additions.length);
        expect(finalPuzzles.length).toBeGreaterThan(config.existing.length);
      } else {
        process.stdout.write(`  ${config.difficulty}: no new additions to write this run.\n`);
      }
    }
  }, 600000);
});
