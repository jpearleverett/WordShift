import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getNotificationPrefs,
  setNotificationPrefs,
  getNotificationMessage,
  getStreakRiskMessage,
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

    it('returns a string for reengagement type at each phase', () => {
      for (let phase = 0; phase <= 4; phase++) {
        const message = getNotificationMessage('reengagement', phase);
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }
    });

    it('clamps phase to valid range (no error for out-of-bounds)', () => {
      expect(() => getNotificationMessage('daily', -1)).not.toThrow();
      expect(() => getNotificationMessage('daily', 10)).not.toThrow();
      expect(() => getNotificationMessage('reengagement', -5)).not.toThrow();
      expect(() => getNotificationMessage('reengagement', 99)).not.toThrow();
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

    it('phase 4 reengagement messages reference dark themes', () => {
      let foundDark = false;
      for (let i = 0; i < 30; i++) {
        const msg = getNotificationMessage('reengagement', 4);
        if (msg.includes('keepers') || msg.includes('arrangement') || msg.includes('pattern')) {
          foundDark = true;
          break;
        }
      }
      expect(foundDark).toBe(true);
    });

    it('phase 0 reengagement messages mention animals/friends', () => {
      let foundFriendly = false;
      for (let i = 0; i < 20; i++) {
        const message = getNotificationMessage('reengagement', 0);
        if (message.includes('Ember') || message.includes('friends') || message.includes('house')) {
          foundFriendly = true;
          break;
        }
      }
      expect(foundFriendly).toBe(true);
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

    it('phase 2 reengagement messages mention absence', () => {
      let found = false;
      for (let i = 0; i < 30; i++) {
        const message = getNotificationMessage('reengagement', 2);
        if (message.includes('absence') || message.includes('quieter') || message.includes('remember')) {
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

    it('phase 3 reengagement messages note absence', () => {
      let found = false;
      for (let i = 0; i < 30; i++) {
        const message = getNotificationMessage('reengagement', 3);
        if (message.includes('waiting') || message.includes('absence') || message.includes('pauses')) {
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

    it('schedules daily + next-day re-engagement when there is no streak', async () => {
      const svc = loadWithStatus('granted');
      await svc.scheduleAllNotifications(0);
      // daily reminder + re-engagement (no streak-risk without a streak)
      expect(expoMock.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
      const reengagement = (expoMock.scheduleNotificationAsync.mock.calls as any[][])[1][0];
      const triggerDate: Date = reengagement.trigger.date;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(triggerDate.getDate()).toBe(tomorrow.getDate());
    });

    it('schedules a streak-risk notification and defers re-engagement when a streak is active', async () => {
      expoMock = createExpoMock('granted');
      jest.resetModules();
      jest.doMock('expo-notifications', () => expoMock, { virtual: true });
      jest.doMock('../services/amberCurrency', () => ({
        getFullProgress: jest.fn(() => Promise.resolve({ currentStreak: 5 })),
      }));
      const svc = require('../services/notifications');

      await svc.scheduleAllNotifications(2);
      // daily reminder + streak risk + re-engagement
      expect(expoMock.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
      const bodies = (expoMock.scheduleNotificationAsync.mock.calls as any[][]).map(
        (c) => c[0].content.body as string
      );
      expect(bodies.some(b => b.includes('5'))).toBe(true);

      jest.dontMock('../services/amberCurrency');
    });
  });
});
