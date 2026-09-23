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

  it('draws the eyes on their own layer at the head art coordinates', () => {
    expect(src).toContain('const SHADOW_EYE_LEFT_X = 574 / 1200;');
    expect(src).toContain('const SHADOW_EYE_RIGHT_X = 634 / 1200;');
    expect(src).toContain('const SHADOW_EYE_Y = 330 / 900;');
  });

  it('keeps the phase ladder: violet with no eyes, crimson with lit eyes, settled mauve', () => {
    const look = src.slice(src.indexOf('const SHADOW_FIGURE_LOOK'), src.indexOf('};', src.indexOf('const SHADOW_FIGURE_LOOK')));
    expect(look).toMatch(/3: \{[^}]*eyes: 0,/);
    expect(look).toMatch(/4: \{[^}]*eyes: 1,[^}]*eyePulse: true/);
    expect(look).toMatch(/5: \{[^}]*eyePulse: false/);
    // Still invisible before Phase 3; the hands only close on the house at 4.
    expect(flat).toContain('const visible = phase >= 3;');
    expect(flat).toContain('const visible = phase >= 4;');
  });
});

describe('the entity holds the house, so it is on screen at every pan position', () => {
  const ENV = path.join(__dirname, '../../assets/environment');
  it('ships a body and a rim image for the head, the arm and the hand', () => {
    for (const piece of ['entity_head', 'entity_arm', 'entity_hand']) {
      for (const file of [piece, `${piece}_rim`]) {
        expect(src).toContain(`require('../../../assets/environment/${file}.png')`);
        expect(fs.existsSync(path.join(ENV, `${file}.png`))).toBe(true);
      }
    }
  });

  it('runs the arms from the shoulders down to the hands, and grips the foundation', () => {
    expect(flat).toContain('style={{ top: armTop, bottom: armBottom,');
    expect(flat).toContain('armBottom={(onPitPress ? PIT_FLOW_HEIGHT : 0) + FOUNDATION_RENDER_HEIGHT + ENTITY_HAND_ABOVE_FOUNDATION - ENTITY_ARM_INTO_HAND}');
    // The hands render AFTER the foundation, so they lie in front of the stone.
    expect(src.indexOf('<ShadowHands')).toBeGreaterThan(src.indexOf('<View style={styles.foundationWrap}>'));
    expect(src.indexOf('<ShadowFigure')).toBeLessThan(src.indexOf('<View style={styles.foundationWrap}>'));
  });

  it('keeps the joins the generator draws', () => {
    const head = PNG.sync.read(fs.readFileSync(path.join(ENV, 'entity_head.png')));
    const arm = PNG.sync.read(fs.readFileSync(path.join(ENV, 'entity_arm.png')));
    expect([head.width, head.height]).toEqual([1200, 900]);
    expect([arm.width, arm.height]).toEqual([200, 1000]);
    // The head's arm column leaves the bottom edge ~556 px out from centre,
    // which is where the arm strip (ENTITY_ARM_OFFSET + half its limb) picks it up.
    const row = head.height - 1;
    let outer = 0;
    for (let x = 600; x < head.width; x++) if (head.data[(row * head.width + x) * 4 + 3] > 128) outer = x;
    const scale = 404 / 1200;
    expect(Math.abs((outer - 600) * scale - (167 + 20))).toBeLessThan(6);
  });
});
