import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { PIXEL_FONT_BOLD } from '../theme/fonts';
import { getPixelSkin, CARD_CORNER_DP, CARD_EDGE_DP } from '../theme/pixelSkin.generated';
import { NineSliceFrame } from './ui/NineSlice';
import { Achievement, ACHIEVEMENT_CATEGORY_ICONS } from '../services/achievements';
import { AmberInline } from './AmberInline';
import { getSettingsSync } from '../services/settings';
import { announceForA11y } from '../services/a11yAnnounce';
import { FONT_SIZE } from '../theme/typeScale';

/**
 * Phase-aware entrance spring (local, since the shared token file is out of this
 * pass's scope): the toast settles harder as the world darkens. Bright phases
 * keep the original soft overshoot; the dark phases land heavier with no bounce.
 */
function getToastInSpring(phase: number): { friction: number; tension: number } {
  if (phase >= 4) return { friction: 10, tension: 48 };
  if (phase >= 3) return { friction: 8, tension: 55 };
  return { friction: 8, tension: 60 };
}

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
      // Cross-platform screen-reader announce (accessibilityLiveRegion below is
      // Android-only; announceForA11y is a no-op when no reader is running).
      announceForA11y(
        `Achievement unlocked: ${achievement.title}. ${achievement.description}.${achievement.rewardAmber > 0 ? ` Earned ${achievement.rewardAmber} amber.` : ''}`,
      );
      const reducedMotion = getSettingsSync().reducedMotion;
      let entrance: Animated.CompositeAnimation | null = null;
      let exit: Animated.CompositeAnimation | null = null;

      if (reducedMotion) {
        // Pin end states: visible immediately, no slide.
        slideAnim.setValue(0);
        opacityAnim.setValue(1);
      } else {
        // Slide in — the spring ages with the phase (see getToastInSpring).
        const inSpring = getToastInSpring(phase);
        entrance = Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: inSpring.friction,
            tension: inSpring.tension,
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
          <Image
            source={ACHIEVEMENT_CATEGORY_ICONS[achievement.category]}
            style={styles.icon}
            resizeMode="contain"
          />
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
    paddingVertical: 12,
    paddingHorizontal: SURFACE.cardPadX,
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
    width: 26,
    height: 26,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: FONT_SIZE.caption,
    fontWeight: '800',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: SURFACE.sectionLetterSpacing,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: FONT_SIZE.large,
    fontWeight: '900',
    fontFamily: PIXEL_FONT_BOLD,
    marginTop: 2,
  },
  reward: {
    fontSize: FONT_SIZE.callout,
    fontWeight: '900',
    fontFamily: PIXEL_FONT_BOLD,
    marginLeft: 8,
  },
});
