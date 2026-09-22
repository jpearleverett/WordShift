import NativeStorage from '@react-native-async-storage/async-storage';

/**
 * A plain-text copy of this install's save, for a player whose save cannot be
 * opened (the failed-boot card). Read straight from native storage so it works
 * when the journal or a migration is what failed.
 *
 * The cloud owner ids are recovery credentials (the privacy policy tells
 * players never to email them), so they are left out. Large logs are dropped
 * first when the export would be too big for the system share sheet.
 */
const SECRET_KEYS = new Set(['wordshift_cloud_owner', 'wordshift_cloud_legacy_owner']);
const DROP_FIRST = ['wordshift_event_log', 'wordshift_whisper_gallery'];
export const SUPPORT_EXPORT_MAX_CHARS = 400_000;

export async function buildSupportExport(appVersion: string): Promise<string> {
  const keys = (await NativeStorage.getAllKeys())
    .filter(key => key.startsWith('wordshift_') && !SECRET_KEYS.has(key))
    .sort();
  const entries = await NativeStorage.multiGet(keys);
  const data: Record<string, string | null> = {};
  for (const [key, value] of entries) data[key] = value;
  const render = () => JSON.stringify({ app: 'WordShift', appVersion, exportedAt: new Date().toISOString(), data });
  let text = render();
  for (const key of DROP_FIRST) {
    if (text.length <= SUPPORT_EXPORT_MAX_CHARS) break;
    if (key in data) { data[key] = '[omitted: too large to share]'; text = render(); }
  }
  if (text.length > SUPPORT_EXPORT_MAX_CHARS) {
    for (const key of Object.keys(data).sort((a, b) => (data[b]?.length ?? 0) - (data[a]?.length ?? 0))) {
      if (text.length <= SUPPORT_EXPORT_MAX_CHARS) break;
      data[key] = '[omitted: too large to share]';
      text = render();
    }
  }
  return text;
}
