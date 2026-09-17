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
      stateStore.set(idx, typeof initial === 'function' ? (initial as () => unknown)() : initial);
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
  useMemo: (fn: () => unknown) => fn(),
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
  peekNarrativeSeedPage: jest.fn(async () => null),
  peekNarrativeCallbackPage: jest.fn(async () => null),
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

// Exercise the hook against explicit line receipts. The service's real storage,
// migration and eligibility behavior is covered by conversationProgress.test.
jest.mock('../services/conversationProgress', () => ({
  getNextAnimalConversation: jest.fn((...args: unknown[]) => mockSelectConversation(...args)),
  completeAnimalConversationLine: jest.fn((...args: unknown[]) => mockCompleteConversation(...args)),
}));

jest.mock('../services/amberCurrency', () => ({
  markDialogueRead: jest.fn(async () => {}),
  markIntroSeen: jest.fn(async () => {}),
  consumeTriggerWords: jest.fn(async () => []),
  getPendingVariantTutorials: jest.fn(async () => []),
  acknowledgeVariantTutorial: jest.fn(async () => {}),
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
  hasPendingDialogueChoice: jest.requireActual('../services/dialogueChoices').hasPendingDialogueChoice,
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
  getDialogueCaughtUpLine: jest.fn((phase: number) => `caught up (phase ${phase})`),
  getDialogueRevealSkipHint: jest.fn(() => 'Tap the words to skip ahead.'),
  getArrivalResumeFramingLine: jest.fn((name: string) => `${name} settles in (resume framing).`),
}));

jest.mock('../services/weeklyQuests', () => ({
  recordAnimalVisit: jest.fn(async () => {}),
}));

jest.mock('../services/sacrifice', () => ({
  getSacrificeCount: jest.fn(async () => 0),
}));

jest.mock('../services/tending', () => ({
  hasNewPhase5Line: jest.requireActual('../services/tending').hasNewPhase5Line,
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

import {
  useDialogueFlow,
  splitDialogueIntoPages,
  markArrivalResumeFramed,
  ARRIVAL_RESUME_FRAMING_SEEN_KEY,
} from '../hooks/useDialogueFlow';
import storage from '@react-native-async-storage/async-storage';
import { getCurrentDialogue, getCoordinatedEventLine } from '../services/animalDialogue';
import { checkDialogueAvailability, recordDialogue, endSession } from '../services/dialogueSession';
import { markDialogueRead, markIntroSeen } from '../services/amberCurrency';
import { recordWhisper } from '../services/whisperGallery';
import { setPhase5CaughtUp } from '../services/tending';
import { getChoiceForAnimal, recordChoice } from '../services/dialogueChoices';
import { getNextAnimalConversation, completeAnimalConversationLine } from '../services/conversationProgress';
import { StorageRecoveryRequiredError } from '../services/persistenceStorage';

const getCurrentDialogueMock = getCurrentDialogue as jest.Mock;
const recordDialogueMock = recordDialogue as jest.Mock;
const markDialogueReadMock = markDialogueRead as jest.Mock;
const recordWhisperMock = recordWhisper as jest.Mock;
const checkDialogueAvailabilityMock = checkDialogueAvailability as jest.Mock;
const setPhase5CaughtUpMock = setPhase5CaughtUp as jest.Mock;
const completeConversationMock = completeAnimalConversationLine as jest.Mock;
const conversationProgressCallback = jest.fn();

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
  introsSeen: [] as string[],
  currentStreak: 0,
  lastPlayDate: null,
  phaseProgress: 10,
  consumedCoordinatedEvents: [],
  totalWordsFormed: 0,
  conversationReadIds: {} as Record<string, string[]>,
  cycleCount: 0,
};

let mockActiveProgress = progress;
let mockSavedReads: Record<string, string[]> = {};
const lineId = (type: string, index: number) => `test_${type}_${index}`;
function markReadThrough(type: string, count: number) {
  progress.conversationReadIds[type] = Array.from({ length: count }, (_, index) => lineId(type, index));
}

function mockSelectConversation(...args: unknown[]) {
  const [state, type, phase] = args as [typeof progress, string, number];
  const dialogue = jest.requireMock('../services/animalDialogue');
  const limit = dialogue.getTotalDialogueCount(type, Math.min(phase, 4));
  const completed = new Set(state.conversationReadIds?.[type] ?? []);
  for (let index = 0; index < limit; index++) {
    if (completed.has(lineId(type, index))) continue;
    const text = dialogue.getCurrentDialogue(type, index, phase);
    return { index, dialogue: { ...text, id: lineId(type, index), phase: 0 } };
  }
  return null;
}

async function mockCompleteConversation(...args: unknown[]) {
  const [type, id, expectedCycle] = args as [string, string, number];
  if (expectedCycle !== mockActiveProgress.cycleCount) throw new Error('Stale cycle');
  const ids = { ...mockActiveProgress.conversationReadIds, ...mockSavedReads };
  const completed = !(ids[type] ?? []).includes(id);
  mockSavedReads = { ...ids, [type]: completed ? [...(ids[type] ?? []), id] : ids[type] };
  const { getAnimalPhase } = jest.requireActual('../types/homeWorld');
  const phase = getAnimalPhase(mockActiveProgress.currentPhase, type);
  const next = mockSelectConversation({ ...mockActiveProgress, conversationReadIds: mockSavedReads }, type, phase);
  return { conversationReadIds: mockSavedReads, next,
    nextIndex: next?.index ?? jest.requireMock('../services/animalDialogue').getTotalDialogueCount(type, Math.min(phase, 4)),
    completed, cycleCount: expectedCycle };
}

beforeEach(() => {
  for (const key of Object.keys(progress.conversationReadIds)) delete progress.conversationReadIds[key];
  mockSavedReads = {};
  mockActiveProgress = progress;
  progress.cycleCount = 0;
  (getNextAnimalConversation as jest.Mock).mockReset().mockImplementation(mockSelectConversation);
  completeConversationMock.mockReset().mockImplementation(mockCompleteConversation);
  jest.requireMock('../services/animalDialogue').getTotalDialogueCount.mockImplementation((_type: string, phase: number) =>
    [24, 48, 76, 106, 136][Math.min(phase, 4)]);
});

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
  mockActiveProgress = progress;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useDialogueFlow({
    progress: progress as never,
    setAnimals: setAnimals as never,
    onConversationProgress: conversationProgressCallback,
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

    // No page advance recorded the line or advanced the read index.
    expect(recordDialogueMock).not.toHaveBeenCalled();
    expect(markDialogueReadMock).not.toHaveBeenCalled();
    expect(recordWhisperMock).not.toHaveBeenCalled();
  });

  it('after the last page, Next advances the line exactly once and keeps it out of the gallery', async () => {
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
    expect(completeConversationMock).toHaveBeenCalledTimes(1);
    expect(completeConversationMock).toHaveBeenCalledWith('pangolin', lineId('pangolin', 0), 0);
    expect(markDialogueReadMock).not.toHaveBeenCalled();
    // A base conversation line is NEVER copied into the whisper gallery: it is
    // already kept, complete, in the journal's earlier conversations. This
    // used to record the full unpaginated line here, which made the gallery a
    // lossy second copy of the archive.
    expect(recordWhisperMock).not.toHaveBeenCalled();

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
    expect(completeConversationMock).toHaveBeenCalledTimes(1);
    expect(markDialogueReadMock).not.toHaveBeenCalled();
    // Short or paginated, a base line still never reaches the gallery.
    expect(recordWhisperMock).not.toHaveBeenCalled();
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
      deliveryKey: 'test_theme:witness:pangolin',
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

  // An earlier tutorial page keeps the mode note queued for another visit.
  it('does not consume the pending variant tutorial behind an earlier page', async () => {
    const amberCurrency = jest.requireMock('../services/amberCurrency') as {
      wereTutorialSeedsPlanted: jest.Mock;
      getPendingVariantTutorials: jest.Mock;
      acknowledgeVariantTutorial: jest.Mock;
    };
    amberCurrency.wereTutorialSeedsPlanted.mockResolvedValueOnce(false);

    let hook = render();
    await hook.handleAnimalTap({ ...fox, currentDialogueIndex: 0 } as never);
    hook = render();

    expect(hook.dialogueText).toBe('tutorial callback line');
    expect(amberCurrency.getPendingVariantTutorials).not.toHaveBeenCalled();
  });

  it('acknowledges the pending variant only after the reader finishes its note', async () => {
    const variantLine = 'The chain runs backward now, and it still comes home.';
    const amberCurrency = jest.requireMock('../services/amberCurrency') as {
      getPendingVariantTutorials: jest.Mock;
      acknowledgeVariantTutorial: jest.Mock;
    };
    amberCurrency.getPendingVariantTutorials.mockResolvedValueOnce(['reverse']);
    const animalDialogue = jest.requireMock('../services/animalDialogue') as {
      getVariantTutorialDialogue: jest.Mock;
    };
    animalDialogue.getVariantTutorialDialogue.mockReturnValueOnce(variantLine);

    let hook = render();
    await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 0 } as never);
    hook = render();

    expect(amberCurrency.getPendingVariantTutorials).toHaveBeenCalledTimes(1);
    expect(hook.dialogueText).toBe(variantLine);
    expect(amberCurrency.acknowledgeVariantTutorial).not.toHaveBeenCalled();
    await hook.handleNextDialogue();
    expect(amberCurrency.acknowledgeVariantTutorial).toHaveBeenCalledWith('reverse');
  });
});

