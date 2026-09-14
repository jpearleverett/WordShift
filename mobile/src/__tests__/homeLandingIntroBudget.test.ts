/**
 * One automatic Fox intro per home landing (ftue-4).
 *
 * The one-time home intros (challenge, daily, pit nudge, journal spotlight,
 * first gated room) share one guard set, so each used to fire the instant the
 * previous card closed. A player who chained NEXT LEVEL through sessions 1-2
 * met the journal spotlight (which also opened the journal modal by itself),
 * then the daily intro, back to back on the first landing the harvest gate
 * forced. Now the first eligible intro claims the landing and the rest wait
 * for the next mount, and the spotlight points at the icon instead of opening
 * the journal underneath itself.
 *
 * Executes HomeScreen's actual effects (sliced from the source) with a
 * per-effect useEffect harness, the pattern homeOfferingIntro.test.ts uses.
 */
import fs from 'fs';
import path from 'path';

const home = fs.readFileSync(path.join(__dirname, '../components/home/HomeScreen.tsx'), 'utf8');
const start = home.indexOf('  // Challenge Mode intro (one-time, Fox-led, after 15 puzzles).');
const end = home.indexOf('  // First-harvest home safety net', start);
// The pit-nudge effect carries one TypeScript cast (`as 1 | 2 | 3 | 4`) that
// `new Function` cannot parse; it is type-only, so it is stripped here.
const source = home.slice(start, end).replace(/ as 1 \| 2 \| 3 \| 4/g, '');

