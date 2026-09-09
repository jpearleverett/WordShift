/**
 * Cosmetic visibility pins (the "I bought sparks and confetti and never saw
 * them" report). The plumbing was always right; the pixels were not. These
 * pins name each cause and fail loudly if it comes back:
 *   - the victory confetti rendered UNDER the results scrim,
 *   - the home celebration ignored the equipped palette,
 *   - spark halos were darker than their cores (invisible on dark boards),
 *   - reduced motion / low tier nulled the paid effect entirely,
 *   - the shop never named the surface, and leaked the word "phase".
 */
import fs from 'fs';
import path from 'path';
import { SPARK_THEMES } from '../theme/colors';
import {
  STARBURST_DURATION_MS,
  STARBURST_FADE_DELAY_MS,
  STARBURST_ORIGIN_LIFT_DP,
} from '../constants/timing';
import {
  getShopSectionHint,
  getShopEquippedLine,
  getShopDefaultDescription,
  getShopUseDefaultLabel,
  getShopMotionNoticeText,
  getCosmeticFirstShowingLine,
} from '../services/phaseNarrative';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const APP = fs.readFileSync(path.join(__dirname, '../../App.tsx'), 'utf8');
const CONFETTI = read('components/Confetti.tsx');
const CELEBRATION = read('components/home/CelebrationConfetti.tsx');
const SHOP = read('components/shop/ShopScreen.tsx');

