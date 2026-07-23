/**
 * GATED FULL-REGENERATION generator for WordShift's four REVERSE puzzle banks.
 *
 * A reverse fork of scripts/generateGatedBank.test.ts. Reverse boards are
 * play-down-then-back-up: the shipped banks were the smallest, oldest, and
 * lowest-quality-gated of any mode (solvability + reverse-flexibility only, NO
 * anti-boring, NO branching), so they carry S-shuffle monotony the standard
 * gated rebuild eliminated. This rebuilds them on the cleaned, 2x-larger,
 * true-frequency-sorted dictionary with:
 *   - reverse solvability under the SHIPPED rules (generateLocalPuzzle's own
 *     double gate: isReverseSolvable + isReverseChainSolvable),
 *   - the same bank-wide word cap + dedup diversity guards (LOWER caps than the
 *     legacy banks, which had let hub words pin the ceiling),
 *   - the playable-vocabulary FEATURED band (recognizable displayed words +
 *     answer backstop, dread exempt), and
 *   - a reverse-appropriate anti-boring soft cap: the standard branching
 *     analyzer models standard lock semantics and is INVALID for reverse, so
 *     instead we cap the S-share of the forward solution moves to kill the pure
 *     S-shuffle boards without starving the mode (reverse legitimately re-adds
 *     letters on the return leg, so some pluralization is unavoidable).
 *
 * Never touches live files: finalizes to src/data/.gatedRegenReverse_<bank>_output.ts,
 * swapped by scripts/swapGatedBanks.mjs (reverse-aware).
 *
 * Env: GATED_BANK EASY|MEDIUM|MEDIUM_PLUS|HARD; GATED_SMOKE_MS / GATED_RUN_MS.
 *   cd mobile && GATED_BANK=HARD NODE_OPTIONS=--max-old-space-size=4096 \
 *     npx jest --config scripts/jest.config.js --no-coverage --forceExit \
 *     --testTimeout 570000 scripts/generateGatedReverseBank.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

type BankName = 'EASY' | 'MEDIUM' | 'MEDIUM_PLUS' | 'HARD';

interface ReverseBankConfig {
  bank: BankName;
  key: string;
  difficulty: 'EASY' | 'MEDIUM' | 'MEDIUM_PLUS' | 'HARD';
  wordCap: number;
  defaultWordLength: number;
  exportName: string;
  liveFileName: string;
  /** Max S-share of forward solution moves (anti-boring soft cap). */
  maxSShare: number;
  /** FEATURED displayed-word frequency-rank ceiling (dread exempt). */
  featuredCeiling: number;
}

// Reverse difficulties share word lengths with standard (EASY/MEDIUM 4-letter,
// MEDIUM_PLUS/HARD 5-letter). Caps LOWER than the legacy banks (7/11/12/16) so
// the 2x-dictionary supply spreads instead of pinning hubs.
const BANK_CONFIGS: Record<BankName, ReverseBankConfig> = {
  EASY:        { bank: 'EASY', key: 'reverse_easy', difficulty: 'EASY', wordCap: 6, defaultWordLength: 4, exportName: 'PUZZLE_BANK_REVERSE_EASY', liveFileName: 'puzzleBankReverseEasy.ts', maxSShare: 0.50, featuredCeiling: 0.92 },
  MEDIUM:      { bank: 'MEDIUM', key: 'reverse_medium', difficulty: 'MEDIUM', wordCap: 8, defaultWordLength: 4, exportName: 'PUZZLE_BANK_REVERSE_MEDIUM', liveFileName: 'puzzleBankReverseMedium.ts', maxSShare: 0.50, featuredCeiling: 0.94 },
  MEDIUM_PLUS: { bank: 'MEDIUM_PLUS', key: 'reverse_medium_plus', difficulty: 'MEDIUM_PLUS', wordCap: 10, defaultWordLength: 5, exportName: 'PUZZLE_BANK_REVERSE_MEDIUM_PLUS', liveFileName: 'puzzleBankReverseMediumPlus.ts', maxSShare: 0.55, featuredCeiling: 0.96 },
  HARD:        { bank: 'HARD', key: 'reverse_hard', difficulty: 'HARD', wordCap: 12, defaultWordLength: 5, exportName: 'PUZZLE_BANK_REVERSE_HARD', liveFileName: 'puzzleBankReverseHard.ts', maxSShare: 0.60, featuredCeiling: 0.98 },
};

const BANK_NAME = String(process.env.GATED_BANK ?? 'MEDIUM').toUpperCase() as BankName;
const CONFIG = BANK_CONFIGS[BANK_NAME];
if (!CONFIG) {
  throw new Error(`GATED_BANK must be one of EASY|MEDIUM|MEDIUM_PLUS|HARD (got '${process.env.GATED_BANK}')`);
}

