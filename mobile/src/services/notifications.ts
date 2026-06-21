import AsyncStorage from '@react-native-async-storage/async-storage';
import { DialoguePhase } from '../types/homeWorld';
import { getLocalDateString } from './dateUtils';

/**
 * Push notification scheduling service for WordShift.
 *
 * Schedules local notifications for:
 * - Daily puzzle reminders (morning)
 * - Streak-at-risk reminders (evening of the first missed day, streak >= 2)
 * - Re-engagement after inactivity (1-2 days depending on streak)
 * - Phase-aware animal messages (Phase 3+)
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
  type: 'daily_reminder' | 'reengagement' | 'streak_risk' | 'animal_message';
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

const REENGAGEMENT_MESSAGES: Record<number, string[]> = {
  0: [
    'Ember is wondering where you\'ve been! Come say hi.',
    'Your animal friends miss you! Solve a puzzle today.',
    'The house feels quiet without you. Come back and play!',
  ],
  1: [
    'Your friends have been talking about you...',
    'The house waits. Your friends have new thoughts to share.',
  ],
  2: [
    'The animals have noticed your absence. Come back.',
    'The house is quieter. But the walls still remember.',
  ],
  3: [
    'The animals are... waiting. They need you to continue.',
    'Your absence has been noted. The arrangement pauses.',
  ],
  4: [
    'The keepers await your return. The pattern is incomplete.',
    'The arrangement cannot continue without you.',
  ],
  5: [
    'The house is quiet. The pattern waits, unhurried.',
    'Your friends are at peace. They\'ll be here when you return.',
  ],
};

// {streak} is replaced with the player's current streak length
const STREAK_RISK_MESSAGES: Record<number, string[]> = {
  0: [
    'Your {streak}-day streak is on the line! One quick puzzle keeps it alive.',
    '{streak} days and counting — don\'t break the chain today!',
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
    'The chain rests at {streak} days. It will wait — but not forever.',
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
 * Save notification preferences.
 */
export async function setNotificationPrefs(prefs: Partial<NotificationPreferences>): Promise<void> {
  const current = await getNotificationPrefs();
  const updated = { ...current, ...prefs };
  prefsCache = updated;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // Re-schedule notifications based on new prefs
  await scheduleAllNotifications(0);
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

  // Schedule daily reminder
  if (prefs.dailyReminderEnabled) {
    await scheduleDailyReminder(mod, prefs.dailyReminderHour, currentPhase, playedToday);
  }

  // Re-engagement ladder. Players with an active streak hear about the
  // streak first (tomorrow evening), then standard re-engagement a day
  // later; everyone else gets re-engaged tomorrow. Each app session
  // reschedules, so these only fire on days the player actually missed.
  if (prefs.reengagementEnabled) {
    const streak = await getCurrentStreakSafe();
    // Streak-risk only fires when genuinely at risk: a real streak (>= 2) that
    // hasn't already been kept alive today. If they've played today the chain
    // is safe, so the warning would contradict reality — suppress it.
    const hasStreakRisk = streak >= 2 && !playedToday;
    if (hasStreakRisk) {
      await scheduleStreakRisk(mod, currentPhase, streak);
    }
    await scheduleReengagement(mod, currentPhase, hasStreakRisk ? 2 : 1);
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
 * Get a phase-aware notification message.
 */
export function getNotificationMessage(
  type: 'daily' | 'reengagement',
  phase: number
): string {
  const clampedPhase = Math.min(5, Math.max(0, phase));
  const messages = type === 'daily'
    ? DAILY_REMINDER_MESSAGES[clampedPhase]
    : REENGAGEMENT_MESSAGES[clampedPhase];
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

// ============================================================================
// Internal scheduling
// ============================================================================

/** How many days ahead the daily reminder is pre-armed as one-shots. */
const DAILY_REMINDER_LOOKAHEAD_DAYS = 3;

async function scheduleDailyReminder(
  mod: any,
  hour: number,
  phase: number,
  playedToday: boolean
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

      // Re-roll the phase-aware message per day for variety.
      const message = getNotificationMessage('daily', phase);
      await mod.scheduleNotificationAsync({
        content: {
          title: 'WordShift',
          body: message,
          sound: true,
        },
        trigger: {
          date: triggerDate,
        },
      });
    }
  } catch {}
}

async function scheduleReengagement(
  mod: any,
  phase: number,
  daysFromNow: number
): Promise<void> {
  const message = getNotificationMessage('reengagement', phase);
  try {
    const triggerDate = new Date();
    triggerDate.setDate(triggerDate.getDate() + daysFromNow);
    triggerDate.setHours(18, 0, 0, 0); // 6pm

    await mod.scheduleNotificationAsync({
      content: {
        title: 'WordShift',
        body: message,
        sound: true,
      },
      trigger: {
        date: triggerDate,
      },
    });
  } catch {}
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
