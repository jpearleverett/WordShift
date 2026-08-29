/**
 * Phase 4-5 robed TALK frames (F26 / F37).
 *
 * Dialogue portraits opacity-switch robed <-> robedTalk the same way they
 * switch idle <-> talk in earlier phases. The talk layer only mounts when
 * the frame exists, so a missing file is a frozen robe — the climax bug.
 *
 * Contract:
 *  - every animal with a real talk mouth ships robedTalk.png
 *  - Axel (axolotl) does NOT: talk === idle by design (scuba mask)
 *  - each frame is framing-identical to that animal's robed.png
 *    (same canvas, near-identical alpha silhouette) so the switch never jumps
 *  - CHARACTER_SPRITES registers the require
 *  - the intro/override portrait uses the same robedTalk stack as the main card
 */

import * as fs from 'fs';
import * as path from 'path';

const CHAR_DIR = path.join(__dirname, '../../assets/characters');
const SPRITE_SRC = fs.readFileSync(
  path.join(__dirname, '../components/home/AnimalSprite.tsx'),
  'utf8'
);
const HOME_SRC = fs.readFileSync(
  path.join(__dirname, '../components/home/HomeScreen.tsx'),
  'utf8'
);

const ANIMALS_WITH_MOUTH = [
  'fox',
  'pangolin',
  'owl',
  'capybara',
  'fennec_fox',
  'red_panda',
  'sloth',
  'wombat',
  'rabbit',
  'tarsier',
  'aye_aye',
  'kakapo',
] as const;

const AXOLOTL = 'axolotl';

function pngSize(filePath: string): { width: number; height: number } {
  const buf = fs.readFileSync(filePath);
  // PNG IHDR: width/height are 4-byte big-endian at offset 16/20.
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('robedTalk art files', () => {
  it('ships a robedTalk.png for every animal with a real talk mouth', () => {
    for (const animal of ANIMALS_WITH_MOUTH) {
      const fp = path.join(CHAR_DIR, animal, 'robedTalk.png');
      expect(fs.existsSync(fp)).toBe(true);
    }
  });

  it('does not invent a robedTalk for the axolotl (mask, no mouth)', () => {
    expect(fs.existsSync(path.join(CHAR_DIR, AXOLOTL, 'robedTalk.png'))).toBe(false);
  });

  it('matches the robed canvas exactly (framing-identical switch)', () => {
    for (const animal of ANIMALS_WITH_MOUTH) {
      const robed = path.join(CHAR_DIR, animal, 'robed.png');
      const talk = path.join(CHAR_DIR, animal, 'robedTalk.png');
      expect(pngSize(talk)).toEqual(pngSize(robed));
    }
  });

  it('is not a byte-identical copy of robed (the mouth must actually change)', () => {
    for (const animal of ANIMALS_WITH_MOUTH) {
      const robed = fs.readFileSync(path.join(CHAR_DIR, animal, 'robed.png'));
      const talk = fs.readFileSync(path.join(CHAR_DIR, animal, 'robedTalk.png'));
      expect(robed.equals(talk)).toBe(false);
    }
  });
});

describe('CHARACTER_SPRITES wiring', () => {
  it('registers robedTalk on every mouthed animal', () => {
    for (const animal of ANIMALS_WITH_MOUTH) {
      expect(SPRITE_SRC).toContain(
        `robedTalk: require('../../../assets/characters/${animal}/robedTalk.png')`
      );
    }
  });

  it('does not register a robedTalk require for the axolotl', () => {
    expect(SPRITE_SRC).not.toContain(
      "robedTalk: require('../../../assets/characters/axolotl/robedTalk.png')"
    );
  });
});

describe('intro/override portrait uses the same robedTalk stack', () => {
  const introModal = () => {
    const start = HOME_SRC.indexOf('{/* Intro Dialogue Modal */}');
    const end = HOME_SRC.indexOf('{/* Sacrifice Modal');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    return HOME_SRC.slice(start, end);
  };

  it('opacity-switches robed <-> robedTalk instead of a static robe', () => {
    const w = introModal();
    expect(w).toContain('?.robedTalk');
    expect(w).toContain('styles.dialogueSpriteLayerHidden');
  });
});
