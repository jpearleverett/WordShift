/**
 * Home-surface regression pins (2026-09 sweep).
 *
 * These six fixes all live on surfaces with no renderer in this test
 * environment (HomeScreen, RoomView, CelebrationConfetti, SettingsScreen), and
 * each of them is a shape that reads as correct until you know its history.
 * Source pins are the honest guard here: they name the exact line that was
 * wrong and fail loudly if it comes back.
 */

import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const CONFETTI = read('components/home/CelebrationConfetti.tsx');
const ROOM_VIEW = read('components/home/RoomView.tsx');
const HOME = read('components/home/HomeScreen.tsx');
const UNLOCK_FLOW = read('hooks/useUnlockFlow.ts');
const SETTINGS = read('components/SettingsScreen.tsx');

describe('CelebrationConfetti no longer restarts itself every render', () => {
  // HomeScreen hands it an inline arrow, so listing onComplete in the deps made
  // the effect's identity change on every parent render. A character purchase
  // re-renders home every 300ms (the intro card's mouth-flap interval), which
  // is shorter than the 2500ms completion timer: the burst relaunched ~3x/sec
  // and never completed for as long as the new friend's intro was open, while
  // ~150 unstopped native drivers were spawned each time.
  test('the effect responds to scene geometry and motion preferences, never callback identity', () => {
    const dependencies = CONFETTI.match(/}, \[phase,([^\]]+)\]\);/)?.[1] ?? '';
    expect(dependencies).toContain('SCREEN_WIDTH');
    expect(dependencies).toContain('SCREEN_HEIGHT');
    expect(dependencies).toContain('reducedMotion');
    expect(dependencies).not.toContain('onComplete');
  });

  test('completion fires through a ref, so the callback stays current without re-arming', () => {
    expect(CONFETTI).toMatch(/onCompleteRef\.current\s*=\s*onComplete;/);
    expect(CONFETTI).toMatch(/setTimeout\(\(\)\s*=>\s*onCompleteRef\.current\(\),\s*2500\)/);
    expect(CONFETTI).toMatch(/setTimeout\(\(\)\s*=>\s*onCompleteRef\.current\(\),\s*400\)/);
  });

  test('cleanup stops the animations it started, not just the timer', () => {
    expect(CONFETTI).toMatch(/running\.push\(anim\)/);
    expect(CONFETTI).toMatch(/running\.forEach\(a\s*=>\s*a\.stop\(\)\)/);
  });
});

