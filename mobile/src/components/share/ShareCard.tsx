import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getPhaseTheme } from '../../theme/colors';
import { PIXEL_FONT_BOLD } from '../../theme/fonts';
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
 * Spoiler rule: daily challenges are the same for everyone today, so the card
 * shows the Wordle-style colored grid (a spoiler-free performance signal) but
 * NOT the actual words / incantation name on daily results.
 *
 * Phase decay: from Phase 2 the card quietly corrupts (a scrim veil, faint
 * scanlines, corner soot, a glitch tear, and a chromatic split of the wordmark)
 * so a late-game share reads as "something is off with this cute word game" (the
 * word-of-mouth lure) WITHOUT ever spoiling the turn. It PEAKS at the reveal
 * (Phase 4) and SETTLES at Phase 5 (terrible peace, not chaos). The candy grid,
 * gold stars, and all text render on top and stay fully legible at every phase.
 */

const CARD_WIDTH = 320;

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
    case 3:  return { scrim: 0.20, scanline: 0.08, soot: 0.20, tear: 0.18, aberration: 0.22, aberrationShift: 1.0  };
    case 4:  return { scrim: 0.30, scanline: 0.12, soot: 0.32, tear: 0.26, aberration: 0.42, aberrationShift: 1.5  };
    case 5:
    default: return { scrim: 0.26, scanline: 0.05, soot: 0.28, tear: 0.12, aberration: 0.30, aberrationShift: 1.25 };
  }
}

export const ShareCard = forwardRef<View, ShareCardProps>(({ result }, ref) => {
  const phase = result.phase ?? 0;
  const theme = getPhaseTheme(phase);
  const isDark = phase >= 3;

  const bg = theme.bgPrimary;
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)';
  // The border creeps toward crimson at the reveal — a quiet wrongness.
  const cardBorder = phase >= 4
    ? 'rgba(196,72,92,0.42)'
    : isDark ? 'rgba(180,120,160,0.3)' : 'rgba(255,255,255,0.3)';
  const textColor = isDark ? 'rgba(225,205,225,0.95)' : '#FFFFFF';
  const subColor = isDark ? 'rgba(200,170,195,0.8)' : 'rgba(255,255,255,0.8)';

  const decay = getShareDecay(phase);
  const spoilerSafe = !result.isDaily;
  const diffLabel = result.difficulty === 'MEDIUM_PLUS' ? 'MED+' : result.difficulty;

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: bg, borderColor: cardBorder }]}>
      <View style={[styles.inner, { backgroundColor: cardBg }]}>
        {/* Decay UNDERLAY — painted behind content, so grid/stars/text stay crisp */}
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

        {/* Wordmark — splits into a chromatic glitch as the descent deepens */}
        <View style={styles.wordmarkWrap}>
          {decay.aberration > 0 && (
            <>
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                testID="share-wordmark-ghost"
                numberOfLines={1}
                style={[styles.wordmark, styles.wordmarkGhost, { color: GLITCH_GHOST_COOL, opacity: decay.aberration, transform: [{ translateX: -decay.aberrationShift }] }]}
              >WordShift</Text>
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                testID="share-wordmark-ghost"
                numberOfLines={1}
                style={[styles.wordmark, styles.wordmarkGhost, { color: GLITCH_GHOST_WARM, opacity: decay.aberration, transform: [{ translateX: decay.aberrationShift }] }]}
              >WordShift</Text>
            </>
          )}
          <Text style={[styles.wordmark, { color: textColor }]}>WordShift</Text>
        </View>
        {result.isDaily && result.dailyDate && (
          <Text style={[styles.daily, { color: subColor }]}>Daily · {result.dailyDate}</Text>
        )}

        {/* Stars */}
        <View style={styles.starsRow}>
          {[0, 1, 2].map(i => (
            <Text key={i} style={[styles.star, { color: i < result.stars ? '#FFD479' : (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.35)') }]}>
              {i < result.stars ? '★' : '☆'}
            </Text>
          ))}
        </View>

        {/* Difficulty + challenge */}
        <View style={styles.diffRow}>
          <View style={[styles.diffDot, { backgroundColor: DIFFICULTY_DOT[result.difficulty] ?? '#888' }]} />
          <Text style={[styles.diffText, { color: textColor }]}>
            {diffLabel}{result.isChallenge ? ' · Challenge' : ''}
          </Text>
        </View>

        {/* Performance grid (spoiler-free signal, honest per-move order) */}
        <View style={styles.grid} testID="share-grid">
          {gridSquareKinds(result).map((kind, i) => (
            <View
              key={i}
              style={[styles.square, { backgroundColor: SQUARE_COLORS[kind] }]}
            />
          ))}
        </View>

        {/* Clean-run badge */}
        {result.hintsUsed === 0 && result.invalidAttempts <= 1 && (
          <Text style={[styles.badge, { color: '#FFD479' }]}>
            {result.isChallenge ? 'Challenge. Flawless' : 'No hints, no mistakes'}
          </Text>
        )}

        {/* Word chain — non-daily only (spoiler rule) */}
        {spoilerSafe && result.wordChain && result.wordChain.length > 0 && (
          <Text style={[styles.chain, { color: subColor }]} numberOfLines={2}>
            {result.wordChain.join('  →  ')}
          </Text>
        )}
        {spoilerSafe && result.incantationName && (
          <Text style={[styles.incantation, { color: subColor }]} numberOfLines={1}>
            “{result.incantationName}”
          </Text>
        )}

        {/* Mood signature. On an EARLY (Phase 0-1) non-daily card this is a
            spoiler-safe curiosity hook ("Mostly." / "For now."); daily and
            dark-phase (>= 2) cards keep the phaseNarrative mood tagline that
            quietly decays with phase. */}
        <Text style={[styles.tagline, { color: subColor }]} numberOfLines={2}>
          {pickShareIntrigueTagline(result) ?? getShareCardTagline(phase)}
        </Text>

        {/* Footer — carries the visible install URL so a shared IMAGE (which
            drops any accompanying text on Android) still shows the way home */}
        <View style={[styles.footer, { borderTopColor: cardBorder }]}>
          <Text style={[styles.footerText, { color: textColor }]}>
            {result.isDaily ? 'Take today’s daily challenge' : 'Play WordShift'}
          </Text>
          <Text style={[styles.footerUrl, { color: subColor }]} numberOfLines={1}>
            {INSTALL_URL_DISPLAY}
          </Text>
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
      </View>
    </View>
  );
});