const relativeLuminance = (hex: string): number => {
  const c = hex.replace('#', '');
  const chan = (i: number) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(0) + 0.7152 * chan(2) + 0.0722 * chan(4);
};
const contrast = (a: string, b: string): number => {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

describe('the victory confetti is mounted ABOVE the results scrim', () => {
  test('App mounts the showConfetti burst as a root sibling AFTER the VictoryModal wrapper', () => {
    const modalAt = APP.indexOf('<VictoryModal');
    const confettiAt = APP.indexOf('active={puzzle.showConfetti');
    expect(modalAt).toBeGreaterThan(0);
    expect(confettiAt).toBeGreaterThan(modalAt);
    // Exactly one victory confetti mount: the old in-screen one (under the
    // scrim) is gone.
    expect(APP.match(/active=\{puzzle\.showConfetti/g)?.length).toBe(1);
  });

  test('the burst is pointer-transparent and sits below the game-alert host', () => {
    const confettiAt = APP.indexOf('active={puzzle.showConfetti');
    const wrapperAt = APP.lastIndexOf('pointerEvents="none"', confettiAt);
    // The nearest pointerEvents="none" before the mount is its own wrapper
    // (within a few lines), not some unrelated element far above.
    expect(confettiAt - wrapperAt).toBeLessThan(200);
    expect(APP.indexOf('<GameAlertModal')).toBeGreaterThan(confettiAt);
  });

  test('StarBurst stays on the puzzle screen (above the board, under the modals)', () => {
    const starAt = APP.indexOf('<StarBurst active={starBurst.active}');
    expect(starAt).toBeGreaterThan(0);
    expect(starAt).toBeLessThan(APP.indexOf('<VictoryModal'));
  });
});

describe('the home celebration wears the equipped palette', () => {
  test('CelebrationConfetti resolves getEquippedSync("confetti") -> CONFETTI_THEMES before the phase default', () => {
    expect(CELEBRATION).toMatch(/getEquippedSync\('confetti'\)/);
    expect(CELEBRATION).toMatch(/CONFETTI_THEMES\[equippedConfetti\]/);
    expect(CELEBRATION).toMatch(/getPhaseTheme\(phase\)\.confettiColors/);
  });
});

describe('spark palettes are readable', () => {
  test('every SPARK_THEMES halo is LIGHTER than its core', () => {
    for (const [id, palette] of Object.entries(SPARK_THEMES)) {
      expect(palette.halo).toBeDefined();
      expect({ id, lighter: relativeLuminance(palette.halo!) > relativeLuminance(palette.bg) }).toEqual({ id, lighter: true });
    }
  });

  test("spark_ash's core clears the dusk and shadow boards at >= 3:1", () => {
    expect(contrast(SPARK_THEMES.spark_ash.bg, '#4A5580')).toBeGreaterThanOrEqual(3);
    expect(contrast(SPARK_THEMES.spark_ash.bg, '#2E3355')).toBeGreaterThanOrEqual(3);
  });

  test('the burst grew: 16dp core, 28dp halo at 0.45, accent from combo tier 1', () => {
    expect(CONFETTI).toMatch(/starCore:\s*\{\s*width:\s*16,\s*height:\s*16/);
    expect(CONFETTI).toMatch(/const STAR_BOX_DP = 28;/);
    expect(CONFETTI).toMatch(/starHalo:[\s\S]*?opacity:\s*0\.45/);
    expect(CONFETTI).toMatch(/tier >= 1 && i % 2 === 1 \? palette\.accent/);
  });

  test('the burst lives longer and clears the thumb', () => {
    expect(STARBURST_DURATION_MS).toBe(750);
    expect(STARBURST_FADE_DELAY_MS).toBe(450);
    expect(STARBURST_ORIGIN_LIFT_DP).toBe(36);
    expect(CONFETTI).toMatch(/Animated\.delay\(STARBURST_FADE_DELAY_MS\)/);
    expect(APP).toMatch(/feedbackOrigin\.y - STARBURST_ORIGIN_LIFT_DP/);
    expect(APP).toMatch(/setStarBurst\(\{ active: false, x: 0, y: 0, comboTier: 0 \}\), STARBURST_DURATION_MS\)/);
  });
});

describe('a paid effect is never nulled', () => {
  test('StarBurst returns null only when inactive (reduced motion = still frame, low tier = reduced burst)', () => {
    const starBurst = CONFETTI.slice(CONFETTI.indexOf('export const StarBurst'));
    expect(starBurst).not.toMatch(/reducedMotion \|\| simplify\) return null/);
    expect(starBurst).toMatch(/if \(!active\) return null;/);
    expect(starBurst).toMatch(/const REDUCED_STAR_COUNT = 6;|REDUCED_STAR_COUNT/);
    expect(CONFETTI).toMatch(/const REDUCED_STAR_COUNT = 6;/);
    expect(CONFETTI).toMatch(/const STILL_STAR_COUNT = 8;/);
    // The still frame lays stars out by left/top and animates opacity only.
    const still = starBurst.slice(starBurst.indexOf('if (reducedMotion) {', starBurst.indexOf('if (!active) return null;')));
    const stillBlock = still.slice(0, still.indexOf('return (\n    <View style={containerStyle}'));
    expect(stillBlock).not.toMatch(/translateX|translateY|scale:/);
    expect(stillBlock).toMatch(/opacity: stillOpacity/);
  });

  test('Confetti renders the still scatter under reduced motion instead of nothing', () => {
    expect(CONFETTI).toMatch(/reducedMotion\s*\?\s*<StillConfettiScatter/);
    expect(CONFETTI).not.toMatch(/active && !reducedMotion\s*\?/);
    expect(CONFETTI).toMatch(/const STILL_CONFETTI_COUNT = 24;/);
    const scatter = CONFETTI.slice(CONFETTI.indexOf('const StillConfettiScatter'), CONFETTI.indexOf('export const Confetti'));
    expect(scatter).not.toMatch(/translateX|translateY|scale/);
    expect(scatter).toMatch(/Animated\.timing\(opacity/);
  });
});

describe('the shop names the surface', () => {
  const PHASES = [0, 1, 2, 3, 4, 5];
  const CATEGORIES = ['tile_theme', 'confetti', 'spark'] as const;
  const forbidden = (s: string) => {
    expect(s).not.toMatch(/[—–]/);
    expect(s.toLowerCase()).not.toContain('phase');
    expect(s.trim().length).toBeGreaterThan(0);
  };

  test('every new getter is dash-free and never says "phase" across phases 0-5', () => {
    for (const p of PHASES) {
      for (const c of CATEGORIES) {
        forbidden(getShopSectionHint(p, c));
        forbidden(getShopEquippedLine(p, c));
        forbidden(getShopDefaultDescription(p, c));
        const d = getShopUseDefaultLabel(p, c);
        forbidden(d.label);
        forbidden(d.accessibilityLabel);
      }
      for (const reason of ['reduced_motion', 'low_tier']) {
        const n = getShopMotionNoticeText(p, reason);
        forbidden(n.body);
        if (n.button) forbidden(n.button);
      }
      expect(getShopMotionNoticeText(p, 'low_tier').button).toBeUndefined();
      expect(getShopMotionNoticeText(p, 'reduced_motion').button).toBeTruthy();
      forbidden(getCosmeticFirstShowingLine(p, 'Hearth Sparks'));
    }
  });

  test('the bright hints say WHEN each event cosmetic shows', () => {
    expect(getShopSectionHint(0, 'tile_theme')).toBe('On every letter tile, on every board.');
    expect(getShopSectionHint(0, 'confetti')).toBe('Falls across the board each time you win.');
    expect(getShopSectionHint(0, 'spark')).toBe('Bursts from every letter you set down.');
  });

  test('the default row says which category it resets', () => {
    expect(getShopUseDefaultLabel(0, 'confetti')).toEqual({ label: 'Use default', accessibilityLabel: 'Use the default confetti' });
    expect(getShopUseDefaultLabel(0, 'spark').accessibilityLabel).toBe('Use the default move spark');
    expect(getShopUseDefaultLabel(0, 'tile_theme').accessibilityLabel).toBe('Use the default tile theme');
  });

  test('ShopScreen consumes the getters, fires the real burst, and drops the spark-coloured confetti', () => {
    // The retired hardcoded default-row copy (which leaked the system name).
    expect(SHOP).not.toContain("'The usual phase-aware celebration.'");
    expect(SHOP).not.toContain("'The usual phase-aware burst.'");
    expect(SHOP).not.toContain("'The original candy tiles.'");
    // No player-facing string literal in the shop says "phase".
    for (const m of SHOP.matchAll(/(?:label|accessibilityLabel)=\{?["'`]([^"'`]*)["'`]/g)) {
      expect(m[1].toLowerCase()).not.toContain('phase');
    }
    expect(SHOP).not.toContain("getCosmeticEquippedLine");
    for (const g of ['getShopSectionHint', 'getShopEquippedLine', 'getShopDefaultDescription', 'getShopUseDefaultLabel', 'getShopMotionNoticeText']) {
      expect(SHOP).toContain(`${g}(`);
    }
    expect(SHOP).toMatch(/import \{ Confetti, StarBurst, getPhaseSparkPalette \} from '\.\.\/Confetti'/);
    expect(SHOP).toMatch(/paletteOverride=\{sparkDemo\.palette\}/);
    expect(SHOP).toMatch(/measureInWindow/);
    // A spark purchase never bursts confetti in spark colours.
    expect(SHOP).not.toMatch(/spark\.bg, spark\.accent/);
    expect(SHOP).toMatch(/onOpenSettings\?: \(\) => void/);
    expect(SHOP).toMatch(/onFocusRoom\?: \(roomId: string\) => void/);
  });

  test('App wires the shop to Settings and the room focus hand-off', () => {
    expect(APP).toMatch(/onFocusRoom=\{\(roomId\) => \{\s*setHomeFocusRoomId\(roomId\);\s*transitionTo\('home'\);/);
    expect(APP).toMatch(/focusRoomId=\{homeFocusRoomId\}/);
    expect(APP).toMatch(/onFocusRoomConsumed=\{\(\) => setHomeFocusRoomId\(null\)\}/);
  });
});

describe('first-showing receipts ride the right surfaces', () => {
  test('the spark receipt replaces the move message, never on a resonant commit or the finale', () => {
    expect(APP).toMatch(/if \(result\.formedWord && !result\.resonant && !puzzle\.isFinalBoard\) \{[\s\S]*?consumeCosmeticFirstShowing\('spark'\)/);
  });
  test('the confetti receipt is a receipt-priority victory toast gated on the confetti actually falling', () => {
    expect(APP).toMatch(/if \(!wasFinalBoard && !isSilentVictoryBeat\(completedTotal\)\) \{[\s\S]*?consumeCosmeticFirstShowing\('confetti'\)[\s\S]*?enqueueVictoryToast\(getCosmeticFirstShowingLine\(receiptPhase, name\), 'receipt'\)/);
  });
});
