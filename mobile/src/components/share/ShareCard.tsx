import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { FONT_SIZE } from '../../theme/typeScale';
import { getPhaseTheme } from '../../theme/colors';
import { getSurfaceTheme } from '../../theme/surfaces';
import { PIXEL_FONT_BOLD, BODY_FONT_BOLD, BODY_FONT_ITALIC } from '../../theme/fonts';
import { PanelCard } from '../ui/PanelCard';
import { getShareCardTagline } from '../../services/phaseNarrative';
import { pickShareIntrigueTagline } from '../../services/shareResults';
import type { ShareableResult, MoveOutcome } from '../../services/shareResults';
import { WEB_LANDING_URL } from '../../constants/links';

/**
 * The shareable result card — a polished, spoiler-free, phase-aware artifact the
 * player shares (or screenshots). Rendered at a fixed size so it captures cleanly
 * to a PNG via the share-image provider; also looks right shown in the preview
 * modal. Forwards a ref so the capturer can target it.
 *
 * Cottage-skinned (v2): the card is drawn as a piece of the game's actual
 * furniture — the 9-slice wood-and-parchment panel every in-game modal uses,
 * the real wooden wordmark art, Ember's sprite, and the sprite stars — so a
 * share reads unmistakably as "that game" in a feed. The panel material is
 * phase-aware BY CONSTRUCTION (bright cottage wood → dusk → storm → charred
 * ash with cream ink → mauve), so the descent ships in every late share.
 *
 * Spoiler rule: daily challenges are the same for everyone today, so the card
 * shows the Wordle-style colored grid (a spoiler-free performance signal) but
 * NOT the actual words / incantation name on daily results. Ember is ALWAYS the
 * cute idle sprite, never robed.png — the decay layers carry the wrongness; the
 * robe would spoil the reveal to recipients.
 *
 * Phase decay: from Phase 2 the card quietly corrupts (a scrim veil, faint
 * scanlines, corner soot, a glitch tear, and a chromatic split of the wordmark)
 * so a late-game share reads as "something is off with this cute word game" (the
 * word-of-mouth lure) WITHOUT ever spoiling the turn. It PEAKS at the reveal
 * (Phase 4) and SETTLES at Phase 5 (terrible peace, not chaos). Over the aging
 * furniture the grime reads as soot on wood. The candy grid, stars, and all
 * text render on top and stay fully legible at every phase.
 */

const CARD_WIDTH = 320;

const WORDMARK_IMG = require('../../../assets/ui/wordmark.png'); // 1000×250
const FOX_IMG = require('../../../assets/characters/fox/idle.png');
const STAR_FILLED_IMG = require('../../../assets/ui/star_filled.png');
const STAR_EMPTY_IMG = require('../../../assets/ui/star_empty.png');

/**
 * The real, universally-openable install URL baked INTO the card art. An image
 * share carries no accompanying text on Android (both shareFile paths drop the
 * message), so the visible URL on the footer is the recipient's only way home
 * from a shared PNG. Scheme + trailing slash stripped so it reads as a tidy
 * footer line. Spoiler-safe (a URL, never words); shown identically on daily
 * and non-daily cards. Exported so the render tests can pin it.
 */
export const INSTALL_URL_DISPLAY = WEB_LANDING_URL.replace(/^https?:\/\//, '').replace(/\/+$/, '');

interface ShareCardProps {
  result: ShareableResult;
}

export const SQUARE_COLORS: Record<MoveOutcome, string> = {
  clean: '#52C77E',
  hint: '#F2C14E',
  mistake: '#E8833A',
  both: '#E0524D',
};

function squareKind(i: number, hintsUsed: number, invalidAttempts: number): MoveOutcome {
  if (i < invalidAttempts && i < hintsUsed) return 'both';
  if (i < invalidAttempts) return 'mistake';
  if (i < hintsUsed) return 'hint';
  return 'clean';
}

/**
 * Ordered square kinds for the performance grid. Prefers the honest per-move
 * record (`moveOutcomes` — one square per actual move, in play order); falls
 * back to the legacy positional distribution when absent. Mirrors
 * generateShareText's grid so the shared image and shared text always agree
 * for the same run.
 */
export function gridSquareKinds(result: ShareableResult): MoveOutcome[] {
  if (result.moveOutcomes && result.moveOutcomes.length > 0) {
    return result.moveOutcomes;
  }
  const moveCount = Math.max(0, result.moveCount);
  return Array.from({ length: moveCount }, (_, i) =>
    squareKind(i, result.hintsUsed, result.invalidAttempts)
  );
}

const DIFFICULTY_DOT: Record<string, string> = {
  EASY: '#52C77E',
  MEDIUM: '#F2C14E',
  MEDIUM_PLUS: '#E8833A',
  HARD: '#E0524D',
};

/** Chromatic-aberration ghost hues (an effect pair, like SQUARE_COLORS). Their
 * visibility is phase-gated by the `aberration` opacity, so Phase 0 shows none. */
const GLITCH_GHOST_WARM = SQUARE_COLORS.both; // '#E0524D'
const GLITCH_GHOST_COOL = '#4DAFFF';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Humanize the daily's stored local-day key ("2026-07-21" → "July 21") for the
 * handcrafted card — the raw ISO string read as engineering text on parchment.
 * Manual month table (not toLocaleDateString: Hermes' ICU support is spotty on
 * Android) and LOCAL component parsing per the repo's day-bucketing rule; any
 * unexpected format falls back to the raw string.
 */
export function formatDailyDate(dailyDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dailyDate);
  if (!m) return dailyDate;
  const month = MONTH_NAMES[Number(m[2]) - 1];
  if (!month) return dailyDate;
  return `${month} ${Number(m[3])}`;
}
/** Scanline positions, % from the card top. */
const SCANLINE_TOPS = [10, 22, 34, 46, 58, 70, 82];

