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

/* ────────────────────────────────────────────────────────────────────────────
 * Portrait FRAMING (the alcove crop).
 *
 * The reported bug: animals were "cut off at the front and back" in the
 * dialogue portrait. Every character PNG is a square 500x500 canvas, the alcove
 * is a tall box, and the layers render with cover, which scales square art by
 * the box HEIGHT. So the art was rendered `boxHeight` wide inside an alcove only
 * `alcoveWidth` wide and the visible slice, `alcoveWidth / boxHeight`, was
 * centred on the CANVAS rather than on the animal. Six of thirteen characters
 * are wider than that slice and/or sit off canvas centre, so they lost their
 * snout and/or their tail.
 *
 * These pins measure the real art and re-derive the crop, so a re-exported PNG
 * or a new character cannot silently start clipping again. The alpha bounding
 * box is taken over the UNION of every frame a portrait can show (idle, talk,
 * robed, robed_talk): a character must not clip only while speaking, or only
 * once the robes land.
 * ──────────────────────────────────────────────────────────────────────────── */

import {
  DIALOGUE_PORTRAIT_MARGIN,
  DIALOGUE_PORTRAIT_SUBJECTS,
  DIALOGUE_SPRITE_COL_FRACTION,
  getDialoguePortraitFrame,
} from '../theme/dialoguePortrait';
import { SURFACE } from '../theme/surfaces';

