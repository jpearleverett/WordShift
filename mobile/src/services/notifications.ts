import AsyncStorage from '@react-native-async-storage/async-storage';
import { DialoguePhase } from '../types/homeWorld';
import { getLocalDateString } from './dateUtils';
import { getWinBackMessage } from './phaseNarrative';

/**
 * Push notification scheduling service for WordShift.
 *
 * Schedules local notifications for:
 * - Daily puzzle reminders (morning, 7-day one-shot ladder; generic come-back
 *   copy routed home while the Daily Challenge is still locked)
 * - Streak-at-risk reminders (evening of the first missed day, streak >= 2, 19:00)
 * - Escalating win-back ladder after inactivity (+1/+3/+7/+14/+30 days, 18:00)
 * - Weekly-quest-expiry nudge (Sunday 17:30, before the local-Monday reset —
 *   staggered off the 18:00 win-back rungs)
 *
 * Every notification carries a content.data.target payload ('daily' | 'home')
 * so a tap can be routed by App.tsx's notification-response listener.
 *
 * Uses expo-notifications when available, falls back to no-op.
 * All notification logic is self-contained so the rest of the app
 * just calls schedule/cancel functions without worrying about the library.
 */

const STORAGE_KEY = 'wordshift_notification_prefs';
const PROMPTED_KEY = 'wordshift_notification_prompted';

// ============================================================================
// Types
// ============================================================================

export interface NotificationPreferences {
  dailyReminderEnabled: boolean;
  dailyReminderHour: number; // 0-23, default 9 (9am)
  reengagementEnabled: boolean;
  enabled: boolean; // Master toggle
}

interface ScheduledNotification {
  id: string;
  type: 'daily_reminder' | 'win_back' | 'streak_risk' | 'animal_message' | 'quest_expiry';
  scheduledAt: number;
}

// ============================================================================
// Notification Content — Phase-aware messages
// ============================================================================

const DAILY_REMINDER_MESSAGES: Record<number, string[]> = {
  0: [
    'Your daily puzzle is ready! Come play with words.',
    'A fresh puzzle awaits. Start your day with WordShift!',
    'The words are waiting for you. Solve today\'s puzzle!',
  ],
  1: [
    'Today\'s puzzle is ready. The words have arranged themselves.',
    'A new arrangement awaits. Have you noticed the patterns?',
  ],
  2: [
    'The daily puzzle awaits. The words remember you.',
    'Another puzzle. Another arrangement. They keep coming.',
  ],
  3: [
    'The daily puzzle is prepared. The letters tremble.',
    'A new arrangement. Something stirs when you solve them.',
  ],
  4: [
    'The daily offering awaits.',
    'The arrangement requires your attention.',
    'The void has prepared today\'s incantation.',
  ],
  5: [
    'The daily puzzle is here. The pattern continues.',
    'Another day, another arrangement. Breathe.',
  ],
};

// Served in place of the daily-puzzle reminder while the Daily Challenge is
// still LOCKED (the permission prompt can fire from the 3rd victory, but the
// daily unlocks later) — generic, in-world come-back copy that never
// advertises content the player can't reach, routed home instead of to the
// daily. Realistically only the early phases are ever seen (phase 1+ unlocks
// the daily on its own), but the table stays fully phase-aware by convention.
const EARLY_REMINDER_MESSAGES: Record<number, string[]> = {
  0: [
    'The animals are wondering where you went. Come shift some letters!',
    'Fresh words are waiting at the house. Come play!',
    'Your friends at the house saved a puzzle for you. Come say hi!',
  ],
  1: [
    'The house is quiet without you. The words have been thinking.',
    'The animals keep glancing at the door. A few new words await.',
  ],
  2: [
    'The house feels emptier when you are away. The words wait.',
    'The animals have questions only the words can answer. Return soon.',
  ],
  3: [
    'The house grows cold. The words have not forgotten you.',
    'Something waits at the house. The letters keep their shape for you.',
  ],
  4: [
    'The arrangement misses your hands.',
    'The house stands ready. The words remember who moves them.',
  ],
  5: [
    'The house rests. The words will be there when you return.',
    'No hurry. The pattern keeps. Come back when you like.',
  ],
};

