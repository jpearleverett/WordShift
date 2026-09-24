/**
 * Source contracts for the two late-phase sky effects on the home screen.
 *
 * Both used to render and never be seen. The Phase-3 lightning was a band at
 * `top: 0` of the pannable scene box, which is one screen tall with the house
 * and sky drawn UPWARD out of it, so the band sat below the screen at every
 * pan. The shadow figure is near-black art (mean brightness ~6/255) drawn at
 * 18-50% over a near-black sky, so its silhouette and its 66-pixel eyes did
 * not read. Measured on the web build before the fix: the figure's area was
 * under one brightness level darker than the open sky beside it.
 */
import fs from 'fs';
import path from 'path';

// pngjs ships no type declarations; load it the way the other asset tests do.
const { PNG } = require('pngjs') as {
  PNG: { sync: { read(bytes: Buffer): { width: number; height: number; data: Buffer } } };
};

const src = fs.readFileSync(path.join(__dirname, '../components/home/HouseWorld.tsx'), 'utf8');
const flat = src.replace(/\s+/g, ' ');

describe('Phase-3 lightning reaches the visible sky', () => {
  it('is anchored up from the scene bottom across the full sky height', () => {
    const block = src.slice(src.indexOf('const DistantLightning'), src.indexOf('NIGHT STAR GLINT'));
    expect(block).toContain('bottom: 0,');
    expect(block).not.toMatch(/position: 'absolute',\s*top: 0,/);
    expect(block).not.toContain('SCREEN_HEIGHT * 0.38');
    expect(flat).toContain('<DistantLightning height={SKY_BOX_HEIGHT + upperAtmosphereHeight + 240} />');
  });

  it('stays Phase 3 only, and is frequent and bright enough to be seen', () => {
    expect(flat).toContain('{ambientMotionEnabled && currentPhase === 3 && <DistantLightning');
    const num = (name: string) => Number(src.match(new RegExp(`const ${name} = ([\\d.]+);`))![1]);
    expect(num('LIGHTNING_MIN_GAP_MS') + num('LIGHTNING_GAP_RANGE_MS')).toBeLessThanOrEqual(60000);
    expect(num('LIGHTNING_PEAK_OPACITY')).toBeGreaterThanOrEqual(0.12);
  });
});

describe('the shadow figure reads against the night sky', () => {
  it('stands in front of a tinted radial halo image, not stacked Views', () => {
    expect(src).toContain("require('../../../assets/environment/shadow_halo.png')");
    expect(flat).toContain('source={SHADOW_HALO_IMG}');
    expect(flat).toContain('tintColor: look.halo');
    const halo = PNG.sync.read(fs.readFileSync(path.join(__dirname, '../../assets/environment/shadow_halo.png')));
    const alphaAt = (x: number, y: number) => halo.data[(y * halo.width + x) * 4 + 3];
    expect(alphaAt(halo.width / 2, halo.height / 2)).toBeGreaterThan(240);
    expect(alphaAt(0, 0)).toBe(0);
  });

  it('draws the eyes as their own tinted image in the face void', () => {
    expect(src).toContain('const ENTITY_EYES = { left: -54.2, top: -197.9 + ENTITY_SHIFT_Y, width: 97.5, height: 76.5 };');
    expect(flat).toContain('tintColor: look.eyeCore');
  });

  it('keeps the phase ladder: faint with no extra glow, blazing and pulsing, settled', () => {
    const look = src.slice(src.indexOf('const SHADOW_FIGURE_LOOK'), src.indexOf('};', src.indexOf('const SHADOW_FIGURE_LOOK')));
    expect(look).toMatch(/3: \{[^}]*eyes: 0,/);
    expect(look).toMatch(/4: \{[^}]*eyes: 0.9,[^}]*eyePulse: true/);
    expect(look).toMatch(/5: \{[^}]*eyePulse: false/);
    // Invisible before Phase 3; the fingers close over the walls from Phase 4.
    expect(flat).toContain('const visible = phase >= 3;');
    expect(flat).toContain('const visible = phase >= 4;');
  });
});

describe('the entity is one generated picture, split along the house walls', () => {
  it('is smoke over the sky: its edges are translucent, not keyed hard', () => {
    const img = read('entity_back');
    let soft = 0, solid = 0;
    for (let i = 3; i < img.data.length; i += 4) { const a = img.data[i]; if (a > 20 && a < 200) soft++; else if (a >= 250) solid++; }
    expect(soft).toBeGreaterThan(solid * 0.2);
  });

  const ENV = path.join(__dirname, '../../assets/environment');
  const read = (f: string) => PNG.sync.read(fs.readFileSync(path.join(ENV, `${f}.png`)));
  const pieces = ['entity_back', 'entity_front', 'entity_eyes'];

  it('ships every piece the scene requires, and nothing the scene dropped', () => {
    for (const f of pieces) {
      expect(src).toContain(`require('../../../assets/environment/${f}.png')`);
      expect(fs.existsSync(path.join(ENV, `${f}.png`))).toBe(true);
    }
    for (const f of ['entity_head', 'entity_arm', 'entity_hand', 'entity_back_rim']) {
      expect(fs.existsSync(path.join(ENV, `${f}.png`))).toBe(false);
    }
  });

  it('writes two image pixels per dp, matching the placed sizes', () => {
    const size = (name: string) => {
      const m = flat.match(new RegExp(`const ${name} = \\{ left: [-\\d.]+, top: [^,]+, width: ([\\d.]+), height: ([\\d.]+) \\};`))!;
      return [Number(m[1]), Number(m[2])];
    };
    for (const [file, name] of [['entity_back', 'ENTITY_BACK'], ['entity_front', 'ENTITY_FRONT'], ['entity_eyes', 'ENTITY_EYES']]) {
      const [wDp, hDp] = size(name);
      expect(Math.abs(read(file).width - wDp * 2)).toBeLessThanOrEqual(1);
      expect(Math.abs(read(file).height - hDp * 2)).toBeLessThanOrEqual(1);
      // Under the 4096px texture limit some Android GPUs still have.
      expect(read(file).height).toBeLessThanOrEqual(4096);
    }
  });

  it('keeps its generation sources beside it, out of the bundle', () => {
    expect(fs.existsSync(path.join(__dirname, '../../assets/raw/entity_raw.png'))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '../../assets/raw/entity_guide.png'))).toBe(true);
  });

  it('draws the fingers in front of the house and the rest behind it', () => {
    expect(src.indexOf('<ShadowHands')).toBeGreaterThan(src.indexOf('<View style={styles.foundationWrap}>'));
    expect(src.indexOf('<ShadowFigure')).toBeLessThan(src.indexOf('<View style={styles.foundationWrap}>'));
    expect(flat).toContain('source={ENTITY_FRONT_IMG}'.replace('source=', 'body='));
  });

  it('never takes a touch: the claws lie over the top room and its resident', () => {
    const piece = src.slice(src.indexOf('const EntityPiece'), src.indexOf('function useEntityOpacities'));
    expect(piece).toContain('<View pointerEvents="none"');
  });

  it('gives the pan room to show the hood from Phase 3', () => {
    expect(flat).toContain('(currentPhase >= 3 ? ENTITY_PAN_HEADROOM : 0)');
  });
});
