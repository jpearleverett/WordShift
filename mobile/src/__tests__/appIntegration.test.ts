/**
 * App integrator wiring tripwires.
 *
 * App.tsx is the orchestration point where the ship-readiness fix-set lands:
 * non-blocking boot, day-rollover daily tasks, deep-link/notification routing,
 * victory-flow skip/spinner fixes, the pit-exit interstitial gate, the speed
 * rescue, the reset-all in-memory rebuild, fresh-board scroll reset, and the
 * core-loop prop threading
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

  test('cosmetics + hints + entitlements + fonts stay awaited (sync caches / pixel font must be warm at first render)', () => {
    expect(APP_TSX).toMatch(/await Promise\.all\(\[initCosmetics\(\), initHints\(\), loadEntitlements\(\), loadPixelFonts\(\)\]\)/);
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

describe('stuck popup stays removed (product decision)', () => {
  test('App renders NO stuck panel and never announces an unwinnable board', () => {
    // Discovering a dead-end and choosing to undo/restart is part of the
    // challenge — the old immediate "you're stuck" panel must not return.
    expect(APP_TSX).not.toMatch(/getStuckPanelTitle/);
    expect(APP_TSX).not.toMatch(/getNoValidMovesMessage/);
    expect(APP_TSX).not.toMatch(/styles\.stuckPanel/);
    // isStuck stays an internal hook signal; App must not render off it.
    expect(APP_TSX).not.toMatch(/puzzle\.isStuck &&/);
  });
});

describe('fresh boards present from the first word', () => {
  test('the puzzle ScrollView snaps to the top whenever a new board commits', () => {
    // One effect keyed on board identity (first row id changes on every
    // applyBoard/restore) covers Play, Next Level, RESTART, daily, shared
    // challenge, and variant/difficulty switches without per-call-site code.
    expect(APP_TSX).toMatch(/ref=\{puzzleScrollRef\}/);
    expect(APP_TSX).toMatch(/puzzle\.rows\[0\]\.id/);
    expect(APP_TSX).toMatch(/puzzleScrollRef\.current\?\.scrollTo\(\{ y: 0, animated: false \}\)/);
  });
});

describe('tutorial fox bubble avoidance', () => {
  test('the guided-move bubble dodges the active rows', () => {
    // Lower-half moves flip the bubble to the top of the screen; upper-half
    // moves keep it above the UNDO/HINT controls — and the move-required
    // state uses the small compact card so 640dp screens stay clear.
    expect(APP_TSX).toMatch(/const tutorialFoxAnchor = useMemo/);
    expect(APP_TSX).toMatch(/targetRowIndex \* 2 >= rowCount/);
    expect(APP_TSX).toMatch(/\? 'compact'\s*\n\s*: 'dialogue'/);
  });
});

describe('onboarding skip clean exit', () => {
  test('the onboarding hook receives the board-clearing escape hatch', () => {
    // handleSkipOnboarding abandons the guided board via this callback —
    // without it, skip strands the player on a half-guided puzzle.
    expect(APP_TSX).toMatch(/clearBoard: puzzleActions\.clearBoard/);
  });

  test('tutorial FoxGuides stay wired to the skip handler', () => {
    expect(APP_TSX).toMatch(/onSkip=\{onboardingActions\.handleSkipOnboarding\}/);
  });

  test('all tutorial guidance UI derives from the onboarding step (skip clears it atomically)', () => {
    // Both the guidance memo and the dashed row overlays key on
    // onboardingStep === 'puzzle_tutorial'; advancing to 'complete' on skip
    // therefore removes every highlight in the same render — no orphaned
    // dashed boxes.
    expect(APP_TSX).toMatch(/if \(onboardingFlow\.onboardingStep !== 'puzzle_tutorial'\) return null;/);
    expect(APP_TSX).toMatch(/guidanceActive=\{onboardingFlow\.onboardingStep === 'puzzle_tutorial'\}/);
  });
});

describe('reset-all wiring', () => {
  test('Settings receives the full in-memory reset handler', () => {
    // Without this, the Expo Go / dev fallback (Updates.reloadAsync throws)
    // returned the player to a home screen still rendering the old save.
    expect(APP_TSX).toMatch(/onReset=\{handleResetComplete\}/);
    // The shared rebuild refreshes persistence; Reset All restarts onboarding
    // live while the creator-snapshot path keeps it complete.
    expect(APP_TSX).toMatch(/restartOnboarding \? 'home_empty' : 'complete'/);
    expect(APP_TSX).toMatch(/rebuildSessionFromStorage\(\{ restartOnboarding: true \}\)/);
    expect(APP_TSX).toMatch(/rebuildSessionFromStorage\(\{ restartOnboarding: false \}\)/);
    expect(APP_TSX).toMatch(/puzzleActions\.clearBoard\(\)/);
  });
});

describe('drag input without previews', () => {
  test('drops resolve slot geometry from the live board when previews are suppressed', () => {
    // Previews are suppressed in blind AND challenge modes; the drop handler
    // must derive slot count from the board or every drag in those modes dies
    // as a "miss" and only tap input works.
    expect(APP_TSX).toMatch(/slotCount = previews\?\.length \?\? 0/);
    expect(APP_TSX).toMatch(/targetRow\.words\.length \+ 1/);
    // Near-miss snapping stays preview-gated (no free validity tell in blind).
    expect(APP_TSX).toMatch(/previews && !previews\[estimated\]\?\.isValid/);
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

  test('VictoryModal stays hidden through the onboarding pit handoff (puzzle_complete AND going_to_pit)', () => {
    // After the tutorial board is solved, gameState stays WON while the
    // FoxGuide completion beat runs AND through the ~300ms going_to_pit
    // transition window; without the second exclusion the modal flashed
    // back in before the transition overlay covered it.
    expect(APP_TSX).toMatch(
      /onboardingStep === 'puzzle_complete' \|\| onboardingFlow\.onboardingStep === 'going_to_pit'/
    );
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
    // The ladder + rescue pair resets through one shared callable so a new
    // entry point can't forget half the pair. Next Level intentionally resets
    // only the rescue (the ladder continues), hence one standalone setter.
    expect(APP_TSX).toMatch(/const resetSpeedRun = useCallback/);
    const calls = APP_TSX.match(/resetSpeedRun\(\);/g) || [];
    // Play, home, daily, difficulty, variant, challenge toggle, shared
    // challenge, and the two Time's-Up exits.
    expect(calls.length).toBeGreaterThanOrEqual(9);
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
