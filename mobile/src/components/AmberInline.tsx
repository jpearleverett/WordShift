import React from 'react';
import { Image } from 'react-native';

const AMBER_ICON = require('../../assets/ui/amber.png');

/**
 * Inline amber gem icon for use INSIDE <Text> runs (RN baseline-aligns
 * images embedded in text). Replaces the platform-inconsistent 💎 emoji.
 * Default size 15 (was 13): the redrawn gem sits a touch larger so it
 * reads clearly next to 13-16pt text without disturbing line height.
 */
export const AmberInline: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <Image
    source={AMBER_ICON}
    style={{ width: size, height: size }}
    accessibilityLabel="amber"
  />
);
