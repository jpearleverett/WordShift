import React from 'react';
import { DraggableTile } from '../components/DraggableTile';
import { useDragOverlay } from '../components/DragOverlay';

const state: unknown[] = [];
const refs: { current: unknown }[] = [];
const cleanups: (() => void)[] = [];
let stateIndex = 0;
let refIndex = 0;
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: (initial: unknown) => {
    const i = stateIndex++;
    if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial;
    return [state[i], (value: unknown) => { state[i] = value; }];
  },
  useRef: (initial: unknown) => {
    const i = refIndex++;
    if (!(i in refs)) refs[i] = { current: initial };
    return refs[i];
  },
  useLayoutEffect: (run: () => void) => { run(); },
  useEffect: (run: () => (() => void) | void) => { const stop = run(); if (stop) cleanups.push(stop); },
}));
jest.mock('react-native', () => ({
  View: 'View',
  Platform: { OS: 'android' },
  PanResponder: { create: (handlers: unknown) => ({ panHandlers: handlers }) },
  StyleSheet: { create: (styles: unknown) => styles },
  Easing: {},
  Animated: {
    View: 'AnimatedView',
    Value: class {
      value: number;
      constructor(value: number) { this.value = value; }
      setValue(value: number) { this.value = value; }
      stopAnimation() {}
    },
    add: (a: { value: number }, b: { value: number }) => a.value + b.value,
  },
}));
jest.mock('../components/DragOverlay', () => ({ useDragOverlay: jest.fn() }));
jest.mock('../theme/colors', () => ({ getDragShadowColor: () => '#000' }));
jest.mock('../services/haptics', () => ({ hapticSelection: jest.fn() }));
jest.mock('../services/settings', () => ({ getSettingsSync: () => ({ reducedMotion: true }) }));

beforeEach(() => {
  state.length = 0; refs.length = 0; cleanups.length = 0;
  stateIndex = 0; refIndex = 0;
  jest.clearAllMocks();
});

test('root ghost follows page-space movement on a scaled board and drop retains its lifted aim', () => {
  const overlay = { show: jest.fn(), clear: jest.fn() };
  jest.mocked(useDragOverlay).mockReturnValue(overlay);
  const onMove = jest.fn();
  const onDragEnd = jest.fn();
  const onTap = jest.fn();
  const onDragActiveChange = jest.fn();
  const tree = DraggableTile({
    children: React.createElement('letter-tile'), enabled: true, boardScale: 0.8,
    onDragStart: jest.fn(), onDragEnd, onMove, onTap, onDragActiveChange,
  });
  tree.props.onLayout({ nativeEvent: { layout: { width: 58, height: 68 } } });
  tree.props.ref.current = { measureInWindow: jest.fn() };
  const responder = tree.props.children[0].props;
  responder.onPanResponderGrant({ nativeEvent: { pageX: 100, pageY: 300 } });
  responder.onPanResponderMove({}, { dx: 12, dy: -60 });
  expect(overlay.show).toHaveBeenCalledTimes(1);
  expect(onMove).toHaveBeenLastCalledWith({ x: 112, y: 196 });
  const request = overlay.show.mock.calls[0][0];
  const ghost = request.render({ x: 74, y: 270, width: 46.4, height: 54.4 });
  expect(ghost.props.style.left).toBe(74);
  expect(ghost.props.style.top).toBe(270);
  expect(ghost.props.style.transform[0].translateX.value).toBe(12);
  expect(ghost.props.style.transform[1].translateY).toBe(-104);
  expect(ghost.props.children.props.style[1].transform[0].scale).toBeCloseTo(0.8);
  responder.onPanResponderRelease({}, { dx: 12, dy: -60 });
  expect(onDragEnd).toHaveBeenLastCalledWith({ x: 112, y: 196 });
  expect(onTap).not.toHaveBeenCalled();
  expect(onDragActiveChange.mock.calls).toEqual([[true], [false]]);
  expect(overlay.clear).toHaveBeenLastCalledWith(request.owner);
});

test('termination and unmount release the current ghost; tap and assistive activation stay single actions', () => {
  const overlay = { show: jest.fn(), clear: jest.fn() };
  jest.mocked(useDragOverlay).mockReturnValue(overlay);
  const onTap = jest.fn();
  const onDragEnd = jest.fn();
  const tree = DraggableTile({ children: null, enabled: true, onDragStart: jest.fn(), onDragEnd, onTap });
  tree.props.ref.current = {};
  const responder = tree.props.children[0].props;
  responder.onPanResponderGrant({ nativeEvent: { pageX: 20, pageY: 50 } });
  responder.onPanResponderRelease({}, { dx: 2, dy: 1 });
  expect(onTap).toHaveBeenCalledTimes(1);
  expect(overlay.show).not.toHaveBeenCalled();
  responder.onClick();
  expect(onTap).toHaveBeenCalledTimes(2);
  responder.onPanResponderGrant({ nativeEvent: { pageX: 20, pageY: 50 } });
  responder.onPanResponderMove({}, { dx: 20, dy: 30 });
  const owner = overlay.show.mock.calls[0][0].owner;
  responder.onPanResponderTerminate();
  expect(overlay.clear).toHaveBeenLastCalledWith(owner);
  expect(onDragEnd).not.toHaveBeenCalled();
  cleanups.forEach(stop => stop());
  expect(overlay.clear).toHaveBeenLastCalledWith(owner);
});
