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
  'fox', 'owl', 'pangolin', 'axolotl', 'capybara', 'fennec_fox', 'sloth', 'wombat',
  'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo',
];
interface FramePatch {
  frame: number;
  source: string;
  sourceSha256: string;
  layout: 'single-frame' | 'atlas';
  replaceBelowY: number;
  replaceFromX?: number;
  replaceToX?: number;
  preserveRects?: { x: number; y: number; width: number; height: number }[];
  prompt: string;
  offsetX?: number;
  offsetY?: number;
}
const manifest = JSON.parse(fs.readFileSync(path.join(ASSETS, 'raw/animal_walk_sheets/manifest.json'), 'utf8')) as {
  atlas: { columns: number; rows: number; frameWidth: number; frameHeight: number };
  animals: { type: string; pose: 'normal' | 'robed'; source: string; sourceFormat: 'sheet' | 'prepared-atlas' | 'frame-patches'; sourceSha256: string; sourceFacing: string; idleFacing: string; prompt?: string; promptSummary?: string; provenance?: string; patches?: FramePatch[] }[];
};
const CYCLES = ANIMALS.flatMap(type => (type === 'fox' ? ['robed'] : ['normal', 'robed']).map(pose => ({ type, pose })));

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
  it('covers every outfit and distinguishes original sources from recovered prepared outputs', () => {
    expect(manifest.animals.map(({ type, pose }) => `${type}/${pose}`).sort()).toEqual(CYCLES.map(({ type, pose }) => `${type}/${pose}`).sort());
    expect(manifest.atlas).toEqual({ columns: 4, rows: 2, frameWidth: 256, frameHeight: 256 });
    for (const record of manifest.animals) {
      expect((record.prompt ?? record.promptSummary ?? '').length).toBeGreaterThan(100);
      if (record.sourceFormat === 'prepared-atlas') expect(record.provenance).toContain('recovered');
      else if (record.sourceFormat === 'sheet') expect(record.prompt).toBeDefined();
      expect(record.sourceFacing).toBe('right');
      expect(record.idleFacing).toBe(record.type === 'fennec_fox' ? 'left' : 'right');
      const source = fs.readFileSync(path.join(ASSETS, 'raw/animal_walk_sheets', record.source));
      expect(createHash('sha256').update(source).digest('hex')).toBe(record.sourceSha256);
      if (record.sourceFormat === 'frame-patches') {
        expect(record.patches?.length).toBeGreaterThan(0);
        expect(new Set(record.patches!.map(patch => patch.frame)).size).toBe(record.patches!.length);
        for (const patch of record.patches!) {
          expect(Number.isInteger(patch.frame)).toBe(true);
          expect(patch.frame).toBeGreaterThanOrEqual(0);
          expect(patch.frame).toBeLessThan(8);
          expect(['single-frame', 'atlas']).toContain(patch.layout);
          expect(Number.isInteger(patch.replaceBelowY)).toBe(true);
          expect(patch.replaceBelowY).toBeGreaterThanOrEqual(0);
          expect(patch.replaceBelowY).toBeLessThan(256);
          const replaceFromX = patch.replaceFromX ?? 0;
          const replaceToX = patch.replaceToX ?? 256;
          expect(Number.isInteger(replaceFromX)).toBe(true);
          expect(Number.isInteger(replaceToX)).toBe(true);
          expect(replaceFromX).toBeGreaterThanOrEqual(0);
          expect(replaceFromX).toBeLessThan(replaceToX);
          expect(replaceToX).toBeLessThanOrEqual(256);
          if (patch.preserveRects !== undefined) expect(Array.isArray(patch.preserveRects)).toBe(true);
          for (const rect of patch.preserveRects ?? []) {
            expect([rect.x, rect.y, rect.width, rect.height].every(Number.isInteger)).toBe(true);
            expect(rect.x).toBeGreaterThanOrEqual(0);
            expect(rect.y).toBeGreaterThanOrEqual(0);
            expect(rect.width).toBeGreaterThan(0);
            expect(rect.height).toBeGreaterThan(0);
            expect(rect.x + rect.width).toBeLessThanOrEqual(256);
            expect(rect.y + rect.height).toBeLessThanOrEqual(256);
          }
          expect(patch.prompt.trim().length).toBeGreaterThan(0);
          const generated = fs.readFileSync(path.join(ASSETS, 'raw/animal_walk_sheets', patch.source));
          expect(createHash('sha256').update(generated).digest('hex')).toBe(patch.sourceSha256);
        }
      }
    }
  });

  it.each(CYCLES)('$type/$pose has eight uncropped transparent frames at its outfit scale and floor', ({ type: animal, pose }) => {
    const atlas = PNG.sync.read(fs.readFileSync(path.join(ASSETS, 'characters', animal, pose === 'robed' ? 'robed_walk.png' : 'walk.png')));
    const idle = PNG.sync.read(fs.readFileSync(path.join(ASSETS, 'characters', animal, pose === 'robed' ? 'robed.png' : 'idle.png')));
    const idleBox = visibleBounds(idle);
    const baseline = Math.round((idleBox.bottom + 1) / idle.height * 256) - 1;
    const expectedHeight = idleBox.height / idle.height * 256;
    expect([atlas.width, atlas.height]).toEqual([1024, 512]);
    const hashes = new Set<string>();
    const record = manifest.animals.find(item => item.type === animal && item.pose === pose)!;
    const retainedBase = record.sourceFormat === 'frame-patches'
      ? PNG.sync.read(fs.readFileSync(path.join(ASSETS, 'raw/animal_walk_sheets', record.source)))
      : null;
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
      // A lower-leg art correction must never change the existing face,
      // costume, pose, or any frame that was not explicitly selected.
      if (retainedBase) {
        const patch = record.patches!.find(item => item.frame === frame);
        const replaceBelowY = patch?.replaceBelowY ?? 256;
        const replaceFromX = patch?.replaceFromX ?? 0;
        const replaceToX = patch?.replaceToX ?? 256;
        for (let y = 0; y < 256; y++) {
          const offset = ((startY + y) * atlas.width + startX) * 4;
          const preservedSpans = y < replaceBelowY ? [[0, 256]] : [[0, replaceFromX], [replaceToX, 256]];
          for (const [from, to] of preservedSpans) {
            if (from === to) continue;
            const left = offset + from * 4;
            const right = offset + to * 4;
            expect(atlas.data.subarray(left, right).equals(retainedBase.data.subarray(left, right))).toBe(true);
          }
        }
        for (const rect of patch?.preserveRects ?? []) {
          for (let y = rect.y; y < rect.y + rect.height; y++) {
            const left = ((startY + y) * atlas.width + startX + rect.x) * 4;
            const right = left + rect.width * 4;
            expect(atlas.data.subarray(left, right).equals(retainedBase.data.subarray(left, right))).toBe(true);
          }
        }
      }
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
