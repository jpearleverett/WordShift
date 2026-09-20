import React, { ReactElement } from 'react';
import { StoryArchiveHistory, loadStoryArchiveHistory } from '../services/storyArchive';
import { StoryContext, StoryMemory, StoryState, STORY_COPY, loadStoryState } from '../services/storySpine';

// Use the component's actual state and callbacks with inert native views. The
// deferred reads below model opening the journal during slow/failing storage.
let mockState: unknown[] = [];
let mockStateIndex = 0;
let mockEffect: (() => void | (() => void)) | undefined;
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: (initial: unknown) => {
    const index = mockStateIndex++;
    if (!(index in mockState)) mockState[index] = initial;
    return [mockState[index], (next: unknown) => {
      mockState[index] = typeof next === 'function' ? next(mockState[index]) : next;
    }];
  },
  useMemo: (calculate: () => unknown) => calculate(),
  useEffect: (effect: () => void | (() => void)) => { mockEffect = effect; },
}));
jest.mock('react-native', () => ({
  Modal: 'Modal', View: 'View', Image: 'Image', ScrollView: 'ScrollView',
  FlatList: 'FlatList', Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles },
  useWindowDimensions: () => ({ height: 800, width: 360 }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) }));
jest.mock('../components/ui/AppText', () => ({ AppText: 'AppText' }));
jest.mock('../components/ui/PanelCard', () => ({ PanelCard: 'PanelCard' }));
jest.mock('../components/ui/CandyButton', () => ({ CandyButton: 'CandyButton' }));
jest.mock('../components/StoryPortrait', () => ({ StoryPortrait: 'StoryPortrait' }));
jest.mock('../services/settings', () => ({ getSettingsSync: () => ({ reducedMotion: true }) }));
jest.mock('../services/storySpine', () => ({
  ...jest.requireActual('../services/storySpine'),
  loadStoryState: jest.fn(), selectStoryScene: jest.fn(() => null),
}));
jest.mock('../services/storyArchive', () => ({
  ...jest.requireActual('../services/storyArchive'),
  loadStoryArchiveHistory: jest.fn(),
}));

import { StoryJournalModal, StoryJournalModalProps } from '../components/StoryJournalModal';
import { getDialoguesForAnimal } from '../services/dialogue/animalDialogueBase';

type Element = ReactElement<Record<string, any>>;
function expand(node: React.ReactNode): Element[] {
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  if (typeof element.type === 'function') {
    return expand((element.type as (props: Record<string, any>) => React.ReactNode)(element.props));
  }
  return [element, ...React.Children.toArray(element.props.children).flatMap(expand)];
}
const context: StoryContext = { phase: 3, puzzlesSolved: 80, cycleCount: 0, unlockedAnimals: ['fox', 'owl'] };
const props: StoryJournalModalProps = { visible: true, context, onClose: jest.fn(), onResume: jest.fn() };
const state = { memories: {} } as StoryState;
const foxLine = getDialoguesForAnimal('fox', 0)[0];
const history: StoryArchiveHistory = { cycleCount: 0, readIds: { fox: [foxLine.id] } };
const render = () => { mockStateIndex = 0; return expand(StoryJournalModal(props) as React.ReactNode); };
const labels = (tree: Element[]) => tree.filter(node => node.type === 'AppText').map(node => node.props.children);
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const settle = async () => { for (let index = 0; index < 5; index++) await Promise.resolve(); };
function openArchive() {
  render().find(node => node.props.accessibilityRole === 'tab' &&
    (node.props.children as Element).props.children === STORY_COPY.archive)!.props.onPress();
  return render().find(node => node.type === 'FlatList')!;
}
beforeEach(() => {
  jest.clearAllMocks();
  mockState = []; mockStateIndex = 0; mockEffect = undefined;
});

test('waits for both stories and completion receipts before exposing either journal tab', async () => {
  const stories = deferred<StoryState>();
  const receipts = deferred<StoryArchiveHistory>();
  jest.mocked(loadStoryState).mockReturnValue(stories.promise);
  jest.mocked(loadStoryArchiveHistory).mockReturnValue(receipts.promise);
  expect(labels(render())).toContain(STORY_COPY.loading);
  mockEffect!();
  stories.resolve(state);
  await settle();
  expect(labels(render())).toContain(STORY_COPY.loading);
  expect(render().some(node => node.props.accessibilityRole === 'tab')).toBe(false);
  receipts.resolve(history);
  await settle();
  const list = openArchive();
  expect(list.props.data).toEqual([{ id: 'fox', animal: 'fox', count: 1 }]);
  const row = list.props.renderItem({ item: list.props.data[0] });
  row.props.onPress();
  expect(render().find(node => node.type === 'FlatList')!.props.data).toEqual([foxLine]);
});

