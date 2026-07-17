/**
 * Branching top-up generator for WordShift's standard EASY + MEDIUM banks.
 *
 * The shipped standard banks are majority single-solution-path. This TOP-UP
 * pass appends additional puzzles that are VERIFIED multi-path under the
 * shipped rules (analyzeStandardBranching: completePathCount >= 2 and
 * singleChoiceFraction <= 0.65), without disturbing any existing puzzle and
 * without pushing any word past the bank's pinned diversity cap
 * (read from src/__tests__/bankDiversity.test.ts).
 *
 * ROUND 2 (2026-07-17): MEDIUM only. EASY finished round 1 at 43.5%
 * multi-path and is skipped; MEDIUM gets a +50 target with a doubled
 * attempt budget (3000) under the SAME pinned cap (7) — round 1 showed
 * MEDIUM supply is attempt-bound, not cap-bound. Round-2 checkpoints use
 * new file names (.bank_topupA2_*) so a stale round-1 checkpoint (whose
 * puzzles are already merged into the shipped bank) can never double-append.
 * Each run also finalizes (writes the bank file) with whatever it has
 * before the wall-clock deadline, so timed-out runs resume cleanly.
 *
 * Run: cd mobile && NODE_OPTIONS=--max-old-space-size=4096 npx jest --config scripts/jest.config.js --no-coverage --forceExit --testTimeout 600000 scripts/generateBranchingTopUpA.test.ts
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
// Bank-wide word saturation (same model as the bank generators)
// The usage map is seeded from the EXISTING bank before any generation, so
// every addition respects the cap the diversity guard test pins for the bank.
// The cap itself is mutable because this script processes two banks with
// different pinned caps in one run.
// ============================================================================

let WORD_USAGE_CAP = 3;
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

import { generateLocalPuzzle, isDreadWord, getWordPhaseTier, getSemanticCluster } from '../src/services/localGenerator';
import { analyzeStandardBranching } from '../src/services/puzzleBranching';
import { COMMON_WORDS } from '../src/constants/wordLists';
import { PreGeneratedPuzzle } from '../src/data/puzzleBankTypes';
import { PUZZLE_BANK_MEDIUM } from '../src/data/puzzleBankMedium';

// ============================================================================
// Round-2 top-up targets: +50 for MEDIUM, phase spread mirroring the bank
// generators' PHASE_TARGETS ratios (120/100/100/100/80 out of 500).
// ============================================================================

const TOP_UP_PHASE_TARGETS: Record<number, number> = {
  0: 12,
  1: 10,
  2: 10,
  3: 10,
  4: 8,
};

const ATTEMPTS_PER_TARGET = 60; // 3000 attempts total for the +50 MEDIUM target

// Each run finalizes (writes the bank file) before the external 600s jest
// timeout; a resumed run picks up from the checkpoint's cumulative attempts.
const RUN_DEADLINE_MS = 550_000;

// Acceptance gate: genuinely multi-path under the shipped rules. Same
// validator + default caps puzzleBank.ts uses at selection time.
const MIN_COMPLETE_PATHS = 2;
const MAX_SINGLE_CHOICE_FRACTION = 0.65;

const isValidWord = (word: string): boolean => COMMON_WORDS.has(word.toUpperCase());

interface TopUpBankSpec {
  /** BANKS-table name in bankDiversity.test.ts AND generateLocalPuzzle difficulty. */
  name: 'EASY' | 'MEDIUM';
  fileName: string;
  exportName: string;
  generatorScript: string;
  bank: PreGeneratedPuzzle[];
  checkpointFile: string;
}

// EASY is deliberately absent this round (finished round 1 at 43.5% multi-path).
const BANK_SPECS: TopUpBankSpec[] = [
  {
    name: 'MEDIUM',
    fileName: 'puzzleBankMedium.ts',
    exportName: 'PUZZLE_BANK_MEDIUM',
    generatorScript: 'scripts/generatePuzzleBankMedium.test.ts',
    bank: PUZZLE_BANK_MEDIUM,
    checkpointFile: '.bank_topupA2_medium_progress.json',
  },
];

// ============================================================================
// Pinned word-usage caps — read from the diversity guard test (never modified
// here) so no addition can violate the pin.
// ============================================================================

function readPinnedCap(bankName: string): number {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'src', '__tests__', 'bankDiversity.test.ts'),
    'utf-8',
  );
  const m = new RegExp(`name:\\s*'${bankName}'[^}]*?cap:\\s*(\\d+)`).exec(src);
  if (!m) throw new Error(`Could not read pinned cap for ${bankName} from bankDiversity.test.ts`);
  return parseInt(m[1], 10);
}

