import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { CandyColors, getPhaseTheme } from '../../theme/colors';

interface DailyLeaderboardCardProps {
  /** 1-based standing (1 = best). Omit/undefined while loading or no data. */
  rank?: number | null;
  /** Total players on the board for the day. */
  total?: number | null;
  /** Percent of other players beaten, 0-100. */
  percentile?: number | null;
  /** Pre-formatted, phase-aware standing copy (from getBeatPercentText). */
  beatText?: string | null;
  /** Persistent local history line (best this week / participation); spoiler-safe. */
  historyLine?: string | null;
  /** Short placement-trend tag (from getDailyLadderTrendLabel); text + a11y, never color alone. */
  trendLabel?: string | null;
  /** Show a spinner instead of data. */
  loading?: boolean;
  /** Current narrative phase (drives theming only). */
  phase?: number;
}

/**
 * Compact, phase-aware leaderboard standing card for the Victory modal's daily
 * section. Pure/presentational — all data arrives via props; it imports NO
 * backend services. Renders when there's a live standing OR a persistent local
 * history line (the offline returning-player hook), nothing otherwise.
 *
 * Spoiler-safe: only rank/percentile/history text — never phase or cult content.
 * Accessibility: a single summarizing label; rank and trend are conveyed by
 * text + icon, never by color alone.
 */
export const DailyLeaderboardCard: React.FC<DailyLeaderboardCardProps> = ({
  rank,
  total,
  percentile,
  beatText,
  historyLine,
  trendLabel,
  loading = false,
  phase = 0,
}) => {
  const theme = getPhaseTheme(phase);
  const dark = phase >= 2;
  const cardBg = dark ? theme.modalStatBgColor : CandyColors.gray[50];
  const borderColor = theme.modalDividerColor;
  const titleColor = dark ? theme.modalTextColor : CandyColors.purple.dark;
  const primaryColor = dark ? theme.modalTextColor : CandyColors.gray[800];
  const secondaryColor = theme.modalSecondaryTextColor;

  if (loading) {
    return (
      <View
        style={[styles.card, { backgroundColor: cardBg, borderColor }]}
        accessibilityLabel="Loading your daily standing"
        accessibilityRole="text"
      >
        <ActivityIndicator
          size="small"
          color={dark ? secondaryColor : CandyColors.purple.main}
        />
      </View>
    );
  }

  const hasStanding = rank != null && total != null && total > 0;
  // Nothing at all to show (no live rank AND no local history) → render nothing.
  if (!hasStanding && !historyLine) {
    return null;
  }

  const a11yParts = [
    hasStanding ? `Daily standing: rank ${rank} of ${total}.` : '',
    hasStanding ? (beatText ?? (percentile != null ? `You beat ${percentile}% of players today.` : '')) : '',
    historyLine ?? '',
    trendLabel ? `Placement trend: ${trendLabel}.` : '',
  ].filter(Boolean);

  return (
    <View
      style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      accessibilityLabel={a11yParts.join(' ')}
      accessibilityRole="text"
    >
      <View style={styles.row}>
        {/* Icon + text both carry the meaning — never color alone. */}
        <Text style={styles.icon} accessibilityElementsHidden>
          🏆
        </Text>
        <Text style={[styles.title, { color: titleColor }]}>Daily Standing</Text>
      </View>

      {hasStanding && (
        <Text style={[styles.rank, { color: primaryColor }]}>
          #{rank}
          <Text style={[styles.rankTotal, { color: secondaryColor }]}>
            {' '}
            of {total}
          </Text>
        </Text>
      )}

      {hasStanding && (beatText ? (
        <Text style={[styles.beatText, { color: secondaryColor }]}>
          {beatText}
        </Text>
      ) : percentile != null ? (
        <Text style={[styles.beatText, { color: secondaryColor }]}>
          You beat {percentile}% of players today
        </Text>
      ) : null)}

      {historyLine ? (
        <View
          style={[
            styles.historyRow,
            hasStanding && {
              borderTopColor: borderColor,
              borderTopWidth: StyleSheet.hairlineWidth,
              marginTop: 8,
              paddingTop: 8,
            },
          ]}
        >
          <Text style={[styles.historyText, { color: hasStanding ? secondaryColor : primaryColor }]}>
            {historyLine}
          </Text>
          {trendLabel ? (
            <Text style={[styles.trendText, { color: titleColor }]} accessibilityElementsHidden>
              {trendLabel}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rank: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
  },
  rankTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  beatText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignSelf: 'stretch',
    marginTop: 6,
  },
  historyText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  trendText: {
    fontSize: 10.5,
    fontWeight: '800',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default DailyLeaderboardCard;
