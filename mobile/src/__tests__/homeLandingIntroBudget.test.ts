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

function createHarness(seen: Partial<Record<'challenge' | 'daily' | 'pit' | 'journal' | 'gated' | 'fullHouse', boolean>> = {}) {
  const fox = { id: 'fox', hasNewDialogue: false };
  const scope = {
    hasHomeProgress: true, isOnboarding: false, showIntroDialogue: false,
    introOverrideLines: null as string[] | null, introOpening: false, pendingAnimalIntroCount: 0,
    houseGiftBusy: false, homePhase: 0, homePuzzleCount: 9, pitPhaseReady: false,
    animals: [fox] as { id: string; hasNewDialogue?: boolean }[], ANIMALS: [fox],
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
    hasSeenFullHouseIntro: jest.fn(async () => seen.fullHouse ?? false),
    // The full-house beat: everyone home, still one phase below the reveal.
    // Defaults put the harness OUTSIDE it (phase 0, house not whole), so the
    // existing budget cases are unchanged and only the cases below opt in.
    FULL_HOUSE_PHASE: 4,
    houseIsWhole: false,
    getFullHouseIntroLines: jest.fn((waiting: number) => [`full house ${waiting}`]),
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

test('the source slice covers the six budgeted intros', () => {
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  for (const context of ['challenge_intro', 'daily_challenge_intro', 'pit_nudge', 'gated_room_intro', 'full_house_intro']) {
    expect(source).toContain(`setIntroContext('${context}')`);
  }
  expect(source).toContain('setJournalSpotlightActive(true)');
});

test('the full-house beat fires when the last resident is in, and spends the landing', async () => {
  // Everyone home, world still at Phase 3: the reveal is waiting on nothing
  // but the next offering, and this is the last moment the player can go and
  // let anyone finish (afterwards the victory screen hides every exit and the
  // pit seals itself). Nothing else is pending here, so the beat is free to
  // take the landing.
  const harness = createHarness({ daily: true, journal: true });
  harness.scope.homePhase = 3;
  harness.scope.houseIsWhole = true;
  harness.render();
  await jest.advanceTimersByTimeAsync(1000);

  expect(harness.scope.setIntroContext).toHaveBeenCalledWith('full_house_intro');
  expect(harness.scope.landingIntroSpentRef.current).toBe(true);
  // The beat is told how many home badges are LIT, not how many residents have
  // unread lines. The two differ after a full round of visits, when everyone is
  // inside their dialogue cooldown and every badge is dark, and the badge count
  // is the one that matches what the player sees when they look up at the house.
  expect(harness.scope.getFullHouseIntroLines).toHaveBeenCalledWith(0);
  expect(harness.scope.setIntroOverrideLines).toHaveBeenCalledWith(['full house 0']);
  harness.unmount();
});

test('the full-house beat is told how many residents are actually waiting', async () => {
  const harness = createHarness({ daily: true, journal: true });
  harness.scope.homePhase = 3;
  harness.scope.houseIsWhole = true;
  harness.scope.animals = [
    { id: 'fox', hasNewDialogue: true },
    { id: 'owl', hasNewDialogue: true },
    { id: 'sloth', hasNewDialogue: false },
  ];
  harness.render();
  await jest.advanceTimersByTimeAsync(1000);
  expect(harness.scope.getFullHouseIntroLines).toHaveBeenCalledWith(2);
  harness.unmount();
});

test('the new resident\'s own introduction wins the window it completes the house in', async () => {
  // useUnlockFlow publishes the new roster (through loadAllData) BEFORE arming
  // that resident's introduction on a 300ms timer, so the beat sees a whole
  // house first. Without the settle re-check Ember would land on the
  // newcomer's doorstep and announce that somebody had something to say while
  // displacing the one about to say it.
  const harness = createHarness({ daily: true, journal: true });
  harness.scope.homePhase = 3;
  harness.scope.houseIsWhole = true;
  harness.render();

  // The introduction claims the shared surface inside the settle window.
  await jest.advanceTimersByTimeAsync(300);
  harness.scope.introSurfaceBusyRef.current = true;
  await jest.advanceTimersByTimeAsync(1000);
  expect(harness.scope.setIntroContext).not.toHaveBeenCalled();

  // Its flag is only written when the card closes, so the beat is still owed
  // and lands on the next quiet landing.
  harness.scope.introSurfaceBusyRef.current = false;
  harness.unmount();
  const next = createHarness({ daily: true, journal: true });
  next.scope.homePhase = 3;
  next.scope.houseIsWhole = true;
  next.render();
  await jest.advanceTimersByTimeAsync(1000);
  expect(next.scope.setIntroContext).toHaveBeenCalledWith('full_house_intro');
  next.unmount();
});

test('the full-house beat stays down while anyone is still missing', async () => {
  const harness = createHarness({ daily: true, journal: true });
  harness.scope.homePhase = 3;
  harness.scope.houseIsWhole = false;
  harness.render();
  await jest.advanceTimersByTimeAsync(1000);
  expect(harness.scope.setIntroContext).not.toHaveBeenCalled();
  harness.unmount();
});

test('the full-house beat stays down once the reveal has been offered', async () => {
  // pitPhaseReady means a transition is already pending, so "go and listen
  // first" is no longer something the player can act on: the victory screen
  // has hidden every exit and the pit seals itself.
  //
  // The pit nudge is marked SEEN here on purpose. It is declared just above
  // this effect and awaits one fewer promise, so leaving it eligible lets it
  // take the landing first and the case passes with the pitPhaseReady guard
  // deleted. With it suppressed the full-house beat is the only candidate for
  // the budget, and the guard is what has to hold the beat down.
  const harness = createHarness({ daily: true, journal: true, pit: true });
  harness.scope.homePhase = 3;
  harness.scope.pitPhaseReady = true;
  harness.scope.houseIsWhole = true;
  harness.render();
  await jest.advanceTimersByTimeAsync(1000);
  expect(harness.scope.setIntroContext).not.toHaveBeenCalled();
  expect(harness.scope.landingIntroSpentRef.current).toBe(false);
  harness.unmount();
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
