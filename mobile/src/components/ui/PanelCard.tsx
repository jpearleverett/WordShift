import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SURFACE, getSurfaceTheme } from '../../theme/surfaces';

interface PanelCardProps {
  phase: number;
  children: React.ReactNode;
  /** panel = modal/screen card (radius 28); card = inner row/section (radius 16). */
  kind?: 'panel' | 'card';
  /**
   * Set when the card sits on a host panel that is ALREADY dark at phases
   * below 3 (the home modals use getDialogueTheme, which darkens at phase 2 —
   * one phase before getSurfaceTheme). Maps the fill to the dark-surface
   * tokens so the card never renders as a glaring light island on a dark
   * panel (and its dialogue-theme ink keeps its contrast).
   */
  hostDark?: boolean;
  style?: ViewStyle;
}

/**
 * Layered material panel — the shared card anatomy for menus and modals.
 * A tinted framed body with a top highlight band and bottom shade band, so
 * every surface reads as lit material in the world instead of a flat white
 * web card floating on a drop shadow. Pure Views: zero animation cost.
 */
export const PanelCard: React.FC<PanelCardProps> = ({
  phase,
  children,
  kind = 'card',
  hostDark = false,
  style,
}) => {
  const t = getSurfaceTheme(hostDark && phase < 3 ? 3 : phase);
  const radius = kind === 'panel' ? SURFACE.panelRadius : SURFACE.cardRadius;
  return (
    <View
      style={[
        styles.body,
        {
          backgroundColor: kind === 'panel' ? t.cardBg : t.sectionBg,
          borderColor: kind === 'panel' ? t.cardBorder : t.sectionBorder,
          borderRadius: radius,
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
            backgroundColor: `rgba(255, 255, 255, ${SURFACE.highlightAlpha})`,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.shade,
          {
            borderBottomLeftRadius: radius,
            borderBottomRightRadius: radius,
            backgroundColor: `rgba(10, 6, 24, ${SURFACE.shadeAlpha})`,
          },
        ]}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '34%',
  },
  shade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '22%',
  },
});

export default PanelCard;
