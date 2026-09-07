import { passesBankMonotony } from './gatedMonotony';
import { qualifyFreshBankPuzzle } from '../src/services/bankDeliveryPolicy';
import { GATED_POLICY_HASH, validateGatedCheckpointPolicy } from './gatedCheckpoint';
import { getRequiredPuzzleWords, isFairPuzzleWord } from '../src/services/puzzleVocabulary';
/**
 * GATED FULL-REGENERATION generator for WordShift's four standard puzzle banks.
 *
 * Unlike the top-up scripts (which append to the shipped banks), this builds a
 * COMPLETE replacement bank from scratch around choice-rich boards. Every
 * accepted puzzle must pass the branching acceptance gate:
 *   - non-duplicate chain (within the new bank being built),
 *   - bank-wide word-usage cap safe (EASY 3 / MEDIUM 7 / MEDIUM_PLUS 10 / HARD 12),
 *   - analyzeStandardBranching completePathCount >= 2, and
 *   - singleChoiceFraction <= 0.65 for phase 0-2 boards, <= 0.75 for phase 3-4
 *     boards (the dread vocabulary is less connected; the looser late gate
 *     keeps the marquee dread supply alive).
 * Trap presence (trapStepFraction > 0) is a SOFT preference: recorded per
 * accept and reported, never gated on.
 *
 * The generator NEVER touches the live src/data/puzzleBank*.ts files. Each run
 * finalizes by writing the complete serialized bank so far to a SIDECAR:
 *   src/data/.gatedRegen_<bank>_output.ts
 * (dot-prefixed so tsc/metro ignore it). scripts/swapGatedBanks.mjs swaps a
 * finished sidecar over the live file at the end of the campaign.
 *
 * Parametrized by env:
 *   GATED_BANK      EASY | MEDIUM | MEDIUM_PLUS | HARD   (default MEDIUM)
 *   GATED_SMOKE_MS  optional short internal deadline for smoke runs
 *   GATED_RUN_MS    internal deadline override (default 540000 — finalize
 *                   before the driver's 570s jest --testTimeout kills the run)
 *
 * Run (one bounded pass; the driver loops it):
 *   cd mobile && GATED_BANK=MEDIUM NODE_OPTIONS=--max-old-space-size=650 \
 *     npm test -- --runInBand --config scripts/jest.config.js --no-coverage --forceExit \
 *     --testTimeout 570000 scripts/generateGatedBank.test.ts
 * Crash/timeout-safe: per-accept checkpoints at
 * src/data/.gatedRegen_<bank>_progress.json resume on re-run; each run also
 * rewrites the sidecar with whatever it has before the deadline.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// Bank parametrization (read before mocks so the word cap is fixed per run)
// ============================================================================

type BankName = 'EASY' | 'MEDIUM' | 'MEDIUM_PLUS' | 'HARD' | 'EXPERT';
type GenDifficulty = 'EASY' | 'MEDIUM' | 'MEDIUM_PLUS' | 'HARD' | 'EXPERT';

interface GatedBankConfig {
  bank: BankName;
  /** Lowercase file-name key: easy | medium | medium_plus | hard | expert. */
  key: string;
  difficulty: GenDifficulty;
  /** Bank-wide word-usage cap (matches the shipped banks' pinned caps). */
  wordCap: number;
  defaultWordLength: number;
  exportName: string;
  /** The live file this sidecar is built to replace (never written here). */
  liveFileName: string;
  /** puzzleBankHard.ts re-exports the puzzle type; the sidecar must too. */
  typeReExport: boolean;
}

