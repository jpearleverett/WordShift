/**
 * Screen-readiness handshake for the navigation transition.
 *
 * A few destination screens paint NOTHING on their first frame: the Offering
 * Pit returns `null` until its harvest state lands, and the ledger / gallery /
 * shop start behind a `loading` gate. Without a handshake the navigation cover
 * lifts on that empty frame and the real content pops in a beat later — the
 * "destination loads in after the cover lifts" flicker.
 *
 * Deliberately NOT a general gate: home is excluded because it already paints
 * ahead from its module-scope scene snapshot (see HomeScreen.homeSceneSnapshot),
 * and settings / stats / puzzle either render synchronously or are covered by
 * the transition callback's own promise. Gating an already-fast screen would
 * only make the common case slower.
 *
 * Pure module state, no React and no storage, so it is directly unit-testable.
 */

/** Screens that report first-content readiness. Everything else is instant. */
const REPORTING_SCREENS: ReadonlySet<string> = new Set(['pit', 'ledger', 'gallery', 'shop']);

let armedScreen: string | null = null;
let armedReady = false;
let waiters: (() => void)[] = [];

function flush(): void {
  const pending = waiters;
  waiters = [];
  for (const resolve of pending) resolve();
}

/** True when this screen participates in the readiness handshake. */
export function isReadyReportingScreen(screen: string): boolean {
  return REPORTING_SCREENS.has(screen);
}

/**
 * Arm the handshake for an incoming screen. MUST be called before the screen is
 * mounted, or a synchronously-ready screen reports into the previous arm and
 * the new one waits out the whole timeout. Any earlier arm is superseded (last
 * navigation wins) and its waiters are released so nothing can hang.
 */
export function armScreenReady(screen: string): void {
  flush();
  if (!isReadyReportingScreen(screen)) {
    armedScreen = null;
    armedReady = false;
    return;
  }
  armedScreen = screen;
  armedReady = false;
}

/**
 * A screen reports that its first real content is in state. Idempotent and safe
 * to call unarmed or for a superseded screen (both are no-ops).
 */
export function markScreenReady(screen: string): void {
  if (screen !== armedScreen || armedReady) return;
  armedReady = true;
  flush();
}

/**
 * Wait for the armed screen's first content, capped at `timeoutMs`.
 *
 * Returns `null` — not a resolved promise — when there is nothing to wait for
 * (the screen does not report, it is not the armed one, or it already reported).
 * That lets the caller reveal in the SAME tick instead of paying a microtask
 * hop on every navigation: an already-ready screen must cost exactly nothing.
 */
export function waitForScreenReady(screen: string, timeoutMs: number): Promise<void> | null {
  if (screen !== armedScreen || armedReady) return null;
  return new Promise<void>(resolve => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const settle = () => {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
      waiters = waiters.filter(w => w !== settle);
      resolve();
    };
    timer = setTimeout(settle, timeoutMs);
    waiters.push(settle);
  });
}

/** Test hook: drop all state. */
export function resetScreenReady(): void {
  flush();
  armedScreen = null;
  armedReady = false;
}
