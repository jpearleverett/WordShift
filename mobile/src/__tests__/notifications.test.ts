import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getNotificationPrefs,
  setNotificationPrefs,
  getNotificationMessage,
  getStreakRiskMessage,
  getQuestExpiryMessage,
  resetNotificationPrefs,
  scheduleAllNotifications,
  cancelAllNotifications,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  hasPromptedForNotifications,
  markPromptedForNotifications,
  NotificationPreferences,
} from '../services/notifications';

// Mock AsyncStorage using shared factory
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

// Mock expo-notifications as unavailable (no-op behavior)
jest.mock('expo-notifications', () => {
  throw new Error('Module not found');
}, { virtual: true });

describe('notifications', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await resetNotificationPrefs();
  });

  // ===========================================================================
  // getNotificationPrefs
  // ===========================================================================

  describe('getNotificationPrefs', () => {
    it('returns default preferences when none stored', async () => {
      const prefs = await getNotificationPrefs();
      expect(prefs.enabled).toBe(true);
      expect(prefs.dailyReminderEnabled).toBe(true);
      expect(prefs.dailyReminderHour).toBe(9);
      expect(prefs.reengagementEnabled).toBe(true);
    });

    it('returns cached preferences on subsequent calls', async () => {
      const prefs1 = await getNotificationPrefs();
      const prefs2 = await getNotificationPrefs();
      expect(prefs1).toBe(prefs2);
    });

    it('loads from storage after cache clear', async () => {
      const saved: NotificationPreferences = {
        enabled: false,
        dailyReminderEnabled: false,
        dailyReminderHour: 20,
        reengagementEnabled: false,
      };
      // Clear cache first, then set storage so it persists
      await resetNotificationPrefs();
      await AsyncStorage.setItem('wordshift_notification_prefs', JSON.stringify(saved));

      const prefs = await getNotificationPrefs();
      expect(prefs.enabled).toBe(false);
      expect(prefs.dailyReminderHour).toBe(20);
      expect(prefs.dailyReminderEnabled).toBe(false);
      expect(prefs.reengagementEnabled).toBe(false);
    });

    it('has all required fields in default prefs', async () => {
      const prefs = await getNotificationPrefs();
      expect(typeof prefs.enabled).toBe('boolean');
      expect(typeof prefs.dailyReminderEnabled).toBe('boolean');
      expect(typeof prefs.dailyReminderHour).toBe('number');
      expect(typeof prefs.reengagementEnabled).toBe('boolean');
    });
  });

  // ===========================================================================
  // setNotificationPrefs
  // ===========================================================================

  describe('setNotificationPrefs', () => {
    it('merges partial prefs with defaults', async () => {
      await setNotificationPrefs({ dailyReminderHour: 10 });
      const prefs = await getNotificationPrefs();
      expect(prefs.dailyReminderHour).toBe(10);
      expect(prefs.enabled).toBe(true); // default preserved
      expect(prefs.dailyReminderEnabled).toBe(true);
    });

    it('can disable master toggle', async () => {
      await setNotificationPrefs({ enabled: false });
      const prefs = await getNotificationPrefs();
      expect(prefs.enabled).toBe(false);
    });

    it('can disable daily reminders', async () => {
      await setNotificationPrefs({ dailyReminderEnabled: false });
      const prefs = await getNotificationPrefs();
      expect(prefs.dailyReminderEnabled).toBe(false);
    });

    it('can disable reengagement', async () => {
      await setNotificationPrefs({ reengagementEnabled: false });
      const prefs = await getNotificationPrefs();
      expect(prefs.reengagementEnabled).toBe(false);
    });

    it('can set custom reminder hour', async () => {
      await setNotificationPrefs({ dailyReminderHour: 22 });
      const prefs = await getNotificationPrefs();
      expect(prefs.dailyReminderHour).toBe(22);
    });

    it('persists to storage', async () => {
      await setNotificationPrefs({ dailyReminderHour: 15 });
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('overwrites previous prefs', async () => {
      await setNotificationPrefs({ dailyReminderHour: 10 });
      await setNotificationPrefs({ dailyReminderHour: 14 });
      const prefs = await getNotificationPrefs();
      expect(prefs.dailyReminderHour).toBe(14);
    });

    it('updates multiple prefs simultaneously', async () => {
      await setNotificationPrefs({
        dailyReminderEnabled: false,
        reengagementEnabled: false,
        dailyReminderHour: 7,
      });
      const prefs = await getNotificationPrefs();
      expect(prefs.dailyReminderEnabled).toBe(false);
      expect(prefs.reengagementEnabled).toBe(false);
      expect(prefs.dailyReminderHour).toBe(7);
      expect(prefs.enabled).toBe(true); // not changed
    });
  });

  // ===========================================================================
  // getNotificationMessage
  // ===========================================================================

  describe('getNotificationMessage', () => {
    it('returns a string for daily type at each phase', () => {
      for (let phase = 0; phase <= 4; phase++) {
        const message = getNotificationMessage('daily', phase);
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }
    });

    it('clamps phase to valid range (no error for out-of-bounds)', () => {
      expect(() => getNotificationMessage('daily', -1)).not.toThrow();
      expect(() => getNotificationMessage('daily', 10)).not.toThrow();
    });

    it('streak risk messages include the streak length at each phase', () => {
      for (let phase = 0; phase <= 5; phase++) {
        const message = getStreakRiskMessage(phase, 7);
        expect(typeof message).toBe('string');
        expect(message).toContain('7');
        expect(message).not.toContain('{streak}');
      }
    });

    it('streak risk message clamps out-of-bounds phases', () => {
      expect(() => getStreakRiskMessage(-1, 3)).not.toThrow();
      expect(() => getStreakRiskMessage(99, 3)).not.toThrow();
    });

    it('returns a non-empty quest-expiry message at each phase', () => {
      for (let phase = 0; phase <= 5; phase++) {
        const message = getQuestExpiryMessage(phase);
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }
    });

    it('quest-expiry message clamps out-of-bounds phases', () => {
      expect(() => getQuestExpiryMessage(-1)).not.toThrow();
      expect(() => getQuestExpiryMessage(99)).not.toThrow();
    });

    it('returns valid messages for clamped negative phase', () => {
      const msg = getNotificationMessage('daily', -1);
      expect(msg.length).toBeGreaterThan(0);
    });

    it('returns valid messages for clamped high phase', () => {
      const msg = getNotificationMessage('daily', 10);
      expect(msg.length).toBeGreaterThan(0);
    });

    it('phase 0 daily messages are friendly/upbeat', () => {
      // Test many times since messages are random
      for (let i = 0; i < 20; i++) {
        const message = getNotificationMessage('daily', 0);
        expect(message).not.toContain('void');
        expect(message).not.toContain('arrangement');
        expect(message).not.toContain('offering');
      }
    });

    it('phase 4 daily messages reference dark themes', () => {
      let foundDark = false;
      for (let i = 0; i < 30; i++) {
        const daily = getNotificationMessage('daily', 4);
        if (daily.includes('offering') || daily.includes('arrangement') || daily.includes('void') || daily.includes('incantation')) {
          foundDark = true;
          break;
        }
      }
      expect(foundDark).toBe(true);
    });

    it('phase 1 messages hint at patterns', () => {
      let foundCurious = false;
      for (let i = 0; i < 30; i++) {
        const message = getNotificationMessage('daily', 1);
        if (message.includes('arranged') || message.includes('patterns')) {
          foundCurious = true;
          break;
        }
      }
      expect(foundCurious).toBe(true);
    });

    it('phase 2 daily messages reference memory/remembering', () => {
      let found = false;
      for (let i = 0; i < 30; i++) {
        const message = getNotificationMessage('daily', 2);
        if (message.includes('remember') || message.includes('arrangement') || message.includes('coming')) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });

    it('phase 3 daily messages have dread', () => {
      let found = false;
      for (let i = 0; i < 30; i++) {
        const message = getNotificationMessage('daily', 3);
        if (message.includes('tremble') || message.includes('stirs') || message.includes('prepared')) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });

  });

  // ===========================================================================
  // scheduleAllNotifications
  // ===========================================================================

  describe('scheduleAllNotifications', () => {
    it('does not throw when expo-notifications is unavailable', async () => {
      await expect(scheduleAllNotifications(0)).resolves.not.toThrow();
    });

    it('respects disabled master toggle', async () => {
      await setNotificationPrefs({ enabled: false });
      // Should not throw even if module missing
      await expect(scheduleAllNotifications(0)).resolves.not.toThrow();
    });

    it('works with different phase values', async () => {
      for (let phase = 0; phase <= 4; phase++) {
        await expect(scheduleAllNotifications(phase)).resolves.not.toThrow();
      }
    });
  });

  // ===========================================================================
  // Permission status & prompt flag
  // ===========================================================================

  describe('getNotificationPermissionStatus', () => {
    it('returns undetermined when expo-notifications is unavailable', async () => {
      expect(await getNotificationPermissionStatus()).toBe('undetermined');
    });
  });

  describe('requestNotificationPermission', () => {
    it('returns false when expo-notifications is unavailable', async () => {
      expect(await requestNotificationPermission()).toBe(false);
    });
  });

  describe('prompted-for-notifications flag', () => {
    it('defaults to false', async () => {
      expect(await hasPromptedForNotifications()).toBe(false);
    });

    it('round-trips after marking', async () => {
      await markPromptedForNotifications();
      expect(await hasPromptedForNotifications()).toBe(true);
    });

    it('persists to storage', async () => {
      await markPromptedForNotifications();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('wordshift_notification_prompted', 'true');
    });

    it('is cleared by resetNotificationPrefs', async () => {
      await markPromptedForNotifications();
      await resetNotificationPrefs();
      expect(await hasPromptedForNotifications()).toBe(false);
    });
  });

  // ===========================================================================
  // cancelAllNotifications
  // ===========================================================================

  describe('cancelAllNotifications', () => {
    it('does not throw when expo-notifications is unavailable', async () => {
      await expect(cancelAllNotifications()).resolves.not.toThrow();
    });
  });

  // ===========================================================================
  // resetNotificationPrefs
  // ===========================================================================

  describe('resetNotificationPrefs', () => {
    it('clears stored preferences', async () => {
      await setNotificationPrefs({ enabled: false, dailyReminderHour: 22 });
      await resetNotificationPrefs();
      const prefs = await getNotificationPrefs();
      expect(prefs.enabled).toBe(true);
      expect(prefs.dailyReminderHour).toBe(9);
    });

    it('calls AsyncStorage.removeItem', async () => {
      await resetNotificationPrefs();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('wordshift_notification_prefs');
    });

    it('resets all fields to defaults', async () => {
      await setNotificationPrefs({
        enabled: false,
        dailyReminderEnabled: false,
        dailyReminderHour: 23,
        reengagementEnabled: false,
      });
      await resetNotificationPrefs();

      const prefs = await getNotificationPrefs();
      expect(prefs.enabled).toBe(true);
      expect(prefs.dailyReminderEnabled).toBe(true);
      expect(prefs.dailyReminderHour).toBe(9);
      expect(prefs.reengagementEnabled).toBe(true);
    });
  });

  // ===========================================================================
  // Permission flow with a working expo-notifications module
  // ===========================================================================
  // These tests re-require the service with a functional expo-notifications
  // mock (the top-level mock throws to simulate the module being missing).
  // Re-requiring also resets the service's lazy module cache.

  describe('permission flow (expo-notifications available)', () => {
    function createExpoMock(status: string) {
      return {
        getPermissionsAsync: jest.fn(() => Promise.resolve({ status })),
        requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
        cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
        scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
      };
    }

    let expoMock: ReturnType<typeof createExpoMock>;

    function loadWithStatus(status: string): typeof import('../services/notifications') {
      expoMock = createExpoMock(status);
      jest.resetModules();
      jest.doMock('expo-notifications', () => expoMock, { virtual: true });
      return require('../services/notifications');
    }

    afterEach(() => {
      jest.dontMock('expo-notifications');
      jest.resetModules();
    });

    it('scheduleAllNotifications schedules when permission already granted', async () => {
      const svc = loadWithStatus('granted');
      await svc.scheduleAllNotifications(0);
      expect(expoMock.getPermissionsAsync).toHaveBeenCalled();
      expect(expoMock.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it('scheduleAllNotifications never calls requestPermissionsAsync', async () => {
      const svc = loadWithStatus('granted');
      await svc.scheduleAllNotifications(0);
      expect(expoMock.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('scheduleAllNotifications does not schedule when permission denied', async () => {
      const svc = loadWithStatus('denied');
      await svc.scheduleAllNotifications(0);
      expect(expoMock.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(expoMock.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('scheduleAllNotifications does not schedule when permission undetermined', async () => {
      const svc = loadWithStatus('undetermined');
      await svc.scheduleAllNotifications(0);
      expect(expoMock.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(expoMock.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('getNotificationPermissionStatus reports OS status without requesting', async () => {
      const svc = loadWithStatus('denied');
      expect(await svc.getNotificationPermissionStatus()).toBe('denied');
      expect(expoMock.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requestNotificationPermission calls requestPermissionsAsync', async () => {
      const svc = loadWithStatus('undetermined');
      const granted = await svc.requestNotificationPermission();
      expect(granted).toBe(true);
      expect(expoMock.requestPermissionsAsync).toHaveBeenCalled();
    });

    // Classify scheduled notifications by their trigger HOUR. Daily reminders
    // fire at the configured reminder hour (default 9), win-back rungs at
    // 18:00, streak-risk at 19:00. This is more robust than fixed call
    // counts/indices now that both ladders pre-arm multiple one-shots.
    function scheduledTriggers(): { hour: number; date: Date; body: string; data: any }[] {
      return (expoMock.scheduleNotificationAsync.mock.calls as any[][]).map((c) => {
        const arg = c[0];
        const date: Date = arg.trigger.date;
        return { hour: date.getHours(), date, body: arg.content.body as string, data: arg.content.data };
      });
    }

    function expectedDayOfMonth(daysFromNow: number): number {
      const d = new Date();
      d.setDate(d.getDate() + daysFromNow);
      return d.getDate();
    }

    it('schedules a 7-day daily reminder ladder + the +1/+3/+7/+14/+30 win-back ladder when there is no streak', async () => {
      const svc = loadWithStatus('granted');
      await svc.scheduleAllNotifications(0);

      const triggers = scheduledTriggers();
      // Daily reminders fire at hour 9 (the default reminder hour). The ladder
      // is pre-armed a full week ahead (7 future days; today's rung is included
      // only if 9am hasn't passed yet).
      const daily = triggers.filter((t) => t.hour === 9);
      expect(daily.length).toBeGreaterThanOrEqual(7);
      expect(daily.length).toBeLessThanOrEqual(8);

      // Win-back rungs are the 18:00 pings. No streak ⇒ no 19:00 streak-risk.
      const winBack = triggers.filter((t) => t.hour === 18);
      const streakRisk = triggers.filter((t) => t.hour === 19);
      expect(winBack.length).toBe(5);
      expect(streakRisk.length).toBe(0);

      // Rungs are scheduled in order: +1, +3, +7, +14, +30 days (the tail rungs
      // extend past the old 7-day silence cliff).
      expect(winBack.map((t) => t.date.getDate())).toEqual([
        expectedDayOfMonth(1),
        expectedDayOfMonth(3),
        expectedDayOfMonth(7),
        expectedDayOfMonth(14),
        expectedDayOfMonth(30),
      ]);
    });

    it('win-back rungs carry phase-and-rung-aware escalating copy', async () => {
      const svc = loadWithStatus('granted');
      await svc.scheduleAllNotifications(4);

      const { getWinBackMessage } = require('../services/phaseNarrative');
      const winBack = scheduledTriggers().filter((t) => t.hour === 18);
      expect(winBack.map((t) => t.body)).toEqual([
        getWinBackMessage(4, 1),
        getWinBackMessage(4, 2),
        getWinBackMessage(4, 3),
        getWinBackMessage(4, 4),
        getWinBackMessage(4, 5),
      ]);
      // Rung 1 at Phase 4 is the reverent register.
      expect(winBack[0].body).toContain('arrangement is incomplete');
    });

    it('every scheduled notification carries a tap-routing data payload', async () => {
      const svc = loadWithStatus('granted');
      await svc.scheduleAllNotifications(0);

      const triggers = scheduledTriggers();
      expect(triggers.length).toBeGreaterThan(0);
      for (const t of triggers) {
        expect(t.data).toBeDefined();
        expect(['daily', 'home']).toContain(t.data.target);
      }
      // Daily reminders route to the daily challenge; win-backs route home.
      triggers.filter((t) => t.hour === 9).forEach((t) => expect(t.data).toEqual({ target: 'daily' }));
      triggers.filter((t) => t.hour === 18).forEach((t) => expect(t.data).toEqual({ target: 'home' }));
    });

    it('quest-expiry ping is scheduled with a home-routing payload when quests are in flight', async () => {
      expoMock = createExpoMock('granted');
      jest.resetModules();
      jest.doMock('expo-notifications', () => expoMock, { virtual: true });
      jest.doMock('../services/weeklyQuests', () => ({
        loadWeeklyQuests: jest.fn(() => Promise.resolve({ weekly: { quests: [] } })),
        getUnclaimedAmber: jest.fn(() => 40), // unclaimed reward ⇒ remind
      }));
      const svc = require('../services/notifications');

      await svc.scheduleAllNotifications(2);

      // The quest ping targets the upcoming Sunday 18:00; if that window has
      // already passed this week (test running Sunday evening), it is skipped.
      const now = new Date();
      let daysUntilMonday = (1 - now.getDay() + 7) % 7;
      if (daysUntilMonday === 0) daysUntilMonday = 7;
      const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilMonday);
      const questTrigger = new Date(nextMonday.getTime() - 6 * 60 * 60 * 1000);
      const questEligible = questTrigger.getTime() > now.getTime();

      // 18:00 pings = 5 win-back rungs + the quest-expiry ping (when eligible).
      const evening = scheduledTriggers().filter((t) => t.hour === 18);
      expect(evening.length).toBe(questEligible ? 6 : 5);
      evening.forEach((t) => expect(t.data).toEqual({ target: 'home' }));

      jest.dontMock('../services/weeklyQuests');
    });

    it('does not schedule a daily reminder to fire on an already-played day', async () => {
      expoMock = createExpoMock('granted');
      jest.resetModules();
      jest.doMock('expo-notifications', () => expoMock, { virtual: true });
      const { getLocalDateString } = require('../services/dateUtils');
      jest.doMock('../services/amberCurrency', () => ({
        // Played TODAY (local day), no streak.
        getFullProgress: jest.fn(() =>
          Promise.resolve({ currentStreak: 0, lastPlayDate: getLocalDateString() })
        ),
      }));
      const svc = require('../services/notifications');

      await svc.scheduleAllNotifications(0);

      const today = new Date().getDate();
      const dailyToday = (expoMock.scheduleNotificationAsync.mock.calls as any[][])
        .map((c) => c[0])
        .filter((arg) => arg.trigger.date.getHours() === 9 && arg.trigger.date.getDate() === today);
      // Today's reminder is suppressed because the player already engaged today.
      expect(dailyToday.length).toBe(0);
      // But future days are still pre-armed.
      const dailyFuture = (expoMock.scheduleNotificationAsync.mock.calls as any[][])
        .map((c) => c[0])
        .filter((arg) => arg.trigger.date.getHours() === 9 && arg.trigger.date.getDate() !== today);
      expect(dailyFuture.length).toBeGreaterThan(0);

      jest.dontMock('../services/amberCurrency');
    });

    it('schedules streak-risk and defers the first win-back rung when a streak is active and not played today', async () => {
      expoMock = createExpoMock('granted');
      jest.resetModules();
      jest.doMock('expo-notifications', () => expoMock, { virtual: true });
      jest.doMock('../services/amberCurrency', () => ({
        // Active streak, but NOT played today ⇒ genuinely at risk.
        getFullProgress: jest.fn(() => Promise.resolve({ currentStreak: 5, lastPlayDate: null })),
      }));
      const svc = require('../services/notifications');

      await svc.scheduleAllNotifications(2);

      const triggers = scheduledTriggers();
      // 19:00 streak-risk ping present, carrying the streak length + routing to the daily.
      const streakRisk = triggers.filter((t) => t.hour === 19);
      expect(streakRisk.length).toBe(1);
      expect(streakRisk[0].body).toContain('5');
      expect(streakRisk[0].data).toEqual({ target: 'daily' });
      // Win-back rung 1 deferred to +2 days (the streak ping leads the ladder);
      // rungs 2-5 hold at +3/+7/+14/+30.
      const winBack = triggers.filter((t) => t.hour === 18);
      expect(winBack.length).toBe(5);
      expect(winBack.map((t) => t.date.getDate())).toEqual([
        expectedDayOfMonth(2),
        expectedDayOfMonth(3),
        expectedDayOfMonth(7),
        expectedDayOfMonth(14),
        expectedDayOfMonth(30),
      ]);

      jest.dontMock('../services/amberCurrency');
    });

    it('does NOT schedule streak-risk when the player already played today (chain safe)', async () => {
      expoMock = createExpoMock('granted');
      jest.resetModules();
      jest.doMock('expo-notifications', () => expoMock, { virtual: true });
      const { getLocalDateString } = require('../services/dateUtils');
      jest.doMock('../services/amberCurrency', () => ({
        // Active streak AND played today ⇒ not at risk, suppress the warning.
        getFullProgress: jest.fn(() =>
          Promise.resolve({ currentStreak: 5, lastPlayDate: getLocalDateString() })
        ),
      }));
      const svc = require('../services/notifications');

      await svc.scheduleAllNotifications(2);

      const triggers = scheduledTriggers();
      const streakRisk = triggers.filter((t) => t.hour === 19);
      expect(streakRisk.length).toBe(0);
      // Win-back rung 1 falls back to next-day (no streak-risk leading the
      // ladder) — never today, so a player who played today hears nothing.
      const winBack = triggers.filter((t) => t.hour === 18);
      expect(winBack.length).toBe(5);
      expect(winBack.map((t) => t.date.getDate())).toEqual([
        expectedDayOfMonth(1),
        expectedDayOfMonth(3),
        expectedDayOfMonth(7),
        expectedDayOfMonth(14),
        expectedDayOfMonth(30),
      ]);

      jest.dontMock('../services/amberCurrency');
    });

    it('does NOT schedule streak-risk when the streak is below 2', async () => {
      expoMock = createExpoMock('granted');
      jest.resetModules();
      jest.doMock('expo-notifications', () => expoMock, { virtual: true });
      jest.doMock('../services/amberCurrency', () => ({
        getFullProgress: jest.fn(() => Promise.resolve({ currentStreak: 1, lastPlayDate: null })),
      }));
      const svc = require('../services/notifications');

      await svc.scheduleAllNotifications(0);

      const streakRisk = scheduledTriggers().filter((t) => t.hour === 19);
      expect(streakRisk.length).toBe(0);

      jest.dontMock('../services/amberCurrency');
    });
  });
});
