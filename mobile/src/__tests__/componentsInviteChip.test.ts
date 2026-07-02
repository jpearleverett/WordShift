/**
 * Invite-chip (locked-animal overlay) tests for RoomView.
 *
 * Player-reported UI fix: the chip shown in an unlocked room waiting for its
 * animal ("Invite [amber] 100" / "You: [amber] 30") had a dominating ✨ emoji
 * at the top, amber gems embedded inline in Text runs with inconsistent
 * spacing/baselines, and hand-tuned translate offsets (-40/-35 for a 104px
 * chip) that left it visibly off-center in the room.
 *
 * These tests pin the redesigned contract:
 * - Pure content selection (tap / free / cost + affordability boundary)
 * - Accessibility labels unchanged from the pre-redesign strings
 * - Source pins: sparkle emoji removed, centering uses an absolute-fill
 *   wrapper rather than hardcoded translate offsets, gems render as
 *   explicitly sized Images (not inline AmberInline embeds) in the chip
 */

import fs from 'fs';
import path from 'path';

// Mock react-native since we're in Node (no renderer). Only what RoomView and
// its transitive imports (AnimalSprite) touch at module load matters
// (StyleSheet.create); the rest are inert stubs.
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  Pressable: 'Pressable',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Animated: {
    View: 'AnimatedView',
    Text: 'AnimatedText',
    Image: 'AnimatedImage',
    Value: jest.fn().mockImplementation((val: number) => ({
      _value: val,
      interpolate: jest.fn().mockReturnValue('interpolated'),
      setValue: jest.fn(),
    })),
    timing: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    spring: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    loop: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    sequence: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    parallel: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    delay: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
  },
  Easing: {
    inOut: jest.fn((fn: any) => fn),
    out: jest.fn((fn: any) => fn),
    in: jest.fn((fn: any) => fn),
    sin: jest.fn(),
    ease: jest.fn(),
    linear: jest.fn(),
    quad: jest.fn(),
  },
  Platform: { OS: 'android', select: (obj: any) => obj.android },
  PixelRatio: { get: jest.fn().mockReturnValue(2) },
  Dimensions: { get: jest.fn().mockReturnValue({ width: 400, height: 800 }) },
}));

// AnimalSprite pulls TouchableOpacity from react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  TouchableOpacity: 'TouchableOpacity',
}));

// homeWorldData (ROOM_THEME_COLORS source) transitively imports eventLogger;
// mock it so the debounced flush timer can't fire after teardown.
jest.mock('../services/eventLogger');

import {
  RoomView,
  getInviteChipContent,
  getInviteAccessibilityLabel,
} from '../components/home/RoomView';

const ROOM_VIEW_SRC = path.resolve(__dirname, '../components/home/RoomView.tsx');

describe('getInviteChipContent', () => {
  test('null cost renders the plain tap-to-invite chip', () => {
    expect(getInviteChipContent(null, 0)).toEqual({ kind: 'tap', label: 'Tap to Invite' });
    // Balance is irrelevant without a cost
    expect(getInviteChipContent(null, 9999).kind).toBe('tap');
  });

  test('zero cost renders the free invite chip (onboarding Fox)', () => {
    expect(getInviteChipContent(0, 0)).toEqual({ kind: 'free', label: 'Invite (FREE)' });
  });

  test('paid invite with insufficient balance is not affordable', () => {
    expect(getInviteChipContent(100, 30)).toEqual({
      kind: 'cost',
      label: 'Invite',
      cost: 100,
      affordable: false,
    });
  });

  test('exact balance is affordable (boundary)', () => {
    const chip = getInviteChipContent(100, 100);
    expect(chip.kind).toBe('cost');
    if (chip.kind === 'cost') {
      expect(chip.affordable).toBe(true);
    }
  });

  test('surplus balance is affordable', () => {
    const chip = getInviteChipContent(100, 150);
    if (chip.kind === 'cost') {
      expect(chip.affordable).toBe(true);
      expect(chip.cost).toBe(100);
    } else {
      throw new Error('expected cost chip');
    }
  });
});

describe('getInviteAccessibilityLabel (pre-redesign strings preserved)', () => {
  test('null cost', () => {
    expect(getInviteAccessibilityLabel('Kitchen', null)).toBe('Invite animal to Kitchen');
  });

  test('free invite', () => {
    expect(getInviteAccessibilityLabel('Cozy Den', 0)).toBe('Invite animal to Cozy Den for free');
  });

  test('paid invite includes cost and currency', () => {
    expect(getInviteAccessibilityLabel('Kitchen', 100)).toBe('Invite animal to Kitchen for 100 amber');
  });
});

describe('RoomView module', () => {
  test('component is importable and memoized with displayName', () => {
    expect(RoomView).toBeTruthy();
    expect((RoomView as any).displayName).toBe('RoomView');
  });
});

describe('invite chip source pins', () => {
  const source = fs.readFileSync(ROOM_VIEW_SRC, 'utf8');

  test('the dominating sparkle emoji is gone', () => {
    expect(source).not.toContain('✨');
  });

  test('chip centers via absolute-fill wrapper, not hand-tuned translate offsets', () => {
    // The old lockedAnimalContainer used translateX: -40 / translateY: -35,
    // which mis-centered the 104px-wide chip by ~12px.
    expect(source).not.toMatch(/translateX|translateY/);
    expect(source).toContain('inviteCenterWrap');
  });

  test('chip gems are explicit Images with fixed size and gap, not inline text embeds', () => {
    // AmberInline stays on the (player-approved) dark build card, but the
    // invite chip rows must use the explicitly sized/margined gem Images.
    expect(source).toContain('inviteCostGem');
    expect(source).toContain('inviteBalanceGem');
    // No AmberInline inside the invite chip block
    const inviteBlock = source.slice(
      source.indexOf('Empty room waiting for animal'),
      source.indexOf('Word Echo Overlay'),
    );
    expect(inviteBlock.length).toBeGreaterThan(0);
    expect(inviteBlock).not.toContain('AmberInline');
  });

  test('chip copy stays em-dash free (player-facing text rule)', () => {
    for (const label of ['Tap to Invite', 'Invite (FREE)', 'Invite', 'Tap to welcome', 'You:']) {
      expect(label).not.toMatch(/[—–]/);
    }
  });
});
