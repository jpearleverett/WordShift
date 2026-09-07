import { passesBankMonotony } from './gatedMonotony';
import { hasBlockedDoubleShiftIntermediate } from '../src/services/puzzleContentPolicy';
import { COMMON_WORDS } from '../src/constants/wordLists';
import { qualifyFreshBankPuzzle } from '../src/services/bankDeliveryPolicy';
import { GATED_POLICY_HASH, validateGatedCheckpointPolicy } from './gatedCheckpoint';
import { getRequiredPuzzleWords, isFairPuzzleWord } from '../src/services/puzzleVocabulary';
/**
 * GATED REGENERATION for WordShift's four DOUBLE-SHIFT puzzle banks.
 *
 * A fork of the gated reverse generator. Double-shift moves TWO letters per step
 * (all 5-letter words; rows 3/4/5/6 by difficulty). The standard branching
 * analyzer models single-letter standard rules and is INVALID for double-shift's
 * two-letter cumulative-lock tree, so there is no branching gate here (the mode
 * is already differentiated by chain length + its own letter-separation
 * scoring). The refresh value is the 2x-larger 5-letter vocabulary + the
 * playable-vocabulary FEATURED band for recognizability, on top of the existing
 * diversity guards (word cap + dedup) and the bankSolvability CI guard.
 *
 * Never touches live files: finalizes to src/data/.gatedRegenDouble_<bank>_output.ts.
 * Env: GATED_BANK EASY|MEDIUM|MEDIUM_PLUS|HARD; GATED_SMOKE_MS / GATED_RUN_MS.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

type BankName = 'EASY' | 'MEDIUM' | 'MEDIUM_PLUS' | 'HARD' | 'EXPERT';
type GenDifficulty = 'EASY' | 'MEDIUM' | 'MEDIUM_PLUS' | 'HARD' | 'EXPERT';

interface DoubleBankConfig {
  bank: BankName;
  key: string;
  difficulty: GenDifficulty;
  wordCap: number;
  exportName: string;
  liveFileName: string;
  featuredCeiling: number;
  /** Uncommon-but-fair MEAN rarity floor on non-dread displayed words (EXPERT). */
  featuredFloorMean: number;
}

// Double-shift is ALWAYS 5-letter; caps match the shipped double banks (3/5/8/10).
// EXPERT double differentiates by chain LENGTH (7 rows — 6L double-shift is
// structurally impossible, needing 8-letter grow-targets) plus a light rarity lean.
const BANK_CONFIGS: Record<BankName, DoubleBankConfig> = {
  EASY:        { bank: 'EASY', key: 'double_easy', difficulty: 'EASY', wordCap: 3, exportName: 'PUZZLE_BANK_DOUBLE_SHIFT_EASY', liveFileName: 'puzzleBankDoubleShiftEasy.ts', featuredCeiling: 0.92, featuredFloorMean: 0 },
  MEDIUM:      { bank: 'MEDIUM', key: 'double_medium', difficulty: 'MEDIUM', wordCap: 5, exportName: 'PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM', liveFileName: 'puzzleBankDoubleShiftMedium.ts', featuredCeiling: 0.94, featuredFloorMean: 0 },
  MEDIUM_PLUS: { bank: 'MEDIUM_PLUS', key: 'double_medium_plus', difficulty: 'MEDIUM_PLUS', wordCap: 8, exportName: 'PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM_PLUS', liveFileName: 'puzzleBankDoubleShiftMediumPlus.ts', featuredCeiling: 0.96, featuredFloorMean: 0 },
  HARD:        { bank: 'HARD', key: 'double_hard', difficulty: 'HARD', wordCap: 10, exportName: 'PUZZLE_BANK_DOUBLE_SHIFT_HARD', liveFileName: 'puzzleBankDoubleShiftHard.ts', featuredCeiling: 0.98, featuredFloorMean: 0 },
  EXPERT:      { bank: 'EXPERT', key: 'double_expert', difficulty: 'EXPERT', wordCap: 10, exportName: 'PUZZLE_BANK_DOUBLE_SHIFT_EXPERT', liveFileName: 'puzzleBankDoubleShiftExpert.ts', featuredCeiling: 0.85, featuredFloorMean: 0 },
};

