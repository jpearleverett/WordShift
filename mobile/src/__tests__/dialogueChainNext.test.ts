/**
 * Tests for the "visit next friend" dialogue chain (Phase 3-4 treadmill fix):
 *
 * 1. Pure resolver (findNextAnimalWithNews): display-order walk starting
 *    after the current animal, wrap-around, exclusion of the current animal,
 *    locked animals skipped, none-available returns null.
 * 2. Hook level (useDialogueFlow): getNextAnimalWithNews only offers an
 *    animal whose dialogue is genuinely available right now (badge news
 *    signal + the synchronous session-budget equivalent of
 *    checkDialogueAvailability), and handleVisitNextAnimal runs the EXACT
 *    Close bookkeeping for the current animal (terminal-read advancement,
 *    warm session — no endSession) before opening the next animal through
 *    the normal handleAnimalTap path.
 *
 * Uses the repo's manual React-hook mock convention (see
 * dialogueFlowPagination.test.ts): hooks run synchronously in Node and the
 * hook is re-invoked ("re-rendered") after each action to read derived values.
 */

// --- Mock React hooks to run synchronously in Node ---
const stateStore: Map<number, unknown> = new Map();
let stateIndex = 0;
let effectCallbacks: (() => void)[] = [];
const refStore: Map<number, { current: unknown }> = new Map();
let refIndex = 0;

function resetHookState() {
  stateStore.clear();
  refStore.clear();
  stateIndex = 0;
  refIndex = 0;
  effectCallbacks = [];
}

function rewindHookIndices() {
  stateIndex = 0;
  refIndex = 0;
}

jest.mock('react', () => ({
  useState: (initial: unknown) => {
    const idx = stateIndex++;
    if (!stateStore.has(idx)) {
      stateStore.set(idx, initial);
    }
    const value = stateStore.get(idx);
    const setter = (valOrFn: unknown) => {
      if (typeof valOrFn === 'function') {
        stateStore.set(idx, (valOrFn as (prev: unknown) => unknown)(stateStore.get(idx)));
      } else {
        stateStore.set(idx, valOrFn);
      }
    };
    return [value, setter];
  },
  useEffect: (fn: () => void, _deps: unknown[]) => {
    effectCallbacks.push(fn);
  },
  useRef: (initial: unknown) => {
    const idx = refIndex++;
    if (!refStore.has(idx)) {
      refStore.set(idx, { current: initial });
    }
    return refStore.get(idx)!;
  },
  useCallback: (fn: Function, _deps: unknown[]) => fn,
}));

jest.mock('react-native', () => ({
  Animated: {
    Value: jest.fn().mockImplementation(() => ({
      setValue: jest.fn(),
      interpolate: jest.fn(),
    })),
    spring: jest.fn(() => ({ start: jest.fn() })),
    timing: jest.fn(() => ({ start: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn() })),
  },
}));

jest.mock('../services/haptics', () => ({
  hapticLight: jest.fn(),
  hapticSelection: jest.fn(),
}));

jest.mock('../services/settings', () => ({
  getSettingsSync: jest.fn(() => ({ reducedMotion: true })),
}));

jest.mock('../services/animalDialogue', () => ({
  getCurrentDialogue: jest.fn(() => ({ text: 'A short line.' })),
  hasMoreDialogues: jest.fn(() => true),
  resolveDialogueIndex: jest.fn((_t: string, i: number) => i),
  getCrossAnimalReference: jest.fn(() => null),
  getTriggerWordReaction: jest.fn(() => null),
  getVariantTutorialDialogue: jest.fn(() => null),
  TUTORIAL_CALLBACK_DIALOGUES: ['tutorial callback line'],
  getCoordinatedEventLine: jest.fn(() => null),
  getWordThresholdDialogue: jest.fn(() => null),
  getTotalDialogueCount: jest.fn(() => 24),
  getSacrificeReaction: jest.fn(() => null),
  getPhase2ExtraDialogues: jest.fn(() => []),
  getPhase2PoolLine: jest.fn(() => null),
  phase2PoolHasNew: jest.fn(() => false),
  getAndMarkNarrativeSeedPage: jest.fn(async () => null),
  getAndMarkNarrativeCallbackPage: jest.fn(async () => null),
  getPhase2PoolCursors: jest.fn(async () => ({})),
  advancePhase2PoolCursor: jest.fn(async () => 0),
}));