test('an unreadable receipt ledger exposes retry and never falls back to unlocked dialogue', async () => {
  jest.mocked(loadStoryState).mockResolvedValue(state);
  jest.mocked(loadStoryArchiveHistory).mockRejectedValueOnce(new Error('disk unavailable')).mockResolvedValueOnce(history);
  render(); mockEffect!(); await settle();
  const failed = render();
  expect(labels(failed)).toContain(STORY_COPY.journalLoadError);
  expect(failed.some(node => node.type === 'FlatList' || node.props.accessibilityRole === 'tab')).toBe(false);
  failed.find(node => node.type === 'CandyButton' && node.props.label === STORY_COPY.retry)!.props.onPress();
  expect(labels(render())).toContain(STORY_COPY.loading);
  mockEffect!(); await settle();
  expect(openArchive().props.data).toEqual([{ id: 'fox', animal: 'fox', count: 1 }]);
  expect(loadStoryArchiveHistory).toHaveBeenCalledTimes(2);
});

test('an unmounted journal ignores reads that finish after it closes', async () => {
  const receipts = deferred<StoryArchiveHistory>();
  jest.mocked(loadStoryState).mockResolvedValue(state);
  jest.mocked(loadStoryArchiveHistory).mockReturnValue(receipts.promise);
  render();
  const cleanup = mockEffect!();
  cleanup?.();
  receipts.resolve(history);
  await settle();
  expect(labels(render())).toContain(STORY_COPY.loading);
});


function memory(overrides: Partial<StoryMemory> = {}): StoryMemory {
  return { scene: { id: 'cup', title: 'A place at the table', memory: 'The cup stayed by the fire.', lines: [{ speaker: 'fox', text: 'Your cup is waiting.' }] }, page: 0, completed: true, presentationPhase: 0, ...overrides };
}
async function loadedJournal(value: StoryState) {
  jest.mocked(loadStoryState).mockResolvedValue(value);
  jest.mocked(loadStoryArchiveHistory).mockResolvedValue(history);
  render(); mockEffect!(); await settle();
  return render();
}

test('current and earlier-cycle memory cards identify their resident in the original costume', async () => {
  const current = memory();
  const previous = memory({ scene: { id: 'record', title: 'A dated account', memory: 'An account was kept.', lines: [{ speaker: 'owl', text: 'I have written it down.' }] }, presentationPhase: 4 });
  const tree = await loadedJournal({ ...state, memories: { cup: current }, previousCycles: [{ cycle: 0, memories: { record: previous } }] } as StoryState);
  const portraits = tree.filter(node => node.type === 'StoryPortrait');
  expect(portraits.map(node => ({ speaker: node.props.speaker, phase: node.props.phase }))).toEqual([
    { speaker: 'fox', phase: 0 }, { speaker: 'owl', phase: 4 },
  ]);
  for (const portrait of portraits) {
    expect(portrait.props.size).toBe(56);
    expect(portrait.props.speaking).toBe(false);
  }
  const cards = tree.filter(node => node.props.accessibilityRole === 'button');
  expect(cards.map(node => node.props.accessibilityLabel)).toEqual([
    'A place at the table. Ember. The cup stayed by the fire.',
    'A dated account. Archimedes. An account was kept.',
  ]);
  expect(labels(tree)).toEqual(expect.arrayContaining(['Ember', 'Archimedes']));
  // Text can wrap beside the bounded portrait instead of being cut off.
  expect(tree.some(node => node.type === 'View' && node.props.style?.flex === 1 && node.props.style?.minWidth === 0)).toBe(true);
  cards[1].props.onPress();
  expect(labels(render())).toContainEqual(['Cycle ', 1, '. This answer belongs to that earlier morning.']);
});

test('each earlier-conversation entry shows its own resident and still opens only completed lines', async () => {
  await loadedJournal(state);
  const list = openArchive();
  const row = list.props.renderItem({ item: list.props.data[0] });
  const expanded = expand(row);
  const portrait = expanded.find(node => node.type === 'StoryPortrait')!;
  expect(portrait.props).toMatchObject({ speaker: 'fox', phase: 3, size: 56, speaking: false });
  expect(row.props.accessibilityLabel).toBe('Ember. One line kept');
  row.props.onPress();
  expect(render().find(node => node.type === 'FlatList')!.props.data).toEqual([foxLine]);
});

test('narrator-led memories use the established companion while locked residents stay concealed', async () => {
  const narrator = memory({ scene: { id: 'old_mark', title: 'A mark in the wood', memory: 'The mark remained.', lines: [{ speaker: 'narrator', text: 'The window was open.' }] } });
  const locked = memory({ scene: { id: 'seeds', title: 'Something kept', memory: 'A promise.', lines: [{ speaker: 'kakapo', text: 'This resident is still locked.' }] } });
  const tree = await loadedJournal({ ...state, memories: { old_mark: narrator, seeds: locked } } as StoryState);
  const portraits = tree.filter(node => node.type === 'StoryPortrait');
  expect(portraits.map(node => node.props.speaker)).toEqual(['fox']);
  // A card with no resident to show names nobody: "The house" is never a
  // speaker, so the concealed card carries only its title and summary.
  expect(labels(tree)).not.toContain(STORY_COPY.narrator);
  const concealed = tree.find(node => node.props.accessibilityRole === 'button' && String(node.props.accessibilityLabel).startsWith('Something kept'))!;
  expect(concealed.props.accessibilityLabel).not.toContain(STORY_COPY.narrator);
  expect(tree.some(node => node.type === 'Image' && node.props.style?.width === 56 && node.props.style?.height === 56)).toBe(true);
});
