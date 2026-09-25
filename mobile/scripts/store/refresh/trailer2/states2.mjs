/**
 * Seeded progression states for trailer2 (build spec section 3). Each is a
 * coherent local save: solve gates, room gates and story gates agree with the
 * phase; phase progress stays under the next phase's threshold (16, 44, 84);
 * the star stats keep three-star wins at 35% so the acceleration ramp is 1.0x
 * and weighted progress equals solves; unlockedAnimals, unlockedRooms and
 * introsSeen are always passed together; achievements that the seeded stats do
 * not satisfy are pruned, and any the recorded action would unlock are added
 * by a dry run (so no "ACHIEVEMENT UNLOCKED" toast can reach a frame).
 *
 * "Today" is the pinned capture day (capture.mjs PINNED_DAY).
 */
import { ALL_RES, ALL_ROOMS, achievementsFor, conversationRead, sessions } from '../lib.mjs';
import { stateSeed, SPINES } from '../states.mjs';
import { PINNED_DAY } from './capture.mjs';

export const first = k => ({ unlockedAnimals: ALL_RES.slice(0, k), unlockedRooms: ALL_ROOMS.slice(0, k), introsSeen: ALL_RES.slice(0, k) });

/** Star stats with 35% three-star wins (the 1.0x acceleration band). */
export function starStats35(n, diffs = ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD']) {
  const three = Math.floor(0.35 * n), one = Math.floor(0.10 * n), two = n - three - one;
  const byDifficulty = {};
  const per = Math.floor(n / diffs.length);
  for (const d of ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD', 'EXPERT']) byDifficulty[d] = { completed: 0, stars: 0 };
  diffs.forEach((d, i) => { byDifficulty[d].completed = per + (i === 0 ? n - per * diffs.length : 0); });
  const totalStars = 3 * three + 2 * two + one;
  for (const d of diffs) byDifficulty[d].stars = Math.round((byDifficulty[d].completed / n) * totalStars);
  return { totalPuzzlesCompleted: n, totalStars, threeStarCount: three, twoStarCount: two, oneStarCount: one,
    totalInvalidAttempts: Math.round(0.8 * n), totalHintsUsed: Math.round(0.3 * n), noHintPuzzleCount: n - Math.round(0.2 * n),
    flawlessCount: Math.floor(0.2 * n), lastUpdated: new Date(PINNED_DAY).getTime(), byDifficulty };
}

/** achievementsFor(n, extra) without the ids the seeded 35% stats do not satisfy. */
export function prunedAchievements(n, extra = [], stats = starStats35(n)) {
  const a = achievementsFor(n, extra);
  const drop = new Set();
  if (stats.threeStarCount < 10) drop.add('perfect_10');
  if (stats.threeStarCount < 25) drop.add('perfect_25');
  if (stats.threeStarCount < 50) drop.add('perfect_50');
  if (stats.flawlessCount < 25) drop.add('flawless_25');
  if (n < 25) drop.add('double_first');
  if (n < 35) drop.add('expert_first');
  if (n < 55) { drop.add('speed_first'); drop.add('variant_explorer'); }
  a.unlockedIds = a.unlockedIds.filter(i => !drop.has(i) || extra.includes(i));
  for (const k of Object.keys(a.unlockDates)) if (!a.unlockedIds.includes(k)) delete a.unlockDates[k];
  return a;
}
export function withAchievements(a, ids = []) {
  const now = new Date(PINNED_DAY).getTime() - 86400000;
  const out = { ...a, unlockedIds: [...new Set([...a.unlockedIds, ...ids])], unlockDates: { ...a.unlockDates } };
  for (const i of ids) out.unlockDates[i] ??= now;
  return out;
}

const B_READ = { fox: ['fx_0', 1, 18], pangolin: ['pg_0', 1, 18], owl: ['ow_0', 1, 18], axolotl: ['ax_0', 1, 18],
  sloth: ['sl_0', 1, 12], fennec_fox: ['ff_0', 1, 6], capybara: ['cp_0', 1, 3] };
const ANSWERED_VANGUARD_CHOICES = { offeredBy: ['fox', 'owl'], choices: { fox: 'ask', owl: 'ask' }, hasSeenChoice: true };

function p2n9Read(foxTo = 10) {
  return conversationRead({ fox: [['fx_0', 1, 24], ['fx_1', 1, 28], ['fx_2', 1, foxTo]], pangolin: [['pg_0', 1, 24], ['pg_1', 1, 28], ['pg_2', 1, 10]],
    owl: [['ow_0', 1, 24], ['ow_1', 1, 28], ['ow_2', 1, 10]], axolotl: [['ax_0', 1, 24], ['ax_1', 1, 28], ['ax_2', 1, 10]], sloth: [['sl_0', 1, 24], ['sl_1', 1, 12]],
    fennec_fox: [['ff_0', 1, 24], ['ff_1', 1, 6]], capybara: ['cp_0', 1, 18], wombat: ['wb_0', 1, 9], rabbit: ['rb_0', 1, 3] });
}

/**
 * Returns { patch, extra, summary } for a trailer2 state id, or an existing
 * states.mjs id. `achievementIds` adds ids a dry run found the action unlocks.
 */
export function seed2(id, { achievementIds = [], board = null } = {}) {
  switch (id) {
    case "A'": {
      const s = stateSeed('A');
      return { ...s, summary: `${s.summary} Plus the ids the 6-to-7 win unlocks.`, extra: { ...s.extra, wordshift_achievements: withAchievements(s.extra.wordshift_achievements, achievementIds) } };
    }
    case "I'": {
      const s = stateSeed('I');
      return { ...s, summary: `${s.summary} Well-Rounded is already earned (the seeded wins span four difficulties), plus the ids the invite unlocks.`,
        extra: { ...s.extra, wordshift_achievements: withAchievements(achievementsFor(11, ['all_difficulties']), achievementIds), ...(board ? { wordshift_in_progress_puzzle: board } : {}) } };
    }
    case 'H': case 'D': case 'B': {
      const s = stateSeed(id);
      return board ? { ...s, extra: { ...s.extra, wordshift_in_progress_puzzle: board } } : s;
    }
    case 'BUILD24': {
      const stats = starStats35(24, ['EASY', 'MEDIUM']);
      return {
        summary: 'Phase 1, 24 solves, 4 rooms and 4 residents, 520 amber: the Jungle Hammock (gate 19, 200 amber) can be built and Sloane (100) invited.',
        patch: { amber: 520, totalAmberEarned: 1800, currentPhase: 1, phaseProgress: 24, puzzlesSolved: 24, ...first(4), completedDifficulties: ['EASY', 'MEDIUM'],
          currentStreak: 3, lastPlayDate: PINNED_DAY, seenVariantTutorials: ['reverse'], conversationReadVersion: 1,
          conversationReadIds: conversationRead({ fox: ['fx_0', 1, 24], pangolin: ['pg_0', 1, 24], owl: ['ow_0', 1, 24], axolotl: ['ax_0', 1, 24] }) },
        extra: { wordshift_star_stats: stats, wordshift_achievements: withAchievements(prunedAchievements(24, ['phase_1', 'amber_1000'], stats), achievementIds),
          wordshift_in_progress_puzzle: null, wordshift_story_spine: SPINES.SPINE_1A, wordshift_dialogue_sessions: null },
      };
    }
    case "E'": {
      const s = stateSeed('E');
      const stats = starStats35(44);
      return {
        summary: 'Phase 2 (dusk), 44 solves (46 weighted), the same 7 rooms, residents, read ids and badge as state B, the phase-2 vanguard choices already answered.',
        patch: { ...s.patch, currentStreak: 4, lastPlayDate: PINNED_DAY, conversationReadVersion: 1, conversationReadIds: conversationRead(B_READ) },
        extra: { ...s.extra, wordshift_star_stats: stats, wordshift_achievements: prunedAchievements(44, [], stats),
          wordshift_dialogue_sessions: sessions([['fox', 44, 6], ['pangolin', 44, 6], ['owl', 44, 6], ['sloth', 44, 4], ['fennec_fox', 44, 2], ['capybara', 44, 2], ['axolotl', 40, 6]]),
          wordshift_dialogue_choices: ANSWERED_VANGUARD_CHOICES },
      };
    }
    case 'P2N9': case 'P2N9E': {
      const stats = starStats35(66);
      const ember = id === 'P2N9E';
      const sess = [['fox', 66, 12], ['pangolin', 66, 12], ['owl', 66, 12], ['axolotl', 66, 12], ['sloth', 66, 9], ['fennec_fox', 66, 7], ['capybara', 66, 5], ['wombat', 66, 3], ['rabbit', 66, 1]];
      if (ember) sess[0] = ['fox', 62, 23];
      return {
        summary: `Phase 2 (dusk), 66 solves (72 weighted), 9 rooms and 9 residents, the next card the Bamboo Attic (gate 74).${ember ? ' Ember has read fx_2_1..16, so her next line is fx_2_17.' : ''}`,
        patch: { amber: 950, totalAmberEarned: 4600, currentPhase: 2, phaseProgress: 72, puzzlesSolved: 66, ...first(9), currentStreak: 4, lastPlayDate: PINNED_DAY,
          seenVariantTutorials: ['reverse', 'double_shift'], conversationReadVersion: 1, consumedCoordinatedEvents: ['words_changing', 'house_feels_different'],
          conversationReadIds: p2n9Read(ember ? 16 : 10) },
        extra: { wordshift_star_stats: stats, wordshift_achievements: prunedAchievements(66, [], stats), wordshift_in_progress_puzzle: board,
          wordshift_story_spine: SPINES.SPINE_2, wordshift_dialogue_sessions: sessions(sess), wordshift_dialogue_choices: ANSWERED_VANGUARD_CHOICES,
          wordshift_narrative_delivery: { seedsDelivered: { fox: [0, 1], pangolin: [0, 1], owl: [0, 1], axolotl: [0, 1], sloth: [0, 1], fennec_fox: [0, 1], capybara: [0, 1], wombat: [0] }, callbacksShown: {}, phase2PoolCursor: {} },
          ...(ember ? { wordshift_offering_requests: { fox: { requested: true, fulfilledWord: null, acknowledged: false } }, wordshift_guaranteed_crossref_phase_2: 'true' } : {}) },
      };
    }
    default: {
      const s = stateSeed(id);
      return board ? { ...s, extra: { ...s.extra, wordshift_in_progress_puzzle: board } } : s;
    }
  }
}
