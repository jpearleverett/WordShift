import React, { type ReactElement } from 'react';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: jest.fn(),
  useRef: (current: unknown) => ({ current }),
  useState: (value: unknown) => [value, jest.fn()],
}));
jest.mock('react-native', () => ({
  Image: 'Image', Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', View: 'View',
  StyleSheet: { create: (value: unknown) => value },
  useWindowDimensions: jest.fn(() => ({ width: 393, height: 873, fontScale: 1 })),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 48, bottom: 24 }) }));
jest.mock('../theme/fonts', () => ({ BODY_FONT: 'body', BODY_FONT_ITALIC: 'italic', PIXEL_FONT_BOLD: 'bold' }));
jest.mock('../services/settings', () => ({ getSettingsSync: () => ({ reducedMotion: true }) }));
jest.mock('../services/a11yAnnounce', () => ({ announceForA11y: jest.fn() }));
jest.mock('../services/storyArchive', () => ({ getStorySpeakerName: (speaker: string) => speaker === 'fox' ? 'Ember' : speaker === 'player' ? 'You' : 'The house' }));
jest.mock('../services/storySpine', () => ({
  STORY_COPY: { continue: 'Continue', finish: 'Keep this memory', later: 'Come back to this' },
  getStoryPages: (memory: { scene: { lines: unknown[] } }) => memory.scene.lines,
  getStoryPresentationPhase: () => 0,
  getStoryPortraitSpeaker: () => 'fox',
}));
jest.mock('../components/storyPageArt', () => ({
  getStoryPageArt: () => ({ source: { uri: 'story.webp', width: 960, height: 540 } }),
}));
jest.mock('../components/StoryPortrait', () => ({ StoryPortrait: 'StoryPortrait' }));
jest.mock('../components/ui/PanelCard', () => ({ PanelCard: 'PanelCard' }));
jest.mock('../components/ui/AppText', () => ({ AppText: 'AppText' }));
jest.mock('../components/ui/CandyButton', () => ({ CandyButton: 'CandyButton' }));

import { useWindowDimensions } from 'react-native';
import { StorySceneModal } from '../components/StorySceneModal';
import { StoryMemory } from '../services/storySpine';
import { SURFACE } from '../theme/surfaces';

type Element = ReactElement<Record<string, any>>;
function flatten(node: React.ReactNode): Element[] {
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  return [element, ...React.Children.toArray(element.props.children).flatMap(flatten)];
}
function style(value: unknown): Record<string, any> {
  return Object.assign({}, ...[value].flat(Infinity).filter(Boolean));
}
function render(speaker: 'fox' | 'narrator' | 'player' = 'fox') {
  const memory = { scene: { id: 'cup', title: 'A place at the table', lines: [{ speaker, text: 'Tea or cocoa?' }] }, page: 0, completed: false } as StoryMemory;
  return flatten(StorySceneModal({ memory, phase: 0, onAdvance: jest.fn(), onChoose: jest.fn(), onClose: jest.fn() }) as React.ReactNode);
}

it.each([[393, 873, 1], [320, 568, 2], [844, 390, 1]])(
  'overrides both native asset dimensions on a %i×%i screen at scale %s', (width, height, fontScale) => {
    jest.mocked(useWindowDimensions).mockReturnValue({ width, height, fontScale, scale: 2 });
    const tree = render();
    const image = tree.find(item => item.type === 'Image')!.props;
    // Android Image prepends source dimensions before flattening the supplied
    // styles. A percentage width plus aspectRatio leaves source.height=540.
    const native = { width: image.source.width, height: image.source.height, ...style(image.style) };
    expect(typeof native.width).toBe('number');
    expect(typeof native.height).toBe('number');
    expect(native.height).toBeLessThanOrEqual(136);
    expect(native.width / native.height).toBeCloseTo(16 / 9);
    expect(image.resizeMode).toBe('contain');
    const panel = style(tree.find(item => item.type === 'PanelCard')!.props.style);
    const scroll = tree.find(item => item.type === 'ScrollView')!.props;
    expect(native.width).toBeLessThanOrEqual(panel.width - SURFACE.panelPadX * 2);
    expect(style(scroll.style).maxHeight + panel.paddingVertical * 2).toBe(panel.maxHeight);
    expect(style(scroll.contentContainerStyle).width).toBe(panel.width);
    expect(tree.find(item => item.props.testID === 'story-scene-text')?.props.children).toBe('Tea or cocoa?');
    expect(tree.some(item => item.props.label === 'Keep this memory')).toBe(true);
    expect(tree.some(item => item.props.label === 'Come back to this')).toBe(true);
  },
);

it('keeps the compact animal portrait while the narrator speaks, with no nameplate', () => {
  const tree = render('narrator');
  const portrait = tree.find(item => item.type === 'StoryPortrait')!.props;
  expect(portrait.speaker).toBe('fox');
  expect(portrait.speaking).toBe(false);
  expect(portrait.size).toBeLessThanOrEqual(56);
  // Narration used to be captioned "The house" beside Ember's portrait, which
  // read as Ember speaking as the house. The narrator has no nameplate at all.
  expect(tree.find(item => item.props.testID === 'story-scene-speaker')).toBeUndefined();
  expect(tree.some(item => item.props.children === 'The house')).toBe(false);
  const text = tree.find(item => item.props.testID === 'story-scene-text')!.props;
  expect(style(text.style).fontFamily).toBe('italic');
});

it('names the resident on their own line', () => {
  const tree = render('fox');
  expect(tree.find(item => item.props.testID === 'story-scene-speaker')!.props.children).toBe('Ember');
  expect(tree.find(item => item.type === 'StoryPortrait')!.props.speaking).toBe(true);
});

it("shows the nameplate alone on the player's own line and keeps the row height", () => {
  const tree = render('player');
  expect(tree.find(item => item.props.testID === 'story-scene-speaker')!.props.children).toBe('You');
  expect(tree.find(item => item.type === 'StoryPortrait')).toBeUndefined();
  const speakerRow = tree.find(item => item.props.testID === 'story-scene-speaker')!;
  void speakerRow;
  const rows = tree.filter(item => item.type === 'View' && style(item.props.style).minHeight !== undefined);
  expect(rows.some(item => style(item.props.style).minHeight >= 48)).toBe(true);
});
