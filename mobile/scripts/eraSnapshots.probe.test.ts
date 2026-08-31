/** Playthrough support (session tooling): build creator-kit era snapshots and
 * dump the AsyncStorage maps to JSON for browser localStorage injection.
 * Not part of the shipped test suite; invoked directly by name. */
const memStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => (memStore.has(k) ? memStore.get(k) : null),
    setItem: async (k: string, v: string) => { memStore.set(k, v); },
    removeItem: async (k: string) => { memStore.delete(k); },
    multiRemove: async (ks: string[]) => { ks.forEach(k => memStore.delete(k)); },
    multiGet: async (ks: string[]) => ks.map(k => [k, memStore.has(k) ? memStore.get(k) : null]),
    multiSet: async (kvs: [string, string][]) => { kvs.forEach(([k, v]) => memStore.set(k, v)); },
    getAllKeys: async () => [...memStore.keys()],
    clear: async () => { memStore.clear(); },
  },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { creatorCode: 'PLAYTEST' } } },
}));

import * as fs from 'fs';
import { applyCreatorSnapshot, CREATOR_ERAS } from '../src/services/creatorKit';

const OUT_DIR = '/tmp/claude-0/-home-user-WordShift/2c97a4df-c026-507d-aaa5-c5c42a0df024/scratchpad/eras';

describe('era snapshots', () => {
  it('builds and dumps all four era saves', async () => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    for (const era of CREATOR_ERAS) {
      memStore.clear();
      const ok = await applyCreatorSnapshot(era);
      console.log(`era ${era}: ok=${ok}, keys=${memStore.size}`);
      expect(ok).toBe(true);
      const obj: Record<string, string> = {};
      for (const [k, v] of memStore) obj[k] = v;
      fs.writeFileSync(`${OUT_DIR}/${era}.json`, JSON.stringify(obj), 'utf-8');
    }
  }, 600000);
});
