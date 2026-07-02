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
import { ShareCard, gridSquareKinds, SQUARE_COLORS } from '../components/share/ShareCard';
import type { HintHighlight, ArrivalMark } from '../hooks/usePuzzleGame';
import type { ShareableResult, MoveOutcome } from '../services/shareResults';

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

// ─── ShareCard honest performance grid ──────────────────────────────────────
// The shared PNG/preview must show the SAME grid as the shared text
// (generateShareText): one square per move in play order when moveOutcomes is
// present, legacy positional distribution only as fallback.

const baseShareResult: ShareableResult = {
  stars: 2,
  difficulty: 'MEDIUM',
  hintsUsed: 0,
  invalidAttempts: 0,
  moveCount: 3,
};

type RenderedNode = React.ReactElement<{ testID?: string; children?: unknown }>;

/** Depth-first search of a rendered element tree for a testID. */
function findByTestID(node: unknown, testID: string): RenderedNode | null {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByTestID(child, testID);
      if (found) return found;
    }
    return null;
  }
  const el = node as RenderedNode;
  if (el.props?.testID === testID) return el;
  return findByTestID(el.props?.children, testID);
}

type SquareElement = React.ReactElement<{ style: [unknown, { backgroundColor: string }] }>;

/** Render the ShareCard (forwardRef → call its render fn) and read the grid colors. */
function renderedGridColors(result: ShareableResult): string[] {
  const forwardRefRender = (ShareCard as unknown as {
    render: (props: { result: ShareableResult }, ref: null) => React.ReactElement;
  }).render;
  const tree = forwardRefRender({ result }, null);
  const grid = findByTestID(tree, 'share-grid');
  expect(grid).not.toBeNull();
  const squares = grid!.props.children as SquareElement[];
  return squares.map((sq) => sq.props.style[1].backgroundColor);
}

describe('ShareCard honest performance grid', () => {
  test('gridSquareKinds preserves per-move order when moveOutcomes is present', () => {
    const outcomes: MoveOutcome[] = ['clean', 'mistake', 'hint', 'both'];
    expect(
      gridSquareKinds({ ...baseShareResult, hintsUsed: 1, invalidAttempts: 2, moveCount: 4, moveOutcomes: outcomes })
    ).toEqual(['clean', 'mistake', 'hint', 'both']);
  });

  test('gridSquareKinds does not front-load a late mistake (matches share text)', () => {
    const kinds = gridSquareKinds({
      ...baseShareResult,
      invalidAttempts: 1,
      moveOutcomes: ['clean', 'clean', 'mistake'],
    });
    // Legacy fallback would render mistake-first; the honest grid must not.
    expect(kinds).toEqual(['clean', 'clean', 'mistake']);
  });

  test('gridSquareKinds legacy fallback is unchanged when moveOutcomes is absent or empty', () => {
    const legacy = { ...baseShareResult, hintsUsed: 1, invalidAttempts: 0, moveCount: 3 };
    expect(gridSquareKinds(legacy)).toEqual(['hint', 'clean', 'clean']);
    expect(gridSquareKinds({ ...legacy, moveOutcomes: [] })).toEqual(['hint', 'clean', 'clean']);
    // Both hint and mistake on the first square, mistake-only on the second.
    expect(
      gridSquareKinds({ ...baseShareResult, hintsUsed: 1, invalidAttempts: 2, moveCount: 3 })
    ).toEqual(['both', 'mistake', 'clean']);
  });

  test('renders one square per outcome, in play order, with matching colors', () => {
    const outcomes: MoveOutcome[] = ['clean', 'clean', 'mistake', 'hint'];
    const colors = renderedGridColors({
      ...baseShareResult,
      hintsUsed: 1,
      invalidAttempts: 1,
      moveCount: 4,
      moveOutcomes: outcomes,
    });
    expect(colors).toEqual(outcomes.map((k) => SQUARE_COLORS[k]));
  });

  test('renders the legacy distribution when moveOutcomes is absent', () => {
    const colors = renderedGridColors({ ...baseShareResult, invalidAttempts: 1, moveCount: 3 });
    expect(colors).toEqual([SQUARE_COLORS.mistake, SQUARE_COLORS.clean, SQUARE_COLORS.clean]);
  });
});
