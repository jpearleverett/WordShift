/**
 * Home dialogue portrait contract (source scan of HomeScreen.tsx).
 *
 * Real-device bug (iPhone playtest, v1.3.2): during the journal intro
 * spotlight the fox portrait rendered on a light rounded fill box
 * (dt.spriteBg + borderWidth) instead of sitting transparent on the card
 * parchment, and the talk/idle mouth-flap never ran (a single STATIC talk
 * frame was mounted, no cadence). The main animal dialogue card has always
 * done both correctly. These pins keep all three dialogue surfaces (main
 * animal card, intro/override modal, journal spotlight) on the same portrait
 * treatment:
 *
 *  1. No dialogue portrait sits on a spriteBg fill box, anywhere.
 *  2. Every portrait pre-mounts the idle+talk stack and opacity-switches the
 *     layers (never a per-tick source swap, which re-decodes and flickers),
 *     with the dialogueSpriteTalking lift applied while the surface's
 *     talking flag is on. The talk layer stays conditional on the sprite
 *     actually HAVING a talk frame (the axolotl's talk === idle is a design
 *     decision; nothing may assume talk differs from idle).
 *  3. ONE shared timer drives the intro/override modal AND the journal
 *     spotlight, and it is reducedMotion-aware exactly like the main card's
 *     (useDialogueFlow): under reduced motion the flag HOLDS true so the
 *     pose is static; the interval never runs.
 *
 * Source-scan convention (see questPill.test.ts "header wiring"): HomeScreen
 * is not rendered in the Node test env; the wiring is pinned against the
 * source text with bounded windows.
 */

import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(
  path.join(__dirname, '../components/home/HomeScreen.tsx'),
  'utf8'
);

/** Bounded window helper: slice from a marker (must exist) forward. */
const windowFrom = (marker: string, length: number): string => {
  const start = src.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  return src.slice(start, start + length);
};

describe('journal spotlight portrait (the screenshot bug)', () => {
  // The whole spotlight portrait block sits within this window.
  const spotlight = () => windowFrom('styles.journalSpotlightSpriteWrap', 2400);

  it('never paints the light spriteBg fill box behind any portrait', () => {
    // The defect: { backgroundColor: dt.spriteBg, borderColor: dt.bubbleBorder }
    // on the spotlight sprite col. The token must be gone from HomeScreen
    // entirely (no other surface uses it either).
    expect(src).not.toContain('spriteBg');
  });

  it('sprite crop box carries no fill, border, or borderRadius', () => {
    const styleStart = src.indexOf('journalSpotlightSpriteCol: {');
    expect(styleStart).toBeGreaterThanOrEqual(0);
    const styleBlock = src.slice(styleStart, src.indexOf('},', styleStart));
    expect(styleBlock).not.toContain('backgroundColor');
    expect(styleBlock).not.toContain('borderWidth');
    expect(styleBlock).not.toContain('borderRadius');
    expect(styleBlock).not.toContain('borderColor');
  });

  it('pre-mounts the idle+talk stack (opacity switch, no static talk frame)', () => {
    const w = spotlight();
    // Both layers mounted; the old static `talk || idle` single Image is gone.
    expect(w).toContain('CHARACTER_SPRITES.fox.idle');
    expect(w).toContain('CHARACTER_SPRITES.fox.talk!');
    expect(w).toContain('styles.dialogueSpriteLayerHidden');
    expect(w).not.toContain('CHARACTER_SPRITES.fox.talk || CHARACTER_SPRITES.fox.idle');
    // The talk layer only mounts when a talk frame exists (axolotl rule:
    // never assume talk !== idle).
    expect(w).toContain('Boolean(CHARACTER_SPRITES.fox.talk)');
  });

  it('applies the dialogueSpriteTalking lift on the shared cadence', () => {
    expect(spotlight()).toContain('introIsTalking && styles.dialogueSpriteTalking');
  });

  it('portrait wrapper keeps the image accessibility contract', () => {
    const w = spotlight();
    expect(w).toContain('accessibilityRole="image"');
    expect(w).toContain('accessibilityLabel="Fox portrait"');
  });
});