const BANK_CONFIGS: Record<BankName, GatedBankConfig> = {
  EASY: {
    bank: 'EASY', key: 'easy', difficulty: 'EASY', wordCap: 3,
    defaultWordLength: 4, exportName: 'PUZZLE_BANK_EASY',
    liveFileName: 'puzzleBankEasy.ts', typeReExport: false,
  },
  MEDIUM: {
    bank: 'MEDIUM', key: 'medium', difficulty: 'MEDIUM', wordCap: 7,
    defaultWordLength: 4, exportName: 'PUZZLE_BANK_MEDIUM',
    liveFileName: 'puzzleBankMedium.ts', typeReExport: false,
  },
  MEDIUM_PLUS: {
    bank: 'MEDIUM_PLUS', key: 'medium_plus', difficulty: 'MEDIUM_PLUS', wordCap: 10,
    defaultWordLength: 5, exportName: 'PUZZLE_BANK_MEDIUM_PLUS',
    liveFileName: 'puzzleBankMediumPlus.ts', typeReExport: false,
  },
  HARD: {
    bank: 'HARD', key: 'hard', difficulty: 'HARD', wordCap: 12,
    defaultWordLength: 5, exportName: 'PUZZLE_BANK_HARD',
    liveFileName: 'puzzleBankHard.ts', typeReExport: true,
  },
  // EXPERT (apex): 6-letter words, 5 rows. Transients 5/7 both exist in the
  // dictionary, so 6L standard boards are feasible (7L would need 8-letter
  // grow-targets, which don't exist). The bank folds in a moderate
  // "uncommon-but-fair" vocabulary lean (see GATE_BY_BANK.EXPERT).
  EXPERT: {
    bank: 'EXPERT', key: 'expert', difficulty: 'EXPERT', wordCap: 10,
    defaultWordLength: 6, exportName: 'PUZZLE_BANK_EXPERT',
    liveFileName: 'puzzleBankExpert.ts', typeReExport: false,
  },
};

const BANK_NAME = String(process.env.GATED_BANK ?? 'MEDIUM').toUpperCase() as BankName;
const BASE_CONFIG = BANK_CONFIGS[BANK_NAME];
if (!BASE_CONFIG) {
  throw new Error(`GATED_BANK must be one of EASY|MEDIUM|MEDIUM_PLUS|HARD|EXPERT (got '${process.env.GATED_BANK}')`);
}

// Lexicon overlay (GATED_LEXICON=1): a rare-word STANDARD bank per difficulty
// (own key/export/live-file, gitignored sidecar), sharing all the machinery
// below. The rarity gate itself is applied in GATE further down.
const LEXICON = process.env.GATED_LEXICON === '1';
const CONFIG: GatedBankConfig = LEXICON
  ? {
      ...BASE_CONFIG,
      key: `lexicon_${BASE_CONFIG.key}`,
      exportName: `LEXICON_BANK_${BANK_NAME}`,
      // e.g. lexiconBankEasy.ts, lexiconBankMediumPlus.ts, lexiconBankExpert.ts
      liveFileName: `lexiconBank${BANK_NAME.split('_').map(s => s.charAt(0) + s.slice(1).toLowerCase()).join('')}.ts`,
      typeReExport: false,
    }
  : BASE_CONFIG;

// Internal wall-clock deadline: finalize (sidecar write) happens BEFORE the
// driver's jest --testTimeout 570000 can kill the process, mirroring the
// top-up scripts' finalize-before-jest-deadline pattern. GATED_SMOKE_MS wins
// so smoke runs can bound the whole pass to ~2 minutes.
const RUN_DEADLINE_MS = Number(process.env.GATED_SMOKE_MS ?? process.env.GATED_RUN_MS ?? 540_000);

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
// Same model as the bank generators: count, for the WHOLE new bank, how many
// accepted puzzles each visible word appears in. A word at the cap is treated
// as hard-cooldown inside the generator, and the accept loop hard-rejects any
// candidate that would push a word past the cap (covers formed words the DFS
// cannot see). Full regeneration: usage starts empty and accumulates only
// from accepted puzzles (reloaded from the checkpoint on resume).
// ============================================================================

const WORD_USAGE_CAP = CONFIG.wordCap;
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
  for (const word of getRequiredPuzzleWords(puzzle as Parameters<typeof getRequiredPuzzleWords>[0])) seen.add(word.toUpperCase());
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
// Crash-safe checkpointing (mirrors the bank generators)
// One checkpoint per bank; saved after every accepted puzzle so a killed or
// timed-out run resumes exactly where it left off. Cumulative attempt counts
// persist too, so the per-phase attempt budget spans re-runs.
// ============================================================================

const CHECKPOINT_PATH = require('path').join(
  __dirname, '..', 'src', 'data', `.gatedRegen_${CONFIG.key}_progress.json`,
);