export interface ShareDecay {
  scrim: number; // uniform ground veil opacity (underlay, behind content)
  scanline: number; // scanline stripe opacity (underlay)
  soot: number; // corner soot-blob opacity (overlay, on top)
  tear: number; // single glitch "tear" line opacity (overlay)
  aberration: number; // wordmark chromatic-ghost opacity
  aberrationShift: number; // px offset of the two wordmark ghosts
}

/**
 * Progressive "something is off" decay baked into the shared card. Purely static
 * (no animation, so the PNG capture is deterministic and reduced-motion is moot).
 * Phase 0 is pristine (all zeros: byte-identical to the pre-decay card, so early
 * shares and store screenshots stay clean). Peak wrongness is Phase 4; Phase 5
 * SETTLES (the ground and ghost persist but the scanline jitter calms, matching
 * the "terrible peace" of the endgame). Spoiler-safe by construction: abstract
 * grime + mis-registration, never imagery, never text.
 */
export function getShareDecay(phase: number): ShareDecay {
  switch (Math.max(0, Math.min(5, Math.round(phase)))) {
    case 0:  return { scrim: 0,    scanline: 0,    soot: 0,    tear: 0,    aberration: 0,    aberrationShift: 0    };
    case 1:  return { scrim: 0.06, scanline: 0.03, soot: 0,    tear: 0,    aberration: 0,    aberrationShift: 0    };
    case 2:  return { scrim: 0.12, scanline: 0.05, soot: 0.10, tear: 0.10, aberration: 0.10, aberrationShift: 0.5  };
    // Phase 3's scrim is deliberately LIGHTER than the pre-cottage card's 0.20:
    // storm is the only skin pairing light parchment with DARK ink, and the
    // audited ink contrast assumes the raw parchment — a heavy veil under dark
    // text muddied the chain/tagline. The other decay channels carry Phase 3's
    // wrongness; Phases 4-5 keep heavier scrims safely (cream ink on dark fill).
    case 3:  return { scrim: 0.12, scanline: 0.08, soot: 0.20, tear: 0.18, aberration: 0.22, aberrationShift: 1.0  };
    case 4:  return { scrim: 0.30, scanline: 0.12, soot: 0.32, tear: 0.26, aberration: 0.42, aberrationShift: 1.5  };
    case 5:
    default: return { scrim: 0.26, scanline: 0.05, soot: 0.28, tear: 0.12, aberration: 0.30, aberrationShift: 1.25 };
  }
}

