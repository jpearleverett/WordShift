/**
 * Hook-level tests for useDialogueFlow long-line pagination:
 * - a line over the page budget opens on page 1 and "Next" drains the
 *   remaining pages before any next-line logic runs
 * - page advances are purely presentational: no recordDialogue, no
 *   markDialogueRead, no whisper-gallery recording
 * - hasMoreToShow stays true while pages remain (the button reads "Next")
 * - the whisper gallery records the FULL line once, when the line advances
 * - closing mid-pages clears the page queue so it can't leak into the
 *   next session
 *
 * Uses the repo's manual React-hook mock convention (see
 * useGamePersistence.test.ts): hooks run synchronously in Node and the hook
 * is re-invoked ("re-rendered") after each action to read derived values.
 */

// --- Mock React hooks to run synchronously in Node ---
const stateStore: Map<number, unknown> = new Map();
let stateIndex = 0;
let effectCallbacks: Array<() => void> = [];
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
  getCurrentDialogue: jest.fn(),
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
  getAndMarkPhase4CallbackPage: jest.fn(async () => null),
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

import { useDialogueFlow, splitDialogueIntoPages } from '../hooks/useDialogueFlow';
import { getCurrentDialogue } from '../services/animalDialogue';
import { checkDialogueAvailability, recordDialogue } from '../services/dialogueSession';
import { markDialogueRead } from '../services/amberCurrency';
import { recordWhisper } from '../services/whisperGallery';
import { setPhase5CaughtUp } from '../services/tending';

const getCurrentDialogueMock = getCurrentDialogue as jest.Mock;
const recordDialogueMock = recordDialogue as jest.Mock;
const markDialogueReadMock = markDialogueRead as jest.Mock;
const recordWhisperMock = recordWhisper as jest.Mock;
const checkDialogueAvailabilityMock = checkDialogueAvailability as jest.Mock;
const setPhase5CaughtUpMock = setPhase5CaughtUp as jest.Mock;

// A deterministic over-budget line (14 sentences, ~1300 chars => 3+ pages)
const LONG_LINE = Array.from(
  { length: 14 },
  (_, i) => `This is sentence number ${i + 1} of the long night watch, and the sky above the loft holds very still.`
).join(' ');
const SHORT_LINE = 'A short second line.';

const progress = {
  amber: 0,
  totalAmberEarned: 0,
  unlockedAnimals: ['fox', 'pangolin'],
  unlockedRooms: ['cozy_den', 'kitchen'],
  currentPhase: 0,
  puzzlesSolved: 10,
  phasePuzzleThresholds: [],
  lastDialogueRead: {},
  introsSeen: [],
  currentStreak: 0,
  lastPlayDate: null,
  phaseProgress: 10,
  consumedCoordinatedEvents: [],
  totalWordsFormed: 0,
};

