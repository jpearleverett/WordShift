import { storage } from './storage';
import { Difficulty } from '../types';
import { DialoguePhase } from '../types/homeWorld';

/**
 * Weekly quests system for WordShift.
 *
 * Generates 4 quests each Monday that reset weekly.
 * Quests provide bonus amber rewards that scale with narrative phase.
 * Quest descriptions shift tone with narrative phase.
 */

const STORAGE_KEY = 'wordshift_weekly_quests';

// ============================================================================
// Types
// ============================================================================

export type QuestType =
  | 'solve_count'       // Complete N puzzles
  | 'solve_difficulty'  // Complete N puzzles on a specific difficulty
  | 'earn_stars'        // Earn N three-star ratings
  | 'daily_complete'    // Complete the daily challenge
  | 'no_hints'          // Complete N puzzles without hints
  | 'challenge_mode'    // Complete N puzzles in challenge mode
  | 'earn_amber'        // Earn N total amber this week
  | 'visit_animals'     // Talk to N different animals this week
  | 'streak_days'       // Maintain a streak for N days
  | 'sacrifice_amber'   // Offer N amber to the arrangement (Phase 4+ only)
  | 'daily_streak';     // Complete daily challenge N days in a row

export interface Quest {
  id: string;
  type: QuestType;
  title: string;
  /** Phase-aware description */
  description: string;
  /** Phase 3+ dark description */
  darkDescription?: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  rewardAmber: number;
  /** Difficulty filter (only for solve_difficulty quests) */
  difficulty?: Difficulty;
}

export interface WeeklyQuestState {
  weekId: string; // ISO week identifier (e.g., "2026-W07")
  quests: Quest[];
  generatedAt: number;
  /** Distinct animal ids visited this week (for visit_animals quests) */
  animalsVisitedThisWeek: string[];
}

// ============================================================================
// Quest Templates
// ============================================================================

interface QuestTemplate {
  type: QuestType;
  titleTemplate: string;
  descTemplate: string;
  darkDescTemplate?: string;
  target: number;
  rewardAmber: number;
  difficulty?: Difficulty;
}

