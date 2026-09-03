/**
 * Cinematic chrome contrast (PhaseTransitionOverlay).
 *
 * The eight ceremonies run 10-20 seconds each and the Skip pill is the ONLY
 * way out of one (there is no tap-anywhere skip here — that belongs to the
 * victory choreography). It used to paint the event's own accentColor at 50%
 * alpha for both its label and its border, which composited to 1.26-2.47:1
 * against the event backgrounds: at the finale and post-revelation, black on
 * black. Worse, the pill is pinned to the top-right corner, which is exactly
 * where SoftVignette's two edges overlap and darken hardest, and the vignette
 * layer sat ABOVE it — so new ink alone would have been repainted over.
 *
 * pixelSkinContrast.test.ts cannot cover this: it is scoped to the cottage
 * wood surfaces. The cinematic palette had no guard at all, which is why the
 * project's own >=4.5:1 contract never reached it.
 */
import {
  getPhaseTransitionEvent,
  HOUSE_COMPLETION_EVENT,
  FINAL_PUZZLE_EVENT,
  POST_REVELATION_EVENT,
  NEW_CYCLE_EVENT,
  PhaseTransitionEvent,
} from '../services/phaseEvents';
import { DialoguePhase } from '../types/homeWorld';
import fs from 'fs';
import path from 'path';

// The colour constants are read out of the component source rather than
// imported: PhaseTransitionOverlay pulls in react-native, expo-audio bridges
// and every ceremony asset at module scope, and this file only needs two hex
// strings. Reading them from the source also pins that the JSX actually uses
// them (asserted below), so the test cannot pass against dead constants.
const OVERLAY_SRC = fs.readFileSync(
  path.resolve(__dirname, '../components/PhaseTransitionOverlay.tsx'),
  'utf8',
);

function readConst(name: string): string {
  const m = new RegExp(`export const ${name} = '(#[0-9A-Fa-f]{6})'`).exec(OVERLAY_SRC);
  expect(m).not.toBeNull();
  return m![1];
}

const SKIP_INK_COLOR = readConst('SKIP_INK_COLOR');
const SKIP_BORDER_COLOR = readConst('SKIP_BORDER_COLOR');

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const channels = [0, 2, 4]
    .map(i => parseInt(h.substr(i, 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const ALL_EVENTS: PhaseTransitionEvent[] = [
  ...([1, 2, 3, 4] as DialoguePhase[]).map(p => getPhaseTransitionEvent(p)!),
  HOUSE_COMPLETION_EVENT,
  FINAL_PUZZLE_EVENT,
  POST_REVELATION_EVENT,
  NEW_CYCLE_EVENT,
];

describe('the Skip control is visible on every cinematic', () => {
  it('covers all eight events (nothing silently dropped from the sweep)', () => {
    expect(ALL_EVENTS).toHaveLength(8);
    for (const event of ALL_EVENTS) {
      expect(event.bgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('the label holds >=4.5:1 (14dp/600 is not WCAG large text)', () => {
    for (const event of ALL_EVENTS) {
      expect(contrast(SKIP_INK_COLOR, event.bgColor)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the pill border holds the >=3:1 non-text bar', () => {
    for (const event of ALL_EVENTS) {
      expect(contrast(SKIP_BORDER_COLOR, event.bgColor)).toBeGreaterThanOrEqual(3);
    }
  });

  it('the old 50%-alpha accent ink stays gone', () => {
    // `accentColor + '80'` is the exact spelling that shipped 1.26:1.
    expect(OVERLAY_SRC).not.toMatch(/skipButton[^\n]*accentColor \+ '80'/);
    expect(OVERLAY_SRC).not.toMatch(/skipText[^\n]*accentColor \+ '80'/);
    expect(OVERLAY_SRC).toContain('color: SKIP_INK_COLOR');
    expect(OVERLAY_SRC).toContain('borderColor: SKIP_BORDER_COLOR');
  });

  it('the pill sits above the vignette and below the flash', () => {
    // Ink is pointless under a 0.9-opacity darkening layer. Extract the three
    // zIndexes from their own style blocks so a reordering fails here.
    const zOf = (styleName: string): number => {
      const block = new RegExp(`\\n  ${styleName}: \\{([\\s\\S]*?)\\n  \\},`).exec(OVERLAY_SRC);
      expect(block).not.toBeNull();
      const z = /zIndex:\s*(\d+)/.exec(block![1]);
      expect(z).not.toBeNull();
      return Number(z![1]);
    };
    const skip = zOf('skipButton');
    const vignette = zOf('vignette');
    const flash = zOf('flash');
    expect(skip).toBeGreaterThan(vignette);
    expect(skip).toBeLessThan(flash);
  });
});