describe('intro/override dialogue portrait', () => {
  // From the intro modal comment to the next modal's comment (the sacrifice
  // altar moved out to the shared UtilityMenu, so completion is now next).
  const introModal = () => {
    const start = src.indexOf('{/* Intro Dialogue Modal */}');
    const end = src.indexOf('{/* House Completion Ceremony Modal */}');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    return src.slice(start, end);
  };

  it('applies the dialogueSpriteTalking lift while introIsTalking', () => {
    expect(introModal()).toContain('introIsTalking && styles.dialogueSpriteTalking');
  });

  it('keeps the pre-mounted opacity-switched idle+talk stack', () => {
    const w = introModal();
    expect(w).toContain('styles.dialogueSpriteLayerHidden');
    expect(w).toContain('!.idle');
    expect(w).toContain('?.talk');
  });
});

describe('shared talking timer (intro modal + journal spotlight)', () => {
  const effect = () => windowFrom('const [introTalkFrame, setIntroIsTalking]', 1100);

  it('one timer serves both surfaces', () => {
    const w = effect();
    expect(w).toContain('showIntroDialogue || journalSpotlightVisible');
    // The spotlight modal's visibility shares the same derived flag, so the
    // timer and the modal can never disagree about "spotlight is up".
    expect(src).toContain('visible={journalSpotlightVisible}');
  });

  it('holds the flag true under reduced motion (static pose, no interval)', () => {
    const w = effect();
    // The pose is derived immediately, including on the first render after
    // reduced motion changes. The timer only owns the alternating frame.
    expect(w).toContain('(introMotionReduced || introTalkFrame)');
    const guardIdx = w.indexOf('&& !introMotionReduced');
    const intervalIdx = w.indexOf('setInterval');
    expect(guardIdx).toBeGreaterThanOrEqual(0);
    expect(intervalIdx).toBeGreaterThan(guardIdx);
    expect(w).toContain('clearInterval(interval)');
    expect(w).toContain('[showIntroDialogue, journalSpotlightVisible, introMotionReduced]');
  });
});

describe('main animal dialogue card (reference surface, unchanged)', () => {
  it('still applies the talking lift from useDialogueFlow.isTalking', () => {
    expect(src).toContain('dialogueFlow.isTalking && styles.dialogueSpriteTalking');
  });
});

describe('robed talk frames (F37: the climax mouth-flap)', () => {
  const spriteSrc = fs.readFileSync(
    path.join(__dirname, '../components/home/AnimalSprite.tsx'),
    'utf8'
  );

  it('all 13 animals register a robedTalk frame', () => {
    const count = (spriteSrc.match(/robedTalk: require\('\.\.\/\.\.\/\.\.\/assets\/characters\/[a-z_]+\/robed_talk\.png'\)/g) || []).length;
    expect(count).toBe(13);
  });

  it('all 13 robed_talk.png files exist on disk', () => {
    const animals = [...spriteSrc.matchAll(/robedTalk: require\('\.\.\/\.\.\/\.\.\/assets\/characters\/([a-z_]+)\/robed_talk\.png'\)/g)].map(m => m[1]);
    for (const an of animals) {
      expect(fs.existsSync(path.join(__dirname, `../../assets/characters/${an}/robed_talk.png`))).toBe(true);
    }
  });

  it("the axolotl's robedTalk is pixel-identical to robed (his mouth never moves, by design)", () => {
    // Pixel equality, not byte equality: sanitizePng re-encodes, so the two
    // files legitimately differ as bytes while painting the same image.

    const { PNG } = require('pngjs');
    const a = PNG.sync.read(fs.readFileSync(path.join(__dirname, '../../assets/characters/axolotl/robed_talk.png')));
    const b = PNG.sync.read(fs.readFileSync(path.join(__dirname, '../../assets/characters/axolotl/robed.png')));
    expect(a.width).toBe(b.width);
    expect(a.height).toBe(b.height);
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
  });

  it('the intro/override modal mouth-flaps the robed stack like the main card', () => {
    const win = windowFromSrc('Robed + robedTalk stack, mirroring the main dialogue', 1400);
    expect(win).toContain('.robedTalk!');
    expect(win).toMatch(/!introIsTalking && styles\.dialogueSpriteLayerHidden/);
  });
});

function windowFromSrc(marker: string, length: number): string {
  const start = src.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  return src.slice(start, start + length);
}
