/**
 * Season Pass modal — the monthly cosmetic reward track (seasonPass.ts). A free
 * track earned by playing and a premium track unlocked by an active Supporter
 * subscription OR by spending amber (the durable recurring sink). Rewards are
 * amber (reward-only, never phase progress) + an exclusive premium cosmetic.
 *
 * Cottage-skin chrome (PanelCard / CandyButton / getSurfaceTheme), phase-aware,
 * reduced-motion aware. All narrative copy comes from phaseNarrative; the
 * spend/claim logic lives in seasonPass.ts (this file only orchestrates + renders).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../theme/fonts';
import { getSurfaceTheme, SURFACE, getModalInSpring } from '../theme/surfaces';
import { CONFETTI_THEMES } from '../theme/colors';
import { getSettingsSync } from '../services/settings';
import { shouldSimplifyAnimations } from '../services/deviceTier';
import { PanelCard } from './ui/PanelCard';
import { CandyButton } from './ui/CandyButton';
import { PixelPlaque } from './ui/PixelPlaque';
import { AmberInline } from './AmberInline';
import { AmberSparkle } from './home/AmberSparkle';
import { Confetti } from './Confetti';
import { hapticLight, hapticMedium } from '../services/haptics';
import { showGameAlert } from '../services/gameAlert';
import { spendAmber } from '../services/amberCurrency';
import { getSeasonPassCopy } from '../services/phaseNarrative';
import { DialoguePhase } from '../types/homeWorld';
import {
  getSeasonPassView,
  claimSeasonTier,
  markSeasonPremiumUnlocked,
  getSeasonPremiumAmberCost,
  SeasonPassView,
} from '../services/seasonPass';
import { logEvent } from '../services/eventLogger';

interface SeasonPassModalProps {
  visible: boolean;
  onClose: () => void;
  phase: number;
  puzzlesSolved: number;
  currentAmber: number;
  onAmberChange: (newBalance: number) => void;
  /** Opens the Store so a non-subscriber can become a Supporter (premium free). */
  onSubscribe?: () => void;
}

