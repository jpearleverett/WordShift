import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Dimensions,
} from 'react-native';
import { CandyColors } from '../theme/colors';
import { getSettingsSync } from '../services/settings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Fox talk sprite with fallback
let foxTalkSprite: ImageSourcePropType | null = null;
try {
  foxTalkSprite = require('../../assets/characters/fox/talk.png');
} catch {
  foxTalkSprite = null;
}

interface FoxGuideProps {
  /** Whether the guide is visible */
  visible: boolean;
  /** The text Fox says */
  text: string;
  /** Button label (defaults to "Continue") */
  buttonText?: string;
  /** Called when the player taps the button */
  onContinue?: () => void;
  /** Position on screen */
  position?: 'bottom' | 'top';
  /** Whether to show the skip button */
  showSkip?: boolean;
  /** Called when skip is tapped */
  onSkip?: () => void;
  /** Whether Fox should animate (bounce) */
  speaking?: boolean;
}

/**
 * FoxGuide — a floating Fox speech bubble overlay used during onboarding.
 * Appears at the bottom (or top) of any screen to guide the player.
 */
export const FoxGuide: React.FC<FoxGuideProps> = ({
  visible,
  text,
  buttonText = 'Continue',
  onContinue,
  position = 'bottom',
  showSkip = false,
  onSkip,
  speaking = true,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;
  const reducedMotion = getSettingsSync().reducedMotion;

  // Show/hide animation
  useEffect(() => {
    if (reducedMotion) {
      fadeAnim.setValue(visible ? 1 : 0);
      slideAnim.setValue(visible ? 0 : 30);
      return;
    }
    if (visible) {
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Fox bounce when speaking
  useEffect(() => {
    if (reducedMotion || !speaking || !visible) {
      bounceAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -4,
          duration: 300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [speaking, visible]);

  // Animate text changes
  useEffect(() => {
    if (reducedMotion) {
      textFadeAnim.setValue(1);
      return;
    }
    textFadeAnim.setValue(0);
    Animated.timing(textFadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [text]);

  if (!visible) return null;

  const isTop = position === 'top';

  return (
    <Animated.View
      style={[
        styles.container,
        isTop ? styles.containerTop : styles.containerBottom,
        {
          opacity: fadeAnim,
          transform: [{ translateY: Animated.multiply(slideAnim, isTop ? -1 : 1) }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.guideCard}>
        {/* Fox sprite */}
        <Animated.View
          style={[
            styles.foxContainer,
            { transform: [{ translateY: bounceAnim }] },
          ]}
        >
          {foxTalkSprite ? (
            <Image
              source={foxTalkSprite}
              style={styles.foxImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.foxEmoji}>🦊</Text>
          )}
        </Animated.View>

        {/* Speech content */}
        <View style={styles.speechArea}>
          <View style={styles.speechBubble}>
            <View style={styles.speechAccentBar} />
            <View style={styles.speechShine} />
            <Animated.Text
              style={[styles.speechText, { opacity: textFadeAnim }]}
            >
              {text}
            </Animated.Text>
          </View>

          {/* Action row */}
          <View style={styles.actionRow}>
            {showSkip && onSkip && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={onSkip}
                accessibilityLabel="Skip intro"
                accessibilityRole="button"
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            )}
            {onContinue && (
              <TouchableOpacity
                style={styles.continueButton}
                onPress={onContinue}
                accessibilityLabel={buttonText}
                accessibilityRole="button"
              >
                <View style={styles.continueButtonShine} />
                <Text style={styles.continueButtonText}>{buttonText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9000,
    paddingHorizontal: 16,
  },
  containerBottom: {
    bottom: 30,
  },
  containerTop: {
    top: 100,
  },
  guideCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(50, 20, 100, 0.94)',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  foxContainer: {
    width: 64,
    height: 64,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foxImage: {
    width: 64,
    height: 64,
  },
  foxEmoji: {
    fontSize: 40,
  },
  speechArea: {
    flex: 1,
  },
  speechBubble: {
    backgroundColor: 'rgba(245, 240, 255, 0.95)',
    borderRadius: 16,
    padding: 12,
    paddingLeft: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.15)',
  },
  speechAccentBar: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
    backgroundColor: CandyColors.purple.light,
    opacity: 0.7,
  },
  speechShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  speechText: {
    fontSize: 14,
    color: CandyColors.gray[700],
    lineHeight: 21,
    letterSpacing: 0.1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipButtonText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: CandyColors.purple.main,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: CandyColors.purple.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  continueButtonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: CandyColors.white,
    letterSpacing: 0.5,
  },
});

export default FoxGuide;