describe('useDialogueFlow Phase 5 pools after completed base conversation', () => {
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
    for (const type of progress.unlockedAnimals) markReadThrough(type, 136);

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
      peekNarrativeCallbackPage: jest.Mock;
    };
    animalDialogue.peekNarrativeCallbackPage.mockResolvedValue(null);
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

  it('finishes unread base material before serving the pool, regardless of the legacy index', async () => {
    markReadThrough('pangolin', 135);
    // This resident already had their post-Arrival resume framing (covered
    // below), so the visit opens straight on the unread regular line.
    await storage.clear();
    await markArrivalResumeFramed('pangolin');
    const legacyAnimal = { ...pangolin, currentDialogueIndex: 0 };
    let hook = render();
    await hook.handleAnimalTap(legacyAnimal as never);
    hook = render();

    expect(hook.dialogueText).toBe('Legacy regular dialogue.');
    expect(hook.hasMoreToShow).toBe(true);
    expect(setPhase5CaughtUpMock).not.toHaveBeenCalled();

    await hook.handleNextDialogue();
    hook = render();
    expect(completeConversationMock).toHaveBeenCalledWith('pangolin', lineId('pangolin', 135), 0);
    expect(hook.dialogueText).toBe(phase5Line);
    expect(markDialogueReadMock).not.toHaveBeenCalled();
    expect(setPhase5CaughtUpMock).not.toHaveBeenCalled();

    await hook.handleNextDialogue();
    expect(markDialogueReadMock).toHaveBeenCalledWith('pangolin', 137);
    expect(setPhase5CaughtUpMock).toHaveBeenCalledWith('pangolin', 1);
  });

  it('frames resumed pre-arrival material once per resident after the Arrival (narrative-2)', async () => {
    markReadThrough('pangolin', 135);
    await storage.clear();
    const legacyAnimal = { ...pangolin, currentDialogueIndex: 0 };
    let hook = render();
    await hook.handleAnimalTap(legacyAnimal as never);
    hook = render();

    // The lead-in frames the older line as recollection: a pre-dialogue page,
    // presentation only. No receipt, no read-ID write, no gallery record.
    expect(hook.dialogueText).toBe('Panko settles in (resume framing).');
    expect(hook.hasMoreToShow).toBe(true);
    expect(completeConversationMock).not.toHaveBeenCalled();
    expect(recordWhisperMock).not.toHaveBeenCalled();
    expect(await storage.getItem(ARRIVAL_RESUME_FRAMING_SEEN_KEY)).toContain('pangolin');

    await hook.handleNextDialogue();
    hook = render();
    expect(hook.dialogueText).toBe('Legacy regular dialogue.');
    expect(completeConversationMock).not.toHaveBeenCalled();

    // A second visit does not frame again: the flag is per resident, once.
    await hook.handleCloseDialogue();
    hook = render();
    await hook.handleAnimalTap(legacyAnimal as never);
    hook = render();
    expect(hook.dialogueText).toBe('Legacy regular dialogue.');
  });

  it('opens Fox on the Phase 5 pool without invoking any Phase 4 callback queue', async () => {
    const amberCurrency = jest.requireMock('../services/amberCurrency') as {
      wereTutorialSeedsPlanted: jest.Mock;
      markTutorialSeedsPlanted: jest.Mock;
    };
    amberCurrency.wereTutorialSeedsPlanted.mockResolvedValueOnce(false);
    const animalDialogue = jest.requireMock('../services/animalDialogue') as {
      peekNarrativeCallbackPage: jest.Mock;
    };
    animalDialogue.peekNarrativeCallbackPage.mockResolvedValue(
      { text: 'A Phase 4 seed callback.', commit: jest.fn(async () => {}) }
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
    expect(animalDialogue.peekNarrativeCallbackPage).not.toHaveBeenCalled();
    expect(hook.dialogueText).toBe(phase5Line);
  });

  it('keeps the Phase 5 Unbroken variant tutorial ahead of the pool', async () => {
    const variantLine =
      'The arrangement wanted a full circuit, with the chain unbroken the whole way home.';
    const amberCurrency = jest.requireMock('../services/amberCurrency') as {
      getPendingVariantTutorials: jest.Mock;
      acknowledgeVariantTutorial: jest.Mock;
    };
    amberCurrency.getPendingVariantTutorials.mockResolvedValueOnce(['reverse']);
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

  it('retires pre-arrival coordinated events while preserving the Tending-backed pool', async () => {
    const coordinatedLine = 'The whole house settles around the finished pattern.';
    const tendingLine = 'The shrine deepens, and I remember another quiet word.';
    const animalDialogue = jest.requireMock('../services/animalDialogue') as {
      getCoordinatedEventLine: jest.Mock;
    };
    animalDialogue.getCoordinatedEventLine.mockReturnValueOnce({
      text: coordinatedLine,
      theme: 'terrible_peace',
      deliveryKey: 'terrible_peace:witness:pangolin',
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
    expect(animalDialogue.getCoordinatedEventLine).not.toHaveBeenCalled();
    expect(hook.dialogueText).toBe(tendingLine);
    animalDialogue.getCoordinatedEventLine.mockReset().mockReturnValue(null);
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
      deliveryKey: 'shared_dream:witness:pangolin',
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
    expect(amberCurrency.recordConsumedCoordinatedEvent).toHaveBeenCalledWith('shared_dream:witness:pangolin');
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
    markReadThrough('sloth', 76);
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
    markReadThrough('pangolin', 76);
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


describe('dialogue reveal visit ownership', () => {
  it('reopening the same line starts a fresh reveal instead of reusing the old completed count', async () => {
    resetHookState();
    jest.clearAllMocks();
    progress.currentPhase = 0;
    animals = [{ ...pangolin }];
    const settings = jest.requireMock('../services/settings') as { getSettingsSync: jest.Mock };
    settings.getSettingsSync.mockReturnValue({ reducedMotion: false });
    getCurrentDialogueMock.mockReturnValue({ text: SHORT_LINE });
    const animalDialogue = jest.requireMock('../services/animalDialogue') as { getCrossAnimalReference: jest.Mock };
    animalDialogue.getCrossAnimalReference.mockReturnValue(null);
    try {
      let hook = render();
      await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 0 } as never);
      hook = render();
      expect(hook.revealInProgress).toBe(true);
      hook.completeReveal();
      hook = render();
      expect(hook.revealInProgress).toBe(false);
      await hook.handleCloseDialogue();
      hook = render();
      await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 0 } as never);
      hook = render();
      expect(hook.dialogueText).toBe(SHORT_LINE);
      expect(hook.revealInProgress).toBe(true);
      expect(hook.isTalking).toBe(false);
    } finally {
      settings.getSettingsSync.mockReturnValue({ reducedMotion: true });
    }
  });
});

/**
 * The gallery keeps what the journal cannot show.
 *
 * A base conversation line is not recorded (the tests above pin that): the
 * journal's earlier conversations read the same corpus, complete and
 * un-evictable. But storyArchive reads phases 0-4 of ALL_DIALOGUES and nothing
 * else, while the very same dialogue-advance branch also serves three corpora
 * that live outside it: the Phase-2 exhaustion pool, the post-revelation pool
 * and the Tending milestone lines. Those exist in NO other surface, so they are
 * recorded as 'passage'.
 *
 * These two tests are the behavioural half of archiveSeparation.test.ts, which
 * can only read the source. Deleting the recorder outright (which is what
 * retired the Tending Shrine's whole reward from both archives) fails the
 * first; dropping the `fromLatePool` guard fails the second.
 */
describe('useDialogueFlow keeps the late-pool lines the journal cannot show', () => {
  const tending = jest.requireMock('../services/tending') as { selectPhase5Dialogue: jest.Mock };
  const POOL_LINE = 'The pattern holds, and the kettle is still warm.';

  beforeEach(() => {
    resetHookState();
    animals = [{ ...pangolin }];
    jest.clearAllMocks();
    getCurrentDialogueMock.mockReturnValue({ text: SHORT_LINE });
  });

  afterEach(() => {
    progress.currentPhase = 0;
    tending.selectPhase5Dialogue.mockReturnValue({ text: '', isNew: false, nextCaughtUp: 0 });
  });

  it('records a post-revelation / Tending pool line as a passage', async () => {
    progress.currentPhase = 5;
    markReadThrough('pangolin', 136);
    tending.selectPhase5Dialogue.mockReturnValue({ text: POOL_LINE, isNew: true, nextCaughtUp: 1 });

    let hook = render();
    await hook.handleAnimalTap(pangolin as never);
    hook = render();
    expect(hook.dialogueText).toBe(POOL_LINE);

    await hook.handleNextDialogue();

    expect(recordWhisperMock).toHaveBeenCalledTimes(1);
    const entry = recordWhisperMock.mock.calls[0][0];
    expect(entry.text).toBe(POOL_LINE);
    expect(entry.type).toBe('passage');
    expect(entry.animalType).toBe('pangolin');
    // Kept for the same reason it is shown: nothing else holds it.
    expect(setPhase5CaughtUpMock).toHaveBeenCalled();
  });

  it('still keeps a base line out of the gallery at the same call site', async () => {
    // Same branch, same recorder, phase 0: the journal owns this one.
    progress.currentPhase = 0;

    let hook = render();
    await hook.handleAnimalTap(pangolin as never);
    hook = render();
    expect(hook.dialogueText).toBe(SHORT_LINE);

    await hook.handleNextDialogue();

    expect(recordWhisperMock).not.toHaveBeenCalled();
  });
});

describe('useDialogueFlow exhausted regular block (no last-line replay)', () => {
  // Only explicit receipts establish exhaustion; a legacy numeric cursor
  // cannot prove that the old automatic jumps actually showed these lines.
  const exhausted = { ...pangolin, currentDialogueIndex: 24, hasNewDialogue: false };

  beforeEach(() => {
    resetHookState();
    animals = [{ ...exhausted }];
    jest.clearAllMocks();
    getCurrentDialogueMock.mockImplementation(() => ({ text: 'The last line of the block.' }));
    markReadThrough('pangolin', 24);
  });

  it('speaks the caught-up line instead of replaying the last line, and offers Close', async () => {
    let hook = render();
    await hook.handleAnimalTap(exhausted as never);
    hook = render();

    expect(hook.dialogueText).toBe('caught up (phase 0)');
    expect(hook.hasMoreToShow).toBe(false);
    // The clamp in getCurrentDialogue is never consulted for a read-out block.
    expect(getCurrentDialogueMock).not.toHaveBeenCalled();
    // Nothing was advanced or budgeted just by looking in.
    expect(markDialogueReadMock).not.toHaveBeenCalled();
    expect(recordDialogueMock).not.toHaveBeenCalled();

    await hook.handleCloseDialogue();
    hook = render();
    expect(hook.showDialogue).toBe(false);
    expect(markDialogueReadMock).not.toHaveBeenCalled();
    expect(recordDialogueMock).not.toHaveBeenCalled();
    expect(recordWhisperMock).not.toHaveBeenCalled();
  });

  it('still delivers pre-dialogue pages ahead of the caught-up line', async () => {
    (getCoordinatedEventLine as jest.Mock).mockReturnValueOnce({
      text: 'Every room heard it at once.',
      deliveryKey: 'coord:test',
    });

    let hook = render();
    await hook.handleAnimalTap(exhausted as never);
    hook = render();

    // The event page opens the visit and promises more (the caught-up line).
    expect(hook.dialogueText).toBe('Every room heard it at once.');
    expect(hook.hasMoreToShow).toBe(true);

    await hook.handleNextDialogue();
    hook = render();
    expect(hook.dialogueText).toBe('caught up (phase 0)');
    expect(hook.hasMoreToShow).toBe(false);
    expect(getCurrentDialogueMock).not.toHaveBeenCalled();
    expect(recordDialogueMock).not.toHaveBeenCalled();
  });

  it('an unread block is untouched: the indexed line still serves', async () => {
    markReadThrough('pangolin', 23);
    let hook = render();
    await hook.handleAnimalTap({ ...exhausted, currentDialogueIndex: 23 } as never);
    hook = render();
    expect(hook.dialogueText).toBe('The last line of the block.');
    expect(getCurrentDialogueMock).toHaveBeenCalledWith('pangolin', 23, 0);
  });
});

describe('useDialogueFlow choice page (replies, postponement, echoed pick)', () => {
  const CHOICE = {
    prompt: 'Ember has warmed two cups. She keeps turning yours by the handle.',
    options: { ask: 'What did you know when I arrived?', refuse: 'I need some time before we talk.' },
    responses: { ask: 'ask response', refuse: 'refuse response' },
    convergence: 'convergence',
  };
  // Pangolin is a middle-tier animal, so global phase 3 is animal phase 3:
  // the one window where the choice page is queued (no other page builder
  // fires under these mocks).
  const progress3 = { ...progress, currentPhase: 3, phaseProgress: 70, puzzlesSolved: 70 };

  function renderAt3() {
    rewindHookIndices();
    mockActiveProgress = progress3;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useDialogueFlow({ progress: progress3 as never, setAnimals: setAnimals as never });
  }

  beforeEach(() => {
    resetHookState();
    animals = [{ ...pangolin }];
    jest.clearAllMocks();
    getCurrentDialogueMock.mockImplementation(() => ({ text: 'A regular line after the choice.' }));
    (getChoiceForAnimal as jest.Mock).mockResolvedValueOnce(CHOICE);
    (recordChoice as jest.Mock).mockImplementation(async (_type: string, pick: 'ask' | 'refuse') => ({
      response: CHOICE.responses[pick],
      convergence: CHOICE.convergence,
    }));
  });

  it('the prompt is an ordinary line with Next; Next turns the card over instead of advancing', async () => {
    let hook = renderAt3();
    await hook.handleAnimalTap(pangolin as never);
    hook = renderAt3();

    expect(hook.dialogueText).toBe(CHOICE.prompt);
    expect(hook.activeChoice).toEqual(CHOICE);
    expect(hook.choiceOpen).toBe(false);
    expect(hook.hasMoreToShow).toBe(true);

    await hook.handleNextDialogue();
    hook = renderAt3();
    // The prompt stays the head (the page's caption reads it); the answers
    // are now the only way forward.
    expect(hook.choiceOpen).toBe(true);
    expect(hook.dialogueText).toBe(CHOICE.prompt);
    expect(hook.activeChoice).toEqual(CHOICE);
    expect(recordDialogueMock).not.toHaveBeenCalled();
    expect(markDialogueReadMock).not.toHaveBeenCalled();
  });

  it('can postpone an unanswered question without consuming it or starting cooldown', async () => {
    let hook = renderAt3();
    await hook.handleAnimalTap(pangolin as never);
    hook = renderAt3();
    await hook.handleNextDialogue();
    hook = renderAt3();
    expect(hook.choiceOpen).toBe(true);

    await hook.handleCloseDialogue();
    hook = renderAt3();
    expect(hook.showDialogue).toBe(false);
    expect(hook.choiceOpen).toBe(false);
    expect(endSession).not.toHaveBeenCalled();
    expect(recordChoice).not.toHaveBeenCalled();
    expect(markDialogueReadMock).not.toHaveBeenCalled();
    (getChoiceForAnimal as jest.Mock).mockResolvedValueOnce(CHOICE);
    await hook.handleAnimalTap(pangolin as never);
    hook = renderAt3();
    expect(hook.activeChoice).toEqual(CHOICE);
    expect(hook.dialogueText).toBe(CHOICE.prompt);
  });

  it('picking an answer turns the card back with the pick echoed above the reply, then clears it', async () => {
    let hook = renderAt3();
    await hook.handleAnimalTap(pangolin as never);
    hook = renderAt3();
    await hook.handleNextDialogue();
    hook = renderAt3();

    await hook.handleDialogueChoice('refuse');
    hook = renderAt3();
    expect(recordChoice).toHaveBeenCalledWith('pangolin', 'refuse');
    expect(hook.choiceOpen).toBe(false);
    expect(hook.activeChoice).toBeNull();
    expect(hook.choiceEcho).toBe(CHOICE.options.refuse);
    expect(hook.dialogueText).toBe('refuse response');
    expect(hook.hasMoreToShow).toBe(true);
    // The answer a choice draws lives nowhere else: it is kept as a 'choice'.
    expect(recordWhisperMock).toHaveBeenCalledWith(expect.objectContaining({ text: 'refuse response', type: 'choice' }));

    // Leaving the reply for the convergence line drops the echo.
    await hook.handleNextDialogue();
    hook = renderAt3();
    expect(hook.dialogueText).toBe('convergence');
    expect(hook.choiceEcho).toBeNull();

    // And closing is allowed again.
    await hook.handleCloseDialogue();
    hook = renderAt3();
    expect(hook.showDialogue).toBe(false);
  });

  it('closing after the pick resets the page state for the next session', async () => {
    let hook = renderAt3();
    await hook.handleAnimalTap(pangolin as never);
    hook = renderAt3();
    await hook.handleNextDialogue();
    hook = renderAt3();
    await hook.handleDialogueChoice('ask');
    hook = renderAt3();
    expect(hook.choiceEcho).toBe(CHOICE.options.ask);

    await hook.handleCloseDialogue();
    hook = renderAt3();
    expect(hook.showDialogue).toBe(false);
    expect(hook.choiceOpen).toBe(false);
    expect(hook.choiceEcho).toBeNull();
  });
});


describe('choice delivery during the current visit', () => {
  const CHOICE = {
    prompt: 'Panko sets the pear aside.',
    options: { ask: 'Test it.', refuse: 'Leave it alone.' },
    responses: { ask: 'We will watch it.', refuse: 'We will leave it.' },
    convergence: 'She puts down the pot.',
  };
  const revealProgress = { ...progress, currentPhase: 4 };
  const nearChoice = { ...pangolin, currentDialogueIndex: 75 };
  const dialogue = require('../services/animalDialogue');
  const sessions = require('../services/dialogueSession');
  const currency = require('../services/amberCurrency');
  function renderReveal() {
    rewindHookIndices();
    mockActiveProgress = revealProgress;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useDialogueFlow({ progress: revealProgress as never, setAnimals: setAnimals as never });
  }
  beforeEach(() => {
    resetHookState();
    jest.clearAllMocks();
    animals = [{ ...nearChoice }];
    dialogue.getTotalDialogueCount.mockReturnValue(134);
    dialogue.hasMoreDialogues.mockReturnValue(true);
    dialogue.getCurrentDialogue.mockReturnValue({ text: 'The pear has stopped ripening.' });
    markReadThrough('pangolin', 75);
    dialogue.getCoordinatedEventLine.mockReturnValue(null);
    dialogue.getCrossAnimalReference.mockReturnValue(null);
    sessions.checkDialogueAvailability.mockResolvedValue({ available: true });
    sessions.getSessionStatus.mockReturnValue({ status: 'in_session', dialoguesRemaining: 5 });
    (getChoiceForAnimal as jest.Mock).mockReset().mockImplementation(async (_type, _phase, index) => index >= 76 ? CHOICE : null);
    (recordChoice as jest.Mock).mockImplementation(async (_type, choice) => ({
      choice, response: CHOICE.responses[choice as 'ask' | 'refuse'], convergence: CHOICE.convergence,
    }));
  });

  it('offers the choice immediately after crossing index 76 without reopening', async () => {
    let hook = renderReveal();
    await hook.handleAnimalTap(nearChoice as never);
    hook = renderReveal();
    expect(hook.activeChoice).toBeNull();
    await hook.handleNextDialogue();
    hook = renderReveal();
    expect(hook.selectedAnimal?.currentDialogueIndex).toBe(76);
    expect(hook.dialogueText).toBe(CHOICE.prompt);
    await hook.handleNextDialogue();
    expect(renderReveal().choiceOpen).toBe(true);
  });

  it('lets the choice and response finish when the threshold is the session limit', async () => {
    let hook = renderReveal();
    await hook.handleAnimalTap(nearChoice as never);
    hook = renderReveal();
    sessions.getSessionStatus.mockReturnValue({ status: 'in_session', dialoguesRemaining: 0 });
    await hook.handleNextDialogue();
    hook = renderReveal();
    expect(hook.showDialogue).toBe(true);
    expect(hook.dialogueText).toBe(CHOICE.prompt);
    await hook.handleNextDialogue();
    hook = renderReveal();
    await hook.handleDialogueChoice('ask');
    hook = renderReveal();
    expect(hook.dialogueText).toBe(CHOICE.responses.ask);
    await hook.handleNextDialogue();
    hook = renderReveal();
    expect(hook.dialogueText).toBe(CHOICE.convergence);
    await hook.handleNextDialogue();
    expect(renderReveal().showDialogue).toBe(false);
    expect(endSession).toHaveBeenCalledTimes(1);
  });

  it('leads with a due choice and preserves the later event until it is visible', async () => {
    markReadThrough('pangolin', 76);
    dialogue.getCoordinatedEventLine.mockReturnValueOnce({ text: 'The house heard a knock.', deliveryKey: 'knock:pangolin' });
    let hook = renderReveal();
    await hook.handleAnimalTap({ ...nearChoice, currentDialogueIndex: 76 } as never);
    hook = renderReveal();
    expect(hook.dialogueText).toBe(CHOICE.prompt);
    expect(currency.recordConsumedCoordinatedEvent).not.toHaveBeenCalled();
    await hook.handleNextDialogue();
    hook = renderReveal();
    await hook.handleDialogueChoice('refuse');
    hook = renderReveal();
    await hook.handleNextDialogue();
    hook = renderReveal();
    await hook.handleNextDialogue();
    hook = renderReveal();
    expect(hook.dialogueText).toBe('The house heard a knock.');
    expect(currency.recordConsumedCoordinatedEvent).toHaveBeenCalledWith('knock:pangolin');
  });

  it('keeps the options open after a failed save and allows an answer retry', async () => {
    markReadThrough('pangolin', 76);
    (recordChoice as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    let hook = renderReveal();
    await hook.handleAnimalTap({ ...nearChoice, currentDialogueIndex: 76 } as never);
    hook = renderReveal();
    await hook.handleNextDialogue();
    hook = renderReveal();
    await hook.handleDialogueChoice('ask');
    hook = renderReveal();
    expect(hook.choiceOpen).toBe(true);
    expect(hook.activeChoice).toBe(CHOICE);
    expect(hook.choiceEcho).toBeNull();
    expect(hook.choiceSaving).toBe(false);
    expect(hook.choiceError).toMatch(/couldn't be saved/);
    await hook.handleDialogueChoice('refuse');
    hook = renderReveal();
    expect(recordChoice).toHaveBeenCalledTimes(2);
    expect(hook.choiceOpen).toBe(false);
    expect(hook.dialogueText).toBe(CHOICE.responses.refuse);
    expect(hook.choiceError).toBeNull();
  });

  it('accepts one answer while the first tap is still saving', async () => {
    markReadThrough('pangolin', 76);
    let finish!: (value: unknown) => void;
    (recordChoice as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let hook = renderReveal();
    await hook.handleAnimalTap({ ...nearChoice, currentDialogueIndex: 76 } as never);
    hook = renderReveal();
    await hook.handleNextDialogue();
    hook = renderReveal();
    const first = hook.handleDialogueChoice('ask');
    hook = renderReveal();
    expect(hook.choiceSaving).toBe(true);
    await hook.handleDialogueChoice('refuse');
    await hook.handleCloseDialogue();
    await hook.handleNextDialogue();
    expect(renderReveal().showDialogue).toBe(true);
    expect(recordChoice).toHaveBeenCalledTimes(1);
    finish({ choice: 'ask', response: CHOICE.responses.ask, convergence: CHOICE.convergence });
    await first;
    hook = renderReveal();
    expect(hook.choiceEcho).toBe(CHOICE.options.ask);
    expect(hook.choiceSaving).toBe(false);
    await hook.handleCloseDialogue();
    expect(renderReveal().showDialogue).toBe(false);
  });
});


describe('regular conversation completion and retry', () => {
  const sessions = jest.requireMock('../services/dialogueSession');
  beforeEach(() => {
    resetHookState();
    jest.clearAllMocks();
    progress.currentPhase = 0;
    animals = [{ ...pangolin }];
    sessions.checkDialogueAvailability.mockResolvedValue({ available: true });
    sessions.getSessionStatus.mockReturnValue({ status: 'in_session', dialoguesRemaining: 5 });
    sessions.isOnCooldown.mockReturnValue(false);
    (getChoiceForAnimal as jest.Mock).mockReset().mockResolvedValue(null);
    getCurrentDialogueMock.mockImplementation((_type, index) => ({ text: index === 0 ? 'The first conversation.' : SHORT_LINE }));
  });
  afterEach(() => { progress.currentPhase = 0; progress.cycleCount = 0; });

  it('does not trust a high legacy cursor as proof that earlier lines were heard', async () => {
    let hook = render();
    await hook.handleAnimalTap({ ...pangolin, currentDialogueIndex: 120 } as never);
    hook = render();
    expect(hook.selectedAnimal?.currentDialogueIndex).toBe(0);
    expect(hook.dialogueText).toBe('The first conversation.');
    expect(completeConversationMock).not.toHaveBeenCalled();
  });

  it('leaves the terminal line unread on Close, then saves it only after explicit Next', async () => {
    markReadThrough('pangolin', 23);
    let hook = render();
    await hook.handleAnimalTap(pangolin as never);
    hook = render();
    expect(hook.hasMoreToShow).toBe(true);
    await hook.handleCloseDialogue();
    expect(completeConversationMock).not.toHaveBeenCalled();
    expect(recordDialogueMock).not.toHaveBeenCalled();
    hook = render();
    await hook.handleAnimalTap(pangolin as never);
    hook = render();
    expect(hook.selectedAnimal?.currentDialogueIndex).toBe(23);
    await hook.handleNextDialogue();
    hook = render();
    expect(completeConversationMock).toHaveBeenCalledWith('pangolin', lineId('pangolin', 23), 0);
    expect(hook.dialogueText).toBe('caught up (phase 0)');
    expect(hook.hasMoreToShow).toBe(false);
    expect(markDialogueReadMock).not.toHaveBeenCalled();
  });

  it('keeps a failed receipt on the same line and publishes progress only after retry succeeds', async () => {
    completeConversationMock.mockRejectedValueOnce(new Error('disk full'));
    let hook = render();
    await hook.handleAnimalTap(pangolin as never);
    hook = render();
    await hook.handleNextDialogue();
    hook = render();
    expect(hook.dialogueSaveError).toMatch(/retry/);
    expect(hook.choiceSaving).toBe(false);
    expect(hook.dialogueText).toBe('The first conversation.');
    expect(recordDialogueMock).not.toHaveBeenCalled();
    expect(conversationProgressCallback).not.toHaveBeenCalled();
    await hook.handleNextDialogue();
    hook = render();
    expect(completeConversationMock.mock.calls).toEqual([
      ['pangolin', lineId('pangolin', 0), 0], ['pangolin', lineId('pangolin', 0), 0],
    ]);
    expect(hook.dialogueSaveError).toBeNull();
    expect(hook.dialogueText).toBe(SHORT_LINE);
    expect(conversationProgressCallback).toHaveBeenCalledWith({ pangolin: [lineId('pangolin', 0)] }, 0);
    expect(recordDialogueMock).toHaveBeenCalledTimes(1);
  });

  it('blocks close and visit chaining while a durable write still needs recovery', async () => {
    completeConversationMock.mockRejectedValueOnce(new StorageRecoveryRequiredError(new Error('interrupted commit')));
    let hook = render();
    await hook.handleAnimalTap(pangolin as never);
    hook = render();
    await hook.handleNextDialogue();
    hook = render();
    await hook.handleCloseDialogue();
    await hook.handleVisitNextAnimal({ ...pangolin, id: 'fox', type: 'fox' } as never);
    hook = render();
    expect(hook.showDialogue).toBe(true);
    expect(hook.selectedAnimal?.id).toBe('pangolin');
    await hook.handleNextDialogue();
    hook = render();
    expect(hook.dialogueSaveError).toBeNull();
    await hook.handleCloseDialogue();
    expect(render().showDialogue).toBe(false);
  });

  it('accepts one completion while a slow save owns the visit', async () => {
    let finish!: (result: unknown) => void;
    completeConversationMock.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let hook = render();
    await hook.handleAnimalTap(pangolin as never);
    hook = render();
    const first = hook.handleNextDialogue();
    await Promise.resolve();
    hook = render();
    expect(hook.choiceSaving).toBe(true);
    await hook.handleNextDialogue();
    await hook.handleCloseDialogue();
    expect(completeConversationMock).toHaveBeenCalledTimes(1);
    finish(await mockCompleteConversation('pangolin', lineId('pangolin', 0), 0));
    await first;
    hook = render();
    expect(hook.selectedAnimal?.currentDialogueIndex).toBe(1);
    expect(conversationProgressCallback).toHaveBeenCalledTimes(1);
    expect(recordDialogueMock).toHaveBeenCalledTimes(1);
  });

  it('does not publish a completed old visit after its owner unmounts', async () => {
    let finish!: (result: unknown) => void;
    completeConversationMock.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let hook = render();
    const disposeVisit = effectCallbacks[0]() as unknown as () => void;
    await hook.handleAnimalTap(pangolin as never);
    hook = render();
    const first = hook.handleNextDialogue();
    await Promise.resolve();
    const result = await mockCompleteConversation('pangolin', lineId('pangolin', 0), 0);
    disposeVisit();
    finish(result);
    await first;
    expect(conversationProgressCallback).not.toHaveBeenCalled();
    expect(recordDialogueMock).not.toHaveBeenCalled();
  });

  it('keeps a rejected earlier-cycle completion from becoming new-cycle progress', async () => {
    let finish!: () => void;
    completeConversationMock.mockImplementationOnce((...args) => new Promise((resolve, reject) => {
      finish = () => { void mockCompleteConversation(...args).then(resolve, reject); };
    }));
    let hook = render();
    await hook.handleAnimalTap(pangolin as never);
    hook = render();
    const first = hook.handleNextDialogue();
    await Promise.resolve();
    progress.cycleCount = 1;
    finish();
    await first;
    expect(completeConversationMock).toHaveBeenCalledWith('pangolin', lineId('pangolin', 0), 0);
    expect(conversationProgressCallback).not.toHaveBeenCalled();
    expect(recordDialogueMock).not.toHaveBeenCalled();
  });

  it('keeps completed receipts through a later parent amber update', async () => {
    let ownedProgress = { ...progress, conversationReadIds: {} as Record<string, string[]> };
    const publish = jest.fn((ids: Record<string, string[]>) => { ownedProgress = { ...ownedProgress, conversationReadIds: ids }; });
    const renderOwned = () => {
      rewindHookIndices();
      mockActiveProgress = ownedProgress;
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useDialogueFlow({ progress: ownedProgress as never, setAnimals: setAnimals as never, onConversationProgress: publish });
    };
    let hook = renderOwned();
    await hook.handleAnimalTap(pangolin as never);
    hook = renderOwned();
    await hook.handleNextDialogue();
    ownedProgress = { ...ownedProgress, amber: 100 };
    hook = renderOwned();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(hook.dialogueText).toBe(SHORT_LINE);
    expect(hook.selectedAnimal?.currentDialogueIndex).toBe(1);
  });

  it.each([2, 3, 4, 5])('uses the normal visit allowance for late residents at phase %i', async (phase) => {
    progress.currentPhase = phase;
    const hook = render();
    await hook.handleAnimalTap({ ...pangolin, id: 'tarsier', type: 'tarsier' } as never);
    expect(checkDialogueAvailabilityMock).toHaveBeenCalledWith('tarsier', 0);
  });
});

describe('full introductions before regular dialogue', () => {
  const sessions = jest.requireMock('../services/dialogueSession');
  const thyme = { ...pangolin, id: 'rabbit', type: 'rabbit', name: 'Thyme', currentDialogueIndex: 76 };
  let introductionProgress: typeof progress;
  const presentIntroduction = jest.fn(async () => {});
  function renderPersonal() {
    rewindHookIndices();
    mockActiveProgress = introductionProgress;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useDialogueFlow({ progress: introductionProgress as never, setAnimals: setAnimals as never,
      onIntroduction: presentIntroduction });
  }
  beforeEach(() => {
    resetHookState();
    jest.clearAllMocks();
    introductionProgress = { ...progress, currentPhase: 3, unlockedAnimals: ['pangolin', 'rabbit'], introsSeen: ['pangolin'] };
    animals = [pangolin, thyme];
    sessions.checkDialogueAvailability.mockResolvedValue({ available: true });
    sessions.isOnCooldown.mockReturnValue(false);
    sessions.getSessionStatus.mockReturnValue({ status: 'in_session', dialoguesRemaining: 5 });
    (getChoiceForAnimal as jest.Mock).mockReset().mockResolvedValue(null);
    getCurrentDialogueMock.mockReturnValue({ text: 'An ordinary conversation.' });
    presentIntroduction.mockReset().mockResolvedValue(undefined);
  });

  it.each([0, 3, 4, 5])('opens an unseen resident at world phase %i before cooldown or any cursor writes', async (phase) => {
    introductionProgress.currentPhase = phase;
    sessions.checkDialogueAvailability.mockResolvedValue({ available: false });
    let hook = renderPersonal();
    await hook.handleAnimalTap(thyme as never);
    hook = renderPersonal();
    expect(presentIntroduction).toHaveBeenCalledWith(thyme);
    expect(checkDialogueAvailability).not.toHaveBeenCalled();
    expect(getChoiceForAnimal).not.toHaveBeenCalled();
    expect(markIntroSeen).not.toHaveBeenCalled();
    expect(completeConversationMock).not.toHaveBeenCalled();
    expect(markDialogueRead).not.toHaveBeenCalled();
    expect(recordDialogue).not.toHaveBeenCalled();
    expect(hook.showDialogue).toBe(false);
  });

  it('keeps established introductions and begins their oldest unread regular line', async () => {
    introductionProgress = { ...introductionProgress, introsSeen: ['pangolin', 'rabbit'] };
    let hook = renderPersonal();
    await hook.handleAnimalTap(thyme as never);
    hook = renderPersonal();
    expect(presentIntroduction).not.toHaveBeenCalled();
    expect(hook.showDialogue).toBe(true);
    expect(hook.selectedAnimal?.currentDialogueIndex).toBe(0);
    expect(hook.dialogueText).toBe('An ordinary conversation.');
    expect(completeConversationMock).not.toHaveBeenCalled();
    expect(recordChoice).not.toHaveBeenCalled();
  });

  it('offers an unseen friend in the visit chain despite a spent session and cooldown', async () => {
    let hook = renderPersonal();
    await hook.handleAnimalTap(pangolin as never);
    hook = renderPersonal();
    sessions.isOnCooldown.mockReturnValue(true);
    sessions.getSessionStatus.mockReturnValue({ status: 'in_session', dialoguesRemaining: 0 });
    expect(hook.getNextAnimalWithNews([pangolin, thyme] as never)).toEqual(thyme);
  });

  it('keeps a failed introduction retryable without consuming regular material', async () => {
    presentIntroduction.mockRejectedValueOnce(new Error('disk full'));
    let hook = renderPersonal();
    await hook.handleAnimalTap(thyme as never);
    hook = renderPersonal();
    expect(hook.cooldownMessage).toMatch(/try again/);
    expect(hook.showDialogue).toBe(false);
    expect(checkDialogueAvailability).not.toHaveBeenCalled();
    expect(completeConversationMock).not.toHaveBeenCalled();
    await hook.handleAnimalTap(thyme as never);
    expect(presentIntroduction).toHaveBeenCalledTimes(2);
    expect(renderPersonal().cooldownMessage).toBeNull();
  });
});
