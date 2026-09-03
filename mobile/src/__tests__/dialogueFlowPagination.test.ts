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
  // Post-revelation lines are gated on the unlocked animals at runtime. These
  // suites are about page ORDER, not gating, so the predicate lets everything
  // through — dialogueGating.test.ts owns the withholding behaviour.
  buildPhase5Eligibility: jest.fn(() => () => true),
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

describe('useDialogueFlow Fox Phase 4 tutorial callback gating', () => {
  const fox = {
    ...pangolin,
    id: 'fox',
    type: 'fox',
    name: 'Ember',
    roomId: 'cozy_den',
  };

  beforeEach(() => {
    resetHookState();
    jest.clearAllMocks();
    progress.currentPhase = 4;
    progress.puzzlesSolved = 130;
    progress.unlockedAnimals = ['fox', 'pangolin'];
    animals = [{ ...fox }];
    getCurrentDialogueMock.mockReturnValue({ text: SHORT_LINE });
  });

  afterEach(() => {
    progress.currentPhase = 0;
    progress.puzzlesSolved = 10;
    progress.unlockedAnimals = ['fox', 'pangolin'];
  });

  it('does not consume the callback at global Phase 3 when Fox is effectively Phase 4', async () => {
    progress.currentPhase = 3;
    const amberCurrency = jest.requireMock('../services/amberCurrency') as {
      wereTutorialSeedsPlanted: jest.Mock;
      markTutorialSeedsPlanted: jest.Mock;
    };
    amberCurrency.wereTutorialSeedsPlanted.mockResolvedValueOnce(false);

    let hook = render();
    await hook.handleAnimalTap({ ...fox, currentDialogueIndex: 0 } as never);
    hook = render();

    expect(amberCurrency.wereTutorialSeedsPlanted).not.toHaveBeenCalled();
    expect(amberCurrency.markTutorialSeedsPlanted).not.toHaveBeenCalled();
    expect(hook.dialogueText).toBe(SHORT_LINE);
  });

  it('serves and consumes the callback at exact global and effective Phase 4', async () => {
    const amberCurrency = jest.requireMock('../services/amberCurrency') as {
      wereTutorialSeedsPlanted: jest.Mock;
      markTutorialSeedsPlanted: jest.Mock;
    };
    amberCurrency.wereTutorialSeedsPlanted.mockResolvedValueOnce(false);

    let hook = render();
    await hook.handleAnimalTap({ ...fox, currentDialogueIndex: 0 } as never);
    hook = render();

    expect(hook.dialogueText).toBe('tutorial callback line');
    expect(amberCurrency.markTutorialSeedsPlanted).toHaveBeenCalledTimes(1);
  });

  // consumePendingVariantTutorial shifts its queue and files the variant under
  // seen as it reads, so it has no peek half. On a visit that already spent
  // page 0 on Fox's tutorial callback the variant line would sit at page 1,
  // and a scrim tap or Android back on page 0 burned it forever with nothing
  // having shown it. It must not even be consulted on such a visit.
  it('does not consume the pending variant tutorial behind an earlier page', async () => {
    const amberCurrency = jest.requireMock('../services/amberCurrency') as {
      wereTutorialSeedsPlanted: jest.Mock;
      consumePendingVariantTutorial: jest.Mock;
    };
    amberCurrency.wereTutorialSeedsPlanted.mockResolvedValueOnce(false);

    let hook = render();
    await hook.handleAnimalTap({ ...fox, currentDialogueIndex: 0 } as never);
    hook = render();

    expect(hook.dialogueText).toBe('tutorial callback line');
    expect(amberCurrency.consumePendingVariantTutorial).not.toHaveBeenCalled();
  });

  // The other side of the gate: on a visit with nothing ahead of it the note
  // is still consumed and served. Tapped on Panko rather than Ember because
  // only the fox owns the Phase-4 tutorial callback, so this visit is quiet by
  // construction and cannot depend on the seeds-planted mock.
  it('consumes the pending variant tutorial on an otherwise quiet visit', async () => {
    const variantLine = 'The chain runs backward now, and it still comes home.';
    const amberCurrency = jest.requireMock('../services/amberCurrency') as {
      consumePendingVariantTutorial: jest.Mock;
    };
    amberCurrency.consumePendingVariantTutorial.mockResolvedValueOnce('reverse');
    const animalDialogue = jest.requireMock('../services/animalDialogue') as {
      getVariantTutorialDialogue: jest.Mock;
    };
    animalDialogue.getVariantTutorialDialogue.mockReturnValueOnce(variantLine);

    let hook = render();
    await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 0 } as never);
    hook = render();

    expect(amberCurrency.consumePendingVariantTutorial).toHaveBeenCalledTimes(1);
    expect(hook.dialogueText).toBe(variantLine);
  });
});

