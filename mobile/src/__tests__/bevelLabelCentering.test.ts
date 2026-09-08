/**
 * Cottage bevel labels sit on the button BODY's centre line.
 *
 * Every pixel-bevel button is a 3-slice strip (ThreeSliceStrip) whose sprite
 * is the button body plus ONE baked cast-shadow row of BTN_SHADOW_DP below it.
 * The label container therefore carries exactly one vertical inset,
 * `paddingBottom: BTN_SHADOW_DP`, so flex centring lands the glyphs on the
 * body centre ((strip - shadow) / 2) rather than the strip centre.
 *
 * A `paddingTop: 10` added to CandyButton.content and HomeScreen.bevelContent
 * broke that invariant: the content box became 10 / 3, whose centre sits 5dp
 * below the body centre, and every Continue / price / Buy label read as
 * bottom-aligned. This pins the invariant on each bevel label container, and
 * the label role's line box against the smallest body, so the drop cannot
 * come back with the next "give the label some headroom" edit.
 *
 * Source-level (no renderer in this suite), modelled on surfaceClearance.
 */
// theme/typography -> theme/fonts imports react-native for Platform at module
// load; the Node env cannot parse the real package, so stub the module-load
// surface (same shape the other source-pin suites use).
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Text: 'Text',
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));

import fs from 'fs';
import path from 'path';
import { TEXT_ROLE } from '../theme/typography';
import { BTN_MD_DP, BTN_SHADOW_DP } from '../theme/pixelSkin.generated';

function read(rel: string): string {
  return fs.readFileSync(path.join(__dirname, rel), 'utf8');
}

/**
 * The body of a StyleSheet entry `  <key>: {` ... `  },` at 2-space indent,
 * with line comments removed so documentation inside the block (which may
 * well name the very key being forbidden) can never trip a pin.
 */
function styleBlock(src: string, key: string): string {
  const start = src.indexOf(`\n  ${key}: {`);
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('\n  }', start + 1);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

// Any vertical padding, including the logical (Block) forms.
const VERTICAL_PADDING = /padding(Top|Vertical|Block|BlockStart|BlockEnd)\s*:|\bpadding\s*:/;
// A label TEXT style must not nudge itself off the centre line either.
const TEXT_NUDGE = /(margin|padding)(Top|Bottom|Vertical|Block)\s*:|translateY/;

describe('bevel label containers keep the shadow row as their only vertical inset', () => {
  const candy = read('../components/ui/CandyButton.tsx');
  const home = read('../components/home/HomeScreen.tsx');
  const fox = read('../components/FoxGuide.tsx');
  const pit = read('../components/OfferingPitScreen.tsx');

  it('CandyButton: the content style has no vertical padding; the shadow inset is inline', () => {
    const content = styleBlock(candy, 'content');
    expect(content).not.toMatch(VERTICAL_PADDING);
    expect(content).not.toMatch(/margin(Top|Bottom|Vertical)\s*:/);
    // The one asymmetry rides the Animated.View so it stays next to the
    // press-travel transform it composes with, and nothing else vertical
    // may share that inline object.
    const inline = candy.match(/\{[^{}]*paddingBottom: BTN_SHADOW_DP[^{}]*transform: \[\{ translateY \}\][^{}]*\}/);
    expect(inline).not.toBeNull();
    expect(inline![0]).not.toMatch(VERTICAL_PADDING);
    expect(candy).toContain('textRole="label"');
    for (const key of ['label', 'labelLg', 'quietLabel']) {
      expect(styleBlock(candy, key)).not.toMatch(TEXT_NUDGE);
    }
  });

  it('HomeScreen BevelRowButton mirrors CandyButton exactly', () => {
    const content = styleBlock(home, 'bevelContent');
    expect(content).toContain('paddingBottom: BTN_SHADOW_DP');
    expect(content).not.toMatch(VERTICAL_PADDING);
    expect(content).not.toMatch(/margin(Top|Bottom|Vertical)\s*:/);
    for (const key of ['bevelBtnText', 'continueButtonText']) {
      expect(styleBlock(home, key)).not.toMatch(TEXT_NUDGE);
    }
  });

  it('FoxGuide bevel keeps the reference anatomy', () => {
    const block = fox.slice(fox.indexOf('const foxBevelStyles = StyleSheet.create({'), fox.indexOf('});', fox.indexOf('const foxBevelStyles')));
    const content = block.slice(block.indexOf('content: {'), block.indexOf('},', block.indexOf('content: {')));
    expect(content).toContain('paddingBottom: BTN_SHADOW_DP');
    expect(content).not.toMatch(VERTICAL_PADDING);
  });

  it('Offering Pit bevels keep the reference anatomy', () => {
    // Two anatomies: harvestAllContent is a content WRAPPER inside the strip;
    // tendingButton is the strip ITSELF acting as the label's flex parent (the
    // ThreeSliceStrip is absolutely positioned off the padding box, so it still
    // covers the whole strip). The inset rule is the same for both.
    for (const key of ['harvestAllContent', 'tendingButton']) {
      const block = styleBlock(pit, key);
      expect(block).toContain('paddingBottom: BTN_SHADOW_DP');
      // External margins on the strip do not move the label inside the body;
      // vertical PADDING does.
      expect(block).not.toMatch(VERTICAL_PADDING);
    }
  });
});

describe('the label role fits the smallest bevel body with headroom', () => {
  it('leaves at least 6dp of body above and below a one-line label box', () => {
    expect(BTN_SHADOW_DP).toBe(3);
    expect(TEXT_ROLE.label.lineHeight).toBeLessThanOrEqual(BTN_MD_DP - 2 * 6);
    // React Native (iOS RCTApplyBaselineOffset, Android CustomLineHeightSpan)
    // centres the glyphs inside a line box taller than the font, so the box
    // height is free to grow as long as it fits; a box SHORTER than the font
    // skips that compensation and risks clipping descenders.
    expect(TEXT_ROLE.label.lineHeight).toBeGreaterThanOrEqual(Math.ceil(TEXT_ROLE.label.fontSize * 1.2));
  });
});
