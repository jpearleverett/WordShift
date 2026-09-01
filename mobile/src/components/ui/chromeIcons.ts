import { ImageSourcePropType } from 'react-native';

// The small cottage MARKS and scene SPOTS drawn by generateGameIcons.mjs
// (scripts/tools/gameIcons/chromeB.mjs, spotsB.mjs, chromeSpots.mjs). These
// replace the last typographic stand-ins the chrome still carried: '✓' ticks,
// '>' chevrons, '!' pips, the '▷' play mark, '✦' bullets, '✕' closes, and the
// '◈' settle glyph on the loading, crash and alert cards.
//
// Named keys (no emoji): a caller asks for the MEANING it needs. Static
// `require()` literals only (Metro bundles what it can SEE; the documented
// dynamic-require failure mode). `gameArt.test.ts` cross-checks every file.
export const CHROME_ICONS = {
  /** A carved green tick on a brass seat: "done / claimed / equipped". */
  check: require('../../../assets/ui/check.png') as ImageSourcePropType,
  /** A round green candy button carrying a tick: the completed-row badge. */
  checkBadge: require('../../../assets/ui/check_badge.png') as ImageSourcePropType,
  /** A carved-wood chevron pointing RIGHT; rotate at render time for left/down. */
  chevron: require('../../../assets/ui/chevron.png') as ImageSourcePropType,
  /** A candy-red pip with a raised exclamation: "something new here". */
  alertPip: require('../../../assets/ui/alert_pip.png') as ImageSourcePropType,
  /** A right-pointing amber candy triangle: the rewarded-clip play mark. */
  play: require('../../../assets/ui/play.png') as ImageSourcePropType,
  /** A small brass four-point star: the '✦' bullet. */
  starBullet: require('../../../assets/ui/star_bullet.png') as ImageSourcePropType,
  /** A carved X with a brass face: the close mark. */
  close: require('../../../assets/ui/close.png') as ImageSourcePropType,
} as const;

/** Scene spots (256px) for the cards that had no image at all. */
export const SPOT_ART = {
  /** The finished cottage with every window lit (house-completion crest, phases 0-3). */
  houseWhole: require('../../../assets/ui/spots/house_whole.png') as ImageSourcePropType,
  /** A copper kettle over a small flame: the board-serve loading card. */
  gathering: require('../../../assets/ui/spots/gathering.png') as ImageSourcePropType,
  /** A stone alcove with a lit clay lamp: the Phase-5 Tending Shrine. */
  shrine: require('../../../assets/ui/spots/shrine.png') as ImageSourcePropType,
  /** An overturned inkpot beside a cracked tile: the crash card. */
  spilledInk: require('../../../assets/ui/spots/spilled_ink.png') as ImageSourcePropType,
  /** A folded parchment note under a brass tack: the in-game alert's beat card. */
  notice: require('../../../assets/ui/spots/notice.png') as ImageSourcePropType,
  /** An open blank ledger with a quill: the Word Ledger empty state. */
  emptyLedger: require('../../../assets/ui/spots/empty_ledger.png') as ImageSourcePropType,
  /** An empty picture frame on a nail: the Whisper Gallery empty state. */
  emptyGallery: require('../../../assets/ui/spots/empty_gallery.png') as ImageSourcePropType,
} as const;
