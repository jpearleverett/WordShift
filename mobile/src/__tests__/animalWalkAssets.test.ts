import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

interface DecodedPng {
  width: number;
  height: number;
  data: Buffer;
}

const { PNG } = require('pngjs') as {
  PNG: { sync: { read(bytes: Buffer): DecodedPng } };
};
const ASSETS = path.resolve(__dirname, '../../assets');
const ANIMALS = [
  'owl', 'pangolin', 'capybara', 'fennec_fox', 'sloth', 'wombat',
  'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo',
];
const manifest = JSON.parse(fs.readFileSync(path.join(ASSETS, 'raw/animal_walk_sheets/manifest.json'), 'utf8')) as {
  atlas: { columns: number; rows: number; frameWidth: number; frameHeight: number };
  animals: { type: string; source: string; sourceSha256: string; sourceFacing: string; idleFacing: string; prompt: string }[];
};

function visibleBounds(png: DecodedPng, startX = 0, startY = 0, width = png.width, height = png.height) {
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = png.data[((startY + y) * png.width + startX + x) * 4 + 3];
      if (alpha < 128) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return { left, right, top, bottom, height: bottom - top + 1 };
}

describe('authored animal walk assets', () => {
  it('covers the eleven requested animals and retains the source prompts and facing conventions', () => {
    expect(manifest.animals.map((record) => record.type).sort()).toEqual([...ANIMALS].sort());
    expect(manifest.atlas).toEqual({ columns: 4, rows: 2, frameWidth: 256, frameHeight: 256 });
    for (const record of manifest.animals) {
      expect(record.prompt.length).toBeGreaterThan(100);
      expect(record.sourceFacing).toBe('right');
      expect(record.idleFacing).toBe(record.type === 'fennec_fox' ? 'left' : 'right');
      const source = fs.readFileSync(path.join(ASSETS, 'raw/animal_walk_sheets', record.source));
      expect(createHash('sha256').update(source).digest('hex')).toBe(record.sourceSha256);
    }
  });

  it.each(ANIMALS)('%s has eight uncropped, transparent frames at the existing character scale and floor', (animal) => {
    const atlas = PNG.sync.read(fs.readFileSync(path.join(ASSETS, 'characters', animal, 'walk.png')));
    const idle = PNG.sync.read(fs.readFileSync(path.join(ASSETS, 'characters', animal, 'idle.png')));
    const idleBox = visibleBounds(idle);
    const baseline = Math.round((idleBox.bottom + 1) / idle.height * 256) - 1;
    const expectedHeight = idleBox.height / idle.height * 256;
    expect([atlas.width, atlas.height]).toEqual([1024, 512]);
    const hashes = new Set<string>();
    for (let frame = 0; frame < 8; frame++) {
      const startX = frame % 4 * 256;
      const startY = Math.floor(frame / 4) * 256;
      const box = visibleBounds(atlas, startX, startY, 256, 256);
      expect(box.left).toBeGreaterThanOrEqual(3);
      expect(box.top).toBeGreaterThanOrEqual(3);
      expect(box.right).toBeLessThan(253);
      expect(box.bottom).toBeLessThan(253);
      expect(box.bottom).toBe(baseline);
      expect(box.height / expectedHeight).toBeGreaterThan(0.9);
      expect(box.height / expectedHeight).toBeLessThan(1.1);
      const hash = createHash('sha256');
      for (let y = 0; y < 256; y++) {
        const offset = ((startY + y) * atlas.width + startX) * 4;
        hash.update(atlas.data.subarray(offset, offset + 256 * 4));
      }
      hashes.add(hash.digest('hex'));
    }
    expect(hashes.size).toBe(8);
    let visibleMagenta = 0;
    let partialAlpha = 0;
    for (let p = 0; p < atlas.data.length; p += 4) {
      const r = atlas.data[p], g = atlas.data[p + 1], b = atlas.data[p + 2], a = atlas.data[p + 3];
      if (a > 0 && a < 255) partialAlpha++;
      if (a > 0 && r > 180 && b > 180 && g < 100 && Math.min(r, b) - g > 110) visibleMagenta++;
    }
    expect(visibleMagenta).toBe(0);
    expect(partialAlpha).toBe(0);
  });
});
