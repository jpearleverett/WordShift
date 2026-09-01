import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import {
  getPixelSkin,
  PANEL_CORNER_DP,
  PANEL_EDGE_DP,
  CARD_CORNER_DP,
  CARD_EDGE_DP,
} from '../../theme/pixelSkin.generated';
import { NineSliceFrame } from './NineSlice';

interface PanelCardProps {
  phase: number;
  children: React.ReactNode;
  /** panel = modal/screen card (chunky wood frame); card = slim inner tray. */
  kind?: 'panel' | 'card';
  /**
   * Set when the card sits on a host panel that is ALREADY dark at phases
   * below 3 (the home modals use getDialogueTheme, which darkens at phase 2 —
   * one phase before getSurfaceTheme). Maps the skin to the dark material so
   * the card never renders as a glaring light island on a dark panel.
   */
  hostDark?: boolean;
  style?: ViewStyle;
}

/**
 * Cottage pixel panel — the shared card anatomy for menus and modals, drawn
 * with the generated 9-slice wood-and-parchment skin (see
 * scripts/tools/generateUiPanels.mjs). Every phase is the same furniture in
 * an aging material: bright cottage wood → dusk → storm → charred → mauve.
 *
 * Consumers keep their own content padding. The frame strip is 30dp (panel) /
 * 18dp (card), of which 24dp / 15dp is wood + accent inlay + the parchment
 * transition ring that content must clear — so horizontal content padding
 * should come from SURFACE.panelPadX / SURFACE.cardPadX (theme/surfaces.ts)
 * rather than a hand-picked number. No borderRadius/overflow rounding is
 * applied — the stepped pixel corners ARE the corner treatment (CSS-rounding
 * them is the #1 cozy-pixel anti-pattern).
 */
export const PanelCard: React.FC<PanelCardProps> = ({
  phase,
  children,
  kind = 'card',
  hostDark = false,
  style,
}) => {
  const skin = getPixelSkin(phase, hostDark);
  const isPanel = kind === 'panel';
  return (
    <View style={[styles.body, style]}>
      <NineSliceFrame
        skin={isPanel ? skin.panel : skin.card}
        cornerDp={isPanel ? PANEL_CORNER_DP : CARD_CORNER_DP}
        edgeDp={isPanel ? PANEL_EDGE_DP : CARD_EDGE_DP}
        fillColor={isPanel ? skin.fill : skin.fillCard}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    // Children (glow blobs at negative offsets) still clip like before, but
    // to the straight rect — the baked pixel corners stay untouched.
    overflow: 'hidden',
  },
});

export default PanelCard;
