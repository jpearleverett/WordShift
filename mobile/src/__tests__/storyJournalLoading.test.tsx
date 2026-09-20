import React, { ReactElement } from 'react';
import { StoryArchiveHistory, loadStoryArchiveHistory } from '../services/storyArchive';
import { StoryContext, StoryState, STORY_COPY, loadStoryState } from '../services/storySpine';

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