export const SeasonPassModal: React.FC<SeasonPassModalProps> = ({
  visible,
  onClose,
  phase,
  puzzlesSolved,
  currentAmber,
  onAmberChange,
  onSubscribe,
}) => {
  const t = getSurfaceTheme(phase);
  const copy = getSeasonPassCopy(phase as DialoguePhase);
  const [view, setView] = useState<SeasonPassView | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setView(await getSeasonPassView(puzzlesSolved));
    } catch {
      /* leave the last view up */
    }
  }, [puzzlesSolved]);

  useEffect(() => {
    if (visible) refresh().catch(() => {});
  }, [visible, refresh]);

  // House entrance (was the OS animationType="fade" — a modal-choreography
  // violator): a backdrop fade + a SURFACE.modalIn spring on the card, with the
  // design system's asymmetric fast exit. Reduced motion pins everything shown.
  const reducedMotion = getSettingsSync().reducedMotion;
  const backdropOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const cardScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
  const cardOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const closingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    if (reducedMotion) {
      backdropOpacity.setValue(1);
      cardScale.setValue(1);
      cardOpacity.setValue(1);
      return;
    }
    backdropOpacity.setValue(0);
    cardScale.setValue(0.92);
    cardOpacity.setValue(0);
    const anim = Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, ...getModalInSpring(phase), useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, reducedMotion, backdropOpacity, cardScale, cardOpacity]);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (reducedMotion) {
      onClose();
      return;
    }
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: SURFACE.modalOutMs,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: SURFACE.modalOutMs,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [reducedMotion, backdropOpacity, cardOpacity, onClose]);

  // The tier the player is presently working toward (the next unclaimed rung,
  // capped at the last tier once maxed) — the one badge that gets the
  // current-tier ring + breathing scale. The ONE idle animator on this
  // surface: a slow 1.0 -> 1.06 native-driver scale loop, reduced-motion /
  // low-tier safe.
  const currentTier = view ? Math.min(view.tiersUnlocked + 1, view.totalTiers) : 0;
  const currentTierPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!visible) return;
    if (reducedMotion || shouldSimplifyAnimations()) {
      currentTierPulse.setValue(1);
      return;
    }
    currentTierPulse.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(currentTierPulse, {
          toValue: 1.06,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(currentTierPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      currentTierPulse.stopAnimation();
    };
  }, [visible, reducedMotion, currentTierPulse]);

  // Header amber balance: ticks from the old to the new value over ~400ms
  // (plain setState steps, text-only) instead of an instant number swap.
  const [displayedAmber, setDisplayedAmber] = useState(currentAmber);
  const prevAmberRef = useRef(currentAmber);
  useEffect(() => {
    if (!visible) {
      prevAmberRef.current = currentAmber;
      setDisplayedAmber(currentAmber);
      return;
    }
    const prev = prevAmberRef.current;
    if (prev === currentAmber) return;
    if (reducedMotion) {
      setDisplayedAmber(currentAmber);
      prevAmberRef.current = currentAmber;
      return;
    }
    const start = prev;
    const end = currentAmber;
    const steps = 13; // ~400ms at ~30ms/step
    let i = 0;
    const id = setInterval(() => {
      i++;
      const fraction = Math.min(1, i / steps);
      setDisplayedAmber(Math.round(start + (end - start) * fraction));
      if (i >= steps) {
        clearInterval(id);
        prevAmberRef.current = end;
      }
    }, 30);
    return () => clearInterval(id);
  }, [currentAmber, visible, reducedMotion]);

  // Claim feedback: the claimed row's amount springs up 12dp and fades while
  // AmberSparkle plays once over the claimed tier's badge.
  const [justClaimed, setJustClaimed] = useState<{ tier: number; track: 'free' | 'premium'; amount: number } | null>(null);
  const claimPopY = useRef(new Animated.Value(0)).current;
  const claimPopOpacity = useRef(new Animated.Value(0)).current;
  const playClaimPop = useCallback(
    (tier: number, track: 'free' | 'premium', amount: number) => {
      setJustClaimed({ tier, track, amount });
      if (reducedMotion) {
        // Reduced motion: instant state, no floating pop animation.
        setTimeout(() => setJustClaimed(null), 900);
        return;
      }
      claimPopY.setValue(0);
      claimPopOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(claimPopY, {
          toValue: -12,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(claimPopOpacity, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => setJustClaimed(null));
    },
    [reducedMotion, claimPopY, claimPopOpacity],
  );

  // One-time full-card confetti burst (the season's own granted palette) when
  // the final premium tier is claimed.
  const [showFinaleConfetti, setShowFinaleConfetti] = useState(false);

  const claim = useCallback(
    async (tier: number, track: 'free' | 'premium') => {
      if (busy) return;
      setBusy(true);
      try {
        const r = await claimSeasonTier(tier, track, puzzlesSolved);
        if (r.granted) {
          hapticMedium();
          if (typeof r.newBalance === 'number') onAmberChange(r.newBalance);
          playClaimPop(tier, track, r.amber);
          if (track === 'premium' && view && tier === view.totalTiers) {
            setShowFinaleConfetti(true);
          }
          logEvent({ type: 'season_reward_claimed', data: { tier, track, amber: r.amber, cosmetic: r.cosmeticGranted } });
          await refresh();
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, puzzlesSolved, onAmberChange, refresh, view, playClaimPop],
  );

  const claimAll = useCallback(async () => {
    if (busy || !view) return;
    setBusy(true);
    try {
      let last = -1;
      for (const tr of view.tiers) {
        if (tr.freeClaimable) {
          const r = await claimSeasonTier(tr.tier, 'free', puzzlesSolved);
          if (r.granted && typeof r.newBalance === 'number') last = r.newBalance;
        }
        if (tr.premiumClaimable) {
          const r = await claimSeasonTier(tr.tier, 'premium', puzzlesSolved);
          if (r.granted && typeof r.newBalance === 'number') last = r.newBalance;
        }
      }
      if (last >= 0) {
        hapticMedium();
        onAmberChange(last);
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [busy, view, puzzlesSolved, onAmberChange, refresh]);

  const unlockPremiumWithAmber = useCallback(async () => {
    if (busy) return;
    const cost = getSeasonPremiumAmberCost();
    if (currentAmber < cost) {
      showGameAlert('Not enough amber', `The premium track opens for ${cost} amber. Keep offering, or become a Supporter to have it free every season.`);
      return;
    }
    setBusy(true);
    try {
      const spend = await spendAmber(cost, 'season_pass');
      if (!spend.success) {
        showGameAlert('Not enough amber', spend.error ?? 'Try again in a moment.');
        return;
      }
      await markSeasonPremiumUnlocked(puzzlesSolved);
      hapticMedium();
      onAmberChange(spend.newBalance);
      logEvent({ type: 'iap_purchase', data: { productId: 'season_premium_amber', kind: 'season', amber: cost } });
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [busy, currentAmber, puzzlesSolved, onAmberChange, refresh]);

  const hostDark = phase >= 2;
  const cost = getSeasonPremiumAmberCost();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay, opacity: backdropOpacity }]}
        />
        <Animated.View
          style={[styles.cardWrap, { transform: [{ scale: cardScale }], opacity: cardOpacity }]}
        >
        <PanelCard phase={phase} kind="panel" style={styles.card}>
          {/* One-time full-card confetti burst (the season's own granted
              palette) when the final premium tier is claimed. Clips to the
              card (PanelCard's body is overflow:hidden). */}
          <Confetti
            active={showFinaleConfetti}
            phase={phase}
            colors={CONFETTI_THEMES.confetti_season}
            onComplete={() => setShowFinaleConfetti(false)}
          />
          <PixelPlaque phase={phase} label={'SEASON PASS'} style={styles.plaque} />
          <View style={styles.headerBalanceRow}>
            <Text style={[styles.headerBalance, { color: t.amberText }]} accessibilityLabel={`${displayedAmber} amber`}>
              <AmberInline size={13} /> {displayedAmber}
            </Text>
          </View>
          <Text style={[styles.title, { color: t.title }]}>{copy.title}</Text>
          <Text style={[styles.tagline, { color: t.body }]}>{copy.tagline}</Text>

          {view && (
            <>
              <Text style={[styles.progress, { color: t.amberText }]}>
                Tier {view.tiersUnlocked} of {view.totalTiers}
                {view.tiersUnlocked < view.totalTiers
                  ? ` · ${view.puzzlesToNextTier} more puzzle${view.puzzlesToNextTier === 1 ? '' : 's'} to the next`
                  : ' · complete'}
              </Text>

              {!view.premiumUnlocked && (
                <PanelCard phase={phase} kind="card" style={styles.premiumBox}>
                  <Text style={[styles.premiumLocked, { color: t.body }]}>{copy.lockedLine}</Text>
                  <CandyButton
                    label={`Unlock premium · ${cost} amber`}
                    variant="amber"
                    phase={phase}
                    hostDark={hostDark}
                    disabled={busy}
                    onPress={() => { hapticLight(); unlockPremiumWithAmber().catch(() => {}); }}
                    style={styles.premiumBtn}
                  />
                  {onSubscribe && (
                    <TouchableOpacity
                      onPress={() => { hapticLight(); onSubscribe(); }}
                      accessibilityRole="button"
                      accessibilityLabel="Become a Supporter for the premium track"
                    >
                      <Text style={[styles.subscribeLink, { color: t.muted }]}>
                        Supporters get it free every season. <Text style={{ color: t.title, fontWeight: '800' }}>Become a Supporter →</Text>
                      </Text>
                    </TouchableOpacity>
                  )}
                </PanelCard>
              )}
              {view.premiumUnlocked && (
                <Text style={[styles.premiumActive, { color: t.amberText }]}>
                  Premium unlocked{view.premiumViaSupporter ? ' (Supporter)' : ''} ✦
                </Text>
              )}

              <ScrollView style={styles.track} showsVerticalScrollIndicator={false}>
                {view.tiers.map((tr) => {
                  const isCurrent = tr.tier === currentTier;
                  const railFilled = tr.tier <= view.tiersUnlocked;
                  const badgeContent = <Text style={[styles.tierNum, { color: t.amberText }]}>{tr.tier}</Text>;
                  return (
                  <View
                    key={tr.tier}
                    style={[
                      styles.tierRow,
                      { backgroundColor: t.sectionBg, borderColor: t.sectionBorder, opacity: tr.unlocked ? 1 : 0.55 },
                    ]}
                  >
                    <View style={styles.railCol}>
                      {tr.tier > 1 && (
                        <View
                          style={[
                            styles.railSegment,
                            { backgroundColor: railFilled ? t.amberText : t.sectionBorder },
                          ]}
                        />
                      )}
                      {isCurrent ? (
                        <Animated.View
                          style={[
                            styles.tierBadge,
                            styles.tierBadgeCurrent,
                            { backgroundColor: t.amberTint, borderColor: t.amberText },
                            { transform: [{ scale: currentTierPulse }] },
                          ]}
                        >
                          {badgeContent}
                        </Animated.View>
                      ) : (
                        <View style={[styles.tierBadge, { backgroundColor: t.amberTint, borderColor: t.amberTintBorder }]}>
                          {badgeContent}
                        </View>
                      )}
                      {justClaimed?.tier === tr.tier && <AmberSparkle phase={phase} />}
                    </View>
                    <View style={styles.tierRewards}>
                      <Text style={[styles.tierReward, { color: t.body }]}>
                        Free: +{tr.freeAmber} amber
                        {tr.freeClaimed ? ' ✓' : ''}
                      </Text>
                      <Text style={[styles.tierReward, { color: view.premiumUnlocked ? t.title : t.muted }]}>
                        Premium: +{tr.premiumAmber} amber{tr.premiumCosmetic ? ' + confetti' : ''}
                        {tr.premiumClaimed ? ' ✓' : ''}
                      </Text>
                    </View>
                    <View style={styles.tierActions}>
                      {justClaimed?.tier === tr.tier && (
                        <Animated.Text
                          style={[
                            styles.claimPop,
                            { color: t.amberText, opacity: claimPopOpacity, transform: [{ translateY: claimPopY }] },
                          ]}
                        >
                          +{justClaimed.amount}
                        </Animated.Text>
                      )}
                      {tr.freeClaimable && (
                        <CandyButton
                          label="Claim"
                          variant="primary"
                          size="md"
                          phase={phase}
                          hostDark={hostDark}
                          disabled={busy}
                          onPress={() => { hapticLight(); claim(tr.tier, 'free').catch(() => {}); }}
                          style={styles.claimBtn}
                        />
                      )}
                      {tr.premiumClaimable && (
                        <CandyButton
                          label="Claim +"
                          variant="amber"
                          size="md"
                          phase={phase}
                          hostDark={hostDark}
                          disabled={busy}
                          onPress={() => { hapticLight(); claim(tr.tier, 'premium').catch(() => {}); }}
                          style={styles.claimBtn}
                        />
                      )}
                    </View>
                  </View>
                  );
                })}
              </ScrollView>

              {view.claimableCount > 0 && (
                <CandyButton
                  label={`Claim all (${view.claimableCount})`}
                  variant="primary"
                  phase={phase}
                  hostDark={hostDark}
                  disabled={busy}
                  onPress={() => { hapticLight(); claimAll().catch(() => {}); }}
                  style={styles.claimAllBtn}
                />
              )}
            </>
          )}

          <CandyButton
            label="Close"
            variant="quiet"
            phase={phase}
            hostDark={hostDark}
            onPress={() => { hapticLight(); handleClose(); }}
            style={styles.closeBtn}
          />
        </PanelCard>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
  // The entrance wrapper is the direct flex child of the definite-height overlay
  // (like StoreModal's animated card), so its maxHeight resolves; the PanelCard
  // inside fills it and its ScrollView bounds against that height.
  cardWrap: { width: '100%', maxWidth: 460, maxHeight: '90%' },
  card: { width: '100%', maxHeight: '100%', paddingTop: 18, paddingHorizontal: 18, paddingBottom: 16 },
  plaque: { alignSelf: 'center', marginBottom: 8 },
  headerBalanceRow: { alignItems: 'center', marginBottom: 2 },
  headerBalance: { fontFamily: PIXEL_FONT_BOLD, fontSize: 13, fontWeight: '800' },
  title: { fontFamily: PIXEL_FONT_BOLD, fontSize: 22, textAlign: 'center' },
  tagline: { fontFamily: BODY_FONT, fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 10 },
  progress: { fontFamily: PIXEL_FONT_BOLD, fontSize: 13, textAlign: 'center', marginBottom: 10 },
  premiumBox: { padding: 14, marginBottom: 10 },
  premiumLocked: { fontFamily: BODY_FONT, fontSize: 13.5, textAlign: 'center', marginBottom: 10 },
  premiumBtn: { alignSelf: 'center' },
  subscribeLink: { fontFamily: BODY_FONT, fontSize: 12.5, textAlign: 'center', marginTop: 10 },
  premiumActive: { fontFamily: PIXEL_FONT_BOLD, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  track: { flexGrow: 0, marginBottom: 8 },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: SURFACE.cardRadius,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  // Rail column: a static per-row connector segment (filled to the current
  // tier in amberText) sits above the badge, so the stack of rows reads as
  // one vertical rail rather than a list of unrelated circles.
  railCol: { width: 32, alignItems: 'center' },
  railSegment: { width: 3, height: 20, borderRadius: 1.5, marginTop: -14, marginBottom: 2 },
  tierBadge: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  // The current-tier badge gets a thicker amber ring; its breathing scale is
  // applied inline via the shared currentTierPulse transform.
  tierBadgeCurrent: { borderWidth: 2.5 },
  tierNum: { fontFamily: PIXEL_FONT_BOLD, fontSize: 15 },
  tierRewards: { flex: 1 },
  tierReward: { fontFamily: BODY_FONT, fontSize: 12.5, lineHeight: 18 },
  tierActions: { flexDirection: 'row', gap: 6, position: 'relative' },
  // Claim feedback: the "+N" amount springs up 12dp and fades where the claim
  // button used to be.
  claimPop: {
    position: 'absolute',
    right: 4,
    top: -4,
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '800',
  },
  claimBtn: {},
  claimAllBtn: { alignSelf: 'center', marginTop: 2, marginBottom: 6 },
  closeBtn: { alignSelf: 'center', marginTop: 4 },
});

export default SeasonPassModal;
