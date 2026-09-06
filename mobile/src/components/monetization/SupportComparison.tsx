import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
      <Text style={[styles.toggleText, { color: theme.body }]}>{expanded ? 'Hide ad-free comparison' : 'Compare ad-free options'}</Text>
    </TouchableOpacity>
    {expanded && <PanelCard phase={phase} style={styles.card}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.title }]}>Remove Ads · one purchase</Text>
      <Text style={[styles.body, { color: theme.body }]}>Removes forced ads. Victory doubles are instant when offered.</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.title }]}>Patron · one purchase</Text>
      <Text style={[styles.body, { color: theme.body }]}>Includes Remove Ads, +{PATRON_AMBER_BONUS} amber per solved puzzle, and the Patron tile theme. Claim {DAILY_AMBER_REWARD} daily amber up to {DAILY_AMBER_DAILY_CAP} times without a clip.</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.title }]}>Supporter · monthly subscription</Text>
      <Text style={[styles.body, { color: theme.body }]}>Ad-free play, {SUPPORTER_MONTHLY_AMBER} amber each calendar month, the season premium track and exclusive confetti. Renews monthly until cancelled.</Text>
      <Text style={[styles.note, { color: theme.muted }]}>Daily free claims and the per-puzzle bonus belong to Patron. All three keep the same story pace. Current prices appear beside each purchase.</Text>
    </PanelCard>}
  </View>;
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  toggle: { minHeight: 44, justifyContent: 'center', paddingVertical: 12 },
  toggleText: { fontFamily: BODY_FONT_BOLD, fontSize: 15, textDecorationLine: 'underline' },
  card: { padding: 20, gap: 8 },
  title: { fontFamily: BODY_FONT_BOLD, fontSize: 16, lineHeight: 24, marginTop: 4 },
  body: { fontFamily: BODY_FONT, fontSize: 15, lineHeight: 23, marginBottom: 8 },
  note: { fontFamily: BODY_FONT, fontSize: 14, lineHeight: 21 },
});
