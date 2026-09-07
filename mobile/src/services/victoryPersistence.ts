import { Difficulty, GameMode } from '../types';
import { DialoguePhase } from '../types/homeWorld';
import {
  calculateStars,
  isFlawless,
  recordPuzzleCompletion,
  getCumulativeStats,
  getThreeStarRate,
} from './starRating';
import {
  awardPuzzleAmber,
  getCurrentPhase,
  recordRitualWords,
  recordVariantEncounter,
  applyVariantAmberBonus,
  recordVariantWin,
  isPostRevelation,
  getFullProgress,
 isHouseCompleted, isFinalPuzzleCompleted, isFinaleArmed, markFinalPuzzleCompleted,
  markPostRevelation, getPhase4DwellCount, recordPhase4Dwell, armFinale , canArmFinale , awardBonusAmberInTransaction } from './amberCurrency';
import { recordFormedWords } from './wordHistory';
import { calculateRitualEnergy, extractTriggerWords } from './localGenerator';
import { updateQuestProgress, WeeklyQuestGenerationContext } from './weeklyQuests';
import { recordOfferingFulfillment } from './offeringRequests';
import { PuzzleVariant, getVariantAmberMultiplier, getNewlyUnlockedVariants, getUnlockedVariants } from './puzzleVariety';
import { enqueueHarvestBatch, getPendingHarvestSummary, recoverPendingHarvestCredits } from './wordHarvest';
import { recordResonantChoices, recordUnbrokenWeaveVictory } from './masteryRecords';
import { RESONANT_MOVE_AMBER, RESONANT_BOARD_CAP_AMBER , FINALE_ARM_MIN_PUZZLES } from '../constants/gameBalance';

import type { VictoryData, AmberBreakdown } from '../hooks/useGamePersistence';
import AsyncStorage, { runStorageTransaction } from './persistenceStorage';
import NativeStorage from '@react-native-async-storage/async-storage';
import { invalidateRestoredServiceCaches } from './cloudSave';
import { recordSeasonPuzzleCompletion } from './seasonPass';
import { getLocalDateString, parseLocalDate } from './dateUtils';
import { recordStoryBoundary } from './storySpine';
import { loadDailyProgress, recordDailyCompletion, checkDailyStreakMilestone } from './dailyChallenge';
import { isEventDay, getEventDailyBonusAmber } from './liveEvents';

export interface VictoryInput {
  completionId: string;
  completedDate: string;
  difficulty: Difficulty;
  hintsUsed: number;
  invalidAttempts: number;
  gameMode: GameMode;
  completedWords: string[];
  variant: PuzzleVariant;
  isDaily: boolean;
  undosUsed: number;
  blind: boolean;
  isSharedChallenge: boolean;
  resonantChoiceCount: number;
  lexicon: boolean;
  maxStack: boolean;
  undoLimited: boolean;
  speed: boolean;
  finalBoard?: boolean;
  /** Empty for pre-revision boards whose last word was not a player boundary. */
  ritualWord?: string;
  phaseBefore?: DialoguePhase;
  dailyDate?: string;
  unbrokenWeave?: boolean;
}
export const PENDING_VICTORY_KEY = 'wordshift_pending_victory';
export const VICTORY_RECEIPT_KEY = 'wordshift_victory_receipt';

