/**
 * EXPERT DREAD TOP-UP generator.
 *
 * The Post-Audit gated regeneration left the EXPERT standard bank with only
 * 14/195 boards at dread tier >= 3 (vs ~93/457 HARD) — the marquee horror
 * vocabulary is thinnest at the apex tier during the climax. The gated
 * generator PREFERS dread at phases 3-4 (via the phase-aware scorer) but never
 * REQUIRES it, and 6-letter chains rarely land dread words by preference alone.
 *
 * This top-up APPENDS to the shipped bank (it never rebuilds it): every accept
 * must carry computeDreadTier >= 3 across its player-visible words AND pass the
 * same per-board acceptance gate as the gated EXPERT regeneration:
 *   - non-duplicate chain (against the live bank, the other 6-letter banks, and
 *     this run's accepts — the B2 cross-bank guard),
 *   - bank-wide word-usage cap safe (10, seeded from the live bank),
 *   - FEATURED band (ceiling 0.85 non-dread; transients <= 0.99; dread exempt),
 *   - branching gate at the LATE bars (completePathCount >= 2,
 *     singleChoiceFraction <= 0.86, deadEndStateFraction <= 0.32) — these
 *     boards serve at phases 3-4, so the late bars are the right ones,
 *   - structural-monotony safe for the UNION (projected starting-letter,
 *     first-moved-letter, and S-move shares stay under 0.28 — margin below the
 *     0.30 bankDiversity B1 guards; the 6L dread pool is S-heavy, so without
 *     this a dread top-up would trip the S-shuffle guard).
 *
 * Supply comes from two interleaved strategies: FORCED-START boards seeded from
 * the 6-letter tier-3/4 dread pool (the chain then features the dread word by
 * construction; generateLocalPuzzle relaxes its score floor for forced starts),
 * and free generation at mockPhase 4 (the scorer's maximum dread preference),
 * which can also land 5L/7L dread transients.
 *
 * Never touches the live file. Finalizes a MERGED sidecar (live + accepts):
 *   src/data/.expertDreadTopUp_output.ts
 * applied by scripts/applyExpertDreadTopUp.mjs. Checkpoint per accept at
 * src/data/.expertDreadTopUp_progress.json; safe to re-run until the target.
 *
 * Env: EXPERT_DREAD_TARGET (default 55 new accepts), GATED_RUN_MS (default
 * 540000 — finalize before the driver's jest --testTimeout kills the run).
 *
 * Run (one bounded pass; loop until target or plateau):
 *   cd mobile && NODE_OPTIONS=--max-old-space-size=4096 \
 *     node_modules/.bin/jest --config scripts/jest.config.js --forceExit \
 *     --testTimeout 570000 scripts/generateExpertDreadTopUp.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const TOP_UP_TARGET = Number(process.env.EXPERT_DREAD_TARGET ?? 55);
const RUN_DEADLINE_MS = Number(process.env.GATED_SMOKE_MS ?? process.env.GATED_RUN_MS ?? 540_000);
const ATTEMPT_BUDGET = TOP_UP_TARGET * 400; // cumulative across runs (dread accepts are scarce)

// Monotony headroom: accept only while the UNION share stays under this
// (bankDiversity B1 asserts <= 0.30; the live bank's maxima are ~18-20%).
const MONOTONY_SHARE_CAP = 0.28;

// ============================================================================
// Mocks — must be before imports that use them (same model as the gated regen)
// ============================================================================

const WORD_USAGE_CAP = 10; // the EXPERT bank's pinned cap
const bankWordUsage = new Map<string, number>();

jest.mock('../src/services/amberCurrency', () => ({
  getCurrentPhase: async () => 4, // maximum dread preference in the scorer
  getFullProgress: async () => ({ puzzlesSolved: 999 }),
}));

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

// ============================================================================
// Imports — after mocks
// ============================================================================

import { generateLocalPuzzle, isDreadWord, getWordPhaseTier, getSemanticCluster, getFeaturedRank } from '../src/services/localGenerator';
import { analyzeStandardBranching } from '../src/services/puzzleBranching';
import { COMMON_WORDS } from '../src/constants/wordLists';
import { DICTIONARY_WORDS } from '../src/dictionary';
import { PreGeneratedPuzzle } from '../src/data/puzzleBankTypes';
import { PUZZLE_BANK_EXPERT } from '../src/data/puzzleBankExpert';
import { LEXICON_BANK_EXPERT } from '../src/data/lexiconBankExpert';
import { PUZZLE_BANK_REVERSE_EXPERT } from '../src/data/puzzleBankReverseExpert';
import { LEXICON_BANK_REVERSE_EXPERT } from '../src/data/lexiconBankReverseExpert';

// ============================================================================
// Acceptance gate — the gated EXPERT bars, at the LATE (phase 3-4) settings
// ============================================================================

const FEATURED_CEILING = 0.85;
const FEATURED_TRANSIENT_CEILING = 0.99;
const SINGLE_CHOICE_LATE = 0.86;
const DEAD_END_CEILING = 0.32;
const MIN_PATHS = 2;

function featuredBandOk(displayed: string[], allWords: string[]): boolean {
  for (const w of displayed) {
    if (getFeaturedRank(w) > FEATURED_CEILING && !isDreadWord(w)) return false;
  }
  for (const w of allWords) {
    if (getFeaturedRank(w) > FEATURED_TRANSIENT_CEILING && !isDreadWord(w)) return false;
  }
  return true;
}

function checkBranchingGate(words: string[]): { pass: boolean; hasTrap: boolean } {
  const metrics = analyzeStandardBranching(
    words,
    word => COMMON_WORDS.has(word.toUpperCase()),
  );
  return {
    pass: metrics.completePathCount >= MIN_PATHS &&
      metrics.singleChoiceFraction <= SINGLE_CHOICE_LATE &&
      metrics.deadEndStateFraction <= DEAD_END_CEILING,
    hasTrap: metrics.trapStepFraction > 0,
  };
}

// ============================================================================
// Helpers (mirrors generateGatedBank.test.ts)
// ============================================================================

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
// Checkpointing (accepted top-up puzzles only; live bank re-seeds every run)
// ============================================================================

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const CHECKPOINT_PATH = path.join(DATA_DIR, '.expertDreadTopUp_progress.json');
const SIDECAR_PATH = path.join(DATA_DIR, '.expertDreadTopUp_output.ts');

interface TopUpCheckpoint {
  attempts: number;
  puzzles: PreGeneratedPuzzle[];
}

function loadCheckpoint(): TopUpCheckpoint {
  try {
    if (fs.existsSync(CHECKPOINT_PATH)) {
      const data = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'));
      if (data && Array.isArray(data.puzzles)) {
        return { attempts: data.attempts ?? 0, puzzles: data.puzzles };
      }
    }
  } catch { /* corrupted checkpoint: start fresh */ }
  return { attempts: 0, puzzles: [] };
}

