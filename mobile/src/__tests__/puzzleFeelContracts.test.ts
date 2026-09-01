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

import fs from 'fs';
import path from 'path';
import React from 'react';
import { Row } from '../components/Row';
import { LetterTile } from '../components/LetterTile';
import { DraggableTile } from '../components/DraggableTile';
import { ShareCard, gridSquareKinds, SQUARE_COLORS, getShareDecay, INSTALL_URL_DISPLAY } from '../components/share/ShareCard';
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

// --- Board-serve entrance cascade --------------------------------------------
// A fresh board materializes top-to-bottom (rows fade + rise, staggered by
// rowIndex) instead of snapping in. It rides a run-once-on-mount effect because
// App keys each Row by row.id, so a genuine serve remounts every Row while the
// frequent arc-toggle tile remounts leave the Row instance intact. Guard-by-
// source: it must stay native-driver and gated for reduced-motion / low tier.
describe('Row board-serve entrance', () => {
  const rowSrc = require('fs').readFileSync(
    require('path').join(__dirname, '../components/Row.tsx'),
    'utf8',
  );
  test('serves a native-driver fade+rise gated for reduced motion / low tier', () => {
    expect(rowSrc).toContain('serveAnimates');
    expect(rowSrc).toContain('BOARD_SERVE_STAGGER_MS');
    // Decided once at mount from the accessibility settings + device tier.
    expect(rowSrc).toMatch(/serveAnimates = useRef\(\s*!getSettingsSync\(\)\.reducedMotion && !shouldSimplifyAnimations\(\)/);
    // The entrance transforms are native-driver only (opacity + translateY).
    const serveBlock = rowSrc.slice(
      rowSrc.indexOf('if (!serveAnimates) return;'),
      rowSrc.indexOf('anim.start();'),
    );
    expect(serveBlock).toContain('useNativeDriver: true');
    expect(serveBlock).not.toContain('useNativeDriver: false');
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

// ─── ShareCard install-URL footer (the viral loop's way home from an image) ──
describe('ShareCard install URL', () => {
  test('is a real https host stripped to a tidy footer form', () => {
    expect(INSTALL_URL_DISPLAY).not.toMatch(/^https?:\/\//);
    expect(INSTALL_URL_DISPLAY).not.toMatch(/\/$/);
    expect(INSTALL_URL_DISPLAY.length).toBeGreaterThan(0);
  });

  test('the shared card carries the install URL on a non-daily card', () => {
    const tree = renderCardTree({ ...baseShareResult, phase: 0 });
    expect(collectText(tree).join(' ')).toContain(INSTALL_URL_DISPLAY);
  });

  test('the install URL is present AND spoiler-safe on the daily card', () => {
    const tree = renderCardTree({
      ...baseShareResult, phase: 2, isDaily: true, dailyDate: '2026-07-07',
      wordChain: ['VOID', 'AVOID'], incantationName: 'Offering: VOID',
    });
    const text = collectText(tree).join(' ');
    expect(text).toContain(INSTALL_URL_DISPLAY);
    expect(text).not.toContain('VOID');
    expect(text).not.toContain('Offering: VOID');
  });
});

// ===========================================================================
// Drag z-order: the dragged tile must float ABOVE the row it is carried into
// ===========================================================================
//
// The dragged tile is a floating copy rendered IN PLACE inside DraggableTile,
// so it can only escape its own row if that row out-ranks its siblings. Paint
// order among the rows is decided by their OUTERMOST elements. When the
// board-serve entrance wrapper was added it became that outermost element and
// carried no zIndex, while the drag lift stayed on the inner row-transition
// view — where it could only order that view against siblings it does not
// have. The lift silently became a no-op and the tile passed BEHIND the next
// row's tiles the moment it crossed into them.
describe('drag z-order contract', () => {
  const ROW_SRC = fs.readFileSync(
    path.resolve(__dirname, '../components/Row.tsx'),
    'utf8',
  );

  it('puts the drag lift on the OUTERMOST per-row element', () => {
    // The serve wrapper is the outermost element the Row returns; the lift
    // style must be applied there, not on an inner wrapper.
    expect(ROW_SRC).toMatch(
      /styles\.serveWrapper,\s*\n\s*isSource && !!onLetterDragDrop && styles\.serveWrapperDragging/,
    );
    // And it must NOT have drifted back onto the inner row-transition view.
    expect(ROW_SRC).not.toMatch(/isSource && !!onLetterDragDrop && \{ zIndex/);
  });

  it('raises BOTH zIndex and elevation (Android composites by elevation)', () => {
    const block = ROW_SRC.slice(ROW_SRC.indexOf('serveWrapperDragging: {'));
    const decl = block.slice(0, block.indexOf('},'));
    expect(decl).toMatch(/zIndex:\s*\d+/);
    expect(decl).toMatch(/elevation:\s*\d+/);
  });
});

// ===========================================================================
// The modifier list doubles as the player's roadmap, so it reads in UNLOCK
// order. Speed (55) shipped below Blind (80) and read as the further goal
// while actually being the nearer one.
// ===========================================================================
describe('modifier row order is unlock order', () => {
  const MENU_SRC = fs.readFileSync(
    path.resolve(__dirname, '../components/puzzle/DifficultyMenu.tsx'),
    'utf8',
  );

  // First render site of each modifier's row block, in source order.
  const rowAt = (needle: string): number => {
    const i = MENU_SRC.indexOf(needle);
    expect(i).toBeGreaterThan(-1);
    return i;
  };

  it('renders Challenge, then Speed, then Blind, then Lexicon', () => {
    const challenge = rowAt('{showChallengeToggle && !introMode && (');
    const speed = rowAt('{showSpeedToggle && !introMode && speedLocked');
    const blind = rowAt('{showBlindToggle && !introMode && blindLocked');
    const lexicon = rowAt('{showLexiconToggle && !introMode && lexiconLocked');
    expect(challenge).toBeLessThan(speed);
    expect(speed).toBeLessThan(blind);
    expect(blind).toBeLessThan(lexicon);
  });

  it('keeps each mode live toggle directly under its own locked tease', () => {
    // A locked tease that drifts away from its live row means one of the two
    // got moved alone, which is how the order broke the first time.
    const pairs: Array<[string, string]> = [
      ['{showSpeedToggle && !introMode && speedLocked', '{showSpeedToggle && !introMode && (!speedLocked'],
      ['{showBlindToggle && !introMode && blindLocked', '{showBlindToggle && !introMode && (!blindLocked'],
      ['{showLexiconToggle && !introMode && lexiconLocked', '{showLexiconToggle && !introMode && (!lexiconLocked'],
    ];
    for (const [locked, live] of pairs) {
      expect(rowAt(locked)).toBeLessThan(rowAt(live));
    }
  });

  it('gathers the stack emblem glyphs in that same order', () => {
    // The emblem renders the glyphs left to right, so a mismatch would show
    // the loadout in a different order than the menu the player built it in.
    const challenge = MENU_SRC.indexOf("stackLayerNames.push('Challenge')");
    const speed = MENU_SRC.indexOf("stackLayerNames.push('Speed Shift')");
    const blind = MENU_SRC.indexOf("stackGlyphs.push('🌑')");
    const lexicon = MENU_SRC.indexOf("stackLayerNames.push('Lexicon')");
    expect(challenge).toBeGreaterThan(-1);
    expect(challenge).toBeLessThan(speed);
    expect(speed).toBeLessThan(blind);
    expect(blind).toBeLessThan(lexicon);
  });

  it('renders the in-board badges in that order too', () => {
    // A player who stacks Speed and Blind should not see one order while
    // building the loadout and a different one on the board.
    const appSrc = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');
    const challenge = appSrc.indexOf('Challenge (undo-limit) badge');
    const speed = appSrc.indexOf('Speed Shift badge');
    const blind = appSrc.indexOf('Blind Offering badge');
    const lexicon = appSrc.indexOf('Lexicon (rare-word) badge');
    expect(challenge).toBeGreaterThan(-1);
    expect(challenge).toBeLessThan(speed);
    expect(speed).toBeLessThan(blind);
    expect(blind).toBeLessThan(lexicon);
  });

  it('matches the ascending unlock gates the order claims', () => {
    const {
      CHALLENGE_TOGGLE_UNLOCK_PUZZLES,
      BLIND_TOGGLE_UNLOCK_PUZZLES,
    } = require('../services/puzzleVariety');
    const {
      SPEED_TOGGLE_UNLOCK_PUZZLES,
      LEXICON_UNLOCK_PUZZLES,
    } = require('../constants/gameBalance');
    expect(CHALLENGE_TOGGLE_UNLOCK_PUZZLES).toBeLessThan(SPEED_TOGGLE_UNLOCK_PUZZLES);
    expect(SPEED_TOGGLE_UNLOCK_PUZZLES).toBeLessThan(BLIND_TOGGLE_UNLOCK_PUZZLES);
    expect(BLIND_TOGGLE_UNLOCK_PUZZLES).toBeLessThan(LEXICON_UNLOCK_PUZZLES);
  });
});

// ===========================================================================
// The animal nameplate is a STATIC fixture of the room, not sprite chrome
// ===========================================================================
describe('animal nameplate contract', () => {
  const ROOM_SRC = fs.readFileSync(
    path.resolve(__dirname, '../components/home/RoomView.tsx'),
    'utf8',
  );
  const SPRITE_SRC = fs.readFileSync(
    path.resolve(__dirname, '../components/home/AnimalSprite.tsx'),
    'utf8',
  );

  // The tag's JSX window is bounded by the comment that opens the sprite block.
  // Slicing to indexOf(...) === -1 would silently widen the window to the end
  // of the file and turn every assertion inside it into a false PASS, so the
  // anchors are checked once, loudly, here.
  const TAG_MOUNT_START = 'styles.animalPlate';
  const TAG_MOUNT_END = '{/* Animal if present and unlocked */}';
  const tagMount = (): string => {
    const from = ROOM_SRC.indexOf(TAG_MOUNT_START);
    const to = ROOM_SRC.indexOf(TAG_MOUNT_END);
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    return ROOM_SRC.slice(from, to);
  };
  const constant = (name: string): number => {
    const hit = ROOM_SRC.match(new RegExp(`${name} = ([\\d.]+)`));
    expect(hit).not.toBeNull();
    return Number(hit![1]);
  };

  it('is pinned to the room floor rather than riding the wandering sprite', () => {
    const block = ROOM_SRC.slice(ROOM_SRC.indexOf('animalPlate: {'));
    const decl = block.slice(0, block.indexOf('},'));
    expect(decl).toMatch(/position:\s*'absolute'/);
    expect(decl).toMatch(/bottom:\s*\d+/);
  });

  it('stays off the centre axis the room sign owns, and behind the sprite', () => {
    // Two centred labels in a ~123dp room read as a matched pair. The occupant
    // caption is corner-anchored and sits UNDER AnimalSprite's container
    // (zIndex 10) so the animal passes in front of its own name.
    const block = ROOM_SRC.slice(ROOM_SRC.indexOf('animalPlate: {'));
    const decl = block.slice(0, block.indexOf('},'));
    expect(decl).toMatch(/left:\s*\d+/);
    expect(decl).not.toMatch(/alignSelf:\s*'center'/);
    const z = decl.match(/zIndex:\s*(\d+)/);
    expect(z).not.toBeNull();
    // Read the sprite's own zIndex rather than hardcoding 10: it is the other
    // half of this contract, and changing it alone would silently invert the
    // depth the whole redesign rests on.
    // lastIndexOf: the file has an earlier `container` in the sleep-Z
    // stylesheet; the sprite's own is the last one declared.
    const spriteBlock = SPRITE_SRC.slice(SPRITE_SRC.lastIndexOf('  container: {'));
    const spriteZ = spriteBlock.slice(0, spriteBlock.indexOf('},')).match(/zIndex:\s*(\d+)/);
    expect(spriteZ).not.toBeNull();
    expect(Number(z![1])).toBeLessThan(Number(spriteZ![1]));
  });

  it('is a subordinate tag, not a peer of the room sign', () => {
    // The two were 0.62 vs 0.68 — 8.8% apart in every dimension, which reads as
    // a matched pair rather than a hierarchy. The tag must stay materially
    // shorter, and it can only do that because fontScale decouples the label
    // from the box (PixelPlaque's font is 14 * scale, so scale alone would have
    // taken the type under the room sign's own).
    const roomScale = constant('ROOM_PLAQUE_SCALE');
    const tagScale = constant('ANIMAL_PLAQUE_SCALE');
    expect(tagScale / roomScale).toBeLessThan(0.75);

    const mount = tagMount();
    // Still on plaque wood: it is the only ink pair in the room audited to
    // 4.5:1 (pixelSkinContrast), and bare type over 13 backgrounds x 6 phases
    // has no such guarantee.
    expect(mount).toMatch(/<PixelPlaque/);
    expect(mount).toMatch(/fontScale=\{ANIMAL_PLAQUE_FONT_SCALE\}/);
  });

  it('keeps the plaque fontScale opt-in so the other call sites are untouched', () => {
    const plaqueSrc = fs.readFileSync(
      path.resolve(__dirname, '../components/ui/PixelPlaque.tsx'),
      'utf8',
    );
    expect(plaqueSrc).toMatch(/fontScale = 1/);
    expect(plaqueSrc).toMatch(/fontSize:\s*14 \* scale \* fontScale/);
    // The wood must keep its baked aspect ratio: caps and height stay on the
    // uniform `scale` alone, never on fontScale.
    expect(plaqueSrc).toMatch(/const capDp = PLAQUE_CAP_DP \* scale;/);
    expect(plaqueSrc).toMatch(/height: PLAQUE_H_DP \* scale,/);
  });

  it('no longer renders a name tag inside the sprite (it was clipped away)', () => {
    // A room is ~123dp and the sprite box alone is 90dp plus padding, so a tag
    // stacked below the sprite started past the room's overflow boundary and
    // was never visible at all.
    expect(SPRITE_SRC).not.toMatch(/styles\.nameTag/);
    expect(SPRITE_SRC).not.toMatch(/nameTag:\s*\{/);
  });

  it('is decorative on BOTH platforms so the name is announced once', () => {
    const mount = tagMount();
    // importantForAccessibility is Android-only; accessibilityElementsHidden
    // is iOS-only. Hiding on one alone double-announces on the other.
    expect(mount).toMatch(/importantForAccessibility="no-hide-descendants"/);
    expect(mount).toMatch(/accessibilityElementsHidden/);
  });
});

// ===========================================================================
// A dialogue cooldown changes NOTHING about how an animal moves
// ===========================================================================
describe('animal cooldown motion contract', () => {
  const SPRITE_SRC = fs.readFileSync(
    path.resolve(__dirname, '../components/home/AnimalSprite.tsx'),
    'utf8',
  );
  const ROOM_SRC = fs.readFileSync(
    path.resolve(__dirname, '../components/home/RoomView.tsx'),
    'utf8',
  );

  it('never gates motion on isOnCooldown', () => {
    // A cooled-down animal used to slide to a fixed rest spot, freeze, drop its
    // walk frames/gait/bounce/emotes and sprout sleeping Z's. It now wanders
    // exactly like an available one; the only tell is the missing "!" badge.
    expect(SPRITE_SRC).not.toMatch(/REST_POS_X/);
    expect(SPRITE_SRC).not.toMatch(/SLEEP_BREATHE_MS/);
    expect(SPRITE_SRC).not.toMatch(/if \(isOnCooldown\)/);
    expect(SPRITE_SRC).not.toMatch(/!isOnCooldown &&\s*\n\s*(hasWalkFrames|!hasWalkFrames)/);
    // Stale deps would tear down and re-arm the wander/bounce loops on every
    // cooldown transition, keeping the visible hitch even without the branch.
    expect(SPRITE_SRC).not.toMatch(/currentPhase, isOnCooldown\]/);
  });

  it('leaves isOnCooldown only the badge and the accessibility label', () => {
    const uses = SPRITE_SRC.match(/isOnCooldown/g) ?? [];
    // prop decl, default destructure, a11y label, badge gate.
    expect(uses.length).toBe(4);
    expect(SPRITE_SRC).toMatch(/animal\.hasNewDialogue && !isOnCooldown &&/);
    expect(SPRITE_SRC).toMatch(/isOnCooldown\s*\n\s*\?\s*cooldownPuzzlesLeft/);
  });

  it('keeps the sloth doze beat, which is personality and not a state read-out', () => {
    // The Z's survive for the rare-idle doze only.
    expect(SPRITE_SRC).toMatch(/\{isDozing && <SleepingZs \/>\}/);
    expect(SPRITE_SRC).toMatch(/case 'sloth':/);
  });

  it('shows no cooldown countdown on the room nameplate', () => {
    // With the sleep chrome gone, a bare digit next to the name would be the
    // last unexplained cooldown signal in the room.
    expect(ROOM_SRC).toMatch(/label=\{animal\.name\}/);
    expect(ROOM_SRC).not.toMatch(/animalPlateResting/);
    expect(ROOM_SRC).not.toMatch(/\$\{animal\.name\} · \$\{cooldownPuzzlesLeft\}/);
  });
});

// ===========================================================================
// The "!" new-dialogue badge hugs the animal art, not the container corner
// ===========================================================================
describe('new-dialogue badge anchor contract', () => {
  const SPRITE_SRC = fs.readFileSync(
    path.resolve(__dirname, '../components/home/AnimalSprite.tsx'),
    'utf8',
  );
  const TYPES_SRC = fs.readFileSync(
    path.resolve(__dirname, '../types/homeWorld.ts'),
    'utf8',
  );

  const animalTypes = (): string[] => {
    const decl = TYPES_SRC.slice(TYPES_SRC.indexOf('export type AnimalType ='));
    const body = decl.slice(0, decl.indexOf(';'));
    const hits = body.match(/'([a-z_]+)'/g) ?? [];
    expect(hits.length).toBeGreaterThan(0);
    return hits.map((h) => h.replace(/'/g, ''));
  };

  const anchorTable = (): Record<string, { top: number; right: number }> => {
    const from = SPRITE_SRC.indexOf('const BADGE_ANCHOR');
    expect(from).toBeGreaterThan(-1);
    const block = SPRITE_SRC.slice(from, SPRITE_SRC.indexOf('};', from));
    const out: Record<string, { top: number; right: number }> = {};
    const re = /(\w+): \{ top: (-?\d+), right: (-?\d+) \}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block)) !== null) {
      out[m[1]] = { top: Number(m[2]), right: Number(m[3]) };
    }
    return out;
  };

  it('covers every animal type', () => {
    const table = anchorTable();
    for (const type of animalTypes()) {
      expect(table[type]).toBeDefined();
    }
  });

  it('pulls the badge inside the 90dp sprite box for every animal', () => {
    // The old corner pin (top -8 / right -8) put the badge centre entirely
    // outside the box, ~13-20dp from the nearest painted pixel. Every tuned
    // anchor must sit at or inside the box edge (right >= -1, top >= -5) and
    // stay in the upper-right quadrant.
    for (const a of Object.values(anchorTable())) {
      expect(a.right).toBeGreaterThan(-2);
      expect(a.right).toBeLessThan(35);
      expect(a.top).toBeGreaterThan(-6);
      expect(a.top).toBeLessThan(35);
    }
  });

  it('stays an unflipped sibling of the facing-flipped body', () => {
    // `body` carries scaleX; the badge must never be inside it or the "!"
    // mirrors when the animal faces left.
    const bodyOpen = SPRITE_SRC.indexOf('styles.body,');
    const badge = SPRITE_SRC.indexOf('styles.notificationBadge,');
    const bodyClose = SPRITE_SRC.indexOf('</Animated.View>', bodyOpen);
    expect(bodyOpen).toBeGreaterThan(-1);
    expect(badge).toBeGreaterThan(bodyClose);
  });
});
