/**
 * The seeded progression states A to J of the refresh-2026-09 brief (section 2,
 * "Seeded states"). Each state is a coherent, attainable local save: solve
 * gates, room gates and story gates agree with the phase, the badge state
 * agrees with the dialogue sessions and conversation read ids, and
 * unlockedAnimals / unlockedRooms / introsSeen are passed in EVERY patch (a
 * patch without them resets the house to Ember alone).
 *
 * Only localStorage is written. Nothing on the page is edited.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_RES, ALL_ROOMS, achievementsFor, bootReturning, conversationRead, localDay, reloadHome, sessions, starStats } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const spineP1 = JSON.parse(readFileSync(path.join(here, 'seeds/spine_p1.json'), 'utf8'));
const spineP2 = JSON.parse(readFileSync(path.join(here, 'seeds/spine_p2.json'), 'utf8'));

/** A story spine seed with some memories removed (brief "Story spine seeds"). */
function spine(base, drop = []) {
  const copy = JSON.parse(JSON.stringify(base));
  for (const key of drop) delete copy.memories[key];
  return JSON.stringify(copy);
}
export const SPINES = {
  SPINE_0: spine(spineP1, ['plum', 'echo', 'witness']),
  SPINE_1A: spine(spineP1, ['echo', 'witness']),
  SPINE_1: spine(spineP1),
  SPINE_2: spine(spineP2),
};

const first = k => ({ unlockedAnimals: ALL_RES.slice(0, k), unlockedRooms: ALL_ROOMS.slice(0, k), introsSeen: ALL_RES.slice(0, k) });

/**
 * Returns { patch, extra, summary } for a state id. `summary` is a plain
 * description recorded in provenance.
 */
