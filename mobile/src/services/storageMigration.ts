/**
 * One-time migration from AsyncStorage to MMKV.
 *
 * On first launch after the MMKV update, this reads all existing AsyncStorage
 * data and writes it into MMKV. A flag in MMKV tracks whether migration has
 * already run so it's skipped on subsequent launches.
 *
 * AsyncStorage remains as a dependency solely for this migration path.
 * It can be removed in a future release once all users have migrated.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from './storage';

const MIGRATION_FLAG = 'hasMigratedFromAsyncStorage';

/**
 * Check whether the one-time migration has already completed.
 */
export function hasMigrated(): boolean {
  return storage.getBoolean(MIGRATION_FLAG) === true;
}

/**
 * Migrate all AsyncStorage data to MMKV.
 * All values are transferred as-is (strings) since both backends store
 * JSON-serialized strings for object data.
 *
 * Returns true if migration ran, false if it was already done.
 */
export async function migrateFromAsyncStorage(): Promise<boolean> {
  if (hasMigrated()) return false;

  try {
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length === 0) {
      // No existing data — fresh install, just mark as migrated
      storage.set(MIGRATION_FLAG, true);
      return true;
    }

    const pairs = await AsyncStorage.multiGet(keys);
    for (const [key, value] of pairs) {
      if (value != null) {
        storage.set(key, value);
      }
    }

    storage.set(MIGRATION_FLAG, true);
    return true;
  } catch (err) {
    console.warn('AsyncStorage → MMKV migration failed:', err);
    // Don't set the flag — retry on next launch
    return false;
  }
}