interface GatedCheckpoint {
  phaseCounts: Record<string, number>;
  phaseAttempts: Record<string, number>;
  /** Soft-preference tally: accepts whose trapStepFraction > 0. */
  trapAccepts: number;
  puzzles: unknown[];
}

function loadCheckpoint(): GatedCheckpoint {
  try {
    const fsMod = require('fs');
    if (fsMod.existsSync(CHECKPOINT_PATH)) {
      const data = JSON.parse(fsMod.readFileSync(CHECKPOINT_PATH, 'utf-8'));
      if (data && Array.isArray(data.puzzles)) {
        validateGatedCheckpointPolicy(data);
        return {
          phaseCounts: data.phaseCounts ?? {},
          phaseAttempts: data.phaseAttempts ?? {},
          trapAccepts: data.trapAccepts ?? 0,
          puzzles: data.puzzles,
        };
      }
    }
  } catch (error) { if (error instanceof Error && error.message.startsWith('Checkpoint vocabulary')) throw error; }
  return { phaseCounts: {}, phaseAttempts: {}, trapAccepts: 0, puzzles: [] };
}

function saveCheckpoint(cp: GatedCheckpoint): void {
  const fsMod = require('fs');
  const tmp = CHECKPOINT_PATH + '.tmp';
  fsMod.writeFileSync(tmp, JSON.stringify({ ...cp, vocabularyPolicyHash: GATED_POLICY_HASH }), 'utf-8');
  fsMod.renameSync(tmp, CHECKPOINT_PATH); // atomic on Linux
}

// ============================================================================
// Imports — after mocks
// ============================================================================

import { generateLocalPuzzle, isDreadWord, getWordPhaseTier, getSemanticCluster, getFeaturedRank } from '../src/services/localGenerator';
import { analyzeStandardBranching } from '../src/services/puzzleBranching';
import { COMMON_WORDS } from '../src/constants/wordLists';
import { PreGeneratedPuzzle } from '../src/data/puzzleBankTypes';

// ============================================================================
// Targets and acceptance gate
// ============================================================================

// Per-phase targets. The four base difficulties target 500 (120/100/100/100/80).
// EXPERT (apex, 6-letter, uncommon-but-fair) and Lexicon (rare-word) are niche
// late-unlock modes with scarcer supply and recycling handling small banks, so
// they target smaller totals — right-sized for reliable, bounded generation.
const PHASE_TARGETS: Record<number, number> =
  LEXICON
    ? { 0: 70, 1: 55, 2: 55, 3: 55, 4: 30 }   // 265 (rare supply is thin)
    : BANK_NAME === 'EXPERT'
    ? { 0: 90, 1: 75, 2: 75, 3: 75, 4: 45 }    // 360
    : { 0: 120, 1: 100, 2: 100, 3: 100, 4: 80 }; // 500
const TOTAL_TARGET = Object.values(PHASE_TARGETS).reduce((a, b) => a + b, 0);
const DELIVERY_TARGET = Number(process.env.GATED_TARGET ?? TOTAL_TARGET);
if (!Number.isInteger(DELIVERY_TARGET) || DELIVERY_TARGET < 1 || DELIVERY_TARGET > TOTAL_TARGET) throw new Error('Invalid GATED_TARGET');

// Cumulative attempt budget per phase (spans re-runs via the checkpoint).
// Generous: the driver's plateau exit is the real terminator; the budget only
// stops a bank that can never fill from burning wall-clock forever.
const ATTEMPTS_PER_TARGET_UNIT = 120;

// ============================================================================
// Per-difficulty acceptance gate (the depth-lever regeneration).
// The four difficulties are genuinely differentiated on THREE axes now that the
// 2x dictionary makes it feasible: branching pressure (singleChoice + minPaths),
// trap density (bank-level floor on the hard banks), and the playable-vocabulary
// FEATURED band (displayed chain + answer words within a per-difficulty
// frequency-rank ceiling; dread words exempt so the descent still lands).
// Phase 0-2 boards use the dense common vocabulary, so they carry the demanding
// bars; phase 3-4 dread vocabulary is less connected, so those bars relax.
// ============================================================================