export const ShareCard = forwardRef<View, ShareCardProps>(({ result }, ref) => {
  const phase = result.phase ?? 0;
  const theme = getPhaseTheme(phase);
  const t = getSurfaceTheme(phase);
  const isDark = phase >= 3;

  const decay = getShareDecay(phase);
  const spoilerSafe = !result.isDaily;
  const diffLabel = result.difficulty === 'MEDIUM_PLUS' ? 'MED+' : result.difficulty;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[styles.card, { backgroundColor: theme.bgPrimary }]}
    >
      <PanelCard phase={phase} kind="panel" style={styles.panel}>
        {/* Decay UNDERLAY — above the parchment, behind content, so the grime
            grounds the furniture while grid/stars/text stay crisp */}
        {(decay.scrim > 0 || decay.scanline > 0) && (
          <View testID="share-decay-underlay" pointerEvents="none" style={StyleSheet.absoluteFill}>
            {decay.scrim > 0 && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.vignetteColor, opacity: decay.scrim }]} />
            )}
            {decay.scanline > 0 && SCANLINE_TOPS.map((topPct, i) => (
              <View
                key={i}
                style={[styles.scanline, { top: `${topPct}%`, backgroundColor: theme.vignetteColor, opacity: decay.scanline }]}
              />
            ))}
          </View>
        )}

        <View style={styles.content}>
          {/* The real wooden wordmark — splits into a chromatic glitch as the
              descent deepens (tinted silhouette ghosts of the same art) */}
          <View style={styles.wordmarkWrap}>
            {decay.aberration > 0 && (
              <>
                <Image
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  testID="share-wordmark-ghost"
                  source={WORDMARK_IMG}
                  style={[styles.wordmark, styles.wordmarkGhost, { tintColor: GLITCH_GHOST_COOL, opacity: decay.aberration, transform: [{ translateX: -decay.aberrationShift }] }]}
                />
                <Image
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  testID="share-wordmark-ghost"
                  source={WORDMARK_IMG}
                  style={[styles.wordmark, styles.wordmarkGhost, { tintColor: GLITCH_GHOST_WARM, opacity: decay.aberration, transform: [{ translateX: decay.aberrationShift }] }]}
                />
              </>
            )}
            <Image source={WORDMARK_IMG} style={styles.wordmark} accessibilityLabel="WordShift" />
          </View>
          {result.isDaily && result.dailyDate && (
            <Text style={[styles.daily, { color: t.muted }]}>Daily · {formatDailyDate(result.dailyDate)}</Text>
          )}

          {/* Hero row: Ember (always the cute sprite — see spoiler rule above)
              beside the run's stars and difficulty */}
          <View style={styles.heroRow}>
            <Image source={FOX_IMG} style={styles.fox} accessibilityLabel="Ember the fox" />
            <View style={styles.heroCol}>
              <View
                style={styles.starsRow}
                accessible
                accessibilityLabel={`${result.stars} of 3 stars`}
              >
                {[0, 1, 2].map(i => (
                  <Image
                    key={i}
                    source={i < result.stars ? STAR_FILLED_IMG : STAR_EMPTY_IMG}
                    style={[styles.star, i >= result.stars && { opacity: isDark ? 0.4 : 0.6 }]}
                  />
                ))}
              </View>
              <View style={styles.diffRow}>
                <View style={[styles.diffDot, { backgroundColor: DIFFICULTY_DOT[result.difficulty] ?? '#888' }]} />
                <Text style={[styles.diffText, { color: t.title }]}>
                  {diffLabel}{result.isChallenge ? ' · Challenge' : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Performance grid (spoiler-free signal, honest per-move order) —
              candy-tile shine on each square */}
          <View style={styles.grid} testID="share-grid">
            {gridSquareKinds(result).map((kind, i) => (
              <View
                key={i}
                style={[styles.square, { backgroundColor: SQUARE_COLORS[kind] }]}
              >
                <View style={styles.squareShine} />
              </View>
            ))}
          </View>

          {/* Clean-run badge */}
          {result.hintsUsed === 0 && result.invalidAttempts <= 1 && (
            <Text style={[styles.badge, { color: t.amberText }]}>
              {result.isChallenge ? 'Challenge. Flawless' : 'No hints, no mistakes'}
            </Text>
          )}

          {/* Word chain — non-daily only (spoiler rule) */}
          {spoilerSafe && result.wordChain && result.wordChain.length > 0 && (
            <Text style={[styles.chain, { color: t.title }]} numberOfLines={2}>
              {result.wordChain.join('  →  ')}
            </Text>
          )}
          {spoilerSafe && result.incantationName && (
            <Text style={[styles.incantation, { color: t.muted }]} numberOfLines={1}>
              “{result.incantationName}”
            </Text>
          )}

          {/* Mood signature. On an EARLY (Phase 0-1) non-daily card this is a
              spoiler-safe curiosity hook ("Mostly." / "For now."); daily and
              dark-phase (>= 2) cards keep the phaseNarrative mood tagline that
              quietly decays with phase. */}
          <Text style={[styles.tagline, { color: t.muted }]} numberOfLines={2}>
            {pickShareIntrigueTagline(result) ?? getShareCardTagline(phase)}
          </Text>

          {/* Footer — carries the visible install URL so a shared IMAGE (which
              drops any accompanying text on Android) still shows the way home */}
          <View style={[styles.footer, { borderTopColor: t.sectionBorder }]}>
            <Text style={[styles.footerText, { color: t.body }]}>
              {result.isDaily ? 'Take today’s daily challenge' : 'Play WordShift'}
            </Text>
            <Text style={[styles.footerUrl, { color: t.muted }]} numberOfLines={1}>
              {INSTALL_URL_DISPLAY}
            </Text>
          </View>
        </View>

        {/* Decay OVERLAY — painted on top, but corners/upper band only, off the grid */}
        {(decay.soot > 0 || decay.tear > 0) && (
          <View testID="share-decay-overlay" pointerEvents="none" style={StyleSheet.absoluteFill}>
            {decay.soot > 0 && (
              <>
                <View style={[styles.sootCorner, styles.sootTL, { backgroundColor: theme.vignetteColor, opacity: decay.soot }]} />
                <View style={[styles.sootCorner, styles.sootBR, { backgroundColor: theme.vignetteColor, opacity: decay.soot }]} />
              </>
            )}
            {decay.tear > 0 && (
              <View style={[styles.tearLine, { backgroundColor: theme.vignetteColor, opacity: decay.tear }]} />
            )}
          </View>
        )}
      </PanelCard>
    </View>
  );
});

