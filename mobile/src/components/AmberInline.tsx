import React from 'react';
import { Image, StyleProp, ImageStyle } from 'react-native';

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