const QUEST_POOL: QuestTemplate[] = [
  // Solve count quests — scaled up ~40-50% to feel meaningful alongside per-puzzle amber
  { type: 'solve_count', titleTemplate: 'Puzzle Solver', descTemplate: 'Complete {target} puzzles this week', darkDescTemplate: 'Offer {target} arrangements to the pattern', target: 5, rewardAmber: 45 },
  { type: 'solve_count', titleTemplate: 'Dedicated Shifter', descTemplate: 'Complete {target} puzzles this week', darkDescTemplate: '{target} more incantations for the arrangement', target: 10, rewardAmber: 85 },
  { type: 'solve_count', titleTemplate: 'Word Marathon', descTemplate: 'Complete {target} puzzles this week', darkDescTemplate: 'The void hungers for {target} offerings', target: 15, rewardAmber: 140 },

  // Difficulty-specific quests
  { type: 'solve_difficulty', titleTemplate: 'Hard Challenger', descTemplate: 'Complete {target} Hard puzzles', darkDescTemplate: 'The difficult arrangements carry more weight', target: 3, rewardAmber: 55, difficulty: 'HARD' },
  { type: 'solve_difficulty', titleTemplate: 'Medium Master', descTemplate: 'Complete {target} Medium puzzles', darkDescTemplate: 'Steady offerings sustain the pattern', target: 5, rewardAmber: 45, difficulty: 'MEDIUM' },
  { type: 'solve_difficulty', titleTemplate: 'Rising Difficulty', descTemplate: 'Complete {target} Medium+ puzzles', darkDescTemplate: 'The pattern prefers complexity', target: 3, rewardAmber: 50, difficulty: 'MEDIUM_PLUS' },

  // Star quests
  { type: 'earn_stars', titleTemplate: 'Star Chaser', descTemplate: 'Earn {target} three-star ratings', darkDescTemplate: 'Perfection pleases the arrangement', target: 3, rewardAmber: 50 },
  { type: 'earn_stars', titleTemplate: 'Perfectionist', descTemplate: 'Earn {target} three-star ratings', darkDescTemplate: '{target} flawless offerings', target: 5, rewardAmber: 70 },

  // Daily challenge
  { type: 'daily_complete', titleTemplate: 'Daily Devotion', descTemplate: 'Complete the daily challenge', darkDescTemplate: 'The daily ritual must be observed', target: 1, rewardAmber: 35 },

  // No hints
  { type: 'no_hints', titleTemplate: 'Independent Mind', descTemplate: 'Complete {target} puzzles without hints', darkDescTemplate: 'The words come to you unbidden', target: 3, rewardAmber: 45 },
  { type: 'no_hints', titleTemplate: 'Unaided', descTemplate: 'Complete {target} puzzles without hints', darkDescTemplate: 'You no longer need guidance. You never did.', target: 5, rewardAmber: 70 },

  // Challenge mode
  { type: 'challenge_mode', titleTemplate: 'Challenge Accepted', descTemplate: 'Complete {target} challenge mode puzzle(s)', darkDescTemplate: 'The arrangement rewards the bold', target: 1, rewardAmber: 35 },
  { type: 'challenge_mode', titleTemplate: 'Iron Solver', descTemplate: 'Complete {target} challenge mode puzzles', darkDescTemplate: '{target} offerings under duress', target: 3, rewardAmber: 70 },

  // Amber earning
  { type: 'earn_amber', titleTemplate: 'Amber Collector', descTemplate: 'Earn {target} amber this week', darkDescTemplate: 'Gather {target} amber for the arrangement', target: 50, rewardAmber: 30 },
  { type: 'earn_amber', titleTemplate: 'Amber Rush', descTemplate: 'Earn {target} amber this week', darkDescTemplate: 'The coffers of the temple must be filled', target: 100, rewardAmber: 55 },

  // Home engagement — encourage visiting animals
  { type: 'visit_animals', titleTemplate: 'Social Butterfly', descTemplate: 'Talk to {target} different animals', darkDescTemplate: 'Consult {target} keepers this week', target: 3, rewardAmber: 40 },
  { type: 'visit_animals', titleTemplate: 'Community Builder', descTemplate: 'Talk to {target} different animals', darkDescTemplate: 'The keepers require your audience', target: 5, rewardAmber: 60 },

  // Streak consistency
  { type: 'streak_days', titleTemplate: 'Consistent', descTemplate: 'Maintain a {target}-day streak', darkDescTemplate: 'Do not break the chain for {target} days', target: 3, rewardAmber: 35 },

  // Daily streak
  { type: 'daily_streak', titleTemplate: 'Daily Devotee', descTemplate: 'Complete daily challenges {target} days in a row', darkDescTemplate: 'The daily ritual observed for {target} consecutive days', target: 3, rewardAmber: 50 },

  // Sacrifice (Phase 4+ only — these are filtered out for lower phases in generateQuests)
  { type: 'sacrifice_amber', titleTemplate: 'Offering', descTemplate: 'Offer {target} amber to the arrangement', darkDescTemplate: 'Sacrifice {target} amber to the void', target: 50, rewardAmber: 40 },
  { type: 'sacrifice_amber', titleTemplate: 'Greater Offering', descTemplate: 'Offer {target} amber to the arrangement', darkDescTemplate: 'The arrangement hungers for {target} amber', target: 100, rewardAmber: 75 },
];

// ============================================================================
// In-memory cache
// ============================================================================

let questStateCache: WeeklyQuestState | null = null;

// ============================================================================
// Week ID calculation
// ============================================================================

/**
 * Get the ISO week identifier for a given date (e.g., "2026-W07").
 * Week starts on Monday.
 */
export function getWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Make Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday of the week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

// ============================================================================
// Quest Generation
// ============================================================================

/**
 * Generate weekly quests. Selects 4 quests from the pool using seeded
 * randomness based on the week ID for determinism.
 */
