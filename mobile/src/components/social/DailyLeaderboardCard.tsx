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
  /** Show a spinner instead of data. */
  loading?: boolean;
  /** Current narrative phase (drives theming only). */
  phase?: number;
}

/**
 * Compact, phase-aware leaderboard standing card for the Victory modal's daily
 * section. Pure/presentational — all data arrives via props; it imports NO
 * backend services. Renders nothing when there's no standing and not loading.
 *
 * Spoiler-safe: only shows a rank/percentile — never phase or cult content.
 * Accessibility: a single summarizing label; rank is conveyed by text + icon,
 * never by color alone.
 */
export const DailyLeaderboardCard: React.FC<DailyLeaderboardCardProps> = ({
  rank,
  total,
  percentile,
  beatText,
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

  // Nothing to show (unconfigured backend / no data) → render nothing.
  if (rank == null || total == null || total <= 0) {
    return null;
  }

  const a11yParts = [
    `Daily standing: rank ${rank} of ${total}.`,
    beatText ?? (percentile != null ? `You beat ${percentile}% of players today.` : ''),
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

      <Text style={[styles.rank, { color: primaryColor }]}>
        #{rank}
        <Text style={[styles.rankTotal, { color: secondaryColor }]}>
          {' '}
          of {total}
        </Text>
      </Text>

      {beatText ? (
        <Text style={[styles.beatText, { color: secondaryColor }]}>
          {beatText}
        </Text>
      ) : percentile != null ? (
        <Text style={[styles.beatText, { color: secondaryColor }]}>
          You beat {percentile}% of players today
        </Text>
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
});

export default DailyLeaderboardCard;