interface GateParams {
  minPathsEarly: number;   // phase 0-2 completePathCount floor
  minPathsLate: number;    // phase 3-4 completePathCount floor
  singleChoiceEarly: number;
  singleChoiceLate: number;
  featuredCeiling: number; // max getFeaturedRank for a non-dread FEATURED word
  deadEndCeiling: number;  // max deadEndStateFraction (wander-into-nothing bound)
  trapFloor: number;       // bank-level min fraction of trap-bearing accepts
  // "Uncommon-but-fair" rarity lean (EXPERT + Lexicon): the MEAN featured-rank
  // of the board's non-dread DISPLAYED words must be >= this. Applied to the
  // mean (not every word) so the board reads rarer overall without the brittle
  // per-word AND that would starve generation. 0 disables it (the four base
  // difficulties, which stay recognizable-mainstream by design).
  featuredFloorMean: number;
}

// singleChoiceFraction is the primary "choice-rich" lever (fraction of decision
// states that are forced); completePathCount >= 2 is the floor beneath it. The
// per-difficulty single-choice ceilings tighten toward the bright phases where
// the dense common vocabulary supports pervasive choice; phase 3-4 dread
// vocabulary is less connected so those relax. featuredCeiling bounds a board's
// RAREST displayed word to exclude only the obscure tail (measured per-board
// max displayed rank is p50 ~0.77-0.87), a light backstop against obscure
// answers on top of the scorer's own de-rarify preference. The heavy difficulty
// differentiation is the single-choice ceiling + the trap floor.
// 5-letter bright (phase 0-2) boards are the scarcest choice-rich boards (the
// less-connected common vocabulary), so the ultra-tight 0.55/0.58 bright bars
// starved MP/HARD bright supply and skewed them dread-heavy. MP/HARD bright
// ceilings are relaxed toward the original gated regen's 0.65 to restore bright
// supply + phase balance while staying tighter than the old dread bar and
// keeping every other win (anti-boring, featured band, clean vocab, traps). The
// 4-letter EASY/MEDIUM banks fill bright phases fine at 0.50, so they stay tight.
const GATE_BY_BANK: Record<BankName, GateParams> = {
  EASY:        { minPathsEarly: 2, minPathsLate: 2, singleChoiceEarly: 0.50, singleChoiceLate: 0.62, featuredCeiling: 0.92, deadEndCeiling: 0.25, trapFloor: 0, featuredFloorMean: 0 },
  MEDIUM:      { minPathsEarly: 2, minPathsLate: 2, singleChoiceEarly: 0.50, singleChoiceLate: 0.65, featuredCeiling: 0.94, deadEndCeiling: 0.25, trapFloor: 0, featuredFloorMean: 0 },
  // The D3 fix (path-count dedup) made completePathCount stricter than the
  // original gated regen measured, so the 5-letter single-choice bars are
  // relaxed further than the old 0.65/0.75 to restore comparable supply AND let
  // the dread phases (3-4) fill — an over-tight HARD starved its marquee
  // VOID/OMEN/TOMB dread boards. completePathCount>=2 (the multi-route
  // guarantee) is kept; the trap floor eases so dread supply wins over trap
  // density on the hardest banks.
  MEDIUM_PLUS: { minPathsEarly: 2, minPathsLate: 2, singleChoiceEarly: 0.68, singleChoiceLate: 0.76, featuredCeiling: 0.96, deadEndCeiling: 0.30, trapFloor: 0.20, featuredFloorMean: 0 },
  HARD:        { minPathsEarly: 2, minPathsLate: 2, singleChoiceEarly: 0.72, singleChoiceLate: 0.82, featuredCeiling: 0.98, deadEndCeiling: 0.30, trapFloor: 0.20, featuredFloorMean: 0 },
  // EXPERT (6-letter): a DIFFICULTY (unlocks at 50), so its words stay FAIR and
  // recognizable — the challenge is the 6-tile length + longer chains, not rare
  // vocabulary (that is Lexicon's job). No rarity lean/floor; the default
  // de-rarify scorer keeps it mainstream-to-uncommon, and the ceiling excludes
  // only the obscure inflection tail. 6L words are less connected than 5L, so the
  // single-choice bars relax over HARD's; completePathCount>=2 (multi-route) kept.
  EXPERT:      { minPathsEarly: 2, minPathsLate: 2, singleChoiceEarly: 0.78, singleChoiceLate: 0.86, featuredCeiling: 0.85, deadEndCeiling: 0.32, trapFloor: 0.20, featuredFloorMean: 0 },
};

