import { useCountUp } from '../../hooks/useCountUp';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { DialoguePhase } from '../../types/homeWorld';
import { getSurfaceTheme } from '../../theme/surfaces';
import { getPixelSkin, PANEL_CORNER_DP, PANEL_EDGE_DP } from '../../theme/pixelSkin.generated';
import { BODY_FONT, BODY_FONT_ITALIC, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { FONT_SIZE } from '../../theme/typeScale';
import { NineSliceFrame } from './NineSlice';
import { CandyButton } from './CandyButton';
import { SpringIn } from './SpringIn';
import { countUpDisplayValue, getCountUpDurationMs } from './RewardReveal';
import { AmberInline } from '../AmberInline';
import { spendAmber } from '../../services/amberCurrency';
import {
  performSacrifice,
  getSacrificeStats,
  getSacrificeAmounts,
  getSacrificePrompt,
  getDevotionTier,
  getArrangementHoldsLine,
} from '../../services/sacrifice';
import { recordWhisper } from '../../services/whisperGallery';
import { updateQuestProgress } from '../../services/weeklyQuests';
import { hapticHeavy, hapticMedium } from '../../services/haptics';
import { playUiSound } from '../../services/uiSound';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';

// Phase-mood sprite (generateUiIcons candy-UI family): the altar's focal candle.
const CANDLE_ICON = require('../../../assets/ui/candle.png');

interface SacrificeModalProps {
  visible: boolean;
  phase: DialoguePhase;
  /** Live spendable amber balance. */
  amber: number;
  onAmberChange?: (newBalance: number) => void;
  onClose: () => void;
}

/**
 * "The Offering" altar (Phase 4+). Extracted from HomeScreen so the shared
 * utility menu's sacrifice row works identically on every surface that hosts
 * the menu. The altar stays OPEN across repeated offerings: it tracks the
 * running monument plus the in-session devotion streak that escalates the
 * arrangement's response.
 */
export const SacrificeModal: React.FC<SacrificeModalProps> = ({
  visible,
  phase,
  amber,
  onAmberChange,
  onClose,
}) => {
  const [sacrificeMessage, setSacrificeMessage] = useState<string | null>(null);
  const [offeringTotal, setOfferingTotal] = useState(0);
  // The monument line's number CLIMBS when an offering raises it (was a snap).
  // Snaps on the first read after the altar opens (never counts the lifetime
  // total up from 0) and under reduced motion.
  const [monumentRead, setMonumentRead] = useState(0);
  const [offeringCount, setOfferingCount] = useState(0);
  const [offerStreak, setOfferStreak] = useState(0);
  const [offeringTierUp, setOfferingTierUp] = useState<string | null>(null);
  const [confirmEverything, setConfirmEverything] = useState(false);
  // Candle flare on each offering (native driver, reduced-motion aware).
  const [sacrificePulse] = useState(() => new Animated.Value(0));

  // The host panel is dt.modalBg, which darkens at phase 2 — one phase BEFORE
  // the surface theme. panelSt mirrors getPixelSkin's hostDark ladder so the
  // ink tokens always track the skin fill's polarity.
  const st = getSurfaceTheme(phase);
  const dtHostDark = phase >= 2;
  const panelSt = getSurfaceTheme(phase === 2 ? 3 : phase === 3 ? 4 : phase);
  const pixelSkin = getPixelSkin(phase, dtHostDark);

  const [wasVisible, setWasVisible] = useState(visible);
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (visible) {
      setSacrificeMessage(null);
      setOfferStreak(0);
      setOfferingTierUp(null);
      setConfirmEverything(false);
    }
  }
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getSacrificeStats().then(stats => {
      if (cancelled) return;
      setOfferingTotal(stats.totalSacrificed);
      setOfferingCount(stats.count);
      setMonumentRead(read => read + 1);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [visible]);
  const { value: displayedOfferingTotal } = useCountUp(offeringTotal, {
    enabled: visible && !getSettingsSync().reducedMotion && !shouldSimplifyAnimations(),
    identity: `${visible}:${monumentRead}`,
    increasesOnly: true,
    durationMs: getCountUpDurationMs(offeringTotal, phase),
    interpolate: countUpDisplayValue,
  });

  // Shared offering action for both the amount chips and "Offer everything".
  // The altar stays OPEN: it updates the running monument + the in-session
  // devotion streak (which escalates the arrangement's response) and flares the
  // candle, so the player can fall into a rhythm instead of reopening a form.
  const handleOffer = useCallback(async (amount: number, everything: boolean) => {
    if (amount <= 0) return;
    const spendResult = await spendAmber(amount, 'sacrifice');
    if (!spendResult.success) return;
    const nextStreak = offerStreak + 1;
    const result = await performSacrifice(amount, phase, {
      sessionStreak: nextStreak,
      everything,
    });
    onAmberChange?.(spendResult.newBalance);
    setSacrificeMessage(result.message);
    setOfferStreak(nextStreak);
    setOfferingTotal(result.total);
    setOfferingCount(result.count);
    setOfferingTierUp(result.tierUp ? result.tierUp.title : null);
    setConfirmEverything(false);
    // Feedback ramps with the weight of the offering: a fervent in-session
    // streak, a milestone, a devotion tier-up, or giving everything all land as
    // a heavier haptic and a flare that HOLDS at its peak before settling,
    // where an ordinary offering gets the medium tap and a quick flare. Every
    // offering now also has a voice — the arrangement swallowing it (the pit
    // devour cue) instead of the old silence.
    const intenseOffering = everything || result.isMilestone || !!result.tierUp || nextStreak >= 6;
    if (intenseOffering) hapticHeavy(); else hapticMedium();
    playUiSound('devour');
    const rm = getSettingsSync().reducedMotion;
    if (!rm) {
      sacrificePulse.setValue(0);
      Animated.sequence([
        Animated.timing(sacrificePulse, { toValue: 1, duration: intenseOffering ? 180 : 160, useNativeDriver: true }),
        ...(intenseOffering ? [Animated.delay(200)] : []),
        Animated.timing(sacrificePulse, { toValue: 0, duration: intenseOffering ? 640 : 520, useNativeDriver: true }),
      ]).start();
    }
    // Milestone offerings become permanent collectibles in the Whisper Gallery,
    // attributed to Ember (the flame-oracle who introduced the rite; the
    // arrangement keeps no gallery of its own).
    if (result.isMilestone) {
      recordWhisper({
        animalType: 'fox',
        animalName: 'Ember',
        text: result.message,
        phase,
        type: 'whisper',
      }).catch(() => {});
    }
    updateQuestProgress({ amberSacrificed: amount }, phase).catch(() => {});
  }, [phase, offerStreak, onAmberChange, sacrificePulse]);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.centeredOverlay, { backgroundColor: st.overlay }]}>
        <SpringIn
          phase={phase}
          claimTouches
          style={styles.sacrificeModal}
        >
          <NineSliceFrame
            skin={pixelSkin.panel}
            cornerDp={PANEL_CORNER_DP}
            edgeDp={PANEL_EDGE_DP}
            fillColor={pixelSkin.fill}
          />
          <ScrollView
            style={styles.sacrificeScroll}
            contentContainerStyle={styles.sacrificeScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          <View style={styles.sacrificeCandleWrap}>
            <Animated.View
              pointerEvents="none"
              style={[styles.sacrificeCandleGlow, {
                // Phase-age the flare so it isn't the one bright-orange element
                // on an otherwise dark/serene panel: an ember at the reveal, a
                // mauve at the terrible peace.
                backgroundColor: phase >= 5 ? '#9B7BAE' : phase >= 4 ? '#C8703A' : '#FFB347',
                opacity: sacrificePulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
                transform: [{ scale: sacrificePulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.7] }) }],
              }]}
            />
            <Animated.Image
              source={CANDLE_ICON}
              accessibilityLabel="the altar candle"
              style={[styles.sacrificeCandleImg, {
                transform: [{ scale: sacrificePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
              }]}
            />
          </View>
          <Text style={[styles.sacrificeTitle, { color: panelSt.title }]}>
            {getSacrificePrompt(phase).title}
          </Text>
          <Text style={[styles.sacrificeSubtitle, { color: panelSt.muted }]}>
            {getSacrificePrompt(phase).subtitle}
          </Text>

          {/* The monument: what the arrangement now holds of you, and the
              private "regard" that grows with repeat giving. */}
          {offeringCount > 0 && (() => {
            const devotion = getDevotionTier(offeringCount);
            return (
              <View style={styles.offeringMonument}>
                {devotion && (
                  <>
                    <Text style={[styles.offeringTierTitle, { color: panelSt.title }]}>
                      {devotion.title}
                    </Text>
                    <Text style={[styles.offeringTierRegard, { color: panelSt.muted }]}>
                      {devotion.regard}
                    </Text>
                  </>
                )}
                <Text style={[styles.offeringHolds, { color: panelSt.body }]}>
                  {getArrangementHoldsLine(displayedOfferingTotal, phase)}
                </Text>
              </View>
            );
          })()}

          <Text style={[styles.sacrificeBalance, { color: panelSt.body }]}>
            Your Amber: <AmberInline /> {amber}
          </Text>

          {/* Persistent response: shown ABOVE the still-tappable amounts so
              the player can keep offering without the altar closing. */}
          {sacrificeMessage && (
            <View style={[styles.sacrificeResponseBox, { backgroundColor: panelSt.sectionBg, borderColor: panelSt.sectionBorder }]}>
              {offeringTierUp && (
                <Text style={[styles.offeringTierUp, { color: panelSt.title }]}>
                  {`The arrangement's regard deepens... ${offeringTierUp}`}
                </Text>
              )}
              <Text style={[styles.sacrificeResponseText, { color: panelSt.body }]}>
                {sacrificeMessage}
              </Text>
            </View>
          )}

          <View style={styles.sacrificeAmounts}>
            {getSacrificeAmounts(amber).map(amount => (
              <TouchableOpacity
                key={amount}
                style={[styles.sacrificeAmountBtn, { backgroundColor: panelSt.sectionBg, borderColor: panelSt.sectionBorder }]}
                onPress={() => handleOffer(amount, false)}
                accessibilityLabel={`Offer ${amount} amber`}
                accessibilityRole="button"
              >
                <Text style={[styles.sacrificeAmountText, { color: panelSt.body }]}>
                  <AmberInline /> {amount}
                </Text>
              </TouchableOpacity>
            ))}
            {getSacrificeAmounts(amber).length === 0 && amber <= 0 && (
              <Text style={[styles.sacrificeNoAmber, { color: panelSt.muted }]}>
                You have nothing left to offer.
              </Text>
            )}
          </View>

          {/* The fullest gesture: give the whole balance at once. Two-tap
              confirm so it can never be an accident. */}
          {amber > 0 && (
            <TouchableOpacity
              style={[styles.offeringEverythingBtn, { borderColor: panelSt.sectionBorder }]}
              onPress={() => {
                if (confirmEverything) handleOffer(amber, true);
                else setConfirmEverything(true);
              }}
              accessibilityLabel={confirmEverything ? `Confirm offering all ${amber} amber` : 'Offer everything'}
              accessibilityRole="button"
            >
              <Text style={[styles.offeringEverythingText, { color: confirmEverything ? panelSt.title : panelSt.muted }]}>
                {confirmEverything ? `Give all ${amber}? Tap again.` : 'Offer everything'}
              </Text>
            </TouchableOpacity>
          )}

          <CandyButton
            label={sacrificeMessage ? 'Done' : 'Not now'}
            variant="quiet"
            phase={phase}
            hostDark={dtHostDark}
            style={styles.closeAction}
            onPress={onClose}
          />
          </ScrollView>
        </SpringIn>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeAction: {
    marginTop: 12,
  },
  // Sacrifice modal — chrome comes from the NineSliceFrame pixel panel. The
  // altar now stays open across offerings (monument + response + amounts +
  // "offer everything"), so the body scrolls to stay safe on short screens.
  sacrificeModal: {
    padding: 30,
    marginHorizontal: 20,
    alignItems: 'center',
    maxWidth: 380,
    width: '90%',
    maxHeight: '86%',
  },
  sacrificeScroll: {
    alignSelf: 'stretch',
  },
  sacrificeScrollContent: {
    alignItems: 'center',
  },
  sacrificeCandleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  // Warm flare behind the candle on each offering (opacity/scale animated).
  sacrificeCandleGlow: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#FFB347',
  },
  sacrificeCandleImg: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  sacrificeTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.headline,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  sacrificeSubtitle: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.body,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  sacrificeBalance: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.large,
    fontWeight: '700',
    marginBottom: 16,
  },
  sacrificeAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  // Framed selectable offering chips (colors from the surface theme inline —
  // dark phases keep the dread tone via getSurfaceTheme's dark values)
  sacrificeAmountBtn: {
    paddingHorizontal: 18,
    minHeight: 46,
    minWidth: 84,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sacrificeAmountText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.bodyLg,
    fontWeight: '800',
  },
  sacrificeNoAmber: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: FONT_SIZE.body,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sacrificeResponseBox: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
  },
  sacrificeResponseText: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: FONT_SIZE.callout,
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // The monument: private devotion standing + what the arrangement holds of you.
  offeringMonument: {
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  offeringTierTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.callout,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  offeringTierRegard: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: FONT_SIZE.small,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  offeringHolds: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.small,
    textAlign: 'center',
    lineHeight: 18,
  },
  offeringTierUp: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.body,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  offeringEverythingBtn: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 12,
  },
  offeringEverythingText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.bodyLg,
    fontWeight: '800',
    textAlign: 'center',
  },
});
