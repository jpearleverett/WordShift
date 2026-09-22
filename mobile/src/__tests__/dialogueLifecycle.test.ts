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

jest.mock('../services/gameAlert', () => ({ showGameAlert: jest.fn() }));

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

jest.mock('../services/conversationProgress', () => ({
  getNextAnimalConversation: jest.fn((progress, type) => {
    const index = (progress.conversationReadIds?.[type] ?? []).length;
    return { dialogue: { id: `test_${type}_${index}`, phase: 0, text: `Regular line ${index}.` }, index };
  }),
  completeAnimalConversationLine: jest.fn(async (type, id) => ({
    conversationReadIds: { [type]: [id] },
    next: { dialogue: { id: `test_${type}_1`, phase: 0, text: 'Regular line 1.' }, index: 1 },
    nextIndex: 1,
    cycleCount: 0,
    completed: true,
  })),
}));

jest.mock('../services/dialogueSession', () => ({
  checkDialogueAvailability: jest.fn(async () => ({ available: true })),
  recordDialogue: jest.fn(async () => {}),
  endSession: jest.fn(async () => {}),
  getSession: jest.fn(() => null),
  getSessionStatus: jest.fn(() => ({ status: 'in_session', dialoguesRemaining: 5 })),
  isOnCooldown: jest.fn(() => false),
  updateSessionPhase: jest.fn(),
  updateConversationBacklog: jest.fn(),
}));

