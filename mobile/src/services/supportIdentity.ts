import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSecureIdentity } from './secureIdentity';
import { getInstallId } from './installIdentity';

export const SUPPORT_ID_KEY = 'wordshift_support_id';
let creating: Promise<string> | null = null;
/** A lookup reference only. It must never authorize deletion or save access. */
export async function getSupportId(): Promise<string> {
  if (creating) return creating;
  creating = (async () => {
    const stored = await AsyncStorage.getItem(SUPPORT_ID_KEY);
    if (stored && /^wss_[a-f0-9]{32}$/.test(stored)) return stored;
    const id = (await createSecureIdentity()).replace('ws2_', 'wss_');
    await AsyncStorage.setItem(SUPPORT_ID_KEY, id);
    return id;
  })();
  try { return await creating; } finally { creating = null; }
}
export async function getSupportIdentifier(): Promise<string> {
  const id = await getSupportId();
  return `WSS-${id.slice(4).toUpperCase().match(/.{8}/g)!.join('-')}`;
}
export async function getSupportMetadata(): Promise<{ supportId: string; installId: string }> {
  const [supportId, installId] = await Promise.all([getSupportId(), getInstallId()]);
  return { supportId, installId };
}
