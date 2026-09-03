import React from 'react';
import { Image, StyleProp, ImageStyle, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

const AMBER_ICON = require('../../assets/ui/amber.png');

/**
 * Inline amber gem icon for use INSIDE <Text> runs (RN baseline-aligns
 * images embedded in text). Replaces the platform-inconsistent 💎 emoji.
 * Default size 15 (was 13): the redrawn gem sits a touch larger so it
 * reads clearly next to 13-16pt text without disturbing line height.
 *
 * `style` lets a caller add spacing (e.g. marginHorizontal) when the gem is
 * used as a flex-row sibling instead of inside a Text run — RN's baseline
 * inline-image layout crowds/overlaps the adjacent glyph flakily, so short
 * centered button labels lay it out as a real row (see AmberCostLabel).
 */
export const AmberInline: React.FC<{ size?: number; style?: StyleProp<ImageStyle> }> = ({ size = 15, style }) => (
  <Image
    source={AMBER_ICON}
    style={[{ width: size, height: size }, style]}
    accessibilityLabel="amber"
  />
);

/**
 * A gem + its amount, laid out as a REAL nowrap flex row — the safe way to
 * render an amber value anywhere the containing Text is sized by its own
 * intrinsic measurement (a chip, a pill, a value column, a row's value slot)
 * rather than flowing across a full-width paragraph.
 *
 * Why this exists: an inline `<AmberInline />` inside a Text run is measured as
 * a separate shadow node, and the paragraph is then re-laid-out inside the
 * frame that measurement produced. When the Text's width IS that measurement,
 * the two can disagree by a sub-point, and the run "<gem> 5500" has exactly one
 * line-break opportunity to relieve it: the space before the gem. The gem drops
 * to a second line under the number, which a player reported on the achievement
 * toast. A nowrap row has no break opportunity at all, so the failure cannot
 * occur at any font scale or on any device.
 *
 * Inline `<AmberInline />` inside a Text run is still correct for FLOWING prose
 * ("Your Amber: <gem> 240", "Unlock for <gem> 450") — there the paragraph owns
 * a full-width box and a wrap is ordinary text flow.
 */
export const AmberValue: React.FC<{
  /** Rendered verbatim after the gem, so callers can pass '+120' or '1,240'. */
  amount: number | string;
  color: string;
  size?: number;
  /** The caller's existing value-text style (font, size, weight). */
  textStyle?: StyleProp<TextStyle>;
  /** Row wrapper style, when the caller needs to place it. */
  style?: StyleProp<ViewStyle>;
  /** Defaults to "<amount> amber". Pass '' to leave the row unlabelled. */
  accessibilityLabel?: string;
}> = ({ amount, color, size = 15, textStyle, style, accessibilityLabel }) => {
  const label = accessibilityLabel === undefined ? `${amount} amber` : accessibilityLabel;
  return (
    <View
      style={[styles.row, style]}
      accessible={label !== ''}
      accessibilityLabel={label === '' ? undefined : label}
    >
      <Image source={AMBER_ICON} style={{ width: size, height: size }} accessible={false} />
      <Text style={[styles.amount, textStyle, { color }]} numberOfLines={1}>
        {amount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  // Replaces the literal space that used to sit between the gem and the digits.
  amount: { marginLeft: 4 },
});
