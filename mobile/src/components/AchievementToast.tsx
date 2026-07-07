import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { getPixelSkin, CARD_CORNER_DP, CARD_EDGE_DP } from '../theme/pixelSkin.generated';
import { NineSliceFrame } from './ui/NineSlice';
import { Achievement } from '../services/achievements';
import { AmberInline } from './AmberInline';
import { getSettingsSync } from '../services/settings';

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
  phase?: number;
}

/**
 * Animated toast that slides in from the top when an achievement is unlocked.
 * Auto-dismisses after 3 seconds. Cottage pixel card frame (9-slice wood +
 * parchment fill, inline since the banner itself is the animated element),
 * phase-aware via getSurfaceTheme/getPixelSkin. Reduced motion pins the end
 * states (no slide/fade).
 */
export const AchievementToast: React.FC<AchievementToastProps> = ({
  achievement,
  onDismiss,
  phase = 0,
}) => {
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (achievement) {
      const reducedMotion = getSettingsSync().reducedMotion;
      let entrance: Animated.CompositeAnimation | null = null;
      let exit: Animated.CompositeAnimation | null = null;

      if (reducedMotion) {
        // Pin end states: visible immediately, no slide.
        slideAnim.setValue(0);
        opacityAnim.setValue(1);
      } else {
        // Slide in
        entrance = Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]);
        entrance.start();
      }

      // Auto-dismiss
      const timeout = setTimeout(() => {
        if (reducedMotion) {
          slideAnim.setValue(-120);
          opacityAnim.setValue(0);
          onDismiss();
          return;
        }
        exit = Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -120,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]);
        exit.start(() => onDismiss());
      }, 3000);

      return () => {
        clearTimeout(timeout);
        entrance?.stop();
        exit?.stop();
      };
    }
  }, [achievement]);

  if (!achievement) return null;

  const t = getSurfaceTheme(phase);
  const skin = getPixelSkin(phase);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Achievement unlocked: ${achievement.title}. ${achievement.description}.${achievement.rewardAmber > 0 ? ` Earned ${achievement.rewardAmber} amber.` : ''}`}
    >
      <View style={styles.inner}>
        {/* Cottage pixel card frame (wood 9-slice + solid parchment fill). */}
        <NineSliceFrame
          skin={skin.card}
          cornerDp={CARD_CORNER_DP}
          edgeDp={CARD_EDGE_DP}
          fillColor={skin.fillCard}
        />
        <View style={[styles.iconBadge, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}>
          <Text style={styles.icon}>{achievement.icon}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.label, { color: t.muted }]}>Achievement Unlocked!</Text>
          <Text style={[styles.title, { color: t.title }]}>{achievement.title}</Text>
        </View>
        {achievement.rewardAmber > 0 && (
          <Text style={[styles.reward, { color: t.amberText }]}>
            +{achievement.rewardAmber} <AmberInline size={14} />
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    overflow: 'hidden',
    shadowColor: 'rgba(10, 6, 24, 1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: SURFACE.sectionLetterSpacing,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  reward: {
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 8,
  },
});
