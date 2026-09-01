/**
 * Cottage frame content clearance.
 *
 * The 9-slice PNG frames render as an absolute-fill background BEHIND their
 * children (NineSliceFrame), so the host's own horizontal padding is the only
 * thing keeping text off the painted wood. The v2 "more texture, more color"
 * pass grew the strips (panel 24 -> 30dp, card 15 -> 18dp) without moving the
 * paddings tuned for the old geometry, which is how text ended up sitting on
 * the frame across Stats / Store / Tile Shop / Settings / the dialogue sheets.
 *
 * SURFACE.panelPadX / SURFACE.cardPadX are the single source of truth for that
 * inset. surfaces.ts deliberately does NOT import pixelSkin.generated.ts (that
 * module evaluates ~200 asset requires at module scope and surfaces.ts is
 * imported almost everywhere), so this test is where the literals are pinned
 * against the generated constants — regenerate the skin with different ring
 * budgets and this fails instead of the text silently creeping onto the wood.
 */
import fs from 'fs';
import path from 'path';
import { SURFACE } from '../theme/surfaces';
import { PANEL_EDGE_DP, CARD_EDGE_DP } from '../theme/pixelSkin.generated';

// Ring budgets from scripts/tools/generateUiPanels.mjs (1 art-px = 3dp):
//   panel = outline+rim+3 wood+seam+ACCENT+transition (8) + 2 vignette = 10
//   card  = outline+rim+wood+seam+transition        (5) + 1 vignette =  6
// The vignette rings are parchment tones every ink holds >= 4.5:1 on, so they
// are text-SAFE; the band content must clear is everything inside them.
const PANEL_VIGNETTE_RINGS = 2;
const CARD_VIGNETTE_RINGS = 1;
const ART_PX_DP = 3;

const PANEL_BAND_DP = PANEL_EDGE_DP - PANEL_VIGNETTE_RINGS * ART_PX_DP; // 24
const CARD_BAND_DP = CARD_EDGE_DP - CARD_VIGNETTE_RINGS * ART_PX_DP; // 15

describe('cottage frame content clearance', () => {
  it('derives the bands from the generated strip thicknesses', () => {
    expect(PANEL_EDGE_DP).toBe(30);
    expect(CARD_EDGE_DP).toBe(18);
    expect(PANEL_BAND_DP).toBe(24);
    expect(CARD_BAND_DP).toBe(15);
  });

  it('panel content padding clears the wood band with breathing room', () => {
    // Strictly greater: content at exactly 24 starts ON the darkest vignette
    // ring and reads as touching the frame.
    expect(SURFACE.panelPadX).toBeGreaterThan(PANEL_BAND_DP);
    // ...but never wider than the strip itself, or panels waste content width.
    expect(SURFACE.panelPadX).toBeLessThanOrEqual(PANEL_EDGE_DP);
  });

  it('card content padding clears the card band and its vignette ring', () => {
    expect(SURFACE.cardPadX).toBeGreaterThan(CARD_BAND_DP);
    expect(SURFACE.cardPadX).toBeGreaterThanOrEqual(CARD_EDGE_DP);
    expect(SURFACE.cardPadX).toBeLessThan(SURFACE.panelPadX);
  });
});

/**
 * Source-scan guard: one representative style per surface family, so a future
 * edit cannot silently re-introduce a magic number on the frames the player
 * actually complained about. Deliberately short — this pins the CONTRACT (the
 * style reads from the token), never a specific dp value.
 */
const SRC_ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');

const TOKEN_ADOPTERS: Array<{ file: string; style: string; token: 'panelPadX' | 'cardPadX' }> = [
  // The three surfaces named in the report.
  { file: 'components/StatsScreen.tsx', style: 'difficultyRow', token: 'cardPadX' },
  { file: 'components/monetization/StoreModal.tsx', style: 'row', token: 'cardPadX' },
  { file: 'components/shop/ShopScreen.tsx', style: 'card', token: 'cardPadX' },
  // Panel-framed hosts.
  { file: 'components/SettingsScreen.tsx', style: 'section', token: 'panelPadX' },
  { file: 'components/puzzle/VictoryModal.tsx', style: 'victoryModal', token: 'panelPadX' },
  { file: 'components/ui/GameAlertModal.tsx', style: 'card', token: 'panelPadX' },
  // Card-framed rows.
  { file: 'components/ui/HubRow.tsx', style: 'hubRow', token: 'cardPadX' },
  { file: 'components/AchievementToast.tsx', style: 'inner', token: 'cardPadX' },
];

describe('frame-hosted styles read their inset from the shared token', () => {
  it.each(TOKEN_ADOPTERS)('$file $style uses SURFACE.$token', ({ file, style, token }) => {
    const src = read(file);
    const block = new RegExp(`\\n  ${style}: \\{[\\s\\S]*?\\n  \\},`).exec(src);
    expect(block).not.toBeNull();
    expect(block![0]).toContain(`SURFACE.${token}`);
  });
});

/**
 * The two asymmetry bugs this pass fixed: the HomeScreen animal-dialogue sheet
 * and the FoxGuide onboarding card each had DIFFERENT left and right padding
 * (4dp and 2dp apart), so both read as visibly tighter on one side. Every new
 * player meets the FoxGuide one during the cold open.
 */
describe('dialogue sheets are horizontally symmetric', () => {
  it.each([
    ['components/home/HomeScreen.tsx', 'dialogueModal'],
    ['components/FoxGuide.tsx', 'dialogueCard'],
  ])('%s %s pads both edges identically', (file, style) => {
    const src = read(file);
    const block = new RegExp(`\\n  ${style}: \\{[\\s\\S]*?\\n  \\},`).exec(src);
    expect(block).not.toBeNull();
    const left = /paddingLeft: ([^,\n]+)/.exec(block![0]);
    const right = /paddingRight: ([^,\n]+)/.exec(block![0]);
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
    expect(left![1].trim()).toBe(right![1].trim());
    expect(left![1]).toContain('SURFACE.panelPadX');
  });
});

/**
 * DifficultyMenu is the one panel that must NOT take the blanket token: at 28
 * its rows would be only ~206dp wide inside a 290dp panel. Its text was always
 * clear; the defect was that the selected-row HIGHLIGHT box started 4dp inside
 * the wood. Pin the redistribution that lands the row boxes on the band edge.
 */
describe('DifficultyMenu row boxes land on the panel band edge', () => {
  const src = read('components/puzzle/DifficultyMenu.tsx');
  const padOf = (style: string) => {
    const block = new RegExp(`\\n  ${style}: \\{[\\s\\S]*?\\n  \\},`).exec(src);
    expect(block).not.toBeNull();
    const m = /paddingHorizontal: (\d+)/.exec(block![0]);
    expect(m).not.toBeNull();
    return Number(m![1]);
  };

  it('panel + scroll padding equals the 24dp wood+transition band', () => {
    expect(padOf('difficultyMenu') + padOf('scrollContent')).toBe(PANEL_BAND_DP);
  });

  it('does not take the blanket panel token (rows would be too narrow)', () => {
    expect(padOf('difficultyMenu')).toBeLessThan(SURFACE.panelPadX);
  });
});