ShareCard.displayName = 'ShareCard';

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 24,
    borderWidth: 1,
    padding: 6,
  },
  inner: {
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden', // clip the decay layers to the rounded frame
  },
  scanline: { position: 'absolute', left: 0, right: 0, height: 1 },
  sootCorner: { position: 'absolute', width: 72, height: 72, borderRadius: 40 },
  sootTL: { top: -28, left: -28 },
  sootBR: { bottom: -28, right: -28 },
  tearLine: { position: 'absolute', top: '17%', left: '9%', right: '31%', height: 2 },
  wordmark: {
    fontSize: 26,
    fontWeight: '900',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 1,
  },
  wordmarkWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  wordmarkGhost: { position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center' },
  tagline: { fontSize: 11.5, fontWeight: '600', fontStyle: 'italic', marginTop: 16, letterSpacing: 0.3, textAlign: 'center', fontFamily: PIXEL_FONT_BOLD },
  daily: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: PIXEL_FONT_BOLD,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  starsRow: { flexDirection: 'row', marginTop: 14, gap: 6 },
  star: { fontSize: 30, fontWeight: '900', fontFamily: PIXEL_FONT_BOLD },
  diffRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 7 },
  diffDot: { width: 10, height: 10, borderRadius: 5 },
  diffText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5, fontFamily: PIXEL_FONT_BOLD },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    maxWidth: CARD_WIDTH - 56,
  },
  square: { width: 22, height: 22, borderRadius: 5 },
  badge: { fontSize: 13, fontWeight: '800', marginTop: 14, fontFamily: PIXEL_FONT_BOLD },
  chain: { fontSize: 13, fontWeight: '700', marginTop: 14, textAlign: 'center', letterSpacing: 0.5, fontFamily: PIXEL_FONT_BOLD },
  incantation: { fontSize: 12.5, fontWeight: '600', fontStyle: 'italic', marginTop: 6, textAlign: 'center', fontFamily: PIXEL_FONT_BOLD },
  footer: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  footerText: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.3, fontFamily: PIXEL_FONT_BOLD },
  footerUrl: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.2, marginTop: 3, fontFamily: PIXEL_FONT_BOLD },
});

export { CARD_WIDTH };