const BANK_NAME = String(process.env.GATED_BANK ?? 'MEDIUM').toUpperCase() as BankName;
const BASE_CONFIG = BANK_CONFIGS[BANK_NAME];
if (!BASE_CONFIG) throw new Error(`GATED_BANK must be EASY|MEDIUM|MEDIUM_PLUS|HARD|EXPERT (got '${process.env.GATED_BANK}')`);

// Lexicon overlay (GATED_LEXICON=1): rare-word DOUBLE-SHIFT bank per difficulty.
const LEXICON = process.env.GATED_LEXICON === '1';
const LEXICON_FLOOR_BY_BANK: Record<BankName, number> = {
  EASY: 0.50, MEDIUM: 0.55, MEDIUM_PLUS: 0.60, HARD: 0.65, EXPERT: 0.70,
};
const CONFIG: DoubleBankConfig = LEXICON
  ? {
      ...BASE_CONFIG,
      key: `lexicon_${BASE_CONFIG.key}`,
      exportName: `LEXICON_BANK_DOUBLE_${BANK_NAME}`,
      liveFileName: `lexiconBankDoubleShift${BANK_NAME.split('_').map(s => s.charAt(0) + s.slice(1).toLowerCase()).join('')}.ts`,
      featuredCeiling: 0.86, // fair ceiling: excludes the obscure inflection tail
      featuredFloorMean: LEXICON_FLOOR_BY_BANK[BANK_NAME],
      // Lexicon + double-shift + EXPERT is the scarcest corner in the game: a
      // 7-row chain where EVERY step moves two letters, drawn from a rare band
      // (mean rank >= 0.70) under a fair ceiling (<= 0.86). At the shared cap of
      // 10 the run plateaued at 62 boards with the word-usage cap accounting for
      // most rejections — the eligible rare 5-letter vocabulary is simply small,
      // so the cap binds long before the search does. 15 is the same relief that
      // took lex_rev_expert from a 76-board plateau to 114 with its rarity ramp
      // intact; bankDiversity's per-bank cap row must match.
      wordCap: BANK_NAME === 'EXPERT' ? 15 : BASE_CONFIG.wordCap,
    }
  : BASE_CONFIG;
const RARITY_LEAN = LEXICON ? (BANK_NAME === 'HARD' || BANK_NAME === 'EXPERT' ? 3 : 2) : 0; // EXPERT (a difficulty) keeps the fair default scorer

const RUN_DEADLINE_MS = Number(process.env.GATED_SMOKE_MS ?? process.env.GATED_RUN_MS ?? 540_000);
const FEATURED_TRANSIENT_CEILING = LEXICON ? 0.97 : 0.99;

let mockPhase = 0;
jest.mock('../src/services/amberCurrency', () => ({
  getCurrentPhase: async () => mockPhase,
  getFullProgress: async () => ({ puzzlesSolved: 999 }),
}));

const WORD_USAGE_CAP = CONFIG.wordCap;
const bankWordUsage = new Map<string, number>();

interface StepLike { sourceWord: string; targetWord: string; explanation?: string }
interface PuzzleLike { words: string[]; solution?: StepLike[] }
function collectPuzzleWords(puzzle: PuzzleLike): string[] {
  const seen = new Set<string>();
  for (const w of puzzle.words) seen.add(w.toUpperCase());
  for (const step of puzzle.solution ?? []) {
    if (step.sourceWord) seen.add(String(step.sourceWord).toUpperCase());
    if (step.targetWord) seen.add(String(step.targetWord).toUpperCase());
    const m = /form ([A-Z]+)/.exec(step.explanation ?? '');
    if (m) seen.add(m[1]);
  }
  for (const word of getRequiredPuzzleWords(puzzle as Parameters<typeof getRequiredPuzzleWords>[0])) seen.add(word.toUpperCase());
  return [...seen];
}
function exceedsUsageCap(words: string[]): boolean { return words.some(w => (bankWordUsage.get(w) ?? 0) >= WORD_USAGE_CAP); }
function recordUsage(words: string[]): void { for (const w of words) bankWordUsage.set(w, (bankWordUsage.get(w) ?? 0) + 1); }

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