describe('the in-world locked room card tells the truth about a reserved or gated room', () => {
  // Reserving spends the FULL cost, but the ghost room kept rendering
  // "Build [gem] 450" beside the player's now-depleted balance, so the
  // reservation read as a failure or a double charge.
  test('the reserved branch drops both the price row and the balance row', () => {
    const reservedBranch = ROOM_VIEW.slice(
      ROOM_VIEW.indexOf('{isReserved ? ('),
      ROOM_VIEW.indexOf(') : unlockCost !== null ? (')
    );
    expect(reservedBranch.length).toBeGreaterThan(0);
    expect(reservedBranch).not.toContain('lockedCostRow');
    expect(reservedBranch).not.toContain('lockedBalanceRow');
    expect(reservedBranch).not.toContain('AMBER_ICON');
  });

  test('the reserved tick is the carved chrome mark, never a typed glyph', () => {
    expect(ROOM_VIEW).toContain('CHROME_ICONS.check');
    expect(ROOM_VIEW).not.toContain('✓');
  });

  test('a gated room adds the wait line WITHOUT dropping the balance beneath it', () => {
    const costBranch = ROOM_VIEW.slice(
      ROOM_VIEW.indexOf(') : unlockCost !== null ? ('),
      ROOM_VIEW.indexOf("Tap to unlock")
    );
    // The price row is unconditional in this branch: still true, still owed.
    expect(costBranch).toContain('styles.lockedCostRow');
    // The balance row is gated on AFFORDABILITY alone. Branching on the level
    // gate first made it unreachable for a gated player who also could not yet
    // afford the room — which is most of the wait, and the number they are
    // actually working on. The two constraints are independent; show both.
    expect(costBranch).toMatch(/\{!affordable && \(\s*<View style=\{styles\.lockedBalanceRow\}>/);
    // ...and the wait line renders after it, never instead of it.
    expect(costBranch.indexOf('lockedBalanceRow')).toBeLessThan(costBranch.indexOf('{cardSub'));
    expect(costBranch).toContain("{cardSub !== '' && (");
    // No copy is typed on the card: it all comes from homeWorldData.
    expect(costBranch).not.toContain("'Tap to build'");
    expect(costBranch).not.toContain('Opens at level');
  });

  test('the short card line comes from homeWorldData, so card and modal cannot drift', () => {
    expect(ROOM_VIEW).toContain('getLockedRoomCardSub');
  });

  test('the spoken label uses the long-form modal copy (it is announced, not laid out)', () => {
    expect(ROOM_VIEW).toContain('const lockedA11yLabel =');
    expect(ROOM_VIEW).toContain('getReservedArrivalText(gateMinPuzzles, puzzlesSolved)');
    expect(ROOM_VIEW).toContain('getReserveGateText(gateMinPuzzles, puzzlesSolved)');
    expect(ROOM_VIEW).toContain('accessibilityLabel={lockedA11yLabel}');
  });

  test('HomeScreen hands the world the reservation, the solves AND the weighted progress', () => {
    expect(HOME).toContain('reservedUnlockId={unlockFlow.reservedUnlockId}');
    expect(HOME).toContain('puzzlesSolved={progress.puzzlesSolved}');
    // Weighted progress too: "gated" is not only the level board, and the card
    // must refuse for the same reason isUnlockAvailable does.
    expect(HOME).toContain('phaseProgress={progress.phaseProgress}');
  });
});

describe('the house-completion cinematic survives an interrupted delivery', () => {
  // houseCompleted is WORLD STATE (the endgame chain reads it) so it is still
  // written at detection; houseCompletionCelebrated is DELIVERY and is written
  // only when the cutscene actually plays. One flag, written at detection with
  // delivery in the state of a screen that unmounts on every navigation, lost
  // the payoff of the 4,615-amber house arc forever if the player tapped PLAY.
  test('the beat re-arms from persisted state, outside the completion guard', () => {
    expect(HOME).toContain('if (houseIsWhole && !progressData.houseCompletionCelebrated)');
  });

  test('the celebrated flag is written on delivery, immediately before the cinematic', () => {
    const effect = HOME.slice(HOME.indexOf('setPendingHouseCompletion(false);'));
    const markAt = effect.indexOf('markHouseCompletionCelebrated()');
    const fireAt = effect.indexOf('onHouseCompleted()');
    expect(markAt).toBeGreaterThan(-1);
    expect(fireAt).toBeGreaterThan(markAt);
  });
});

describe('collection achievements are checked where the unlock counts actually move', () => {
  // first_animal / animals_5 / all_animals / all_rooms key on nothing but the
  // unlock counts, and those counts only change on the home screen — which ran
  // no achievement check at all, so 'Full House' read LOCKED with its amber
  // uncredited until the player happened to win another puzzle.
  test('every path that changes the counts calls back', () => {
    expect(UNLOCK_FLOW).toContain('onUnlockCompleted?: () => void;');
    // purchase, skip-the-gate, speed-up-a-reservation.
    expect(UNLOCK_FLOW.match(/onUnlockCompleted\?\.\(\)/g)?.length).toBe(3);
    // ...and the reserved room that builds itself at its gate, in HomeScreen.
    expect(HOME).toContain('unlockCompletedRef.current?.();');
    expect(HOME).toContain('useLayoutEffect(() => { unlockCompletedRef.current = onUnlockCompleted; });');
    expect(HOME).toContain('onUnlockCompleted?: () => void;');
  });
});

describe('a quest claim no longer poisons the persisted quest-generation context', () => {
  // loadWeeklyQuests STORES whatever context it is handed. The post-claim
  // refresh passed a partial one (no unlockedVariants), overwriting the full
  // context the modal had just written, so a context-less regeneration after a
  // period rollover generated a whole day's board with no variant quests.
  test('the post-claim refresh passes no context at all', () => {
    const claim = HOME.slice(HOME.indexOf('const handleClaimQuest'), HOME.indexOf('const handleDoubleQuestReward'));
    expect(claim).toContain('await loadWeeklyQuests(progress.currentPhase);');
    expect(claim).not.toContain('unlockedAnimalCount:');
  });

  test('the two context-FULL callers still carry unlockedVariants', () => {
    expect(HOME.match(/unlockedVariants: getUnlockedVariants\(/g)?.length).toBe(2);
  });
});

describe('SettingsScreen: the destructive control and the deliberate restores', () => {
  test('Reset All announces as a button, with the warning delivered as a hint', () => {
    const row = SETTINGS.slice(SETTINGS.indexOf('style={styles.dangerRow}') - 200, SETTINGS.indexOf('Reset All Progress</Text>'));
    expect(row).toContain('accessibilityRole="button"');
    expect(row).toContain('accessibilityLabel="Reset All Progress"');
    expect(row).toContain('accessibilityHint=');
  });

  test('a recovery-code restore rebuilds the running session, like the conflict restore does', () => {
    const handler = SETTINGS.slice(
      SETTINGS.indexOf('const handleRestoreFromCode'),
      SETTINGS.indexOf('const refreshStreakFreeze')
    );
    expect(handler).toContain('onCloudRestored?.();');
  });

  test('the reset marker is stamped before the upload and cleared only when it lands', () => {
    const reset = SETTINGS.slice(SETTINGS.indexOf('export async function performFullReset'), SETTINGS.indexOf('export async function performNewCycle'));
    const stampAt = reset.indexOf('await commitFullLocalReset()');
    const uploadAt = reset.indexOf('await uploadToCloud(true)');
    expect(stampAt).toBeGreaterThan(-1);
    expect(uploadAt).toBeGreaterThan(stampAt);
    // Only the cloud owner can acknowledge the exact marker it uploaded.
    // A second unconditional clear here could erase a newer reset.
    expect(reset).not.toContain('removeItem(LOCAL_RESET_MARKER_KEY)');
  });
});
