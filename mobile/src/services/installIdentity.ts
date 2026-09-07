import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSecureIdentity } from './secureIdentity';

const INSTALL_ID_KEY = 'wordshift_install_id';
let installIdCache: string | null = null;
let installIdCreation: Promise<string> | null = null;
/** Existing IDs remain stable; new installs have a native secure random ID. */
export async function getInstallId(): Promise<string> {
  if (installIdCache) return installIdCache;
  if (installIdCreation) return installIdCreation;
  installIdCreation = (async () => {
    const stored = await AsyncStorage.getItem(INSTALL_ID_KEY);
    if (stored) { installIdCache = stored; return stored; }
    const id = (await createSecureIdentity()).replace('ws2_', 'inst2_');
    await AsyncStorage.setItem(INSTALL_ID_KEY, id);
    installIdCache = id;
    return id;
  })();
  try { return await installIdCreation; } finally { installIdCreation = null; }
}
