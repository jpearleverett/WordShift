import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { CandyColors, getPhaseTheme } from '../theme/colors';
import { DialoguePhase } from '../types/homeWorld';
import {
  getHarvestState,
  getPendingHarvestSummary,
  offerBatch,
  offerAllBatches,
  HarvestBatch,
  HarvestState,
  HarvestSummary,
} from '../services/wordHarvest';
import { awardBonusAmber } from '../services/amberCurrency';
import {
  getPitScreenTitle,
  getPitScreenSubtitle,
  getPitButtonLabel,
  getPitOfferAllLabel,
  getPitEmptyMessage,
  getPitOfferResultMessage,
  getPitLifetimeLabel,
} from '../services/phaseNarrative';
import { getSettingsSync } from '../services/settings';
import { hapticLight, hapticMedium, hapticSuccess } from '../services/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOP_INSET = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 50;

interface OfferingPitScreenProps {
  onGoHome: () => void;
  phase: DialoguePhase;
  onAmberChange?: (newBalance: number) => void;
}

export const OfferingPitScreen: React.FC<OfferingPitScreenProps> = ({
  onGoHome,
  phase,
  onAmberChange,
}) => {
  const phaseTheme = getPhaseTheme(phase);
  const [harvestState, setHarvestState] = useState<HarvestState | null>(null);
  const [summary, setSummary] = useState<HarvestSummary>({ pendingAmber: 0, pendingWords: 0, pendingBatches: 0 });
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  // Pit visual animation
  const pitPulse = useRef(new Animated.Value(1)).current;
  const pitGlow = useRef(new Animated.Value(0.3)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    const [state, sum] = await Promise.all([
      getHarvestState(),
      getPendingHarvestSummary(),
    ]);
    setHarvestState(state);
    setSummary(sum);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pit breathing animation
  useEffect(() => {
    const settings = getSettingsSync();
    if (settings.reducedMotion) return;

    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pitPulse, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pitPulse, { toValue: 1.0, duration: 2000, useNativeDriver: true }),
      ])
    );
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pitGlow, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
        Animated.timing(pitGlow, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ])
    );

    pulseAnim.start();
    glowAnim.start();

    return () => {
      pulseAnim.stop();
      glowAnim.stop();
    };
  }, [pitPulse, pitGlow]);

  const showResult = useCallback((msg: string) => {
    setResultMessage(msg);
    resultOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(resultOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setResultMessage(null));
  }, [resultOpacity]);

  const handleOfferBatch = useCallback(async (batchId: string) => {
    hapticMedium();
    const result = await offerBatch(batchId);
    if (!result) return;

    // Credit amber through trusted path
    const newBalance = await awardBonusAmber(result.amberAwarded, 'word_offering');
    onAmberChange?.(newBalance);

    setSummary(result.remainingSummary);
    showResult(getPitOfferResultMessage(phase, result.wordsOffered, result.amberAwarded));
    await loadData();
  }, [phase, onAmberChange, showResult, loadData]);

  const handleOfferAll = useCallback(async () => {
    if (summary.pendingBatches === 0) return;
    hapticSuccess();
    const result = await offerAllBatches();

    if (result.amberAwarded > 0) {
      const newBalance = await awardBonusAmber(result.amberAwarded, 'word_offering');
      onAmberChange?.(newBalance);
    }

    setSummary(result.remainingSummary);
    showResult(getPitOfferResultMessage(phase, result.wordsOffered, result.amberAwarded));
    await loadData();
  }, [phase, summary.pendingBatches, onAmberChange, showResult, loadData]);

  const pitColor = phase >= 3 ? '#8B0000' : phase >= 2 ? '#4A2080' : '#9333EA';
  const pitBorderColor = phase >= 3 ? 'rgba(139, 0, 0, 0.5)' : phase >= 2 ? 'rgba(74, 32, 128, 0.5)' : 'rgba(147, 51, 234, 0.3)';

  return (
    <View style={[styles.container, { backgroundColor: phaseTheme.backgroundColor, paddingTop: TOP_INSET }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => { hapticLight(); onGoHome(); }}
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

      <Text style={[styles.subtitle, { color: phaseTheme.modalSecondaryTextColor || '#999' }]}>
        {getPitScreenSubtitle(phase)}
      </Text>

      {/* Pit Visual */}
      <View style={styles.pitContainer}>
        <Animated.View style={[
          styles.pitOuter,
          {
            borderColor: pitBorderColor,
            transform: [{ scale: pitPulse }],
          },
        ]}>
          <Animated.View style={[
            styles.pitInner,
            {
              backgroundColor: pitColor,
              opacity: pitGlow,
            },
          ]} />
          <View style={[styles.pitCore, { backgroundColor: pitColor }]}>
            <Text style={styles.pitEmoji}>
              {phase >= 3 ? '\uD83D\uDD73\uFE0F' : phase >= 2 ? '\uD83C\uDF00' : '\uD83C\uDF3B'}
            </Text>
          </View>
        </Animated.View>

        {/* Pending summary above pit */}
        {summary.pendingBatches > 0 && (
          <View style={styles.pendingSummary}>
            <Text style={[styles.pendingAmberText, { color: phaseTheme.victoryTitleColor }]}>
              {'\uD83D\uDC8E'} {summary.pendingAmber} pending
            </Text>
            <Text style={[styles.pendingWordsText, { color: phaseTheme.modalSecondaryTextColor || '#aaa' }]}>
              {summary.pendingWords} words in {summary.pendingBatches} {summary.pendingBatches === 1 ? 'batch' : 'batches'}
            </Text>
          </View>
        )}
      </View>

      {/* Result message */}
      {resultMessage && (
        <Animated.View style={[styles.resultContainer, { opacity: resultOpacity }]}>
          <Text style={[styles.resultText, { color: phaseTheme.victoryTitleColor }]}>
            {resultMessage}
          </Text>
        </Animated.View>
      )}

      {/* Offer All CTA */}
      {summary.pendingBatches > 0 && (
        <TouchableOpacity
          style={[styles.offerAllButton, { backgroundColor: pitColor }]}
          onPress={handleOfferAll}
          accessibilityLabel={`${getPitOfferAllLabel(phase, summary.pendingWords, summary.pendingAmber)}: ${summary.pendingAmber} amber from ${summary.pendingWords} words`}
          accessibilityRole="button"
        >
          <Text style={styles.offerAllButtonText}>
            {getPitOfferAllLabel(phase, summary.pendingWords, summary.pendingAmber)} ({'\uD83D\uDC8E'} {summary.pendingAmber})
          </Text>
        </TouchableOpacity>
      )}

      {/* Batch list or empty message */}
      {summary.pendingBatches === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: phaseTheme.modalSecondaryTextColor || '#888' }]}>
            {getPitEmptyMessage(phase)}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.batchList}
          contentContainerStyle={styles.batchListContent}
          showsVerticalScrollIndicator={false}
        >
          {harvestState?.pendingBatches.map(batch => (
            <View
              key={batch.id}
              style={[styles.batchCard, {
                backgroundColor: phase >= 3 ? 'rgba(40, 10, 20, 0.6)' : 'rgba(255,255,255,0.1)',
                borderColor: pitBorderColor,
              }]}
            >
              <View style={styles.batchInfo}>
                <Text style={[styles.batchWords, { color: phaseTheme.victoryTitleColor }]}>
                  {batch.words.join(' \u00B7 ')}
                </Text>
                <Text style={[styles.batchMeta, { color: phaseTheme.modalSecondaryTextColor || '#aaa' }]}>
                  {batch.difficulty} \u00B7 {batch.stars}{'\u2B50'} \u00B7 {'\uD83D\uDC8E'} {batch.amberValue}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.batchOfferButton, { backgroundColor: pitColor }]}
                onPress={() => handleOfferBatch(batch.id)}
                accessibilityLabel={`${getPitButtonLabel(phase)} ${batch.words.length} words for ${batch.amberValue} amber`}
                accessibilityRole="button"
              >
                <Text style={styles.batchOfferButtonText}>{getPitButtonLabel(phase)}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Lifetime stats */}
      {harvestState && harvestState.totalWordsOffered > 0 && (
        <View style={styles.lifetimeContainer}>
          <Text style={[styles.lifetimeText, { color: phaseTheme.modalSecondaryTextColor || '#777' }]}>
            {getPitLifetimeLabel(phase)}: {harvestState.totalWordsOffered} \u00B7 {'\uD83D\uDC8E'} {harvestState.totalAmberClaimed} claimed
          </Text>
        </View>
      )}
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
    paddingVertical: 8,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 60,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  pitContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  pitOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pitInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
  },
  pitCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pitEmoji: {
    fontSize: 40,
  },
  pendingSummary: {
    alignItems: 'center',
    marginTop: 12,
  },
  pendingAmberText: {
    fontSize: 20,
    fontWeight: '900',
  },
  pendingWordsText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  resultContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  offerAllButton: {
    marginHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  offerAllButtonText: {
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  batchList: {
    flex: 1,
    marginHorizontal: 16,
  },
  batchListContent: {
    paddingBottom: 24,
  },
  batchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  batchInfo: {
    flex: 1,
    marginRight: 8,
  },
  batchWords: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  batchMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  batchOfferButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  batchOfferButtonText: {
    color: CandyColors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  lifetimeContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  lifetimeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