// ============================================================================
// Crash-safe checkpointing (mirrors the bank generators): saved after every
// accepted puzzle so a killed run resumes by re-running. The checkpoint holds
// ONLY the additions; a `completed` flag guards against re-generating for a
// bank whose file write already landed in a previous run.
// ============================================================================

interface TopUpCheckpoint {
  phaseCounts: Record<string, number>;
  /** Cumulative per-phase attempts, so the attempt budget spans re-runs. */
  phaseAttempts: Record<string, number>;
  puzzles: PreGeneratedPuzzle[];
  attemptsUsed: number;
  completed?: boolean;
}

function checkpointPath(spec: TopUpBankSpec): string {
  return path.join(__dirname, '..', 'src', 'data', spec.checkpointFile);
}

function loadCheckpoint(spec: TopUpBankSpec): TopUpCheckpoint {
  try {
    const p = checkpointPath(spec);
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (data && Array.isArray(data.puzzles)) {
        return { attemptsUsed: 0, phaseCounts: {}, phaseAttempts: {}, ...data };
      }
    }
  } catch { /* corrupted checkpoint: start fresh */ }
  return { phaseCounts: {}, phaseAttempts: {}, puzzles: [], attemptsUsed: 0 };
}

function saveCheckpoint(spec: TopUpBankSpec, cp: TopUpCheckpoint): void {
  const p = checkpointPath(spec);
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cp), 'utf-8');
  fs.renameSync(tmp, p); // atomic on Linux
}

// ============================================================================
// Helpers (identical metadata pipeline to the bank generators, except the
// post-hygiene bank format: allWords/dreadTier/semanticTags are computed from
// ALL player-visible words — chain + formed — matching the shipped banks)
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

function writeBankFile(spec: TopUpBankSpec, puzzles: PreGeneratedPuzzle[], topUpCount: number): void {
  const outputPath = path.join(__dirname, '..', 'src', 'data', spec.fileName);
  const fileContent = `// AUTO-GENERATED by ${spec.generatorScript}
// Do not edit manually. Re-run the generator to update.
// Generated: ${new Date().toISOString()}
// Total puzzles: ${puzzles.length}
// Branching top-up round 1: scripts/generateBranchingTopUpA.test.ts appended 76 verified multi-path puzzles.
// Branching top-up round 2: appended ${topUpCount} more verified multi-path puzzles (same pinned word cap).

import { PreGeneratedPuzzle } from './puzzleBankTypes';

export const ${spec.exportName}: PreGeneratedPuzzle[] = [
${puzzles.map(p => '  ' + serializePuzzle(p)).join(',\n')}
];
`;
  fs.writeFileSync(outputPath, fileContent, 'utf-8');
  process.stdout.write(`\nWrote ${puzzles.length} puzzles to ${outputPath}\n`);
}

// ============================================================================
// Main top-up per bank
// ============================================================================