jest.mock('../services/dialogueSession', () => ({
  checkDialogueAvailability: jest.fn(async () => ({ available: true })),
  recordDialogue: jest.fn(async () => {}),
  endSession: jest.fn(async () => {}),
  getSession: jest.fn(() => null),
  getSessionStatus: jest.fn(() => ({ status: 'in_session', dialoguesRemaining: 5 })),
  isOnCooldown: jest.fn(() => false),
  updateSessionPhase: jest.fn(),
}));

jest.mock('../services/amberCurrency', () => ({
  markDialogueRead: jest.fn(async () => {}),
  consumeTriggerWords: jest.fn(async () => []),
  consumePendingVariantTutorial: jest.fn(async () => null),
  wereTutorialSeedsPlanted: jest.fn(async () => true),
  markTutorialSeedsPlanted: jest.fn(async () => {}),
  recordConsumedCoordinatedEvent: jest.fn(async () => {}),
  hasSeenGuaranteedCrossRef: jest.fn(async () => true),
  markGuaranteedCrossRefSeen: jest.fn(async () => {}),
  hasSeenFoxPlayNudge: jest.fn(async () => true),
  markFoxPlayNudgeSeen: jest.fn(async () => {}),
}));

jest.mock('../services/offeringRequests', () => ({
  takeOfferingDialogue: jest.fn(async () => null),
}));

jest.mock('../services/dialogueChoices', () => ({
  getChoiceForAnimal: jest.fn(async () => null),
  recordChoice: jest.fn(async () => ({ response: 'response', convergence: 'convergence' })),
  loadChoiceState: jest.fn(async () => ({ choices: {} })),
  getPhase4CallbackPage: jest.fn(async () => null),
  markPhase4CallbackShown: jest.fn(async () => {}),
}));

jest.mock('../services/whisperGallery', () => ({
  recordWhisper: jest.fn(async () => {}),
}));

jest.mock('../services/phaseNarrative', () => ({
  getFoxPostTutorialPlayPrompt: jest.fn(() => 'Go solve a puzzle, friend.'),
}));

jest.mock('../services/weeklyQuests', () => ({
  recordAnimalVisit: jest.fn(async () => {}),
}));

jest.mock('../services/sacrifice', () => ({
  getSacrificeCount: jest.fn(async () => 0),
}));

jest.mock('../services/tending', () => ({
  loadTendingState: jest.fn(async () => ({ level: 0, totalSpent: 0, caughtUp: {} })),
  selectPhase5Dialogue: jest.fn(() => ({ text: '', isNew: false, nextCaughtUp: 0 })),
  setPhase5CaughtUp: jest.fn(async () => {}),
  hashSeed: jest.fn(() => 1),
}));

jest.mock('../services/dialogue/phase5Pool', () => ({
  buildPhase5Pool: jest.fn(() => []),
}));

import { useDialogueFlow, findNextAnimalWithNews } from '../hooks/useDialogueFlow';
import {
  checkDialogueAvailability,
  endSession,
  getSessionStatus,
  isOnCooldown,
} from '../services/dialogueSession';
import { markDialogueRead } from '../services/amberCurrency';
import { recordAnimalVisit } from '../services/weeklyQuests';

const checkDialogueAvailabilityMock = checkDialogueAvailability as jest.Mock;
const endSessionMock = endSession as jest.Mock;
const getSessionStatusMock = getSessionStatus as jest.Mock;
const isOnCooldownMock = isOnCooldown as jest.Mock;
const markDialogueReadMock = markDialogueRead as jest.Mock;
const recordAnimalVisitMock = recordAnimalVisit as jest.Mock;

// ---------------------------------------------------------------------------
// 1. Pure resolver
// ---------------------------------------------------------------------------

type Candidate = { id: string; isUnlocked: boolean };

const c = (id: string, isUnlocked = true): Candidate => ({ id, isUnlocked });

