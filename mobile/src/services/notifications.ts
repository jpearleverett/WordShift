import { storage } from './storage';
import { DialoguePhase } from '../types/homeWorld';

/**
 * Push notification scheduling service for WordShift.
 *
 * Schedules local notifications for:
 * - Daily puzzle reminders (morning)
 * - Re-engagement after inactivity (2+ days)
 * - Phase-aware animal messages (Phase 3+)
 *
 * Uses expo-notifications when available, falls back to no-op.
 * All notification logic is self-contained so the rest of the app
 * just calls schedule/cancel functions without worrying about the library.
 */

const STORAGE_KEY = 'wordshift_notification_prefs';

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
  type: 'daily_reminder' | 'reengagement' | 'animal_message';
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

// ============================================================================
// Lazy-loaded expo-notifications module
// ============================================================================

let notificationsModule: any = null;

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

async function requestPermissions(): Promise<boolean> {
  const mod = await getNotificationsModule();
  if (!mod) return false;
  try {
    const { status } = await mod.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load notification preferences from MMKV (synchronous).
 */
export function getNotificationPrefs(): NotificationPreferences {
  const stored = storage.getString(STORAGE_KEY);
  if (stored !== undefined) {
    return JSON.parse(stored);
  }
  return getDefaultPrefs();
}

/**
 * Save notification preferences.
 * Stays async because it re-schedules notifications (expo-notifications is async).
 */
export async function setNotificationPrefs(prefs: Partial<NotificationPreferences>): Promise<void> {
  const current = getNotificationPrefs();
  const updated = { ...current, ...prefs };
  storage.set(STORAGE_KEY, JSON.stringify(updated));

  // Re-schedule notifications based on new prefs
  await scheduleAllNotifications(0);
}

/**
 * Schedule all notifications based on current preferences and phase.
 * Called on app launch and after puzzle completion.
 */
export async function scheduleAllNotifications(currentPhase: number): Promise<void> {
  const prefs = getNotificationPrefs();
  if (!prefs.enabled) {
    await cancelAllNotifications();
    return;
  }

  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  const mod = await getNotificationsModule();
  if (!mod) return;

  // Cancel existing scheduled notifications
  try {
    await mod.cancelAllScheduledNotificationsAsync();
  } catch {}

  // Schedule daily reminder
  if (prefs.dailyReminderEnabled) {
    await scheduleDailyReminder(mod, prefs.dailyReminderHour, currentPhase);
  }

  // Schedule re-engagement (fires after 2 days of inactivity)
  if (prefs.reengagementEnabled) {
    await scheduleReengagement(mod, currentPhase);
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

// ============================================================================
// Internal scheduling
// ============================================================================

async function scheduleDailyReminder(
  mod: any,
  hour: number,
  phase: number
): Promise<void> {
  const message = getNotificationMessage('daily', phase);
  try {
    await mod.scheduleNotificationAsync({
      content: {
        title: 'WordShift',
        body: message,
        sound: true,
      },
      trigger: {
        hour,
        minute: 0,
        repeats: true,
      },
    });
  } catch {}
}

async function scheduleReengagement(
  mod: any,
  phase: number
): Promise<void> {
  const message = getNotificationMessage('reengagement', phase);
  try {
    // Fire 2 days from now
    const triggerDate = new Date();
    triggerDate.setDate(triggerDate.getDate() + 2);
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
 * Reset notification preferences (for Settings > Reset All).
 */
export function resetNotificationPrefs(): void {
  storage.remove(STORAGE_KEY);
}