async function runTopUp(spec: TopUpBankSpec): Promise<void> {
  const checkpoint = loadCheckpoint(spec);
  if (checkpoint.completed) {
    process.stdout.write(`\n=== ${spec.name}: top-up already completed in a previous run, skipping ===\n`);
    return;
  }

  WORD_USAGE_CAP = readPinnedCap(spec.name);
  bankWordUsage.clear();

  // Seed dedup + bank-wide usage from the EXISTING bank (which on a resumed
  // run may already contain merged additions from a completed write).
  const seenChains = new Set<string>();
  for (const p of spec.bank) {
    seenChains.add(p.words.join('-'));
    recordUsage(collectPuzzleWords(p));
  }

  // Reload pending additions, dropping any already merged into the bank file
  // (covers a kill between the file write and the completed-flag save).
  const additions: PreGeneratedPuzzle[] = [];
  for (const p of checkpoint.puzzles) {
    const chainKey = p.words.join('-');
    if (seenChains.has(chainKey)) continue;
    seenChains.add(chainKey);
    recordUsage(collectPuzzleWords(p));
    additions.push(p);
  }
  checkpoint.puzzles = additions;

  // Before-share of multi-path boards in the existing bank (cheap: capped search).
  let existingMultiPath = 0;
  for (const p of spec.bank) {
    if (analyzeStandardBranching(p.words, isValidWord).completePathCount >= MIN_COMPLETE_PATHS) {
      existingMultiPath++;
    }
  }
  process.stdout.write(
    `\n=== ${spec.name}: ${spec.bank.length} existing puzzles, ${existingMultiPath} multi-path ` +
    `(${((existingMultiPath / spec.bank.length) * 100).toFixed(1)}%), cap ${WORD_USAGE_CAP}, ` +
    `resuming with ${additions.length} accepted ===\n`,
  );

  let totalFailures = 0;
  let rejectedBranching = 0;
  let rejectedCap = 0;
  let rejectedDup = 0;
  let runAccepts = 0;
  const runDeadline = Date.now() + RUN_DEADLINE_MS;

  for (const [phaseStr, target] of Object.entries(TOP_UP_PHASE_TARGETS)) {
    const phase = parseInt(phaseStr);
    mockPhase = phase;
    let phaseCount = checkpoint.phaseCounts[phaseStr] ?? 0;
    let phaseAttempts = checkpoint.phaseAttempts[phaseStr] ?? 0;
    const maxAttemptsPerPhase = target * ATTEMPTS_PER_TARGET;

    process.stdout.write(`\n${spec.name} phase ${phase}: topping up ${target} multi-path puzzles (have ${phaseCount}, ${phaseAttempts}/${maxAttemptsPerPhase} attempts used)...\n`);

    while (phaseCount < target && phaseAttempts < maxAttemptsPerPhase && Date.now() < runDeadline) {
      phaseAttempts++;
      checkpoint.phaseAttempts[phaseStr] = phaseAttempts;
      checkpoint.attemptsUsed++;

      try {
        const puzzle = await generateLocalPuzzle(spec.name);
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

        // The whole point of this pass: only accept genuinely multi-path boards.
        const branching = analyzeStandardBranching(puzzle.words, isValidWord);
        if (
          branching.completePathCount < MIN_COMPLETE_PATHS ||
          branching.singleChoiceFraction > MAX_SINGLE_CHOICE_FRACTION
        ) {
          rejectedBranching++;
          continue;
        }

        const allWords = puzzleWords;
        const preGenPuzzle: PreGeneratedPuzzle = {
          id: puzzleId(puzzle.words),
          words: puzzle.words,
          solution: puzzle.solution || [],
          wordLength: puzzle.wordLength || 4,
          qualityScore: 50,
          dreadTier: computeDreadTier(allWords),
          dreadWordCount: computeDreadWordCount(allWords),
          allWords,
          semanticTags: computeSemanticTags(allWords),
        };

        additions.push(preGenPuzzle);
        recordUsage(puzzleWords);
        checkpoint.phaseCounts[phaseStr] = phaseCount + 1;
        saveCheckpoint(spec, checkpoint);
        phaseCount++;
        runAccepts++;

        if (phaseCount % 5 === 0) {
          process.stdout.write(`  ${spec.name} phase ${phase}: ${phaseCount}/${target} (${phaseAttempts} attempts)\n`);
        }
      } catch {
        totalFailures++;
      }
    }

    process.stdout.write(`  ${spec.name} phase ${phase}: completed ${phaseCount}/${target} (${phaseAttempts}/${maxAttemptsPerPhase} attempts)\n`);
    if (Date.now() >= runDeadline) {
      process.stdout.write(`  Deadline reached for ${spec.name}; finalizing with current progress.\n`);
      break;
    }
  }

  // Persist attempt counters even when nothing new was accepted this run.
  saveCheckpoint(spec, checkpoint);

  const combined = [...spec.bank, ...additions];
  const topUpCount = Object.values(checkpoint.phaseCounts).reduce((a, b) => a + b, 0);
  const multiAfter = existingMultiPath + additions.length;

  process.stdout.write(`\n=== ${spec.name} top-up run finished (${runAccepts} accepted this run) ===\n`);
  process.stdout.write(`Bank: ${spec.bank.length} -> ${combined.length} puzzles (+${additions.length} this pass, ${topUpCount} cumulative)\n`);
  process.stdout.write(`Attempts used: ${checkpoint.attemptsUsed} (dup ${rejectedDup}, cap ${rejectedCap}, branching ${rejectedBranching}, failures ${totalFailures})\n`);
  process.stdout.write(`Multi-path share: ${((existingMultiPath / spec.bank.length) * 100).toFixed(1)}% -> ${((multiAfter / combined.length) * 100).toFixed(1)}% (${multiAfter}/${combined.length})\n`);

  if (additions.length > 0) {
    writeBankFile(spec, combined, topUpCount);
  } else {
    process.stdout.write(`No new additions to write this run.\n`);
  }

  // Completed = every phase met its target or exhausted its cumulative
  // attempt budget (a deadline break leaves the checkpoint resumable).
  const allDone = Object.entries(TOP_UP_PHASE_TARGETS).every(([ps, t]) =>
    (checkpoint.phaseCounts[ps] ?? 0) >= t ||
    (checkpoint.phaseAttempts[ps] ?? 0) >= t * ATTEMPTS_PER_TARGET);
  if (allDone) {
    checkpoint.completed = true;
    saveCheckpoint(spec, checkpoint);
  }
}

// ============================================================================
// Main top-up test
// ============================================================================

describe('Branching Top-Up — MEDIUM Standard (round 2)', () => {
  it('tops up the MEDIUM bank with multi-path puzzles', async () => {
    await runTopUp(BANK_SPECS[0]);
  }, 600000);
});