function saveCheckpoint(cp: TopUpCheckpoint): void {
  const tmp = CHECKPOINT_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cp), 'utf-8');
  fs.renameSync(tmp, CHECKPOINT_PATH);
}

function writeSidecar(merged: PreGeneratedPuzzle[], newAccepts: number): void {
  const tiers = new Map<number, number>();
  for (const p of merged) tiers.set(p.dreadTier, (tiers.get(p.dreadTier) ?? 0) + 1);
  const tierLine = [0, 1, 2, 3, 4].map(t => `tier${t}: ${tiers.get(t) ?? 0}`).join(', ');
  const fileContent = `// AUTO-GENERATED by scripts/generateGatedBank.test.ts (gated full regeneration)
// + scripts/generateExpertDreadTopUp.test.ts (dread top-up: +${newAccepts} tier>=3 boards).
// Bank: EXPERT (EXPERT), bank-wide word-usage cap ${WORD_USAGE_CAP}.
// Per-difficulty acceptance gate (every puzzle): non-duplicate chain; cap-safe;
// FEATURED words within rank ceiling ${FEATURED_CEILING} (dread exempt);
// completePathCount >= 2/2 (phase 0-2/3-4);
// singleChoiceFraction <= 0.78/${SINGLE_CHOICE_LATE} (phase 0-2/3-4);
// deadEndStateFraction <= ${DEAD_END_CEILING}.
// Top-up accepts additionally require dreadTier >= 3 (the climax supply fix).
// Dread tier distribution: ${tierLine}.
// Do not edit manually. Re-run the generators to update.
// Generated: ${new Date().toISOString()}
// Total puzzles: ${merged.length}

import { PreGeneratedPuzzle } from './puzzleBankTypes';

export const PUZZLE_BANK_EXPERT: PreGeneratedPuzzle[] = [
${merged.map(p => '  ' + serializePuzzle(p)).join(',\n')}
];
`;
  const tmp = SIDECAR_PATH + '.tmp';
  fs.writeFileSync(tmp, fileContent, 'utf-8');
  fs.renameSync(tmp, SIDECAR_PATH);
  process.stdout.write(`Sidecar: wrote ${merged.length} puzzles (${newAccepts} new dread accepts) to ${SIDECAR_PATH}\n`);
}

