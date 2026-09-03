import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { getPhaseTheme } from '../../theme/colors';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  color: string;
}

export const CelebrationConfetti: React.FC<{ onComplete: () => void; phase?: number }> = ({ onComplete, phase = 0 }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  // The callers hand us an inline arrow, so listing onComplete in the deps made
  // the effect's identity change on every parent render. A character purchase
  // renders home every 300ms (the intro card's mouth-flap interval), which is
  // shorter than the 2500ms completion timer, so the burst relaunched ~3x/sec
  // and never completed for as long as the new friend's intro was open. Hold
  // the callback in a ref and key the effect on the phase alone.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Reduced-motion / low-tier: no confetti storm, just resolve the callback so
    // the celebration flow continues (the unlock still lands, minus the shower).
    if (getSettingsSync().reducedMotion || shouldSimplifyAnimations()) {
      const t = setTimeout(() => onCompleteRef.current(), 400);
      return () => clearTimeout(t);
    }
    // Phase-source the palette so late-game unlocks (the descent trio at 84/88/
    // 92, house completion ~96-100) rain the muted crimson/ash of the reveal,
    // not bright candy over the near-black world.
    const colors = getPhaseTheme(phase).confettiColors;
    const newPieces: ConfettiPiece[] = [];
    // Keep every driver we start so a legitimate re-run (a phase change mid
    // celebration) or an unmount stops them instead of orphaning ~150 natives.
    const running: Animated.CompositeAnimation[] = [];

    for (let i = 0; i < 30; i++) {
      const startX = SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 100;
      const piece: ConfettiPiece = {
        id: i,
        x: new Animated.Value(startX),
        y: new Animated.Value(SCREEN_HEIGHT / 2),
        rotation: new Animated.Value(0),
        scale: new Animated.Value(0),
        opacity: new Animated.Value(1),
        color: colors[Math.floor(Math.random() * colors.length)],
      };
      newPieces.push(piece);

      const targetX = startX + (Math.random() - 0.5) * 300;
      const targetY = SCREEN_HEIGHT + 100;

      const anim = Animated.parallel([
        Animated.timing(piece.x, {
          toValue: targetX,
          duration: 2000 + Math.random() * 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(piece.y, {
          toValue: targetY,
          duration: 2000 + Math.random() * 1000,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(piece.rotation, {
          toValue: Math.random() * 720 - 360,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(piece.scale, {
            toValue: 1 + Math.random() * 0.5,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.timing(piece.opacity, {
            toValue: 0,
            duration: 500,
            delay: 1500,
            useNativeDriver: true,
          }),
        ]),
      ]);
      running.push(anim);
      anim.start();
    }

    setPieces(newPieces);

    const timeout = setTimeout(() => onCompleteRef.current(), 2500);
    return () => {
      clearTimeout(timeout);
      running.forEach(a => a.stop());
    };
  }, [phase]);

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map(piece => {
        const rotate = piece.rotation.interpolate({
          inputRange: [-360, 360],
          outputRange: ['-360deg', '360deg'],
        });
        return (
          <Animated.View
            key={piece.id}
            style={[
              styles.piece,
              {
                backgroundColor: piece.color,
                transform: [
                  { translateX: piece.x },
                  { translateY: piece.y },
                  { rotate },
                  { scale: piece.scale },
                ],
                opacity: piece.opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  piece: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});
