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
const VICTORY_STORAGE = fs.readFileSync(path.resolve(__dirname, '../services/victoryPersistence.ts'), 'utf8');

describe('bootstrap is non-blocking', () => {
  test('store/ad SDK init is fire-and-forget with error logging', () => {
    expect(APP_TSX).toMatch(/void initIAP\(\)\.catch/);
    expect(APP_TSX).toMatch(/void initAds\(\)\.catch/);
  });

  test('settings + cosmetics + hints + entitlements + fonts stay awaited (sync caches / pixel font must be warm at first render)', () => {
    expect(APP_TSX).toMatch(/await Promise\.all\(\[getSettings\(\), initCosmetics\(\), initHints\(\), loadEntitlements\(\), loadPixelFonts\(\)\]\)/);
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

describe('stuck stays silent — except the ONE-TIME first-stuck mercy', () => {
  test('App renders NO stuck panel and never renders off isStuck', () => {
    // Discovering a dead-end and choosing to undo/restart is part of the
    // challenge — the old immediate "you're stuck" panel must not return.
    expect(APP_TSX).not.toMatch(/getStuckPanelTitle/);
    expect(APP_TSX).not.toMatch(/styles\.stuckPanel/);
    // isStuck never drives rendering (no conditional JSX off the signal).
    expect(APP_TSX).not.toMatch(/puzzle\.isStuck &&/);
  });

  test('isStuck drives ONLY the one-time-ever gated notice (the pinned invariant)', () => {
    // The single allowed consumer: an effect that shows the phase-aware
    // no-valid-moves line ONCE EVER (device-local flag, deliberately NOT
    // cloud-synced), then goes permanently silent. One-time-ness is the
    // contract: the flag is committed BEFORE the message shows, and a
    // session ref stops repeat storage reads.
    const effect = APP_TSX.slice(
      APP_TSX.indexOf('const firstStuckCheckedRef'),
      APP_TSX.indexOf('}, [puzzle.isStuck]);')
    );
    expect(effect.length).toBeGreaterThan(0);
    expect(effect).toContain('if (!puzzle.isStuck) return;');
    expect(effect).toContain('if (firstStuckCheckedRef.current) return;');
    expect(effect).toContain('hasSeenOneTimeFlag(FIRST_STUCK_SEEN_KEY)');
    expect(effect.indexOf('markOneTimeFlagSeen(FIRST_STUCK_SEEN_KEY)')).toBeLessThan(
      effect.indexOf('getNoValidMovesMessage')
    );
    // The device-local flag key (must NOT be added to cloudSave SYNC_KEYS).
    expect(APP_TSX).toContain("const FIRST_STUCK_SEEN_KEY = 'wordshift_first_stuck_seen'");
    // Exactly ONE call site of getNoValidMovesMessage in all of App.
    expect(APP_TSX.match(/getNoValidMovesMessage\(/g)).toHaveLength(1);
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
    expect(APP_TSX).toMatch(/puzzleActions\.startNewGame\('EASY', 'standard', 'standard', false, false, undefined, false\)/);
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

  test('the one-time graduation card fires unmissably on the first fully neutral board', () => {
    expect(APP_TSX).toMatch(/PREVIEW_GRADUATION_SEEN_KEY/);
    // Delivered as a BLOCKING cottage card (showGameAlert host), not a fading
    // toast, so the "the checks are gone" moment can never be missed.
    expect(APP_TSX).toMatch(/showGameAlert\(\s*getPreviewGraduationTitle\(phase\),\s*getPreviewGraduationMessage\(phase\)/);
    // Seen = ACKNOWLEDGED: the flag commits in the card's button onPress, never
    // at decision time (the old toast burned the beat invisibly on real devices).
    expect(APP_TSX).toMatch(/onPress: \(\) => \{ markOneTimeFlagSeen\(PREVIEW_GRADUATION_SEEN_KEY\)/);
    // "The rules just changed" is an authored narrative beat, not a mundane
    // utility confirm: the card must request the 'beat' tone (deepened scrim,
    // further pop, accent glow) so it never reads as identical to a stock alert.
    expect(APP_TSX).toMatch(/markOneTimeFlagSeen\(PREVIEW_GRADUATION_SEEN_KEY\)[\s\S]*?\}\],\s*(?:\/\/[^\n]*\n\s*)*'beat',/);
    // Rescue boards start with hidden checks too, but must not consume the
    // graduation beat. Blind Offering and onboarding remain excluded.
    expect(APP_TSX).toMatch(/puzzle\.previewGradingMode !== 'neutral' \|\| puzzle\.blindMode/);
    // Never on THE final board (a creator-kit era save can reach the finale with
    // the beat unfired; no teaching card may cover the last arrangement), and
    // the finale return must come BEFORE the session latch so the beat still
    // fires on the next ordinary neutral board.
    expect(APP_TSX).toMatch(/if \(puzzle\.isFinalBoard\) return;[\s\S]{0,200}graduationCheckedRef\.current = true;/);
  });

  test('Reset All re-arms the graduation beat and both files agree on the key', () => {
    const SETTINGS_TSX = fs.readFileSync(
      path.resolve(__dirname, '../components/SettingsScreen.tsx'),
      'utf8'
    );
    // App.tsx owns the constant; performFullReset clears the same literal key
    // (a teaching beat about a rules change must re-fire on a from-scratch
    // replay, unlike the device-sticky mercy/pointer flags). This pin keeps the
    // two literals from drifting when the key is next versioned.
    const keyMatch = APP_TSX.match(/PREVIEW_GRADUATION_SEEN_KEY = '([^']+)'/);
    expect(keyMatch).not.toBeNull();
    expect(SETTINGS_TSX).toContain(`AsyncStorage.removeItem('${keyMatch![1]}')`);
    expect(SETTINGS_TSX).toMatch(/\['previewGraduation',/);
  });
});

describe('Blind Offering judgment beat', () => {
  test('both blind branches fire the bespoke judgment overlay (accept / reject)', () => {
    // Blind hides validity the whole board, so the once-at-the-end judgment is
    // the mode's payoff — it must be MARKED on both branches, not fall into the
    // identical victory choreography (success) or a bare shake (failure).
    expect(APP_TSX).toMatch(/<BlindJudgmentOverlay signal=\{blindJudgmentSignal\}/);
    // Success: green accept-sweep + a rising chime, in the blind + non-final path.
    expect(APP_TSX).toMatch(/puzzle\.blindMode && !puzzle\.isFinalBoard[\s\S]*?fireBlindJudgment\('accepted'\)/);
    // Failure: the crimson reject-pulse rides the existing blindFailed feedback.
    expect(APP_TSX).toMatch(/fireBlindJudgment\('rejected'\)/);
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
    // (no bare stopMusic CALL anywhere in App; the AUTHORED silences below go
    // through the guarded stopCeremonyMusic bridge instead).
    expect(APP_TSX).not.toMatch(/^\s*(?:await\s+)?stopMusic\(/m);
    // The foreground-resume listener must honor the authored silences too.
    expect(APP_TSX).toMatch(/if \(victoryMusicHushRef\.current\) return;/);
  });

  test('the finale board and the hushed wins are ACTUALLY silent', () => {
    // The last arrangement plays with no bed: the music effect stops (via the
    // guarded ceremony bridge) instead of starting while the final board is up.
    expect(APP_TSX).toMatch(
      /musicScreen === 'puzzle' && \(puzzle\.isFinalBoard \|\| victoryMusicHushRef\.current\)/
    );
    // The hush is set exactly at the hushed-victory commit...
    expect(APP_TSX).toMatch(
      /if \(victoryHushed\) \{\s*\n\s*victoryMusicHushRef\.current = true;\s*\n\s*stopCeremonyMusic\(\);/
    );
    // ...and cleared (with an explicit resume) on the victory-exit path, so
    // Next Level after the silent-victory beat never strands a silent world.
    expect(APP_TSX).toMatch(/victoryMusicHushRef\.current = false;/);
  });
});

describe('finale orchestration wiring', () => {
  test('processVictory receives isFinalBoard so whisper/interjection stay off the Arrival', () => {
    expect(APP_TSX).toMatch(/isFinalBoard: wasFinalBoard,/);
  });

  test('the Arrival is personalized from the ritual memory with a generic fallback', () => {
    expect(APP_TSX).toMatch(/buildFinalPuzzleEvent\(await getRitualWords\(\), await getArrivalContext\(\)\)/);
    expect(APP_TSX).toMatch(/queueEndgameCinematic\(arrivalEvent\)/);
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
    expect(APP_TSX).toMatch(/daily\.progress\.streakDecayedTo != null/);
    expect(APP_TSX).toMatch(/getStreakHeldMessage\(daily\.progress\.streakDecayedTo, persistence\.currentPhase\)/);
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
    expect(APP_TSX).toMatch(/if \(await maybeShowRemoveAdsOffer\(\)\) \{\s*await recordExitNudgeShown\(solved\);\s*return;\s*\}/);
    expect(APP_TSX).toMatch(/if \(await maybeShowPatronNudge\(\)\) \{\s*await recordExitNudgeShown\(solved\);\s*\}/);
  });

  test('notification permission is asked BEFORE the nudge gate (retention infrastructure, not a nudge)', () => {
    // scheduleAllNotifications() no-ops without permission, so the entire
    // ladder — win-back rungs, streak-risk pings, quest expiry, daily
    // reminders — stays inert until this is granted. Behind the gate it was
    // unreachable until EXIT_NUDGE_MIN_PUZZLES and sat below the share prompt
    // (which fires on the first flawless win and short-circuits), pushing the
    // realistic first ask to ~solve 18-23 and leaving every earlier lapse
    // permanently unreachable. It must run before canShowExitNudge, and must
    // still consume the exit-nudge slot once past the gate so it cannot stack.
    const flowStart = APP_TSX.indexOf('const runVictoryExitNudges = useCallback');
    expect(flowStart).toBeGreaterThan(-1);
    const flow = APP_TSX.slice(flowStart, flowStart + 3000);
    const notifyAt = flow.indexOf('await maybePromptForNotifications()');
    const gateAt = flow.indexOf('if (!(await canShowExitNudge(solved))) return;');
    const shareAt = flow.indexOf('await maybeShowSharePrompt()');
    expect(notifyAt).toBeGreaterThan(-1);
    expect(gateAt).toBeGreaterThan(-1);
    expect(shareAt).toBeGreaterThan(-1);
    expect(notifyAt).toBeLessThan(gateAt);
    expect(notifyAt).toBeLessThan(shareAt);
    // Still records against the cadence when it fires past the gate.
    expect(flow).toMatch(
      /if \(await maybePromptForNotifications\(\)\) \{\s*if \(await canShowExitNudge\(solved\)\) await recordExitNudgeShown\(solved\);\s*return;\s*\}/
    );
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
    expect(APP_TSX).toMatch(/firstFreeWin,\s*\n\s*dwellLine: dwellLineForWin,\s*\n\s*isFinalBoard: wasFinalBoard,\s*\n\s*\}\);/);
  });
});

describe('finale staging (armed, not retroactive)', () => {
  test('the dwell gate waits for the arming floor before it arms the finale', () => {
    // Dwell remains recorded before the floor, then the direct service
    // predicate decides whether the first eligible win may arm.
    expect(VICTORY_STORAGE).toMatch(/const dwell = await recordPhase4Dwell\(\);[\s\S]{0,150}if \(canArmFinale\(dwell, amberResult.puzzlesSolved\)\) await armFinale\(\);/);
    expect(APP_TSX).not.toContain('await recordPhase4Dwell()');
  });

  test('the cinematic fires only on the marked final board', () => {
    // Firing path: only the marked final board's win completes the finale.
    expect(VICTORY_STORAGE).toMatch(/if \(input.finalBoard\) \{[\s\S]{0,900}?await recordStoryBoundary\([\s\S]{0,900}?await markFinalPuzzleCompleted\(\)/);
    expect(APP_TSX).toContain("endgame?.kind === 'arrival'");
    // The finale event is queued via queueEndgameCinematic, which both schedules
    // the 1.5s beat AND records the event so a victory exit in the window can
    // rescue it instead of clearVictoryTimeouts dropping the climax forever.
    expect(APP_TSX).toMatch(/queueEndgameCinematic\(arrivalEvent\)/);
    expect(APP_TSX).toMatch(/pendingEndgameEventRef\.current = event;[\s\S]{0,200}?setPhaseTransitionEvent\(event\)/);
  });

  test('a victory exit rescues a queued endgame cinematic instead of dropping it', () => {
    // startVictoryExitFlow must play any pending endgame event BEFORE
    // clearVictoryTimeouts drops its timer (the completion flag already
    // persisted, so it would never re-queue).
    expect(APP_TSX).toMatch(
      /const pendingEndgame = pendingEndgameEventRef\.current;[\s\S]{0,200}?setPhaseTransitionEvent\(pendingEndgame\);[\s\S]{0,120}?clearVictoryTimeouts\(\)/
    );
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
    expect(VICTORY_STORAGE).toMatch(/const dwellBefore = await getPhase4DwellCount\(\);/);
    expect(APP_TSX).toContain('(endgame.dwellBefore ?? 0) >= FINALE_DWELL_PUZZLES');
    expect(APP_TSX).toMatch(/getPostCapDwellLine\(completedTotal, persistence\.currentPhase\)/);
    expect(APP_TSX).toContain('getDwellLine(Math.min(endgame.dwell ?? 0, FINALE_DWELL_PUZZLES), persistence.currentPhase, endgame.houseComplete)');
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
      /onboardingStep === 'puzzle_complete' \|\|\s*onboardingFlow\.onboardingStep === 'going_to_pit'/
    );
  });

  test('next/home victory exits run the interstitial gate; the pit exit (Collect Now) is exempt', () => {
    // Routine exits keep their cadence; a queued core conversation suppresses the ad.
    const calls = APP_TSX.match(/const adShown = storyWillPresent \? false : maybeShowVictoryInterstitial\(\);/g) || [];
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
  test('passes Weave completion to the durable owner before choreography', () => {
    const victoryFlow = APP_TSX.slice(
      APP_TSX.indexOf('if (result?.completed)'),
      APP_TSX.indexOf('// Check for endgame triggers', APP_TSX.indexOf('if (result?.completed)')),
    );
    const recordIndex = victoryFlow.indexOf('persistenceActions.recordVictory(');
    const choreographyIndex = victoryFlow.indexOf('playVictorySequence(');
    expect(victoryFlow).toContain('unbrokenWeave: puzzle.unbrokenWeaveMode');
    expect(recordIndex).toBeGreaterThan(-1);
    expect(recordIndex).toBeLessThan(choreographyIndex);
    // Mastery and reward writes belong to one durable receipt, tested behaviorally
    // in saveIntegrity; App consumes the result and only refreshes its setup UI.
    expect(victoryFlow).not.toContain('recordUnbrokenWeaveVictory(');
    expect(victoryFlow).toContain('setUnbrokenWeaveMastery(await getUnbrokenWeaveMastery())');
  });

  test('keeps setup mastery state fresh after load, victory, reset, and cloud restore', () => {
    expect(APP_TSX).toMatch(/getUnbrokenWeaveMastery\(\)\.then\(setUnbrokenWeaveMastery\)/);
    expect(APP_TSX).toMatch(/setUnbrokenWeaveMastery\(await getUnbrokenWeaveMastery\(\)\)/);
    expect(APP_TSX).toMatch(/unbrokenWeaveMastery=\{unbrokenWeaveMastery\}/);

    const rebuild = APP_TSX.slice(
      APP_TSX.indexOf('const rebuildSessionFromStorage'),
      APP_TSX.indexOf('const handleResetComplete'),
    );
    expect(rebuild).toContain('setUnbrokenWeaveMastery(await getUnbrokenWeaveMastery())');
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

describe('house asks (optional per-board constraint)', () => {
  // Markers for the two effect slices (comment headers are load-bearing).
  const rollEffect = () => APP_TSX.slice(
    APP_TSX.indexOf('// HOUSE ASKS roll'),
    APP_TSX.indexOf('// HOUSE ASKS evaluation')
  );
  const evalEffect = () => APP_TSX.slice(
    APP_TSX.indexOf('// HOUSE ASKS evaluation'),
    APP_TSX.indexOf('// Leaving the puzzle screen retires the ask')
  );

  test('the roll is gated to eligible fresh STANDARD boards only', () => {
    const effect = rollEffect();
    expect(effect.length).toBeGreaterThan(0);
    // Floor + chance come from gameBalance constants, never inlined numbers.
    expect(effect).toContain('puzzlesSolvedForVariantUnlocks < HOUSE_ASK_MIN_PUZZLES');
    expect(effect).toContain('Math.random() >= HOUSE_ASK_CHANCE');
    // Every exclusion: onboarding, daily, shared-challenge, finale board,
    // non-standard variants (reverse/double/speed), blind, Unbroken Weave.
    expect(effect).toContain('if (onboardingFlow.isOnboarding) return;');
    expect(effect).toContain('if (isPlayingDaily || puzzle.isSharedChallenge || puzzle.isFinalBoard) return;');
    expect(effect).toContain("if (puzzle.currentVariant !== 'standard') return;");
    expect(effect).toContain('if (puzzle.blindMode || puzzle.unbrokenWeaveMode) return;');
    // Derived from the STORED solution, so asks are satisfiable by construction.
    expect(effect).toContain('pickHouseAsk(puzzle.solution, startWords)');
  });

  test('a restored autosave board never rolls or carries an ask (dropped silently)', () => {
    // All three restore entry points (including resumed daily) arm the ref, and the
    // roll effect consumes it (plus a committed-move guard for mid-board saves).
    const arms = APP_TSX.match(/houseAskRestoreSuppressRef\.current = true;/g) || [];
    expect(arms).toHaveLength(3);
    const effect = rollEffect();
    expect(effect).toContain('houseAskRestoreSuppressRef.current');
    expect(effect).toContain('if (puzzle.moveHistorySummary.length > 0) return;');
  });

  test('a kept ask pays BONUS amber only (never phase progress) with a receipt toast', () => {
    const effect = evalEffect();
    expect(effect.length).toBeGreaterThan(0);
    // The one and only credit path is the amber-only bonus source; the phase
    // channel (awardPuzzleAmber / recordVictory) must never appear here — a
    // bonus source can never feed phase progression (hard design rule).
    expect(effect).toContain("awardBonusAmber(HOUSE_ASK_REWARD_AMBER, 'house_ask')");
    expect(effect).not.toContain('awardPuzzleAmber');
    expect(effect).not.toContain('recordVictory');
    expect(effect).toContain(
      "enqueueVictoryToast(getHouseAskFulfilledMessage(persistence.currentPhase), 'receipt')"
    );
  });

  test('soft-fail: an unkept ask is cleared with NO message, ever', () => {
    const effect = evalEffect();
    // Evaluation clears first; only the kept path speaks.
    expect(effect.indexOf('clearHouseAsk();')).toBeGreaterThan(-1);
    expect(effect.indexOf('clearHouseAsk();')).toBeLessThan(effect.indexOf('if (!kept) return;'));
    // Exactly one player-facing line in the whole evaluation effect (the
    // kept receipt); the unkept branch says nothing.
    expect(effect.match(/enqueueVictoryToast|setMessage/g)).toHaveLength(1);
  });

  test('the live-ask indicator rides the statsRow badge idiom with the full ask line as its label', () => {
    expect(APP_TSX).toMatch(
      /accessibilityLabel=\{getHouseAskLine\(persistence\.currentPhase, houseAsk\.kind, houseAsk\.letter\)\}/
    );
    expect(APP_TSX).toMatch(/\{houseAsk\.letter\.toUpperCase\(\)\}/);
  });

  test('the ask line defers when the board-start message owns the slot', () => {
    expect(APP_TSX).toMatch(/const HOUSE_ASK_LINE_DELAY_MS = /);
    expect(rollEffect()).toContain('if (puzzle.message) {');
  });

  test('the ask is cleared on every new-board and exit path', () => {
    // New boards: the roll effect retires any live ask first thing.
    const effect = rollEffect();
    expect(effect.indexOf('clearHouseAsk();')).toBeLessThan(effect.indexOf('if (boardIdentity === null'));
    // Exits: leaving the puzzle screen retires the ask.
    expect(APP_TSX).toMatch(/if \(currentScreen !== 'puzzle'\) clearHouseAsk\(\);/);
  });
});

// ---------------------------------------------------------------------------
// App-shell bug sweep (post-victory intro stranding, speed run teardown, daily
// midnight straddle, shared-link receipt, double-tap on the instant 2x).
// ---------------------------------------------------------------------------

const sliceBetween = (start: string, end: string): string => {
  const a = APP_TSX.indexOf(start);
  const b = APP_TSX.indexOf(end, a + 1);
  expect(a).toBeGreaterThan(-1);
  expect(b).toBeGreaterThan(a);
  return APP_TSX.slice(a, b);
};

describe('a post-victory Fox intro can never be stranded', () => {
  const exitFlow = () =>
    sliceBetween('const startVictoryExitFlow = useCallback', '// Start puzzle when navigating to puzzle screen');

  test('a second exit while an intro presents replaces the parked action instead of falling through', () => {
    const flow = exitFlow();
    // The guard keys on the REF (an exact synchronous mirror of "an intro owns
    // the screen"), never on the one-render-stale state.
    expect(flow).toMatch(/if \(pendingPostVictoryActionRef\.current\) \{\s*pendingPostVictoryActionRef\.current = action;\s*return;/);
    // It must sit ABOVE the queue branch, or the empty queue falls through again.
    expect(flow.indexOf('if (pendingPostVictoryActionRef.current)')).toBeLessThan(
      flow.indexOf('if (queuedPostVictoryIntrosRef.current.length > 0)')
    );
    // And it must NOT advance the queue (that would null the live intro and
    // fire the action under the player's finger).
    const guard = flow.slice(
      flow.indexOf('if (pendingPostVictoryActionRef.current)'),
      flow.indexOf('if (queuedPostVictoryIntrosRef.current.length > 0)')
    );
    expect(guard).not.toContain('advanceQueuedPostVictoryIntro');
  });

  test('the plain exit clears any presenting intro WITHOUT marking the one-time beat seen', () => {
    const flow = exitFlow();
    const tail = flow.slice(flow.lastIndexOf('setPostVictoryIntro(null);'));
    expect(tail).toContain('action();');
    // Marking lives only in dismissPostVictoryIntro — an interruption must
    // never consume a beat unseen.
    expect(flow).not.toContain('markStarterIntroSeen');
    expect(flow).not.toContain('markModifierStackingIntroSeen');
    expect(flow).not.toContain('markLexiconIntroSeen');
  });

  test('hardware back is swallowed while an intro owns the puzzle screen, above the WON branch', () => {
    const back = sliceBetween("BackHandler.addEventListener('hardwareBackPress'", 'return () => subscription.remove();');
    expect(back).toMatch(/if \(currentScreen === 'puzzle' && postVictoryIntro\) \{\s*return true;/);
    expect(back.indexOf("currentScreen === 'puzzle' && postVictoryIntro")).toBeLessThan(
      back.indexOf('puzzle.gameState === GameState.WON')
    );
    // Back must not dismiss: dismissal marks the beat seen and fires the
    // parked action.
    expect(back).not.toMatch(/dismissPostVictoryIntro\(\);/);
  });

  test('deep links and notification taps refuse to route over a live intro', () => {
    const link = sliceBetween('const handleIncomingLink = useCallback', 'const handleIncomingLinkRef');
    expect(link).toMatch(/if \(postVictoryIntro\) \{\s*return;/);
    const notif = sliceBetween('routeNotificationTargetRef.current = (target: unknown)', "} else if (target === 'home')");
    expect(notif).toMatch(/if \(postVictoryIntro\) \{\s*return;/);
  });
});

describe('a timed-out speed run is finished, not resumable', () => {
  test('the buzzer clears the mid-puzzle autosave', () => {
    const timeUp = sliceBetween('const onSpeedTimeUp = useCallback', 'const [speedTimer, speedTimerActions]');
    expect(timeUp).toContain('setPuzzleGameState(GameState.GAME_OVER);');
    expect(timeUp).toContain('clearPuzzleState().catch(() => {});');
  });

  test('a restore refuses a speed save with a second or less left', () => {
    expect(APP_TSX).toMatch(/const expiringSpeedSave =\s*saved\?\.speedMode === true &&/);
    expect(APP_TSX).toMatch(/saved\.speedTimeRemainingSec <= 1;/);
    expect(APP_TSX).toContain('!saved.isPlayingDaily && !expiringSpeedSave');
  });

  test('the clock never re-arms over a completed board during the victory record', () => {
    // stopSpeedTimer + setSpeedRound land in the same batch as a still-PLAYING
    // gameState, and speedRound is a dep — the victory lock is what holds it.
    expect(APP_TSX).toMatch(
      /if \(!puzzle\.speedMode \|\| puzzle\.gameState !== GameState\.PLAYING \|\| victoryFlow\.isProcessingVictory\)/
    );
  });
});

describe('the private pace record stays untimed', () => {
  test('speed boards are excluded (they report variant standard)', () => {
    expect(APP_TSX).toMatch(
      /result\.solveTimeMs != null &&\s*result\.variant === 'standard' &&\s*result\.speed !== true &&\s*!isPlayingDaily/
    );
  });
});

describe('the victory receipt names the difficulty the board was PAID at', () => {
  test('one value feeds both recordVictory and the modal', () => {
    expect(APP_TSX).toMatch(
      /const rewardDifficulty: Difficulty =\s*isPlayingDaily \? 'HARD' : puzzle\.isSharedChallenge \? 'EASY' : puzzle\.difficulty;/
    );
    expect(APP_TSX).toContain('difficulty={rewardDifficulty}');
    // The old split (a shared link priced EASY but labelled with the player's
    // preference) must not come back.
    expect(APP_TSX).not.toContain("difficulty={isPlayingDaily ? 'HARD' : puzzle.difficulty}");
  });
});

describe('the instant 2x claim cannot be double-tapped', () => {
  test('a synchronous in-flight latch guards the awaited credit', () => {
    const handler = sliceBetween('const handleRewardedDouble = useCallback', 'const handleSpeedRescue');
    expect(handler).toContain('|| rewardedDoubleInFlightRef.current) return;');
    expect(handler.indexOf('rewardedDoubleInFlightRef.current = true;')).toBeLessThan(
      handler.indexOf('await awardBonusAmber')
    );
    // Released only on failure — the latch covers the render gap on success.
    expect(handler.match(/rewardedDoubleInFlightRef\.current = false;/g) || []).toHaveLength(1);
  });

  test('the latch is released wherever the claim flag is reset (or the 2x dies for the session)', () => {
    const resets = APP_TSX.match(/setVictoryDoubleClaimed\(false\);/g) || [];
    const releases = APP_TSX.match(/rewardedDoubleInFlightRef\.current = false;/g) || [];
    // One release per reset, plus the one inside the failure path.
    expect(releases.length).toBe(resets.length + 1);
  });
});

describe('a daily solve belongs to the board it was played on', () => {
  test('the served date is retained and expired boards cannot rank', () => {
    expect(APP_TSX).toContain('dailyBoardDateRef.current = daily.date;');
    const resolver = sliceBetween('const resolveDailyBoardDate = useCallback', 'const startDailyBoard');
    expect(resolver).toContain('return dailyBoardDateRef.current ?? getLocalDateString();');
    expect(APP_TSX).toContain('[0, 1].includes(daysAgoLocal(date))');
  });

  test('the leaderboard, the local ladder and the share card all use it', () => {
    expect(APP_TSX).toMatch(/const date = resolveDailyBoardDate\(\);/);
    expect(APP_TSX).toContain('dailyDate: isPlayingDaily ? resolveDailyBoardDate() : undefined');
    // The wall-clock forms must not creep back in.
    expect(APP_TSX).not.toContain('const date = getLocalDateString();');
    expect(APP_TSX).not.toContain('dailyDate: isPlayingDaily ? getLocalDateString() : undefined');
  });
});