describe('useDialogueFlow Phase 5 pool-only delivery', () => {
  const phase5Line = 'The pattern continues in a quieter shape.';
  const fox = {
    ...pangolin,
    id: 'fox',
    type: 'fox',
    name: 'Ember',
    roomId: 'cozy_den',
  };
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
    progress.unlockedAnimals = ['fox', 'pangolin', 'tarsier'];
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
      getPhase4CallbackPage: jest.Mock;
    };
    dialogueChoices.getPhase4CallbackPage.mockResolvedValue(null);
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

  it('opens Fox on the Phase 5 pool without invoking any Phase 4 callback queue', async () => {
    const amberCurrency = jest.requireMock('../services/amberCurrency') as {
      wereTutorialSeedsPlanted: jest.Mock;
      markTutorialSeedsPlanted: jest.Mock;
    };
    amberCurrency.wereTutorialSeedsPlanted.mockResolvedValueOnce(false);
    const animalDialogue = jest.requireMock('../services/animalDialogue') as {
      getAndMarkNarrativeCallbackPage: jest.Mock;
    };
    animalDialogue.getAndMarkNarrativeCallbackPage.mockResolvedValue(
      'A Phase 4 seed callback.'
    );
    const dialogueChoices = jest.requireMock('../services/dialogueChoices') as {
      getPhase4CallbackPage: jest.Mock;
    };
    dialogueChoices.getPhase4CallbackPage.mockResolvedValue(
      'A Phase 4 choice callback.'
    );

    let hook = render();
    await hook.handleAnimalTap({ ...fox, currentDialogueIndex: 0 } as never);
    hook = render();

    expect(amberCurrency.wereTutorialSeedsPlanted).not.toHaveBeenCalled();
    expect(amberCurrency.markTutorialSeedsPlanted).not.toHaveBeenCalled();
    expect(dialogueChoices.getPhase4CallbackPage).not.toHaveBeenCalled();
    expect(animalDialogue.getAndMarkNarrativeCallbackPage).not.toHaveBeenCalled();
    expect(hook.dialogueText).toBe(phase5Line);
  });

  it('keeps the Phase 5 Unbroken variant tutorial ahead of the pool', async () => {
    const variantLine =
      'The arrangement wanted a full circuit, with the chain unbroken the whole way home.';
    const amberCurrency = jest.requireMock('../services/amberCurrency') as {
      consumePendingVariantTutorial: jest.Mock;
    };
    amberCurrency.consumePendingVariantTutorial.mockResolvedValueOnce('reverse');
    const animalDialogue = jest.requireMock('../services/animalDialogue') as {
      getVariantTutorialDialogue: jest.Mock;
    };
    animalDialogue.getVariantTutorialDialogue.mockReturnValueOnce(variantLine);

    let hook = render();
    await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 0 } as never);
    hook = render();

    expect(animalDialogue.getVariantTutorialDialogue).toHaveBeenCalledWith(
      'pangolin',
      'reverse',
      5
    );
    expect(hook.dialogueText).toBe(variantLine);

    await hook.handleNextDialogue();
    hook = render();
    expect(hook.dialogueText).toBe(phase5Line);
  });

  // The trigger queue and the offering request BOTH consume as they read, and
  // neither service has a peek half to defer to, so each may only run when its
  // page would be page 0 (guaranteed visible the instant the modal opens). A
  // visit that spends page 0 on a trigger reaction therefore leaves the
  // offering untouched — deferred to the next quiet visit, never consumed
  // behind a page the player might close on.
  it('keeps a Phase 5 trigger reaction ahead of the pool and leaves the offering for later', async () => {
    const triggerLine = 'ASH. Even now, the fire remembers.';
    const amberCurrency = jest.requireMock('../services/amberCurrency') as {
      consumeTriggerWords: jest.Mock;
    };
    amberCurrency.consumeTriggerWords.mockResolvedValueOnce(['ASH']);
    const animalDialogue = jest.requireMock('../services/animalDialogue') as {
      getTriggerWordReaction: jest.Mock;
    };
    animalDialogue.getTriggerWordReaction.mockReturnValueOnce(triggerLine);
    const offeringRequests = jest.requireMock('../services/offeringRequests') as {
      takeOfferingDialogue: jest.Mock;
    };

    let hook = render();
    await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 0 } as never);
    hook = render();

    expect(animalDialogue.getTriggerWordReaction).toHaveBeenCalledWith(
      'pangolin',
      'ASH',
      5
    );
    expect(offeringRequests.takeOfferingDialogue).not.toHaveBeenCalled();
    expect(hook.dialogueText).toBe(triggerLine);

    await hook.handleNextDialogue();
    hook = render();
    expect(hook.dialogueText).toBe(phase5Line);
  });

  it('serves a fulfilled Phase 5 offering reaction on an otherwise quiet visit', async () => {
    const offeringLine = 'You brought the word I asked for. It rests with the pattern.';
    const offeringRequests = jest.requireMock('../services/offeringRequests') as {
      takeOfferingDialogue: jest.Mock;
    };
    offeringRequests.takeOfferingDialogue.mockResolvedValueOnce({
      line: offeringLine,
      kind: 'fulfilled',
    });

    let hook = render();
    await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 0 } as never);
    hook = render();

    expect(offeringRequests.takeOfferingDialogue).toHaveBeenCalledWith(
      'pangolin',
      5,
      true
    );
    expect(hook.dialogueText).toBe(offeringLine);

    await hook.handleNextDialogue();
    hook = render();
    expect(hook.dialogueText).toBe(phase5Line);
  });

  it('keeps Phase 5 coordinated events ahead of the Tending-backed pool', async () => {
    const coordinatedLine = 'The whole house settles around the finished pattern.';
    const tendingLine = 'The shrine deepens, and I remember another quiet word.';
    const animalDialogue = jest.requireMock('../services/animalDialogue') as {
      getCoordinatedEventLine: jest.Mock;
    };
    animalDialogue.getCoordinatedEventLine.mockReturnValueOnce({
      text: coordinatedLine,
      theme: 'terrible_peace',
    });
    const phase5Pool = jest.requireMock('../services/dialogue/phase5Pool') as {
      buildPhase5Pool: jest.Mock;
    };
    phase5Pool.buildPhase5Pool.mockReturnValue([tendingLine]);
    const tending = jest.requireMock('../services/tending') as {
      selectPhase5Dialogue: jest.Mock;
    };
    tending.selectPhase5Dialogue.mockReturnValue({
      text: tendingLine,
      isNew: true,
      nextCaughtUp: 1,
    });

    let hook = render();
    await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 0 } as never);
    hook = render();
    expect(hook.dialogueText).toBe(coordinatedLine);

    await hook.handleNextDialogue();
    hook = render();
    expect(hook.dialogueText).toBe(tendingLine);
  });

  it('does not grant late-recruit regular-backlog session bonus in Phase 5', async () => {
    animals = [{ ...tarsier }];
    const hook = render();

    await hook.handleAnimalTap({ ...tarsier, currentDialogueIndex: 0 } as never);

    expect(checkDialogueAvailabilityMock).toHaveBeenCalledWith('tarsier', 0);
  });
});