const RUN_DEADLINE_MS = Number(process.env.GATED_SMOKE_MS ?? process.env.GATED_RUN_MS ?? 540_000);
const FEATURED_TRANSIENT_CEILING = 0.99;

// ---------------------------------------------------------------------------
// Mocks (before imports that use them)
// ---------------------------------------------------------------------------
let mockPhase = 0;
jest.mock('../src/services/amberCurrency', () => ({
  getCurrentPhase: async () => mockPhase,
  getFullProgress: async () => ({ puzzlesSolved: 999 }),
}));

const WORD_USAGE_CAP = CONFIG.wordCap;
const bankWordUsage = new Map<string, number>();

interface StepLike { sourceWord: string; targetWord: string; letterToMove?: string; explanation?: string }
interface PuzzleLike { words: string[]; solution?: StepLike[]; reverseSolution?: StepLike[] }

function collectPuzzleWords(puzzle: PuzzleLike): string[] {
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
    if (uses === 0) return -5;
    if (uses >= WORD_USAGE_CAP) return 100;
    return Math.round((uses / WORD_USAGE_CAP) * 85);
  },
  isInHardCooldown: (word: string, usage: Map<string, number>) => (usage.get(word) ?? 0) >= WORD_USAGE_CAP,
  recordPuzzleWords: async () => {},
}));

const CHECKPOINT_PATH = path.join(__dirname, '..', 'src', 'data', `.gatedRegenReverse_${CONFIG.key}_progress.json`);
interface GatedCheckpoint { phaseCounts: Record<string, number>; phaseAttempts: Record<string, number>; puzzles: unknown[]; }
function loadCheckpoint(): GatedCheckpoint {
  try {
    if (fs.existsSync(CHECKPOINT_PATH)) {
      const data = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'));
      if (data && Array.isArray(data.puzzles)) {
        return { phaseCounts: data.phaseCounts ?? {}, phaseAttempts: data.phaseAttempts ?? {}, puzzles: data.puzzles };
      }
    }
  } catch { /* start fresh */ }
  return { phaseCounts: {}, phaseAttempts: {}, puzzles: [] };
}
function saveCheckpoint(cp: GatedCheckpoint): void {
  const tmp = CHECKPOINT_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cp), 'utf-8');
  fs.renameSync(tmp, CHECKPOINT_PATH);
}

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { generateLocalPuzzle, isDreadWord, getWordPhaseTier, getSemanticCluster, getFeaturedRank } from '../src/services/localGenerator';
import { COMMON_WORDS } from '../src/constants/wordLists';
import { PreGeneratedPuzzle } from '../src/data/puzzleBankTypes';

const PHASE_TARGETS: Record<number, number> = { 0: 120, 1: 100, 2: 100, 3: 100, 4: 80 };
const TOTAL_TARGET = Object.values(PHASE_TARGETS).reduce((a, b) => a + b, 0);
const ATTEMPTS_PER_TARGET_UNIT = 200; // reverse generation is slower; more budget headroom

const SIDECAR_PATH = path.join(__dirname, '..', 'src', 'data', `.gatedRegenReverse_${CONFIG.key}_output.ts`);

function puzzleId(words: string[]): string {
  return crypto.createHash('md5').update(words.join('-')).digest('hex').slice(0, 12);
}
function computeDreadTier(words: string[]): number {
  let m = 0; for (const w of words) { const t = getWordPhaseTier(w); if (t > m) m = t; } return m;
}
function computeDreadWordCount(words: string[]): number { return words.filter(w => isDreadWord(w)).length; }
function computeSemanticTags(words: string[]): string[] {
  const tags = new Set<string>();
  for (const w of words) { const c = getSemanticCluster(w); if (c) tags.add(c); }
  return [...tags];
}

// Anti-boring soft cap: fraction of forward solution moves that pluck an S.
function forwardSShare(solution: StepLike[] | undefined): number {
  if (!solution || solution.length === 0) return 0;
  const s = solution.filter(st => (st.letterToMove ?? '').toUpperCase() === 'S').length;
  return s / solution.length;
}

// FEATURED band: displayed words within the difficulty ceiling; all words
// (incl. reverse-leg transients) within the loose backstop; dread exempt.
function featuredBandOk(displayed: string[], allWords: string[]): boolean {
  for (const w of displayed) {
    if (getFeaturedRank(w) > CONFIG.featuredCeiling && !isDreadWord(w)) return false;
  }
  for (const w of allWords) {
    if (getFeaturedRank(w) > FEATURED_TRANSIENT_CEILING && !isDreadWord(w)) return false;
  }
  return true;
}

