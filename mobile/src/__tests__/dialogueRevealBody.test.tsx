import type React from 'react';

let mockReveal: unknown;
let mockEffect: (() => void | (() => void)) | undefined;
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  memo: (component: unknown) => component,
  useState: (initial: unknown) => {
    if (mockReveal === undefined) mockReveal = initial;
    return [mockReveal, (value: unknown) => { mockReveal = value; }];
  },
  useEffect: (effect: () => void | (() => void)) => { mockEffect = effect; },
}));
jest.mock('../components/home/DialogueBody', () => ({ DialogueBody: 'DialogueBody' }));

import { DialogueRevealBody } from '../components/home/DialogueRevealBody';
type Props = React.ComponentProps<typeof DialogueRevealBody>;
type Body = React.ReactElement<{ text: string }>;
const render = (props: Props) => (DialogueRevealBody as unknown as (props: Props) => Body)(props);

beforeEach(() => { jest.useFakeTimers(); mockReveal = undefined; mockEffect = undefined; });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test('character ticks only update the leaf and notify its owner once at completion', () => {
  const onComplete = jest.fn();
  const props = { text: 'Hello', source: 'visit:0', revealing: true, charMs: 15, onComplete };
  expect(render(props).props.text).toBe('');
  const cleanup = mockEffect?.();
  jest.advanceTimersByTime(30);
  expect(render(props).props.text).toBe('He');
  expect(onComplete).not.toHaveBeenCalled();
  jest.advanceTimersByTime(45);
  expect(render(props).props.text).toBe('Hello');
  expect(onComplete).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(1000);
  expect(onComplete).toHaveBeenCalledTimes(1);
  cleanup?.();
});

test('a new visit starts blank, and stopping a reveal prevents stale completion', () => {
  const onComplete = jest.fn();
  const props = { text: 'Hello', source: 'visit:0', revealing: true, charMs: 15, onComplete };
  render(props);
  const cleanup = mockEffect?.();
  jest.advanceTimersByTime(30);
  cleanup?.();
  expect(render({ ...props, source: 'visit:1' }).props.text).toBe('');
  expect(render({ ...props, revealing: false }).props.text).toBe('Hello');
  jest.advanceTimersByTime(1000);
  expect(onComplete).not.toHaveBeenCalled();
});

test('instant/reduced-motion pages never start a character timer', () => {
  const onComplete = jest.fn();
  expect(render({ text: 'Hello', source: 'visit:0', revealing: false, charMs: 15, onComplete }).props.text).toBe('Hello');
  mockEffect?.();
  expect(jest.getTimerCount()).toBe(0);
});