// Win-back (lapsed-player) copy lives in phaseNarrative.getWinBackMessage —
// phase-aware AND rung-aware (+1/+3/+7 days), escalating in tone.

// {streak} is replaced with the player's current streak length
const STREAK_RISK_MESSAGES: Record<number, string[]> = {
  0: [
    'Your {streak}-day streak is on the line! One quick puzzle keeps it alive.',
    '{streak} days and counting. Don\'t break the chain today!',
  ],
  1: [
    'A {streak}-day pattern. It would be a shame to let it fade.',
    '{streak} days in a row. The words have grown used to you.',
  ],
  2: [
    '{streak} days of arrangements. The chain notices when it thins.',
    'The {streak}-day pattern is incomplete today. The words wait.',
  ],
  3: [
    'The {streak}-day chain trembles. One puzzle steadies it.',
    '{streak} days unbroken. Tonight, the pattern needs you.',
  ],
  4: [
    '{streak} days of offerings. Do not let the chain break now.',
    'The arrangement has counted {streak} days. It is still counting.',
  ],
  5: [
    '{streak} days. The pattern holds, if you wish it to.',
    'The chain rests at {streak} days. It will wait... but not forever.',
  ],
};

// Fires the evening before the weekly quest reset when the player has quest
// progress that would otherwise expire unclaimed. Phase-aware tone.
const QUEST_EXPIRY_MESSAGES: Record<number, string[]> = {
  0: [
    'Your weekly quests reset soon. Finish them before they\'re gone!',
    'Last chance this week! Wrap up your quests for bonus amber.',
  ],
  1: [
    'The week\'s arrangements close soon. A few remain unfinished.',
    'Your weekly quests fade at the turn of the week. Claim what\'s yours.',
  ],
  2: [
    'The week\'s tasks dissolve soon. The unfinished ones simply... vanish.',
    'Loose threads remain in this week\'s pattern. The reset will not wait.',
  ],
  3: [
    'The week closes. What you leave undone will not be offered again.',
    'The quests expire at the turn. The pattern dislikes loose ends.',
  ],
  4: [
    'The week\'s offerings expire soon. Complete them before the reset takes them.',
    'Unfinished work returns to the void at week\'s end. Finish it.',
  ],
  5: [
    'The week turns soon. Tend what remains, if you wish.',
    'A few tasks still wait this week. They will quietly reset, unhurried.',
  ],
};

// ============================================================================
// In-memory cache
// ============================================================================

let prefsCache: NotificationPreferences | null = null;
let promptedCache: boolean | null = null;
let notificationsModule: any = undefined;

function getDefaultPrefs(): NotificationPreferences {
  return {
    dailyReminderEnabled: true,
    dailyReminderHour: 9,
    reengagementEnabled: true,
    enabled: true,
  };
}

// ============================================================================
// Expo Notifications Integration (lazy-loaded)
// ============================================================================

async function getNotificationsModule(): Promise<any> {
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    notificationsModule = require('expo-notifications');
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return null;
  }
}

/**
 * Check the current OS notification permission status WITHOUT prompting.
 * Returns 'undetermined' if the module is missing or the check fails.
 */
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const mod = await getNotificationsModule();
  if (!mod) return 'undetermined';
  try {
    const { status } = await mod.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'undetermined';
  }
}

/**
 * Request notification permission from the OS.
 * This is the ONLY function that triggers the system permission dialog —
 * call it from an in-app contextual prompt, never at cold launch.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const mod = await getNotificationsModule();
  if (!mod) return false;
  try {
    const { status } = await mod.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Whether the in-app notification pre-permission prompt has been shown.
 */
export async function hasPromptedForNotifications(): Promise<boolean> {
  if (promptedCache !== null) return promptedCache;
  try {
    const stored = await AsyncStorage.getItem(PROMPTED_KEY);
    promptedCache = stored === 'true';
  } catch {
    promptedCache = false;
  }
  return promptedCache;
}

/**
 * Mark the in-app notification pre-permission prompt as shown (one-time).
 */
