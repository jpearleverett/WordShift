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

describe('self-directed cold-open onboarding', () => {
  test('routes the fresh cold-open step to an EASY standard board or its autosave', () => {
    expect(APP_TSX).toMatch(/step === 'cold_open_puzzle'/);
    expect(APP_TSX).toMatch(/await loadPuzzleState\(\)/);
    expect(APP_TSX).toMatch(/puzzleActions\.restorePuzzleState\(saved\)/);
    expect(APP_TSX).toMatch(/saved\.unbrokenWeaveMode !== true/);
    expect(APP_TSX).toMatch(/puzzleActions\.startNewGame\('EASY', 'standard', 'standard', false, false\)/);
  });

  test('routes a recorded cold-open victory before stale autosave restoration', () => {
    const launcher = APP_TSX.slice(
      APP_TSX.indexOf('const launchColdOpenPuzzle'),
      APP_TSX.indexOf('// Auto-save puzzle state'),
    );
    expect(launcher).toContain('getCumulativeStats()');
    expect(launcher).toContain('resolveColdOpenLaunchRoute');
    expect(launcher).toContain("advanceOnboarding('home_empty')");
    expect(launcher).toContain("transitionTo('home'");
    expect(launcher.indexOf("route === 'home_empty'")).toBeLessThan(
      launcher.indexOf("startNewGame('EASY'"),
    );
    expect(launcher.indexOf("route === 'home_empty'")).toBeLessThan(
      launcher.indexOf("route === 'restore'"),
    );
  });

  test('shows the concise instruction without FoxGuide or exact guidance', () => {
    expect(APP_TSX).toMatch(/puzzleActions\.setMessage\(COLD_OPEN_INSTRUCTION\)/);
    expect(APP_TSX).toMatch(/if \(onboardingFlow\.onboardingStep !== 'puzzle_tutorial'\) return null;/);

    const onboardingPuzzleGuide = APP_TSX.slice(
      APP_TSX.indexOf('{/* Fox Guide overlay — shown during onboarding on puzzle screen'),
      APP_TSX.indexOf('{!onboardingFlow.isOnboarding && showSetupSelectorIntro')
    );
    expect(onboardingPuzzleGuide.length).toBeGreaterThan(0);
    expect(onboardingPuzzleGuide).not.toContain("cold_open_puzzle");
  });

  test('shows an accessible bottom-control SKIP action for the unguided cold open', () => {
    const controls = APP_TSX.slice(
      APP_TSX.indexOf('{/* Bottom Controls'),
      APP_TSX.indexOf('{/* Rules Modal'),
    );
    expect(controls).toContain("onboardingFlow.onboardingStep === 'cold_open_puzzle'");
    expect(controls).toContain('label={getColdOpenSkipLabel()}');
    expect(controls).toContain('onPress={handleColdOpenSkipPress}');
    expect(controls).toContain('accessibilityLabel={getColdOpenSkipAccessibilityLabel()}');
    const confirmHandler = APP_TSX.slice(
      APP_TSX.indexOf('const handleColdOpenSkipPress'),
      APP_TSX.indexOf('// Auto-save puzzle state'),
    );
    expect(confirmHandler).toContain('getSkipConfirmText()');
    expect(confirmHandler).toContain('getSkipConfirmLeaveLabel()');
    expect(confirmHandler).toContain('onPress: onboardingActions.handleSkipOnboarding');
    expect(confirmHandler).toContain('getSkipConfirmStayLabel()');
  });

  test('cold-open victory Continue clears the board and routes to the Fox invitation', () => {
    const handler = APP_TSX.slice(
      APP_TSX.indexOf('const handleOnboardingVictoryContinue'),
      APP_TSX.indexOf('const handleReturnHome')
    );
    expect(handler).toContain("onboardingFlow.onboardingStep === 'cold_open_puzzle'");
    expect(handler).toContain("advanceOnboarding('home_empty')");
    expect(handler).toContain("transitionTo('home'");
    expect(handler).toContain('puzzleActions.clearBoard()');
    expect(APP_TSX).toMatch(
      /isOnboarding=\{onboardingFlow\.isOnboarding && \(onboardingFlow\.onboardingStep === 'cold_open_puzzle' \|\| onboardingFlow\.onboardingStep === 'puzzle_tutorial'\)\}/
    );
  });

  test('the first-free-win glitch remains suppressed for the cold open', () => {
    expect(APP_TSX).toMatch(/let firstFreeWin = false;\s*\n\s*if \(!onboardingFlow\.isOnboarding\)/);
    expect(APP_TSX).toMatch(/isOnboarding: onboardingFlow\.isOnboarding/);
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
    expect(APP_TSX).toMatch(/restartOnboarding \? 'cold_open_puzzle' : 'complete'/);
    expect(APP_TSX).toMatch(/rebuildSessionFromStorage\(\{ restartOnboarding: true \}\)/);
    expect(APP_TSX).toMatch(/rebuildSessionFromStorage\(\{ restartOnboarding: false \}\)/);
    expect(APP_TSX).toMatch(/puzzleActions\.clearBoard\(\)/);
  });
});

