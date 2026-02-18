import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { CandyColors, getPhaseTheme } from '../theme/colors';
import { DialoguePhase } from '../types/homeWorld';
import {
  getPitScreenTitle,
  getPitScreenSubtitle,
  getPitButtonLabel,
  getPitOfferAllLabel,
  getPitEmptyMessage,
  getPitOfferResultMessage,
  getPitHarvestLabel,
  getPitPendingAmberLabel,
} from '../services/phaseNarrative';
import {
  getHarvestState,
  offerBatch,
  offerAllBatches,
  HarvestBatch,
  HarvestState,
  HarvestSummary,
} from '../services/wordHarvest';
import { awardBonusAmber } from '../services/amberCurrency';
import { getSettingsSync } from '../services/settings';
import { hapticLight, hapticMedium } from '../services/haptics';

interface OfferingPitScreenProps {
  phase: DialoguePhase;
  amberBalance: number;
  onClose: () => void;
  onAmberChange?: (newBalance: number) => void;
}

export const OfferingPitScreen: React.FC<OfferingPitScreenProps> = ({
  phase,
  amberBalance,
  onClose,
  onAmberChange,
}) => {
  const phaseTheme = getPhaseTheme(phase);
  const [harvestState, setHarvestState] = useState<HarvestState | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isOffering, setIsOffering] = useState(false);
  const pitPulse = useRef(new Animated.Value(1)).current;
  const pitPulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    const settings = getSettingsSync();
    if (settings?.reducedMotion) return;

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pitPulse, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
        Animated.timing(pitPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    pitPulseLoop.current = anim;
    anim.start();

    return () => {
      anim.stop();
    };
  }, [pitPulse]);

  const loadState = useCallback(async () => {
    const state = await getHarvestState();
    setHarvestState(state);
  }, []);

  const handleOfferBatch = useCallback(async (batchId: string) => {
    if (isOffering) return;
    setIsOffering(true);
    try {
      const result = await offerBatch(batchId);
      if (!result) {
        setIsOffering(false);
        return;
      }

      // Credit amber to spendable balance
      const newBalance = await awardBonusAmber(result.amberAwarded, 'word_offering');
      onAmberChange?.(newBalance);

      hapticLight();
      setResultMessage(
        getPitOfferResultMessage(phase, result.wordsOffered, result.amberAwarded)
      );
      await loadState();
    } finally {
      setIsOffering(false);
    }
  }, [isOffering, phase, onAmberChange, loadState]);

  const handleOfferAll = useCallback(async () => {
    if (isOffering || !harvestState || harvestState.pendingBatches.length === 0) return;
    setIsOffering(true);
    try {
      const result = await offerAllBatches();

      // Credit amber to spendable balance
      if (result.amberAwarded > 0) {
        const newBalance = await awardBonusAmber(result.amberAwarded, 'word_offering');
        onAmberChange?.(newBalance);
      }

      hapticMedium();
      setResultMessage(
        getPitOfferResultMessage(phase, result.wordsOffered, result.amberAwarded)
      );
      await loadState();
    } finally {
      setIsOffering(false);
    }
  }, [isOffering, harvestState, phase, onAmberChange, loadState]);

  if (!harvestState) return null;

  const pendingBatches = harvestState.pendingBatches;
  const pendingAmber = pendingBatches.reduce((sum, b) => sum + b.amberValue, 0);
  const pendingWords = pendingBatches.reduce((sum, b) => sum + b.words.length, 0);
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 50;

  return (
    <View style={[styles.container, { backgroundColor: phaseTheme.bgPrimary }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: statusBarHeight }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            hapticLight();
            onClose();
          }}
          accessibilityLabel="Return home"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>{'\u2190'} Home</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: phaseTheme.victoryTitleColor }]}>
          {getPitScreenTitle(phase)}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: phaseTheme.modalSecondaryTextColor }]}>
          {getPitScreenSubtitle(phase)}
        </Text>

        {/* Pit Visual */}
        <Animated.View style={[
          styles.pitVisual,
          {
            backgroundColor: phase >= 3 ? '#1A0A2E' : phase >= 2 ? '#2E1A50' : '#4A2E8A',
            borderColor: phase >= 3 ? '#8B1A3A' : phase >= 2 ? '#6B3FA0' : '#9B6FCF',
            transform: [{ scale: pitPulse }],
          },
        ]}>
          <Text style={styles.pitEmoji}>{phase >= 3 ? '\uD83D\uDD73\uFE0F' : '\u2B55'}</Text>
          {pendingBatches.length > 0 && (
            <Text style={[styles.pitCount, { color: phase >= 3 ? '#C04060' : '#D4A0FF' }]}>
              {pendingWords} {getPitHarvestLabel(phase).toLowerCase()}
            </Text>
          )}
        </Animated.View>

        {/* Summary Stats */}
        <View style={[styles.summaryRow, { backgroundColor: phaseTheme.modalStatBgColor }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: phaseTheme.modalTextColor }]}>
              {'\uD83D\uDC8E'} {pendingAmber}
            </Text>
            <Text style={[styles.summaryLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
              {getPitPendingAmberLabel(phase)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: phaseTheme.modalDividerColor }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: phaseTheme.modalTextColor }]}>
              {harvestState.totalWordsOffered}
            </Text>
            <Text style={[styles.summaryLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
              Lifetime offered
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: phaseTheme.modalDividerColor }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: phaseTheme.modalTextColor }]}>
              {'\uD83D\uDC8E'} {amberBalance}
            </Text>
            <Text style={[styles.summaryLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
              Spendable
            </Text>
          </View>
        </View>

        {/* Result Message */}
        {resultMessage && (
          <View style={[styles.resultContainer, {
            backgroundColor: phase >= 3 ? 'rgba(139, 26, 58, 0.2)' : 'rgba(139, 92, 246, 0.15)',
            borderColor: phase >= 3 ? 'rgba(139, 26, 58, 0.4)' : 'rgba(139, 92, 246, 0.3)',
          }]}>
            <Text style={[styles.resultText, { color: phaseTheme.modalTextColor }]}>
              {resultMessage}
            </Text>
            <TouchableOpacity
              onPress={() => setResultMessage(null)}
              accessibilityLabel="Dismiss message"
            >
              <Text style={styles.resultDismiss}>OK</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Offer All CTA */}
        {pendingBatches.length > 0 && (
          <TouchableOpacity
            style={[styles.offerAllButton, {
              backgroundColor: phase >= 3 ? '#8B1A3A' : CandyColors.pink.main,
              opacity: isOffering ? 0.6 : 1,
            }]}
            onPress={handleOfferAll}
            disabled={isOffering}
            accessibilityLabel={`${getPitOfferAllLabel(phase)}: ${pendingAmber} amber from ${pendingWords} words`}
            accessibilityRole="button"
          >
            <Text style={styles.offerAllButtonText}>
              {getPitOfferAllLabel(phase)} ({'\uD83D\uDC8E'} {pendingAmber})
            </Text>
          </TouchableOpacity>
        )}

        {/* Empty State */}
        {pendingBatches.length === 0 && !resultMessage && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: phaseTheme.modalSecondaryTextColor }]}>
              {getPitEmptyMessage(phase)}
            </Text>
          </View>
        )}

        {/* Batch List */}
        {pendingBatches.map(batch => (
          <View
            key={batch.id}
            style={[styles.batchCard, {
              backgroundColor: phaseTheme.modalBgColor,
              borderColor: phaseTheme.modalDividerColor,
            }]}
          >
            <View style={styles.batchHeader}>
              <Text style={[styles.batchDifficulty, { color: phaseTheme.modalSecondaryTextColor }]}>
                {batch.difficulty} {'⭐'.repeat(batch.stars)}
              </Text>
              <Text style={[styles.batchAmber, { color: phaseTheme.victoryTitleColor }]}>
                {'\uD83D\uDC8E'} {batch.amberValue}
              </Text>
            </View>
            <View style={styles.batchWords}>
              {batch.words.map((word, i) => (
                <Text
                  key={i}
                  style={[styles.batchWord, {
                    color: phaseTheme.modalTextColor,
                    backgroundColor: phase >= 3
                      ? 'rgba(139, 26, 58, 0.15)'
                      : 'rgba(139, 92, 246, 0.1)',
                  }]}
                >
                  {word}
                </Text>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.offerBatchButton, {
                backgroundColor: phase >= 3 ? '#5A1028' : CandyColors.purple.dark,
                opacity: isOffering ? 0.6 : 1,
              }]}
              onPress={() => handleOfferBatch(batch.id)}
              disabled={isOffering}
              accessibilityLabel={`${getPitButtonLabel(phase)} ${batch.words.length} words for ${batch.amberValue} amber`}
              accessibilityRole="button"
            >
              <Text style={styles.offerBatchButtonText}>
                {getPitButtonLabel(phase)}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  pitVisual: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  pitEmoji: {
    fontSize: 48,
  },
  pitCount: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    borderRadius: 1,
  },
  resultContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 20,
  },
  resultDismiss: {
    fontSize: 14,
    fontWeight: '800',
    color: CandyColors.pink.main,
  },
  offerAllButton: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignSelf: 'center',
    marginBottom: 20,
    shadowColor: CandyColors.pink.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  offerAllButtonText: {
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  batchCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  batchDifficulty: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  batchAmber: {
    fontSize: 16,
    fontWeight: '900',
  },
  batchWords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  batchWord: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  offerBatchButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-end',
  },
  offerBatchButtonText: {
    color: CandyColors.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomPadding: {
    height: 40,
  },
});
