import { ImageSourcePropType } from 'react-native';

// Generated candy sprites (assets/ui, generateUiIcons.mjs) that replace the bare
// mode emoji wherever a puzzle variant / trial modifier is shown as an icon: the
// DifficultyMenu variant + combo selector, its challenge/blind/weave toggles,
// and the puzzle-screen statsRow badges. Keyed by the FE0F-stripped glyph so
// both the plain and variation-selector emoji forms resolve to the same sprite.
export const MODE_ICON_SPRITES: { [glyph: string]: ImageSourcePropType } = {
  '📝': require('../../../assets/ui/variant_standard.png'),
  '🔄': require('../../../assets/ui/variant_reverse.png'),
  '⚡': require('../../../assets/ui/variant_speed.png'),
  '⏫': require('../../../assets/ui/variant_double.png'),
  '⚔': require('../../../assets/ui/variant_swords.png'),
  '🌪': require('../../../assets/ui/variant_tornado.png'),
  '🌒': require('../../../assets/ui/variant_crescent.png'),
  '🕳': require('../../../assets/ui/variant_hole.png'),
  '🔒': require('../../../assets/ui/lock.png'),
  '🔓': require('../../../assets/ui/lock_open.png'),
  '🌑': require('../../../assets/ui/blind.png'),
  '👁': require('../../../assets/ui/eye.png'),
  '🧵': require('../../../assets/ui/weave.png'),
};

const stripVariationSelector = (glyph: string): string => glyph.replace(/\uFE0F/g, '');

/** The candy sprite for a mode glyph, or null if unmapped (caller renders text). */
export function getModeIconSprite(glyph: string): ImageSourcePropType | null {
  const key = stripVariationSelector(glyph);
  return key in MODE_ICON_SPRITES ? MODE_ICON_SPRITES[key] : null;
}
