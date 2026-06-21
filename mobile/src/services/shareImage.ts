import { Share } from 'react-native';
import { ShareableResult, generateShareText, sharePuzzleResult, recordShareSuccess } from './shareResults';
import { logEvent } from './eventLogger';

/**
 * Image share for WordShift results.
 *
 * Rasterizing a React view to a PNG needs a native module (`react-native-view-shot`),
 * which is NOT available in Expo Go. So — exactly like iap/ads/cloudSave — image
 * capture lives behind a pluggable provider. With no provider registered (Expo Go
 * today), `shareResultImage` gracefully falls back to the existing emoji-grid TEXT
 * share. Once a dev build adds `react-native-view-shot` (+ optionally `expo-sharing`),
 * `initShareImage()` registers the real capturer and the same call shares a PNG.
 *
 * To light it up later: `npm i react-native-view-shot expo-sharing`, switch to an
 * EAS dev client, and `initShareImage()` auto-registers the provider at bootstrap.
 */

export interface ShareImageProvider {
  /** Capture a measured view ref → a temp file URI for the PNG. */
  capture: (viewRef: unknown) => Promise<string>;
  /** Share an image file URI through the OS share sheet. Returns true if shared. */
  shareFile: (uri: string, message: string) => Promise<boolean>;
}

let provider: ShareImageProvider | null = null;

/** Register a real image-share provider (called by initShareImage when native is present). */
export function setShareImageProvider(p: ShareImageProvider | null): void {
  provider = p;
}

/** Whether a real image capturer is wired (false in Expo Go → text fallback). */
export function isImageShareAvailable(): boolean {
  return provider !== null;
}

/**
 * Attempt to register the native capturer. Safe to call in Expo Go: the optional
 * requires fail and the text fallback stays. No-throw.
 */
export function initShareImage(): void {
  try {
    // Optional native module — absent in Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ViewShot = require('react-native-view-shot');
    const captureRef = ViewShot.captureRef as (ref: unknown, opts: object) => Promise<string>;
    if (typeof captureRef !== 'function') return;

    let shareFile: ShareImageProvider['shareFile'];
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sharing = require('expo-sharing');
      shareFile = async (uri: string) => {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your WordShift result' });
          return true;
        }
        return false;
      };
    } catch {
      // No expo-sharing — fall back to RN Share with a file url (iOS-friendly).
      shareFile = async (uri: string) => {
        const r = await Share.share({ url: uri }, { dialogTitle: 'Share your WordShift result' });
        return r.action === Share.sharedAction;
      };
    }

    setShareImageProvider({
      capture: (ref) => captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' }),
      shareFile,
    });
  } catch {
    // react-native-view-shot not installed (Expo Go) — keep the text fallback.
  }
}

/**
 * Share a result. Captures+shares a PNG when a provider is registered; otherwise
 * falls back to the emoji-grid text share. Both paths credit the daily share bonus
 * and increment the share count exactly once.
 */
export async function shareResultImage(
  viewRef: unknown,
  result: ShareableResult
): Promise<boolean> {
  if (provider && viewRef) {
    try {
      const uri = await provider.capture(viewRef);
      const shared = await provider.shareFile(uri, generateShareText(result));
      if (shared) {
        await recordShareSuccess();
        logEvent({ type: 'share_completed', data: { phase: result.phase ?? 0, kind: 'image' } });
      }
      return shared;
    } catch (err) {
      console.warn('Image share failed, falling back to text:', err);
    }
  }
  // Text fallback (handles its own share-count + daily bonus).
  const shared = await sharePuzzleResult(result);
  if (shared) {
    logEvent({ type: 'share_completed', data: { phase: result.phase ?? 0, kind: 'text' } });
  }
  return shared;
}
