import fs from 'fs';
import path from 'path';

// Execute HomeScreen's actual, dependency-free effect without importing the
// native house renderer. This covers timer/storage races beyond a source pin.
const home = fs.readFileSync(path.join(__dirname, '../components/home/HomeScreen.tsx'), 'utf8');
const start = home.indexOf('  // One-time invitation to The Offering');
const source = home.slice(
  start,
  home.indexOf('  // Ambient home line', start),
);

function createHarness(readSeen: () => Promise<boolean>) {
  const fox = { id: 'fox' };
  const scope = {
    hasHomeProgress: true, isOnboarding: false, showIntroDialogue: false,
    introOverrideLines: null, homePhase: 4, storyOverlayActive: false,
    dialogueFlow: { showDialogue: false }, pendingHouseCompletion: false,
    pitPhaseReady: false, animals: [fox], ANIMALS: [fox],
    isSacrificeAvailable: () => true, hasSeenOfferingIntro: jest.fn(readSeen),
    introSurfaceBusyRef: { current: false },
    getOfferingIntroLines: () => ['An invitation'],
    setIntroAnimal: jest.fn(), setIntroDialogueIndex: jest.fn(),
    setIntroOverrideLines: jest.fn(), setIntroContext: jest.fn(),
    setShowIntroDialogue: jest.fn(),
  };
  let cleanup: (() => void) | undefined;
  let previousDependencies: unknown[] | undefined;
  const useEffect = (setup: () => (() => void) | undefined, dependencies: unknown[]) => {
    if (previousDependencies?.every((value, index) => Object.is(value, dependencies[index]))) return;
    cleanup?.();
    previousDependencies = dependencies;
    cleanup = setup();
  };
  const run = new Function('useEffect', ...Object.keys(scope), source);
  return {
    scope,
    render: () => run(useEffect, ...Object.values(scope)),
    unmount: () => cleanup?.(),
  };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('an active ceremony postpones the invitation and its end re-arms the quiet timer', async () => {
  const harness = createHarness(async () => false);
  harness.scope.storyOverlayActive = true;
  harness.render();
  await jest.advanceTimersByTimeAsync(1000);
  expect(harness.scope.hasSeenOfferingIntro).not.toHaveBeenCalled();

  harness.scope.storyOverlayActive = false;
  harness.render();
  await jest.advanceTimersByTimeAsync(699);
  expect(harness.scope.setShowIntroDialogue).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  expect(harness.scope.setShowIntroDialogue).toHaveBeenCalledTimes(1);
  expect(harness.scope.setShowIntroDialogue).toHaveBeenCalledWith(true);
  expect(harness.scope.setIntroContext).toHaveBeenCalledWith('offering_intro');
  harness.unmount();
});

test('a surface claimed while the saved flag is loading prevents a late invitation', async () => {
  let resolveSeen!: (seen: boolean) => void;
  const harness = createHarness(() => new Promise(resolve => { resolveSeen = resolve; }));
  harness.render();
  await jest.advanceTimersByTimeAsync(700);
  expect(harness.scope.hasSeenOfferingIntro).toHaveBeenCalledTimes(1);
  harness.scope.introSurfaceBusyRef.current = true;
  resolveSeen(false);
  await jest.advanceTimersByTimeAsync(0);
  expect(harness.scope.setShowIntroDialogue).not.toHaveBeenCalled();
  harness.unmount();
});

test('leaving home during the saved-flag read cannot open an orphaned modal', async () => {
  let resolveSeen!: (seen: boolean) => void;
  const harness = createHarness(() => new Promise(resolve => { resolveSeen = resolve; }));
  harness.render();
  await jest.advanceTimersByTimeAsync(700);
  harness.unmount();
  resolveSeen(false);
  await jest.advanceTimersByTimeAsync(0);
  expect(harness.scope.setShowIntroDialogue).not.toHaveBeenCalled();
});
