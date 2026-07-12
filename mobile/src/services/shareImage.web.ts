import { Share } from 'react-native';
import {
  generateShareText,
  recordShareSuccess,
} from './shareResults';
import { logEvent } from './eventLogger';
import type { ShareableResult } from './shareResults';

export interface ShareImageProvider {
  capture: (viewRef: unknown) => Promise<string>;
  shareFile: (uri: string, message: string) => Promise<boolean>;
}

export function setShareImageProvider(_provider: ShareImageProvider | null): void {}

export function isImageShareAvailable(): boolean {
  return false;
}

export function initShareImage(): void {}

export async function shareResultImage(
  _viewRef: unknown,
  result: ShareableResult
): Promise<boolean> {
  try {
    const shared = (await Share.share({
      message: generateShareText(result),
    })) as Awaited<ReturnType<typeof Share.share>> | undefined;
    if (shared !== undefined && shared.action !== Share.sharedAction) return false;
    await recordShareSuccess();
    logEvent({ type: 'share_completed', data: { phase: result.phase ?? 0, kind: 'text' } });
    return true;
  } catch {
    return false;
  }
}