async function computeVictory(input: VictoryInput): Promise<VictoryData> {
  const { difficulty, hintsUsed, invalidAttempts, gameMode, completedWords, variant,
    isDaily, undosUsed, blind, isSharedChallenge, resonantChoiceCount, lexicon,
    maxStack, undoLimited, speed } = input;
  const phaseBefore = input.phaseBefore ?? await getCurrentPhase();
  const stars = calculateStars(hintsUsed, invalidAttempts);
  const flawless = isFlawless(hintsUsed, invalidAttempts, undosUsed);
  const safeResonantCount = Number.isFinite(resonantChoiceCount) && resonantChoiceCount > 0
    ? Math.floor(resonantChoiceCount) : 0;
  const resonanceBonus = Math.min(safeResonantCount * RESONANT_MOVE_AMBER, RESONANT_BOARD_CAP_AMBER);
      // Record star stats first so we can get the three-star rate
      await recordPuzzleCompletion(difficulty, hintsUsed, invalidAttempts, undosUsed);
      const stats = await getCumulativeStats();
      const threeStarRate = getThreeStarRate(stats) / 100; // Convert percentage to ratio

      // creditToBalance=false: the PER-PUZZLE amber is queued in a harvest
      // batch, not credited yet. One-time windfalls (milestone / first-
      // completion / streak milestone) are credited to the spendable balance
      // immediately by the economy regardless of this flag.
      // skipPhaseProgress: shared-challenge wins pay full amber but feed ZERO
      // weighted phase progress (see awardPuzzleAmber's option contract).
      const amberResult = await awardPuzzleAmber(difficulty, stars, gameMode, threeStarRate, false, {
        skipPhaseProgress: isSharedChallenge,
        completedDate: input.completedDate,
        // Blind Offering pays the apex rung (2x amber, 2x progress cap);
        // stacked with Challenge it pays the maximal-trial rate (2.25x amber,
        // same 2x progress cap).
        blind,
        undoLimited,
        // Lexicon (rare-word) bonus — amber-only, never phase progress.
        lexicon,
        speed,
        // Amber-only resonance bonus (itemized by the economy, never progress).
        resonanceBonus,
      });

      // Cumulative mastery stat: resonant choices ever made (non-critical).
      if (safeResonantCount > 0) {
        await recordResonantChoices(safeResonantCount);
      }

      // Phase 5 (post-revelation) is set via markPostRevelation(), not phase progression.
      // calculatePhase() maxes at 4, so amberResult.newPhase can't exceed 4. If the player
      // is post-revelation, preserve phase 5 to avoid regressing the UI and dialogue phase.
      const postRev = await isPostRevelation();
      const effectivePhase: DialoguePhase = postRev ? 5 as DialoguePhase : amberResult.newPhase;

      // Apply variant bonus (full multiplier, no decay) + the once-per-day
      // fresh-variant bonus. creditToBalance=false: both are queued, not credited.
      const variantMultiplier = getVariantAmberMultiplier(variant);
      let variantBonus = 0;
      let variantAppliedMultiplier = 1.0;
      const variantRepeatDecay = 1.0;
      let freshVariantBonus = 0;
      if (variant !== 'standard' && variantMultiplier > 1.0) {
        const variantResult = await applyVariantAmberBonus(
          variant,
          amberResult.amount,
          variantMultiplier,
          false,
          input.completedDate
        );
        variantBonus = variantResult.bonus;
        freshVariantBonus = variantResult.freshBonus;
        variantAppliedMultiplier = variantResult.appliedMultiplier;
        amberResult.newBalance = variantResult.newBalance;
        amberResult.amount += variantBonus + freshVariantBonus;
      }

      // Track the variant/blind/lexicon win for achievements + the variant-offer
      // nudge. Runs for blind/lexicon standard boards too (both compose with any variant).
      if (variant !== 'standard' || blind || lexicon || speed) {
        await recordVariantWin(variant, blind, lexicon, maxStack, speed);
      }

      // Crediting split: ONLY the per-puzzle amber (amount — incl. the variant/
      // fresh/resonance additions folded in above) is deferred into the harvest
      // batch, preserving the pit ritual. The one-time windfalls (milestone /
      // first-completion / streak milestone) were credited to the spendable
      // balance immediately by awardPuzzleAmber, so they never enter the batch.
      const queuedAmber = amberResult.amount;
      // Total earned this victory (queued per-puzzle share + instant windfalls)
      // — what the Victory modal itemizes and sums.
      const totalEarnedAmber = amberResult.amount
        + amberResult.milestoneBonus
        + amberResult.firstCompletionBonus
        + amberResult.streakMilestoneBonus;

      // Real itemization for the Victory modal — every part comes from the
      // economy itself (never re-derived in the UI); parts sum to the total.
      const amberBreakdown: AmberBreakdown = {
        base: amberResult.baseAmber ?? 0,
        starBonus: amberResult.starBonusAmber ?? 0,
        streakBonus: amberResult.streakBonus ?? 0,
        challengeBonus: amberResult.challengeBonus ?? 0,
        lexiconBonus: amberResult.lexiconBonus ?? 0,
        speedBonus: amberResult.speedBonus ?? 0,
        patronBonus: amberResult.patronBonus ?? 0,
        surpriseBonus: amberResult.surpriseBonus ?? 0,
        resonanceBonus: amberResult.resonanceBonus ?? 0,
        variantBonus,
        freshVariantBonus,
        firstCompletionBonus: amberResult.firstCompletionBonus ?? 0,
        milestoneBonus: amberResult.milestoneBonus ?? 0,
        streakMilestoneBonus: amberResult.streakMilestoneBonus ?? 0,
        total: totalEarnedAmber,
      };

      // Enqueue harvest batch with all completed words and computed amber value
      const harvestedWords = completedWords.length > 0
        ? [...new Set(completedWords.map(w => w.toUpperCase()))]
        : [];
      const harvestBatchId = input.completionId;
      const harvestResult = await enqueueHarvestBatch({
        id: harvestBatchId,
        words: harvestedWords,
        amberValue: queuedAmber,
        createdAt: Date.now(),
        difficulty,
        gameMode,
        stars,
        variant,
        phaseAtHarvest: effectivePhase,
      });

      const pendingHarvest = await getPendingHarvestSummary();

      // Record ritual words from the completed puzzle. Shared-challenge wins
      // pass ZERO ritual energy: the words still land in the ledger and the
      // trigger-word queue (flavor stays), but recordRitualWords' energy-based
      // phaseProgress feed gets nothing — the second half of the amber-only rule.
      let totalWordsFormed = 0;
      let ritualEnergy = 0;
      if (completedWords.length > 0) {
        ritualEnergy = isSharedChallenge ? 0 : calculateRitualEnergy(completedWords, effectivePhase);
        const triggerWords = extractTriggerWords(completedWords);
        const ritualResult = await recordRitualWords(completedWords, ritualEnergy, triggerWords);
        totalWordsFormed = ritualResult.totalWordsFormed;
        // Feed the FORMED words into the word-history cooldowns too. The
        // starting chain was recorded when the puzzle was served, so without
        // this the words the player actually built (half of what they see)
        // were invisible to bank-selection freshness and could repeat
        // immediately on the next board.
        await recordFormedWords(completedWords);
        // Fulfill any animal's outstanding offering request whose theme these
        // words match — the animal reacts by name on the next visit.
        await recordOfferingFulfillment(completedWords);
      }

      // Queue a one-time variant tutorial for animal dialogue.
      if (variant && variant !== 'standard') {
        await recordVariantEncounter(variant);
      }

      // Queue variant tutorials for any variants that just became unlocked.
      const newlyUnlocked = getNewlyUnlockedVariants(
        amberResult.puzzlesSolved,
        effectivePhase
      );
      for (const unlockedVariant of newlyUnlocked) {
        await recordVariantEncounter(unlockedVariant);
      }

      // Update daily + weekly quest progress and capture newly completed quests
      let questsCompleted: string[] = [];
      try {
        // A COMPLETE generation context, not just the event.
        //
        // A fresh install goes straight to the cold-open board, so HomeScreen —
        // previously the only caller that supplied a context — never mounts,
        // and this victory was the first thing to touch the quest service. With
        // no context, `isBelowJournalGate(undefined)` is false by design, so
        // the pre-journal dormancy gate never fired for ANY fresh install and a
        // full set was minted at puzzles-solved 1; and `unlockedAnimalCount`
        // fell back to 10, which kept both "talk to 6/9 animals" weeklies in
        // the pool for a player who had met nobody. That set then survived the
        // week, because a later context-full load sees a current periodId and
        // leaves it alone. Roughly 87% of weeks minted an unreachable one.
        //
        // It must be COMPLETE: rememberGenerationContext persists whatever it
        // is handed, so a partial context would re-introduce the ?? 10 animal
        // default on the next context-less load.
        // Read defensively: quest progress must not depend on this succeeding.
        // It sits inside the same try as updateQuestProgress, so a throw here
        // would silently skip the whole quest update for that victory. Falling
        // back to a context-less call restores the old (imperfect but working)
        // behaviour instead of losing progress outright.
        let questContext: WeeklyQuestGenerationContext | undefined;
        try {
          const questProgress = await getFullProgress();
          questContext = {
            puzzlesSolved: amberResult.puzzlesSolved,
            unlockedAnimalCount: (questProgress.unlockedAnimals ?? []).length,
            dailyUnlocked: false,
            challengeUnlocked: amberResult.puzzlesSolved >= 15,
            unlockedVariants: getUnlockedVariants(amberResult.puzzlesSolved, effectivePhase),
          };
        } catch (error) {
          throw error;
        }
        const completedQuests = await updateQuestProgress({
          // The one caller that represents a completed board. The altar and the
          // Tending Shrine share this handler and must not advance solve_count.
          isSolve: true,
          difficulty,
          stars,
          hintsUsed,
          isDaily,
          isChallenge: gameMode === 'challenge',
          amberEarned: totalEarnedAmber,
          currentStreak: amberResult.currentStreak,
          variant,
          isSpeed: speed,
        }, effectivePhase, questContext);
        questsCompleted = completedQuests.map(q => q.title);
      } catch (error) {
        // Quest credit is part of this durable completion, so retry it too.
        throw error;
      }

      await recordSeasonPuzzleCompletion(amberResult.puzzlesSolved, input.completionId, input.completedDate);
      let endgame: VictoryData['endgame'];
      let finalPhase = effectivePhase;
      if (!amberResult.phaseChanged && phaseBefore >= 4) {
        const houseComplete = await isHouseCompleted();
        if (houseComplete || amberResult.puzzlesSolved >= FINALE_ARM_MIN_PUZZLES) {
          if (!(await isFinalPuzzleCompleted())) {
            if (input.finalBoard) {
              const progress = await getFullProgress();
              await recordStoryBoundary({
                phase: effectivePhase, puzzlesSolved: progress.puzzlesSolved,
                cycleCount: progress.cycleCount ?? 0, cycleStartPuzzles: progress.cycleStartPuzzles,
                unlockedAnimals: progress.unlockedAnimals ?? [],
                finaleArmed: progress.finaleArmed, finalPuzzleCompleted: progress.finalPuzzleCompleted,
                postRevelation: progress.postRevelation,
              }, input.ritualWord ?? '');
              await markFinalPuzzleCompleted();
              endgame = { kind: 'arrival', houseComplete };
            } else if (!(await isFinaleArmed())) {
              const dwellBefore = await getPhase4DwellCount();
              const dwell = await recordPhase4Dwell();
              if (canArmFinale(dwell, amberResult.puzzlesSolved)) await armFinale();
              endgame = { kind: 'dwell', houseComplete, dwellBefore, dwell };
            }
          } else if (!(await isPostRevelation())) {
            await markPostRevelation();
            finalPhase = 5;
            endgame = { kind: 'post_arrival', houseComplete };
          }
        }
      }
      let dailyOutcome: VictoryData['dailyOutcome'];
      if (isDaily) {
        const before = await loadDailyProgress();
        const beforeStreak = before.currentStreak;
        const beforeTotal = before.totalCompleted;
        const boardDate = input.dailyDate ?? input.completedDate;
        const progress = await recordDailyCompletion(stars, hintsUsed, invalidAttempts, boardDate, input.completedDate);
        const credited = progress.totalCompleted > beforeTotal;
        const milestone = credited ? checkDailyStreakMilestone(progress.currentStreak, beforeStreak, effectivePhase) : null;
        if (milestone) amberResult.newBalance = await awardBonusAmberInTransaction(milestone.amber, 'daily_streak_milestone');
        const eventBonus = credited && isEventDay(boardDate)
          ? getEventDailyBonusAmber(amberBreakdown.base + amberBreakdown.starBonus + amberBreakdown.streakBonus + amberBreakdown.challengeBonus) : 0;
        if (eventBonus > 0) amberResult.newBalance = await awardBonusAmberInTransaction(eventBonus, 'event_daily_bonus');
        dailyOutcome = { progress: { currentStreak: progress.currentStreak,
          streakSavedByFreeze: progress.streakSavedByFreeze, streakDecayedTo: progress.streakDecayedTo },
          milestone, eventBonus, credited };
      }
      let weave: Partial<VictoryData> = {};
      if (input.unbrokenWeave) {
        const { mastery, rankedUp } = await recordUnbrokenWeaveVictory(difficulty, flawless);
        weave = { unbrokenWeaveRank: mastery.rank, unbrokenWeaveTitle: mastery.title,
          unbrokenWeaveNextObjective: mastery.nextObjective, unbrokenWeaveRankedUp: rankedUp };
      }
      return {
        ...weave,
        dailyOutcome,
        earnedStars: stars,
        flawless,
        flawlessCount: stats.flawlessCount ?? 0,
        amberEarned: totalEarnedAmber,
        amberBreakdown,
        amberBalance: amberResult.newBalance,
        isDaily,
        phaseChanged: amberResult.phaseChanged,
        newPhase: finalPhase,
        endgame,
        streakBonus: amberResult.streakBonus,
        challengeBonus: amberResult.challengeBonus,
        blind,
        undoLimited,
        surpriseBonus: amberResult.surpriseBonus,
        currentStreak: amberResult.currentStreak,
        milestoneBonus: amberResult.milestoneBonus,
        milestoneMessage: amberResult.milestoneMessage,
        cumulativeStats: stats,
        phaseAcceleration: amberResult.phaseAcceleration,
        totalWordsFormed,
        ritualEnergy,
        firstCompletionBonus: amberResult.firstCompletionBonus,
        variantBonus,
        resonanceBonus: amberResult.resonanceBonus ?? 0,
        resonantChoiceCount: safeResonantCount,
        freshVariantBonus,
        variant,
        variantAppliedMultiplier,
        variantRepeatDecay,
        questsCompleted,
        streakMilestoneBonus: amberResult.streakMilestoneBonus,
        streakMilestoneMessage: amberResult.streakMilestoneMessage,
        streakSaved: amberResult.streakSaved,
        harvestedWords,
        pendingHarvest,
        harvestBatchId,
        autoCollected: false,
        phaseTransitionPending: amberResult.phaseTransitionPending,
        harvestOverflow: harvestResult.overflow,
        puzzlesSolved: amberResult.puzzlesSolved,
      };
}

