import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Animated, Easing, Image } from 'react-native';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';

// Hand-authored wooden WordShift wordmark (transparent PNG, 1000x250 → 4:1).
const WORDMARK = require('../../../assets/ui/wordmark.png');
const LOGO_WIDTH = 236;
const LOGO_HEIGHT = LOGO_WIDTH * (250 / 1000);

interface AnimatedLogoProps {
  /** Narrative phase (0-5). The idle bob slows and shrinks with the descent so
   *  the wordmark doesn't keep its bright-days bounce over a dark board. */
  phase?: number;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ phase = 0 }) => {
  const [bounceAnim] = useState(() => new Animated.Value(0));
  const [rotateAnim] = useState(() => new Animated.Value(0));
  const bounceLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const rotateLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Reduced motion OR a low-tier device: the wordmark holds still (the idle
    // logo animation is decorative, never load-bearing).
    if (getSettingsSync().reducedMotion || shouldSimplifyAnimations()) {
      bounceAnim.setValue(0);
      rotateAnim.setValue(0);
      return;
    }

    // The idle wordmark ages with the descent: bright days keep the lively
    // 1500ms bob of a healthy 3px, the reveal slows to a near-still ~2600ms
    // breath of ~1px. It never fully stops (a frozen logo reads as a crash),
    // but the candy bounce cools like everything else.
    const bounceMs = phase >= 4 ? 2600 : phase >= 3 ? 2200 : phase >= 2 ? 1900 : 1500;
    const bounceAmp = phase >= 4 ? -1 : phase >= 3 ? -1.5 : phase >= 2 ? -2 : -3;
    const rotateMs = phase >= 3 ? 4200 : phase >= 2 ? 3600 : 3000;

    // Subtle bounce
    bounceLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: bounceAmp,
          duration: bounceMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: bounceMs,
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
          duration: rotateMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -1,
          duration: rotateMs,
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
  }, [phase, bounceAnim, rotateAnim]);

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
