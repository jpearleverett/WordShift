import { SparkPalette } from './colors';

export type SparkMaterial = 'star' | 'hearth' | 'pollen' | 'salt' | 'thread' | 'ash';

export interface SparkParticle {
  material: SparkMaterial;
  width: number;
  height: number;
  rotation: number;
  core: string;
  rim: string;
  highlight: string;
  halo: string;
}

const MATERIALS: Record<string, SparkMaterial> = {
  spark_hearth: 'hearth',
  spark_pollen: 'pollen',
  spark_saltgrain: 'salt',
  spark_thread: 'thread',
  spark_ash: 'ash',
};

// The native glyphs retain the shop illustrations' outlined, faceted chips.
// Their proportions distinguish materials without requiring decoded bitmaps
// or additional animation values per particle.
const DIMENSIONS: Record<SparkMaterial, [number, number]> = {
  star: [14, 17],
  hearth: [12, 19],
  pollen: [12, 16],
  salt: [15, 17],
  thread: [8, 21],
  ash: [11, 15],
};

function shade(hex: string, factor: number): string {
  const channels = [1, 3, 5].map(start => Math.min(255, Math.round(parseInt(hex.slice(start, start + 2), 16) * factor)));
  return `#${channels.map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * One deterministic chip shared by the shop strip and every gameplay burst.
 * Accent colors do not depend on combo tier: Cut Thread always has both
 * colors; Ash and Ember is mostly ash, with a red ember in every short burst.
 */
export function getSparkParticle(
  sparkId: string | null | undefined,
  palette: SparkPalette,
  index: number,
): SparkParticle {
  const material = sparkId ? MATERIALS[sparkId] ?? 'star' : 'star';
  const accent = material === 'ash' ? index % 3 === 1 : index % 2 === 1;
  const core = accent ? palette.accent : palette.bg;
  const [width, height] = material === 'ash' && accent ? DIMENSIONS.hearth : DIMENSIONS[material];
  const variation = index % 3 === 2 ? 0.86 : 1;
  return {
    material,
    width: width * variation,
    height: height * variation,
    rotation: 25 + (index % 4) * 19,
    core,
    rim: shade(core, 0.6),
    highlight: shade(core, 1.3),
    halo: palette.halo ?? core,
  };
}
