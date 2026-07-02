/**
 * Prop-contract tests for the core puzzle-loop feel upgrades.
 *
 * The Node test environment has no React Native renderer, so these tests
 * (a) import Row / LetterTile / DraggableTile through ts-jest — compiling
 * them with full strict diagnostics, which pins the new prop signatures —
 * and (b) assert the compile-time shape of the new props via
 * React.ComponentProps so a rename/removal fails loudly here rather than
 * silently breaking App.tsx's wiring.
 */

// Mock react-native for Node — only module-load surface is needed
// (StyleSheet.create); everything else is exercised at render time only.
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (styles: any) => styles },
  Animated: {
    View: 'AnimatedView',
    Value: jest.fn().mockImplementation((val: number) => ({
      _value: val,
      setValue: jest.fn(),
      interpolate: jest.fn().mockReturnValue('interpolated'),
      stopAnimation: jest.fn(),
    })),
    multiply: jest.fn(),
    add: jest.fn(),
    timing: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    spring: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    sequence: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    loop: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    stagger: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    delay: jest.fn(),
  },
  Easing: {
    inOut: jest.fn(),
    in: jest.fn(),
    out: jest.fn(),
    sin: jest.fn(),
    quad: jest.fn(),
    cubic: jest.fn(),
  },
  PanResponder: { create: jest.fn(() => ({ panHandlers: {} })) },
  Platform: { OS: 'ios' },
  PixelRatio: { get: () => 2 },
  Dimensions: { get: () => ({ width: 400, height: 800, scale: 2, fontScale: 1 }) },
}));

// Haptics route through expo-haptics at module level — stub the service.
jest.mock('../services/haptics', () => ({
  hapticMedium: jest.fn(),
  hapticError: jest.fn(),
  hapticSelection: jest.fn(),
}));

import React from 'react';
import { Row } from '../components/Row';
import { LetterTile } from '../components/LetterTile';
import { DraggableTile } from '../components/DraggableTile';
import type { HintHighlight, ArrivalMark } from '../hooks/usePuzzleGame';

describe('component exports', () => {
  test('Row, LetterTile, and DraggableTile are importable', () => {
    expect(Row).toBeDefined();
    expect(LetterTile).toBeDefined();
    expect(DraggableTile).toBeDefined();
  });
});

describe('LetterTile arrival prop contract', () => {
  test('accepts arrivalMoveId + arrivalDirection (compile-time check)', () => {
    type Props = React.ComponentProps<typeof LetterTile>;
    const props: Props = {
      letter: { id: 'l1', char: 'A', isLocked: false },
      arrivalMoveId: 3,
      arrivalDirection: 'down',
    };
    expect(props.arrivalMoveId).toBe(3);
    expect(props.arrivalDirection).toBe('down');

    // Direction is a closed union
    const up: Props['arrivalDirection'] = 'up';
    expect(up).toBe('up');
  });
});

describe('Row hint-glow + arrival prop contract', () => {
  test('accepts hintLetterId / hintSlotIndex / arrival (compile-time check)', () => {
    type Props = React.ComponentProps<typeof Row>;
    const props: Props = {
      rowData: { id: 'r1', originalWord: 'TIME', words: [] },
      rowIndex: 0,
      activeRowIndex: 0,
      selectedLetter: null,
      onLetterPress: () => {},
      onSlotPress: () => {},
      isProcessing: false,
      hintLetterId: 'l1',
      hintSlotIndex: 2,
      arrival: { letterId: 'l1', direction: 'up', moveId: 4 },
    };
    expect(props.hintLetterId).toBe('l1');
    expect(props.hintSlotIndex).toBe(2);
    expect(props.arrival?.moveId).toBe(4);
  });

  test('hook state shapes thread into Row props without adaptation', () => {
    // The App wiring passes hook state straight through — pin the shapes.
    const hint: HintHighlight = {
      rowIndex: 0,
      letterIndex: 2,
      letterId: 'l3',
      targetRowIndex: 1,
      targetSlotIndex: 2,
    };
    const arrival: ArrivalMark = {
      rowIndex: 1,
      slotIndex: 0,
      letterId: 'l1',
      direction: 'down',
      moveId: 1,
    };
    type RowProps = React.ComponentProps<typeof Row>;
    const arrivalProp: RowProps['arrival'] = arrival;
    const hintLetterProp: RowProps['hintLetterId'] = hint.letterId;
    const hintSlotProp: RowProps['hintSlotIndex'] = hint.targetSlotIndex ?? null;
    expect(arrivalProp).toBe(arrival);
    expect(hintLetterProp).toBe('l3');
    expect(hintSlotProp).toBe(2);
  });
});