export function stateSeed(id) {
  const today = localDay();
  switch (id) {
    case 'A': return {
      summary: 'Phase 0, 6 solves, Ember only, 120 amber. EASY is already cleared (the six earlier wins were EASY boards, so no first-clear bonus is paid again). The autosaved opener board (PLAY / PANT / HEAR) is kept; the cup scene is due on Play.',
      patch: { amber: 120, totalAmberEarned: 120, currentPhase: 0, phaseProgress: 6, puzzlesSolved: 6, completedDifficulties: ['EASY'], ...first(1) },
      extra: { wordshift_star_stats: starStats(6, ['EASY']), wordshift_achievements: achievementsFor(6) },
    };
    case 'B': return {
      summary: 'Phase 1, 42 solves, first 7 residents and rooms, 640 amber (2400 earned), story memories cup/plum/echo/witness, streak 4. Sessions and read ids leave only Axel with news.',
      patch: { amber: 640, totalAmberEarned: 2400, currentPhase: 1, phaseProgress: 42, puzzlesSolved: 42, ...first(7),
        currentStreak: 4, lastPlayDate: today, seenVariantTutorials: ['reverse', 'double_shift'], conversationReadVersion: 1,
        conversationReadIds: conversationRead({ fox: ['fx_0', 1, 18], pangolin: ['pg_0', 1, 18], owl: ['ow_0', 1, 18], axolotl: ['ax_0', 1, 18],
          sloth: ['sl_0', 1, 12], fennec_fox: ['ff_0', 1, 6], capybara: ['cp_0', 1, 3] }) },
      extra: { wordshift_star_stats: starStats(42), wordshift_achievements: achievementsFor(42), wordshift_in_progress_puzzle: null,
        wordshift_story_spine: SPINES.SPINE_1,
        wordshift_dialogue_sessions: sessions([['fox', 42, 6], ['pangolin', 42, 6], ['owl', 42, 6], ['sloth', 42, 4], ['fennec_fox', 42, 2], ['capybara', 42, 2], ['axolotl', 38, 6]]) },
    };
    case 'C': return {
      summary: 'Phase 2 (dusk), 60 solves, first 8 residents and rooms, 900 amber (3800 earned), story memories through supper/plan/shelter, streak 4. Sessions and read ids leave only Ember with news.',
      patch: { amber: 900, totalAmberEarned: 3800, currentPhase: 2, phaseProgress: 60, puzzlesSolved: 60, ...first(8),
        currentStreak: 4, lastPlayDate: today, seenVariantTutorials: ['reverse', 'double_shift'], conversationReadVersion: 1,
        conversationReadIds: conversationRead({ fox: [['fx_0', 1, 24], ['fx_1', 1, 15]], pangolin: [['pg_0', 1, 24], ['pg_1', 1, 15]],
          owl: [['ow_0', 1, 24], ['ow_1', 1, 15]], axolotl: [['ax_0', 1, 24], ['ax_1', 1, 15]], sloth: ['sl_0', 1, 24],
          fennec_fox: ['ff_0', 1, 18], capybara: ['cp_0', 1, 9], wombat: ['wb_0', 1, 3] }) },
      extra: { wordshift_star_stats: starStats(60), wordshift_achievements: achievementsFor(60), wordshift_in_progress_puzzle: null,
        wordshift_story_spine: SPINES.SPINE_2,
        wordshift_dialogue_sessions: sessions([['fox', 55, 9], ['pangolin', 60, 9], ['owl', 60, 9], ['axolotl', 60, 9], ['sloth', 60, 8],
          ['fennec_fox', 60, 6], ['capybara', 60, 3], ['wombat', 60, 2]]) },
    };
    case 'D': return {
      summary: 'Phase 1, 24 solves, first 5 residents and rooms, 520 amber (1800 earned), story memories cup/plum. Panko has read her 24 phase-0 lines, so her next line is her first phase-1 line.',
      patch: { amber: 520, totalAmberEarned: 1800, currentPhase: 1, phaseProgress: 24, puzzlesSolved: 24, ...first(5), conversationReadVersion: 1,
        conversationReadIds: conversationRead({ fox: ['fx_0', 1, 24], pangolin: ['pg_0', 1, 24], owl: ['ow_0', 1, 24], axolotl: ['ax_0', 1, 24], sloth: ['sl_0', 1, 6] }) },
      extra: { wordshift_star_stats: starStats(24), wordshift_achievements: achievementsFor(24), wordshift_in_progress_puzzle: null,
        wordshift_story_spine: SPINES.SPINE_1A, wordshift_dialogue_sessions: null },
    };
    case 'E': return {
      summary: 'Phase 2, 44 solves (46 weighted), first 7 residents and rooms, 700 amber (2600 earned), story memories cup/plum/echo/witness; the supper scene is due on Play.',
      patch: { amber: 700, totalAmberEarned: 2600, currentPhase: 2, phaseProgress: 46, puzzlesSolved: 44, ...first(7), seenVariantTutorials: ['reverse', 'double_shift'] },
      extra: { wordshift_star_stats: starStats(44), wordshift_achievements: achievementsFor(44), wordshift_in_progress_puzzle: null,
        wordshift_story_spine: SPINES.SPINE_1 },
    };
    case 'F': return {
      summary: 'Phase 0, 10 solves, first 3 residents and rooms, 300 amber (700 earned), story memory cup, streak 3. Every earlier win was offered at the pit (32 words from 10 batches, 150 amber), so the pit shows a lifetime harvest; the win at 11 queues a new batch there.',
      patch: { amber: 300, totalAmberEarned: 700, currentPhase: 0, phaseProgress: 10, puzzlesSolved: 10, ...first(3),
        currentStreak: 3, lastPlayDate: today, seenVariantTutorials: ['reverse'] },
      extra: { wordshift_star_stats: starStats(10), wordshift_achievements: achievementsFor(10), wordshift_in_progress_puzzle: null,
        wordshift_story_spine: SPINES.SPINE_0,
        // Each win queues its words for the pit (wordHarvest.ts); a player at 10
        // solves has offered those ten batches (3 or 4 words each).
        wordshift_word_harvest: { pendingBatches: [], pendingCredits: [], totalWordsOffered: 32, totalBatchesOffered: 10, totalAmberClaimed: 150 } },
    };
    case 'G': return {
      summary: 'Phase 2, 60 solves, first 8 residents and rooms, 900 amber (4000 earned), story memories through supper/plan/shelter. Double Shift, Challenge and Speed are all unlocked.',
      patch: { amber: 900, totalAmberEarned: 4000, currentPhase: 2, phaseProgress: 60, puzzlesSolved: 60, ...first(8), seenVariantTutorials: ['reverse', 'double_shift'] },
      extra: { wordshift_star_stats: starStats(60), wordshift_achievements: achievementsFor(60), wordshift_in_progress_puzzle: null,
        wordshift_story_spine: SPINES.SPINE_2 },
    };
    case 'H': return {
      summary: 'Phase 1, 38 solves (40 weighted), first 6 residents and rooms, 1400 amber (3000 earned), story memories cup/plum/echo/witness.',
      patch: { amber: 1400, totalAmberEarned: 3000, currentPhase: 1, phaseProgress: 40, puzzlesSolved: 38, ...first(6), seenVariantTutorials: ['reverse', 'double_shift'] },
      extra: { wordshift_star_stats: starStats(38), wordshift_achievements: achievementsFor(38), wordshift_in_progress_puzzle: null,
        wordshift_story_spine: SPINES.SPINE_1 },
    };
    case 'I': return {
      summary: 'Phase 0, 11 solves, first 4 rooms but first 3 residents (the Aquarium Room is built and empty), 340 amber (900 earned), story memory cup.',
      patch: { amber: 340, totalAmberEarned: 900, currentPhase: 0, phaseProgress: 11, puzzlesSolved: 11,
        unlockedAnimals: ALL_RES.slice(0, 3), unlockedRooms: ALL_ROOMS.slice(0, 4), introsSeen: ALL_RES.slice(0, 3) },
      extra: { wordshift_star_stats: starStats(11), wordshift_achievements: achievementsFor(11), wordshift_in_progress_puzzle: null,
        wordshift_story_spine: SPINES.SPINE_0 },
    };
    case 'J': return {
      summary: 'Phase 0, 11 solves, first 4 residents and rooms, 240 amber (900 earned), story memory cup. Axel has read nothing yet.',
      patch: { amber: 240, totalAmberEarned: 900, currentPhase: 0, phaseProgress: 11, puzzlesSolved: 11, ...first(4), conversationReadVersion: 1,
        conversationReadIds: conversationRead({ fox: ['fx_0', 1, 9], pangolin: ['pg_0', 1, 9], owl: ['ow_0', 1, 9] }) },
      extra: { wordshift_star_stats: starStats(11), wordshift_achievements: achievementsFor(11), wordshift_in_progress_puzzle: null,
        wordshift_story_spine: SPINES.SPINE_0 },
    };
    default: throw new Error(`Unknown state ${id}`);
  }
}

/** Boot a fresh install, apply the state and land on the real home screen. */
export async function stageState(page, id) {
  const { patch, extra } = stateSeed(id);
  await bootReturning(page, patch, extra);
  await reloadHome(page);
}