// ===========================================================================
// One-time pre-dialogue pages are committed WHEN THEY BECOME VISIBLE.
//
// handleAnimalTap used to consume every one-time source while assembling the
// page list — the coordinated event (stored on GLOBAL progress, so one of the
// eight house-wide crescendos was burned for every animal at once), the
// tutorial-seed flag, the guaranteed cross-reference flag, the Phase-4 choice
// callback. The modal closes on a scrim tap or the Android back button, so a
// player who dismissed early lost beats nothing had shown them.
// ===========================================================================
describe('useDialogueFlow one-time page commits', () => {
  const coordinatedLine = 'We all dreamed the same corridor last night.';
  const choiceCallbackLine = 'You asked what the fire saw, and I can answer now.';

  beforeEach(() => {
    resetHookState();
    jest.clearAllMocks();
    progress.currentPhase = 4;
    progress.puzzlesSolved = 95;
    animals = [{ ...pangolin }];
    getCurrentDialogueMock.mockReturnValue({ text: SHORT_LINE });
  });

  afterEach(() => {
    progress.currentPhase = 0;
    progress.puzzlesSolved = 10;
  });

  function mockTwoPageVisit() {
    const animalDialogue = jest.requireMock('../services/animalDialogue') as {
      getCoordinatedEventLine: jest.Mock;
    };
    animalDialogue.getCoordinatedEventLine.mockReturnValueOnce({
      text: coordinatedLine,
      theme: 'shared_dream',
    });
    const dialogueChoices = jest.requireMock('../services/dialogueChoices') as {
      getPhase4CallbackPage: jest.Mock;
    };
    dialogueChoices.getPhase4CallbackPage.mockResolvedValue(choiceCallbackLine);
  }

  it('commits page 0 on open and the next page only once it is shown', async () => {
    mockTwoPageVisit();
    const amberCurrency = jest.requireMock('../services/amberCurrency') as {
      recordConsumedCoordinatedEvent: jest.Mock;
    };
    const dialogueChoices = jest.requireMock('../services/dialogueChoices') as {
      markPhase4CallbackShown: jest.Mock;
    };

    let hook = render();
    await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 0 } as never);
    hook = render();

    expect(hook.dialogueText).toBe(coordinatedLine);
    expect(amberCurrency.recordConsumedCoordinatedEvent).toHaveBeenCalledWith('shared_dream');
    // Page 1 is not on screen yet.
    expect(dialogueChoices.markPhase4CallbackShown).not.toHaveBeenCalled();

    await hook.handleNextDialogue();
    hook = render();

    expect(hook.dialogueText).toBe(choiceCallbackLine);
    expect(dialogueChoices.markPhase4CallbackShown).toHaveBeenCalledWith('pangolin');
  });

  it('leaves an un-shown page uncommitted when the player closes early', async () => {
    mockTwoPageVisit();
    const dialogueChoices = jest.requireMock('../services/dialogueChoices') as {
      markPhase4CallbackShown: jest.Mock;
    };

    let hook = render();
    await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 0 } as never);
    hook = render();
    await hook.handleCloseDialogue();

    // The callback was never on screen, so it is still owed to the player.
    expect(dialogueChoices.markPhase4CallbackShown).not.toHaveBeenCalled();
  });

  it('commits a page at most once even if Next is tapped again', async () => {
    mockTwoPageVisit();
    const amberCurrency = jest.requireMock('../services/amberCurrency') as {
      recordConsumedCoordinatedEvent: jest.Mock;
    };

    let hook = render();
    await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 0 } as never);
    hook = render();
    await hook.handleNextDialogue();
    hook = render();
    await hook.handleNextDialogue();

    expect(amberCurrency.recordConsumedCoordinatedEvent).toHaveBeenCalledTimes(1);
  });

  it('spends the vanguard guaranteed cross-ref flag only on a reference that exists', async () => {
    // Archimedes, not Ember: the fox also owns the Phase-4 tutorial callback,
    // which would take page 0 here.
    const owl = { ...pangolin, id: 'owl', type: 'owl', name: 'Archimedes', roomId: 'study' };
    animals = [{ ...owl }];
    const amberCurrency = jest.requireMock('../services/amberCurrency') as {
      hasSeenGuaranteedCrossRef: jest.Mock;
      markGuaranteedCrossRefSeen: jest.Mock;
    };
    amberCurrency.hasSeenGuaranteedCrossRef.mockResolvedValue(false);
    const animalDialogue = jest.requireMock('../services/animalDialogue') as {
      getCrossAnimalReference: jest.Mock;
    };
    animalDialogue.getCrossAnimalReference.mockReturnValue(null);

    let hook = render();
    await hook.handleAnimalTap({ ...owl, currentDialogueIndex: 0 } as never);
    hook = render();

    // Nothing was said, so the one guaranteed reference for this phase is
    // still owed (it used to be marked before the lookup ran).
    expect(amberCurrency.markGuaranteedCrossRefSeen).not.toHaveBeenCalled();

    resetHookState();
    jest.clearAllMocks();
    animals = [{ ...owl }];
    amberCurrency.hasSeenGuaranteedCrossRef.mockResolvedValue(false);
    animalDialogue.getCrossAnimalReference.mockReturnValue('Vesper has not blinked all week.');
    getCurrentDialogueMock.mockReturnValue({ text: SHORT_LINE });

    hook = render();
    await hook.handleAnimalTap({ ...owl, currentDialogueIndex: 0 } as never);
    hook = render();

    expect(hook.dialogueText).toBe('Vesper has not blinked all week.');
    expect(amberCurrency.markGuaranteedCrossRefSeen).toHaveBeenCalledWith(4);
  });
});

