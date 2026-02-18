import { getVariantTutorialDialogue } from '../services/animalDialogue';
import { VARIANT_CONFIGS, PuzzleVariant } from '../services/puzzleVariety';
import { AnimalType } from '../types/homeWorld';

describe('variant tutorial dialogue coverage', () => {
  const variants = (Object.keys(VARIANT_CONFIGS) as PuzzleVariant[]).filter(v => v !== 'standard');
  const animals: AnimalType[] = [
    'fox',
    'pangolin',
    'owl',
    'axolotl',
    'capybara',
    'fennec_fox',
    'sloth',
    'wombat',
    'rabbit',
    'red_panda',
  ];

  it('returns tutorial dialogue for every variant in light and dark phases', () => {
    for (const variant of variants) {
      const light = getVariantTutorialDialogue('fox', variant, 0);
      const dark = getVariantTutorialDialogue('fox', variant, 4);
      expect(light).toBeTruthy();
      expect(dark).toBeTruthy();
      expect(light!.trim().length).toBeGreaterThan(20);
      expect(dark!.trim().length).toBeGreaterThan(20);
    }
  });

  it('supports all animals for core tutorial variants', () => {
    const coreVariants: PuzzleVariant[] = ['reverse', 'speed'];
    for (const animal of animals) {
      for (const variant of coreVariants) {
        const line = getVariantTutorialDialogue(animal, variant, 2);
        expect(line).toBeTruthy();
      }
    }
  });

  it('explains double shift mechanics clearly', () => {
    const line = getVariantTutorialDialogue('owl', 'double_shift', 0);
    expect(line).toBeTruthy();
    expect(line!.trim().length).toBeGreaterThan(20);
  });
});