const CHECKPOINT_PATH = path.join(__dirname, '..', 'src', 'data', `.gatedRegenDouble_${CONFIG.key}_progress.json`);
interface GatedCheckpoint { phaseCounts: Record<string, number>; phaseAttempts: Record<string, number>; puzzles: unknown[]; }
function loadCheckpoint(): GatedCheckpoint {
  try {
    if (fs.existsSync(CHECKPOINT_PATH)) {
      const data = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'));
      if (data && Array.isArray(data.puzzles)) {
        validateGatedCheckpointPolicy(data);
        return { phaseCounts: data.phaseCounts ?? {}, phaseAttempts: data.phaseAttempts ?? {}, puzzles: data.puzzles };
      }
    }
  } catch (error) { if (error instanceof Error && error.message.startsWith('Checkpoint vocabulary')) throw error; }
  return { phaseCounts: {}, phaseAttempts: {}, puzzles: [] };
}
function saveCheckpoint(cp: GatedCheckpoint): void {
  const tmp = CHECKPOINT_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ ...cp, vocabularyPolicyHash: GATED_POLICY_HASH }), 'utf-8');
  fs.renameSync(tmp, CHECKPOINT_PATH);
}

import { generateDoubleShiftPuzzle, isDreadWord, getWordPhaseTier, getSemanticCluster, getFeaturedRank } from '../src/services/localGenerator';
import { PreGeneratedPuzzle } from '../src/data/puzzleBankTypes';

// EXPERT double (5-letter, 7 rows) is the scarcest double board (a longer chain
// + the rarity lean), so it targets a smaller total; recycling handles it.
const PHASE_TARGETS: Record<number, number> = LEXICON && BANK_NAME === 'EXPERT'
  // Front-loaded like the lexicon-reverse EXPERT bank: the dread-leaning phase
  // buckets are far harder to fill in this corner (rare + two-letter moves +
  // 7 rows), and an evenly-split target spends the whole attempt budget
  // starving on phases 3-4 while phase 0-1 still has room. Bias the budget to
  // where boards actually exist; phase-aware selection degrades gracefully.
  ? { 0: 140, 1: 45, 2: 35, 3: 25, 4: 15 }  // 260
  : LEXICON
  ? { 0: 70, 1: 55, 2: 55, 3: 55, 4: 30 }   // 265
  : BANK_NAME === 'EXPERT'
  ? { 0: 70, 1: 55, 2: 55, 3: 55, 4: 30 }   // 265
  : { 0: 120, 1: 100, 2: 100, 3: 100, 4: 80 }; // 500
const TOTAL_TARGET = Object.values(PHASE_TARGETS).reduce((a, b) => a + b, 0);
const DELIVERY_TARGET = Number(process.env.GATED_TARGET ?? TOTAL_TARGET);
if (!Number.isInteger(DELIVERY_TARGET) || DELIVERY_TARGET < 1 || DELIVERY_TARGET > TOTAL_TARGET) throw new Error('Invalid GATED_TARGET');
const ATTEMPTS_PER_TARGET_UNIT = 150;
const SIDECAR_PATH = path.join(__dirname, '..', 'src', 'data', `.gatedRegenDouble_${CONFIG.key}_output.ts`);

function puzzleId(words: string[]): string { return crypto.createHash('md5').update(words.join('-')).digest('hex').slice(0, 12); }
function computeDreadTier(words: string[]): number { let m = 0; for (const w of words) { const t = getWordPhaseTier(w); if (t > m) m = t; } return m; }
function computeDreadWordCount(words: string[]): number { return words.filter(w => isDreadWord(w)).length; }
function computeSemanticTags(words: string[]): string[] { const s = new Set<string>(); for (const w of words) { const c = getSemanticCluster(w); if (c) s.add(c); } return [...s]; }

function featuredBandOk(displayed: string[], allWords: string[]): boolean {
  if (!allWords.every(word => isFairPuzzleWord(word, LEXICON || process.env.GATED_BANK === 'EXPERT'))) return false;
  for (const w of displayed) if (getFeaturedRank(w) > CONFIG.featuredCeiling && !isDreadWord(w)) return false;
  for (const w of allWords) if (getFeaturedRank(w) > FEATURED_TRANSIENT_CEILING && !isDreadWord(w)) return false;
  if (CONFIG.featuredFloorMean > 0) {
    const nonDread = displayed.filter(w => !isDreadWord(w));
    if (nonDread.length > 0) {
      const mean = nonDread.reduce((s, w) => s + getFeaturedRank(w), 0) / nonDread.length;
      if (mean < CONFIG.featuredFloorMean) return false;
    }
  }
  return true;
}