function createHarness(seen: Partial<Record<'challenge' | 'daily' | 'pit' | 'journal' | 'gated', boolean>> = {}) {
  const fox = { id: 'fox' };
  const scope = {
    hasHomeProgress: true, isOnboarding: false, showIntroDialogue: false,
    introOverrideLines: null as string[] | null, introOpening: false, pendingAnimalIntroCount: 0,
    houseGiftBusy: false, homePhase: 0, homePuzzleCount: 9, pitPhaseReady: false,
    animals: [fox], ANIMALS: [fox],
    landingIntroSpentRef: { current: false },
    introSurfaceBusyRef: { current: false },
    unlockFlow: { nextUnlock: null as null | { type: string; minPuzzles?: number; name: string }, showRoomUnlock: null },
    shouldShowJournalButton: true, journalSpotlightActive: false,
    GATED_ROOM_INTRO_SETTLE_MS: 500,
    isDailyChallengeUnlocked: (count: number) => count >= 8,
    hasSeenChallengeIntro: jest.fn(async () => seen.challenge ?? false),
    hasSeenDailyChallengeIntro: jest.fn(async () => seen.daily ?? false),
    hasSeenPitNudge: jest.fn(async () => seen.pit ?? false),
    hasSeenJournalIntro: jest.fn(async () => seen.journal ?? false),
    hasSeenGatedUnlockIntro: jest.fn(async () => seen.gated ?? false),
    getChallengeIntroLines: () => ['challenge'],
    getDailyChallengeIntroLines: () => ['daily'],
    getFoxPitNudgeLines: () => ['pit'],
    getJournalIntroLines: () => ['journal one', 'journal two'],
    getGatedRoomIntroLines: () => ['gated'],
    setIntroAnimal: jest.fn(), setIntroDialogueIndex: jest.fn(),
    setIntroOverrideLines: jest.fn(), setIntroContext: jest.fn(),
    setShowIntroDialogue: jest.fn(),
    setShowJournalModal: jest.fn(),
    setJournalSpotlightLines: jest.fn(), setJournalSpotlightIndex: jest.fn(),
    setJournalSpotlightActive: jest.fn(),
  };
  const effects: { deps?: unknown[]; cleanup?: (() => void) | undefined }[] = [];
  let index = 0;
  const useEffect = (setup: () => (() => void) | undefined, dependencies: unknown[]) => {
    const slot = effects[index] ?? (effects[index] = {});
    index += 1;
    if (slot.deps?.every((value, i) => Object.is(value, dependencies[i]))) return;
    slot.cleanup?.();
    slot.deps = dependencies;
    slot.cleanup = setup();
  };
  const run = new Function('useEffect', ...Object.keys(scope), source);
  return {
    scope,
    render: () => { index = 0; run(useEffect, ...Object.values(scope)); },
    unmount: () => effects.forEach(slot => slot.cleanup?.()),
  };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('the source slice covers the five budgeted intros', () => {
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  for (const context of ['challenge_intro', 'daily_challenge_intro', 'pit_nudge', 'gated_room_intro']) {
    expect(source).toContain(`setIntroContext('${context}')`);
  }
  expect(source).toContain('setJournalSpotlightActive(true)');
});

test('a landing with the daily AND the journal pending shows ONE intro, in declaration order', async () => {
  const harness = createHarness();
  harness.render();
  await jest.advanceTimersByTimeAsync(1000);

  // The daily intro is declared before the journal spotlight, so it claims
  // the landing; the spotlight stays down.
  expect(harness.scope.setIntroContext).toHaveBeenCalledTimes(1);
  expect(harness.scope.setIntroContext).toHaveBeenCalledWith('daily_challenge_intro');
  expect(harness.scope.setShowIntroDialogue).toHaveBeenCalledWith(true);
  expect(harness.scope.setJournalSpotlightActive).not.toHaveBeenCalled();
  expect(harness.scope.landingIntroSpentRef.current).toBe(true);

  // Closing the card re-runs every effect (showIntroDialogue flips back), and
  // the spotlight must NOT take the freed surface on the same landing.
  harness.scope.showIntroDialogue = true;
  harness.render();
  harness.scope.showIntroDialogue = false;
  harness.render();
  await jest.advanceTimersByTimeAsync(2000);
  expect(harness.scope.setJournalSpotlightActive).not.toHaveBeenCalled();
  expect(harness.scope.setIntroContext).toHaveBeenCalledTimes(1);
  harness.unmount();
});

test('the next landing (a fresh mount) lets the waiting spotlight fire', async () => {
  const harness = createHarness({ daily: true });
  harness.render();
  await jest.advanceTimersByTimeAsync(1000);
  expect(harness.scope.setJournalSpotlightActive).toHaveBeenCalledWith(true);
  expect(harness.scope.setJournalSpotlightLines).toHaveBeenCalledWith(['journal one', 'journal two']);
  expect(harness.scope.setIntroContext).not.toHaveBeenCalled();
  harness.unmount();
});

test('the journal spotlight no longer opens the journal modal by itself', async () => {
  const harness = createHarness({ daily: true });
  harness.render();
  await jest.advanceTimersByTimeAsync(1000);
  expect(harness.scope.setJournalSpotlightActive).toHaveBeenCalledWith(true);
  expect(harness.scope.setShowJournalModal).not.toHaveBeenCalled();
  harness.unmount();
});

test('a flag that resolves after another intro claimed the landing opens nothing', async () => {
  // Both the daily and the journal reads are in flight at once; the daily
  // resolves first and spends the budget, so the journal read must yield even
  // though it started before the surface was claimed.
  let resolveJournal!: (seen: boolean) => void;
  const harness = createHarness();
  harness.scope.hasSeenJournalIntro = jest.fn(() => new Promise<boolean>(resolve => { resolveJournal = resolve; }));
  harness.render();
  await jest.advanceTimersByTimeAsync(0);
  expect(harness.scope.setIntroContext).toHaveBeenCalledWith('daily_challenge_intro');
  resolveJournal(false);
  await jest.advanceTimersByTimeAsync(0);
  expect(harness.scope.setJournalSpotlightActive).not.toHaveBeenCalled();
  harness.unmount();
});

test('the gated-room intro keeps its settle delay and also honours the budget', async () => {
  const harness = createHarness({ daily: true, journal: true });
  harness.scope.homePuzzleCount = 16;
  harness.scope.unlockFlow = { nextUnlock: { type: 'room', minPuzzles: 19, name: 'Jungle Hammock' }, showRoomUnlock: null };
  harness.render();
  await jest.advanceTimersByTimeAsync(1000);
  // 16 solves: the challenge intro (>= 15) is declared first and claims the
  // landing; the gated-room settle timer fires into a spent budget.
  expect(harness.scope.setIntroContext).toHaveBeenCalledTimes(1);
  expect(harness.scope.setIntroContext).toHaveBeenCalledWith('challenge_intro');
  harness.unmount();

  const next = createHarness({ daily: true, journal: true, challenge: true });
  next.scope.homePuzzleCount = 16;
  next.scope.unlockFlow = { nextUnlock: { type: 'room', minPuzzles: 19, name: 'Jungle Hammock' }, showRoomUnlock: null };
  next.render();
  await jest.advanceTimersByTimeAsync(499);
  expect(next.scope.setIntroContext).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  await jest.advanceTimersByTimeAsync(0);
  expect(next.scope.setIntroContext).toHaveBeenCalledWith('gated_room_intro');
  next.unmount();
});

test('a player-triggered resident introduction does not spend the landing budget', () => {
  // Only the automatic one-time intros read the ref; presentAnimalIntroduction
  // (a purchase the player just made) must stay outside it.
  const intro = home.slice(home.indexOf('const presentAnimalIntroduction'), home.indexOf('// Dialogue flow hook'));
  expect(intro).not.toContain('landingIntroSpentRef');
  for (const context of ['challenge_intro', 'daily_challenge_intro', 'pit_nudge', 'gated_room_intro']) {
    const at = source.indexOf(`setIntroContext('${context}')`);
    expect(source.lastIndexOf('landingIntroSpentRef.current = true;', at)).toBeGreaterThan(-1);
  }
});
