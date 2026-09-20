import React from 'react';
import { View } from 'react-native';
import { SparkPalette } from '../../theme/colors';
import { getSparkParticle } from '../../theme/sparkParticles';

interface SparkGlyphProps {
  sparkId?: string | null;
  palette: SparkPalette;
  index: number;
  size?: number;
  /** Low-tier bursts keep the outlined color chip and drop decorative layers. */
  simplified?: boolean;
  halo?: boolean;
}

/** A faceted spark chip; all movement belongs to its native-driven parent. */
export const SparkGlyph = ({
  sparkId, palette, index, size = 28, simplified = false, halo = true,
}: SparkGlyphProps) => {
  const particle = getSparkParticle(sparkId, palette, index);
  const unit = size / 28;
  const width = particle.width * unit;
  const height = particle.height * unit;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible={false}>
      {halo && !simplified && (
        <View style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2,
          backgroundColor: particle.halo, opacity: 0.2,
        }} />
      )}
      <View style={{
        width, height, transform: [{ rotate: `${particle.rotation}deg` }],
        backgroundColor: simplified ? particle.core : particle.rim,
        borderColor: '#463020', borderWidth: Math.max(0.65, unit), borderRadius: unit,
      }}>
        {!simplified && <>
          <View style={{
            position: 'absolute', left: width * 0.12, top: height * 0.1,
            width: width * 0.66, height: height * 0.72, backgroundColor: particle.core,
          }} />
          <View style={{
            position: 'absolute', left: width * 0.19, top: height * 0.15,
            width: width * 0.28, height: height * 0.37, backgroundColor: particle.highlight,
          }} />
        </>}
      </View>
    </View>
  );
};