/** Union alpha bounding box of every portrait frame, as canvas fractions. */
function measureSubject(animal: string): { left: number; right: number } {
  const { PNG } = require('pngjs');
  const dir = path.join(__dirname, `../../assets/characters/${animal}`);
  let lo = Infinity;
  let hi = -1;
  let canvasWidth = 0;
  for (const frame of ['idle.png', 'talk.png', 'robed.png', 'robed_talk.png']) {
    const file = path.join(dir, frame);
    if (!fs.existsSync(file)) continue;
    const png = PNG.sync.read(fs.readFileSync(file));
    canvasWidth = png.width;
    for (let i = 3; i < png.data.length; i += 4) {
      // Alpha above the anti-aliasing floor: the edge columns of every
      // character carry whole rows of opaque pixels, so this is real subject.
      if (png.data[i] > 12) {
        const x = ((i - 3) / 4) % png.width;
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
    }
  }
  expect(canvasWidth).toBeGreaterThan(0);
  return { left: lo / canvasWidth, right: (hi + 1) / canvasWidth };
}

const REGISTERED_ANIMALS: string[] = (() => {
  const spriteSrc = fs.readFileSync(
    path.join(__dirname, '../components/home/AnimalSprite.tsx'),
    'utf8'
  );
  return [
    ...spriteSrc.matchAll(
      /idle: require\('\.\.\/\.\.\/\.\.\/assets\/characters\/([a-z_]+)\/idle\.png'\)/g
    ),
  ].map(m => m[1]);
})();

/** Measured once: the scan reads 52 PNGs. */
const MEASURED: Record<string, { left: number; right: number }> = {};
beforeAll(() => {
  for (const animal of REGISTERED_ANIMALS) MEASURED[animal] = measureSubject(animal);
});

/**
 * Every surface that renders the cover-scaled portrait, with the alcove width
 * that clips it and the box height it used BEFORE this fix. Reference width 390
 * (a common phone) plus a narrow phone for the stacked branch.
 */
const REF_WIDTH = 390;
const NARROW_WIDTH = 360;
const homeContentWidth = (w: number) => w - 2 * SURFACE.panelPadX;
const homeAlcove = (w: number) => DIALOGUE_SPRITE_COL_FRACTION * homeContentWidth(w);
const COMPACT = new Set(['axolotl', 'fennec_fox', 'aye_aye', 'kakapo']);

interface Surface {
  name: string;
  animals: string[];
  alcove: number;
  /** The box height this surface used before the fix (the no-zoom-in ceiling). */
  priorHeight: (animal: string) => number;
}

const surfaces = (): Surface[] => [
  {
    name: 'home dialogue sheet (main card + intro/override card)',
    animals: REGISTERED_ANIMALS,
    alcove: homeAlcove(REF_WIDTH),
    priorHeight: a => REF_WIDTH * (COMPACT.has(a) ? 0.41 : 0.48),
  },
  {
    name: 'home dialogue sheet, stacked branch (narrow phone / large font)',
    animals: REGISTERED_ANIMALS,
    alcove: 72,
    priorHeight: a => (COMPACT.has(a) ? 80 : 88),
  },
  {
    name: 'FoxGuide dialogue card',
    animals: ['fox'],
    alcove: DIALOGUE_SPRITE_COL_FRACTION * (REF_WIDTH - 2 * 16 - 2 * SURFACE.panelPadX),
    priorHeight: () => REF_WIDTH * 0.48,
  },
  {
    name: 'FoxGuide compact card',
    animals: ['fox'],
    alcove: 72,
    priorHeight: () => 114,
  },
  {
    name: 'journal spotlight',
    animals: ['fox'],
    alcove: 92,
    priorHeight: () => 140,
  },
];

describe('dialogue portrait framing table', () => {
  it('covers every registered character (13, no gaps)', () => {
    expect(REGISTERED_ANIMALS).toHaveLength(13);
    for (const animal of REGISTERED_ANIMALS) {
      expect(Object.keys(DIALOGUE_PORTRAIT_SUBJECTS)).toContain(animal);
    }
    // And nothing stale: a removed character would leave a dead row.
    for (const key of Object.keys(DIALOGUE_PORTRAIT_SUBJECTS)) {
      expect(REGISTERED_ANIMALS).toContain(key);
    }
  });

  it('contains the real alpha bounding box of every portrait frame', () => {
    for (const animal of REGISTERED_ANIMALS) {
      const table = DIALOGUE_PORTRAIT_SUBJECTS[animal as keyof typeof DIALOGUE_PORTRAIT_SUBJECTS];
      const measured = MEASURED[animal];
      // The table may be conservative (wider), never optimistic: a row that no
      // longer contains its art is exactly how a re-export starts clipping.
      expect(table.left).toBeLessThanOrEqual(measured.left + 1e-9);
      expect(table.right).toBeGreaterThanOrEqual(measured.right - 1e-9);
    }
  });

  it('leaves room for the air margin on every character (band stays reachable)', () => {
    // A subject wider than 1 - margin cannot be shown with air under cover; the
    // helper would clamp and the character would clip again.
    for (const animal of REGISTERED_ANIMALS) {
      const m = MEASURED[animal];
      expect(m.right - m.left).toBeLessThanOrEqual(1 - DIALOGUE_PORTRAIT_MARGIN);
    }
  });
});

describe('dialogue portrait framing fits the alcove', () => {
  for (const surface of surfaces()) {
    describe(surface.name, () => {
      for (const animal of surface.animals) {
        it(`${animal} is whole, front and back`, () => {
          const prior = surface.priorHeight(animal);
          const frame = getDialoguePortraitFrame(animal, surface.alcove, prior);
          const measured = MEASURED[animal];

          // Cover renders the square art `height` wide, centred in the box, and
          // the layer offset slides it. Map the alcove's two edges back onto the
          // art to get the visible slice, in canvas fractions.
          const { width: boxW, height: boxH } = frame.box;
          const artLeftInBox = frame.layer.left + (boxW - boxH) / 2;
          const left = (0 - artLeftInBox) / boxH;
          const right = (boxW - artLeftInBox) / boxH;
          const band = right - left;
          const windowCenter = (left + right) / 2;

          // At rest: whole, with the air margin split across both sides.
          expect(left).toBeLessThanOrEqual(measured.left - DIALOGUE_PORTRAIT_MARGIN / 2 + 1e-9);
          expect(right).toBeGreaterThanOrEqual(measured.right + DIALOGUE_PORTRAIT_MARGIN / 2 - 1e-9);

          // While speaking: dialogueSpriteTalking scales the box 1.02, which on
          // a surface whose alcove re-clips the scaled box shaves ~2% off the
          // band. Still whole, margin or no margin.
          const talkBand = band / 1.02;
          expect(windowCenter - talkBand / 2).toBeLessThanOrEqual(measured.left + 1e-9);
          expect(windowCenter + talkBand / 2).toBeGreaterThanOrEqual(measured.right - 1e-9);

          // Cover must keep scaling by HEIGHT, or the crop moves to the
          // vertical axis and the character loses its head instead.
          expect(frame.box.height).toBeGreaterThanOrEqual(frame.box.width);
        });
      }
    });
  }
});

describe('no character that already fits is zoomed in', () => {
  for (const surface of surfaces()) {
    for (const animal of surface.animals) {
      it(`${surface.name}: ${animal} never renders larger than before`, () => {
        const prior = surface.priorHeight(animal);
        const frame = getDialoguePortraitFrame(animal, surface.alcove, prior);
        // A TALLER box means a narrower visible band, i.e. a tighter crop.
        expect(frame.box.height).toBeLessThanOrEqual(prior + 1e-9);

        const measured = MEASURED[animal];
        const priorBand = surface.alcove / prior;
        const needed = measured.right - measured.left + DIALOGUE_PORTRAIT_MARGIN;
        if (priorBand >= needed) {
          // Already had room: the size is untouched, only the centring moves.
          expect(frame.box.height).toBeCloseTo(prior, 6);
        } else {
          expect(frame.box.height).toBeLessThan(prior);
        }
      });
    }
  }
});

describe('the reported crop is gone', () => {
  // A subject can overrun the old window by a hair of anti-aliasing without
  // losing a pixel of art. One source pixel of the 500px canvas is the floor
  // for calling it a crop.
  const SOURCE_PIXEL = 1 / 500;

  const survey = (width: number) => {
    const alcove = homeAlcove(width);
    const priorHeight = (a: string) => width * (COMPACT.has(a) ? 0.41 : 0.48);
    const clippedBefore: string[] = [];
    const resized: string[] = [];
    for (const animal of REGISTERED_ANIMALS) {
      const m = MEASURED[animal];
      const prior = priorHeight(animal);
      // Before: the visible band was centred on the CANVAS, not the animal.
      const priorBand = alcove / prior;
      if (
        m.left < 0.5 - priorBand / 2 - SOURCE_PIXEL ||
        m.right > 0.5 + priorBand / 2 + SOURCE_PIXEL
      ) {
        clippedBefore.push(animal);
      }
      if (getDialoguePortraitFrame(animal, alcove, prior).box.height < prior - 1e-9) {
        resized.push(animal);
      }
    }
    return { clippedBefore, resized };
  };

  it('names the six characters that lost art (the pangolin lost both ends)', () => {
    const { clippedBefore } = survey(REF_WIDTH);
    expect(clippedBefore.sort()).toEqual(
      ['axolotl', 'aye_aye', 'fennec_fox', 'kakapo', 'pangolin', 'red_panda'].sort()
    );
  });

  it('never resizes a character that was already whole, at any width', () => {
    // The zoom only ever comes DOWN, so resizing a correctly framed character
    // would be buying it air at the cost of its size. Recentring is free and
    // fixes several of the six on its own.
    for (const width of [380, 390, 412, 430, 480]) {
      const { clippedBefore, resized } = survey(width);
      for (const animal of resized) expect(clippedBefore).toContain(animal);
    }
  });
});

describe('portrait surfaces are wired to the measured frame', () => {
  const foxSrc = fs.readFileSync(
    path.join(__dirname, '../components/FoxGuide.tsx'),
    'utf8'
  );

  it('the home dialogue box carries no sizing of its own', () => {
    // The old box declared a width WIDER than the column, so the column's
    // overflow:hidden did the real cropping and the declared width was dead
    // code. One source of truth now: the frame.
    const styleStart = src.indexOf('dialogueSpriteImage: {');
    expect(styleStart).toBeGreaterThanOrEqual(0);
    const block = src.slice(styleStart, src.indexOf('},', styleStart));
    expect(block).not.toContain('width:');
    expect(block).not.toContain('height:');
    expect(block).toContain("overflow: 'hidden'");
    // The height-only compact tier no longer decides the crop.
    expect(src).not.toContain('dialogueSpriteImageSmall');
  });

  it('both dialogue cards apply the frame box and offset every layer', () => {
    expect(src).toContain('dialoguePortrait.box');
    expect(src).toContain('introPortrait.box');
    // Four layers per card: robed, robedTalk, idle, talk.
    expect((src.match(/dialoguePortrait\.layer/g) || []).length).toBe(4);
    expect((src.match(/introPortrait\.layer/g) || []).length).toBe(4);
    // The offset must come AFTER dialogueSpriteLayer, which declares left: 0.
    for (const m of src.matchAll(/(dialoguePortrait|introPortrait|journalSpotlightPortrait)\.layer/g)) {
      const before = src.slice(Math.max(0, m.index! - 200), m.index!);
      expect(before).toContain('styles.dialogueSpriteLayer');
    }
  });

  it('the journal spotlight runs through the same frame', () => {
    expect(src).toContain('journalSpotlightPortrait.box');
    expect((src.match(/journalSpotlightPortrait\.layer/g) || []).length).toBe(2);
  });

  it('the alcove percentage and the crop maths read the same constant', () => {
    expect(src).toContain('`${DIALOGUE_SPRITE_COL_FRACTION * 100}%`');
    expect(src).toContain('DIALOGUE_SPRITE_COL_FRACTION * (screenWidth - 2 * SURFACE.panelPadX)');
    expect(foxSrc).toContain('`${DIALOGUE_SPRITE_COL_FRACTION * 100}%`');
  });

  it('FoxGuide frames its portrait the same way (a non-fox sprite cannot crop)', () => {
    expect(foxSrc).toContain('getDialoguePortraitFrame');
    expect(foxSrc).toContain('foxPortrait.box');
    expect((foxSrc.match(/foxPortrait\.layer/g) || []).length).toBe(2);
    // No leftover box sizing to contradict the frame.
    expect(foxSrc).not.toContain('compactSpriteImage');
  });
});
