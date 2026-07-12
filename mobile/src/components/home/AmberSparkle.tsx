import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { BODY_FONT } from '../../theme/fonts';
import { shouldFreezePlayStoreCaptureMotion } from '../../dev/playStoreCapture';

export const AmberSparkle: React.FC = () => {
  const freezeCaptureMotion = shouldFreezePlayStoreCaptureMotion();
  const sparkles = useRef(
    [...Array(5)].map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (freezeCaptureMotion) return;
    sparkles.forEach((sparkle, i) => {
      const animate = () => {
        sparkle.x.setValue(Math.random() * 30 - 15);
        sparkle.y.setValue(0);
        sparkle.opacity.setValue(0);
        sparkle.scale.setValue(0.5);

        Animated.parallel([
          Animated.timing(sparkle.y, {
            toValue: -20 - Math.random() * 10,
            duration: 1000,
            useNativeDriver: true,
            delay: i * 200,
          }),
          Animated.sequence([
            Animated.timing(sparkle.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
              delay: i * 200,
            }),
            Animated.timing(sparkle.opacity, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          Animated.spring(sparkle.scale, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
            delay: i * 200,
          }),
        ]).start(() => animate());
      };
      animate();
    });
  }, [freezeCaptureMotion, sparkles]);

  return (
    <View style={{ position: 'absolute', top: -5, right: 0 }}>
      {sparkles.map((sparkle, i) => (
        <Animated.Text
          key={i}
          style={{
            fontFamily: BODY_FONT,
            position: 'absolute',
            fontSize: 8,
            transform: [
              { translateX: sparkle.x },
              { translateY: sparkle.y },
              { scale: sparkle.scale },
            ],
            opacity: sparkle.opacity,
          }}
        >
          ✨
        </Animated.Text>
      ))}
    </View>
  );
};
