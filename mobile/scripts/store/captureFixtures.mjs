/**
 * Source-grounded, offline-only save fixtures for store captures.
 * This file DOES NOT drive a browser or modify the production application.
 * Inline buildBootstrapScript() before the unchanged Expo export's scripts;
 * serve that isolated export with captureHeaders(), then use the real UI.
 * Regenerate the reviewable payload: node scripts/store/captureFixtures.mjs --write
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.join(mobile, 'assets/Play_store/launch-2026-09-v2/source/fixtures.json');
const sourceFiles = [
  'src/constants/wordLists.ts', 'src/constants/gameBalance.ts',
  'src/services/homeWorldData.ts', 'src/services/storySpine.ts',
  'src/services/puzzleVariety.ts', 'src/services/puzzleSaveState.ts',
  'src/data/puzzleBankDoubleShiftEasy.ts', 'src/services/phaseNarrative.ts',
  'src/services/cosmetics.ts', 'src/services/dailyChallenge.ts',
  'src/services/dailyBoardVersion.ts', 'src/components/home/HouseWorld.tsx',
];
const source = file => readFileSync(path.join(mobile, file), 'utf8');

/** Read a literal authored constant, without importing native app dependencies. */
function literal(file, name) {
  const text = source(file);
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  let expression;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) expression = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(tree);
  if (!expression) throw new Error(`Missing authored constant ${name} in ${file}`);
  const javascript = ts.transpileModule(`globalThis.result = (${expression.getText(tree)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { result: undefined };
  vm.runInNewContext(javascript, context, { timeout: 1000 });
  return JSON.parse(JSON.stringify(context.result));
}

function storyFunctions() {
  const exports = {};
  const context = {
    exports,
    require(specifier) {
      if (specifier === './persistenceStorage') return {};
      throw new Error(`Capture fixture must not load native dependency ${specifier}`);
    },
  };
  const javascript = ts.transpileModule(source('src/services/storySpine.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(javascript, context, { timeout: 1000 });
  return exports;
}

const dateString = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parseDate = text => new Date(`${text}T12:00:00`);

export function buildCaptureFixtures({ date = dateString(new Date()) } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || dateString(parseDate(date)) !== date) throw new Error('Use a real local calendar day: YYYY-MM-DD');
  const timestamp = parseDate(date).getTime();
  const oldDay = parseDate(date); oldDay.setDate(oldDay.getDate() - 7);
  const olderDate = dateString(oldDay);
  const thresholds = literal('src/constants/gameBalance.ts', 'PHASE_THRESHOLDS');
  const floors = literal('src/constants/gameBalance.ts', 'MIN_PUZZLES_FOR_PHASE');
  const unlocks = literal('src/services/homeWorldData.ts', 'UNLOCK_PROGRESSION');
  const curated = literal('src/constants/wordLists.ts', 'CURATED_EARLY_PUZZLES')[0];
  const doubleBank = literal('src/data/puzzleBankDoubleShiftEasy.ts', 'PUZZLE_BANK_DOUBLE_SHIFT_EASY');
  // This pleasant chain is in the shipping bank, including its actual solutions.
  const double = doubleBank.find(board => board.id === '75d40a43d494');
  if (!double || curated.words.join(',') !== 'PLAY,PANT,HEAR') throw new Error('Capture board changed; review the storyboard before regenerating.');
  const startMessages = literal('src/services/phaseNarrative.ts', 'START_MESSAGES');
  const requirements = literal('src/services/puzzleVariety.ts', 'VARIANT_UNLOCK_REQUIREMENTS');
  const { buildStoryScene, selectStoryScene } = storyFunctions();

  function progress(solved, phase, weighted, lastUnlockOrder, amber) {
    if (solved < floors[phase] || weighted < thresholds[phase] || phase >= 4) throw new Error('Scene would violate phase gates or disclose the reveal.');
    const purchased = unlocks.filter(item => item.order <= lastUnlockOrder);
    if (purchased.some(item => item.minPuzzles > solved)) throw new Error('Scene includes an unattainable room.');
    const unlockedAnimals = purchased.filter(item => item.type === 'character').map(item => item.targetId);
    const unlockedRooms = ['cozy_den', ...purchased.filter(item => item.type === 'room').map(item => item.targetId)];
    const purchaseTotal = purchased.reduce((sum, item) => sum + item.cost, 0);
    return {
      amber, totalAmberEarned: amber + purchaseTotal,
      unlockedAnimals, unlockedRooms, currentPhase: phase, puzzlesSolved: solved,
      phaseProgress: weighted, phasePuzzleThresholds: thresholds,
      lastDialogueRead: {}, conversationReadVersion: 1, conversationReadIds: {}, introsSeen: unlockedAnimals,
      currentStreak: 0, lastPlayDate: olderDate, challengeCompletions: 0,
      pendingVariantTutorials: [], seenVariantTutorials: solved >= 25 ? ['reverse', 'double_shift'] : solved >= 10 ? ['reverse'] : [],
      preferredPuzzleVariant: 'standard', lastVariantPlayed: 'standard', sameVariantStreak: 0,
      pendingPhaseTransition: null, phaseProgressFraction: 0, reservedUnlockId: null,
      houseCompleted: false, houseCompletionCelebrated: false,
      cycleCount: 0, cycleStartPuzzles: 0, finaleArmed: false, finalPuzzleCompleted: false,
      postRevelation: false, pendingCeremony: null,
    };
  }

  function boardSave(board, phase, variant = 'standard') {
    const rows = board.words.map((word, row) => ({
      id: `store-${variant}-row-${row}`, originalWord: word,
      words: [...word].map((char, letter) => ({ id: `store-${variant}-${row}-${letter}`, char, isLocked: false })),
    }));
    return {
      vocabularyVersion: 1, rows, activeRowIndex: 0, selectedLetter: null, gameState: 'PLAYING',
      message: startMessages[phase], history: [], invalidAttempts: 0, hintsUsed: 0,
      hintDisclosures: [], undosUsed: 0, undosRemaining: null,
      difficulty: 'EASY', currentWordLength: board.wordLength ?? board.words[0].length,
      hint: '', solution: board.solution, gameMode: 'standard', currentVariant: variant,
      selectedVariant: variant, moveDirection: 'down', blindMode: false, undoLimited: false,
      lexiconMode: false, speedMode: false, unbrokenWeaveMode: false, spentLetters: [],
      currentPhase: phase, lastFormedWord: null,
      doubleShiftPhase: variant === 'double_shift' ? 'pick1' : null,
      isPlayingDaily: false, dailyDate: null, isSharedChallenge: false, isFinalBoard: false,
      savedAt: timestamp,
    };
  }

  function storyState(home, allowCup = false) {
    const context = { phase: home.currentPhase, puzzlesSolved: home.puzzlesSolved, cycleCount: 0, unlockedAnimals: home.unlockedAnimals };
    const state = { version: 1, cycle: 0, memories: {}, boundary: null, carriedBoundary: null, carriedRecord: false, arrivedBeforeRevision: false, previousCycles: [] };
    // Ordinary "Come back to this" receipts: no invented completed reading or answers.
    if (!allowCup) {
      for (let index = 0; index < 20; index++) {
        const id = selectStoryScene(context, state);
        if (!id) break;
        if (state.memories[id]) throw new Error('Story deferral did not settle');
        state.memories[id] = { scene: buildStoryScene(id, context, state), completed: false, page: 0, presentationPhase: home.currentPhase, deferredAtPuzzle: home.puzzlesSolved };
      }
    }
    return state;
  }

  const early = progress(6, 0, 6, 1, 120);
  const bright = progress(26, 1, 36, 9, 259);
  const night = progress(70, 3, 98, 17, 284);
  const shopping = progress(26, 1, 36, 9, 700);
  if (bright.puzzlesSolved < requirements.double_shift.puzzlesSolved) throw new Error('Double Shift is locked.');
  const definitions = {
    opener: { home: early, board: curated, recipe: ['Play puzzle.', 'Select L in PLAY, then the valid PLANT insertion in PANT.', 'For the selected-L opener: use UNDO, then select L again. This replaces the stale initial prompt with the real undo message.', 'For the result: play L to PLANT; then select T in PLANT and insert it at the end of HEAR to form HEART.'], description: 'Authored onboarding board restored as a returning-player board; every visible move is performed through game controls.' },
    home: { home: bright, recipe: ['Wait for Play puzzle.', 'Pan the actual house to frame several furnished rooms, keeping the next reward bar and normal residents visible.'], description: 'Five inhabited rooms at level 26 with real phase-1 afternoon lighting.' },
    friends: { home: bright, recipe: ['Pan to Ember the fox, then tap the resident.', 'Use Continue dialogue to reach the warm cushion line if useful; capture the actual short passage.', 'Close dialogue using its real close control.'], description: 'Ember starts at her actual earliest unread conversation; no replacement dialogue or fabricated text.' },
    mystery: { home: night, recipe: ['Wait for Play puzzle.', 'Pan the house so the actual blue night sky and lit rooms are both prominent.', 'Do not enter resident dialogue, the pit, a pending scene, or any later phase.'], description: 'Phase 3 uses sky_storm.webp, described in the source as oppressive pre-storm night. Global phase 3 keeps residents in normal clothes; the phase-4 reveal is excluded.' },
    double: { home: bright, board: double, variant: 'double_shift', recipe: ['Play puzzle; the real restored Double Shift bank board is FLIPS / LOWER / WAVES.', 'Select F in FLIPS and insert at position 0 of LOWER to form FLOWER.', 'Select S in FLIPS and insert at the end of FLOWER to form FLOWERS, leaving LIP.', 'Capture the completed first pair or the second-letter placement; both finished words are valid.', 'Next pair: move E and R from FLOWERS into WAVES to form WEAVERS, leaving FLOWS.'], description: 'Shipping Easy Double Shift bank puzzle 75d40a43d494; no puzzle generation or bank alteration.' },
    daily: { home: bright, recipe: ['Use Start daily challenge on the home screen.', 'Dismiss any real Got it explanation if shown.', 'Capture the board generated by the application for the actual local calendar date.', 'Record that displayed date and the resulting saved daily board version in capture provenance. Do not substitute a date, rank, or streak.'], description: 'One older local daily completion avoids the first-daily eased board and bonus hints. Today is uncompleted; no daily board is preselected, no rank is seeded, and no streak is promoted.' },
    style: { home: shopping, board: curated, recipe: ['Open utility menu, then Open Tile Shop.', 'Buy Ember-warm for the actual catalog price of 300 amber through its purchase control.', 'Verify owned theme_ember and equipped tile_theme in the local save; no IAP entitlement is seeded.', 'Go back home and Play puzzle to capture the visibly applied warm palette.'], description: 'An amber-funded returning-player save; the cosmetic purchase and equip happen through the real shop. The 700 balance covers the 300 cost without any simulated paid entitlement.' },
    choice: { home: early, board: curated, allowCup: true, recipe: ['Play puzzle opens A place at the table.', 'Continue twice to the two actual cup choices.', 'Capture the current choice interface before selecting an answer.', 'Optionally select The flower cup. Cocoa, please., then finish with Keep this memory to capture its journal entry.'], description: 'The earliest optional story choice at its real six-puzzle gate, with no preselected answer or later-story reveal.' },
  };
  const introFlags = ['journal_intro', 'starter_intro', 'setup_selector_intro', 'challenge_intro', 'pit_nudge', 'gated_unlock_intro', 'daily_challenge_intro', 'offering_intro', 'harvest_home_intro', 'mandatory_harvest', 'pit_harvest_intro', 'fox_play_nudge', 'modifier_stacking_intro'];
  const scenes = Object.fromEntries(Object.entries(definitions).map(([id, definition]) => {
    const home = structuredClone(definition.home);
    if (definition.variant) home.preferredPuzzleVariant = definition.variant;
    const solved = home.puzzlesSolved;
    const twos = Math.floor(solved / 4); const threes = solved - twos;
    const storage = {
      wordshift_settings: { reducedMotion: true, soundEnabled: false, musicEnabled: false, hapticsEnabled: false },
      wordshift_home_progress: home,
      wordshift_onboarding_step: 'complete',
      wordshift_daily_login: { lastClaimedDate: date, cycleDay: 1 },
      wordshift_story_spine: storyState(home, definition.allowCup),
      wordshift_star_stats: { totalPuzzlesCompleted: solved, totalStars: threes * 3 + twos * 2, threeStarCount: threes, twoStarCount: twos, oneStarCount: 0, totalInvalidAttempts: twos, totalHintsUsed: twos, noHintPuzzleCount: threes, flawlessCount: threes, byDifficulty: Object.fromEntries(['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD', 'EXPERT'].map(difficulty => [difficulty, { completed: difficulty === 'EASY' ? solved : 0, stars: difficulty === 'EASY' ? threes * 3 + twos * 2 : 0 }])), lastUpdated: timestamp },
      wordshift_hints: { balance: 5, seededFree: true },
      wordshift_cosmetics: { owned: {}, equipped: {} },
      wordshift_room_upgrades: { purchased: {}, deepened: {}, attunements: {}, pendingGifts: [] },
      wordshift_sacrifices: { totalAmberSacrificed: 0, sacrificeCount: 0, sacrificeHistory: [], lastSacrificeTimestamp: 0, introSeen: true },
      wordshift_amber_transactions: [],
      wordshift_daily_challenge: solved >= 8
        ? { completedChallenges: [{ date: olderDate, stars: 3, hintsUsed: 0, invalidAttempts: 0, completedAt: oldDay.getTime() }], totalCompleted: 1, currentStreak: 0, bestStreak: 1, lastClaimedStreakMilestone: 0, lastCompletedDate: olderDate, streakFreezes: 0, lastFreezeGrantDate: null, firstDailyMercyGranted: true }
        : { completedChallenges: [], totalCompleted: 0, currentStreak: 0, bestStreak: 0, lastClaimedStreakMilestone: 0, lastCompletedDate: null, streakFreezes: 0, lastFreezeGrantDate: null, firstDailyMercyGranted: false },
      ...Object.fromEntries(introFlags.map(flag => [`wordshift_${flag}_seen`, 'true'])),
      wordshift_preview_graduation_seen_v2: 'true',
    };
    if (definition.board) storage.wordshift_in_progress_puzzle = boardSave(definition.board, home.currentPhase, definition.variant);
    return [id, { description: definition.description, recipe: definition.recipe, storage: Object.fromEntries(Object.entries(storage).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)])) }];
  }));
  return {
    schemaVersion: 1, capturedLocalDate: date,
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: mobile, encoding: 'utf8' }).trim(),
    sourceFiles: Object.fromEntries(sourceFiles.map(file => [file, createHash('sha256').update(source(file)).digest('hex')])),
    provenance: [
      'Genuine Expo/React Native web UI from a local static export; not native Android captures.',
      'Attainable local progression cohorts skip repetitive play. Save receipts are fixture data, not real customer activity.',
      'Sequential room unlock costs are included in totalAmberEarned. Surplus amber is attainable through puzzles, quests, and earlier daily login rewards; this is not an audited lifetime earnings ledger.',
      'No entitlements, leaderboard ranks, remote results, ending choices, or phase-4/5 unlocks are injected.',
      'Use an isolated browser origin and serve captureHeaders(); no seeded state may reach production services.',
      'Animation takes: add storeMotion=1 to the scene URL to enable the actual normal walking animations. Reset with a changed storeTake value.',
      'Reload retains live interactions in the same scene/take. Change storeScene or storeTake to seed again.',
    ],
    scenes,
  };
}

/** Defense in depth: apply to every response from the isolated capture server. */
export function captureHeaders() {
  return {
    'Content-Security-Policy': "default-src 'self' data: blob:; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; form-action 'none'; frame-src 'none'; object-src 'none'",
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  };
}

/** Return one inline script; does not inspect or alter any rendered UI. */
export function buildBootstrapScript({ fixtures = buildCaptureFixtures(), allowedOrigins = [] } = {}) {
  const payload = JSON.stringify({ fixtures, allowedOrigins }).replaceAll('<', '\\u003c');
  return `;(() => {
    const { fixtures, allowedOrigins } = ${payload};
    const query = new URLSearchParams(location.search);
    const scene = query.get('storeScene');
    if (!scene) return;
    if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && !allowedOrigins.includes(location.origin)) throw new Error('Store fixtures require an explicitly isolated capture origin.');
    if (!fixtures.scenes[scene]) throw new Error('Unknown store capture scene: ' + scene);
    const local = value => { const url = new URL(typeof value === 'string' ? value : value.url, location.href); return url.origin === location.origin || ['data:', 'blob:'].includes(url.protocol); };
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => local(input) ? originalFetch(input, init) : Promise.reject(new TypeError('Offline capture blocks external requests.'));
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) { if (!local(String(url))) throw new TypeError('Offline capture blocks external requests.'); return originalOpen.call(this, method, url, ...rest); };
    if (navigator.sendBeacon) navigator.sendBeacon = () => false;
    window.WebSocket = class { constructor() { throw new TypeError('Offline capture blocks sockets.'); } };
    const marker = [fixtures.schemaVersion, fixtures.capturedLocalDate, scene, query.get('storeTake') || '1', query.get('storeMotion') || '0'].join(':');
    if (sessionStorage.getItem('__wordshift_capture_fixture') !== marker) {
      for (const key of Object.keys(localStorage)) if (key.startsWith('wordshift_')) localStorage.removeItem(key);
      for (const [key, value] of Object.entries(fixtures.scenes[scene].storage)) localStorage.setItem(key, value);
      if (query.get('storeMotion') === '1') { const settings = JSON.parse(localStorage.getItem('wordshift_settings')); settings.reducedMotion = false; localStorage.setItem('wordshift_settings', JSON.stringify(settings)); }
      sessionStorage.setItem('__wordshift_capture_fixture', marker);
    }
    window.__WORDSHIFT_CAPTURE_PROVENANCE__ = { scene, sourceCommit: fixtures.sourceCommit, capturedLocalDate: fixtures.capturedLocalDate, marker, renderer: 'Expo React Native web', offline: true };
  })();`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--date');
  const fixtures = buildCaptureFixtures(index >= 0 ? { date: process.argv[index + 1] } : {});
  if (process.argv.includes('--write')) {
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify(fixtures, null, 2) + '\n');
    console.log(`Prepared ${Object.keys(fixtures.scenes).length} source-grounded capture fixtures: ${output}`);
  } else if (process.argv.includes('--bootstrap')) {
    process.stdout.write(buildBootstrapScript({ fixtures }));
  } else {
    console.log(JSON.stringify({ sourceCommit: fixtures.sourceCommit, date: fixtures.capturedLocalDate, scenes: Object.keys(fixtures.scenes), output }, null, 2));
  }
}