function generateQuests(weekId: string, phase: number): Quest[] {
  // Seeded PRNG based on week ID
  let seed = weekId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const seededRandom = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed >> 16) / 32768;
  };

  // Filter pool by phase — sacrifice quests only available at Phase 4+
  const phaseFiltered = QUEST_POOL.filter(t => {
    if (t.type === 'sacrifice_amber' && phase < 4) return false;
    return true;
  });

  // Shuffle the pool deterministically
  const shuffled = [...phaseFiltered];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Pick 4 quests, avoiding duplicate types
  const selected: QuestTemplate[] = [];
  for (const template of shuffled) {
    if (selected.length >= 4) break;
    // Allow at most 2 of the same type
    const typeCount = selected.filter(s => s.type === template.type).length;
    if (typeCount >= 2) continue;
    selected.push(template);
  }

  // Fill remaining slots if we didn't reach 4 (can happen with small filtered pools)
  if (selected.length < 4) {
    for (const template of shuffled) {
      if (selected.length >= 4) break;
      if (!selected.includes(template)) {
        selected.push(template);
      }
    }
  }

  // Always include a daily challenge quest if not already selected
  if (!selected.some(s => s.type === 'daily_complete')) {
    const dailyTemplate = QUEST_POOL.find(t => t.type === 'daily_complete')!;
    selected[selected.length - 1] = dailyTemplate;
  }

  return selected.map((template, i) => {
    const desc = template.descTemplate.replace('{target}', template.target.toString());
    const darkDesc = template.darkDescTemplate?.replace('{target}', template.target.toString());
    return {
      id: `${weekId}_quest_${i}`,
      type: template.type,
      title: template.titleTemplate,
      description: desc,
      darkDescription: darkDesc,
      target: template.target,
      progress: 0,
      completed: false,
      claimed: false,
      rewardAmber: template.rewardAmber,
      difficulty: template.difficulty,
    };
  });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load the current weekly quest state, generating new quests if the week has changed.
 */
export function loadWeeklyQuests(currentPhase: number = 0): WeeklyQuestState {
  const currentWeek = getWeekId();

  if (questStateCache && questStateCache.weekId === currentWeek) {
    return questStateCache;
  }

  const stored = storage.getString(STORAGE_KEY);
  if (stored !== undefined) {
    const parsed: WeeklyQuestState = JSON.parse(stored);
    if (parsed.weekId === currentWeek) {
      if (!parsed.animalsVisitedThisWeek) {
        parsed.animalsVisitedThisWeek = [];
      }
      questStateCache = parsed;
      return parsed;
    }
  }

  // New week — generate fresh quests
  const newState: WeeklyQuestState = {
    weekId: currentWeek,
    quests: generateQuests(currentWeek, currentPhase),
    generatedAt: Date.now(),
    animalsVisitedThisWeek: [],
  };

  questStateCache = newState;
  saveQuestState(newState);
  return newState;
}

/**
 * Update quest progress based on a completed puzzle.
 * Returns newly completed quests (for toast notifications).
 */
export function updateQuestProgress(event: {
  difficulty: Difficulty;
  stars: number;
  hintsUsed: number;
  isDaily: boolean;
  isChallenge: boolean;
  amberEarned: number;
  /** Number of distinct animals visited this week (for visit_animals quests) */
  animalsVisited?: number;
  /** Current streak length (for streak_days quests) */
  currentStreak?: number;
  /** Current daily challenge streak (for daily_streak quests) */
  dailyStreak?: number;
  /** Amber sacrificed this session (for sacrifice_amber quests) */
  amberSacrificed?: number;
}, currentPhase: number = 0): Quest[] {
  const state = loadWeeklyQuests(currentPhase);
  if (!state.animalsVisitedThisWeek) {
    state.animalsVisitedThisWeek = [];
  }
  const newlyCompleted: Quest[] = [];

  for (const quest of state.quests) {
    if (quest.completed) continue;

    let progressDelta = 0;

    switch (quest.type) {
      case 'solve_count':
        progressDelta = 1;
        break;
      case 'solve_difficulty':
        if (event.difficulty === quest.difficulty) progressDelta = 1;
        break;
      case 'earn_stars':
        if (event.stars === 3) progressDelta = 1;
        break;
      case 'daily_complete':
        if (event.isDaily) progressDelta = 1;
        break;
      case 'no_hints':
        if (event.hintsUsed === 0) progressDelta = 1;
        break;
      case 'challenge_mode':
        if (event.isChallenge) progressDelta = 1;
        break;
      case 'earn_amber':
        progressDelta = event.amberEarned;
        break;
      case 'visit_animals':
        // Set progress directly to the current count (not delta-based)
        if (event.animalsVisited !== undefined) {
          quest.progress = Math.min(event.animalsVisited, quest.target);
        }
        progressDelta = 0; // Handled above via direct assignment
        break;
      case 'streak_days':
        // Set progress directly to current streak length
        if (event.currentStreak !== undefined) {
          quest.progress = Math.min(event.currentStreak, quest.target);
        }
        progressDelta = 0; // Handled above via direct assignment
        break;
      case 'daily_streak':
        // Set progress directly to current daily streak length
        if (event.dailyStreak !== undefined) {
          quest.progress = Math.min(event.dailyStreak, quest.target);
        }
        progressDelta = 0;
        break;
      case 'sacrifice_amber':
        // Increment by amount sacrificed
        if (event.amberSacrificed !== undefined && event.amberSacrificed > 0) {
          progressDelta = event.amberSacrificed;
        }
        break;
    }

    if (progressDelta > 0) {
      quest.progress = Math.min(quest.progress + progressDelta, quest.target);
    }

    // Check for completion (handles both delta-based and direct-assignment quests)
    if (quest.progress >= quest.target && !quest.completed) {
      quest.completed = true;
      newlyCompleted.push(quest);
    }
  }

  if (newlyCompleted.length > 0 || state.quests.some(q => q.progress > 0)) {
    saveQuestState(state);
  }

  return newlyCompleted;
}