// ============================================================================
// Main
// ============================================================================

describe('EXPERT dread top-up', () => {
  it('appends dread-tier >= 3 boards to the EXPERT bank', async () => {
    const runStart = Date.now();
    const runDeadline = runStart + RUN_DEADLINE_MS;

    const checkpoint = loadCheckpoint();
    const accepted: PreGeneratedPuzzle[] = checkpoint.puzzles;

    // Seed dedupe + usage + monotony tallies from the live bank AND this run's
    // prior accepts; dedupe additionally spans every other 6-letter bank (B2).
    const seenChains = new Set<string>();
    const startLetters = new Map<string, number>();
    const movedLetters = new Map<string, number>();
    let sMoves = 0;
    let allMoves = 0;
    const seedBoard = (p: PreGeneratedPuzzle, countsForBank: boolean): void => {
      seenChains.add(p.words.join('-'));
      if (!countsForBank) return;
      recordUsage(collectPuzzleWords(p));
      startLetters.set(p.words[0][0], (startLetters.get(p.words[0][0]) ?? 0) + 1);
      const ml = (p.solution?.[0]?.letterToMove ?? '').toUpperCase();
      if (ml) movedLetters.set(ml, (movedLetters.get(ml) ?? 0) + 1);
      for (const step of p.solution ?? []) {
        allMoves++;
        if ((step.letterToMove ?? '').toUpperCase() === 'S') sMoves++;
      }
    };
    for (const p of PUZZLE_BANK_EXPERT) seedBoard(p, true);
    for (const p of accepted) seedBoard(p, true);
    for (const p of LEXICON_BANK_EXPERT) seedBoard(p, false);
    for (const p of PUZZLE_BANK_REVERSE_EXPERT) seedBoard(p, false);
    for (const p of LEXICON_BANK_REVERSE_EXPERT) seedBoard(p, false);

    let bankSize = PUZZLE_BANK_EXPERT.length + accepted.length;

    // The forced-start pool: 6-letter tier-3/4 dread words still under the
    // usage cap. Deterministic order (tier 4 first, then alphabetical) so
    // resumed runs walk the same sequence.
    const dreadPool = DICTIONARY_WORDS
      .filter(w => w.length === 6 && getWordPhaseTier(w) >= 3)
      .sort((a, b) => (getWordPhaseTier(b) - getWordPhaseTier(a)) || a.localeCompare(b));

    process.stdout.write(
      `\n=== EXPERT DREAD TOP-UP: resuming at +${accepted.length}/${TOP_UP_TARGET} accepts ` +
      `(${checkpoint.attempts} attempts so far), bank ${bankSize}, pool ${dreadPool.length} forced starts, ` +
      `deadline ${Math.round(RUN_DEADLINE_MS / 1000)}s ===\n`,
    );

    const monotonyOk = (p: { words: string[]; solution?: { letterToMove?: string }[] }): boolean => {
      const nextBank = bankSize + 1;
      const sl = p.words[0][0];
      if (((startLetters.get(sl) ?? 0) + 1) / nextBank > MONOTONY_SHARE_CAP) return false;
      const ml = (p.solution?.[0]?.letterToMove ?? '').toUpperCase();
      if (ml && ((movedLetters.get(ml) ?? 0) + 1) / nextBank > MONOTONY_SHARE_CAP) return false;
      let pS = 0;
      const pMoves = (p.solution ?? []).length;
      for (const step of p.solution ?? []) {
        if ((step.letterToMove ?? '').toUpperCase() === 'S') pS++;
      }
      if (allMoves + pMoves > 0 && (sMoves + pS) / (allMoves + pMoves) > MONOTONY_SHARE_CAP) return false;
      return true;
    };

    let runAttempts = 0;
    let runAccepts = 0;
    let rejectedDup = 0, rejectedCap = 0, rejectedFeatured = 0, rejectedBranching = 0,
      rejectedDread = 0, rejectedMonotony = 0, genFailures = 0;
    let poolCursor = checkpoint.attempts; // walk the pool from where attempts left off

    while (
      accepted.length < TOP_UP_TARGET &&
      checkpoint.attempts < ATTEMPT_BUDGET &&
      Date.now() < runDeadline
    ) {
      checkpoint.attempts++;
      runAttempts++;

      // 3 of every 4 attempts are forced-start from the dread pool; the rest
      // free generation at phase 4 (can land 5L/7L dread transients instead).
      const forced = checkpoint.attempts % 4 !== 0;
      const startWord = forced
        ? dreadPool[poolCursor++ % dreadPool.length]
        : undefined;
      if (startWord && (bankWordUsage.get(startWord) ?? 0) >= WORD_USAGE_CAP) continue;

      try {
        const puzzle = await generateLocalPuzzle('EXPERT', startWord ? { startWord } : undefined);
        const chainKey = puzzle.words.join('-');

        if (seenChains.has(chainKey)) { rejectedDup++; continue; }
        seenChains.add(chainKey);

        const puzzleWords = collectPuzzleWords(puzzle);
        if (exceedsUsageCap(puzzleWords)) { rejectedCap++; continue; }

        const dreadTier = computeDreadTier(puzzleWords);
        if (dreadTier < 3) { rejectedDread++; continue; }

        if (!featuredBandOk(puzzle.words, puzzleWords)) { rejectedFeatured++; continue; }

        const gate = checkBranchingGate(puzzle.words);
        if (!gate.pass) { rejectedBranching++; continue; }

        if (!monotonyOk(puzzle)) { rejectedMonotony++; continue; }

        const preGenPuzzle: PreGeneratedPuzzle = {
          id: puzzleId(puzzle.words),
          words: puzzle.words,
          solution: puzzle.solution || [],
          wordLength: puzzle.wordLength || 6,
          qualityScore: Math.round(puzzle.qualityScore ?? 50),
          dreadTier,
          dreadWordCount: computeDreadWordCount(puzzleWords),
          allWords: puzzleWords,
          semanticTags: computeSemanticTags(puzzleWords),
        };

        accepted.push(preGenPuzzle);
        seedBoard(preGenPuzzle, true);
        bankSize++;
        runAccepts++;
        saveCheckpoint(checkpoint);

        if (accepted.length % 5 === 0) {
          process.stdout.write(
            `[EXPERT dread] +${accepted.length}/${TOP_UP_TARGET} | run ${runAccepts}/${runAttempts} | ` +
            `rej dup ${rejectedDup} cap ${rejectedCap} dread ${rejectedDread} feat ${rejectedFeatured} ` +
            `branch ${rejectedBranching} mono ${rejectedMonotony} genFail ${genFailures}\n`,
          );
        }
      } catch {
        genFailures++;
      }
    }

    saveCheckpoint(checkpoint);

    process.stdout.write(
      `\nRUN SUMMARY EXPERT dread top-up: +${runAccepts}/${runAttempts} this run; ` +
      `cumulative +${accepted.length}/${TOP_UP_TARGET} (${checkpoint.attempts} attempts); ` +
      `rej dup ${rejectedDup} cap ${rejectedCap} dread ${rejectedDread} feat ${rejectedFeatured} ` +
      `branch ${rejectedBranching} mono ${rejectedMonotony} genFail ${genFailures}\n`,
    );

    writeSidecar([...PUZZLE_BANK_EXPERT, ...accepted], accepted.length);

    expect(fs.existsSync(SIDECAR_PATH)).toBe(true);
    // Union invariants the run must never break.
    const chains = new Set([...PUZZLE_BANK_EXPERT, ...accepted].map(p => p.words.join('-')));
    expect(chains.size).toBe(PUZZLE_BANK_EXPERT.length + accepted.length);
    for (const p of accepted) expect(p.dreadTier).toBeGreaterThanOrEqual(3);
  }, 570000);
});
