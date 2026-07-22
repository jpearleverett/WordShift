import { AccessibilityInfo, findNodeHandle } from 'react-native';

/**
 * Assistive-access announce pipeline.
 *
 * A tiny, dependency-light bridge to AccessibilityInfo.announceForAccessibility
 * so deferred reveals (the victory payoff, ceremony beats, iOS toast fallback)
 * are spoken to screen-reader users. announceForAccessibility is a no-op when no
 * screen reader is running, so it is always safe to call unconditionally.
 *
 * Spoiler discipline: callers pass ONLY what the visible content already
 * reveals. This util adds nothing and never infers phase/system state.
 */

export interface AnnounceOptions {
  /** Delay before speaking (ms). Lets a modal or ceremony settle first. */
  delayMs?: number;
  /**
   * Optional ref/handle to move screen-reader focus to after announcing. Pass a
   * React ref object (its `.current` is resolved via findNodeHandle) or a raw
   * numeric node handle. When omitted, focus is left where the reader put it.
   */
  focusRef?: { current: unknown } | number | null;
}

type A11yInfo = {
  announceForAccessibility?: (message: string) => void;
  setAccessibilityFocus?: (handle: number) => void;
};

function resolveHandle(focusRef: AnnounceOptions['focusRef']): number | null {
  if (focusRef == null) return null;
  if (typeof focusRef === 'number') return focusRef;
  const node = focusRef.current;
  if (node == null || typeof findNodeHandle !== 'function') return null;
  const handle = findNodeHandle(node as never);
  return typeof handle === 'number' ? handle : null;
}

/**
 * Speak `message` to assistive technology, guarded so it can never throw on a
 * platform/build where the API is missing. Empty/whitespace messages are
 * dropped. Optionally moves accessibility focus to a node afterwards.
 */
export function announceForA11y(message: string, options: AnnounceOptions = {}): void {
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) return;

  const { delayMs = 0, focusRef = null } = options;

  const run = () => {
    try {
      const info = AccessibilityInfo as unknown as A11yInfo | undefined;
      info?.announceForAccessibility?.(text);
      const handle = resolveHandle(focusRef);
      if (handle != null) info?.setAccessibilityFocus?.(handle);
    } catch {
      // Best effort: assistive announcements must never crash a ceremony,
      // a toast, or a victory. Silently ignore any native/API failure.
    }
  };

  if (delayMs > 0) {
    setTimeout(run, delayMs);
  } else {
    run();
  }
}