export async function markPromptedForNotifications(): Promise<void> {
  promptedCache = true;
  try {
    await AsyncStorage.setItem(PROMPTED_KEY, 'true');
  } catch {}
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load notification preferences from storage.
 */
export async function getNotificationPrefs(): Promise<NotificationPreferences> {
  if (prefsCache) return prefsCache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      prefsCache = JSON.parse(stored);
      return prefsCache!;
    }
  } catch {}
  prefsCache = getDefaultPrefs();
  return prefsCache;
}

/**
 * Save notification preferences and re-schedule with the caller's current
 * narrative phase (so a Phase 3-4 player toggling reminders in Settings never
 * re-arms the ladder with bright Phase-0 copy).
 */
export async function setNotificationPrefs(
  prefs: Partial<NotificationPreferences>,
  currentPhase: number
): Promise<void> {
  const current = await getNotificationPrefs();
  const updated = { ...current, ...prefs };
  prefsCache = updated;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // Re-schedule notifications based on new prefs, phase-aware.
  await scheduleAllNotifications(currentPhase);
}

/**
 * Schedule all notifications based on current preferences and phase.
 * Called on app launch and after puzzle completion.
 */
export async function scheduleAllNotifications(currentPhase: number): Promise<void> {
  const prefs = await getNotificationPrefs();
  if (!prefs.enabled) {
    await cancelAllNotifications();
    return;
  }

  // Only schedule if permission was already granted — never prompt from here.
  const permissionStatus = await getNotificationPermissionStatus();
  if (permissionStatus !== 'granted') return;

  const mod = await getNotificationsModule();
  if (!mod) return;

  // Cancel existing scheduled notifications
  try {
    await mod.cancelAllScheduledNotificationsAsync();
  } catch {}

  // Whether the player has already engaged today — drives same-day suppression
  // so a daily player never gets a redundant "your puzzle is ready" ping.
  const playedToday = await hasPlayedTodaySafe();

  // Schedule daily reminder. While the Daily Challenge is still locked (the
  // permission prompt can fire from the 3rd victory; the daily unlocks at 8
  // puzzles / Phase 1) the ladder still arms, but with generic come-back copy
  // routed home — never "your daily puzzle is ready" for content the player
  // can't reach yet.
  if (prefs.dailyReminderEnabled) {
    const dailyUnlocked = await isDailyChallengeUnlockedSafe(currentPhase);
    await scheduleDailyReminder(mod, prefs.dailyReminderHour, currentPhase, playedToday, dailyUnlocked);
  }

  // Win-back ladder. Players with an active streak hear about the streak
  // first (this/next evening), then the win-back ladder starts a day later;
  // everyone else starts the ladder tomorrow. Rungs escalate per
  // WIN_BACK_RUNG_OFFSETS (+1/+3/+7/+14/+30 days). Each app session
  // reschedules, so these only fire on days the player actually missed — an
  // active player never sees a win-back.
  if (prefs.reengagementEnabled) {
    const streak = await getCurrentStreakSafe();
    // Streak-risk only fires when genuinely at risk: a real streak (>= 2) that
    // hasn't already been kept alive today. If they've played today the chain
    // is safe, so the warning would contradict reality — suppress it.
    const hasStreakRisk = streak >= 2 && !playedToday;
    if (hasStreakRisk) {
      await scheduleStreakRisk(mod, currentPhase, streak);
    }
    // A finished-story player gets the special tail copy on the +14/+30 rungs.
    let finishedStory = false;
    try {
      const { isPostRevelation } = require('./amberCurrency');
      finishedStory = await isPostRevelation();
    } catch {}
    await scheduleWinBackLadder(mod, currentPhase, hasStreakRisk ? 2 : 1, finishedStory);

    // Weekly-quest-expiry nudge: the evening before the weekly reset, but only
    // when the player has quests in flight (progress made, or completed-but-
    // unclaimed amber waiting). Players who never touch quests are not nagged.
    if (await shouldRemindQuestExpirySafe(currentPhase)) {
      await scheduleQuestExpiry(mod, currentPhase);
    }
  }
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  const mod = await getNotificationsModule();
  if (!mod) return;
  try {
    await mod.cancelAllScheduledNotificationsAsync();
  } catch {}
}

