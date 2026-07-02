import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getPhaseTheme } from '../../theme/colors';
import type { ShareableResult, MoveOutcome } from '../../services/shareResults';

/**
 * The shareable result card — a polished, spoiler-free, phase-aware artifact the
 * player shares (or screenshots). Rendered at a fixed size so it captures cleanly
 * to a PNG via the share-image provider; also looks right shown in the preview
 * modal. Forwards a ref so the capturer can target it.
 *
 * Spoiler rule: daily challenges are the same for everyone today, so the card
 * shows the Wordle-style colored grid (a spoiler-free performance signal) but
 * NOT the actual words / incantation name on daily results.
 */

const CARD_WIDTH = 320;

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

export const ShareCard = forwardRef<View, ShareCardProps>(({ result }, ref) => {
  const phase = result.phase ?? 0;
  const theme = getPhaseTheme(phase);
  const isDark = phase >= 3;

  const bg = theme.bgPrimary;
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)';
  const cardBorder = isDark ? 'rgba(180,120,160,0.3)' : 'rgba(255,255,255,0.3)';
  const textColor = isDark ? 'rgba(225,205,225,0.95)' : '#FFFFFF';
  const subColor = isDark ? 'rgba(200,170,195,0.8)' : 'rgba(255,255,255,0.8)';

  const spoilerSafe = !result.isDaily;
  const diffLabel = result.difficulty === 'MEDIUM_PLUS' ? 'MED+' : result.difficulty;

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: bg, borderColor: cardBorder }]}>
      <View style={[styles.inner, { backgroundColor: cardBg }]}>
        {/* Wordmark */}
        <Text style={[styles.wordmark, { color: textColor }]}>WordShift</Text>
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

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: cardBorder }]}>
          <Text style={[styles.footerText, { color: subColor }]}>
            {result.isDaily ? 'Take today’s daily challenge' : 'Play WordShift'}
          </Text>
        </View>
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
  },
  wordmark: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
  },
  daily: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  starsRow: { flexDirection: 'row', marginTop: 14, gap: 6 },
  star: { fontSize: 30, fontWeight: '900' },
  diffRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 7 },
  diffDot: { width: 10, height: 10, borderRadius: 5 },
  diffText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    maxWidth: CARD_WIDTH - 56,
  },
  square: { width: 22, height: 22, borderRadius: 5 },
  badge: { fontSize: 13, fontWeight: '800', marginTop: 14 },
  chain: { fontSize: 13, fontWeight: '700', marginTop: 14, textAlign: 'center', letterSpacing: 0.5 },
  incantation: { fontSize: 12.5, fontWeight: '600', fontStyle: 'italic', marginTop: 6, textAlign: 'center' },
  footer: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  footerText: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.3 },
});

export { CARD_WIDTH };
