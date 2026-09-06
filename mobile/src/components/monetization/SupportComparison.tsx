import { TEXT_ROLE } from '../../theme/typography';
import { AppText } from '../ui/AppText';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { DAILY_AMBER_DAILY_CAP, DAILY_AMBER_REWARD, PATRON_AMBER_BONUS, SUPPORTER_MONTHLY_AMBER } from '../../constants/gameBalance';
import { BODY_FONT, BODY_FONT_BOLD } from '../../theme/fonts';
import { getSurfaceTheme } from '../../theme/surfaces';
import { PanelCard } from '../ui/PanelCard';

/** A single comparison; purchasing stays in the existing product/price controls. */
export function SupportComparison({ phase }: { phase: number }) {
  const [expanded, setExpanded] = useState(false);
  const theme = getSurfaceTheme(phase);
  return <View style={styles.container}>
    <TouchableOpacity onPress={() => setExpanded(value => !value)} style={styles.toggle}
      accessibilityRole="button" accessibilityState={{ expanded }}
      accessibilityLabel="Compare Remove Ads, Patron and Supporter">
      <AppText textRole="label" style={[styles.toggleText, { color: theme.body }]}>{expanded ? 'Hide ad-free comparison' : 'Compare ad-free options'}</AppText>
    </TouchableOpacity>
    {expanded && <PanelCard phase={phase} style={styles.card}>
      <AppText textRole="title" accessibilityRole="header" style={[styles.title, { color: theme.title }]}>Remove Ads · one purchase</AppText>
      <AppText textRole="reading" style={[styles.body, { color: theme.body }]}>Removes forced ads. Victory doubles are instant when offered.</AppText>
      <AppText textRole="title" accessibilityRole="header" style={[styles.title, { color: theme.title }]}>Patron · one purchase</AppText>
      <AppText textRole="reading" style={[styles.body, { color: theme.body }]}>Includes Remove Ads, +{PATRON_AMBER_BONUS} amber per solved puzzle, and the Patron tile theme. Claim {DAILY_AMBER_REWARD} daily amber up to {DAILY_AMBER_DAILY_CAP} times without a clip.</AppText>
      <AppText textRole="title" accessibilityRole="header" style={[styles.title, { color: theme.title }]}>Supporter · monthly subscription</AppText>
      <AppText textRole="reading" style={[styles.body, { color: theme.body }]}>Ad-free play, {SUPPORTER_MONTHLY_AMBER} amber each calendar month, the season premium track and exclusive confetti. Renews monthly until cancelled.</AppText>
      <AppText textRole="caption" style={[styles.note, { color: theme.muted }]}>Daily free claims and the per-puzzle bonus belong to Patron. All three keep the same story pace. Current prices appear beside each purchase.</AppText>
    </PanelCard>}
  </View>;
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  toggle: { minHeight: 44, justifyContent: 'center', paddingVertical: 12 },
  toggleText: { fontFamily: BODY_FONT_BOLD, fontSize: 15, textDecorationLine: 'underline' },
  card: { padding: 20, gap: 8 },
  title: { ...TEXT_ROLE.title, marginTop: 4 },
  body: { ...TEXT_ROLE.body, marginBottom: 8 },
  note: { fontFamily: BODY_FONT, fontSize: 14, lineHeight: 21 },
});
