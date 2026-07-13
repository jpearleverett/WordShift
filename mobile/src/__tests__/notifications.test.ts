import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getNotificationPrefs,
  setNotificationPrefs,
  getNotificationMessage,
  getStreakRiskMessage,
  getQuestExpiryMessage,
  getEarlyReminderMessage,
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
      await setNotificationPrefs({ dailyReminderHour: 10 }, 0);
      const prefs = await getNotificationPrefs();
      expect(prefs.dailyReminderHour).toBe(10);
      expect(prefs.enabled).toBe(true); // default preserved
      expect(prefs.dailyReminderEnabled).toBe(true);
    });

    it('can disable master toggle', async () => {
      await setNotificationPrefs({ enabled: false }, 0);
      const prefs = await getNotificationPrefs();
      expect(prefs.enabled).toBe(false);
    });

    it('can disable daily reminders', async () => {
      await setNotificationPrefs({ dailyReminderEnabled: false }, 0);
      const prefs = await getNotificationPrefs();
      expect(prefs.dailyReminderEnabled).toBe(false);
    });

    it('can disable reengagement', async () => {
      await setNotificationPrefs({ reengagementEnabled: false }, 0);
      const prefs = await getNotificationPrefs();
      expect(prefs.reengagementEnabled).toBe(false);
    });

    it('can set custom reminder hour', async () => {
      await setNotificationPrefs({ dailyReminderHour: 22 }, 0);
      const prefs = await getNotificationPrefs();
      expect(prefs.dailyReminderHour).toBe(22);
    });

    it('persists to storage', async () => {
      await setNotificationPrefs({ dailyReminderHour: 15 }, 0);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('overwrites previous prefs', async () => {
      await setNotificationPrefs({ dailyReminderHour: 10 }, 0);
      await setNotificationPrefs({ dailyReminderHour: 14 }, 0);
      const prefs = await getNotificationPrefs();
      expect(prefs.dailyReminderHour).toBe(14);
    });

    it('updates multiple prefs simultaneously', async () => {
      await setNotificationPrefs({
        dailyReminderEnabled: false,
        reengagementEnabled: false,
        dailyReminderHour: 7,
      }, 0);
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
  // getEarlyReminderMessage (pre-daily-unlock come-back copy)
  // ===========================================================================

  describe('getEarlyReminderMessage', () => {
    it('returns a non-empty message at each phase', () => {
      for (let phase = 0; phase <= 5; phase++) {
        const message = getEarlyReminderMessage(phase);
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }
    });

    it('clamps out-of-bounds phases', () => {
      expect(() => getEarlyReminderMessage(-1)).not.toThrow();
      expect(() => getEarlyReminderMessage(99)).not.toThrow();
      expect(getEarlyReminderMessage(-1).length).toBeGreaterThan(0);
      expect(getEarlyReminderMessage(99).length).toBeGreaterThan(0);
    });

    it('never advertises the daily challenge and contains no em dashes', () => {
      // Sample repeatedly (messages are random) across every phase: the whole
      // point of this copy is to never mention a daily the player can't open,
      // and player-facing text must never carry em dashes.
      for (let phase = 0; phase <= 5; phase++) {
        for (let i = 0; i < 20; i++) {
          const message = getEarlyReminderMessage(phase);
          expect(message).not.toMatch(/daily/i);
          expect(message).not.toMatch(/[—–]/);
        }
      }
    });

    it('phase 0 copy stays warm and bright', () => {
      for (let i = 0; i < 20; i++) {
        const message = getEarlyReminderMessage(0);
        expect(message).not.toContain('void');
        expect(message).not.toContain('arrangement');
        expect(message).not.toContain('cold');
      }
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
      await setNotificationPrefs({ enabled: false }, 0);
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
      await setNotificationPrefs({ enabled: false, dailyReminderHour: 22 }, 0);
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
      }, 0);
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
    // fire at the configured reminder hour (default 9), quest-expiry at 17:30,
    // win-back rungs at 18:00, streak-risk at 19:00. This is more robust than
    // fixed call counts/indices now that both ladders pre-arm multiple one-shots.
    function scheduledTriggers(): { hour: number; minute: number; date: Date; body: string; data: any }[] {
      return (expoMock.scheduleNotificationAsync.mock.calls as any[][]).map((c) => {
        const arg = c[0];
        const date: Date = arg.trigger.date;
        return {
          hour: date.getHours(),
          minute: date.getMinutes(),
          date,
          body: arg.content.body as string,
          data: arg.content.data,
        };
      });
    }

    function expectedDayOfMonth(daysFromNow: number): number {
      const d = new Date();
      d.setDate(d.getDate() + daysFromNow);
      return d.getDate();
    }

    it('schedules the daily reminder ladder + the +1/+3/+7/+14/+30 win-back ladder when there is no streak, deduped to one ping per day', async () => {
      const svc = loadWithStatus('granted');
      await svc.scheduleAllNotifications(0);

      const triggers = scheduledTriggers();
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

      // Daily reminders fire at hour 9 (the default reminder hour). The 8-day
      // window (today + 7 ahead) loses the +1/+3/+7 win-back days to the
      // same-local-day dedupe, and today's rung only arms if 9am hasn't passed
      // yet — so 4 or 5 morning pings remain.
      const daily = triggers.filter((t) => t.hour === 9);
      expect(daily.length).toBeGreaterThanOrEqual(4);
      expect(daily.length).toBeLessThanOrEqual(5);

      // No daily reminder shares a local day with a win-back rung.
      const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const winBackDays = new Set(winBack.map((t) => dayKey(t.date)));
      for (const t of daily) {
        expect(winBackDays.has(dayKey(t.date))).toBe(false);
      }
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
      // Phase 2: the Daily Challenge is unlocked (phase >= 1), so the morning
      // ladder routes to the daily. The locked case is covered separately below.
      await svc.scheduleAllNotifications(2);

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
      // Pin the clock to a Wednesday morning: the upcoming Sunday (+4 days)
      // never collides with a win-back rung (+1/+3/+7/+14/+30), so the quest
      // ping is deterministically eligible. Collision behavior is covered by
      // the dedupe tests below.
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 5, 10, 8, 0, 0)); // Wed Jun 10 2026, 8am
      try {
        expoMock = createExpoMock('granted');
        jest.resetModules();
        jest.doMock('expo-notifications', () => expoMock, { virtual: true });
        jest.doMock('../services/weeklyQuests', () => ({
          // Read-only peek (never generates): a stored weekly period with an
          // unclaimed reward ⇒ remind. Returns null tiers when nothing is stored.
          peekWeeklyQuests: jest.fn(() =>
            Promise.resolve({ daily: null, weekly: { periodId: 'w', quests: [], generatedAt: 0, animalsVisitedThisPeriod: [] } })
          ),
          getUnclaimedAmber: jest.fn(() => 40), // unclaimed reward ⇒ remind
        }));
        const svc = require('../services/notifications');

        await svc.scheduleAllNotifications(2);

        const triggers = scheduledTriggers();
        // 18:00 pings are the 5 win-back rungs ONLY — the quest ping no longer
        // shares their minute (or their day).
        const evening = triggers.filter((t) => t.hour === 18);
        expect(evening.length).toBe(5);
        evening.forEach((t) => expect(t.data).toEqual({ target: 'home' }));

        // The quest-expiry ping fires Sunday 17:30 with a home-routing payload.
        const questPings = triggers.filter((t) => t.hour === 17 && t.minute === 30);
        expect(questPings.length).toBe(1);
        expect(questPings[0].date.getDay()).toBe(0); // Sunday
        questPings.forEach((t) => expect(t.data).toEqual({ target: 'home' }));

        // Same-local-day dedupe guard (supersedes the old same-minute guard):
        // the whole scheduled set carries at most ONE notification per day.
        const dayStamps = triggers.map(
          (t) => `${t.date.getFullYear()}-${t.date.getMonth()}-${t.date.getDate()}`
        );
        expect(new Set(dayStamps).size).toBe(dayStamps.length);
      } finally {
        jest.useRealTimers();
        jest.dontMock('../services/weeklyQuests');
      }
    });

    it('an active (or any) player is scheduled at most one notification per local day', async () => {
      const svc = loadWithStatus('granted');
      await svc.scheduleAllNotifications(0);

      const triggers = scheduledTriggers();
      expect(triggers.length).toBeGreaterThan(0);
      const dayStamps = triggers.map(
        (t) => `${t.date.getFullYear()}-${t.date.getMonth()}-${t.date.getDate()}`
      );
      expect(new Set(dayStamps).size).toBe(dayStamps.length);
    });

    it("a lapsed streak-holder's first missed week never gets two pings on one local day", async () => {
      // The worst case before the dedupe: streak-risk (19:00) + win-back rungs
      // (18:00) + quest-expiry (Sun 17:30) + the 9am reminder ladder could
      // stack ~12 pings into the first missed week, up to 2 on one day.
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 5, 10, 8, 0, 0)); // Wed Jun 10 2026, 8am
      try {
        expoMock = createExpoMock('granted');
        jest.resetModules();
        jest.doMock('expo-notifications', () => expoMock, { virtual: true });
        jest.doMock('../services/amberCurrency', () => ({
          // Active streak, not played today ⇒ the full lapsed arsenal arms.
          getFullProgress: jest.fn(() =>
            Promise.resolve({ currentStreak: 5, lastPlayDate: null, puzzlesSolved: 40 })
          ),
          isPostRevelation: jest.fn(() => Promise.resolve(false)),
        }));
        jest.doMock('../services/weeklyQuests', () => ({
          peekWeeklyQuests: jest.fn(() =>
            Promise.resolve({ daily: null, weekly: { periodId: 'w', quests: [], generatedAt: 0, animalsVisitedThisPeriod: [] } })
          ),
          getUnclaimedAmber: jest.fn(() => 40),
        }));
        const svc = require('../services/notifications');

        await svc.scheduleAllNotifications(2);

        const triggers = scheduledTriggers();
        // Everything is armed: streak-risk, 5 win-back rungs, quest-expiry,
        // and a (thinned) morning ladder.
        expect(triggers.filter((t) => t.hour === 19).length).toBe(1);
        expect(triggers.filter((t) => t.hour === 18).length).toBe(5);
        expect(triggers.filter((t) => t.hour === 17 && t.minute === 30).length).toBe(1);
        expect(triggers.filter((t) => t.hour === 9).length).toBeGreaterThan(0);

        // Hard cap: at most ONE notification per local day across the set.
        const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const dayStamps = triggers.map((t) => dayKey(t.date));
        expect(new Set(dayStamps).size).toBe(dayStamps.length);

        // Priority order proof: the streak-risk day (today) and the
        // quest-expiry Sunday both lose their 9am reminder to the dedupe.
        const morningDays = new Set(
          triggers.filter((t) => t.hour === 9).map((t) => dayKey(t.date))
        );
        expect(morningDays.has(dayKey(new Date(2026, 5, 10)))).toBe(false); // streak-risk day
        expect(morningDays.has(dayKey(new Date(2026, 5, 14)))).toBe(false); // quest-expiry Sunday

        // First missed week (Jun 10-16): at most one ping per day ⇒ at most 7.
        const firstWeek = triggers.filter(
          (t) => t.date.getTime() < new Date(2026, 5, 17).getTime()
        );
        expect(firstWeek.length).toBeLessThanOrEqual(7);
        const firstWeekDays = firstWeek.map((t) => dayKey(t.date));
        expect(new Set(firstWeekDays).size).toBe(firstWeekDays.length);
      } finally {
        jest.useRealTimers();
        jest.dontMock('../services/amberCurrency');
        jest.dontMock('../services/weeklyQuests');
      }
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

    // =========================================================================
    // Daily reminder unlock gate: while the Daily Challenge is locked (< 8
    // puzzles AND phase 0), the morning ladder still arms but carries generic
    // come-back copy routed home, never "your daily puzzle is ready".
    // =========================================================================

    function loadGrantedWithProgress(progress: Record<string, unknown>) {
      expoMock = createExpoMock('granted');
      jest.resetModules();
      jest.doMock('expo-notifications', () => expoMock, { virtual: true });
      jest.doMock('../services/amberCurrency', () => ({
        getFullProgress: jest.fn(() => Promise.resolve(progress)),
      }));
      return require('../services/notifications');
    }

    it('routes the morning ladder HOME with generic copy while the daily is locked', async () => {
      // 4 puzzles at phase 0: past the permission prompt (3rd win) but well
      // short of the daily unlock (8 puzzles / phase 1).
      const svc = loadGrantedWithProgress({ currentStreak: 0, lastPlayDate: null, puzzlesSolved: 4 });

      // Pin message selection to the first entry of each pool so bodies are
      // exactly comparable.
      const realRandom = Math.random;
      Math.random = () => 0;
      let expectedBody = '';
      try {
        await svc.scheduleAllNotifications(0);
        expectedBody = svc.getEarlyReminderMessage(0);
      } finally {
        Math.random = realRandom;
      }

      // The same-local-day dedupe yields the +1/+3/+7 win-back days to the
      // win-back ladder, so 4-5 morning pings remain of the 8-day window.
      const morning = scheduledTriggers().filter((t) => t.hour === 9);
      expect(morning.length).toBeGreaterThanOrEqual(4);
      for (const t of morning) {
        expect(t.data).toEqual({ target: 'home' });
        expect(t.body).toBe(expectedBody);
        expect(t.body).not.toMatch(/daily/i);
      }

      jest.dontMock('../services/amberCurrency');
    });

    it('routes the morning ladder to the DAILY once unlocked by puzzle count (still phase 0)', async () => {
      const svc = loadGrantedWithProgress({ currentStreak: 0, lastPlayDate: null, puzzlesSolved: 12 });

      const realRandom = Math.random;
      Math.random = () => 0;
      let expectedBody = '';
      try {
        await svc.scheduleAllNotifications(0);
        expectedBody = svc.getNotificationMessage('daily', 0);
      } finally {
        Math.random = realRandom;
      }

      const morning = scheduledTriggers().filter((t) => t.hour === 9);
      expect(morning.length).toBeGreaterThanOrEqual(4);
      for (const t of morning) {
        expect(t.data).toEqual({ target: 'daily' });
        expect(t.body).toBe(expectedBody);
      }

      jest.dontMock('../services/amberCurrency');
    });

    it('routes the morning ladder to the DAILY when phase >= 1 regardless of puzzle count', async () => {
      const svc = loadGrantedWithProgress({ currentStreak: 0, lastPlayDate: null, puzzlesSolved: 0 });

      await svc.scheduleAllNotifications(2);

      const morning = scheduledTriggers().filter((t) => t.hour === 9);
      expect(morning.length).toBeGreaterThanOrEqual(4);
      morning.forEach((t) => expect(t.data).toEqual({ target: 'daily' }));

      jest.dontMock('../services/amberCurrency');
    });

    // =========================================================================
    // setNotificationPrefs phase passthrough: toggling reminders in Settings
    // must re-arm the ladder with the CALLER's phase, never Phase-0 copy.
    // =========================================================================

    it('setNotificationPrefs reschedules with the passed phase, not phase 0', async () => {
      const svc = loadWithStatus('granted');

      await svc.setNotificationPrefs({ enabled: true, dailyReminderEnabled: true }, 4);

      const { getWinBackMessage } = require('../services/phaseNarrative');
      const winBack = scheduledTriggers().filter((t) => t.hour === 18);
      expect(winBack.map((t) => t.body)).toEqual([
        getWinBackMessage(4, 1),
        getWinBackMessage(4, 2),
        getWinBackMessage(4, 3),
        getWinBackMessage(4, 4),
        getWinBackMessage(4, 5),
      ]);
      // Phase-4 copy on rung 1 is the reverent register — proof the phase
      // flowed through instead of the old hardcoded 0.
      expect(winBack[0].body).toContain('arrangement is incomplete');
    });
  });
});
