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
  Image: 'Image',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (styles: any) => styles, absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } },
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
import { ShareCard, gridSquareKinds, SQUARE_COLORS, getShareDecay } from '../components/share/ShareCard';
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

  test('accepts the feedback-only onLockedPress (compile-time check)', () => {
    type Props = React.ComponentProps<typeof LetterTile>;
    const onLockedPress = jest.fn();
    const props: Props = {
      letter: { id: 'l1', char: 'A', isLocked: true },
      onLockedPress,
    };
    props.onLockedPress!();
    expect(onLockedPress).toHaveBeenCalled();
  });
});

describe('LetterTile mounts a touchable for feedback-only presses (source pin)', () => {
  const tileSrc = require('fs').readFileSync(
    require('path').join(__dirname, '../components/LetterTile.tsx'),
    'utf8',
  );
  test('locked/inert tiles with onLockedPress are pressable; the handler routes to onLockedPress', () => {
    expect(tileSrc).toMatch(/const isFeedbackPressable = !isClickable && !!onLockedPress;/);
    expect(tileSrc).toMatch(/if \(isClickable \|\| isFeedbackPressable\) \{/);
    expect(tileSrc).toMatch(/onPress=\{isClickable \? onPress : onLockedPress\}/);
  });
});

// ─── Quiet acknowledgment for fully inert tiles (completed/future rows) ──────
// Tiles on rows that are neither the active source row nor the selecting
// target row used to mount NO touchable at all — a confused poke got literally
// nothing. The contract: a feedback-only pressable that plays a subtle
// native-driver tile pulse (skipped under reduced motion) and notifies App,
// which fires a light selection haptic ONLY. No message, no sound, no
// game-state mutation, and the existing feedback paths (active-row locked
// shake, target-row inter-slot pulse, drag) are never displaced.
describe('inactive-tile quiet acknowledgment', () => {
  const fs = require('fs');
  const path = require('path');
  const tileSrc = fs.readFileSync(
    path.join(__dirname, '../components/LetterTile.tsx'),
    'utf8',
  );
  const rowSrc = fs.readFileSync(
    path.join(__dirname, '../components/Row.tsx'),
    'utf8',
  );
  const appSrc = fs.readFileSync(
    path.join(__dirname, '../../App.tsx'),
    'utf8',
  );

  test('LetterTile and Row accept onInactivePress (compile-time check)', () => {
    type TileProps = React.ComponentProps<typeof LetterTile>;
    const onInactivePress = jest.fn();
    const tileProps: TileProps = {
      letter: { id: 'l1', char: 'A', isLocked: false },
      onInactivePress,
    };
    tileProps.onInactivePress!();
    expect(onInactivePress).toHaveBeenCalled();

    type RowProps = React.ComponentProps<typeof Row>;
    const rowProps: RowProps = {
      rowData: { id: 'r1', originalWord: 'TIME', words: [] },
      rowIndex: 0,
      activeRowIndex: 1,
      selectedLetter: null,
      onLetterPress: () => {},
      onSlotPress: () => {},
      isProcessing: false,
      onInactivePress,
    };
    expect(typeof rowProps.onInactivePress).toBe('function');
  });

  test('inert tiles with onInactivePress mount a touchable; locked-press feedback wins precedence (source pin)', () => {
    expect(tileSrc).toMatch(
      /const isInactivePressable = !isClickable && !isFeedbackPressable && !!onInactivePress;/
    );
    expect(tileSrc).toMatch(/if \(isInactivePressable\) \{/);
    expect(tileSrc).toMatch(/onPress=\{handleInactivePress\}/);
  });

  test('the pulse is reduced-motion aware; the parent callback always fires (source pin)', () => {
    // Pulse gated behind !reducedMotion; onInactivePress?.() sits OUTSIDE the
    // gate so the App-level haptic tick survives reduced motion.
    const handlerBlock = tileSrc.slice(
      tileSrc.indexOf('const handleInactivePress = () => {'),
      tileSrc.indexOf('onInactivePress?.();')
    );
    expect(handlerBlock).toContain('if (!settings.reducedMotion) {');
    expect(handlerBlock).toContain('useNativeDriver: true');
    expect(tileSrc).toContain('onInactivePress?.();');
  });

  test('the inactive touchable does not claim a button role (source pin)', () => {
    const inactiveBranch = tileSrc.slice(
      tileSrc.indexOf('if (isInactivePressable) {'),
      tileSrc.indexOf('return content;')
    );
    // The label is just the letter; no role that would promise an action.
    // (Matches a real JSX prop line only, not the explanatory comment.)
    expect(inactiveBranch).toContain('accessibilityLabel={`Letter ${letter.char}');
    expect(inactiveBranch).not.toMatch(/^\s*accessibilityRole=/m);
  });

  test('Row threads onInactivePress to non-source standard-layout tiles only (source pin)', () => {
    expect(rowSrc).toMatch(/onInactivePress=\{isSource \? undefined : onInactivePress\}/);
    // The arc layout (target row during selection) keeps its inter-slot pulse
    // path untouched — no onInactivePress inside renderArcContent.
    const arcBlock = rowSrc.slice(
      rowSrc.indexOf('const renderArcContent = () => {'),
      rowSrc.indexOf('const renderContent = () => {')
    );
    expect(arcBlock).not.toContain('onInactivePress');
  });

  test('App handler is a stable light haptic tick and nothing else (source pin)', () => {
    const start = appSrc.indexOf('const handleInactiveTilePress');
    expect(start).toBeGreaterThan(-1);
    const end = appSrc.indexOf('}, []);', start);
    expect(end).toBeGreaterThan(start);
    const block = appSrc.slice(start, end);
    expect(block).toContain('hapticSelection();');
    // Zero game-state effects: no message, no sound, no puzzle action, no
    // state setter of any kind inside the handler.
    expect(block).not.toMatch(/setMessage|sound[A-Z]|puzzleActions|set[A-Z]/);
    // And the Row wiring passes the stable callback through.
    expect(appSrc).toMatch(/onInactivePress=\{handleInactiveTilePress\}/);
  });
});

describe('Row verb-depth + hover + drag-move prop contract', () => {
  test('accepts previewValidityVisible / hoverSlotIndex / onLetterDragMove (compile-time check)', () => {
    type Props = React.ComponentProps<typeof Row>;
    const props: Props = {
      rowData: { id: 'r1', originalWord: 'TIME', words: [] },
      rowIndex: 0,
      activeRowIndex: 0,
      selectedLetter: null,
      onLetterPress: () => {},
      onSlotPress: () => {},
      isProcessing: false,
      previewValidityVisible: false,
      hoverSlotIndex: 2,
      onLetterDragMove: (_pos: { x: number; y: number }) => {},
    };
    expect(props.previewValidityVisible).toBe(false);
    expect(props.hoverSlotIndex).toBe(2);
    expect(typeof props.onLetterDragMove).toBe('function');
  });
});

describe('DraggableTile live-move contract', () => {
  test('accepts onMove with a page-space position (compile-time check)', () => {
    type Props = React.ComponentProps<typeof DraggableTile>;
    const onMove: Props['onMove'] = (_pos: { x: number; y: number }) => {};
    expect(typeof onMove).toBe('function');
  });

  test('onMove fires only while the drag is ACTIVE (source pin)', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../components/DraggableTile.tsx'),
      'utf8',
    );
    // The call sits inside the dragActivated branch of onPanResponderMove.
    const moveBlock = src.slice(
      src.indexOf('if (dragActivated.current) {'),
      src.indexOf('onPanResponderRelease')
    );
    expect(moveBlock).toContain('onMoveRef.current?.(');
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

// --- Row drop effects are visual-only (App owns the haptic) ------------------
// Regression pin for the doubled-buzz fix: App.tsx fires the weighted valid/
// invalid drop haptic; Row.tsx renders only the shake/bounce. Re-adding a
// haptic in Row would double every tap's buzz. Guard-by-source (Row can't
// render in Node), matching the isStuck source-guard idiom.
describe('Row drop effects are visual-only', () => {
  const rowSrc = require('fs').readFileSync(
    require('path').join(__dirname, '../components/Row.tsx'),
    'utf8',
  );
  test('Row.tsx does not import or call hapticMedium / hapticError', () => {
    expect(rowSrc).not.toMatch(/hapticMedium/);
    expect(rowSrc).not.toMatch(/hapticError/);
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

// ─── ShareCard phase decay (the spoiler-safe "something's off" lure) ─────────

function renderCardTree(result: ShareableResult): React.ReactElement {
  const forwardRefRender = (ShareCard as unknown as {
    render: (props: { result: ShareableResult }, ref: null) => React.ReactElement;
  }).render;
  return forwardRefRender({ result }, null);
}

function collectText(node: unknown, out: string[] = []): string[] {
  if (node == null) return out;
  if (typeof node === 'string') { out.push(node); return out; }
  if (Array.isArray(node)) { node.forEach((c) => collectText(c, out)); return out; }
  if (typeof node === 'object') collectText((node as { props?: { children?: unknown } }).props?.children, out);
  return out;
}

describe('ShareCard phase decay', () => {
  test('is pristine at Phase 0 and earns its wrongness toward the reveal', () => {
    expect(getShareDecay(0)).toEqual({ scrim: 0, scanline: 0, soot: 0, tear: 0, aberration: 0, aberrationShift: 0 });
    expect(getShareDecay(1).soot).toBe(0);
    expect(getShareDecay(1).aberration).toBe(0);
    // Aberration climbs toward the reveal (Phase 4 is peak wrongness)...
    expect(getShareDecay(2).aberration).toBeGreaterThan(0);
    expect(getShareDecay(3).aberration).toBeGreaterThan(getShareDecay(2).aberration);
    expect(getShareDecay(4).aberration).toBeGreaterThan(getShareDecay(3).aberration);
    // ...then Phase 5 SETTLES (jitter calms) without returning to pristine.
    expect(getShareDecay(5).scanline).toBeLessThan(getShareDecay(4).scanline);
    expect(getShareDecay(5).scrim).toBeLessThan(getShareDecay(4).scrim);
    expect(getShareDecay(5).aberration).toBeGreaterThan(0);
  });

  test('every decay field stays in a sane range for all phases', () => {
    for (let p = 0; p <= 5; p++) {
      const d = getShareDecay(p);
      (['scrim', 'scanline', 'soot', 'tear', 'aberration'] as const).forEach((k) => {
        expect(d[k]).toBeGreaterThanOrEqual(0);
        expect(d[k]).toBeLessThanOrEqual(1);
      });
      expect(d.aberrationShift).toBeGreaterThanOrEqual(0);
      expect(d.aberrationShift).toBeLessThanOrEqual(2);
    }
  });

  test('Phase 0 card renders no decay layers; the grid still renders', () => {
    const tree = renderCardTree({ ...baseShareResult, phase: 0 });
    expect(findByTestID(tree, 'share-decay-underlay')).toBeNull();
    expect(findByTestID(tree, 'share-decay-overlay')).toBeNull();
    expect(findByTestID(tree, 'share-wordmark-ghost')).toBeNull();
    expect(findByTestID(tree, 'share-grid')).not.toBeNull();
  });

  test('Phase 4 card renders the decay layers and still shows the grid', () => {
    const tree = renderCardTree({ ...baseShareResult, phase: 4 });
    expect(findByTestID(tree, 'share-decay-underlay')).not.toBeNull();
    expect(findByTestID(tree, 'share-decay-overlay')).not.toBeNull();
    expect(findByTestID(tree, 'share-wordmark-ghost')).not.toBeNull();
    expect(findByTestID(tree, 'share-grid')).not.toBeNull();
  });

  test('decay never leaks the daily word chain (spoiler rule holds under corruption)', () => {
    const tree = renderCardTree({
      ...baseShareResult, phase: 4, isDaily: true, dailyDate: '2026-07-07',
      wordChain: ['DOOM', 'ROOM'], incantationName: 'The Offering',
    });
    const text = collectText(tree).join(' ');
    expect(text).not.toContain('DOOM');
    expect(text).not.toContain('ROOM');
    expect(text).not.toContain('The Offering');
    // ...but the corruption IS present on the daily card.
    expect(findByTestID(tree, 'share-decay-underlay')).not.toBeNull();
  });
});