// ===========================================================================
// The Phase-3 choice beat has to reach the lagging tier, which converges from
// animal-phase 2 straight to 4 at the reveal and so never resolves to 3.
// ===========================================================================
describe('useDialogueFlow Phase-3 choice reachability', () => {
  const sloth = { ...pangolin, id: 'sloth', type: 'sloth', name: 'Sloane', roomId: 'jungle' };

  beforeEach(() => {
    resetHookState();
    jest.clearAllMocks();
    animals = [{ ...sloth }];
    getCurrentDialogueMock.mockReturnValue({ text: SHORT_LINE });
    // Implementations survive clearAllMocks; make sure no earlier test's
    // cross-reference line is still queued ahead of the choice prompt.
    (jest.requireMock('../services/animalDialogue') as {
      getCrossAnimalReference: jest.Mock;
    }).getCrossAnimalReference.mockReturnValue(null);
    (jest.requireMock('../services/dialogueChoices') as {
      getPhase4CallbackPage: jest.Mock;
    }).getPhase4CallbackPage.mockResolvedValue(null);
  });

  afterEach(() => {
    progress.currentPhase = 0;
    progress.puzzlesSolved = 10;
  });

  it('consults the choice for a lagging animal at global Phase 4 (animal-phase 4)', async () => {
    progress.currentPhase = 4;
    progress.puzzlesSolved = 95;
    const dialogueChoices = jest.requireMock('../services/dialogueChoices') as {
      getChoiceForAnimal: jest.Mock;
    };
    dialogueChoices.getChoiceForAnimal.mockResolvedValue({
      prompt: 'Sloane blinks, very slowly.',
      options: { ask: 'How long?', refuse: 'Sleep, friend.' },
      responses: { ask: 'A while.', refuse: 'I will.' },
      convergence: 'The branch bears it either way.',
    });

    let hook = render();
    await hook.handleAnimalTap({ ...sloth, currentDialogueIndex: 76 } as never);
    hook = render();

    expect(dialogueChoices.getChoiceForAnimal).toHaveBeenCalledWith('sloth', 4, 76);
    expect(hook.dialogueText).toBe('Sloane blinks, very slowly.');
    expect(hook.activeChoice).not.toBeNull();
  });

  it('still consults the choice at animal-phase 3 for the middle tier', async () => {
    progress.currentPhase = 3;
    progress.puzzlesSolved = 70;
    const dialogueChoices = jest.requireMock('../services/dialogueChoices') as {
      getChoiceForAnimal: jest.Mock;
    };
    dialogueChoices.getChoiceForAnimal.mockResolvedValue(null);

    const hook = render();
    await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 76 } as never);

    expect(dialogueChoices.getChoiceForAnimal).toHaveBeenCalledWith('pangolin', 3, 76);
  });
});