// Lexicon overlay (GATED_LEXICON=1): the same board machinery, but the
// vocabulary is pushed HARD toward the rare tail and the lean RAMPS across the
// difficulty axis (EASY rare-ish -> EXPERT very rare). Composable-mode banks,
// standard boards only. The mean rarity floor climbs and the ceiling opens up
// to admit the obscure tail (Lexicon is precisely a rare-word mode); the
// branching/trap/dead-end structure is inherited from the base difficulty so
// the boards stay solvable and choice-rich, only the WORDS get harder. (The
// LEXICON flag + Lexicon-aware CONFIG are defined near the top so the
// checkpoint/sidecar paths pick up the lexicon_ key.)
// The rarity floor RAMPS across difficulty (EASY rare-ish -> EXPERT very rare),
// but every board stays under a FAIR ceiling: the dictionary's rare tail
// (rank > ~0.85) is obscure validity-only inflections, so Lexicon leans rare
// WITHOUT crossing into unfair. The generator's strong rarity lean produces
// words in this band directly, so acceptance stays healthy.
const LEXICON_FLOOR_BY_BANK: Record<BankName, number> = {
  EASY: 0.50, MEDIUM: 0.55, MEDIUM_PLUS: 0.60, HARD: 0.65, EXPERT: 0.70,
};
const LEXICON_CEILING = 0.86; // fair ceiling: excludes the obscure inflection tail
const GATE: GateParams = LEXICON
  ? {
      ...GATE_BY_BANK[BANK_NAME],
      featuredFloorMean: LEXICON_FLOOR_BY_BANK[BANK_NAME],
      featuredCeiling: LEXICON_CEILING,
      // Rare vocabulary is less connected; ease branching so Lexicon can fill.
      singleChoiceEarly: Math.max(GATE_BY_BANK[BANK_NAME].singleChoiceEarly, 0.85),
      singleChoiceLate: Math.max(GATE_BY_BANK[BANK_NAME].singleChoiceLate, 0.90),
      trapFloor: 0, // don't stack a trap floor on the already-scarce rare supply
    }
  : GATE_BY_BANK[BANK_NAME];

// Generator rarity lean: 2 for Lexicon, 3 for its Hard/Expert offline search,
// and 0 otherwise. EXPERT
// is a difficulty, so it keeps the default (fair, mainstream-to-uncommon)
// scorer — rarity is Lexicon's job. This makes Lexicon PRODUCE rare boards
// directly (the featured floor is then a light confirmation, not a grind).
const RARITY_LEAN = LEXICON ? (BANK_NAME === 'HARD' || BANK_NAME === 'EXPERT' ? 3 : 2) : 0;

function minPathsForPhase(phase: number): number {
  return phase >= 3 ? GATE.minPathsLate : GATE.minPathsEarly;
}
function maxSingleChoiceForPhase(phase: number): number {
  return phase >= 3 ? GATE.singleChoiceLate : GATE.singleChoiceEarly;
}

