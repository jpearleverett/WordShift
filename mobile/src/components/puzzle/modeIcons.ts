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
  // Lexicon off/on and the Speed Shift off-state (generateGameIcons chrome):
  // the closed book, the open book, and the hourglass. Before these existed the
  // DifficultyMenu fell back to raw OS emoji for exactly these three glyphs.
  '📕': require('../../../assets/ui/book_closed.png'),
  '📖': require('../../../assets/ui/book_open.png'),
  '⏱': require('../../../assets/ui/hourglass.png'),
  // Named (non-emoji) keys for HUD/crest sprites that have no single mode glyph.
  'house': require('../../../assets/ui/home.png'),
  'moon': require('../../../assets/ui/moon.png'),
  // The phase-mood family (puzzle-header atmosphere badge + the victory
  // phase-change card): one sprite per phase, 0..5.
  'sun': require('../../../assets/ui/sun.png'),
  'thought': require('../../../assets/ui/thought.png'),
  'eye': require('../../../assets/ui/eye.png'),
  'void': require('../../../assets/ui/void.png'),
  'dove': require('../../../assets/ui/dove.png'),
  // Victory-receipt bullets and the Time's Up overlay.
  'hourglass': require('../../../assets/ui/hourglass.png'),
  'clover': require('../../../assets/ui/clover.png'),
  'ribbon': require('../../../assets/ui/ribbon.png'),
};

/** Phase 0..5 -> the phase-mood sprite key (sun, thought, moon, eye, void, dove). */
const PHASE_INDICATOR_KEYS = ['sun', 'thought', 'moon', 'eye', 'void', 'dove'] as const;

const stripVariationSelector = (glyph: string): string => glyph.replace(/\uFE0F/g, '');

/**
 * The phase-mood sprite for a dialogue phase (clamped to 0..5). Replaces the
 * raw ☀️/💭/🌙/👁️/🌑/🕊️ emoji `getPhaseIndicator` still carries as a semantic
 * key, on the puzzle header badge and the victory phase-change card.
 */
export function getPhaseIndicatorSprite(phase: number): ImageSourcePropType {
  const idx = Math.max(0, Math.min(PHASE_INDICATOR_KEYS.length - 1, Math.floor(phase)));
  return MODE_ICON_SPRITES[PHASE_INDICATOR_KEYS[idx]];
}

/** The candy sprite for a mode glyph, or null if unmapped (caller renders text). */
export function getModeIconSprite(glyph: string): ImageSourcePropType | null {
  const key = stripVariationSelector(glyph);
  return key in MODE_ICON_SPRITES ? MODE_ICON_SPRITES[key] : null;
}
