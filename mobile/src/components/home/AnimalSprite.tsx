import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Animal, AnimalType, DialoguePhase } from '../../types/homeWorld';
import { ANIMAL_EMOJIS } from '../../services/homeWorldData';
import { CandyColors } from '../../theme/colors';

interface AnimalSpriteProps {
  animal: Animal;
  roomWidth: number;
  roomHeight: number;
  onPress: (animal: Animal) => void;
  currentPhase: DialoguePhase;
  isOnCooldown?: boolean;
}

// Animation speeds by animal type (slower = more movement time)
const MOVEMENT_SPEED: Record<AnimalType, number> = {
  red_panda: 3000,
  axolotl: 4000, // Floaty movement
  pangolin: 3500,
  sloth: 8000, // Very slow
  fennec_fox: 2000, // Quick and alert
  fox: 2500,
  owl: 3000,
  capybara: 5000, // Chill, slow
  wombat: 4000,
  rabbit: 1500, // Fast and nervous
};

// Bounce heights by animal type
const BOUNCE_HEIGHT: Record<AnimalType, number> = {
  red_panda: 3,
  axolotl: 2, // Subtle float
  pangolin: 2,
  sloth: 1, // Minimal bounce
  fennec_fox: 5,
  fox: 4,
  owl: 2,
  capybara: 1, // Very subtle
  wombat: 3,
  rabbit: 8, // Big hops
};

export const AnimalSprite: React.FC<AnimalSpriteProps> = ({
  animal,
  roomWidth,
  roomHeight,
  onPress,
  currentPhase,
  isOnCooldown = false,
}) => {
  const posX = useRef(new Animated.Value(animal.position.x)).current;
  const posY = useRef(new Animated.Value(animal.position.y)).current;
  const bounceY = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(1)).current;
  const notificationPulse = useRef(new Animated.Value(1)).current;

  const [isMoving, setIsMoving] = useState(false);

  // Walking animation - random movement within room bounds
  useEffect(() => {
    let movementTimeout: NodeJS.Timeout;
    let isMounted = true;

    const moveToRandomPosition = () => {
      if (!isMounted) return;

      // Random target position (20-80% of room to stay away from edges)
      const targetX = 20 + Math.random() * 60;
      const targetY = 20 + Math.random() * 60;

      // Determine direction for flip
      const currentX = (posX as any)._value || animal.position.x;
      const goingRight = targetX > currentX;

      // Flip direction
      Animated.timing(scaleX, {
        toValue: goingRight ? 1 : -1,
        duration: 150,
        useNativeDriver: true,
      }).start();

      setIsMoving(true);

      // Move to target
      Animated.parallel([
        Animated.timing(posX, {
          toValue: targetX,
          duration: MOVEMENT_SPEED[animal.type],
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: targetY,
          duration: MOVEMENT_SPEED[animal.type],
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMounted) {
          setIsMoving(false);
          // Wait before next movement (3-8 seconds)
          movementTimeout = setTimeout(moveToRandomPosition, 3000 + Math.random() * 5000);
        }
      });
    };

    // Start movement after initial delay
    movementTimeout = setTimeout(moveToRandomPosition, 1000 + Math.random() * 2000);

    return () => {
      isMounted = false;
      clearTimeout(movementTimeout);
    };
  }, [animal.type]);

  // Bounce animation while moving
  useEffect(() => {
    let bounceAnimation: Animated.CompositeAnimation;

    if (isMoving) {
      bounceAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceY, {
            toValue: -BOUNCE_HEIGHT[animal.type],
            duration: animal.type === 'rabbit' ? 150 : 250,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceY, {
            toValue: 0,
            duration: animal.type === 'rabbit' ? 150 : 250,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      bounceAnimation.start();
    } else {
      bounceY.setValue(0);
    }

    return () => {
      bounceAnimation?.stop();
    };
  }, [isMoving, animal.type]);

  // Notification pulse for new dialogue
  useEffect(() => {
    if (animal.hasNewDialogue) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(notificationPulse, {
            toValue: 1.3,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(notificationPulse, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    }
  }, [animal.hasNewDialogue]);

  // Get mood indicator color based on phase
  const getMoodColor = () => {
    switch (currentPhase) {
      case 0: return CandyColors.green.main;
      case 1: return CandyColors.yellow.main;
      case 2: return CandyColors.orange.main;
      case 3: return CandyColors.red.light;
      case 4: return CandyColors.purple.dark;
      default: return CandyColors.green.main;
    }
  };

  const translateX = posX.interpolate({
    inputRange: [0, 100],
    outputRange: [0, roomWidth - 60],
  });

  const translateY = posY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, roomHeight - 60],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX },
            { translateY },
            { translateY: bounceY },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => onPress(animal)}
        activeOpacity={0.8}
        style={styles.touchable}
      >
        <Animated.View
          style={[
            styles.spriteContainer,
            { transform: [{ scaleX }] },
          ]}
        >
          {/* Shadow */}
          <View style={styles.shadow} />

          {/* Animal body */}
          <View style={[styles.body, { borderColor: getMoodColor() }]}>
            <Text style={styles.emoji}>{ANIMAL_EMOJIS[animal.type]}</Text>
          </View>

          {/* New dialogue indicator - hidden when on cooldown */}
          {animal.hasNewDialogue && !isOnCooldown && (
            <Animated.View
              style={[
                styles.notificationBadge,
                { transform: [{ scale: notificationPulse }] },
              ]}
            >
              <Text style={styles.notificationText}>!</Text>
            </Animated.View>
          )}

          {/* Name tag */}
          <View style={styles.nameTag}>
            <Text style={styles.nameText}>{animal.name}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 10,
  },
  touchable: {
    padding: 5,
  },
  spriteContainer: {
    alignItems: 'center',
  },
  shadow: {
    position: 'absolute',
    bottom: 5,
    width: 40,
    height: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
  },
  body: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: CandyColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  emoji: {
    fontSize: 28,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: CandyColors.red.main,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: CandyColors.white,
    shadowColor: CandyColors.red.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  notificationText: {
    color: CandyColors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  nameTag: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
  },
  nameText: {
    color: CandyColors.white,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default AnimalSprite;