// Playable-vocabulary policy. The DISPLAYED chain words (what the player reads
// on the board) must sit within the difficulty's frequency-rank ceiling so the
// board is recognizable and difficulties differ by vocabulary. The FORMED /
// transient answer words are discovered mid-solve and are inherently rarer
// (the +1-length word space is larger), so they only get a loose backstop
// against the genuinely-obscure tail. Dread words are exempt everywhere so the
// descent vocabulary still lands. The generator still TRAVERSES the full
// dictionary for connectivity; this only bounds what is FEATURED.
const FEATURED_TRANSIENT_CEILING = LEXICON ? 0.97 : 0.99;
function featuredBandOk(displayed: string[], allWords: string[]): boolean {
  if (!allWords.every(word => isFairPuzzleWord(word, LEXICON || process.env.GATED_BANK === 'EXPERT'))) return false;
  for (const w of displayed) {
    if (getFeaturedRank(w) > GATE.featuredCeiling && !isDreadWord(w)) return false;
  }
  for (const w of allWords) {
    if (getFeaturedRank(w) > FEATURED_TRANSIENT_CEILING && !isDreadWord(w)) return false;
  }
  // "Uncommon-but-fair" rarity lean (EXPERT + Lexicon): the MEAN featured-rank
  // of the non-dread displayed words must clear the floor, so the whole board
  // reads rarer without any single word needing to be obscure. Dread words are
  // excluded from the mean (thematic, not a rarity signal); an all-dread board
  // skips the floor.
  if (GATE.featuredFloorMean > 0) {
    const nonDread = displayed.filter(w => !isDreadWord(w));
    if (nonDread.length > 0) {
      const mean = nonDread.reduce((s, w) => s + getFeaturedRank(w), 0) / nonDread.length;
      if (mean < GATE.featuredFloorMean) return false;
    }
  }
  return true;
}

const SIDECAR_PATH = path.join(
  __dirname, '..', 'src', 'data', `.gatedRegen_${CONFIG.key}_output.ts`,
);

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

interface GateResult {
  pass: boolean;
  hasTrap: boolean;
}

function checkBranchingGate(words: string[], phase: number): GateResult {
  // Mirror puzzleBank.ts: the analyzer's validity callback is COMMON_WORDS.
  const metrics = analyzeStandardBranching(
    words,
    word => COMMON_WORDS.has(word.toUpperCase()),
  );
  return {
    pass: metrics.completePathCount >= minPathsForPhase(phase) &&
      metrics.singleChoiceFraction <= maxSingleChoiceForPhase(phase) &&
      metrics.deadEndStateFraction <= GATE.deadEndCeiling,
    hasTrap: metrics.trapStepFraction > 0,
  };
}

function writeSidecar(puzzles: PreGeneratedPuzzle[], trapAccepts: number): void {
  const typeLine = CONFIG.typeReExport
    ? `export type { PreGeneratedPuzzle } from './puzzleBankTypes';\n`
    : '';
  const fileContent = `// AUTO-GENERATED by scripts/generateGatedBank.test.ts (gated full regeneration)
// Vocabulary policy: ${GATED_POLICY_HASH}
// Sidecar replacement for src/data/${CONFIG.liveFileName} — swapped in by scripts/swapGatedBanks.mjs.
// Bank: ${CONFIG.bank} (${CONFIG.difficulty}), bank-wide word-usage cap ${CONFIG.wordCap}.
// Per-difficulty acceptance gate (every puzzle): non-duplicate chain; cap-safe;
// FEATURED words within rank ceiling ${GATE.featuredCeiling} (dread exempt);
// completePathCount >= ${GATE.minPathsEarly}/${GATE.minPathsLate} (phase 0-2/3-4);
// singleChoiceFraction <= ${GATE.singleChoiceEarly}/${GATE.singleChoiceLate} (phase 0-2/3-4);
// deadEndStateFraction <= ${GATE.deadEndCeiling}.
// Trap-bearing accepts (trapStepFraction > 0; bank-level floor ${GATE.trapFloor}): ${trapAccepts}/${puzzles.length}.
// Do not edit manually. Re-run the generator to update.
// Generated: ${new Date().toISOString()}
// Total puzzles: ${puzzles.length}

import { PreGeneratedPuzzle } from './puzzleBankTypes';
${typeLine}
export const ${CONFIG.exportName}: PreGeneratedPuzzle[] = [
${puzzles.map(p => '  ' + serializePuzzle(p)).join(',\n')}
];
`;

  const tmp = SIDECAR_PATH + '.tmp';
  fs.writeFileSync(tmp, fileContent, 'utf-8');
  fs.renameSync(tmp, SIDECAR_PATH);
  process.stdout.write(`Sidecar: wrote ${puzzles.length} puzzles to ${SIDECAR_PATH}\n`);
}

// ============================================================================
// Main generation test
// ============================================================================