function validateInput(value: unknown): value is VictoryInput {
  const input = value as VictoryInput;
  return !!input && typeof input === 'object' && typeof input.completionId === 'string' &&
    input.completionId.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(input.completedDate) &&
    getLocalDateString(parseLocalDate(input.completedDate)) === input.completedDate &&
    ['standard', 'challenge'].includes(input.gameMode) &&
    ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD', 'EXPERT'].includes(input.difficulty) &&
    Array.isArray(input.completedWords) && input.completedWords.every(word => typeof word === 'string') &&
    Number.isFinite(input.hintsUsed) && input.hintsUsed >= 0 &&
    Number.isFinite(input.invalidAttempts) && input.invalidAttempts >= 0 &&
    (input.dailyDate === undefined || /^\d{4}-\d{2}-\d{2}$/.test(input.dailyDate));
}

/** The pending intent is durable before computation; only the commit makes
 * rewards/stats visible in storage. Replaying an interrupted intent uses the
 * same completion ID and returns the persisted receipt instead of double-paying. */
export async function persistVictory(input: VictoryInput): Promise<VictoryData> {
  if (!validateInput(input)) throw new Error('Invalid puzzle completion');
  try {
    const result = await runStorageTransaction('victory', async () => {
      const rawReceipt = await AsyncStorage.getItem(VICTORY_RECEIPT_KEY);
      if (rawReceipt) {
        const receipt = JSON.parse(rawReceipt) as { id: string; result: VictoryData };
        if (receipt.id === input.completionId) {
          // Retry can recreate an intent when the first acknowledgement was lost.
          await AsyncStorage.removeItem(PENDING_VICTORY_KEY);
          return receipt.result;
        }
      }
      const result = await computeVictory(input);
      await AsyncStorage.setItem(VICTORY_RECEIPT_KEY, JSON.stringify({ id: input.completionId, result }));
      await AsyncStorage.removeItem(PENDING_VICTORY_KEY);
      // A restored PLAYING snapshot must never re-award this completed board.
      await AsyncStorage.removeItem('wordshift_in_progress_puzzle');
      return result;
    });
    return result;
  } catch (error) {
    invalidateRestoredServiceCaches();
    throw error;
  }
}

