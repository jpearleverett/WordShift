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

  it('draws the eyes on their own layer at the measured art coordinates', () => {
    expect(src).toContain('const SHADOW_EYE_LEFT_X = 273.7 / 600;');
    expect(src).toContain('const SHADOW_EYE_RIGHT_X = 325.7 / 600;');
    expect(src).toContain('const SHADOW_EYE_Y = 210.8 / 1200;');
  });

  it('keeps the phase ladder: violet with no eyes, crimson with lit eyes, settled mauve', () => {
    const look = src.slice(src.indexOf('const SHADOW_FIGURE_LOOK'), src.indexOf('};', src.indexOf('const SHADOW_FIGURE_LOOK')));
    expect(look).toMatch(/3: \{ figure: [\d.]+, halo: '#[0-9A-F]{6}', haloOpacity: [\d.]+, eyes: 0,/);
    expect(look).toMatch(/4: \{[^}]*eyes: 1,[^}]*eyePulse: true/);
    expect(look).toMatch(/5: \{[^}]*eyePulse: false/);
    // Still invisible before Phase 3.
    expect(flat).toContain('const visible = phase >= 3;');
  });
});
