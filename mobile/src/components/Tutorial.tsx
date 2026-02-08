import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CandyColors } from '../theme/colors';

const TUTORIAL_KEY = 'wordshift_tutorial_completed';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TutorialProps {
  onComplete: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
  emoji: string;
  detail: string;
}

const STEPS: TutorialStep[] = [
  {
    title: 'Welcome to WordShift!',
    emoji: '🧩',
    description: 'A word puzzle where you shift letters between words to create new ones.',
    detail: 'Each puzzle is a chain of words. Move a letter from one word to the next — both must stay valid English words!',
  },
  {
    title: 'Pick a Letter',
    emoji: '👆',
    description: 'Tap any colorful letter tile in the highlighted row.',
    detail: 'The active row glows purple. Tap a letter to pick it up — it will bounce to show it\'s selected.',
  },
  {
    title: 'Drop it Down',
    emoji: '⬇️',
    description: 'Tap a + slot in the row below to place your letter.',
    detail: 'Slots appear between letters like a fan. Pick the right spot so both the shrinking word and growing word are real words!',
  },
  {
    title: 'Complete the Chain',
    emoji: '🔗',
    description: 'Work through every row to finish the puzzle.',
    detail: 'Easy = 3 rows, Medium = 4 rows, Hard = 5 rows with longer words. Earn stars based on how few hints and mistakes you need!',
  },
  {
    title: 'Build Your House',
    emoji: '🏠',
    description: 'Earn amber from puzzles to unlock rooms and animal friends.',
    detail: 'Each animal has a unique personality with evolving dialogue. Complete puzzles, earn amber, grow your house — and discover where the story leads...',
  },
];

/**
 * Check if tutorial has been completed
 */
export async function hasTutorialCompleted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(TUTORIAL_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark tutorial as completed
 */
export async function markTutorialCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
  } catch {}
}

/**
 * Reset tutorial state (for testing)
 */
export async function resetTutorial(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TUTORIAL_KEY);
  } catch {}
}

export const Tutorial: React.FC<TutorialProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animateToStep = (nextStep: number) => {
    // Slide out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(nextStep);
      slideAnim.setValue(30);

      // Slide in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 10,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      animateToStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    await markTutorialCompleted();
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onComplete());
  };

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <Animated.View style={[styles.overlay, { opacity: scaleAnim }]}>
      <Animated.View
        style={[
          styles.card,
          {
            opacity: fadeAnim,
            transform: [
              { translateX: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentStep && styles.dotActive,
                i < currentStep && styles.dotCompleted,
              ]}
            />
          ))}
        </View>

        {/* Emoji */}
        <Text style={styles.emoji}>{step.emoji}</Text>

        {/* Title */}
        <Text style={styles.title}>{step.title}</Text>

        {/* Description */}
        <Text style={styles.description}>{step.description}</Text>

        {/* Detail */}
        <View style={styles.detailBox}>
          <Text style={styles.detail}>{step.detail}</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => animateToStep(currentStep - 1)}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextBtn, isLast && styles.nextBtnFinal]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>
              {isLast ? "Let's Play!" : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Skip */}
        <TouchableOpacity style={styles.skipBtn} onPress={handleComplete}>
          <Text style={styles.skipBtnText}>
            {isLast ? '' : 'Skip Tutorial'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(76, 29, 149, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    padding: 24,
  },
  card: {
    backgroundColor: CandyColors.white,
    borderRadius: 32,
    padding: 32,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CandyColors.gray[200],
  },
  dotActive: {
    backgroundColor: CandyColors.purple.main,
    width: 24,
  },
  dotCompleted: {
    backgroundColor: CandyColors.purple.light,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: CandyColors.purple.main,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    color: CandyColors.gray[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  detailBox: {
    backgroundColor: CandyColors.gray[50],
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  detail: {
    fontSize: 14,
    color: CandyColors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  backBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: CandyColors.gray[200],
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: CandyColors.gray[600],
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: CandyColors.purple.main,
    alignItems: 'center',
    shadowColor: CandyColors.purple.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnFinal: {
    backgroundColor: CandyColors.green.main,
    shadowColor: CandyColors.green.main,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: CandyColors.white,
    letterSpacing: 1,
  },
  skipBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  skipBtnText: {
    fontSize: 13,
    color: CandyColors.gray[400],
  },
});
