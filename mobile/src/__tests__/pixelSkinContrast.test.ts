import { PIXEL_SKINS, getPixelSkin } from '../theme/pixelSkin.generated';
import { getPhaseTheme } from '../theme/colors';
import { getSurfaceTheme } from '../theme/surfaces';

/**
 * F99 regression guard: the cottage plaque label ink (`ink.plaque`) must clear
 * WCAG AA (>= 4.5:1) against the sampled plaque WOOD FACE on every skin.
 *
 * The dark/serene plaque wood darkens sharply, and the cream label derived from
 * the bright skin used to land as a mid salmon at only ~3:1 on that ash wood
 * (dark 3.17:1, serene 3.03:1). The generator now overrides those two inks; this
 * test pins every skin so a future regeneration cannot silently regress them.
 *
 * SAMPLED_PLAQUE_FACE is `SKIN_XF[skin]` applied to the bright plaque face
 * (#7E4A20) in scripts/tools/generateUiPanels.mjs — the dominant background
 * under the centered plaque label (drawPlaqueMaster's `pal.plaque.face`).
 * Re-sample these if the plaque wood derivation changes.
 */
const SAMPLED_PLAQUE_FACE: Record<keyof typeof PIXEL_SKINS, string> = {
  bright: '#7E4A20',
  dusk: '#6C3B1F',
  storm: '#56201C',
  dark: '#321B15',
  serene: '#341B1B',
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(hexToRgb(fg));
  const l2 = relativeLuminance(hexToRgb(bg));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

describe('cottage pixel skin plaque ink contrast (F99)', () => {
  const skinNames = Object.keys(PIXEL_SKINS) as (keyof typeof PIXEL_SKINS)[];

  it.each(skinNames)('%s plaque ink clears WCAG AA on its sampled wood', (name) => {
    const ink = PIXEL_SKINS[name].ink.plaque;
    const face = SAMPLED_PLAQUE_FACE[name];
    const ratio = contrastRatio(ink, face);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('sanity-checks the contrast helper against a known pair', () => {
    // Black on white is the canonical WCAG maximum (21:1).
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });
});

/**
 * F102 regression guard: the victory title on the BRIGHT modal backgrounds
 * (phases 0-2, where the title is dark ink on a light card) must clear WCAG AA.
 * These sat at ~3.4:1 before the deepening (passable only because the title is
 * display size). Phases 3-5 are light ink on a dark modal and are already
 * covered by the modal-text guards in victoryModal.test.ts.
 */
describe('bright-phase victory title contrast (F102)', () => {
  it.each([0, 1, 2])('phase %i victory title clears WCAG AA on its modal bg', (phase) => {
    const t = getPhaseTheme(phase);
    expect(contrastRatio(t.victoryTitleColor, t.modalBgColor)).toBeGreaterThanOrEqual(4.5);
  });
});

/**
 * Named surface inks must clear WCAG AA on the PARCHMENT they are actually
 * painted on.
 *
 * `getSurfaceTheme`'s inks were audited against the flat `cardBg`/`sectionBg`
 * tokens, but every skinned surface in the app renders through `PanelCard`,
 * whose fill is the generated skin's `fill` (kind 'panel') or `fillCard`
 * (kind 'card', the default) — NOT those tokens. Nothing pinned that pair, and
 * the storm skin's `amberText` sat at 4.30:1 on `fillCard`. It went unnoticed
 * while amber ink appeared there only on the store's "Owned"/"Active" states;
 * the moment a row's reward value made it an always-rendered line it became
 * seven sub-threshold strings on one screen.
 *
 * Loop the inks that carry meaning (never decoration) so the comment above
 * getSurfaceTheme's palette is enforced rather than aspirational.
 */
describe('surface ink contrast on the cottage parchments', () => {
  const PHASES = [0, 1, 2, 3, 4, 5];
  const INKS = ['title', 'body', 'muted', 'amberText', 'dangerText'] as const;

  it.each(PHASES.flatMap(phase => INKS.map(ink => [phase, ink] as const)))(
    'phase %i %s clears WCAG AA on both skin parchments',
    (phase, ink) => {
      const t = getSurfaceTheme(phase);
      const skin = getPixelSkin(phase);
      expect(contrastRatio(t[ink], skin.fill)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t[ink], skin.fillCard)).toBeGreaterThanOrEqual(4.5);
    },
  );
});