/**
 * Get a phase-aware daily-reminder message. Win-back copy comes from
 * phaseNarrative.getWinBackMessage (phase- and rung-aware).
 */
export function getNotificationMessage(
  type: 'daily',
  phase: number
): string {
  const clampedPhase = Math.min(5, Math.max(0, phase));
  const messages = DAILY_REMINDER_MESSAGES[clampedPhase];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get a phase-aware streak-at-risk message with the streak length filled in.
 */
export function getStreakRiskMessage(phase: number, streak: number): string {
  const clampedPhase = Math.min(5, Math.max(0, phase));
  const messages = STREAK_RISK_MESSAGES[clampedPhase];
  const template = messages[Math.floor(Math.random() * messages.length)];
  return template.replace(/\{streak\}/g, String(streak));
}

/**
 * Get a phase-aware weekly-quest-expiry message.
 */
export function getQuestExpiryMessage(phase: number): string {
  const clampedPhase = Math.min(5, Math.max(0, phase));
  const messages = QUEST_EXPIRY_MESSAGES[clampedPhase];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get a phase-aware generic come-back message. Used for the morning reminder
 * ladder while the Daily Challenge is still locked, so an early player is
 * invited back to the house instead of to a daily they can't open yet.
 */
export function getEarlyReminderMessage(phase: number): string {
  const clampedPhase = Math.min(5, Math.max(0, phase));
  const messages = EARLY_REMINDER_MESSAGES[clampedPhase];
  return messages[Math.floor(Math.random() * messages.length)];
}

// ============================================================================
// Internal scheduling
// ============================================================================

/** How many days ahead the daily reminder is pre-armed as one-shots. */
const DAILY_REMINDER_LOOKAHEAD_DAYS = 7;

/**
 * Days-from-reschedule offsets for the escalating win-back ladder. Rung 1
 * shifts to +2 for streak holders (the streak-risk ping leads the ladder).
 */
const WIN_BACK_RUNG_OFFSETS: [number, number, number, number, number] = [1, 3, 7, 14, 30];

/**
 * How long before the local-Monday weekly quest reset the expiry nudge fires.
 * 6.5 hours = Sunday 17:30 — deliberately staggered off the 18:00 win-back
 * rungs so a lapsed player with expiring quests never gets two pings in the
 * same minute. (Streak-risk stays at 19:00.)
 */
const QUEST_EXPIRY_LEAD_MS = 6.5 * 60 * 60 * 1000;

async function scheduleDailyReminder(
  mod: any,
  hour: number,
  phase: number,
  playedToday: boolean,
  dailyUnlocked: boolean
): Promise<void> {
  try {
    // Strategy: instead of one unconditional REPEATING daily trigger (which pings
    // EVERY morning, even right after the player played — a known uninstall driver),
    // schedule a small ladder of non-repeating dated one-shots for the next few days
    // at the reminder hour. We deliberately SKIP today's reminder when the player has
    // already engaged today, so a daily player never gets a redundant "your puzzle is
    // ready" ping for a day they've already completed.
    //
    // scheduleAllNotifications runs every session and cancels+reschedules everything,
    // so the ladder keeps re-arming and stays fresh. Pre-arming a few days ahead
    // preserves the "never lapses for players who don't relaunch" intent as well as
    // non-repeating triggers allow — a player who goes dark for a day or two still
    // gets the morning ping (future days can't be known-played, so they're always
    // armed; only TODAY is suppressed once already played).
    const now = new Date();
    // Skip today's reminder entirely if the player already engaged today;
    // otherwise arm it (the in-loop past-time guard drops it if the hour passed).
    const startOffset = playedToday ? 1 : 0;
    for (let dayOffset = startOffset; dayOffset <= DAILY_REMINDER_LOOKAHEAD_DAYS; dayOffset++) {
      const triggerDate = new Date();
      triggerDate.setDate(triggerDate.getDate() + dayOffset);
      triggerDate.setHours(hour, 0, 0, 0);

      // Never schedule a trigger in the past (e.g. dayOffset 0 with hour already passed).
      if (triggerDate.getTime() <= now.getTime()) continue;

      // Re-roll the phase-aware message per day for variety. While the Daily
      // Challenge is locked, serve generic come-back copy routed home instead
      // of advertising a daily the player can't open yet.
      const message = dailyUnlocked
        ? getNotificationMessage('daily', phase)
        : getEarlyReminderMessage(phase);
      await mod.scheduleNotificationAsync({
        content: {
          title: 'WordShift',
          body: message,
          sound: true,
          data: { target: dailyUnlocked ? 'daily' : 'home' },
        },
        trigger: {
          date: triggerDate,
        },
      });
    }
  } catch {}
}

/**
 * Escalating win-back ladder for lapsed players: 6pm one-shots at +1, +3 and
 * +7 days after the reschedule (rung 1 shifts to firstRungDays for streak
 * holders, whose streak-risk ping leads the ladder). Every session cancels and
 * reschedules everything, so active players never see a rung fire — each rung
 * only lands on a day the player genuinely hasn't launched by then.
 */
async function scheduleWinBackLadder(
  mod: any,
  phase: number,
  firstRungDays: number,
  finished = false
): Promise<void> {
  // Extended past the old +7 cliff to +14 and +30 so a lapsed player is never
  // permanently abandoned; a finished-story player gets special tail copy.
  const rungs: { rung: 1 | 2 | 3 | 4 | 5; daysFromNow: number }[] = [
    { rung: 1, daysFromNow: firstRungDays },
    { rung: 2, daysFromNow: WIN_BACK_RUNG_OFFSETS[1] },
    { rung: 3, daysFromNow: WIN_BACK_RUNG_OFFSETS[2] },
    { rung: 4, daysFromNow: WIN_BACK_RUNG_OFFSETS[3] },
    { rung: 5, daysFromNow: WIN_BACK_RUNG_OFFSETS[4] },
  ];
  for (const { rung, daysFromNow } of rungs) {
    try {
      const triggerDate = new Date();
      triggerDate.setDate(triggerDate.getDate() + daysFromNow);
      triggerDate.setHours(18, 0, 0, 0); // 6pm

      await mod.scheduleNotificationAsync({
        content: {
          title: 'WordShift',
          body: getWinBackMessage(phase, rung, finished),
          sound: true,
          data: { target: 'home' },
        },
        trigger: {
          date: triggerDate,
        },
      });
    } catch {}
  }
}

/**
 * Read the current streak without creating a static import cycle —
 * amberCurrency is only needed here, at schedule time.
 */
async function getCurrentStreakSafe(): Promise<number> {
  try {
    const { getFullProgress } = require('./amberCurrency');
    const progress = await getFullProgress();
    return progress?.currentStreak ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Whether the player has already engaged today (local calendar day). Used to
 * suppress redundant reminders for a day they've already played — the daily
 * reminder and streak-risk pings should never fire on a day the player has
 * already completed a puzzle. Reads lastPlayDate via the same lazy require seam
 * as getCurrentStreakSafe to avoid a static import cycle.
 */
async function hasPlayedTodaySafe(): Promise<boolean> {
  try {
    const { getFullProgress } = require('./amberCurrency');
    const progress = await getFullProgress();
    const lastPlay: string | null = progress?.lastPlayDate ?? null;
    return !!lastPlay && lastPlay === getLocalDateString();
  } catch {
    return false;
  }
}

/**
 * Whether the Daily Challenge is unlocked for this player. Uses the canonical
 * check from dailyChallenge.ts (puzzle count OR phase) fed by the same
 * progress read as the other seams here. Lazy require — not for a cycle
 * (dailyChallenge never imports notifications) but because a static import
 * would drag localGenerator + the full dictionary into this module's graph.
 * On failure, falls back to the phase half of the same check (phase 1+ always
 * unlocks the daily), so an unreadable early save gets the safe generic copy
 * rather than an ad for locked content.
 */
async function isDailyChallengeUnlockedSafe(currentPhase: number): Promise<boolean> {
  try {
    const { isDailyChallengeUnlocked } = require('./dailyChallenge');
    const { getFullProgress } = require('./amberCurrency');
    const progress = await getFullProgress();
    return isDailyChallengeUnlocked(progress?.puzzlesSolved ?? 0, currentPhase);
  } catch {
    return currentPhase >= 1;
  }
}

/**
 * Whether a weekly-quest-expiry reminder is worth scheduling. True only when the
 * player has skin in the game this week — an in-progress (but not completed)
 * weekly quest, or a completed-but-unclaimed reward. Read via a lazy require so
 * notifications never form a static import cycle with the quest service.
 */
async function shouldRemindQuestExpirySafe(phase: number): Promise<boolean> {
  try {
    // peek, never load: loadWeeklyQuests GENERATES a quest set when none is
    // stored, and this check runs during hydration — on a fresh install it
    // could win the race against the first context-full load and mint quests
    // from legacy defaults (defeating the pre-journal dormant gate).
    const { peekWeeklyQuests, getUnclaimedAmber } = require('./weeklyQuests');
    const peeked = await peekWeeklyQuests();
    if (!peeked.daily && !peeked.weekly) return false;
    // getUnclaimedAmber reads state.daily.quests / state.weekly.quests directly,
    // so substitute empty tiers for any missing period rather than null.
    const emptyTier = { periodId: '', quests: [], generatedAt: 0, animalsVisitedThisPeriod: [] };
    const state = {
      daily: peeked.daily ?? emptyTier,
      weekly: peeked.weekly ?? emptyTier,
    };
    if (getUnclaimedAmber(state, phase) > 0) return true;
    return (peeked.weekly?.quests ?? []).some(
      (q: { progress: number; completed: boolean }) => q.progress > 0 && !q.completed
    );
  } catch {
    return false;
  }
}

async function scheduleQuestExpiry(mod: any, phase: number): Promise<void> {
  const message = getQuestExpiryMessage(phase);
  try {
    // Weekly quests reset at the local-Monday boundary. Fire the reminder the
    // evening before (Sunday 17:30). Rescheduled every session, so it always
    // points at the upcoming reset and drops once the player finishes/claims.
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday ... 1 = Monday
    let daysUntilMonday = (1 - day + 7) % 7;
    if (daysUntilMonday === 0) daysUntilMonday = 7; // today is Monday → next week
    const nextMonday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysUntilMonday,
      0, 0, 0, 0
    );
    // 6.5 hours before the reset = Sunday 17:30 local — staggered off the
    // 18:00 win-back rungs so both can never land in the same minute.
    const triggerDate = new Date(nextMonday.getTime() - QUEST_EXPIRY_LEAD_MS);
    if (triggerDate.getTime() <= now.getTime()) return; // window already passed this week

    await mod.scheduleNotificationAsync({
      content: {
        title: 'WordShift',
        body: message,
        sound: true,
        data: { target: 'home' },
      },
      trigger: {
        date: triggerDate,
      },
    });
  } catch {}
}

async function scheduleStreakRisk(
  mod: any,
  phase: number,
  streak: number
): Promise<void> {
  const message = getStreakRiskMessage(phase, streak);
  try {
    // This only runs when the player has NOT played today (gated in
    // scheduleAllNotifications), so the streak is genuinely at risk THIS
    // evening — target today's 7pm if it hasn't passed yet, otherwise the
    // next evening. Rescheduled forward every session, so it only ever fires
    // on a day the player still hasn't played by then; the moment they play,
    // the next session's reschedule drops this notification entirely.
    const now = new Date();
    const triggerDate = new Date();
    triggerDate.setHours(19, 0, 0, 0); // 7pm today
    if (triggerDate.getTime() <= now.getTime()) {
      triggerDate.setDate(triggerDate.getDate() + 1); // 7pm already passed → tomorrow
    }

    await mod.scheduleNotificationAsync({
      content: {
        title: 'WordShift',
        body: message,
        sound: true,
        data: { target: 'daily' },
      },
      trigger: {
        date: triggerDate,
      },
    });
  } catch {}
}

/**
 * Reset notification preferences (for Settings > Reset All).
 */
export async function resetNotificationPrefs(): Promise<void> {
  prefsCache = null;
  promptedCache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(PROMPTED_KEY);
  } catch {}
}