ShareCard.displayName = 'ShareCard';

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 18,
    padding: 10,
    // Clips the soot blobs (negative corner offsets) to the phase-sky backdrop.
    // The panel sits 10dp inset, so the 18dp radius never shaves its pixel
    // corners (max corner cut ≈ 5.3dp < 10dp inset).
    overflow: 'hidden',
  },
  panel: { alignSelf: 'stretch' },
  content: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  scanline: { position: 'absolute', left: 0, right: 0, height: 1 },
  sootCorner: { position: 'absolute', width: 72, height: 72, borderRadius: 40 },
  sootTL: { top: -28, left: -28 },
  sootBR: { bottom: -28, right: -28 },
  tearLine: { position: 'absolute', top: '17%', left: '9%', right: '31%', height: 2 },
  // 1000×250 art at 4:1 — sized to clear the panel's wood band comfortably.
  wordmark: { width: 208, height: 52, resizeMode: 'contain' },
  wordmarkWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  wordmarkGhost: { position: 'absolute', top: 0 },
  tagline: { fontSize: FONT_SIZE.caption, fontWeight: '600', fontStyle: 'italic', marginTop: 14, letterSpacing: 0.3, textAlign: 'center', fontFamily: BODY_FONT_ITALIC },
  daily: {
    fontSize: FONT_SIZE.small,
    fontWeight: '700',
    fontFamily: PIXEL_FONT_BOLD,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 14 },
  // The sprite art carries transparent padding (subject ≈61% of the box), so
  // the box is sized up so Ember reads at a friendly ~46dp on the card.
  fox: { width: 76, height: 76, resizeMode: 'contain' },
  heroCol: { alignItems: 'flex-start', gap: 6 },
  starsRow: { flexDirection: 'row', gap: 5 },
  star: { width: 26, height: 26, resizeMode: 'contain' },
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  diffDot: { width: 10, height: 10, borderRadius: 5 },
  diffText: { fontSize: FONT_SIZE.bodyLg, fontWeight: '800', letterSpacing: 0.5, fontFamily: PIXEL_FONT_BOLD },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    maxWidth: CARD_WIDTH - 76,
  },
  square: { width: 22, height: 22, borderRadius: 5, overflow: 'hidden' },
  squareShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  badge: { fontSize: FONT_SIZE.body, fontWeight: '800', marginTop: 12, fontFamily: PIXEL_FONT_BOLD },
  chain: { fontSize: FONT_SIZE.body, fontWeight: '700', marginTop: 12, textAlign: 'center', letterSpacing: 0.5, fontFamily: BODY_FONT_BOLD },
  incantation: { fontSize: FONT_SIZE.small, fontWeight: '600', fontStyle: 'italic', marginTop: 5, textAlign: 'center', fontFamily: BODY_FONT_ITALIC },
  footer: {
    marginTop: 14,
    paddingTop: 11,
    borderTopWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  footerText: { fontSize: FONT_SIZE.small, fontWeight: '700', letterSpacing: 0.3, fontFamily: PIXEL_FONT_BOLD },
  footerUrl: { fontSize: FONT_SIZE.micro, fontWeight: '700', letterSpacing: 0.2, marginTop: 3, fontFamily: PIXEL_FONT_BOLD },
});

export { CARD_WIDTH };
