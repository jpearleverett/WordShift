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
    expect(src).toContain('const ENTITY_EYES_LEFT = (135 - 20) * ENTITY_ART_DP;');
    expect(src).toContain('const ENTITY_EYES_TOP = (80 - 7) * ENTITY_ART_DP;');
    expect(flat).toContain('tintColor: look.eyeCore');
  });

  it('keeps the phase ladder: violet with no eyes, crimson with lit eyes, settled mauve', () => {
    const look = src.slice(src.indexOf('const SHADOW_FIGURE_LOOK'), src.indexOf('};', src.indexOf('const SHADOW_FIGURE_LOOK')));
    expect(look).toMatch(/3: \{[^}]*eyes: 0,/);
    expect(look).toMatch(/4: \{[^}]*eyes: 1,[^}]*eyePulse: true/);
    expect(look).toMatch(/5: \{[^}]*eyePulse: false/);
    // Invisible before Phase 3; the arms and hands only from Phase 4, when the
    // house always has all thirteen rooms and so its full height.
    expect(flat).toContain('const visible = phase >= 3;');
    expect(flat).toContain('const visible = phase >= 4;');
    expect(flat).toContain('{phase >= 4 && [-1, 1].map((side) => (');
  });
});

describe('the entity is pixel art at the house density, and holds the house', () => {
  const ENV = path.join(__dirname, '../../assets/environment');
  const read = (f: string) => PNG.sync.read(fs.readFileSync(path.join(ENV, `${f}.png`)));
  it('ships every piece the scene requires', () => {
    for (const f of ['entity_head', 'entity_head_rim', 'entity_arm', 'entity_arm_rim', 'entity_hand', 'entity_eyes']) {
      expect(src).toContain(`require('../../../assets/environment/${f}.png')`);
      expect(fs.existsSync(path.join(ENV, `${f}.png`))).toBe(true);
    }
  });

  it('draws one art pixel as 1.5dp, three image pixels to the art pixel', () => {
    expect(src).toContain('const ENTITY_ART_DP = 1.5;');
    expect([read('entity_head').width, read('entity_head').height]).toEqual([264 * 3, 200 * 3]);
    expect([read('entity_arm').width, read('entity_arm').height]).toEqual([64 * 3, 1200 * 3]);
    expect([read('entity_hand').width, read('entity_hand').height]).toEqual([80 * 3, 64 * 3]);
    // Under the 4096px texture limit some Android GPUs still have.
    expect(read('entity_arm').height).toBeLessThanOrEqual(4096);
  });

  it('puts the hands in front of the stone and the rest behind the house', () => {
    expect(src.indexOf('<ShadowHands')).toBeGreaterThan(src.indexOf('<View style={styles.foundationWrap}>'));
    expect(src.indexOf('<ShadowFigure')).toBeLessThan(src.indexOf('<View style={styles.foundationWrap}>'));
  });
});
