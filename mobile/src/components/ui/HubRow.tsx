import React from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SURFACE, getSurfaceTheme } from '../../theme/surfaces';
import { getPixelSkin, CARD_CORNER_DP, CARD_EDGE_DP } from '../../theme/pixelSkin.generated';
import { NineSliceFrame } from './NineSlice';
import { PIXEL_FONT_BOLD } from '../../theme/fonts';
import { FONT_SIZE } from '../../theme/typeScale';

/**
 * Framed hub-row (Journal / Utility menus): cottage pixel card frame with an
 * optional ui-sprite icon — replaces the old uniform ghost rows.
 */
export const HubRow: React.FC<{
  phase: number;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  icon?: ImageSourcePropType;
  /** Host panel is dt.modalBg, which darkens at phase 2 (see dtHostDark). */
  hostDark?: boolean;
}> = ({ phase, label, onPress, accessibilityLabel, icon, hostDark = false }) => {
  // Mirror getPixelSkin's hostDark ladder (2 → storm, 3 → dark) so the ink
  // tokens always match the skin fill's polarity.
  const t = getSurfaceTheme(hostDark ? (phase < 3 ? 3 : phase === 3 ? 4 : phase) : phase);
  const skin = getPixelSkin(phase, hostDark);
  return (
    <TouchableOpacity
      style={styles.hubRow}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <NineSliceFrame
        skin={skin.card}
        cornerDp={CARD_CORNER_DP}
        edgeDp={CARD_EDGE_DP}
        fillColor={skin.fillCard}
      />
      {icon ? <Image source={icon} style={styles.hubRowIcon} resizeMode="contain" /> : null}
      <Text style={[styles.hubRowText, { color: t.body }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Pixel-card hub rows (Journal / Utility menus) — the NineSliceFrame is the
  // chrome; padding must clear the 18dp card strip (12dp wood + transition +
  // vignette), which is what SURFACE.cardPadX is for.
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SURFACE.cardPadX,
    paddingVertical: SURFACE.cardPadY,
    minHeight: 56,
    marginBottom: 10,
  },
  hubRowIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  hubRowText: {
    flex: 1,
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.callout,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