describe('findNextAnimalWithNews (pure resolver)', () => {
  const always = () => true;
  const never = () => false;

  it('returns the next animal after the current one in list order', () => {
    const list = [c('fox'), c('pangolin'), c('owl')];
    const result = findNextAnimalWithNews(list, 'fox', always);
    expect(result?.id).toBe('pangolin');
  });

  it('wraps around past the end of the list', () => {
    const list = [c('fox'), c('pangolin'), c('owl')];
    const result = findNextAnimalWithNews(list, 'owl', always);
    expect(result?.id).toBe('fox');
  });

  it('never returns the current animal, even when only it qualifies', () => {
    const list = [c('fox'), c('pangolin'), c('owl')];
    const onlyFox = (a: Candidate) => a.id === 'fox';
    expect(findNextAnimalWithNews(list, 'fox', onlyFox)).toBeNull();
  });

  it('skips locked animals', () => {
    const list = [c('fox'), c('pangolin', false), c('owl')];
    const result = findNextAnimalWithNews(list, 'fox', always);
    expect(result?.id).toBe('owl');
  });

  it('skips animals the availability predicate rejects, in order', () => {
    const list = [c('fox'), c('pangolin'), c('owl'), c('axolotl')];
    const notPangolin = (a: Candidate) => a.id !== 'pangolin';
    const result = findNextAnimalWithNews(list, 'fox', notPangolin);
    expect(result?.id).toBe('owl');
  });

  it('returns null when no other animal has news', () => {
    const list = [c('fox'), c('pangolin'), c('owl')];
    expect(findNextAnimalWithNews(list, 'fox', never)).toBeNull();
  });

  it('scans the whole list when the current id is not present', () => {
    const list = [c('fox'), c('pangolin')];
    const result = findNextAnimalWithNews(list, 'ghost', always);
    expect(result?.id).toBe('fox');
  });

  it('returns null for an empty list', () => {
    expect(findNextAnimalWithNews([], 'fox', always)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Hook level
// ---------------------------------------------------------------------------

const progress = {
  amber: 0,
  totalAmberEarned: 0,
  unlockedAnimals: ['fox', 'pangolin'],
  unlockedRooms: ['cozy_den', 'kitchen'],
  currentPhase: 0,
  puzzlesSolved: 50,
  phasePuzzleThresholds: [],
  lastDialogueRead: {},
  introsSeen: [],
  currentStreak: 0,
  lastPlayDate: null,
  phaseProgress: 50,
  consumedCoordinatedEvents: [],
  totalWordsFormed: 0,
};

const baseAnimal = {
  roomId: 'kitchen',
  isUnlocked: true,
  hasNewDialogue: true,
  hasSeenIntro: true,
  lastInteraction: null,
  position: { x: 0, y: 0 },
  isWalking: false,
  direction: 'left' as const,
};

// Pangolin sits on its LAST available line (index 23 of 24): the session has
// no more content, so the button reads "Close" and the chain can offer.
const pangolin = {
  ...baseAnimal,
  id: 'pangolin',
  type: 'pangolin',
  name: 'Panko',
  currentDialogueIndex: 23,
};

const fox = {
  ...baseAnimal,
  id: 'fox',
  type: 'fox',
  name: 'Ember',
  roomId: 'cozy_den',
  currentDialogueIndex: 0,
};

let animals: unknown[] = [];
const setAnimals = (updater: unknown) => {
  animals = typeof updater === 'function' ? (updater as (prev: unknown[]) => unknown[])(animals) : (updater as unknown[]);
};

function render() {
  rewindHookIndices();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useDialogueFlow({
    progress: progress as never,
    setAnimals: setAnimals as never,
  });
}

describe('useDialogueFlow visit-next-friend chain', () => {
  beforeEach(() => {
    resetHookState();
    animals = [{ ...pangolin }, { ...fox }];
    jest.clearAllMocks();
    // Re-pin the default implementations the per-test overrides below replace
    // (clearAllMocks clears calls, not implementations).
    isOnCooldownMock.mockImplementation(() => false);
    getSessionStatusMock.mockImplementation(() => ({ status: 'in_session', dialoguesRemaining: 5 }));
    checkDialogueAvailabilityMock.mockImplementation(async () => ({ available: true }));
  });

  it('resolves the other animal with news at the session end', async () => {
    let hook = render();
    await hook.handleAnimalTap({ ...pangolin } as never);
    hook = render();

    // Terminal line: button would read "Close"
    expect(hook.hasMoreToShow).toBe(false);

    const next = hook.getNextAnimalWithNews(animals as never);
    expect(next?.id).toBe('fox');
  });

  it('returns null before any animal is selected', () => {
    const hook = render();
    expect(hook.getNextAnimalWithNews(animals as never)).toBeNull();
  });

  it('never offers the current animal even when it alone has unread lines', async () => {
    // Fox is fully read (index at total): no news anywhere but pangolin itself.
    animals = [{ ...pangolin }, { ...fox, currentDialogueIndex: 24 }];
    let hook = render();
    await hook.handleAnimalTap({ ...pangolin } as never);
    hook = render();

    expect(hook.getNextAnimalWithNews(animals as never)).toBeNull();
  });

  it('does not offer an animal that is resting on cooldown', async () => {
    isOnCooldownMock.mockImplementation((id: string) => id === 'fox');
    let hook = render();
    await hook.handleAnimalTap({ ...pangolin } as never);
    hook = render();

    expect(hook.getNextAnimalWithNews(animals as never)).toBeNull();
  });

  it('does not offer an in-session animal whose dialogue budget is spent', async () => {
    // The next tap on fox would flip it straight to cooldown — the sync
    // equivalent of checkDialogueAvailability's max_dialogues branch.
    getSessionStatusMock.mockImplementation((id: string) =>
      id === 'fox'
        ? { status: 'in_session', dialoguesRemaining: 0 }
        : { status: 'in_session', dialoguesRemaining: 5 }
    );
    let hook = render();
    await hook.handleAnimalTap({ ...pangolin } as never);
    hook = render();

    expect(hook.getNextAnimalWithNews(animals as never)).toBeNull();
  });

  it('handleVisitNextAnimal runs the exact Close bookkeeping, then the normal tap path', async () => {
    let hook = render();
    await hook.handleAnimalTap({ ...pangolin } as never);
    hook = render();
    expect(hook.hasMoreToShow).toBe(false);
    recordAnimalVisitMock.mockClear();

    const next = hook.getNextAnimalWithNews(animals as never);
    expect(next?.id).toBe('fox');

    await hook.handleVisitNextAnimal(next as never);
    hook = render();

    // Close bookkeeping for pangolin: terminal read advanced the stored index
    // PAST the last line (badge honesty), and the manual close kept the
    // session warm (no endSession — identical to tapping Close).
    expect(markDialogueReadMock).toHaveBeenCalledWith('pangolin', 24);
    expect(endSessionMock).not.toHaveBeenCalled();
    const storedPangolin = (animals as { id: string; currentDialogueIndex: number; hasNewDialogue: boolean }[])
      .find(a => a.id === 'pangolin')!;
    expect(storedPangolin.currentDialogueIndex).toBe(24);
    expect(storedPangolin.hasNewDialogue).toBe(false);

    // The next animal opened through the normal tap machinery: availability
    // re-checked, visit recorded, session opened on fox.
    expect(checkDialogueAvailabilityMock).toHaveBeenCalledWith('fox', 0);
    expect(recordAnimalVisitMock).toHaveBeenCalledWith('fox', 0, 0);
    expect(hook.selectedAnimal?.id).toBe('fox');
    expect(hook.showDialogue).toBe(true);
  });

  it('handleVisitNextAnimal refuses to re-open the current animal', async () => {
    let hook = render();
    await hook.handleAnimalTap({ ...pangolin } as never);
    hook = render();
    checkDialogueAvailabilityMock.mockClear();

    await hook.handleVisitNextAnimal({ ...pangolin } as never);
    hook = render();

    // Nothing closed, nothing re-opened.
    expect(checkDialogueAvailabilityMock).not.toHaveBeenCalled();
    expect(hook.selectedAnimal?.id).toBe('pangolin');
    expect(hook.showDialogue).toBe(true);
  });
});