// ===========================================================================
// The session layer keeps the narrative phase in a module variable that only
// recordVictory used to write, so every launch ran phase-0 session rules
// (3 lines instead of 6 at the reveal, and a warm session refused outright)
// until the player finished a puzzle.
// ===========================================================================
describe('useDialogueFlow session phase mirror', () => {
  afterEach(() => {
    progress.currentPhase = 0;
  });

  it('pushes the current phase into the session layer before availability is checked', async () => {
    resetHookState();
    jest.clearAllMocks();
    progress.currentPhase = 4;
    animals = [{ ...pangolin }];
    getCurrentDialogueMock.mockReturnValue({ text: SHORT_LINE });
    (jest.requireMock('../services/animalDialogue') as {
      getCrossAnimalReference: jest.Mock;
    }).getCrossAnimalReference.mockReturnValue(null);
    const dialogueSession = jest.requireMock('../services/dialogueSession') as {
      updateSessionPhase: jest.Mock;
    };

    const hook = render();
    await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 0 } as never);

    expect(dialogueSession.updateSessionPhase).toHaveBeenCalledWith(4);
    const phaseCallOrder = dialogueSession.updateSessionPhase.mock.invocationCallOrder[0];
    const availabilityCallOrder = checkDialogueAvailabilityMock.mock.invocationCallOrder[0];
    expect(phaseCallOrder).toBeLessThan(availabilityCallOrder);
  });
});
