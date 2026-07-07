import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing, Image } from 'react-native';
import { getSettingsSync } from '../../services/settings';

// Hand-authored wooden WordShift wordmark (transparent PNG, 1000x250 → 4:1).
const WORDMARK = require('../../../assets/ui/wordmark.png');
const LOGO_WIDTH = 236;
const LOGO_HEIGHT = LOGO_WIDTH * (250 / 1000);

export const AnimatedLogo: React.FC = () => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const bounceLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const rotateLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (getSettingsSync().reducedMotion) {
      bounceAnim.setValue(0);
      rotateAnim.setValue(0);
      return;
    }

    // Subtle bounce
    bounceLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -3,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    bounceLoopRef.current.start();

    // Very subtle rotation
    rotateLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    rotateLoopRef.current.start();

    return () => {
      bounceLoopRef.current?.stop();
      bounceLoopRef.current = null;
      rotateLoopRef.current?.stop();
      rotateLoopRef.current = null;
    };
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-1deg', '1deg'],
  });

  return (
    <Animated.View
      style={[
        styles.logoContainer,
        {
          transform: [
            { translateY: bounceAnim },
            { rotate },
          ],
        },
      ]}
      accessibilityLabel="WordShift"
      accessibilityRole="header"
    >
      <Image
        source={WORDMARK}
        style={styles.wordmark}
        resizeMode="contain"
        fadeDuration={0}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
});
