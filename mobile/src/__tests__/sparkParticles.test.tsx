import React from 'react';
import { SPARK_THEMES } from '../theme/colors';
import { getSparkParticle } from '../theme/sparkParticles';
import { SparkGlyph } from '../components/effects/SparkGlyph';

jest.mock('react-native', () => ({ View: 'View' }));

function views(node: React.ReactNode): React.ReactElement<any>[] {
  if (Array.isArray(node)) return node.flatMap(views);
  if (!React.isValidElement(node)) return [];
  const element = node as React.ReactElement<any>;
  return [ ...(element.type === 'View' as any ? [element] : []), ...views(element.props.children) ];
}

describe('the purchased spark identity survives an ordinary move', () => {
  test.each(Object.entries(SPARK_THEMES))('%s includes both colors at every supported burst budget', (id, palette) => {
    // Ordinary play, low tier, reduced motion, and every combo escalation.
    for (const count of [6, 8, 10, 12, 14]) {
      const colors = new Set(Array.from({ length: count }, (_, i) => getSparkParticle(id, palette, i).core));
      expect(colors).toEqual(new Set([palette.bg, palette.accent]));
    }
  });

  test('salt is a broad crystal and thread is a narrow splinter', () => {
    const salt = getSparkParticle('spark_saltgrain', SPARK_THEMES.spark_saltgrain, 0);
    const thread = getSparkParticle('spark_thread', SPARK_THEMES.spark_thread, 0);
    expect(salt.width / salt.height).toBeGreaterThan(0.85);
    expect(thread.width / thread.height).toBeLessThan(0.5);
  });

  test('Ash and Ember is mostly grey, with recognizably longer red embers', () => {
    const palette = SPARK_THEMES.spark_ash;
    const chips = Array.from({ length: 6 }, (_, i) => getSparkParticle('spark_ash', palette, i));
    const embers = chips.filter(chip => chip.core === palette.accent);
    const ash = chips.filter(chip => chip.core === palette.bg);
    expect(ash).toHaveLength(4);
    expect(embers).toHaveLength(2);
    expect(Math.min(...embers.map(chip => chip.height))).toBeGreaterThan(Math.max(...ash.map(chip => chip.height)));
  });

  test('all material silhouettes remain inside their fixed 28dp animation box at any rotation', () => {
    for (const [id, palette] of Object.entries(SPARK_THEMES)) {
      for (let i = 0; i < 14; i++) {
        const chip = getSparkParticle(id, palette, i);
        expect(Math.hypot(chip.width, chip.height)).toBeLessThanOrEqual(28);
        expect(chip).toEqual(getSparkParticle(id, palette, i));
        expect(chip.core).not.toBe(chip.rim);
      }
    }
  });

  test('an unknown or default item has a safe phase-palette fallback', () => {
    const palette = { bg: '#FFD700', accent: '#FFFFFF' };
    expect(getSparkParticle('old_or_missing_item', palette, 1)).toEqual(getSparkParticle(null, palette, 1));
    expect(getSparkParticle(null, palette, 1).core).toBe('#FFFFFF');
  });
});

describe('the same native glyph serves the shop and gameplay', () => {
  const props = { sparkId: 'spark_thread', palette: SPARK_THEMES.spark_thread, index: 1 };

  test('the smaller shop chip preserves the purchased colors and proportions', () => {
    const game = views(SparkGlyph({ ...props, size: 28, halo: false }));
    const shop = views(SparkGlyph({ ...props, size: 18, halo: false }));
    expect(game).toHaveLength(4);
    expect(shop).toHaveLength(4);
    expect(shop.map(view => view.props.style.backgroundColor)).toEqual(game.map(view => view.props.style.backgroundColor));
    expect(shop[1].props.style.width / game[1].props.style.width).toBeCloseTo(18 / 28);
    expect(shop[1].props.style.height / game[1].props.style.height).toBeCloseTo(18 / 28);
  });

  test('low-tier glyph drops halo and facet layers, while retaining accent color and outline', () => {
    const nodes = views(SparkGlyph({ ...props, simplified: true }));
    expect(nodes).toHaveLength(2);
    expect(nodes[1].props.style.backgroundColor).toBe(SPARK_THEMES.spark_thread.accent);
    expect(nodes[1].props.style.borderWidth).toBeGreaterThan(0);
    expect(nodes.every(view => view.props.style.opacity === undefined)).toBe(true);
  });

  test('the full chip has an opaque bright facet and a restrained halo, without an animated glyph', () => {
    const nodes = views(SparkGlyph(props));
    expect(nodes).toHaveLength(5);
    expect(nodes[1].props.style.opacity).toBe(0.2);
    expect(nodes[3].props.style.backgroundColor).toBe(SPARK_THEMES.spark_thread.accent);
    expect(nodes[4].props.style.backgroundColor).not.toBe(nodes[2].props.style.backgroundColor);
    expect(nodes[0].props.accessible).toBe(false);
  });
});
