import NativeStorage from '@react-native-async-storage/async-storage';

/** Local-only write-ahead commit. Never copied into a cloud save. */
export const STORAGE_COMMIT_KEY = 'wordshift_storage_commit';
type Entry = [string, string | null];
interface Commit { version: 1; label: string; entries: Entry[] }
let staged: Map<string, string | null> | null = null;
let stagedReadFailure: unknown;
let serial: Promise<unknown> = Promise.resolve();
let busy = false;
const listeners = new Set<() => void>();

/** A commit exists on disk: the old session must stay blocked until replay. */
export class StorageRecoveryRequiredError extends Error {
  constructor(public readonly originalError: unknown) {
    super('Your saved changes need recovery before play can continue. Please retry.');
    this.name = 'StorageRecoveryRequiredError';
  }
}

export const isStorageTransactionActive = (): boolean => busy;
export function subscribeStorageTransaction(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function setBusy(value: boolean): void {
  busy = value;
  listeners.forEach(listener => listener());
}
async function apply(entries: Entry[]): Promise<void> {
  // Repeating a partially applied commit is idempotent. Do not remove the
  // journal until every write succeeded, including explicit deletions.
  for (const [key, value] of entries) {
    if (value === null) await NativeStorage.removeItem(key);
    else await NativeStorage.setItem(key, value);
  }
}
function parseCommit(raw: string): Commit {
  const value: unknown = JSON.parse(raw);
  const commit = value as Commit;
  if (!commit || commit.version !== 1 || typeof commit.label !== 'string' ||
      !Array.isArray(commit.entries) || !commit.entries.every(entry =>
        Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' &&
        /^wordshift_/.test(entry[0]) && entry[0] !== STORAGE_COMMIT_KEY &&
        (entry[1] === null || typeof entry[1] === 'string'))) {
    throw new Error('A pending save needs recovery before play can continue');
  }
  return commit;
}
async function recover(): Promise<boolean> {
  const raw = await NativeStorage.getItem(STORAGE_COMMIT_KEY);
  if (!raw) return false;
  try {
    await apply(parseCommit(raw).entries);
    await NativeStorage.removeItem(STORAGE_COMMIT_KEY);
  } catch (error) { throw new StorageRecoveryRequiredError(error); }
  return true;
}

/** Await this before migrations, cloud access, or rendering the game. */
export function recoverPendingStorageTransaction(): Promise<boolean> {
  const run = serial.catch(() => {}).then(async () => {
    setBusy(true);
    try { return await recover(); } finally { setBusy(false); }
  });
  serial = run;
  return run;
}

/**
 * Participating services use this adapter. Work stages changes without touching
 * durable keys. A single durable journal is the commit point; interrupted apply
 * resumes on the next boot. Callers invalidate their service caches on failure.
 * Do not nest transactions: call participating service functions inside one.
 */
export function runStorageTransaction<T>(label: string, work: () => Promise<T>): Promise<T> {
  const run = serial.catch(() => {}).then(async () => {
    setBusy(true);
    try {
      await recover();
      staged = new Map();
      stagedReadFailure = undefined;
      const result = await work();
      if (stagedReadFailure !== undefined) throw stagedReadFailure;
      const entries = Array.from(staged.entries());
      staged = null;
      if (entries.length) {
        await NativeStorage.setItem(STORAGE_COMMIT_KEY, JSON.stringify({ version: 1, label, entries }));
        try {
          await apply(entries);
          await NativeStorage.removeItem(STORAGE_COMMIT_KEY);
        } catch (error) { throw new StorageRecoveryRequiredError(error); }
      }
      return result;
    } finally {
      staged = null;
      setBusy(false);
    }
  });
  serial = run;
  return run;
}

const persistenceStorage = {
  ...NativeStorage,
  async getItem(key: string): Promise<string | null> {
    if (staged?.has(key)) return staged.get(key)!;
    try { return await NativeStorage.getItem(key); } catch (error) {
      if (staged) stagedReadFailure = error;
      throw error;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (staged) { staged.set(key, value); return; }
    await NativeStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (staged) { staged.set(key, null); return; }
    await NativeStorage.removeItem(key);
  },
  async getAllKeys(): Promise<readonly string[]> {
    let savedKeys: readonly string[];
    try { savedKeys = await NativeStorage.getAllKeys(); } catch (error) {
      if (staged) stagedReadFailure = error;
      throw error;
    }
    const keys = new Set(savedKeys);
    staged?.forEach((value, key) => { if (value === null) keys.delete(key); else keys.add(key); });
    return Array.from(keys);
  },
  async multiGet(keys: readonly string[]): Promise<readonly [string, string | null][]> {
    return Promise.all(keys.map(async key => [key, await persistenceStorage.getItem(key)] as [string, string | null]));
  },
  async multiSet(entries: readonly (readonly [string, string])[]): Promise<void> {
    for (const [key, value] of entries) await persistenceStorage.setItem(key, value);
  },
  async multiRemove(keys: readonly string[]): Promise<void> {
    for (const key of keys) await persistenceStorage.removeItem(key);
  },
};
export default persistenceStorage;