describe('drag input without previews', () => {
  test('drops resolve slot geometry from the live board when previews are suppressed', () => {
    // Previews are suppressed in blind mode; the drop handler must derive slot
    // count from the board or every drag there dies as a "miss" and only tap
    // input works.
    expect(APP_TSX).toMatch(/slotCount = previews\?\.length \?\? 0/);
    expect(APP_TSX).toMatch(/targetRow\.words\.length \+ 1/);
    // Near-miss snapping is gated on the verb-depth flag: it keys off preview
    // VALIDITY, so it may only run while the ✓/✗ grading is actually shown
    // (EASY / double-shift) — otherwise the snap leaks validity on boards
    // where the player is meant to judge the word.
    expect(APP_TSX).toMatch(/previews && previewValidityVisibleRef\.current && !previews\[estimated\]\?\.isValid/);
  });
});

describe('verb-depth preview gate threading', () => {
  test('Row receives the presentation flag straight from the hook', () => {
    expect(APP_TSX).toMatch(/previewValidityVisible=\{puzzle\.previewValidityVisible\}/);
  });

  test('the one-time graduation toast waits for the first fully neutral board', () => {
    expect(APP_TSX).toMatch(/PREVIEW_GRADUATION_SEEN_KEY/);
    expect(APP_TSX).toMatch(/getPreviewGraduationMessage\(persistence\.currentPhase\)/);
    // Rescue boards start with hidden checks too, but must not consume the
    // graduation beat. Blind Offering and onboarding remain excluded.
    expect(APP_TSX).toMatch(/puzzle\.previewGradingMode !== 'neutral' \|\| puzzle\.blindMode/);
  });
});

