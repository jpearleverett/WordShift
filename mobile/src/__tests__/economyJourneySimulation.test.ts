/**
 * Deterministic journeys through production reward, harvest, unlock, quest and
 * season services. This is a balance model, never claimed to be player telemetry.
 * Set WORDSHIFT_ECONOMY_REPORT to an output stem to publish JSON + Markdown.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { Difficulty } from '../types';
import {
  awardBonusAmber, clearProgress, confirmPhaseTransition, getFullProgress,
  isFinaleArmed, markHouseCompleted, setSurpriseRng, spendAmber,
} from '../services/amberCurrency';
import { recordDurableVictory } from '../services/victoryPersistence';
import {
  acknowledgeBatchCredit, clearHarvestState, getPendingHarvestSummary, offerAllBatches,
} from '../services/wordHarvest';
import { clearStats } from '../services/starRating';
import { getNextUnlock, purchaseUnlock, UNLOCK_PROGRESSION } from '../services/homeWorldData';
import { clearHints, consumeHintSync, getHintBalanceSync, grantBonusHint, initHints, addHints } from '../services/hints';
import { clearWeeklyQuests, claimQuestReward, loadWeeklyQuests, recordAnimalVisit } from '../services/weeklyQuests';
import { claimSeasonTier, clearSeasonPass, getSeasonPassView } from '../services/seasonPass';
import { claimDailyLoginReward, clearDailyLoginReward } from '../services/dailyLoginReward';
import { clearDailyAmberReward, dailyAmberGrantFor, recordDailyAmberClaim } from '../services/dailyAmberReward';
import { clearSupporterState, claimSupporterStipendIfDue } from '../services/supporterStipend';
import { clearEntitlements, ENTITLEMENTS, grantEntitlements, isAdFreeSync, isPatronSync } from '../services/entitlements';
import { clearCosmetics } from '../services/cosmetics';
import { clearWordHistory } from '../services/wordHistory';
import { clearOfferingRequests } from '../services/offeringRequests';
import { clearMasteryRecords } from '../services/masteryRecords';
import { clearStoryState } from '../services/storySpine';
import { canOfferRewardedDouble, clearMonetPrompts, recordRewardedDoubleOffered } from '../services/monetizationPrompts';
import { getLocalDateString } from '../services/dateUtils';
import { clearDailyProgress, getDailyDifficulty, grantFirstDailyMercy, loadDailyProgress } from '../services/dailyChallenge';
import { getUnlockedVariants, PuzzleVariant } from '../services/puzzleVariety';
import { AUTO_COLLECT_PUZZLE_LIMIT, REWARDED_DAILY_CAP, REWARDED_HINT_GRANT } from '../constants/gameBalance';

jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn(), getInstallAgeDays: async () => 0 }));
jest.mock('../services/cloudSave', () => ({ invalidateRestoredServiceCaches: jest.fn() }));

interface Cohort {
  id: string; label: string; perDay: number; easy?: boolean;
  sideRewards: boolean; ads?: boolean; variants?: boolean;
  entitlement?: string; decorateFirst?: boolean;
}
const COHORTS: Cohort[] = [
  { id: 'casual', label: 'Free, 2/day', perDay: 2, sideRewards: true },
  { id: 'engaged', label: 'Free, 8/day', perDay: 8, sideRewards: true },
  { id: 'long_session', label: 'Free, one long session', perDay: 240, sideRewards: true },
  { id: 'easy', label: 'Free, Easy only, 2/day', perDay: 2, easy: true, sideRewards: true },
  { id: 'core_only', label: 'Free, no shop or side claims, 8/day', perDay: 8, sideRewards: false },
  { id: 'all_side_rewards', label: 'Free, side claims + ads + styles, 8/day', perDay: 8, sideRewards: true, ads: true, variants: true },
  { id: 'patron', label: 'Patron, 8/day', perDay: 8, sideRewards: true, entitlement: ENTITLEMENTS.PATRON },
  { id: 'supporter', label: 'Supporter, 8/day', perDay: 8, sideRewards: true, entitlement: ENTITLEMENTS.SUPPORTER },
  { id: 'decorator', label: 'Free, spends 250 after win 28, 8/day', perDay: 8, sideRewards: true, decorateFirst: true },
];
const TOTAL_WINS = 240;
const ASSUMED_SECONDS: Record<Difficulty, number> = { EASY: 60, MEDIUM: 100, MEDIUM_PLUS: 150, HARD: 220, EXPERT: 300 };
interface Milestone { win: number; day: number; date: string }
interface Journey {
  id: string; label: string; wins: number; days: number;
  recruitsAndRooms: (Milestone & { id: string; cost: number })[];
  phases: Record<string, Milestone>;
  availableAmber: number; pendingAmber: number; peakPendingAmber: number;
  hints: number; hintsRequested: number; hintsGranted: number; unservedHintRequests: number;
  amberBySource: Record<string, number>; adViews: number; assumedMinutes: number; amberPerAssumedMinute: number;
  modeValue: Record<string, { wins: number; amber: number; assumedMinutes: number; amberPerAssumedMinute: number }>;
  optionalSpent: number; houseCompleteAt: Milestone | null; endingAt: Milestone | null;
}

async function simulate(cohort: Cohort): Promise<Journey> {
  await AsyncStorage.clear();
  for (const clear of [clearProgress, clearStats, clearHarvestState, clearHints, clearWeeklyQuests,
    clearSeasonPass, clearDailyLoginReward, clearDailyAmberReward, clearSupporterState,
    clearEntitlements, clearCosmetics, clearWordHistory, clearOfferingRequests, clearMasteryRecords,
    clearStoryState, clearMonetPrompts, clearDailyProgress]) await clear();
  await initHints();
  if (cohort.entitlement) await grantEntitlements([cohort.entitlement]);
  // Remove lottery noise. Other seeded content decisions are stable as well.
  setSurpriseRng(() => 0.5);
  const journey: Journey = {
    id: cohort.id, label: cohort.label, wins: TOTAL_WINS, days: Math.ceil(TOTAL_WINS / cohort.perDay),
    recruitsAndRooms: [], phases: {}, availableAmber: 0, pendingAmber: 0, peakPendingAmber: 0,
    hints: 0, hintsRequested: 0, hintsGranted: 0, unservedHintRequests: 0,
    amberBySource: {}, adViews: 0, assumedMinutes: 0, amberPerAssumedMinute: 0, modeValue: {},
    optionalSpent: 0, houseCompleteAt: null, endingAt: null,
  };
  let day = -1;
  let adsToday = 0;
  const addSource = (source: string, amount: number) => {
    journey.amberBySource[source] = (journey.amberBySource[source] ?? 0) + amount;
  };
  const credit = async (source: string, amount: number) => {
    if (!amount) return;
    await awardBonusAmber(amount, source);
    addSource(source, amount);
  };
  const consumeAdView = (): boolean => {
    if (!cohort.ads || adsToday >= REWARDED_DAILY_CAP) return false;
    adsToday++;
    journey.adViews++;
    journey.assumedMinutes += 0.5;
    return true;
  };
  const collect = async () => {
    const before = await getPendingHarvestSummary();
    const offered = await offerAllBatches();
    expect(offered.amberAwarded).toBe(before.pendingAmber);
    // Harvest is a transfer of previously counted earnings, never a new source.
    await awardBonusAmber(offered.amberAwarded, 'word_offering');
    if (offered.creditId) await acknowledgeBatchCredit(offered.creditId);
  };
  const milestone = (win: number): Milestone => ({ win, day: day + 1, date: getLocalDateString() });
  const purchaseAvailable = async (win: number) => {
    while (true) {
      const next = await getNextUnlock();
      if (!next) {
        if (!journey.houseCompleteAt) {
          await markHouseCompleted();
          journey.houseCompleteAt = milestone(win);
        }
        return;
      }
      if (!(await purchaseUnlock(next.id)).success) return;
      journey.recruitsAndRooms.push({ ...milestone(win), id: next.targetId, cost: next.cost });
    }
  };

  for (let win = 1; win <= TOTAL_WINS; win++) {
    const nextDay = Math.floor((win - 1) / cohort.perDay);
    if (nextDay !== day) {
      day = nextDay;
      adsToday = 0;
      jest.setSystemTime(new Date(2026, 8, 5 + day, 12));
      if (cohort.sideRewards && win > 1) {
        const login = await claimDailyLoginReward();
        if (login) addSource('login', login.amount + login.comebackBonus);
      }
      const stipend = await claimSupporterStipendIfDue();
      if (stipend) addSource('supporter_stipend', stipend.amount);
      // Patron gets the two daily claims free; Supporter's ad-free entitlement
      // does not include this Patron-only perk. The opted-in ad cohort views ads.
      if (cohort.sideRewards && win > AUTO_COLLECT_PUZZLE_LIMIT) {
        for (let claim = 0; claim < 2; claim++) {
          if (!isPatronSync() && !consumeAdView()) break;
          await credit('daily_amber', dailyAmberGrantFor(await recordDailyAmberClaim()));
        }
      }
    }

    const before = await getFullProgress();
    const phase = before.currentPhase;
    const isDaily = cohort.id === 'all_side_rewards' && win > 8 && (win - 1) % cohort.perDay === 0;
    const dailyBefore = isDaily ? await loadDailyProgress() : null;
    const actualDifficulty: Difficulty = isDaily ? getDailyDifficulty(getLocalDateString(), !dailyBefore?.totalCompleted)
      : cohort.easy || win <= 8 ? 'EASY' : 'MEDIUM';
    // App pays daily boards at HARD, even for their gentle weekday/eased shape.
    const difficulty: Difficulty = isDaily ? 'HARD' : actualDifficulty;
    if (isDaily) await grantFirstDailyMercy();
    const unlocked = getUnlockedVariants(win - 1, phase);
    const styles: PuzzleVariant[] = cohort.variants && !isDaily ? unlocked : ['standard'];
    const variant = styles[(win - 1) % styles.length];
    const helpRequested = win % 5 === 0;
    let hintsUsed = 0;
    if (helpRequested) {
      journey.hintsRequested++;
      if (!getHintBalanceSync() && consumeAdView()) await addHints(REWARDED_HINT_GRANT, 'hint_recovery');
      if (consumeHintSync()) { hintsUsed = 1; journey.hintsGranted++; }
      else journey.unservedHintRequests++;
    }
    const finalBoard = await isFinaleArmed() && !before.finalPuzzleCompleted;
    const victory = await recordDurableVictory({
      completionId: `${cohort.id}_${win}`, completedDate: getLocalDateString(), difficulty,
      hintsUsed, invalidAttempts: helpRequested ? 2 : 0, gameMode: 'standard',
      completedWords: finalBoard ? ['CLOSED'] : ['TIE', 'TIME', 'HOME'], variant,
      isDaily, undosUsed: helpRequested ? 1 : 0, blind: false, isSharedChallenge: false,
      resonantChoiceCount: 0, lexicon: false, maxStack: false, undoLimited: false, speed: false,
      finalBoard, ritualWord: finalBoard ? 'CLOSED' : '', phaseBefore: phase,
    });
    addSource('puzzle_including_milestones', victory.amberEarned);
    // Daily extras now commit with the durable victory; attribute their
    // receipt amounts without issuing the former App-side credits twice.
    if (victory.dailyOutcome?.milestone) addSource('daily_streak', victory.dailyOutcome.milestone.amber);
    if (victory.dailyOutcome?.eventBonus) addSource('daily_event', victory.dailyOutcome.eventBonus);
    if (victory.milestoneBonus) await grantBonusHint('milestone');
    const seconds = ASSUMED_SECONDS[actualDifficulty] * (variant === 'reverse' ? 1.8 : variant === 'double_shift' ? 1.6 : 1)
      + (helpRequested ? 30 : 0);
    journey.assumedMinutes += seconds / 60;
    const modeKey = `${actualDifficulty}/${isDaily ? 'daily' : variant}`;
    const mode = journey.modeValue[modeKey] ?? { wins: 0, amber: 0, assumedMinutes: 0, amberPerAssumedMinute: 0 };
    mode.wins++;
    // Omit first-win/milestone windfalls for useful style comparisons.
    mode.amber += victory.pendingHarvest?.pendingAmber === undefined ? 0 :
      victory.amberEarned - victory.milestoneBonus - victory.firstCompletionBonus - victory.streakMilestoneBonus;
    mode.assumedMinutes += seconds / 60;
    journey.modeValue[modeKey] = mode;
    journey.peakPendingAmber = Math.max(journey.peakPendingAmber, (await getPendingHarvestSummary()).pendingAmber);

    if (cohort.sideRewards && win > AUTO_COLLECT_PUZZLE_LIMIT && await canOfferRewardedDouble(phase)) {
      if (isAdFreeSync() || consumeAdView()) {
        await recordRewardedDoubleOffered();
        await credit('victory_double', victory.amberEarned);
      }
    }
    // Production auto-collect window, required first offering, then one pit
    // visit per day (or per eight boards during a continuous session).
    const visitPit = win <= AUTO_COLLECT_PUZZLE_LIMIT + 1 || win % Math.min(cohort.perDay, 8) === 0;
    if (visitPit) {
      await collect();
      await confirmPhaseTransition();
      if (cohort.decorateFirst && win >= 28 && journey.optionalSpent === 0) {
        const spent = await spendAmber(250, 'simulation_optional_decoration');
        if (spent.success) journey.optionalSpent = 250;
      }
      await purchaseAvailable(win);
    }
    const after = await getFullProgress();
    if (!journey.phases[String(after.currentPhase)]) journey.phases[String(after.currentPhase)] = milestone(win);
    if (after.finalPuzzleCompleted && !journey.endingAt) journey.endingAt = milestone(win);
    if (cohort.sideRewards && win % cohort.perDay === 0 && win >= 6) {
      const context = {
        puzzlesSolved: win, unlockedAnimalCount: after.unlockedAnimals.length,
        dailyUnlocked: false, challengeUnlocked: win >= 15,
        unlockedVariants: getUnlockedVariants(win, after.currentPhase),
      };
      await loadWeeklyQuests(after.currentPhase, context);
      for (const animal of after.unlockedAnimals) await recordAnimalVisit(animal, after.currentPhase, after.currentStreak);
      const quests = await loadWeeklyQuests(after.currentPhase, context);
      for (const quest of [...quests.daily.quests, ...quests.weekly.quests]) {
        if (!quest.completed || quest.claimed) continue;
        const reward = await claimQuestReward(quest.id, after.currentPhase);
        if (reward) await credit('quests', reward.amber);
      }
      const season = await getSeasonPassView(win);
      for (const tier of season.tiers) {
        for (const track of ['free', 'premium'] as const) {
          if (!(track === 'free' ? tier.freeClaimable : tier.premiumClaimable)) continue;
          const claimed = await claimSeasonTier(tier.tier, track, win);
          if (claimed.granted) addSource(`season_${track}`, claimed.amber);
        }
      }
      await purchaseAvailable(win);
    }
    expect(after.puzzlesSolved).toBe(win);
    expect(after.amber).toBeGreaterThanOrEqual(0);
    // Jest's mock call histories otherwise retain every serialized save.
    jest.clearAllMocks();
  }
  const progress = await getFullProgress();
  journey.availableAmber = progress.amber;
  journey.pendingAmber = (await getPendingHarvestSummary()).pendingAmber;
  journey.hints = getHintBalanceSync();
  for (const mode of Object.values(journey.modeValue)) mode.amberPerAssumedMinute = Number((mode.amber / mode.assumedMinutes).toFixed(2));
  journey.amberPerAssumedMinute = Number((Object.values(journey.amberBySource).reduce((sum, value) => sum + value, 0) / journey.assumedMinutes).toFixed(2));
  return journey;
}

function reportMarkdown(journeys: Journey[]): string {
  const at = (value: Milestone | null | undefined) => value ? `${value.win} / day ${value.day}` : 'not reached';
  const lines = [
    '# Economy journey model — 2026-09-05', '',
    'Generated from production services by `economyJourneySimulation.test.ts`; regenerate with `node scripts/tools/runEconomySimulation.mjs` from mobile/. Values describe a deterministic model, not observed players or retention.', '',
    'Each cohort starts on September 5, 2026 and completes 240 boards. All request one hint every five wins; a missing hint is modeled as eventual completion with undo and two invalid attempts. The three-star rate stays at 80% so paid convenience cannot masquerade as a skill change. Starter and milestone hints use production grants. Surprise rewards are disabled; no resonance or optional House Ask is assumed. All paths choose the CLOSED finale when armed and accept pending phase transitions at the next pit visit.', '',
    'The first eight wins are Easy; later ordinary cohorts choose Medium. The side-claim cohort rotates unlocked standard/Reverse/Double Shift styles and completes one daily board each day after onboarding, using actual daily/streak/event grants and first-daily mercy hints. Other cohorts decline that optional mode. Claims include available login, completed daily/weekly quests, monthly tiers, Patron faucets, Supporter stipend, and reward doubles where eligible. Ads assume successful 30-second views and obey the eight/day global cap and five/day double cap. The core-only cohort declines all discretionary claims. No room passive-income service exists in this build.', '',
    'Timing assumptions: Easy 60s; Medium 100s; reverse ×1.8; double shift ×1.6; help requests +30s. These are sensitivity inputs, not measured times. Navigation, reading, interstitials, failed boards and ad loading are excluded. No reward multiplier is retuned from this model alone. The decoration cohort spends an illustrative 250 amber after win 28 before recruiting; this is a sink stress scenario, not a specific item recommendation.', '',
    '| Cohort | Axel win / day | Phase 4 win / day | House win / day | Ending win / day | Amber available / pending | Hints left / unmet requests | Amber / assumed minute |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const j of journeys) lines.push(`| ${j.label} | ${at(j.recruitsAndRooms.find(u => u.id === 'axolotl'))} | ${at(j.phases['4'])} | ${at(j.houseCompleteAt)} | ${at(j.endingAt)} | ${j.availableAmber} / ${j.pendingAmber} | ${j.hints} / ${j.unservedHintRequests} | ${j.amberPerAssumedMinute} |`);
  lines.push('', 'Full JSON retains every recruit/room date, all phase dates, source totals, peak pending amber and mode-specific time assumptions. A completed economy path proves affordability and gating only; story-scene coverage and comprehension need the independent story tests and device playtest.', '');
  return lines.join('\n');
}

describe('production economy journey simulation', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.42);
  });
  afterAll(() => { setSurpriseRng(); jest.restoreAllMocks(); jest.useRealTimers(); });

  test('free, paid and optional-spending cohorts reach a purchase-free ending without losing harvested amber', async () => {
    const journeys: Journey[] = [];
    for (const cohort of COHORTS) journeys.push(await simulate(cohort));
    const stem = process.env.WORDSHIFT_ECONOMY_REPORT;
    if (stem) {
      mkdirSync(dirname(stem), { recursive: true });
      writeFileSync(`${stem}.json`, JSON.stringify({ modelVersion: 1, startDate: '2026-09-05', totalWins: TOTAL_WINS, assumedSeconds: ASSUMED_SECONDS, journeys }, null, 2) + '\n');
      writeFileSync(`${stem}.md`, reportMarkdown(journeys));
    }
    for (const j of journeys) {
      expect(j.endingAt).not.toBeNull();
      expect(j.houseCompleteAt).not.toBeNull();
      expect(j.recruitsAndRooms).toHaveLength(UNLOCK_PROGRESSION.length);
      expect(j.hintsGranted + j.unservedHintRequests).toBe(j.hintsRequested);
      const earned = Object.values(j.amberBySource).reduce((sum, value) => sum + value, 0);
      const spent = j.recruitsAndRooms.reduce((sum, unlock) => sum + unlock.cost, 0) + j.optionalSpent;
      expect(j.availableAmber + j.pendingAmber + spent).toBe(earned);
    }
    // Paid amber must not accelerate the same wins' narrative phase schedule.
    const free = journeys.find(j => j.id === 'engaged')!;
    for (const paid of journeys.filter(j => ['patron', 'supporter'].includes(j.id))) {
      for (const phase of ['1', '2', '3', '4']) expect(paid.phases[phase]).toEqual(free.phases[phase]);
    }
  }, 60000);
});