function serializeStep(s: { stepIndex: number; sourceWord: string; targetWord: string; letterToMove: string; explanation: string; insertionPosition?: number; removalPosition?: number }): string {
  const insertPos = s.insertionPosition !== undefined ? `,insertionPosition:${s.insertionPosition}` : '';
  const removePos = s.removalPosition !== undefined ? `,removalPosition:${s.removalPosition}` : '';
  return `{stepIndex:${s.stepIndex},sourceWord:'${s.sourceWord}',targetWord:'${s.targetWord}',letterToMove:'${s.letterToMove}',explanation:\`${s.explanation}\`${insertPos}${removePos}}`;
}
function serializePuzzle(p: PreGeneratedPuzzle): string {
  const solutionStr = (p.solution ?? []).map(serializeStep).join(',');
  const reverseStr = (p.reverseSolution ?? []).map(serializeStep).join(',');
  const reverseField = p.reverseSolution ? `,reverseSolution:[${reverseStr}]` : '';
  return `{id:'${p.id}',words:[${p.words.map(w => `'${w}'`).join(',')}],solution:[${solutionStr}]${reverseField},wordLength:${p.wordLength},qualityScore:${p.qualityScore},dreadTier:${p.dreadTier},dreadWordCount:${p.dreadWordCount},allWords:[${p.allWords.map(w => `'${w}'`).join(',')}],semanticTags:[${p.semanticTags.map(t => `'${t}'`).join(',')}]}`;
}
function writeSidecar(puzzles: PreGeneratedPuzzle[]): void {
  const fileContent = `// AUTO-GENERATED by scripts/generateGatedReverseBank.test.ts (gated reverse regeneration)
// Sidecar replacement for src/data/${CONFIG.liveFileName} — swapped in by scripts/swapGatedBanks.mjs.
// Bank: REVERSE ${CONFIG.bank} (${CONFIG.difficulty}), word cap ${CONFIG.wordCap}.
// Gate: reverse-solvable (shipped rules); non-duplicate chain; cap-safe;
// FEATURED displayed rank <= ${CONFIG.featuredCeiling} (dread exempt); forward S-share <= ${CONFIG.maxSShare}.
// Do not edit manually. Generated: ${new Date().toISOString()}. Total puzzles: ${puzzles.length}

import { PreGeneratedPuzzle } from './puzzleBankTypes';

export const ${CONFIG.exportName}: PreGeneratedPuzzle[] = [
${puzzles.map(p => '  ' + serializePuzzle(p)).join(',\n')}
];
`;
  const tmp = SIDECAR_PATH + '.tmp';
  fs.writeFileSync(tmp, fileContent, 'utf-8');
  fs.renameSync(tmp, SIDECAR_PATH);
  process.stdout.write(`Sidecar: wrote ${puzzles.length} puzzles to ${SIDECAR_PATH}\n`);
}

