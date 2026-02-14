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
} from 'react-native';
import { CandyColors } from '../theme/colors';
import { getSettingsSync } from '../services/settings';

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
  position?: 'bottom' | 'top' | 'middle';
  /** Optional absolute positioning override for context-aware placement */
  anchorStyle?: { top?: number; bottom?: number; left?: number; right?: number };
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
  anchorStyle,
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
  const isMiddle = position === 'middle';
  const resolvedPositionStyle = anchorStyle || (isTop ? styles.containerTop : isMiddle ? styles.containerMiddle : styles.containerBottom);

  return (
    <Animated.View
      style={[
        styles.container,
        resolvedPositionStyle,
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
  containerMiddle: {
    top: 220,
  },
  guideCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 16, 44, 0.95)',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(190, 145, 255, 0.28)',
  },
  foxContainer: {
    width: 58,
    height: 58,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foxImage: {
    width: 58,
    height: 58,
  },
  foxEmoji: {
    fontSize: 40,
  },
  speechArea: {
    flex: 1,
  },
  speechBubble: {
    backgroundColor: 'rgba(248, 244, 255, 0.97)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingLeft: 14,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(128, 83, 210, 0.24)',
  },
  speechAccentBar: {
    position: 'absolute',
    left: 0,
    top: 5,
    bottom: 5,
    width: 2,
    borderRadius: 2,
    backgroundColor: CandyColors.purple.light,
    opacity: 0.85,
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
    color: '#3D3158',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 7,
    gap: 10,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipButtonText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.62)',
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#7A49D8',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 14,
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
    fontSize: 13,
    fontWeight: '800',
    color: CandyColors.white,
    letterSpacing: 0.4,
  },
});

export default FoxGuide;
