import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { FrameSkin, ThreeSlice } from '../../theme/pixelSkin.generated';

/**
 * Fabric-safe 9-slice frame renderer for the cottage pixel skin.
 *
 * Constraints honored (learned the hard way in HouseWorld, see CLAUDE.md):
 * - resizeMode="repeat" renders nothing on Fabric → edges STRETCH, and the
 *   PNGs are drawn with uniform cross-sections so stretching is artifact-free.
 * - An <Image> sized only by insets collapses to its intrinsic size → corners
 *   get explicit width/height; edges live inside inset-positioned wrapper
 *   Views and fill them with explicit '100%' dimensions.
 * - The center is a SOLID View (fillColor): guarantees text contrast, avoids
 *   texture smearing, and keeps Image-node count low in long lists.
 *
 * Rendered as an absolute-fill background; host components put children on
 * top with padding >= edge thickness.
 */
export const NineSliceFrame: React.FC<{
  skin: FrameSkin;
  cornerDp: number;
  edgeDp: number;
  fillColor: string;
  /**
   * Bottom-sheet mode: the frame's bottom row is omitted and the fill runs to
   * the container bottom (sheets sit flush against the screen edge).
   */
  openBottom?: boolean;
}> = ({ skin, cornerDp, edgeDp, fillColor, openBottom = false }) => {
  const C = cornerDp, E = edgeDp;
  // The solid center is drawn FIRST (behind the edge strips) and deliberately
  // UNDERLAPS them by ~1dp on every side. At fractional screen densities the
  // center View's inner edge (at E dp) and a stretched edge Image's inner edge
  // round to different physical pixels, leaving a hairline where the layer
  // behind bleeds through (the "thin white/black lines"). Extending the fill
  // under the opaque wood strips closes that gap with no visible bleed — the
  // strips draw on top and hide the extra dp.
  const OVERLAP = 1;
  const inner = Math.max(0, E - OVERLAP);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* center fill (underlaps the frame pieces to kill subpixel seams) */}
      <View
        style={{
          position: 'absolute',
          top: inner,
          left: inner,
          right: inner,
          bottom: openBottom ? 0 : inner,
          backgroundColor: fillColor,
        }}
      />
      {/* edges */}
      <View style={{ position: 'absolute', top: 0, left: C, right: C, height: E }}>
        <Image source={skin.top} style={styles.stretch} resizeMode="stretch" fadeDuration={0} />
      </View>
      {!openBottom && (
        <View style={{ position: 'absolute', bottom: 0, left: C, right: C, height: E }}>
          <Image source={skin.bottom} style={styles.stretch} resizeMode="stretch" fadeDuration={0} />
        </View>
      )}
      <View style={{ position: 'absolute', left: 0, top: C, bottom: openBottom ? 0 : C, width: E }}>
        <Image source={skin.left} style={styles.stretch} resizeMode="stretch" fadeDuration={0} />
      </View>
      <View style={{ position: 'absolute', right: 0, top: C, bottom: openBottom ? 0 : C, width: E }}>
        <Image source={skin.right} style={styles.stretch} resizeMode="stretch" fadeDuration={0} />
      </View>
      {/* corners (drawn last so their baked fill wins at the overlaps) */}
      <Image source={skin.tl} style={{ position: 'absolute', top: 0, left: 0, width: C, height: C }} resizeMode="stretch" fadeDuration={0} />
      <Image source={skin.tr} style={{ position: 'absolute', top: 0, right: 0, width: C, height: C }} resizeMode="stretch" fadeDuration={0} />
      {!openBottom && (
        <>
          <Image source={skin.bl} style={{ position: 'absolute', bottom: 0, left: 0, width: C, height: C }} resizeMode="stretch" fadeDuration={0} />
          <Image source={skin.br} style={{ position: 'absolute', bottom: 0, right: 0, width: C, height: C }} resizeMode="stretch" fadeDuration={0} />
        </>
      )}
    </View>
  );
};

/**
 * Horizontal 3-slice strip (buttons, plaques): fixed-height caps + stretched
 * middle. Height comes from the host; pass the strip's design height there.
 */
export const ThreeSliceStrip: React.FC<{
  skin: ThreeSlice;
  capDp: number;
}> = ({ skin, capDp }) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {/* Middle tucks 1dp under each opaque cap (drawn on top) so no background
        seam can show where the stretched middle meets a cap. */}
    <View style={{ position: 'absolute', top: 0, bottom: 0, left: capDp - 1, right: capDp - 1 }}>
      <Image source={skin.m} style={styles.stretch} resizeMode="stretch" fadeDuration={0} />
    </View>
    <Image source={skin.l} style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: capDp, height: '100%' }} resizeMode="stretch" fadeDuration={0} />
    <Image source={skin.r} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: capDp, height: '100%' }} resizeMode="stretch" fadeDuration={0} />
  </View>
);

const styles = StyleSheet.create({
  stretch: {
    width: '100%',
    height: '100%',
  },
});
