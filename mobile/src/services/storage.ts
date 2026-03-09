/**
 * Central MMKV storage singleton for WordShift.
 *
 * All services import `storage` from here instead of using AsyncStorage directly.
 * MMKV operations are synchronous — no async/await needed.
 *
 * For JSON objects, use the `getObject` / `setObject` helpers which wrap
 * JSON.stringify/parse around MMKV's string storage.
 */
import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'wordshift' });

/**
 * Read a JSON object from storage.
 * Returns null if the key doesn't exist or parsing fails.
 */
export function getObject<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (raw === undefined) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Write a JSON object to storage.
 */
export function setObject<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}
