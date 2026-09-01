/**
 * Screen-to-screen navigation contracts.
 *
 * Two halves:
 *  1. Behavioural unit tests for services/screenReady.ts — the handshake that
 *     keeps the navigation cover down until a destination that paints nothing
 *     on its first frame actually has content.
 *  2. Source-text pins on App.tsx's transitionTo / overlay render, in the style
 *     of puzzleFeelContracts.test.ts. Every one of these guards a specific,
 *     reproduced flicker; a well-meaning cleanup that reverts one would
 *     re-introduce it silently on device, where nothing else can catch it.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  armScreenReady,
  isReadyReportingScreen,
  markScreenReady,
  resetScreenReady,
  waitForScreenReady,
} from '../services/screenReady';
import { SCREEN_READY_TIMEOUT_MS, SCREEN_REVEAL_SETTLE_MS, SCREEN_FADE_REVEAL_MS } from '../constants/timing';

const appSrc = fs.readFileSync(path.join(__dirname, '../../App.tsx'), 'utf8');
const overlaySrc = fs.readFileSync(
  path.join(__dirname, '../components/ui/ScreenTransitionOverlay.tsx'),
  'utf8'
);

// Just the body of transitionTo, so a pin cannot be satisfied by an unrelated
// occurrence elsewhere in a 5,900-line file.
function transitionToBody(): string {
  const start = appSrc.indexOf('const transitionTo = useCallback(');
  expect(start).toBeGreaterThan(-1);
  const end = appSrc.indexOf('// Keep root background AND the transition-cover color', start);
  expect(end).toBeGreaterThan(start);
  return appSrc.slice(start, end);
}

describe('screenReady handshake', () => {
  beforeEach(() => {
    resetScreenReady();
  });

  it('only the screens that paint empty first report readiness', () => {
    expect(isReadyReportingScreen('pit')).toBe(true);
    expect(isReadyReportingScreen('ledger')).toBe(true);
    expect(isReadyReportingScreen('gallery')).toBe(true);
    expect(isReadyReportingScreen('shop')).toBe(true);
    // Home paints ahead from its own scene snapshot, and puzzle is covered by
    // the transition callback's own promise: gating either would only make the
    // common navigation slower.
    expect(isReadyReportingScreen('home')).toBe(false);
    expect(isReadyReportingScreen('puzzle')).toBe(false);
    expect(isReadyReportingScreen('settings')).toBe(false);
    expect(isReadyReportingScreen('stats')).toBe(false);
  });

  it('a non-reporting screen never waits (null, not a resolved promise)', () => {
    armScreenReady('home');
    expect(waitForScreenReady('home', SCREEN_READY_TIMEOUT_MS)).toBeNull();
  });

  it('an already-ready screen never waits', () => {
    armScreenReady('pit');
    markScreenReady('pit');
    expect(waitForScreenReady('pit', SCREEN_READY_TIMEOUT_MS)).toBeNull();
  });

  it('resolves when the armed screen reports', async () => {
    armScreenReady('pit');
    const wait = waitForScreenReady('pit', SCREEN_READY_TIMEOUT_MS);
    expect(wait).not.toBeNull();
    let settled = false;
    const done = (wait as Promise<void>).then(() => { settled = true; });
    expect(settled).toBe(false);
    markScreenReady('pit');
    await done;
    expect(settled).toBe(true);
  });

  it('resolves on the timeout when the screen never reports, and never rejects', async () => {
    jest.useFakeTimers();
    try {
      armScreenReady('shop');
      const wait = waitForScreenReady('shop', SCREEN_READY_TIMEOUT_MS) as Promise<void>;
      const onReject = jest.fn();
      const done = wait.then(() => 'resolved', onReject);
      jest.advanceTimersByTime(SCREEN_READY_TIMEOUT_MS + 1);
      await expect(done).resolves.toBe('resolved');
      expect(onReject).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('a second arm supersedes the first and releases its waiter', async () => {
    armScreenReady('pit');
    const first = waitForScreenReady('pit', SCREEN_READY_TIMEOUT_MS) as Promise<void>;
    let firstSettled = false;
    const firstDone = first.then(() => { firstSettled = true; });
    armScreenReady('ledger');
    await firstDone;
    expect(firstSettled).toBe(true);
    // The superseded screen can no longer arm a wait or report into the new one.
    expect(waitForScreenReady('pit', SCREEN_READY_TIMEOUT_MS)).toBeNull();
    const second = waitForScreenReady('ledger', SCREEN_READY_TIMEOUT_MS);
    expect(second).not.toBeNull();
    markScreenReady('pit');
    markScreenReady('ledger');
    await second;
  });

  it('marking unarmed or for the wrong screen is a harmless no-op', () => {
    expect(() => markScreenReady('pit')).not.toThrow();
    armScreenReady('gallery');
    markScreenReady('shop');
    expect(waitForScreenReady('gallery', SCREEN_READY_TIMEOUT_MS)).not.toBeNull();
  });
});

describe('screenReady wiring', () => {
  it.each([
    ['pit', '../components/OfferingPitScreen.tsx', "markScreenReady('pit')"],
    ['ledger', '../components/WordLedger.tsx', "markScreenReady('ledger')"],
    ['gallery', '../components/WhisperGalleryScreen.tsx', "markScreenReady('gallery')"],
    ['shop', '../components/shop/ShopScreen.tsx', "markScreenReady('shop')"],
  ])('%s reports its first content', (_name, file, call) => {
    const src = fs.readFileSync(path.join(__dirname, file), 'utf8');
    expect(src).toContain(call);
    // In a finally: a failed read must still release the cover.
    expect(src.slice(src.indexOf(call) - 300, src.indexOf(call))).toContain('finally');
  });
});

describe('timing constants', () => {
  it('the readiness cap is small enough that a held cover still reads as intentional', () => {
    expect(SCREEN_READY_TIMEOUT_MS).toBeGreaterThan(0);
    expect(SCREEN_READY_TIMEOUT_MS).toBeLessThanOrEqual(300);
  });

  it('the reveal settle finishes with the cover, not long after it', () => {
    // The old friction-8 spring ran ~400ms and kept sliding the arriving screen
    // for another ~200ms after the cover was fully gone.
    expect(SCREEN_REVEAL_SETTLE_MS).toBeGreaterThanOrEqual(SCREEN_FADE_REVEAL_MS);
    expect(SCREEN_REVEAL_SETTLE_MS).toBeLessThanOrEqual(SCREEN_FADE_REVEAL_MS + 120);
  });
});

describe('transitionTo contracts (App.tsx)', () => {
  it('an interrupted cover never swaps the screen', () => {
    expect(transitionToBody()).toContain('if (!finished || token !== transitionTokenRef.current) return;');
  });

  it('every deferred step is guarded by the transition token', () => {
    const body = transitionToBody();
    expect(body).toContain('const token = ++transitionTokenRef.current;');
    // The pre-cover frame, the cover completion, and the reveal itself.
    expect(body.match(/token !== transitionTokenRef\.current/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('the cover is painted in the destination color BEFORE it fades in, and never re-colored mid-transition', () => {
    const body = transitionToBody();
    const coverStart = body.indexOf('toValue: 1');
    expect(coverStart).toBeGreaterThan(-1);
    // The only setTransitionOverlayColor inside transitionTo that is not in the
    // reduced-motion branch must precede the cover animation.
    const colorSets = [...body.matchAll(/setTransitionOverlayColor\(/g)].map(m => m.index ?? -1);
    expect(colorSets.length).toBeGreaterThan(0);
    expect(colorSets.every(i => i < coverStart)).toBe(true);
  });

  it('the double requestAnimationFrame before the reveal survives', () => {
    expect(transitionToBody()).toMatch(
      /requestAnimationFrame\(\(\) => \{\s*requestAnimationFrame\(reveal\);\s*\}\);/
    );
  });

  it('the reveal waits for a destination that paints empty first', () => {
    const body = transitionToBody();
    expect(body).toContain('armScreenReady(screen);');
    expect(body).toContain('waitForScreenReady(screen, SCREEN_READY_TIMEOUT_MS)');
    // Arm BEFORE the mount, or a synchronously-ready screen reports into the
    // previous arm and this transition waits out the whole cap.
    expect(body.indexOf('armScreenReady(screen);')).toBeLessThan(body.lastIndexOf('setCurrentScreen(screen);'));
    // A screen with nothing to wait for reveals in the same tick.
    expect(body).toContain('else paint();');
  });

  it('the reveal fade eases OUT so the destination emerges immediately', () => {
    const body = transitionToBody();
    const revealStart = body.indexOf('toValue: 0');
    expect(revealStart).toBeGreaterThan(-1);
    expect(body).not.toContain('Easing.in(Easing.quad)');
  });

  it('a same-screen navigation with no callback is a no-op, never a pointless dip', () => {
    expect(transitionToBody()).toContain(
      "if (screen === currentScreenRef.current && !callback) return;"
    );
  });

  it('reduced motion stays instant, with no animation and no readiness gate', () => {
    const body = transitionToBody();
    const branch = body.slice(body.indexOf('if (reducedMotion) {'), body.indexOf('// Paint the cover'));
    expect(branch).toContain('setCurrentScreen(screen);');
    expect(branch).toContain('callback?.();');
    expect(branch).not.toContain('Animated.timing');
    expect(branch).not.toContain('waitForScreenReady');
  });

  it('every transition animation stays on the native driver', () => {
    const body = transitionToBody();
    expect(body).not.toContain('useNativeDriver: false');
    expect(body.match(/useNativeDriver: true/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('low-tier devices skip the full-screen reveal composite', () => {
    expect(transitionToBody()).toContain('shouldSimplifyAnimations()');
  });
});

describe('reveal wrapper + cover render contracts (App.tsx)', () => {
  it('the reveal interpolations and style are memoized, not rebuilt every render', () => {
    expect(appSrc).toContain('const screenRevealStyle = useMemo(');
    expect(appSrc).toContain('const revealScale = useMemo(');
    expect(appSrc).toContain('const revealShift = useMemo(');
    expect(appSrc).toContain('<Animated.View\n        style={screenRevealStyle}');
  });

  it('the pit sink can never uncover the root: it always carries a scale', () => {
    const styleBlock = appSrc.slice(
      appSrc.indexOf('const screenRevealStyle = useMemo('),
      appSrc.indexOf('const screenRevealStyle = useMemo(') + 600
    );
    expect(styleBlock).toContain("screenRevealKind === 'sink'");
    // Scale FIRST, so the translate happens inside the crop the scale opens up.
    expect(styleBlock).toContain('[{ scale: revealScale }, { translateY: revealShift }]');
  });

  it('the cover is the memoized leaf component, not an inline Animated.View', () => {
    expect(appSrc).toContain('<ScreenTransitionOverlay opacity={transitionOverlay} color={transitionOverlayColor} />');
    expect(overlaySrc).toContain('React.memo(');
    expect(overlaySrc).toContain('pointerEvents="none"');
    // The color must live on a plain child View, never on the animated node.
    expect(overlaySrc).toMatch(/<Animated\.View pointerEvents="none" style=\{outerStyle\}>\s*<View style=\{fillStyle\} \/>/);
    // Pixel-skin rule + no full-screen edge shadow.
    expect(overlaySrc).not.toContain('borderRadius:');
    expect(overlaySrc).not.toContain('elevation:');
  });

  it("the Time's-Up Home button navigates through the transition, not a raw swap", () => {
    const timeUp = appSrc.slice(
      appSrc.indexOf('accessibilityLabel="Try again with a new puzzle"'),
      appSrc.indexOf('accessibilityLabel="Return home"')
    );
    expect(timeUp).toContain("transitionTo('home'");
    expect(timeUp).not.toContain("setCurrentScreen('home')");
  });
});
