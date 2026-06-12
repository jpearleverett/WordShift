import React from 'react';
import { Image } from 'react-native';

const AMBER_ICON = require('../../assets/ui/amber.png');

/**
 * Inline amber gem icon for use INSIDE <Text> runs (RN baseline-aligns
 * images embedded in text). Replaces the platform-inconsistent 💎 emoji.
 */
export const AmberInline: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <Image
    source={AMBER_ICON}
    style={{ width: size, height: size }}
    accessibilityLabel="amber"
  />
);
