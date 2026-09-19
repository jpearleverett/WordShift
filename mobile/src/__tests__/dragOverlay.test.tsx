import React from 'react';
import { DragOverlayProvider, relativeDragFrame } from '../components/DragOverlay';

const states: unknown[] = [];
const refs: { current: unknown }[] = [];
let stateIndex = 0;
let refIndex = 0;
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useCallback: (callback: unknown) => callback,
  useMemo: (build: () => unknown) => build(),
  useState: (initial: unknown) => {
    const i = stateIndex++;
    if (!(i in states)) states[i] = initial;
    return [states[i], (value: unknown) => { states[i] = value; }];
  },
  useRef: (initial: unknown) => {
    const i = refIndex++;
    if (!(i in refs)) refs[i] = { current: initial };
    return refs[i];
  },
}));
jest.mock('react-native', () => ({
  View: 'View', StyleSheet: { create: (styles: unknown) => styles, absoluteFillObject: {} },
}));

function render() {
  stateIndex = 0;
  refIndex = 0;
  const tree = DragOverlayProvider({ children: React.createElement('board') });
  return { api: tree.props.value, host: tree.props.children };
}

beforeEach(() => { states.length = 0; refs.length = 0; });

test('window measurements preserve a scaled tile and allow it above the scroll viewport', () => {
  expect(relativeDragFrame({ x: 58, y: 280, width: 48, height: 58 }, { x: 10, y: 30 }))
    .toEqual({ x: 48, y: 250, width: 48, height: 58 });
  // No clamping to board top: a lifted tile can move above its first row.
  expect(relativeDragFrame({ x: 20, y: 15, width: 60, height: 70 }, { x: 10, y: 30 }).y).toBe(-15);
});

test('the visual layer is a noninteractive, inaccessible sibling of the board', () => {
  const { host } = render();
  expect(host.props.children[0].type).toBe('board');
  const layer = host.props.children[1];
  expect(layer.props.pointerEvents).toBe('none');
  expect(layer.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(layer.props.accessibilityElementsHidden).toBe(true);
  expect(layer.props.style.overflow).toBe('visible');
});

test('a measurement completing after release cannot resurrect a ghost', () => {
  const { api, host } = render();
  const measureHost = jest.fn();
  host.props.ref.current = { measureInWindow: measureHost };
  let measured!: (x: number, y: number, width: number, height: number) => void;
  const owner = {};
  const draw = jest.fn();
  api.show({ owner, anchor: { measureInWindow: (cb: typeof measured) => { measured = cb; } }, render: draw });
  api.clear(owner);
  measured(10, 20, 30, 40);
  expect(measureHost).not.toHaveBeenCalled();
  expect(draw).not.toHaveBeenCalled();
  expect(render().host.props.children[1].props.children).toBeNull();
});

test('only the newest drag can render or clear the overlay', () => {
  const { api, host } = render();
  let firstHostMeasure!: (x: number, y: number) => void;
  host.props.ref.current = { measureInWindow: (cb: typeof firstHostMeasure) => { firstHostMeasure = cb; } };
  const first = {};
  const second = {};
  const firstDraw = jest.fn(() => React.createElement('old-tile'));
  const secondDraw = jest.fn(() => React.createElement('new-tile'));
  const anchor = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => cb(100, 220, 45, 55) };
  api.show({ owner: first, anchor, render: firstDraw });
  const stale = firstHostMeasure;
  api.show({ owner: second, anchor, render: secondDraw });
  stale(0, 30);
  expect(firstDraw).not.toHaveBeenCalled();
  firstHostMeasure(0, 30);
  expect(secondDraw).toHaveBeenCalledWith({ x: 100, y: 190, width: 45, height: 55 });
  api.clear(first);
  expect(render().host.props.children[1].props.children.type).toBe('new-tile');
  api.clear(second);
  expect(render().host.props.children[1].props.children).toBeNull();
});
