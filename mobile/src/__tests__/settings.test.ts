jest.mock('../services/storage', () =>
  require('./helpers/mockStorage').createMockStorage()
);

import { storage } from '../services/storage';
import {
  getSettings,
  updateSetting,
  getSettingsSync,
  resetSettings,
  GameSettings,
} from '../services/settings';

describe('settings', () => {
  beforeEach(() => {
    (storage as any).clearAll();
    resetSettings();
  });

  test('getSettings returns defaults initially', () => {
    const settings = getSettings();
    expect(settings.soundEnabled).toBe(true);
    expect(settings.hapticsEnabled).toBe(true);
    expect(settings.reducedMotion).toBe(false);
  });

  test('updateSetting changes a single setting', () => {
    const updated = updateSetting('soundEnabled', false);
    expect(updated.soundEnabled).toBe(false);
    expect(updated.hapticsEnabled).toBe(true);
  });

  test('settings persist via storage', () => {
    updateSetting('hapticsEnabled', false);
    expect(storage.set).toHaveBeenCalled();
  });

  test('getSettingsSync returns cached settings', () => {
    getSettings(); // Load into cache
    const sync = getSettingsSync();
    expect(sync.soundEnabled).toBe(true);
  });

  test('resetSettings restores defaults', () => {
    updateSetting('soundEnabled', false);
    updateSetting('reducedMotion', true);
    const settings = resetSettings();
    expect(settings.soundEnabled).toBe(true);
    expect(settings.reducedMotion).toBe(false);
  });
});
