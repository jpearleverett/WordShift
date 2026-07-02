/**
 * App integrator wiring tripwires.
 *
 * App.tsx is the orchestration point where the ship-readiness fix-set lands:
 * non-blocking boot, day-rollover daily tasks, deep-link/notification routing,
 * the stuck-recovery panel, victory-flow skip/spinner fixes, the pit-exit
 * interstitial gate, the speed rescue, and the core-loop prop threading
 * (hint highlight / arrival / move outcomes). None of that is reachable from
 * Node-side unit tests (App.tsx pulls the full native surface), so — following
 * the actionButtonIcons.test.ts precedent — these tests source-scan App.tsx
 * and fail loudly if a wiring point is removed or renamed.
 */

import fs from 'fs';
import path from 'path';

const APP_TSX = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');

describe('bootstrap is non-blocking', () => {
  test('store/ad SDK init is fire-and-forget with error logging', () => {
    expect(APP_TSX).toMatch(/void initIAP\(\)\.catch/);
    expect(APP_TSX).toMatch(/void initAds\(\)\.catch/);
  });

  test('cosmetics + hints stay awaited (sync caches must be warm at first render)', () => {
    expect(APP_TSX).toMatch(/await Promise\.all\(\[initCosmetics\(\), initHints\(\)\]\)/);
    // The old blocking form must not come back.
    expect(APP_TSX).not.toMatch(/Promise\.all\(\[initIAP\(\)/);
  });
});

describe('local-day rollover', () => {
  test('AppState listener re-runs daily launch tasks on a new LOCAL day', () => {
    expect(APP_TSX).toMatch(/AppState\.addEventListener\('change'/);
    // The same-day guard must compare against the LOCAL day helper.
    expect(APP_TSX).toMatch(/dailyTasksDateRef\.current === getLocalDateString\(\)/);
  });

  test('no UTC day bucketing sneaks into App.tsx', () => {
    expect(APP_TSX).not.toMatch(/toISOString/);
  });
});

describe('deep links and notification taps', () => {
  test('challenge deep links are routed', () => {
    expect(APP_TSX).toMatch(/wordshift:\/\/challenge\/daily/);
    expect(APP_TSX).toMatch(/wordshift:\/\/challenge\/p/);
    expect(APP_TSX).toMatch(/decodeChallengeLink\(url\)/);
    expect(APP_TSX).toMatch(/startSharedChallengeGame\(words\)/);
    // Daily route stays gated on the unlock check.
    expect(APP_TSX).toMatch(/isDailyChallengeUnlocked\(puzzlesSolvedForVariantUnlocks/);
  });

  test('notification response listener routes the data.target payload', () => {
    expect(APP_TSX).toMatch(/addNotificationResponseReceivedListener/);
    expect(APP_TSX).toMatch(/content\?\.data\?\.target/);
    // Both payload values from services/notifications.ts are handled.
    expect(APP_TSX).toMatch(/target === 'daily'/);
    expect(APP_TSX).toMatch(/target === 'home'/);
  });
});

describe('stuck-recovery panel', () => {
  test('non-transient panel renders while isStuck, with phase-aware copy', () => {
    expect(APP_TSX).toMatch(/puzzle\.isStuck && puzzle\.gameState === GameState\.PLAYING/);
    expect(APP_TSX).toMatch(/getStuckPanelTitle\(persistence\.currentPhase\)/);
    expect(APP_TSX).toMatch(/getNoValidMovesMessage\(persistence\.currentPhase\)/);
  });
});

describe('victory flow', () => {
  test('spinner overlay uses the grace-window flag, not raw isProcessingVictory', () => {
    expect(APP_TSX).toMatch(/victoryFlow\.victorySpinnerVisible/);
  });

  test('tap-to-skip is wired through VictoryModal onSkip; dead skip layer removed', () => {
    expect(APP_TSX).toMatch(/onSkip=\{handleVictoryTapAccelerate\}/);
    // The old write-only ref and the childless box-none Pressable (which never
    // received touches) must stay gone.
    expect(APP_TSX).not.toMatch(/victoryAnimatingRef/);
    expect(APP_TSX).not.toMatch(/pointerEvents="box-none"/);
  });

  test('all three victory exits (next / home / pit) run the interstitial gate', () => {
    const calls = APP_TSX.match(/maybeShowVictoryInterstitial\(\);/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(3);
    // Pending ward ceremonies are exempt at the gate itself.
    expect(APP_TSX).toMatch(/persistence\.pendingPhaseTransition != null/);
  });
});

describe('speed rescue', () => {
  test('rewarded rescue resumes the run and is once-per-board', () => {
    expect(APP_TSX).toMatch(/resumeSpeedAfterRescue\(SPEED_RESCUE_EXTRA_SEC\)/);
    expect(APP_TSX).toMatch(/!speedRescueUsed && \(/);
    // The clock restarts via the restored-time mechanism.
    expect(APP_TSX).toMatch(/restoredSpeedTimeRef\.current = SPEED_RESCUE_EXTRA_SEC/);
  });

  test('every fresh-board path re-arms the rescue', () => {
    const resets = APP_TSX.match(/setSpeedRescueUsed\(false\)/g) || [];
    // Play, home, daily, difficulty, variant, challenge toggle, next level,
    // shared challenge, and the two Time's-Up exits.
    expect(resets.length).toBeGreaterThanOrEqual(9);
  });
});

describe('core-loop prop threading', () => {
  test('hint highlight and arrival reach Row', () => {
    expect(APP_TSX).toMatch(/hintLetterId=\{/);
    expect(APP_TSX).toMatch(/hintSlotIndex=\{/);
    expect(APP_TSX).toMatch(/arrival=\{/);
    // Slot glow only shows while the hinted letter is the selected one.
    expect(APP_TSX).toMatch(/puzzle\.selectedLetter\?\.id === puzzle\.hintHighlight\.letterId/);
  });

  test('slot presses declare their input source (drag vs tap)', () => {
    expect(APP_TSX).toMatch(/isDragDropRef\.current \? 'drag' : 'tap'/);
  });

  test('honest per-move outcomes feed the share card', () => {
    expect(APP_TSX).toMatch(/moveOutcomes: puzzle\.moveOutcomes\.length > 0 \? puzzle\.moveOutcomes : undefined/);
  });
});

describe('monetization + daily wiring', () => {
  test('ShopScreen can open the Store modal', () => {
    // Both the shop screen and the home screen expose the store entry.
    const wired = APP_TSX.match(/onOpenStore=\{\(\) => setShowStoreModal\(true\)\}/g) || [];
    expect(wired.length).toBeGreaterThanOrEqual(2);
  });

  test('first-daily mercy is granted after the daily board starts', () => {
    const startIdx = APP_TSX.indexOf('startDailyGame(daily.words');
    const mercyIdx = APP_TSX.indexOf('grantFirstDailyMercy()');
    expect(startIdx).toBeGreaterThan(-1);
    expect(mercyIdx).toBeGreaterThan(startIdx);
  });
});

describe('daily login modal deferral', () => {
  test('grant presentation is gated to a quiet home screen', () => {
    expect(APP_TSX).toMatch(/const dailyLoginGrantVisible =/);
    expect(APP_TSX).toMatch(/grant=\{dailyLoginGrantVisible \? dailyLoginGrant : null\}/);
    // The gate covers screen, victory flow, intros, and ceremonies.
    const gate = APP_TSX.slice(
      APP_TSX.indexOf('const dailyLoginGrantVisible ='),
      APP_TSX.indexOf(';', APP_TSX.indexOf('const dailyLoginGrantVisible ='))
    );
    expect(gate).toContain("currentScreen === 'home'");
    expect(gate).toContain('victoryFlow.victoryData === null');
    expect(gate).toContain('postVictoryIntro === null');
    expect(gate).toContain('phaseTransitionEvent === null');
  });
});