let completionQueue: Promise<unknown> = Promise.resolve();
export function recordDurableVictory(input: VictoryInput): Promise<VictoryData> {
  const result = completionQueue.catch(() => {}).then(() => prepareVictory(input));
  completionQueue = result;
  return result;
}

async function prepareVictory(input: VictoryInput): Promise<VictoryData> {
  if (!validateInput(input)) throw new Error('Invalid puzzle completion');
  // Intent must be outside the staged operation. If storage is full before this
  // write, the caller keeps the completed board and offers Retry.
  const pending = await NativeStorage.getItem(PENDING_VICTORY_KEY);
  if (pending) {
    const old = JSON.parse(pending) as VictoryInput;
    if (!validateInput(old) || old.completionId !== input.completionId) {
      throw new Error('Finish recovering the previous puzzle before continuing');
    }
  } else {
    await NativeStorage.setItem(PENDING_VICTORY_KEY, JSON.stringify(input));
  }
  return persistVictory(input);
}

/** Call after storage-journal recovery and migrations, before MainApp mounts. */
export async function recoverPendingVictory(): Promise<VictoryData | null> {
  const raw = await AsyncStorage.getItem(PENDING_VICTORY_KEY);
  if (!raw) { await recoverPendingHarvestCredits(); return null; }
  const input: unknown = JSON.parse(raw);
  if (!validateInput(input)) throw new Error('Your unfinished completion needs recovery');
  const result = await persistVictory(input);
  await recoverPendingHarvestCredits();
  return result;
}

/** Reset All only; paid purchase intents are intentionally a different ledger. */
export async function clearPendingVictory(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_VICTORY_KEY);
  await AsyncStorage.removeItem(VICTORY_RECEIPT_KEY);
}

export function createVictoryInput(
  args: Omit<VictoryInput, 'completedDate'> & { completedDate?: string },
): VictoryInput { return { ...args, completedDate: args.completedDate ?? getLocalDateString() }; }