describe(`Gated Full-Regeneration Generator — ${BANK_NAME} Standard`, () => {
  it(`regenerates the ${BANK_NAME} bank around choice-rich boards`, async () => {
    const runStart = Date.now();
    const runDeadline = runStart + RUN_DEADLINE_MS;

    const checkpoint = loadCheckpoint();
    const allPuzzles: PreGeneratedPuzzle[] = checkpoint.puzzles as PreGeneratedPuzzle[];
    const seenChains = new Set<string>();
    for (const p of allPuzzles) {
      seenChains.add(p.words.join('-'));
      recordUsage(collectPuzzleWords(p as { words: string[]; solution?: { sourceWord: string; targetWord: string; explanation?: string }[] }));
    }

    process.stdout.write(
      `\n=== GATED REGEN ${BANK_NAME}: resuming at ${allPuzzles.length}/${TOTAL_TARGET}, ` +
      `word cap ${WORD_USAGE_CAP}, deadline ${Math.round(RUN_DEADLINE_MS / 1000)}s ===\n`,
    );

    // Run-scope tallies (the checkpoint carries cumulative counts).
    let runAttempts = 0;
    let runAccepts = 0;
    let runTrapAccepts = 0;
    let rejectedDup = 0;
    let rejectedCap = 0;
    let rejectedBranching = 0;
    let rejectedFeatured = 0;
    let rejectedTrapFloor = 0;
    let trapFloorStreak = 0;
    let genFailures = 0;

    const logProgress = (): void => {
      const fill = Object.keys(PHASE_TARGETS)
        .map(ph => `${ph}:${checkpoint.phaseCounts[ph] ?? 0}/${PHASE_TARGETS[Number(ph)]}`)
        .join(' ');
      const pct = runAttempts > 0 ? ((runAccepts / runAttempts) * 100).toFixed(1) : '0.0';
      process.stdout.write(
        `[${BANK_NAME}] ${allPuzzles.length}/${TOTAL_TARGET} accepted | ` +
        `run ${runAccepts}/${runAttempts} attempts (${pct}%) | phases ${fill} | ` +
        `rej dup ${rejectedDup} cap ${rejectedCap} feat ${rejectedFeatured} branch ${rejectedBranching} trapfloor ${rejectedTrapFloor} genFail ${genFailures} | ` +
        `traps ${checkpoint.trapAccepts}/${allPuzzles.length}\n`,
      );
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

      // Slice remaining wall-clock across remaining phases proportionally to
      // their targets, so an attempt-rich early phase cannot consume the whole
      // deadline before later phases run.
      const remainingTargets = phaseEntries
        .slice(phaseIndex)
        .reduce((sum, [, t]) => sum + t, 0);
      const phaseDeadline = Math.min(
        runDeadline,
        Date.now() + Math.floor((runDeadline - Date.now()) * (target / remainingTargets)),
      );

      while (allPuzzles.length < DELIVERY_TARGET && phaseCount < target && phaseAttempts < phaseBudget && Date.now() < phaseDeadline) {
        phaseAttempts++;
        runAttempts++;
        checkpoint.phaseAttempts[phaseStr] = phaseAttempts;

        try {
          const puzzle = await generateLocalPuzzle(CONFIG.difficulty, { rarityLean: RARITY_LEAN });
          const chainKey = puzzle.words.join('-');

          if (seenChains.has(chainKey)) {
            rejectedDup++;
            continue;
          }
          seenChains.add(chainKey);

          // Bank-wide diversity: reject any puzzle that would push a word past the cap.
          const puzzleWords = collectPuzzleWords(puzzle);
          if (exceedsUsageCap(puzzleWords)) {
            rejectedCap++;
            continue;
          }

          // Playable-vocabulary policy: displayed words recognizable per
          // difficulty, formed answers at a loose backstop (dread exempt).
          if (!featuredBandOk(puzzle.words, puzzleWords)) {
            rejectedFeatured++;
            continue;
          }

          // The point of this campaign: only choice-rich boards ship.
          const gate = checkBranchingGate(puzzle.words, phase);
          if (!gate.pass) {
            rejectedBranching++;
            continue;
          }

          // Bank-level trap floor (MP/HARD): while the bank is below its trap
          // target, drop non-trap accepts so trap-bearing (planning-depth)
          // boards accumulate. A streak guard forces an accept if traps go
          // momentarily scarce, so generation can never stall on this.
          if (GATE.trapFloor > 0 && !gate.hasTrap) {
            const trapFrac = allPuzzles.length > 0 ? checkpoint.trapAccepts / allPuzzles.length : 0;
            if (trapFrac < GATE.trapFloor && trapFloorStreak < 25) {
              trapFloorStreak++;
              rejectedTrapFloor++;
              continue;
            }
          }
          trapFloorStreak = 0;

          const id = puzzleId(puzzle.words);
          const dreadTier = computeDreadTier(puzzleWords);
          const dreadWordCount = computeDreadWordCount(puzzleWords);
          const semanticTags = computeSemanticTags(puzzleWords);

          const candidatePuzzle: PreGeneratedPuzzle = {
            id,
            words: puzzle.words,
            solution: puzzle.solution || [],
            wordLength: puzzle.wordLength || CONFIG.defaultWordLength,
            qualityScore: Math.round(puzzle.qualityScore ?? 50),
            dreadTier,
            dreadWordCount,
            allWords: puzzleWords,
            semanticTags,
          };

          const preGenPuzzle = qualifyFreshBankPuzzle(candidatePuzzle, LEXICON || BANK_NAME === 'EXPERT', 'standard', word => COMMON_WORDS.has(word.toUpperCase()));
          if (!preGenPuzzle) { genFailures++; continue; }
          if (!passesBankMonotony(allPuzzles, preGenPuzzle)) { rejectedCap++; continue; }
          allPuzzles.push(preGenPuzzle);
          recordUsage(puzzleWords);
          checkpoint.phaseCounts[phaseStr] = phaseCount + 1;
          if (gate.hasTrap) {
            checkpoint.trapAccepts++;
            runTrapAccepts++;
          }
          saveCheckpoint(checkpoint);
          phaseCount++;
          runAccepts++;

          if (allPuzzles.length % 10 === 0) {
            logProgress();
          }
        } catch {
          genFailures++;
        }
      }

      process.stdout.write(`  Phase ${phase}: ${phaseCount}/${target} (${phaseAttempts}/${phaseBudget} attempts)\n`);
      if (Date.now() >= runDeadline) {
        process.stdout.write(`  Deadline reached; finalizing with current progress.\n`);
        break;
      }
    }

    // Persist attempt counters even when nothing new was accepted this run.
    saveCheckpoint(checkpoint);

    const totalAttemptsSoFar = Object.values(checkpoint.phaseAttempts).reduce((a, b) => a + b, 0);
    const runPct = runAttempts > 0 ? ((runAccepts / runAttempts) * 100).toFixed(1) : '0.0';
    process.stdout.write(
      `\nRUN SUMMARY ${BANK_NAME}: accepted ${runAccepts}/${runAttempts} attempts this run (${runPct}%), ` +
      `trap-bearing ${runTrapAccepts}; cumulative ${allPuzzles.length}/${TOTAL_TARGET} ` +
      `(${totalAttemptsSoFar} attempts, traps ${checkpoint.trapAccepts}/${allPuzzles.length}); ` +
      `rej dup ${rejectedDup} cap ${rejectedCap} feat ${rejectedFeatured} branch ${rejectedBranching} trapfloor ${rejectedTrapFloor} genFail ${genFailures}\n`,
    );
    logProgress();

    // Finalize: ALWAYS rewrite the sidecar with the complete bank so far
    // (partial banks are fine; the swap script enforces the ship threshold).
    writeSidecar(allPuzzles, checkpoint.trapAccepts);

    // The run itself always "passes" — completion is the DRIVER's judgment
    // (target reached or plateau). Only structural sanity is asserted here.
    expect(fs.existsSync(SIDECAR_PATH)).toBe(true);
    const countedPhases = Object.values(checkpoint.phaseCounts).reduce((a, b) => a + b, 0);
    expect(allPuzzles.length).toBe(countedPhases);
    expect(allPuzzles.length).toBeLessThanOrEqual(TOTAL_TARGET);
  }, 570000);
});
