import React, { type ReactElement } from 'react';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: jest.fn(),
  useState: jest.fn((initial) => [initial, jest.fn()]),
}));
jest.mock('react-native', () => ({
  View: 'View', Image: 'Image', Pressable: 'Pressable', Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('../components/ui/NineSlice', () => ({ NineSliceFrame: 'NineSliceFrame' }));
jest.mock('../services/uiSound', () => ({ playUiSound: jest.fn() }));
jest.mock('../services/a11yAnnounce', () => ({ announceForA11y: jest.fn() }));

import { DialogueChoicePage, DialogueChoiceEcho, type DialogueChoicePageProps } from '../components/home/DialogueChoicePage';
import { PIXEL_SKINS } from '../theme/pixelSkin.generated';
import { playUiSound } from '../services/uiSound';

// Resolve the public React tree with inert native elements. The real AppText
// and reply row execute, so these checks cover props reaching actual controls.
type Element = ReactElement<Record<string, any>>;
function expand(node: React.ReactNode): Element[] {
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  if (typeof element.type === 'function') {
    return expand((element.type as (props: Record<string, any>) => React.ReactNode)(element.props));
  }
  const children = typeof element.props.children === 'function'
    ? element.props.children({ pressed: false })
    : element.props.children;
  return [element, ...React.Children.toArray(children).flatMap(expand)];
}

function props(overrides: Partial<DialogueChoicePageProps> = {}): DialogueChoicePageProps {
  return {
    animalType: 'fox', name: 'Ember', nameColor: '#123', portrait: 1,
    choice: {
      prompt: 'Would you like to know why I kept the old invitation?',
      options: { ask: 'Tell me about the invitation, and why you kept it.', refuse: 'Keep it for now. You can tell me when you are ready.' },
      responses: { ask: 'It reminds me of the evening you arrived.', refuse: 'I can wait.' },
      convergence: 'Ember folds the invitation.',
    },
    skin: PIXEL_SKINS.bright, inkBody: '#123', inkMuted: '#456',
    onChoose: jest.fn(), onLater: jest.fn(), ...overrides,
  };
}

const buttons = (tree: Element[]) => tree.filter(node => node.type === 'Pressable');

beforeEach(() => { jest.clearAllMocks(); });

describe('relationship choice controls', () => {
  it('offers both complete answers and postponement without selecting on render', () => {
    const input = props();
    const controls = buttons(expand(DialogueChoicePage(input)));
    expect(controls.map(node => node.props.accessibilityLabel)).toEqual([
      input.choice.options.ask, input.choice.options.refuse, 'Come back later',
    ]);
    expect(input.onChoose).not.toHaveBeenCalled();
    controls[0].props.onPress();
    expect(input.onChoose).toHaveBeenLastCalledWith('ask');
    controls[1].props.onPress();
    expect(input.onChoose).toHaveBeenLastCalledWith('refuse');
    controls[2].props.onPress();
    expect(input.onLater).toHaveBeenCalledTimes(1);
    expect(input.onChoose).toHaveBeenCalledTimes(2);
  });

  it('disables and describes every action during persistence, including a stale press callback', () => {
    const input = props({ saving: true });
    const controls = buttons(expand(DialogueChoicePage(input)));
    for (const control of controls) {
      expect(control.props.disabled).toBe(true);
      expect(control.props.accessibilityState).toEqual({ disabled: true });
      control.props.onPress();
    }
    expect(input.onChoose).not.toHaveBeenCalled();
    expect(input.onLater).not.toHaveBeenCalled();
    expect(playUiSound).not.toHaveBeenCalled();
  });

  it('keeps both answers available after failure and exposes the retry explanation as an alert', () => {
    const error = 'Your answer could not be saved. Please choose again.';
    const input = props({ error });
    const tree = expand(DialogueChoicePage(input));
    expect(tree.find(node => node.props.accessibilityRole === 'alert')?.props.children).toBe(error);
    expect(buttons(tree).every(node => node.props.disabled === false)).toBe(true);
    buttons(tree)[0].props.onPress();
    expect(input.onChoose).toHaveBeenCalledWith('ask');
  });

  it('lets the entire question, answers and echoed selection grow with reading settings', () => {
    const input = props();
    const page = expand(DialogueChoicePage(input));
    const readingText = [input.choice.prompt, input.choice.options.ask, input.choice.options.refuse];
    const echo = expand(DialogueChoiceEcho({ text: input.choice.options.ask, inkMuted: '#456', inkBody: '#123' }));
    for (const content of readingText) {
      const text = page.find(node => node.type === 'Text' && node.props.children === content);
      expect(text?.props.allowFontScaling).toBe(true);
      expect(text?.props.maxFontSizeMultiplier).toBe(0);
      expect(text?.props.numberOfLines).toBeUndefined();
    }
    const echoedText = echo.find(node => node.type === 'Text' && node.props.children === input.choice.options.ask);
    expect(echoedText?.props.maxFontSizeMultiplier).toBe(0);
    expect(echoedText?.props.style).toContainEqual({ color: '#123' });
    expect(echo.some(node => node.props.accessibilityLabel === `You said: ${input.choice.options.ask}`)).toBe(true);
  });
});
