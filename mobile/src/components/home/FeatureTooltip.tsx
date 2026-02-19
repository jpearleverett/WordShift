import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { CandyColors } from '../../theme/colors';
import { getSettingsSync } from '../../services/settings';

interface FeatureTooltipProps {
  text: string;
  position: { top?: number; left?: number; bottom?: number; right?: number };
  arrowDirection: 'up' | 'down';
  onDismiss: () => void;
  phase: number;
}

export function FeatureTooltip({
  text,
  position,
  arrowDirection,
  onDismiss,
  phase,
}: FeatureTooltipProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (getSettingsSync().reducedMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const bgColor = phase >= 3 ? '#2A2040' : CandyColors.white;
  const textColor = phase >= 3 ? '#C0A8D8' : '#5A4080';
  const arrowColor = bgColor;

  return (
    <TouchableWithoutFeedback onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss tooltip">
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.container,
            { opacity, transform: [{ translateY }] },
            position,
          ]}
        >
          {arrowDirection === 'up' && (
            <View style={[styles.arrowUp, { borderBottomColor: arrowColor }]} />
          )}
          <View style={[styles.bubble, { backgroundColor: bgColor }]}>
            <Text style={[styles.text, { color: textColor }]}>{text}</Text>
          </View>
          {arrowDirection === 'down' && (
            <View style={[styles.arrowDown, { borderTopColor: arrowColor }]} />
          )}
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 1000,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    maxWidth: 220,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  arrowUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: -1,
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
