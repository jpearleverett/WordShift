import React, { useEffect, useRef } from 'react';
import { Animated, Image, ImageStyle, StyleProp } from 'react-native';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';

const AMBER_ICON = require('../../../assets/ui/amber.png');

/**
 * A small in-world loading indicator: the amber gem with a gentle native-driver
 * breathing loop (scale + opacity), replacing the stock ActivityIndicator so a
 * loading hold reads as the house gathering rather than a system stall. Static
 * (mid-breath) under reduced motion / low-tier devices. The amber gem is the
 * brand color and reads on every phase, so no per-phase tint is applied.
 */
export const BrandedLoader: React.FC<{ size?: number; style?: StyleProp<ImageStyle> }> = ({
  size = 40,
  style,
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (getSettingsSync().reducedMotion || shouldSimplifyAnimations()) {
      anim.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={{ transform: [{ scale }], opacity }}
    >
      <Image source={AMBER_ICON} style={[{ width: size, height: size }, style]} resizeMode="contain" />
    </Animated.View>
  );
};

export default BrandedLoader;