describe('drag hover highlight', () => {
  test('hover derives geometrically and threads to the target Row', () => {
    expect(APP_TSX).toMatch(/onLetterDragMove=\{handleLetterDragMove\}/);
    expect(APP_TSX).toMatch(/hoverSlotIndex=\{/);
    // Ref-compare before setState keeps the PanResponder move path cheap.
    expect(APP_TSX).toMatch(/prev\.rowIndex === next\.rowIndex && prev\.slotIndex === next\.slotIndex/);
    // Hover must never be validity-filtered — no findClosestValidSlot in the
    // move handler (only the drop handler may snap, and only gated).
    const moveHandler = APP_TSX.slice(
      APP_TSX.indexOf('const handleLetterDragMove'),
      APP_TSX.indexOf('const handleLetterDragDrop')
    );
    expect(moveHandler.length).toBeGreaterThan(0);
    expect(moveHandler).not.toContain('findClosestValidSlot');
    expect(moveHandler).not.toContain('isValid');
  });

  test('drag end clears the hover highlight', () => {
    expect(APP_TSX).toMatch(/const clearHoverSlot = useCallback/);
    expect(APP_TSX).toMatch(/\} else \{\s*\n\s*clearHoverSlot\(\);/);
  });
});

describe('move feedback stack', () => {
  test('valid-move audio climbs the combo ladder from the hook-computed tier', () => {
    expect(APP_TSX).toMatch(/soundValidMove\(result\.comboTier \?\? 0\)/);
  });

  test('locked-tile taps get the full rejection language, never the select chime', () => {
    expect(APP_TSX).toMatch(/if \(letter\.isLocked\) \{/);
    const lockedBranch = APP_TSX.slice(
      APP_TSX.indexOf('if (letter.isLocked) {'),
      APP_TSX.indexOf('hapticLight();', APP_TSX.indexOf('if (letter.isLocked) {'))
    );
    expect(lockedBranch).toContain('hapticError();');
    expect(lockedBranch).toContain('soundInvalidMove();');
  });
});

describe('victory haptics fire once', () => {
  test('no hapticSuccess at victory-processing start (the modal owns it)', () => {
    // The doubled-buzz fix: VictoryModal fires hapticSuccess when it becomes
    // visible; a second one at setProcessingVictory(true) must not return.
    expect(APP_TSX).not.toMatch(/setProcessingVictory\(true\);\s*\n\s*hapticSuccess\(\)/);
  });
});

describe('ambient music wiring', () => {
  test('the bed starts after hydration and re-crossfades outside ceremonies', () => {
    // Screen-aware: the bed family follows the current screen (home/puzzle/pit).
    expect(APP_TSX).toMatch(/startMusicForScreen\(musicScreen, persistence\.currentPhase\)/);
    // Ceremony guard: never switch beds mid-overlay.
    expect(APP_TSX).toMatch(/if \(phaseTransitionEvent !== null\) return;/);
  });

  test('foreground return resumes the paused bed (no stopMusic churn)', () => {
    expect(APP_TSX).toMatch(/startMusicForScreen\(musicScreenRef\.current, musicPhaseRef\.current\)/);
    // Backgrounding relies on expo-audio's shouldPlayInBackground:false
    // auto-pause — App must not tear the player down on every app switch
    // (no stopMusic CALL anywhere in App; the word may appear in comments).
    expect(APP_TSX).not.toMatch(/^\s*(?:await\s+)?stopMusic\(/m);
  });
});

describe('one-time swift-victory pointer', () => {
  test('fires only on a routine win, past the count gate, with the setting off', () => {
    expect(APP_TSX).toMatch(/const maybeShowSwiftVictoryHint = useCallback/);
    expect(APP_TSX).toMatch(/if \(!isRoutineVictory\(vd\)\) return;/);
    expect(APP_TSX).toMatch(/SWIFT_HINT_MIN_PUZZLES/);
    expect(APP_TSX).toMatch(/getSettingsSync\(\)\.swiftVictories === true\) return;/);
    expect(APP_TSX).toMatch(/getSwiftVictoryHintMessage\(phase\)/);
    // Reads victoryData — must run before the exit flow resets it.
    const nextLevelIdx = APP_TSX.indexOf('const handleNextLevel = useCallback');
    const hintCallIdx = APP_TSX.indexOf('maybeShowSwiftVictoryHint();', nextLevelIdx);
    const exitIdx = APP_TSX.indexOf('startVictoryExitFlow(', nextLevelIdx);
    expect(hintCallIdx).toBeGreaterThan(nextLevelIdx);
    expect(hintCallIdx).toBeLessThan(exitIdx);
  });
});

describe('daily streak decay-to-milestone messaging', () => {
  test('the decayed checkpoint routes through getStreakHeldMessage', () => {
    expect(APP_TSX).toMatch(/dailyProgress\.streakDecayedTo != null/);
    expect(APP_TSX).toMatch(/getStreakHeldMessage\(heldAt, persistence\.currentPhase\)/);
  });
});

describe('proactive share prompt', () => {
  test('share payload is snapshotted BEFORE the exit flow resets victoryData', () => {
    // The prompt's Share CTA opens the modal from a pre-teardown snapshot; if
    // the snapshot were read after startVictoryExitFlow (which nulls
    // victoryData), the CTA would be a dead no-op.
    // The intro-queue capture may sit between the interstitial and the exit
    // flow — the contract is only that the snapshot precedes the exit flow.
    expect(APP_TSX).toMatch(/pendingShareSnapshotRef\.current = buildShareDataRef\.current\(\);[\s\S]{0,400}?startVictoryExitFlow/);
    expect(APP_TSX).toMatch(/onPress: \(\) => \{ hapticLight\(\); openShareModalRef\.current\(snapshot\); \}/);
  });

  test('victory-exit nudges are skipped when an interstitial showed (one nudge per exit)', () => {
    // Nudges skip when an interstitial showed OR a queued Fox intro will
    // present on this exit (captured before the exit flow drains the queue).
    expect(APP_TSX).toMatch(/runVictoryExitNudges = useCallback\(async \(\s*interstitialShown: boolean,\s*introWillPresent: boolean/);
    expect(APP_TSX).toMatch(/if \(interstitialShown \|\| introWillPresent\) return;/);
    expect(APP_TSX).toMatch(/const introWillPresent =\s*\n?\s*queuedPostVictoryIntrosRef\.current\.length > 0/);
    expect(APP_TSX).toMatch(/if \(interstitialShown \|\| introWillPresent\) return;/);
    // Share prompt inherits the same anti-stacking guard the notification prompt has.
    expect(APP_TSX).toMatch(/if \(postVictoryIntro \|\| queuedPostVictoryIntrosRef\.current\.length > 0\) return false;/);
  });

  test('every nudge in the chain short-circuits the rest (no double-nudge exits)', () => {
    // The notification prompt reports whether it actually presented, and a
    // shown prompt must end the chain before the remove-ads / patron nudges.
    expect(APP_TSX).toMatch(/const maybePromptForNotifications = useCallback\(async \(\): Promise<boolean>/);
    expect(APP_TSX).toMatch(/if \(await maybeShowSharePrompt\(\)\) \{\s*await recordExitNudgeShown\(solved\);\s*return;\s*\}/);
    expect(APP_TSX).toMatch(/if \(await maybePromptForNotifications\(\)\) \{\s*await recordExitNudgeShown\(solved\);\s*return;\s*\}/);
    expect(APP_TSX).toMatch(/if \(await maybeShowRemoveAdsOffer\(\)\) \{\s*await recordExitNudgeShown\(solved\);\s*return;\s*\}/);
    expect(APP_TSX).toMatch(/if \(await maybeShowPatronNudge\(\)\) \{\s*await recordExitNudgeShown\(solved\);\s*\}/);
  });

  test('the shared exit cadence gates the whole chain and records only presented prompts', () => {
    const flowStart = APP_TSX.indexOf('const runVictoryExitNudges = useCallback');
    const flow = APP_TSX.slice(
      flowStart,
      APP_TSX.indexOf('// One-time Swift Victories pointer', flowStart)
    );
    expect(flow.length).toBeGreaterThan(0);
    const cadenceGate = flow.indexOf('canShowExitNudge(solved)');
    const firstPromptCheck = flow.indexOf('maybeShowSharePrompt()');
    expect(cadenceGate).toBeGreaterThanOrEqual(0);
    expect(cadenceGate).toBeLessThan(firstPromptCheck);
    expect(flow.match(/recordExitNudgeShown\(solved\)/g)).toHaveLength(4);
    expect(APP_TSX).toMatch(/const maybeShowPatronNudge = useCallback\(async \(\): Promise<boolean>/);
  });

  test('the remove-ads upsell is deferred: armed on the ad exit, offered on the NEXT quiet exit', () => {
    // Inside the interstitial gate: only record + arm — the 'Tired of ads?'
    // alert must never stack on the interstitial that just played.
    const gate = APP_TSX.slice(
      APP_TSX.indexOf('const maybeShowVictoryInterstitial = useCallback'),
      APP_TSX.indexOf('const maybeShowRemoveAdsOffer = useCallback')
    );
    expect(gate.length).toBeGreaterThan(0);
    expect(gate).toContain('recordInterstitialSeen()');
    expect(gate).toContain('armRemoveAdsNudgeIfEligible()');
    expect(gate).not.toContain('Tired of ads?');
    expect(gate).not.toContain('showGameAlert');
    // The offer itself lives in the nudge chain, gated on the armed flag.
    const offer = APP_TSX.slice(
      APP_TSX.indexOf('const maybeShowRemoveAdsOffer = useCallback'),
      APP_TSX.indexOf('const runVictoryExitNudges = useCallback')
    );
    expect(offer).toContain('consumePendingRemoveAdsNudge()');
    expect(offer).toContain('Tired of ads?');
  });

  test('declining the rewarded hint clip never force-opens the Store', () => {
    // Backing out of an ad is a quiet toast; the Store opens only from the
    // out-of-hints alert's explicit 'Get hints' button.
    const claim = APP_TSX.slice(
      APP_TSX.indexOf('const handleClaimRewardedHint = useCallback'),
      APP_TSX.indexOf('const handleOutOfHints = useCallback')
    );
    expect(claim.length).toBeGreaterThan(0);
    expect(claim).not.toContain('setShowStoreModal');
    // The explicit store path stays available in the out-of-hints alert.
    expect(APP_TSX).toMatch(/text: 'Get hints', onPress: \(\) => \{ done\(\); setShowStoreModal\(true\); \}/);
  });

  test('the prominent opening glitch fires on the first FREE win, not the tutorial', () => {
    expect(APP_TSX).toMatch(/firstFreeWin = !\(await hasSeenFirstWinGlitch\(\)\)/);
    // firstFreeWin (and the dwell-window voice line) thread into processVictory.
    expect(APP_TSX).toMatch(/firstFreeWin,\s*\n\s*dwellLine: dwellLineForWin,\s*\n\s*\}\);/);
  });
});

describe('finale staging (armed, not retroactive)', () => {
  test('the dwell gate waits for the arming floor before it arms the finale', () => {
    // Dwell remains recorded before the floor, then the direct service
    // predicate decides whether the first eligible win may arm.
    expect(APP_TSX).toMatch(
      /const dwell = await recordPhase4Dwell\(\);[\s\S]{0,150}if \(canArmFinale\(dwell, completedTotal\)\) \{\s*\n\s*await armFinale\(\);/
    );
  });

  test('the cinematic fires only on the marked final board', () => {
    // Firing path: only the marked final board's win completes the finale.
    expect(APP_TSX).toMatch(/if \(wasFinalBoard\) \{[\s\S]{0,400}?markFinalPuzzleCompleted\(\)/);
    expect(APP_TSX).toMatch(/setPhaseTransitionEvent\(FINAL_PUZZLE_EVENT\)/);
  });

  test('the final board win is silent: no chime, no confetti (the quiet IS the moment)', () => {
    expect(APP_TSX).toMatch(/!isSilentVictoryBeat\(completedTotal\) && !wasFinalBoard/);
    // Full sensory silence on BOTH quiet beats: the final board AND the
    // scripted silent-victory micro-beat (chime suppression alone would let
    // confetti rain over "No music this time. Only the quiet after.").
    expect(APP_TSX).toMatch(
      /setShowConfetti\(\s*!wasFinalBoard && !isSilentVictoryBeat\(completedTotal\)\s*\)/
    );
  });

  test('the dwell window keeps a post-cap held-breath voice without repeating the eighth line', () => {
    expect(APP_TSX).toMatch(/const dwellBefore = await getPhase4DwellCount\(\);/);
    expect(APP_TSX).toMatch(/dwellBefore >= FINALE_DWELL_PUZZLES/);
    expect(APP_TSX).toMatch(/getPostCapDwellLine\(completedTotal, persistence\.currentPhase\)/);
    expect(APP_TSX).toMatch(/getDwellLine\(Math\.min\(dwell, FINALE_DWELL_PUZZLES\), persistence\.currentPhase\)/);
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

  test('next/home victory exits run the interstitial gate; the pit exit (Collect Now) is exempt', () => {
    // Next Level and Return Home keep the cadence (ad inventory shifts, it
    // does not disappear).
    const calls = APP_TSX.match(/const adShown = maybeShowVictoryInterstitial\(\);/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    // Collecting amber you already earned is never an ad moment: handleGoToPit
    // must not run the interstitial gate.
    const pitExit = APP_TSX.slice(
      APP_TSX.indexOf('const handleGoToPit = useCallback'),
      APP_TSX.indexOf('}, [', APP_TSX.indexOf('const handleGoToPit = useCallback'))
    );
    expect(pitExit.length).toBeGreaterThan(0);
    expect(pitExit).not.toContain('maybeShowVictoryInterstitial');
    // Pending ward ceremonies are exempt at the gate itself.
    expect(APP_TSX).toMatch(/persistence\.pendingPhaseTransition != null/);
  });
});

describe('Unbroken Weave mastery orchestration', () => {
  test('records Weave mastery before choreography and merges every field into victory data', () => {
    const victoryFlow = APP_TSX.slice(
      APP_TSX.indexOf('if (result?.completed)'),
      APP_TSX.indexOf('// Check for endgame triggers', APP_TSX.indexOf('if (result?.completed)')),
    );
    const recordIndex = victoryFlow.indexOf('recordUnbrokenWeaveVictory(');
    const setVictoryIndex = victoryFlow.indexOf('setVictoryData(finalVictory)');
    const choreographyIndex = victoryFlow.indexOf('playVictorySequence(');

    expect(victoryFlow).toContain('if (puzzle.unbrokenWeaveMode)');
    expect(victoryFlow).toContain("recordUnbrokenWeaveVictory(puzzle.difficulty, victory.flawless === true)");
    expect(recordIndex).toBeGreaterThan(-1);
    expect(recordIndex).toBeLessThan(setVictoryIndex);
    expect(recordIndex).toBeLessThan(choreographyIndex);
    expect(victoryFlow).toContain('unbrokenWeaveRank: mastery.rank');
    expect(victoryFlow).toContain('unbrokenWeaveTitle: mastery.title');
    expect(victoryFlow).toContain('unbrokenWeaveNextObjective: mastery.nextObjective');
    expect(victoryFlow).toContain('unbrokenWeaveRankedUp: rankedUp');
  });

  test('keeps setup mastery state fresh after load, victory, reset, and cloud restore', () => {
    expect(APP_TSX).toMatch(/getUnbrokenWeaveMastery\(\)\.then\(setUnbrokenWeaveMastery\)/);
    expect(APP_TSX).toMatch(/setUnbrokenWeaveMastery\(mastery\)/);
    expect(APP_TSX).toMatch(/unbrokenWeaveMastery=\{unbrokenWeaveMastery\}/);

    const rebuild = APP_TSX.slice(
      APP_TSX.indexOf('const rebuildSessionFromStorage'),
      APP_TSX.indexOf('const handleResetComplete'),
    );
    expect(rebuild).toContain('getUnbrokenWeaveMastery().then(setUnbrokenWeaveMastery)');
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