// Pangolin is a 'middle' awareness tier: animal phase 0 at global phase 0,
// so no pre-dialogue pages fire (no tutorial callback, refs mocked to null).
const pangolin = {
  id: 'pangolin',
  type: 'pangolin',
  name: 'Panko',
  roomId: 'kitchen',
  isUnlocked: true,
  currentDialogueIndex: 0,
  hasNewDialogue: true,
  hasSeenIntro: true,
  lastInteraction: null,
  position: { x: 0, y: 0 },
  isWalking: false,
  direction: 'left' as const,
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

describe('useDialogueFlow long-line pagination (drain behavior)', () => {
  beforeEach(() => {
    resetHookState();
    animals = [{ ...pangolin }];
    jest.clearAllMocks();
    getCurrentDialogueMock.mockImplementation((_type: string, index: number) =>
      index === 0 ? { text: LONG_LINE } : { text: SHORT_LINE }
    );
  });

  it('opens a long line on its first page with hasMoreToShow true', async () => {
    let hook = render();
    await hook.handleAnimalTap(pangolin as never);
    hook = render();

    const pages = splitDialogueIntoPages(LONG_LINE);
    expect(pages.length).toBeGreaterThanOrEqual(3);
    expect(hook.dialogueText).toBe(pages[0]);
    expect(hook.hasMoreToShow).toBe(true);
  });

  it('Next drains the remaining pages without any line side effects', async () => {
    let hook = render();
    await hook.handleAnimalTap(pangolin as never);
    hook = render();

    const pages = splitDialogueIntoPages(LONG_LINE);

    // Drain every page after the first; each advance is presentation only
    for (let p = 1; p < pages.length; p++) {
      await hook.handleNextDialogue();
      hook = render();
      expect(hook.dialogueText).toBe(pages[p]);
      // Mid-line pages must still offer "Next"
      expect(hook.hasMoreToShow).toBe(true);
    }

    // No page advance recorded the line, advanced the read index, or
    // re-fired the once-per-line whisper recording.
    expect(recordDialogueMock).not.toHaveBeenCalled();
    expect(markDialogueReadMock).not.toHaveBeenCalled();
    expect(recordWhisperMock).not.toHaveBeenCalled();
  });

  it('after the last page, Next advances the line exactly once (full-line whisper)', async () => {
    let hook = render();
    await hook.handleAnimalTap(pangolin as never);
    hook = render();

    const pages = splitDialogueIntoPages(LONG_LINE);
    for (let p = 1; p < pages.length; p++) {
      await hook.handleNextDialogue();
      hook = render();
    }
    expect(hook.dialogueText).toBe(pages[pages.length - 1]);

    // Now the real line advance
    await hook.handleNextDialogue();
    hook = render();

    expect(recordDialogueMock).toHaveBeenCalledTimes(1);
    expect(markDialogueReadMock).toHaveBeenCalledTimes(1);
    expect(markDialogueReadMock).toHaveBeenCalledWith('pangolin', 1);
    // The whisper gallery got the FULL line, not the last visible page
    expect(recordWhisperMock).toHaveBeenCalledTimes(1);
    expect(recordWhisperMock.mock.calls[0][0].text).toBe(LONG_LINE);

    // The next line opens on its own first (and only) page
    expect(hook.dialogueText).toBe(SHORT_LINE);
  });

  it('a short line is unaffected: Next advances the line immediately', async () => {
    getCurrentDialogueMock.mockImplementation(() => ({ text: SHORT_LINE }));

    let hook = render();
    await hook.handleAnimalTap(pangolin as never);
    hook = render();
    expect(hook.dialogueText).toBe(SHORT_LINE);

    await hook.handleNextDialogue();
    hook = render();

    expect(recordDialogueMock).toHaveBeenCalledTimes(1);
    expect(markDialogueReadMock).toHaveBeenCalledTimes(1);
    expect(recordWhisperMock).toHaveBeenCalledTimes(1);
    expect(recordWhisperMock.mock.calls[0][0].text).toBe(SHORT_LINE);
  });

  it('closing mid-pages clears the page queue for the next session', async () => {
    let hook = render();
    await hook.handleAnimalTap(pangolin as never);
    hook = render();

    const pages = splitDialogueIntoPages(LONG_LINE);

    // Advance one page, then close mid-line
    await hook.handleNextDialogue();
    hook = render();
    expect(hook.dialogueText).toBe(pages[1]);

    await hook.handleCloseDialogue();
    hook = render();
    expect(hook.showDialogue).toBe(false);
    // Closing mid-pages advanced nothing (behaves exactly like a mid-line close)
    expect(recordDialogueMock).not.toHaveBeenCalled();
    expect(markDialogueReadMock).not.toHaveBeenCalled();

    // Re-open: the line starts back on page 1, not a stale mid-line page
    await hook.handleAnimalTap(pangolin as never);
    hook = render();
    expect(hook.dialogueText).toBe(pages[0]);
  });

  it('paginates pre-dialogue pages too, then drains into the next pre-page', async () => {
    // A long coordinated-event page followed by the regular (short) dialogue
    const animalDialogue = jest.requireMock('../services/animalDialogue') as {
      getCoordinatedEventLine: jest.Mock;
    };
    animalDialogue.getCoordinatedEventLine.mockReturnValueOnce({
      text: LONG_LINE,
      theme: 'test_theme',
    });
    getCurrentDialogueMock.mockImplementation(() => ({ text: SHORT_LINE }));

    let hook = render();
    await hook.handleAnimalTap(pangolin as never);
    hook = render();

    const pages = splitDialogueIntoPages(LONG_LINE);
    expect(hook.dialogueText).toBe(pages[0]);
    expect(hook.hasMoreToShow).toBe(true);

    // Drain the pre-page's pages...
    for (let p = 1; p < pages.length; p++) {
      await hook.handleNextDialogue();
      hook = render();
      expect(hook.dialogueText).toBe(pages[p]);
    }
    // ...then the next tap moves past the pre-page to the regular dialogue,
    // still without any line side effects (pre-pages never record lines).
    await hook.handleNextDialogue();
    hook = render();
    expect(hook.dialogueText).toBe(SHORT_LINE);
    expect(recordDialogueMock).not.toHaveBeenCalled();
    expect(markDialogueReadMock).not.toHaveBeenCalled();
  });
});

describe('useDialogueFlow Phase 5 pool-only delivery', () => {
  const phase5Line = 'The pattern continues in a quieter shape.';
  const tarsier = {
    ...pangolin,
    id: 'tarsier',
    type: 'tarsier',
    name: 'Vesper',
    roomId: 'star_loft',
  };

  beforeEach(() => {
    resetHookState();
    jest.clearAllMocks();
    progress.currentPhase = 5;
    progress.puzzlesSolved = 180;
    progress.unlockedAnimals = ['pangolin', 'tarsier'];
    animals = [{ ...pangolin }];
    getCurrentDialogueMock.mockReturnValue({ text: 'Legacy regular dialogue.' });

    const phase5Pool = jest.requireMock('../services/dialogue/phase5Pool') as {
      buildPhase5Pool: jest.Mock;
    };
    phase5Pool.buildPhase5Pool.mockReturnValue([phase5Line]);
    const tending = jest.requireMock('../services/tending') as {
      selectPhase5Dialogue: jest.Mock;
    };
    tending.selectPhase5Dialogue.mockReturnValue({
      text: phase5Line,
      isNew: true,
      nextCaughtUp: 1,
    });
    const animalDialogue = jest.requireMock('../services/animalDialogue') as {
      getAndMarkNarrativeCallbackPage: jest.Mock;
    };
    animalDialogue.getAndMarkNarrativeCallbackPage.mockResolvedValue(null);
    const dialogueChoices = jest.requireMock('../services/dialogueChoices') as {
      getAndMarkPhase4CallbackPage: jest.Mock;
    };
    dialogueChoices.getAndMarkPhase4CallbackPage.mockResolvedValue(null);
  });

  afterEach(() => {
    progress.currentPhase = 0;
    progress.puzzlesSolved = 10;
    progress.unlockedAnimals = ['fox', 'pangolin'];
  });

  it('serves and advances the post-revelation pool immediately from a low legacy index', async () => {
    const legacyAnimal = { ...pangolin, currentDialogueIndex: 0 };
    let hook = render();
    await hook.handleAnimalTap(legacyAnimal as never);
    hook = render();

    expect(hook.dialogueText).toBe(phase5Line);
    expect(hook.hasMoreToShow).toBe(true);
    expect(getCurrentDialogueMock).not.toHaveBeenCalled();

    await hook.handleNextDialogue();

    expect(markDialogueReadMock).toHaveBeenCalledWith('pangolin', 25);
    expect(setPhase5CaughtUpMock).toHaveBeenCalledWith('pangolin', 1);
  });

  it('opens on the Phase 5 pool without invoking Phase 4 callback queues', async () => {
    const animalDialogue = jest.requireMock('../services/animalDialogue') as {
      getAndMarkNarrativeCallbackPage: jest.Mock;
    };
    animalDialogue.getAndMarkNarrativeCallbackPage.mockResolvedValue(
      'A Phase 4 seed callback.'
    );
    const dialogueChoices = jest.requireMock('../services/dialogueChoices') as {
      getAndMarkPhase4CallbackPage: jest.Mock;
    };
    dialogueChoices.getAndMarkPhase4CallbackPage.mockResolvedValue(
      'A Phase 4 choice callback.'
    );

    let hook = render();
    await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 0 } as never);
    hook = render();

    expect(dialogueChoices.getAndMarkPhase4CallbackPage).not.toHaveBeenCalled();
    expect(animalDialogue.getAndMarkNarrativeCallbackPage).not.toHaveBeenCalled();
    expect(hook.dialogueText).toBe(phase5Line);
  });

  it('does not grant late-recruit regular-backlog session bonus in Phase 5', async () => {
    animals = [{ ...tarsier }];
    const hook = render();

    await hook.handleAnimalTap({ ...tarsier, currentDialogueIndex: 0 } as never);

    expect(checkDialogueAvailabilityMock).toHaveBeenCalledWith('tarsier', 0);
  });
});
