/**
 * ActionButton sprite icon tests.
 *
 * The puzzle action buttons replaced their emoji icons with generated
 * candy-style sprites (assets/ui, generateUiIcons.mjs). These tests verify:
 * - Every emoji App.tsx actually passes to ActionButton maps to a sprite
 * - Unknown icon strings fall back to text rendering (backward compatible)
 * - The generated PNGs exist on disk and are valid, non-empty 256x256 PNGs
 */

import fs from 'fs';
import path from 'path';

// Mock react-native since we're in Node (no renderer). Only what ActionButton
// touches at module load matters (StyleSheet.create); the rest are inert stubs.
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Image: 'Image',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Animated: {
    View: 'AnimatedView',
    Value: jest.fn().mockImplementation((val: number) => ({
      _value: val,
      interpolate: jest.fn().mockReturnValue('interpolated'),
    })),
  },
  Easing: {
    inOut: jest.fn((fn: any) => fn),
    sin: jest.fn(),
  },
  Platform: { OS: 'android' },
  PixelRatio: { get: jest.fn().mockReturnValue(2) },
  Dimensions: { get: jest.fn().mockReturnValue({ width: 400, height: 800 }) },
}));

// ActionButton now imports haptics (disabled-tap acknowledgment); stub it with a
// factory so the Node test env never loads the native expo-haptics module.
jest.mock('../services/haptics', () => ({
  hapticSelection: jest.fn(),
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
  hapticHeavy: jest.fn(),
  hapticSuccess: jest.fn(),
  hapticWarning: jest.fn(),
  hapticError: jest.fn(),
}));

import { getActionIconSprite } from '../components/puzzle/ActionButton';

const UI_DIR = path.resolve(__dirname, '../../assets/ui');
const APP_TSX = path.resolve(__dirname, '../../App.tsx');

// Emoji currently passed by App.tsx (undo / hint / restart-new)
const KNOWN_ICONS = ['↩', '💡', '🔄'];
const SPRITE_FILES = ['undo.png', 'hint.png', 'restart.png'];

describe('getActionIconSprite mapping', () => {
  test.each(KNOWN_ICONS)('known icon %s resolves to a sprite', (icon) => {
    // Note: not.toBeNull(), not truthiness — the jest fileMock stubs require()
    // of PNGs as 0, and real bundler asset ids are opaque numbers.
    expect(getActionIconSprite(icon)).not.toBeNull();
  });

  test('unknown icon strings return null (text fallback)', () => {
    expect(getActionIconSprite('X')).toBeNull();
    expect(getActionIconSprite('⭐')).toBeNull();
    expect(getActionIconSprite('')).toBeNull();
    expect(getActionIconSprite('HINT')).toBeNull();
  });
});

describe('App.tsx ActionButton icon coverage', () => {
  test('every emoji icon App.tsx passes to ActionButton has a sprite', () => {
    const source = fs.readFileSync(APP_TSX, 'utf8');
    const matches = [...source.matchAll(/<ActionButton[\s\S]*?icon="([^"]+)"/g)];
    expect(matches.length).toBeGreaterThan(0);
    for (const [, icon] of matches) {
      // Only emoji/symbol icons must map — plain-text icons intentionally
      // render as text via the fallback path.
      if (/[^\x00-\x7F]/.test(icon)) {
        expect(getActionIconSprite(icon)).not.toBeNull();
      }
    }
  });
});

describe('generated sprite files', () => {
  test.each(SPRITE_FILES)('%s exists and is a valid non-empty PNG', (file) => {
    const fp = path.join(UI_DIR, file);
    expect(fs.existsSync(fp)).toBe(true);
    const buf = fs.readFileSync(fp);
    expect(buf.length).toBeGreaterThan(500);
    // PNG magic bytes
    expect(buf[0]).toBe(137);
    expect(buf.toString('ascii', 1, 4)).toBe('PNG');
    // IHDR dimensions: 256x256 like the rest of the assets/ui set
    expect(buf.readUInt32BE(16)).toBe(256);
    expect(buf.readUInt32BE(20)).toBe(256);
  });
});