jest.mock('../services/amberCurrency', () => ({
  markDialogueRead: jest.fn(async () => {}),
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
  getDialogueSessionEndMessage: jest.fn((_p: number, name: string, _t: string, resting: boolean) =>
    resting ? `${name} wants to rest now.` : `${name} still has more to say.`),
  getDialogueCooldownMessage: jest.fn((_p: number, name: string) => `${name} is resting.`),
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

import { useDialogueFlow } from '../hooks/useDialogueFlow';
import { showGameAlert } from '../services/gameAlert';
import { getCurrentDialogue } from '../services/animalDialogue';
import { checkDialogueAvailability, recordDialogue } from '../services/dialogueSession';
import { markDialogueRead } from '../services/amberCurrency';
import { completeAnimalConversationLine } from '../services/conversationProgress';

const getCurrentDialogueMock = getCurrentDialogue as jest.Mock;
const recordDialogueMock = recordDialogue as jest.Mock;
const markDialogueReadMock = markDialogueRead as jest.Mock;
const checkDialogueAvailabilityMock = checkDialogueAvailability as jest.Mock;

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

async function flushReads() {
  for (let i = 0; i < 30; i++) await Promise.resolve();
}

const amber = jest.requireMock('../services/amberCurrency');
const dialogue = jest.requireMock('../services/animalDialogue');

describe('dialogue visit ownership and rapid navigation', () => {
  beforeEach(() => {
    resetHookState();
    jest.clearAllMocks();
    animals = [{ ...pangolin }];
    getCurrentDialogueMock.mockImplementation((_type: string, index: number) => ({ text: `Regular line ${index}.` }));
    amber.getPendingVariantTutorials.mockResolvedValue([]);
    amber.acknowledgeVariantTutorial.mockResolvedValue(undefined);
    dialogue.getVariantTutorialDialogue.mockReturnValue(null);
    dialogue.peekNarrativeSeedPage.mockResolvedValue(null);
  });

  it('does not expose regular dialogue before the visit introduction finishes loading', async () => {
    const pending = deferred<string[]>();
    amber.getPendingVariantTutorials.mockReturnValueOnce(pending.promise);
    dialogue.getVariantTutorialDialogue.mockReturnValue('Try the chain from its other end.');
    const opening = render().handleAnimalTap(pangolin as never);
    await flushReads();
    expect(render().showDialogue).toBe(false);
    pending.resolve(['reverse']);
    await opening;
    expect(render().dialogueText).toBe('Try the chain from its other end.');
    expect(render().showDialogue).toBe(true);
    expect(amber.acknowledgeVariantTutorial).not.toHaveBeenCalled();
  });

  it('keeps an interrupted mode note queued instead of publishing stale dialogue', async () => {
    const pending = deferred<string[]>();
    amber.getPendingVariantTutorials.mockReturnValueOnce(pending.promise);
    dialogue.getVariantTutorialDialogue.mockReturnValue('The path runs backward.');
    const opening = render().handleAnimalTap(pangolin as never);
    await flushReads();
    await render().handleCloseDialogue();
    pending.resolve(['reverse']);
    await opening;
    expect(render().showDialogue).toBe(false);
    expect(render().selectedAnimal).toBeNull();
    expect(amber.acknowledgeVariantTutorial).not.toHaveBeenCalled();
  });

  it('does not burn a mode note if the screen unmounts during its storage reads', async () => {
    const pending = deferred<string[]>();
    amber.getPendingVariantTutorials.mockReturnValueOnce(pending.promise);
    dialogue.getVariantTutorialDialogue.mockReturnValue('The path runs backward.');
    const hook = render();
    const cleanups = effectCallbacks.map(run => run()).filter(value => typeof value === 'function');
    const opening = hook.handleAnimalTap(pangolin as never);
    await flushReads();
    cleanups.forEach(cleanup => (cleanup as () => void)());
    pending.resolve(['reverse']);
    await opening;
    expect(amber.acknowledgeVariantTutorial).not.toHaveBeenCalled();
    expect(render().showDialogue).toBe(false);
  });

  it('coalesces overlapping animal taps into one visit', async () => {
    const pending = deferred<string[]>();
    amber.getPendingVariantTutorials.mockReturnValueOnce(pending.promise);
    const hook = render();
    const opening = hook.handleAnimalTap(pangolin as never);
    await hook.handleAnimalTap({ ...pangolin, id: 'fox', type: 'fox' } as never);
    pending.resolve([]);
    await opening;
    expect(checkDialogueAvailabilityMock).toHaveBeenCalledTimes(1);
    expect(render().selectedAnimal?.id).toBe('pangolin');
  });

  it('keeps a mode note unread when the player closes it mid-conversation', async () => {
    amber.getPendingVariantTutorials.mockResolvedValue(['reverse']);
    dialogue.getVariantTutorialDialogue.mockReturnValue('The path runs backward.');
    await render().handleAnimalTap(pangolin as never);
    await render().handleCloseDialogue();
    expect(amber.acknowledgeVariantTutorial).not.toHaveBeenCalled();
    await render().handleAnimalTap(pangolin as never);
    expect(render().dialogueText).toBe('The path runs backward.');
  });

  it('keeps the current note visible after acknowledgement fails and lets Next retry', async () => {
    amber.getPendingVariantTutorials.mockResolvedValue(['reverse']);
    dialogue.getVariantTutorialDialogue.mockReturnValue('The path runs backward.');
    amber.acknowledgeVariantTutorial.mockRejectedValueOnce(new Error('storage full'));
    await render().handleAnimalTap(pangolin as never);
    await render().handleNextDialogue();
    expect(render().dialogueText).toBe('The path runs backward.');
    expect(showGameAlert).toHaveBeenCalledWith("Couldn't save the conversation", 'Your place is kept. Tap Next again to retry.');
    await render().handleNextDialogue();
    expect(render().dialogueText).toBe('Regular line 0.');
    expect(amber.acknowledgeVariantTutorial).toHaveBeenCalledTimes(2);
  });

  it('does not lose a queued story page to a same-tick double Next', async () => {
    amber.getPendingVariantTutorials.mockResolvedValue(['reverse']);
    dialogue.getVariantTutorialDialogue.mockReturnValue('The path runs backward.');
    dialogue.peekNarrativeSeedPage.mockResolvedValueOnce({ text: 'The next story beat.' });
    await render().handleAnimalTap(pangolin as never);
    const hook = render();
    await Promise.all([hook.handleNextDialogue(), hook.handleNextDialogue()]);
    expect(render().dialogueText).toBe('The next story beat.');
    expect(amber.acknowledgeVariantTutorial).toHaveBeenCalledTimes(1);
    expect(recordDialogueMock).not.toHaveBeenCalled();
  });

  it('does not double-spend the session or let Close interrupt a saved Next', async () => {
    await render().handleAnimalTap(pangolin as never);
    const pending = deferred<void>();
    recordDialogueMock.mockReturnValueOnce(pending.promise);
    const hook = render();
    const advance = hook.handleNextDialogue();
    await flushReads();
    await Promise.all([hook.handleNextDialogue(), hook.handleCloseDialogue()]);
    expect(recordDialogueMock).toHaveBeenCalledTimes(1);
    expect(render().showDialogue).toBe(true);
    pending.resolve();
    await advance;
    expect(completeAnimalConversationLine).toHaveBeenCalledTimes(1);
    expect(completeAnimalConversationLine).toHaveBeenCalledWith('pangolin', 'test_pangolin_0', 0);
    expect(markDialogueReadMock).not.toHaveBeenCalled();
    expect(render().dialogueText).toBe('Regular line 1.');
  });
});