describe(`Gated Reverse Regeneration — ${BANK_NAME}`, () => {
  it(`regenerates the REVERSE ${BANK_NAME} bank`, async () => {
    const runStart = Date.now();
    const runDeadline = runStart + RUN_DEADLINE_MS;

    const checkpoint = loadCheckpoint();
    const allPuzzles: PreGeneratedPuzzle[] = checkpoint.puzzles as PreGeneratedPuzzle[];
    const seenChains = new Set<string>();
    for (const p of allPuzzles) {
      seenChains.add(p.words.join('-'));
      recordUsage(collectPuzzleWords(p as PuzzleLike));
    }

    process.stdout.write(`\n=== GATED REVERSE ${BANK_NAME}: resuming at ${allPuzzles.length}/${TOTAL_TARGET}, cap ${WORD_USAGE_CAP}, deadline ${Math.round(RUN_DEADLINE_MS / 1000)}s ===\n`);

    let runAttempts = 0, runAccepts = 0;
    let rejectedDup = 0, rejectedCap = 0, rejectedFeatured = 0, rejectedSShare = 0, rejectedNoReverse = 0, genFailures = 0;

    const logProgress = (): void => {
      const fill = Object.keys(PHASE_TARGETS).map(ph => `${ph}:${checkpoint.phaseCounts[ph] ?? 0}/${PHASE_TARGETS[Number(ph)]}`).join(' ');
      const pct = runAttempts > 0 ? ((runAccepts / runAttempts) * 100).toFixed(1) : '0.0';
      process.stdout.write(`[REV ${BANK_NAME}] ${allPuzzles.length}/${TOTAL_TARGET} | run ${runAccepts}/${runAttempts} (${pct}%) | phases ${fill} | rej dup ${rejectedDup} cap ${rejectedCap} feat ${rejectedFeatured} sshare ${rejectedSShare} noRev ${rejectedNoReverse} genFail ${genFailures}\n`);
    };

    const phaseEntries = Object.entries(PHASE_TARGETS);
    for (let phaseIndex = 0; phaseIndex < phaseEntries.length; phaseIndex++) {
      const [phaseStr, target] = phaseEntries[phaseIndex];
      const phase = parseInt(phaseStr);
      mockPhase = phase;
      let phaseCount = checkpoint.phaseCounts[phaseStr] ?? 0;
      let phaseAttempts = checkpoint.phaseAttempts[phaseStr] ?? 0;
      const phaseBudget = target * ATTEMPTS_PER_TARGET_UNIT;
      if (phaseCount >= target || phaseAttempts >= phaseBudget) {
        process.stdout.write(`  Phase ${phase}: done (${phaseCount}/${target}, ${phaseAttempts} attempts)\n`);
        continue;
      }
      const remainingTargets = phaseEntries.slice(phaseIndex).reduce((sum, [, t]) => sum + t, 0);
      const phaseDeadline = Math.min(runDeadline, Date.now() + Math.floor((runDeadline - Date.now()) * (target / remainingTargets)));

      while (phaseCount < target && phaseAttempts < phaseBudget && Date.now() < phaseDeadline) {
        phaseAttempts++; runAttempts++;
        checkpoint.phaseAttempts[phaseStr] = phaseAttempts;
        try {
          const puzzle = await generateLocalPuzzle(CONFIG.difficulty, { requireReverseSolvable: true });
          if (!puzzle.reverseSolution || puzzle.reverseSolution.length === 0) { rejectedNoReverse++; continue; }

          const chainKey = puzzle.words.join('-');
          if (seenChains.has(chainKey)) { rejectedDup++; continue; }
          seenChains.add(chainKey);

          const puzzleWords = collectPuzzleWords(puzzle as PuzzleLike);
          if (exceedsUsageCap(puzzleWords)) { rejectedCap++; continue; }
          if (!featuredBandOk(puzzle.words, puzzleWords)) { rejectedFeatured++; continue; }
          if (forwardSShare(puzzle.solution as StepLike[] | undefined) > CONFIG.maxSShare) { rejectedSShare++; continue; }

          const preGenPuzzle: PreGeneratedPuzzle = {
            id: puzzleId(puzzle.words),
            words: puzzle.words,
            solution: puzzle.solution || [],
            reverseSolution: puzzle.reverseSolution,
            wordLength: puzzle.wordLength || CONFIG.defaultWordLength,
            qualityScore: Math.round(puzzle.qualityScore ?? 50),
            dreadTier: computeDreadTier(puzzleWords),
            dreadWordCount: computeDreadWordCount(puzzleWords),
            allWords: puzzleWords,
            semanticTags: computeSemanticTags(puzzleWords),
          };
          allPuzzles.push(preGenPuzzle);
          recordUsage(puzzleWords);
          checkpoint.phaseCounts[phaseStr] = phaseCount + 1;
          saveCheckpoint(checkpoint);
          phaseCount++; runAccepts++;
          if (allPuzzles.length % 10 === 0) logProgress();
        } catch { genFailures++; }
      }
      process.stdout.write(`  Phase ${phase}: ${phaseCount}/${target} (${phaseAttempts}/${phaseBudget} attempts)\n`);
      if (Date.now() >= runDeadline) { process.stdout.write(`  Deadline reached; finalizing.\n`); break; }
    }

    saveCheckpoint(checkpoint);
    const totalAttempts = Object.values(checkpoint.phaseAttempts).reduce((a, b) => a + b, 0);
    const runPct = runAttempts > 0 ? ((runAccepts / runAttempts) * 100).toFixed(1) : '0.0';
    process.stdout.write(`\nRUN SUMMARY REV ${BANK_NAME}: accepted ${runAccepts}/${runAttempts} (${runPct}%); cumulative ${allPuzzles.length}/${TOTAL_TARGET} (${totalAttempts} attempts); rej dup ${rejectedDup} cap ${rejectedCap} feat ${rejectedFeatured} sshare ${rejectedSShare} noRev ${rejectedNoReverse} genFail ${genFailures}\n`);
    logProgress();
    writeSidecar(allPuzzles);

    expect(fs.existsSync(SIDECAR_PATH)).toBe(true);
    const countedPhases = Object.values(checkpoint.phaseCounts).reduce((a, b) => a + b, 0);
    expect(allPuzzles.length).toBe(countedPhases);
    expect(allPuzzles.length).toBeLessThanOrEqual(TOTAL_TARGET);
  }, 570000);
});