interface DoubleStep { stepIndex: number; sourceWord: string; targetWord: string; letterToMove: string; explanation: string; insertionPosition?: number; removalPosition?: number; lettersToMove?: string[]; insertionPositions?: number[]; removalPositions?: number[]; }
function serializePuzzle(p: PreGeneratedPuzzle): string {
  const solutionStr = (p.solution as DoubleStep[]).map(s => {
    const insertPos = s.insertionPosition !== undefined ? `,insertionPosition:${s.insertionPosition}` : '';
    const removePos = s.removalPosition !== undefined ? `,removalPosition:${s.removalPosition}` : '';
    const lettersToMove = s.lettersToMove ? `,lettersToMove:['${s.lettersToMove[0]}','${s.lettersToMove[1]}']` : '';
    const insertionPositions = s.insertionPositions ? `,insertionPositions:[${s.insertionPositions[0]},${s.insertionPositions[1]}]` : '';
    const removalPositions = s.removalPositions ? `,removalPositions:[${s.removalPositions[0]},${s.removalPositions[1]}]` : '';
    return `{stepIndex:${s.stepIndex},sourceWord:'${s.sourceWord}',targetWord:'${s.targetWord}',letterToMove:'${s.letterToMove}',explanation:\`${s.explanation}\`${insertPos}${removePos}${lettersToMove}${insertionPositions}${removalPositions}}`;
  }).join(',');
  return `{id:'${p.id}',words:[${p.words.map(w => `'${w}'`).join(',')}],solution:[${solutionStr}],wordLength:${p.wordLength},qualityScore:${p.qualityScore},dreadTier:${p.dreadTier},dreadWordCount:${p.dreadWordCount},allWords:[${p.allWords.map(w => `'${w}'`).join(',')}],semanticTags:[${p.semanticTags.map(t => `'${t}'`).join(',')}],isDoubleShift:true}`;
}
function writeSidecar(puzzles: PreGeneratedPuzzle[]): void {
  const fileContent = `// AUTO-GENERATED by scripts/generateGatedDoubleBank.test.ts (gated double-shift regeneration)
// Vocabulary policy: ${GATED_POLICY_HASH}
// Sidecar replacement for src/data/${CONFIG.liveFileName} — swapped in by scripts/swapGatedBanks.mjs.
// Bank: DOUBLE_SHIFT ${CONFIG.bank} (${CONFIG.difficulty}), word cap ${CONFIG.wordCap}.
// Gate: non-duplicate chain; cap-safe; FEATURED displayed rank <= ${CONFIG.featuredCeiling} (dread exempt).
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

describe(`Gated Double-Shift Regeneration — ${BANK_NAME}`, () => {
  it(`regenerates the DOUBLE-SHIFT ${BANK_NAME} bank`, async () => {
    const runDeadline = Date.now() + RUN_DEADLINE_MS;
    const checkpoint = loadCheckpoint();
    const allPuzzles: PreGeneratedPuzzle[] = checkpoint.puzzles as PreGeneratedPuzzle[];
    const seenChains = new Set<string>();
    for (const p of allPuzzles) { seenChains.add(p.words.join('-')); recordUsage(collectPuzzleWords(p as PuzzleLike)); }

    process.stdout.write(`\n=== GATED DOUBLE ${BANK_NAME}: resuming at ${allPuzzles.length}/${TOTAL_TARGET}, cap ${WORD_USAGE_CAP}, deadline ${Math.round(RUN_DEADLINE_MS / 1000)}s ===\n`);

    let runAttempts = 0, runAccepts = 0;
    let rejectedDup = 0, rejectedCap = 0, rejectedFeatured = 0, genFailures = 0;
    const logProgress = (): void => {
      const fill = Object.keys(PHASE_TARGETS).map(ph => `${ph}:${checkpoint.phaseCounts[ph] ?? 0}/${PHASE_TARGETS[Number(ph)]}`).join(' ');
      const pct = runAttempts > 0 ? ((runAccepts / runAttempts) * 100).toFixed(1) : '0.0';
      process.stdout.write(`[DBL ${BANK_NAME}] ${allPuzzles.length}/${TOTAL_TARGET} | run ${runAccepts}/${runAttempts} (${pct}%) | phases ${fill} | rej dup ${rejectedDup} cap ${rejectedCap} feat ${rejectedFeatured} genFail ${genFailures}\n`);
    };

    const phaseEntries = Object.entries(PHASE_TARGETS);
    for (let phaseIndex = 0; phaseIndex < phaseEntries.length; phaseIndex++) {
      const [phaseStr, target] = phaseEntries[phaseIndex];
      const phase = parseInt(phaseStr);
      mockPhase = phase;
      let phaseCount = checkpoint.phaseCounts[phaseStr] ?? 0;
      let phaseAttempts = checkpoint.phaseAttempts[phaseStr] ?? 0;
      const phaseBudget = target * ATTEMPTS_PER_TARGET_UNIT;
      if (phaseCount >= target || phaseAttempts >= phaseBudget) { process.stdout.write(`  Phase ${phase}: done (${phaseCount}/${target})\n`); continue; }
      const remainingTargets = phaseEntries.slice(phaseIndex).reduce((sum, [, t]) => sum + t, 0);
      const phaseDeadline = Math.min(runDeadline, Date.now() + Math.floor((runDeadline - Date.now()) * (target / remainingTargets)));

      while (allPuzzles.length < DELIVERY_TARGET && phaseCount < target && phaseAttempts < phaseBudget && Date.now() < phaseDeadline) {
        phaseAttempts++; runAttempts++;
        checkpoint.phaseAttempts[phaseStr] = phaseAttempts;
        try {
          const puzzle = await generateDoubleShiftPuzzle(CONFIG.difficulty, { rarityLean: RARITY_LEAN });
          const chainKey = puzzle.words.join('-');
          if (seenChains.has(chainKey)) { rejectedDup++; continue; }
          seenChains.add(chainKey);
          const puzzleWords = collectPuzzleWords(puzzle as PuzzleLike);
          if (exceedsUsageCap(puzzleWords)) { rejectedCap++; continue; }
          if (!featuredBandOk(puzzle.words, puzzleWords)) { rejectedFeatured++; continue; }

          const candidatePuzzle: PreGeneratedPuzzle = {
            id: puzzleId(puzzle.words),
            words: puzzle.words,
            solution: puzzle.solution || [],
            wordLength: puzzle.wordLength || 5,
            qualityScore: Math.round(puzzle.qualityScore ?? 50),
            dreadTier: computeDreadTier(puzzleWords),
            dreadWordCount: computeDreadWordCount(puzzleWords),
            allWords: puzzleWords,
            semanticTags: computeSemanticTags(puzzleWords),
            isDoubleShift: true,
          };
          if (hasBlockedDoubleShiftIntermediate(candidatePuzzle)) { genFailures++; continue; }
          const preGenPuzzle = qualifyFreshBankPuzzle(candidatePuzzle, LEXICON || BANK_NAME === 'EXPERT', 'double_shift', word => COMMON_WORDS.has(word.toUpperCase()));
          if (!preGenPuzzle) { genFailures++; continue; }
          if (!passesBankMonotony(allPuzzles, preGenPuzzle)) { rejectedCap++; continue; }
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
    process.stdout.write(`\nRUN SUMMARY DBL ${BANK_NAME}: accepted ${runAccepts}/${runAttempts} (${runPct}%); cumulative ${allPuzzles.length}/${TOTAL_TARGET} (${totalAttempts} attempts); rej dup ${rejectedDup} cap ${rejectedCap} feat ${rejectedFeatured} genFail ${genFailures}\n`);
    logProgress();
    writeSidecar(allPuzzles);

    expect(fs.existsSync(SIDECAR_PATH)).toBe(true);
    const countedPhases = Object.values(checkpoint.phaseCounts).reduce((a, b) => a + b, 0);
    expect(allPuzzles.length).toBe(countedPhases);
    expect(allPuzzles.length).toBeLessThanOrEqual(TOTAL_TARGET);
  }, 570000);
});