/**
 * Record that the player visited/talked to an animal this week.
 * Updates visit_animals quests without incrementing puzzle-count quests.
 */
export function recordAnimalVisit(
  animalId: string,
  currentPhase: number = 0,
  currentStreak?: number
): Quest[] {
  const state = loadWeeklyQuests(currentPhase);
  if (!state.animalsVisitedThisWeek) {
    state.animalsVisitedThisWeek = [];
  }

  const beforeCount = state.animalsVisitedThisWeek.length;
  if (!state.animalsVisitedThisWeek.includes(animalId)) {
    state.animalsVisitedThisWeek.push(animalId);
  }

  const visitedCount = state.animalsVisitedThisWeek.length;
  const newlyCompleted: Quest[] = [];

  for (const quest of state.quests) {
    if (quest.completed) continue;

    if (quest.type === 'visit_animals') {
      quest.progress = Math.min(visitedCount, quest.target);
    } else if (quest.type === 'streak_days' && currentStreak !== undefined) {
      quest.progress = Math.min(currentStreak, quest.target);
    } else {
      continue;
    }

    if (quest.progress >= quest.target && !quest.completed) {
      quest.completed = true;
      newlyCompleted.push(quest);
    }
  }

  if (visitedCount !== beforeCount || newlyCompleted.length > 0) {
    saveQuestState(state);
  }

  return newlyCompleted;
}

/**
 * Get the phase-based reward multiplier for quest rewards.
 * Higher phases = higher quest rewards to maintain quest relevance
 * as base amber income grows with harder puzzles and streaks.
 */
export function getPhaseRewardMultiplier(phase: number): number {
  if (phase >= 4) return 2.0;
  if (phase >= 3) return 1.5;
  if (phase >= 2) return 1.25;
  return 1.0;
}

/**
 * Claim a completed quest reward. Returns the phase-scaled amber amount awarded.
 */
export function claimQuestReward(questId: string, currentPhase: number = 0): { amber: number } | null {
  const state = loadWeeklyQuests();
  const quest = state.quests.find(q => q.id === questId);
  if (!quest || !quest.completed || quest.claimed) return null;

  quest.claimed = true;
  saveQuestState(state);

  const multiplier = getPhaseRewardMultiplier(currentPhase);
  return {
    amber: Math.round(quest.rewardAmber * multiplier),
  };
}

/**
 * Get quest description appropriate for the current phase.
 */
export function getQuestDescription(quest: Quest, phase: number): string {
  if (phase >= 3 && quest.darkDescription) return quest.darkDescription;
  return quest.description;
}

/**
 * Get total unclaimed amber from completed quests (phase-scaled).
 */
export function getUnclaimedAmber(state: WeeklyQuestState, currentPhase: number = 0): number {
  const multiplier = getPhaseRewardMultiplier(currentPhase);
  return state.quests
    .filter(q => q.completed && !q.claimed)
    .reduce((sum, q) => sum + Math.round(q.rewardAmber * multiplier), 0);
}

/**
 * Get time remaining until quest reset (next Monday 00:00 UTC).
 */
export function getTimeUntilReset(): { days: number; hours: number; minutes: number } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilMonday,
    0, 0, 0
  ));
  const msRemaining = nextMonday.getTime() - now.getTime();
  const totalMinutes = Math.floor(msRemaining / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

// ============================================================================
// Internal
// ============================================================================

function saveQuestState(state: WeeklyQuestState): void {
  if (!state.animalsVisitedThisWeek) {
    state.animalsVisitedThisWeek = [];
  }
  questStateCache = state;
  storage.set(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Clear all quest data (for Settings > Reset All).
 */
export function clearWeeklyQuests(): void {
  questStateCache = null;
  storage.remove(STORAGE_KEY);
}
