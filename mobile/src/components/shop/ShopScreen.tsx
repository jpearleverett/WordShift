import { subscribeBillingChanges } from '../../services/iap';
import { useCountUp } from '../../hooks/useCountUp';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  BackHandler,
} from 'react-native';
import {
  CandyColors,
  TILE_THEMES,
  CONFETTI_THEMES,
  SPARK_THEMES,
  getTileFinishForTheme,
  TileFinish,
  SparkPalette,
} from '../../theme/colors';
import { getShopArt, hasShopArt } from './shopArt';
import { SURFACE, getSurfaceTheme } from '../../theme/surfaces';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { CandyButton } from '../ui/CandyButton';
import { PanelCard } from '../ui/PanelCard';
import { CHROME_ICONS } from '../ui/chromeIcons';
import { AmberInline, AmberValue } from '../AmberInline';
import { Confetti, StarBurst, getPhaseSparkPalette } from '../Confetti';
import { STARBURST_DURATION_MS } from '../../constants/timing';
import { RewardReveal, EntranceCascadeItem, getCascadeDelayMs } from '../ui/RewardReveal';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';
import { useScreenInsets } from '../../hooks/useScreenInsets';
import {
  getCosmeticsByCategory,
  ownsCosmetic,
  purchaseAmberCosmetic,
  invalidateCosmeticsCache,
  initCosmetics,
  equipCosmetic,
  unequipCosmetic,
  getEquipped,
  CosmeticItem,
  CosmeticCategory,
} from '../../services/cosmetics';
import { markScreenReady } from '../../services/screenReady';
import { getFullProgress, invalidateProgressCache } from '../../services/amberCurrency';
import { runStorageTransaction, StorageRecoveryRequiredError } from '../../services/persistenceStorage';
import { getRoomsWithStatus, ANIMALS } from '../../services/homeWorldData';
import { getHouseUpgradeGiftName } from '../../services/dialogue/houseUpgradeDialogue';
import { Room, DialoguePhase } from '../../types/homeWorld';
import {
  areUpgradesAvailable,
  areDeepeningsAvailable,
  areAttunementsAvailable,
  getRoomUpgrade,
  getRoomDeepening,
  getAttunementForLevel,
  getUpgradeDescription,
  getHouseUpgradeSurfaceLine,
  HouseUpgradeTier,
  getPurchasedUpgrades,
  getDeepenedRooms,
  getAttunedRooms,
  getPendingHouseUpgradeGifts,
  HouseUpgradeGift,
  purchaseHouseUpgrade,
  HouseUpgradePurchase,
  invalidateRoomUpgradeCache,
  MAX_ATTUNEMENT_LEVEL,
} from '../../services/roomUpgrades';
import { logEvent } from '../../services/eventLogger';
import {
  getShopTitle,
  getShopSubtitle,
  getShopThemeSectionLabel,
  getShopDefaultThemeName,
  getShopConfettiSectionLabel,
  getShopDefaultConfettiName,
  getShopSparkSectionLabel,
  getShopDefaultSparkName,
  getShopPatronLockedLabel,
  getShopStoreBridgeText,
  getShopSectionHint,
  getShopEquippedLine,
  getShopDefaultDescription,
  getShopUseDefaultLabel,
  getShopMotionNoticeText,
  getShopSeeItInRoomLabel,
} from '../../services/phaseNarrative';
import { hapticLight, hapticMedium, hapticSuccess } from '../../services/haptics';
import { isPatronSync } from '../../services/entitlements';
import { FONT_SIZE } from '../../theme/typeScale';
import { playUiSound, uiHapticSelection } from '../../services/uiSound';

interface ShopScreenProps {
  phase: number;
  amberBalance: number;
  onClose: () => void;
  onAmberChange?: (newBalance: number) => void;
  /** Open the Patron (cosmetic IAP) modal. */
  onOpenPatron?: () => void;
  /** Open the Store (amber packs). Renders a "Need more amber?" row when provided. */
  onOpenStore?: () => void;
  /**
   * Open Settings. Renders the motion-notice card's button (the confetti and
   * spark sections are motion effects; Reduced Motion is seeded from the OS,
   * so the player may never have chosen it) when provided.
   */
  onOpenSettings?: () => void;
  /**
   * Hand the player to the home screen with one room in focus ("See it in the
   * room" on a bought house upgrade). App consumes it: sets a one-shot
   * focusRoomId on HomeScreen and transitions home.
   */
  onFocusRoom?: (roomId: string) => void;
}

const AMBER_ICON = require('../../../assets/ui/amber.png');

const PREVIEW_LETTERS = ['A', 'B', 'C', 'D'];

/** Content blocks wait this long so the header reads as settling in first
 *  (matches StatsScreen / WhisperGallery so every secondary screen cascades in
 *  the same way). EntranceCascadeItem pins instantly under reduced motion. */
const HEADER_CASCADE_BASE_MS = 120;

const previewMotionAllowed = () => !getSettingsSync().reducedMotion && !shouldSimplifyAnimations();

/**
 * Play a one-shot staggered scale pulse over a set of Animated.Values (1 ->
 * 1.15 -> 1), 60ms apart. Returns the composite so the caller can stop it.
 */
function playPulse(values: Animated.Value[]): Animated.CompositeAnimation {
  const anim = Animated.stagger(
    60,
    values.map(v =>
      Animated.sequence([
        Animated.spring(v, { toValue: 1.15, friction: 5, tension: 220, useNativeDriver: true }),
        Animated.spring(v, { toValue: 1, friction: 6, tension: 180, useNativeDriver: true }),
      ]),
    ),
  );
  return anim;
}

interface PreviewProps {
  themeId: string | null;
  /** Bumped by the parent on purchase/equip to celebrate this item; also self-plays on tap. */
  pulseToken?: number;
  /**
   * Demo hook: called with the WINDOW centre of the live preview strip on tap
   * and on every pulseToken bump, so the parent can fire the real effect there
   * (the spark rows fire a real StarBurst). Fires regardless of the motion
   * policy: the effect itself renders a still frame under reduced motion.
   */
  onDemo?: (x: number, y: number) => void;
}

/** Rendered size of a shop thumbnail. The art is drawn at 192px, so this only
 *  ever scales DOWN. */
const SHOP_ART_DP = 56;

/**
 * The generated cottage thumbnail for a purchasable. Decorative on purpose
 * (`accessible={false}`): the card's name/description Text and the action
 * button's label already carry the semantics, so the art adds no new strings.
 * Never give this a borderRadius or a border — the art is pixel work.
 */
const ShopArtThumb: React.FC<{ artKey: string; scale?: Animated.Value }> = ({ artKey, scale }) => (
  <Animated.View style={[styles.shopArtWrap, scale ? { transform: [{ scale }] } : null]}>
    <Image source={getShopArt(artKey)} style={styles.shopArt} resizeMode="contain" accessible={false} />
  </Animated.View>
);

/** Speckle positions for a preview tile (three of LetterTile's five spots, so
 *  the wing dust reads at thumbnail scale without turning to mud). */
const PREVIEW_SPECKS = [
  { top: '20%' as const, left: '26%' as const },
  { top: '52%' as const, left: '66%' as const },
  { top: '74%' as const, left: '34%' as const },
];

/**
 * One preview tile, painted with the theme's real palette AND its real
 * TileFinish. The finish-led themes (wax, leaded glass, wing dust, cut stone)
 * sell their MATERIAL rather than their hue, so a hue-only swatch would
 * misrepresent the product: this mirrors LetterTile's own bevel / gloss /
 * sweep / specular / rim / speckle / ink layers at thumbnail scale.
 */
const FinishTile: React.FC<{
  char: string;
  bg: string;
  border: string;
  finish: TileFinish;
  large: boolean;
  scale: Animated.Value;
}> = ({ char, bg, border, finish, large, scale }) => (
  <Animated.View
    style={[
      large ? styles.previewTileLarge : styles.previewTile,
      { backgroundColor: bg, borderColor: border, transform: [{ scale }] },
    ]}
  >
    <View pointerEvents="none" style={[styles.previewBevel, { backgroundColor: finish.bevel }]} />
    <View pointerEvents="none" style={[styles.previewGloss, { backgroundColor: finish.gloss }]} />
    <View pointerEvents="none" style={[styles.previewSweep, { backgroundColor: finish.sweep }]} />
    {!!finish.rim && (
      <View pointerEvents="none" style={[styles.previewRim, { borderColor: finish.rim }]} />
    )}
    {finish.grain === 'speckle' &&
      PREVIEW_SPECKS.map((spot, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[styles.previewSpeck, spot, { backgroundColor: finish.grainColor }]}
        />
      ))}
    {finish.specular !== 'none' && (
      <View
        pointerEvents="none"
        style={[
          styles.previewSpecular,
          finish.specular === 'star' && styles.previewSpecularStar,
          { backgroundColor: finish.specularColor },
        ]}
      />
    )}
    <Text style={[styles.previewTileText, { color: finish.ink ?? CandyColors.white }]}>{char}</Text>
  </Animated.View>
);

/** A small row of tiles previewing a tile palette AND its finish, under the
 *  item's cottage thumbnail. Tappable to demo the pulse. */
const ThemePreview: React.FC<PreviewProps> = ({ themeId, pulseToken = 0 }) => {
  const palette = themeId && TILE_THEMES[themeId] ? TILE_THEMES[themeId] : CandyColors.tileColors;
  const finish = getTileFinishForTheme(themeId);
  const artKey = themeId ?? 'theme_default';
  const showArt = hasShopArt(artKey);
  // [thumbnail, ...tiles] so the art leads playPulse's 60ms stagger.
  const [scales] = useState(() => ([
    new Animated.Value(1),
    ...PREVIEW_LETTERS.map(() => new Animated.Value(1)),
  ]));

  const pulse = useCallback(() => {
    if (!previewMotionAllowed()) return;
    const a = playPulse(scales);
    a.start();
  }, [scales]);

  useEffect(() => {
    if (pulseToken > 0) pulse();
  }, [pulseToken, pulse]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={pulse}
      accessibilityRole="button"
      accessibilityLabel="Preview this tile theme"
      style={styles.previewColumn}
    >
      {showArt && <ShopArtThumb artKey={artKey} scale={scales[0]} />}
      <View style={styles.previewRow}>
        {PREVIEW_LETTERS.map((ch, i) => {
          const c = palette[i % palette.length];
          return (
            <FinishTile
              key={ch}
              char={ch}
              bg={c.bg}
              border={c.border}
              finish={finish}
              large={!showArt}
              scale={scales[i + 1]}
            />
          );
        })}
      </View>
    </TouchableOpacity>
  );
};

const DEFAULT_CONFETTI = ['#FF6B9D', '#C44DFF', '#4DAFFF', '#FFD84D', '#4DE8C2', '#FF8C4D'];

// Core + accent of the bright-days star burst, for the "no spark equipped" row.
// With nothing equipped the real burst stays phase-aware and darkens with the
// story (StarBurst's own phase table), which the default row's copy says.
const DEFAULT_SPARK_CORES = ['#FFD700', '#FFFFFF'];

/** A small scatter of dots previewing a confetti palette. Tappable to demo a mini-burst. */
const ConfettiPreview: React.FC<PreviewProps> = ({ themeId, pulseToken = 0 }) => {
  const palette = themeId && CONFETTI_THEMES[themeId] ? CONFETTI_THEMES[themeId] : DEFAULT_CONFETTI;
  const artKey = themeId ?? 'confetti_default';
  const showArt = hasShopArt(artKey);
  const [scales] = useState(() => ([0, 1, 2, 3, 4, 5, 6].map(() => new Animated.Value(1))));

  const pulse = useCallback(() => {
    if (!previewMotionAllowed()) return;
    const a = playPulse(scales);
    a.start();
  }, [scales]);

  useEffect(() => {
    if (pulseToken > 0) pulse();
  }, [pulseToken, pulse]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={pulse}
      accessibilityRole="button"
      accessibilityLabel="Preview this confetti palette"
      style={styles.previewColumn}
    >
      {showArt && <ShopArtThumb artKey={artKey} scale={scales[0]} />}
      <View style={styles.previewConfetti}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <Animated.View
            key={i}
            style={[
              showArt ? styles.previewDot : styles.previewDotLarge,
              { backgroundColor: palette[i % palette.length], transform: [{ scale: scales[i + 1] }] },
            ]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
};

/** Star diamonds previewing a move-spark palette: the same halo-behind-core
 *  build StarBurst throws on a committed move, held still. From combo tier 2 up
 *  alternate stars carry the accent, so the strip alternates core and accent. */
const SparkPreview: React.FC<PreviewProps> = ({ themeId, pulseToken = 0, onDemo }) => {
  const palette = themeId ? SPARK_THEMES[themeId] : undefined;
  const artKey = themeId ?? 'spark_default';
  const showArt = hasShopArt(artKey);
  const [scales] = useState(() => ([0, 1, 2, 3, 4, 5].map(() => new Animated.Value(1))));
  // The live strip, measured on demand (never at mount: the entrance cascade
  // is still settling then) so the real burst fires at its window centre.
  const stripRef = useRef<View>(null);
  const onDemoRef = useRef(onDemo);
  useEffect(() => { onDemoRef.current = onDemo; }, [onDemo]);

  const pulse = useCallback(() => {
    if (!previewMotionAllowed()) return;
    const a = playPulse(scales);
    a.start();
  }, [scales]);

  const demo = useCallback(() => {
    const node = stripRef.current;
    const fire = onDemoRef.current;
    if (!fire) return;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x: number, y: number, w: number, h: number) => {
        fire(x + w / 2, y + h / 2);
      });
    }
  }, []);

  const press = useCallback(() => {
    pulse();
    demo();
  }, [pulse, demo]);

  useEffect(() => {
    if (pulseToken > 0) {
      pulse();
      demo();
    }
  }, [pulseToken, pulse, demo]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel="Preview this move spark"
      style={styles.previewColumn}
    >
      {showArt && <ShopArtThumb artKey={artKey} scale={scales[0]} />}
      <View ref={stripRef} collapsable={false} style={styles.previewSparkRow}>
        {[0, 1, 2, 3, 4].map(i => {
          const core = palette
            ? i % 2 === 1
              ? palette.accent
              : palette.bg
            : DEFAULT_SPARK_CORES[i % DEFAULT_SPARK_CORES.length];
          const halo = palette?.halo ?? core;
          return (
            <Animated.View
              key={i}
              style={[styles.previewSpark, { transform: [{ scale: scales[i + 1] }] }]}
            >
              <View style={[styles.previewSparkHalo, { backgroundColor: halo }]} />
              <View
                style={[
                  showArt ? styles.previewSparkCore : styles.previewSparkCoreLarge,
                  { backgroundColor: core },
                ]}
              />
            </Animated.View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
};

/** The "Equipped ✓" chip. Springs in from scale 0.8 when it was just purchased. */
const AnimatedEquippedChip: React.FC<{ spring: boolean; borderColor: string; textColor: string }> = ({
  spring,
  borderColor,
  textColor,
}) => {
  const animate = spring && previewMotionAllowed();
  const [scale] = useState(() => new Animated.Value(animate ? 0.8 : 1));
  useEffect(() => {
    if (!animate) return;
    scale.setValue(0.8);
    const a = Animated.spring(scale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [animate, scale]);
  return (
    <Animated.View style={[styles.statusChip, styles.equippedChip, { borderColor, transform: [{ scale }] }]}>
      <Text style={[styles.equippedChipText, { color: textColor }]}>Equipped <Image source={CHROME_ICONS.check} style={styles.inlineMark} /></Text>
    </Animated.View>
  );
};

export const ShopScreen: React.FC<ShopScreenProps> = ({
  phase,
  amberBalance,
  onClose,
  onAmberChange,
  onOpenPatron,
  onOpenStore,
  onOpenSettings,
  onFocusRoom,
}) => {
  const screenInsets = useScreenInsets();
  const t = getSurfaceTheme(phase);
  // Framed light lift for the back chip: the kit's own highlight band alpha
  // over the deep screen base, framed with the panel border tint.
  const chipBg = `rgba(255, 255, 255, ${SURFACE.highlightAlpha})`;

  const [balance, setBalance] = useState(amberBalance);
  // The header amber pill ticks from the old value to the new one on any change
  // (a spend, or a prop refresh) instead of an instant swap, so a purchase reads
  // as amber leaving the pouch.

  // Cosmetic-purchase reward moment (F43): a magnitude-aware count-up of the
  // spend + a phase-aware in-world line, auto-clearing after a read beat.
  const [purchaseReveal, setPurchaseReveal] = useState<{ amount: number; line: string; nonce: number } | null>(null);
  const [owned, setOwned] = useState<Record<string, boolean>>({});
  const [equipped, setEquipped] = useState<Partial<Record<CosmeticCategory, string>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const shopActionBusy = useRef(false);
  const recoveryPending = useRef(false);

  // House upgrades (tier-1 decorations + tier-2 deepenings + tier-3
  // attunements), sold here alongside the cosmetics — amber sinks,
  // expression only.
  const [rooms, setRooms] = useState<Room[]>([]);
  const [purchasedUpgrades, setPurchasedUpgrades] = useState<Record<string, number>>({});
  const [purchasedDeepenings, setPurchasedDeepenings] = useState<Record<string, number>>({});
  const [attunedRooms, setAttunedRooms] = useState<Record<string, number>>({});
  const [houseGifts, setHouseGifts] = useState<HouseUpgradeGift[]>([]);
  const [houseFeedback, setHouseFeedback] = useState<string | null>(null);
  const [saveRecovery, setSaveRecovery] = useState<
    | { kind: 'house'; request: HouseUpgradePurchase; cost: number; message: string }
    | { kind: 'cosmetic'; message: string }
    | { kind: 'equipment'; message: string }
    | null
  >(null);
  const [cosmeticFeedback, setCosmeticFeedback] = useState<string | null>(null);
  const [saveRecoverySaving, setSaveRecoverySaving] = useState(false);
  const [saveRecoveryError, setSaveRecoveryError] = useState(false);

  const reducedMotion = getSettingsSync().reducedMotion;
  // Cosmetic-purchase celebration (F43): the just-bought palette bursts confetti,
  // pulses its preview, and springs its Equipped chip.
  const [celebration, setCelebration] = useState<{ id: string; palette: string[]; token: number } | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  // The REAL move burst, fired at a spark row's preview centre on purchase,
  // equip and preview tap (the old demo was a confetti fall in spark colours,
  // which taught the wrong surface). `palette` is the row's OWN palette, so a
  // not-yet-owned row previews itself, not whatever is equipped; the nonce
  // remounts StarBurst so a second tap re-fires. Holds the same window App
  // holds a move's burst for.
  const [sparkDemo, setSparkDemo] = useState<{ x: number; y: number; palette: SparkPalette; nonce: number } | null>(null);
  const fireSparkDemo = useCallback((x: number, y: number, sparkId: string | null) => {
    const palette = (sparkId && SPARK_THEMES[sparkId]) || getPhaseSparkPalette(phase);
    setSparkDemo({ x, y, palette, nonce: Date.now() });
  }, [phase]);
  useEffect(() => {
    if (!sparkDemo) return;
    const id = setTimeout(() => setSparkDemo(null), STARBURST_DURATION_MS);
    return () => clearTimeout(id);
  }, [sparkDemo]);
  // Motion policy: when Reduced Motion (seeded from the OS) or the low device
  // tier stills the two event cosmetics, say so at the head of their sections
  // instead of selling a burst the player will watch for and never see.
  const motionNoticeReason: 'reduced_motion' | 'low_tier' | null = reducedMotion
    ? 'reduced_motion'
    : shouldSimplifyAnimations()
      ? 'low_tier'
      : null;
  // House-upgrade in-card resolution (F50): the bought card holds its feedback in
  // place, fades, THEN the list reflows.
  const [resolving, setResolving] = useState<{ key: string; message: string } | null>(null);
  const [houseFade] = useState(() => new Animated.Value(1));

  const tileThemes = useMemo(() => getCosmeticsByCategory('tile_theme'), []);
  const confettiThemes = useMemo(() => getCosmeticsByCategory('confetti'), []);
  const sparkThemes = useMemo(() => getCosmeticsByCategory('spark'), []);
  const allItems = useMemo(
    () => [...tileThemes, ...confettiThemes, ...sparkThemes],
    [tileThemes, confettiThemes, sparkThemes],
  );

  const refresh = useCallback(async () => {
    const ownedEntries = await Promise.all(
      allItems.map(async t => [t.id, await ownsCosmetic(t.id)] as const)
    );
    const [tile, confetti, spark] = await Promise.all([
      getEquipped('tile_theme'),
      getEquipped('confetti'),
      getEquipped('spark'),
    ]);
    setOwned(Object.fromEntries(ownedEntries));
    setEquipped({ tile_theme: tile, confetti, spark });
  }, [allItems]);

  useEffect(() => subscribeBillingChanges(() => {
    void refresh().catch(() => {});
  }), [refresh]);

  const refreshHouse = useCallback(async () => {
    const [roomList, upgrades, deepenings, attunements, gifts] = await Promise.all([
      getRoomsWithStatus(),
      getPurchasedUpgrades(),
      getDeepenedRooms(),
      getAttunedRooms(),
      getPendingHouseUpgradeGifts(),
    ]);
    setRooms(roomList);
    setPurchasedUpgrades(upgrades);
    setPurchasedDeepenings(deepenings);
    setAttunedRooms(attunements);
    setHouseGifts(gifts);
  }, []);

  // In-card purchase resolution (F50): keep the bought card mounted for a read
  // beat showing its feedback in place of the button, fade it, THEN refresh so
  // the reflow happens while nothing draws attention to it.
  const resolveHousePurchase = useCallback(async (key: string, message: string) => {
    setResolving({ key, message });
    houseFade.setValue(1);
    await new Promise<void>(r => setTimeout(r, 900));
    if (!reducedMotion) {
      await new Promise<void>(r => {
        Animated.timing(houseFade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => r());
      });
    }
    await refreshHouse();
    setResolving(null);
    setHouseFeedback(null);
  }, [houseFade, reducedMotion, refreshHouse]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // The spinner is only lifted here, so this MUST always reach the finally,
      // or a rejected/hung load leaves the whole shop spinning forever with no
      // recovery. allSettled so one bad key can't blank the screen either.
      try {
        await Promise.allSettled([refresh(), refreshHouse()]);
      } catch (e) {
        console.warn('[Shop] initial load failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
        // First real content is in state: release the navigation cover.
        markScreenReady('shop');
      }
    })();
    return () => { cancelled = true; };
  }, [refresh, refreshHouse]);

  const [lastAmberProp, setLastAmberProp] = useState(amberBalance);
  if (lastAmberProp !== amberBalance) {
    setLastAmberProp(amberBalance);
    setBalance(amberBalance);
  }
  const { value: displayedBalance } = useCountUp(balance, { enabled: !reducedMotion });

  // The purchase reveal auto-clears after a read beat (the confetti + preview
  // pulse + chip spring carry the rest of the celebration).
  useEffect(() => {
    if (!purchaseReveal) return;
    const id = setTimeout(() => setPurchaseReveal(null), 1900);
    return () => clearTimeout(id);
  }, [purchaseReveal]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () =>
      shopActionBusy.current || recoveryPending.current || saveRecovery != null);
    return () => subscription.remove();
  }, [saveRecovery]);

  const navigateAway = useCallback((action?: () => void) => {
    if (shopActionBusy.current || recoveryPending.current || saveRecovery) return;
    action?.();
  }, [saveRecovery]);

  const handleBuy = useCallback(async (item: CosmeticItem) => {
    if (busy || shopActionBusy.current || recoveryPending.current || saveRecovery || item.acquisition.kind !== 'amber') return;
    const cost = item.acquisition.cost;
    shopActionBusy.current = true;
    setBusy(item.id);
    setCosmeticFeedback(null);
    try {
      const result = await purchaseAmberCosmetic(item.id);
      setBalance(result.newBalance);
      onAmberChange?.(result.newBalance);
      if (!result.success) {
        await refresh();
        setCosmeticFeedback(result.reason === 'already_owned'
          ? 'You already own this. Choose Equip to use it.'
          : result.reason === 'not_enough_amber'
            ? 'Not enough amber for that yet.'
            : 'This item is not available for amber.');
        return;
      }
      hapticSuccess();
      // Celebrate the biggest expression purchase: a count-up of the spend + a
      // phase-aware in-world line, plus a burst of the purchased palette, a
      // preview pulse, and the Equipped chip spring. Confetti self-skips under
      // reduced motion; the palette drives the color either way.
      setPurchaseReveal({ amount: cost, line: getShopEquippedLine(phase, item.category), nonce: Date.now() });
      // A confetti purchase falls in the purchased palette ONLY; a spark
      // purchase fires the real StarBurst at its row (via the preview's
      // pulseToken -> onDemo) and never a spark-coloured confetti fall.
      const palette =
        item.category === 'tile_theme'
          ? (TILE_THEMES[item.id]?.map(c => c.bg) ?? [])
          : item.category === 'confetti'
            ? (CONFETTI_THEMES[item.id] ?? [])
            : [];
      setCelebration(prev => ({ id: item.id, palette, token: (prev?.token ?? 0) + 1 }));
      if (palette.length > 0) setConfettiActive(true);
      await refresh();
    } catch (error) {
      if (error instanceof StorageRecoveryRequiredError) {
        recoveryPending.current = true;
        setSaveRecovery({ kind: 'cosmetic', message: `${item.name} purchased and equipped.` });
        setSaveRecoveryError(false);
      } else {
        setCosmeticFeedback('Your purchase could not be confirmed. Tap it again to retry; a saved purchase will not be charged twice.');
      }
    } finally {
      shopActionBusy.current = false;
      setBusy(null);
    }
  }, [busy, saveRecovery, onAmberChange, refresh, phase]);

  const handleEquip = useCallback(async (item: CosmeticItem) => {
    if (busy || shopActionBusy.current || recoveryPending.current || saveRecovery) return;
    shopActionBusy.current = true;
    setBusy(item.id);
    setCosmeticFeedback(null);
    try {
      if (!(await equipCosmetic(item.id))) {
        await refresh();
        setCosmeticFeedback('This item is not currently owned.');
        return;
      }
      hapticLight();
      // Equip is a moment too: the chip springs, the preview pulses, and a
      // spark row fires its real burst. No confetti (nothing was bought).
      setCelebration(prev => ({ id: item.id, palette: [], token: (prev?.token ?? 0) + 1 }));
      await refresh();
    } catch (error) {
      if (error instanceof StorageRecoveryRequiredError) {
        recoveryPending.current = true;
        setSaveRecovery({ kind: 'equipment', message: 'Your equipped selection is saved.' });
        setSaveRecoveryError(false);
      } else {
        setCosmeticFeedback('Your selection could not be saved. Please try again.');
      }
    } finally {
      shopActionBusy.current = false;
      setBusy(null);
    }
  }, [busy, saveRecovery, refresh]);

  const handleEquipDefault = useCallback(async (category: CosmeticCategory) => {
    if (busy || shopActionBusy.current || recoveryPending.current || saveRecovery) return;
    shopActionBusy.current = true;
    setBusy(`__default_${category}__`);
    setCosmeticFeedback(null);
    try {
      await unequipCosmetic(category);
      hapticLight();
      await refresh();
    } catch (error) {
      if (error instanceof StorageRecoveryRequiredError) {
        recoveryPending.current = true;
        setSaveRecovery({ kind: 'equipment', message: 'Your equipped selection is saved.' });
        setSaveRecoveryError(false);
      } else {
        setCosmeticFeedback('Your selection could not be saved. Please try again.');
      }
    } finally {
      shopActionBusy.current = false;
      setBusy(null);
    }
  }, [busy, saveRecovery, refresh]);

  // -------------------------------------------------------------------------
  // HOUSE UPGRADES — tier-1 room decorations + tier-2 "deepenings"
  // -------------------------------------------------------------------------

  const housePhase = phase as DialoguePhase;

  const availableUpgrades = useMemo(() => {
    return rooms
      .filter(room => room.isUnlocked)
      .map(room => {
        const upgrade = getRoomUpgrade(room.id);
        if (!upgrade || purchasedUpgrades[room.id] || houseGifts.some(gift => gift.roomId === room.id && gift.tier === 1)) return null;
        return { room, upgrade };
      })
      .filter((entry): entry is { room: Room; upgrade: NonNullable<ReturnType<typeof getRoomUpgrade>> } => entry !== null);
  }, [rooms, purchasedUpgrades, houseGifts]);

  // Tier-2 "deepenings": eligible once the room's tier-1 decoration is in
  // place and the deepening hasn't been bought yet.
  const availableDeepenings = useMemo(() => {
    return rooms
      .filter(room => room.isUnlocked)
      .map(room => {
        const deepening = getRoomDeepening(room.id);
        if (!deepening) return null;
        if (!purchasedUpgrades[room.id]) return null; // tier-1 required first
        if (purchasedDeepenings[room.id] || houseGifts.some(gift => gift.roomId === room.id && gift.tier === 2)) return null;
        return { room, deepening };
      })
      .filter((entry): entry is { room: Room; deepening: NonNullable<ReturnType<typeof getRoomDeepening>> } => entry !== null);
  }, [rooms, purchasedUpgrades, purchasedDeepenings, houseGifts]);

  // Tier-3 "attunements": eligible once the room's tier-1 decoration is in
  // place (the deepening is NOT required) and the room isn't fully attuned.
  // Each row is the room's NEXT level (levels purchase strictly in order).
  const availableAttunements = useMemo(() => {
    return rooms
      .filter(room => room.isUnlocked)
      .map(room => {
        if (!purchasedUpgrades[room.id]) return null; // tier-1 required first
        if (houseGifts.some(gift => gift.roomId === room.id && gift.tier === 3)) return null;
        const info = getAttunementForLevel(room.id, (attunedRooms[room.id] ?? 0) + 1);
        if (!info) return null; // no attunement for this room, or fully attuned
        return { room, info };
      })
      .filter((entry): entry is { room: Room; info: NonNullable<ReturnType<typeof getAttunementForLevel>> } => entry !== null);
  }, [rooms, purchasedUpgrades, attunedRooms, houseGifts]);

  const handleHousePurchase = useCallback(async (
    request: HouseUpgradePurchase, key: string, cost: number, message: string,
  ) => {
    // State disables the next render; the ref blocks a second tap arriving
    // before that render, including taps on another room's purchase button.
    if (busy || shopActionBusy.current || recoveryPending.current || saveRecovery) return;
    shopActionBusy.current = true;
    setBusy(key);
    setHouseFeedback(null);
    try {
      const result = await purchaseHouseUpgrade(request);
      onAmberChange?.(result.newBalance);
      setBalance(result.newBalance);
      if (!result.success) {
        await refreshHouse();
        setHouseFeedback(result.reason === 'not_enough_amber'
          ? 'Not enough amber for that yet.'
          : result.reason === 'already_owned'
            ? 'That upgrade is already in place.'
            : result.reason === 'already_pending'
              ? 'That gift is waiting for a visit. Tap the animal at home to give it.'
            : result.reason === 'stale_offer'
              ? 'The room has changed. Its current upgrades are shown below.'
              : 'That room is not ready for this upgrade yet.');
        return;
      }
      logEvent({ type: 'room_upgrade_purchased', data: {
        roomId: request.roomId, cost,
        ...(request.tier > 1 ? { tier: request.tier } : {}),
        ...(request.tier === 3 ? { level: request.level } : {}),
      } });
      hapticMedium();
      await resolveHousePurchase(key, message);
    } catch (error) {
      setResolving(null);
      houseFade.setValue(1);
      if (error instanceof StorageRecoveryRequiredError) {
        // A durable purchase journal now owns this balance. Do not let play
        // continue against its partially written save before replay finishes.
        recoveryPending.current = true;
        setSaveRecovery({ kind: 'house', request, cost, message });
        setSaveRecoveryError(false);
        return;
      }
      setHouseFeedback('Your purchase could not be confirmed. Tap the upgrade again to retry; a saved purchase will not be charged twice.');
    } finally {
      shopActionBusy.current = false;
      setBusy(null);
    }
  }, [busy, saveRecovery, houseFade, onAmberChange, refreshHouse, resolveHousePurchase]);

  const handleRecoverPurchase = useCallback(async () => {
    if (!saveRecovery || shopActionBusy.current) return;
    shopActionBusy.current = true;
    setSaveRecoverySaving(true);
    setSaveRecoveryError(false);
    try {
      // Transaction entry replays the pending journal first. Its read guard
      // also catches legacy getters that fall back to defaults on a read error,
      // so a failed refresh cannot reopen play with a fabricated balance.
      const progress = await runStorageTransaction('shop_purchase_recovery', async () => {
        invalidateProgressCache();
        invalidateRoomUpgradeCache();
        invalidateCosmeticsCache();
        const savedProgress = await getFullProgress();
        await Promise.all([refreshHouse(), initCosmetics()]);
        await refresh();
        return savedProgress;
      });
      setBalance(progress.amber);
      onAmberChange?.(progress.amber);
      if (saveRecovery.kind === 'house') {
        const { request, cost, message } = saveRecovery;
        logEvent({ type: 'room_upgrade_purchased', data: {
          roomId: request.roomId, cost,
          ...(request.tier > 1 ? { tier: request.tier } : {}),
          ...(request.tier === 3 ? { level: request.level } : {}),
        } });
        setHouseFeedback(message);
      } else {
        setCosmeticFeedback(saveRecovery.message);
      }
      recoveryPending.current = false;
      setSaveRecovery(null);
    } catch {
      // Keep the protected surface visible until both durable state and its
      // displayed balance/ownership are ready. Retry only replays the journal.
      invalidateProgressCache();
      invalidateRoomUpgradeCache();
      invalidateCosmeticsCache();
      setSaveRecoveryError(true);
    } finally {
      shopActionBusy.current = false;
      setSaveRecoverySaving(false);
    }
  }, [saveRecovery, onAmberChange, refreshHouse, refresh]);

  const handleBuyUpgrade = useCallback(async (roomId: string) => {
    const upgrade = getRoomUpgrade(roomId);
    if (!upgrade) return;
    await handleHousePurchase({ roomId, tier: 1 }, `upgrade_${roomId}`, upgrade.cost, `${upgrade.name} is ready to give.`);
  }, [handleHousePurchase]);

  const handleBuyDeepening = useCallback(async (roomId: string) => {
    const deepening = getRoomDeepening(roomId);
    if (!deepening) return;
    await handleHousePurchase({ roomId, tier: 2 }, `deepen_${roomId}`, deepening.cost, `${deepening.name} is ready to give.`);
  }, [handleHousePurchase]);

  const handleBuyAttunement = useCallback(async (roomId: string) => {
    const info = getAttunementForLevel(roomId, (attunedRooms[roomId] ?? 0) + 1);
    if (!info) return;
    await handleHousePurchase({ roomId, tier: 3, level: info.level }, `attune_${roomId}`, info.cost,
      `${info.name} is ready to give. Visit the animal to attune their room.`);
  }, [attunedRooms, handleHousePurchase]);

  // Bought tier-1 decorations and tier-2 deepenings stay LISTED, as "in place"
  // cards after the still-buyable rows: a purchased room used to vanish from
  // the shop entirely, so the player got no confirmation of the spend and no
  // way back to the room to look at what they had paid for.
  const inPlaceUpgrades = useMemo(() => {
    return rooms
      .filter(room => room.isUnlocked)
      .map(room => {
        const upgrade = getRoomUpgrade(room.id);
        if (!upgrade || !purchasedUpgrades[room.id]) return null;
        return { room, upgrade };
      })
      .filter((entry): entry is { room: Room; upgrade: NonNullable<ReturnType<typeof getRoomUpgrade>> } => entry !== null);
  }, [rooms, purchasedUpgrades]);

  const inPlaceDeepenings = useMemo(() => {
    return rooms
      .filter(room => room.isUnlocked)
      .map(room => {
        const deepening = getRoomDeepening(room.id);
        if (!deepening || !purchasedDeepenings[room.id]) return null;
        return { room, deepening };
      })
      .filter((entry): entry is { room: Room; deepening: NonNullable<ReturnType<typeof getRoomDeepening>> } => entry !== null);
  }, [rooms, purchasedDeepenings]);

  const showHouseUpgrades =
    areUpgradesAvailable(housePhase) &&
    houseGifts.length + availableUpgrades.length +
      inPlaceUpgrades.length +
      (areDeepeningsAvailable(housePhase) ? availableDeepenings.length + inPlaceDeepenings.length : 0) +
      (areAttunementsAvailable(housePhase) ? availableAttunements.length : 0) > 0;

  const renderActionButton = (item: CosmeticItem) => {
    const isOwned = owned[item.id];
    const isEquipped = equipped[item.category] === item.id;
    if (isOwned && isEquipped) {
      return (
        <AnimatedEquippedChip
          spring={celebration?.id === item.id}
          borderColor={t.sectionBorder}
          textColor={t.body}
        />
      );
    }
    if (isOwned) {
      return (
        <CandyButton
          label="Equip"
          onPress={() => handleEquip(item)}
          phase={phase}
          variant="secondary"
          disabled={busy != null}
          style={styles.actionSlot}
          accessibilityLabel={`Equip ${item.name}`}
        />
      );
    }
    if (item.acquisition.kind === 'amber') {
      const cost = item.acquisition.cost;
      const affordable = balance >= cost;
      return (
        <CandyButton
          label={`${cost}`}
          onPress={() => handleBuy(item)}
          phase={phase}
          variant="amber"
          icon={AMBER_ICON}
          disabled={!affordable || busy != null}
          style={styles.actionSlot}
          accessibilityLabel={`Buy ${item.name} for ${cost} amber`}
        />
      );
    }
    // entitlement (e.g. Patron): locked unless owned
    return (
      <View style={[styles.statusChip, { borderColor: t.sectionBorder }]}>
        <Text style={[styles.lockedChipText, { color: t.muted }]}>{getShopPatronLockedLabel()}</Text>
      </View>
    );
  };

  const renderSection = (
    category: CosmeticCategory,
    sectionLabel: string,
    defaultName: string,
    items: CosmeticItem[],
    Preview: React.FC<PreviewProps>,
  ) => {
    const defaultEquipped = equipped[category] === undefined;
    const isEvent = category === 'confetti' || category === 'spark';
    const notice = isEvent && motionNoticeReason ? getShopMotionNoticeText(phase, motionNoticeReason) : null;
    const useDefault = getShopUseDefaultLabel(phase, category);
    // Spark rows demo the REAL burst at their preview; the other categories
    // keep their pulse only.
    const demoFor = (id: string | null) =>
      category === 'spark' ? (x: number, y: number) => fireSparkDemo(x, y, id) : undefined;
    return (
      <View key={category}>
        <Text style={[styles.sectionLabel, { color: t.headerMuted }]}>{sectionLabel}</Text>
        {/* WHERE and WHEN this cosmetic shows: confetti and sparks are events,
            and nothing used to tell the player when to look. */}
        <Text style={[styles.sectionHint, { color: t.headerMuted }]}>{getShopSectionHint(phase, category)}</Text>

        {notice && (
          <PanelCard phase={phase} kind="card" style={styles.noticeCard}>
            <View style={styles.noticeBody}>
              <Text style={[styles.noticeText, { color: t.body }]}>{notice.body}</Text>
            </View>
            {notice.button && onOpenSettings && (
              <CandyButton
                label={notice.button}
                onPress={() => navigateAway(onOpenSettings)}
                disabled={busy != null}
                phase={phase}
                variant="quiet"
                style={styles.actionSlot}
                accessibilityLabel={notice.button}
              />
            )}
          </PanelCard>
        )}

        {/* Default (free) option */}
        <PanelCard phase={phase} kind="card" style={styles.card}>
          <Preview themeId={null} onDemo={demoFor(null)} />
          <View style={styles.cardBody}>
            <Text style={[styles.cardName, { color: t.title }]}>{defaultName}</Text>
            <Text style={[styles.cardDesc, { color: t.body }]}>{getShopDefaultDescription(phase, category)}</Text>
          </View>
          {defaultEquipped ? (
            <View style={[styles.statusChip, styles.equippedChip, { borderColor: t.sectionBorder }]}>
              <Text style={[styles.equippedChipText, { color: t.body }]}>Equipped <Image source={CHROME_ICONS.check} style={styles.inlineMark} /></Text>
            </View>
          ) : (
            <CandyButton
              label={useDefault.label}
              onPress={() => handleEquipDefault(category)}
              phase={phase}
              variant="secondary"
              disabled={busy != null}
              style={styles.actionSlot}
              accessibilityLabel={useDefault.accessibilityLabel}
            />
          )}
        </PanelCard>

        {items.map(item => (
          <PanelCard key={item.id} phase={phase} kind="card" style={styles.card}>
            <Preview
              themeId={item.id}
              pulseToken={celebration?.id === item.id ? celebration.token : 0}
              onDemo={demoFor(item.id)}
            />
            <View style={styles.cardBody}>
              <Text style={[styles.cardName, { color: t.title }]}>{item.name}</Text>
              <Text style={[styles.cardDesc, { color: t.body }]} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
            {renderActionButton(item)}
          </PanelCard>
        ))}
      </View>
    );
  };

  // A house-upgrade card that, once bought, holds its feedback in place and fades
  // (F50) instead of vanishing in an abrupt reflow. `extraLine` carries the
  // attunement "level X of Y" line.
  const renderHouseCard = (
    key: string,
    title: string,
    description: string,
    cost: number,
    buyLabel: string,
    onBuy: () => void,
    a11y: string,
    /** Which tier this row sells, for the surface line under the flavour copy. */
    tier: HouseUpgradeTier,
    extraLine?: string,
    /** Art key, when it differs from the card key (attunements are level-keyed). */
    artKey?: string,
  ) => {
    const isResolving = resolving?.key === key;
    return (
      // The next attunement is a new offer: remount it after the previous
      // level fades. Explicit settled opacity also clears the native driver's
      // last value instead of leaving an invisible row occupying its height.
      <Animated.View
        key={artKey ? `${key}_${artKey}` : key}
        testID={`house-offer-${key}`}
        style={{ opacity: isResolving ? houseFade : 1 }}
      >
        <PanelCard phase={phase} kind="card" style={styles.card}>
          <ShopArtThumb artKey={artKey ?? key} />
          <View style={styles.houseCardBody}>
            <Text style={[styles.cardName, { color: t.title }]}>{title}</Text>
            {extraLine ? (
              <Text style={[styles.attuneLevel, { color: t.muted }]}>{extraLine}</Text>
            ) : null}
            <Text style={[styles.cardDesc, { color: t.body }]}>{description}</Text>
            {/* The tier descriptions are fiction (copper pots, a spinning
                globe); this names the pixels the purchase actually adds, so a
                player knows what to look for once they walk back in. */}
            <Text style={[styles.houseSurfaceLine, { color: t.muted }]}>
              {getHouseUpgradeSurfaceLine(tier, housePhase)}
            </Text>
            <Text style={[styles.houseCost, { color: t.amberText }]}>
              <AmberInline size={12} /> {cost}
            </Text>
          </View>
          {isResolving ? (
            <View style={[styles.resolveChip, { backgroundColor: t.amberTint, borderColor: t.amberTintBorder }]}>
              <Image source={CHROME_ICONS.check} style={styles.resolveCheckIcon} resizeMode="contain" accessible={false} />
              <Text style={[styles.resolveMsg, { color: t.amberText }]} numberOfLines={2}>
                {resolving?.message}
              </Text>
            </View>
          ) : (
            <CandyButton
              label={buyLabel}
              onPress={onBuy}
              phase={phase}
              variant="amber"
              disabled={balance < cost || busy != null}
              style={styles.actionSlot}
              accessibilityLabel={a11y}
            />
          )}
        </PanelCard>
      </Animated.View>
    );
  };

  /**
   * A house upgrade the player already owns. It keeps its place in the list
   * (below everything still buyable, so the shop still reads as a shop) with a
   * settled chip in the Equipped chip's own material, and hands the player back
   * to the room to look at what they bought.
   */
  const renderInPlaceHouseCard = (
    key: string,
    title: string,
    tier: HouseUpgradeTier,
    room: Room,
    artKey?: string,
  ) => {
    const see = getShopSeeItInRoomLabel(phase, room.name);
    return (
      <PanelCard key={key} phase={phase} kind="card" style={styles.inPlaceCard}>
        <View style={styles.inPlaceRow}>
          <ShopArtThumb artKey={artKey ?? key} />
          <View style={styles.houseCardBody}>
            <Text style={[styles.cardName, { color: t.title }]}>{title}</Text>
            <Text style={[styles.houseSurfaceLine, { color: t.muted }]}>
              {getHouseUpgradeSurfaceLine(tier, housePhase)}
            </Text>
          </View>
          <View style={[styles.statusChip, styles.equippedChip, { borderColor: t.sectionBorder }]}>
            <Text style={[styles.equippedChipText, { color: t.body }]}>
              In place <Image source={CHROME_ICONS.check} style={styles.inlineMark} />
            </Text>
          </View>
        </View>
        {onFocusRoom && (
          <CandyButton
            label={see.label}
            onPress={() => navigateAway(() => onFocusRoom(room.id))}
            phase={phase}
            variant="secondary"
            disabled={busy != null}
            style={styles.inPlaceAction}
            accessibilityLabel={see.accessibilityLabel}
          />
        )}
      </PanelCard>
    );
  };

  if (saveRecovery) {
    return (
      <Modal visible animationType="none" onRequestClose={() => {}}>
        <ScrollView
          style={{ backgroundColor: t.screenBg }}
          contentContainerStyle={[
            styles.saveRecoveryScreen,
            { paddingTop: screenInsets.top + 24, paddingBottom: screenInsets.bottom + 24 },
          ]}
          accessibilityViewIsModal
        >
          <PanelCard phase={phase} kind="card" style={styles.saveRecoveryCard}>
            <Text style={[styles.cardName, { color: t.title }]}>{saveRecovery.kind === 'equipment' ? 'Finishing your change' : 'Finishing your purchase'}</Text>
            <Text style={[styles.saveRecoveryBody, { color: t.body }]}>
              {saveRecovery.kind === 'equipment'
                ? 'Your device could not finish saving your selection. Retry to finish the same change.'
                : 'Your device could not finish saving this purchase. Retry to finish the same purchase without spending more amber.'}
            </Text>
            {saveRecoveryError && (
              <Text accessibilityLiveRegion="polite" style={[styles.saveRecoveryBody, { color: t.body }]}>
                Saving still needs a little help. If your device storage is full, free some space, then try again.
              </Text>
            )}
            <CandyButton
              label={saveRecoverySaving ? 'Finishing…' : 'Retry save'}
              phase={phase}
              disabled={saveRecoverySaving}
              onPress={handleRecoverPurchase}
            />
          </PanelCard>
        </ScrollView>
      </Modal>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.screenBg }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={[styles.header, { paddingTop: screenInsets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.backChip, { backgroundColor: chipBg, borderColor: t.headerChipBorder }]}
          onPress={() => navigateAway(() => { playUiSound('selection'); uiHapticSelection(); onClose(); })}
          disabled={busy != null}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={[styles.backChipText, { color: t.headerTitle }]}>{'<'} Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: t.headerTitle }]}>{getShopTitle(phase)}</Text>
          <Text style={[styles.subtitle, { color: t.headerMuted }]} numberOfLines={2}>
            {getShopSubtitle(phase)}
          </Text>
        </View>
        <View style={[styles.amberPill, { backgroundColor: t.sectionBg, borderColor: t.amberTintBorder }]}>
          <AmberValue
            amount={Math.max(0, displayedBalance)}
            size={14}
            color={t.amberText}
            textStyle={styles.amberPillText}
            accessibilityLabel={`${Math.max(0, balance)} amber`}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(48, screenInsets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={t.headerTitle} />
          </View>
        ) : (
          <>
            {cosmeticFeedback != null && (
              <Text accessibilityLiveRegion="polite" style={[styles.houseFeedback, { color: t.headerMuted }]}>{cosmeticFeedback}</Text>
            )}
            {onOpenPatron && !isPatronSync() && (
              <EntranceCascadeItem phase={phase} delay={getCascadeDelayMs(0, { baseMs: HEADER_CASCADE_BASE_MS })}>
              <TouchableOpacity
                onPress={() => navigateAway(() => { hapticLight(); onOpenPatron(); })}
                disabled={busy != null}
                accessibilityLabel="Become a Patron"
                accessibilityRole="button"
                activeOpacity={0.85}
              >
                <PanelCard
                  phase={phase}
                  kind="card"
                  style={{ ...styles.patronBanner, borderColor: t.amberTintBorder }}
                >
                  <View pointerEvents="none" style={[styles.tintInset, { backgroundColor: t.amberTint }]} />
                  <Text style={[styles.patronBannerTitle, { color: t.amberText }]}><Image source={CHROME_ICONS.starBullet} style={styles.inlineMark} /> Become a Patron</Text>
                  <Text style={[styles.patronBannerSub, { color: t.body }]}>Support WordShift. A small amber bonus + an exclusive gold tile set</Text>
                </PanelCard>
              </TouchableOpacity>
              </EntranceCascadeItem>
            )}
            <EntranceCascadeItem phase={phase} delay={getCascadeDelayMs(1, { baseMs: HEADER_CASCADE_BASE_MS })}>
            {renderSection(
              'tile_theme',
              getShopThemeSectionLabel(phase),
              getShopDefaultThemeName(phase),
              tileThemes,
              ThemePreview,
            )}
            </EntranceCascadeItem>
            <EntranceCascadeItem phase={phase} delay={getCascadeDelayMs(2, { baseMs: HEADER_CASCADE_BASE_MS })}>
            {renderSection(
              'confetti',
              getShopConfettiSectionLabel(phase),
              getShopDefaultConfettiName(phase),
              confettiThemes,
              ConfettiPreview,
            )}
            </EntranceCascadeItem>
            <EntranceCascadeItem phase={phase} delay={getCascadeDelayMs(3, { baseMs: HEADER_CASCADE_BASE_MS })}>
            {renderSection(
              'spark',
              getShopSparkSectionLabel(phase),
              getShopDefaultSparkName(phase),
              sparkThemes,
              SparkPreview,
            )}
            </EntranceCascadeItem>

            {showHouseUpgrades && (
              <EntranceCascadeItem phase={phase} delay={getCascadeDelayMs(4, { baseMs: HEADER_CASCADE_BASE_MS })}>
              <View>
                <Text testID="house-upgrades-heading" style={[styles.sectionLabel, { color: t.headerMuted }]}>HOUSE UPGRADES</Text>
                {houseFeedback != null && (
                  <Text style={[styles.houseFeedback, { color: t.headerMuted }]}>{houseFeedback}</Text>
                )}
                {houseGifts.map(gift => {
                  const resident = ANIMALS.find(animal => animal.roomId === gift.roomId);
                  const name = getHouseUpgradeGiftName(gift);
                  const recipient = resident?.name ?? 'the resident';
                  const artKey = gift.tier === 3 ? `attune_${gift.level}` :
                    `${gift.tier === 1 ? 'upgrade' : 'deepen'}_${gift.roomId}`;
                  return (
                    <PanelCard key={`gift_${gift.id}`} phase={phase} kind="card" style={styles.inPlaceCard}>
                      <View style={styles.inPlaceRow}>
                        <ShopArtThumb artKey={artKey} />
                        <View style={styles.houseCardBody}>
                          <Text style={[styles.cardName, { color: t.title }]}>{name}</Text>
                          <Text style={[styles.cardDesc, { color: t.body }]}>
                            {gift.deliveredAt !== undefined
                              ? `${recipient} has something to tell you about your gift.`
                              : `Ready for ${recipient}. Tap them at home to give this gift and change their room.`}
                          </Text>
                        </View>
                      </View>
                      <CandyButton
                        label={`Visit ${recipient}`}
                        onPress={() => navigateAway(() => onFocusRoom ? onFocusRoom(gift.roomId) : onClose())}
                        phase={phase}
                        variant="amber"
                        disabled={busy != null}
                        style={styles.inPlaceAction}
                        accessibilityLabel={`Visit ${recipient} to give ${name}`}
                      />
                    </PanelCard>
                  );
                })}
                {// eslint-disable-next-line react-hooks/refs -- renderHouseCard forwards onBuy to CandyButton; its purchase guard runs only on press.
                  availableUpgrades.map(({ room, upgrade }) =>
                  renderHouseCard(
                    `upgrade_${room.id}`,
                    `${room.name}: ${upgrade.name}`,
                    getUpgradeDescription(room.id, housePhase),
                    upgrade.cost,
                    'Decorate',
                    () => handleBuyUpgrade(room.id),
                    `Decorate ${room.name} with ${upgrade.name} for ${upgrade.cost} amber`,
                    1,
                  ),
                )}
                {// eslint-disable-next-line react-hooks/refs -- The helper forwards this event callback without calling it during render.
                  areDeepeningsAvailable(housePhase) && availableDeepenings.map(({ room, deepening }) =>
                  renderHouseCard(
                    `deepen_${room.id}`,
                    `${room.name}: ${deepening.name}`,
                    deepening.description,
                    deepening.cost,
                    'Deepen',
                    () => handleBuyDeepening(room.id),
                    `Deepen ${room.name} with ${deepening.name} for ${deepening.cost} amber`,
                    2,
                  ),
                )}
                {// eslint-disable-next-line react-hooks/refs -- The immediate guard is accessed only after CandyButton dispatches a press.
                  areAttunementsAvailable(housePhase) && availableAttunements.map(({ room, info }) =>
                  renderHouseCard(
                    `attune_${room.id}`,
                    `${room.name}: ${info.name}`,
                    info.description,
                    info.cost,
                    'Attune',
                    () => handleBuyAttunement(room.id),
                    `Attune ${room.name}, level ${info.level} of ${MAX_ATTUNEMENT_LEVEL}, ${info.name}, for ${info.cost} amber`,
                    3,
                    `Attunement ${info.level} of ${MAX_ATTUNEMENT_LEVEL}`,
                    `attune_${info.level}`,
                  ),
                )}
                {/* Bought rows keep their place below everything still for
                    sale, so the spend leaves a mark in the shop and the player
                    has a way back to the room to look at it. */}
                {inPlaceUpgrades.map(({ room, upgrade }) =>
                  renderInPlaceHouseCard(
                    `upgrade_${room.id}`,
                    `${room.name}: ${upgrade.name}`,
                    1,
                    room,
                  ),
                )}
                {areDeepeningsAvailable(housePhase) && inPlaceDeepenings.map(({ room, deepening }) =>
                  renderInPlaceHouseCard(
                    `deepen_${room.id}`,
                    `${room.name}: ${deepening.name}`,
                    2,
                    room,
                  ),
                )}
              </View>
              </EntranceCascadeItem>
            )}

            {onOpenStore && (
              <EntranceCascadeItem phase={phase} delay={getCascadeDelayMs(5, { baseMs: HEADER_CASCADE_BASE_MS })}>
              <TouchableOpacity
                onPress={() => navigateAway(() => { hapticLight(); onOpenStore(); })}
                disabled={busy != null}
                accessibilityRole="button"
                accessibilityLabel="Open the Store for amber packs"
                activeOpacity={0.85}
              >
                <PanelCard
                  phase={phase}
                  kind="card"
                  style={{ ...styles.storeBridge, borderColor: t.amberTintBorder }}
                >
                  <View pointerEvents="none" style={[styles.tintInset, { backgroundColor: t.amberTint }]} />
                  <View style={styles.storeBridgeBody}>
                    <Text style={[styles.storeBridgeTitle, { color: t.amberText }]}>{getShopStoreBridgeText(phase).title}</Text>
                    <Text style={[styles.storeBridgeSub, { color: t.body }]}>
                      {getShopStoreBridgeText(phase).subtitle}
                    </Text>
                  </View>
                  <Image source={CHROME_ICONS.chevron} style={styles.storeBridgeChevronIcon} resizeMode="contain" accessible={false} />
                </PanelCard>
              </TouchableOpacity>
              </EntranceCascadeItem>
            )}

            <EntranceCascadeItem phase={phase} delay={getCascadeDelayMs(6, { baseMs: HEADER_CASCADE_BASE_MS })}>
            <Text style={[styles.footnote, { color: t.headerMuted }]}>
              Cosmetics are for expression only. They never change the puzzle, the
              story, or your progress.
            </Text>
            </EntranceCascadeItem>
          </>
        )}
      </ScrollView>

      {/* Cosmetic-purchase reward moment (F43): a magnitude-aware count-up of
          the spend + a phase-aware in-world line, over the just-bought palette
          burst below. Pointer-transparent, auto-clears after a read beat. */}
      {purchaseReveal && (
        <View pointerEvents="none" style={styles.purchaseRevealOverlay}>
          <View style={[styles.purchaseRevealCard, { backgroundColor: t.sectionBg, borderColor: t.amberTintBorder }]}>
            <RewardReveal
              key={purchaseReveal.nonce}
              amount={purchaseReveal.amount}
              icon={AMBER_ICON}
              label={purchaseReveal.line}
              phase={phase}
            />
          </View>
        </View>
      )}

      {/* Purchase celebration burst (F43), painted in the just-bought palette.
          Self-skips under reduced motion. */}
      <Confetti
        active={confettiActive}
        colors={celebration?.palette}
        phase={phase}
        onComplete={() => setConfettiActive(false)}
      />

      {/* The real move burst, at the spark row that was bought / equipped /
          tapped, in that row's own palette. Combo tier 2 so the accent shows.
          Renders a still frame under reduced motion, a reduced burst on low
          tier: never nothing. */}
      {sparkDemo && (
        <StarBurst
          key={sparkDemo.nonce}
          active
          x={sparkDemo.x}
          y={sparkDemo.y}
          phase={phase}
          comboTier={2}
          paletteOverride={sparkDemo.palette}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor applied inline (phase-aware screenBg)
  },
  saveRecoveryScreen: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  saveRecoveryCard: { padding: SURFACE.cardPadX },
  saveRecoveryBody: { fontFamily: BODY_FONT, fontSize: FONT_SIZE.body, lineHeight: 23, marginVertical: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    // paddingTop applied inline via useScreenInsets (safe-area aware)
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  backChip: {
    width: 76,
    minHeight: 44,
    borderRadius: SURFACE.buttonRadius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChipText: {
    fontSize: FONT_SIZE.callout,
    fontWeight: '700',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 0.3,
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  title: { fontSize: FONT_SIZE.headline, fontWeight: '900', letterSpacing: 0.5, fontFamily: PIXEL_FONT_BOLD },
  subtitle: {
    fontSize: FONT_SIZE.small,
    fontWeight: '500',
    fontFamily: BODY_FONT,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 4,
    opacity: 0.78,
  },
  amberPill: {
    minWidth: 76,
    minHeight: 40,
    borderRadius: SURFACE.buttonRadius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  amberPillText: { fontSize: FONT_SIZE.callout, fontWeight: '900', fontFamily: PIXEL_FONT_BOLD },
  patronBanner: {
    paddingVertical: 18,
    paddingHorizontal: SURFACE.cardPadX,
    marginBottom: 18,
  },
  patronBannerTitle: { fontSize: FONT_SIZE.large, fontWeight: '900', marginBottom: 4, fontFamily: PIXEL_FONT_BOLD },
  // Washes only the parchment, never the painted wood frame.
  tintInset: { position: 'absolute', top: 12, left: 12, right: 12, bottom: 12 },
  patronBannerSub: { fontSize: FONT_SIZE.small, fontWeight: '600', fontFamily: PIXEL_FONT_BOLD },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
  loading: { paddingTop: 80, alignItems: 'center' },
  sectionLabel: {
    fontSize: FONT_SIZE.small,
    fontWeight: '800',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: SURFACE.sectionLetterSpacing,
    marginTop: 8,
    marginBottom: 12,
    opacity: 0.8,
  },
  // The one-line "where and when" under each section label. Pulls up toward
  // the label (which carries its own 12dp bottom margin) so the pair reads as
  // one heading.
  sectionHint: {
    fontSize: FONT_SIZE.small,
    fontWeight: '500',
    fontFamily: BODY_FONT,
    lineHeight: 17,
    marginTop: -6,
    marginBottom: 12,
    opacity: 0.85,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: SURFACE.cardPadX,
    marginBottom: 14,
  },
  // Motion-policy notice at the head of the confetti / spark sections.
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SURFACE.cardPadY,
    paddingHorizontal: SURFACE.cardPadX,
    marginBottom: 14,
  },
  noticeBody: { flex: 1, paddingRight: 8 },
  noticeText: { fontSize: FONT_SIZE.small, fontWeight: '500', lineHeight: 17, fontFamily: BODY_FONT },
  // The name/desc column is the tightest budget on the screen (a 96dp preview
  // and a 96dp action slot flank it), so its own gutter shrinks by exactly what
  // the card frame clearance took: text width is net-unchanged at 360dp.
  cardBody: { flex: 1, paddingHorizontal: 8 },
  cardName: { fontSize: FONT_SIZE.large, fontWeight: '800', fontFamily: PIXEL_FONT_BOLD },
  cardDesc: { fontSize: FONT_SIZE.small, fontWeight: '500', marginTop: 3, lineHeight: 17, fontFamily: BODY_FONT },
  // The leading column of a cosmetic card: cottage thumbnail over the live
  // palette/material read. 96dp is the only slot that fits beside the body and
  // the 96dp action button on a 360dp screen.
  previewColumn: { width: 96, alignItems: 'center' },
  // NO borderRadius, NO border, NO overflow clip: the art is pixel work and
  // CSS-rounding a baked corner is the documented cozy-pixel anti-pattern.
  shopArtWrap: {
    width: SHOP_ART_DP,
    height: SHOP_ART_DP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopArt: { width: SHOP_ART_DP, height: SHOP_ART_DP },
  previewRow: { flexDirection: 'row', width: 96, justifyContent: 'center', gap: 4, marginTop: 6 },
  previewTile: {
    width: 18,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Used when the item has no thumbnail yet, so the live material still reads
  // as the row's leading visual.
  previewTileLarge: {
    width: 22,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewTileText: { color: CandyColors.white, fontSize: FONT_SIZE.caption, fontWeight: '900', fontFamily: PIXEL_FONT_BOLD, zIndex: 2 },
  // Finish layers, mirroring LetterTile's own overlay stack at thumb scale.
  previewBevel: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  previewGloss: { position: 'absolute', top: 2, left: 3, right: 3, height: 4, borderRadius: 2 },
  previewSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '22%',
    width: 5,
    transform: [{ skewX: '-20deg' }],
  },
  previewRim: { ...StyleSheet.absoluteFill, borderWidth: 1 },
  previewSpecular: { position: 'absolute', top: 3, right: 4, width: 4, height: 4, borderRadius: 2 },
  previewSpecularStar: { borderRadius: 1, transform: [{ rotate: '45deg' }] },
  previewSpeck: { position: 'absolute', width: 2, height: 2, borderRadius: 1 },
  previewConfetti: {
    width: 96,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 6,
  },
  previewDot: { width: 10, height: 10, borderRadius: 3 },
  previewDotLarge: { width: 13, height: 13, borderRadius: 4 },
  // Move sparks: the halo-behind-core diamond StarBurst throws, held still.
  previewSparkRow: {
    width: 96,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    // 5 x 16 + 4 x 3 = 92, so the strip always clears the 96dp column.
    gap: 3,
    marginTop: 6,
  },
  previewSpark: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  previewSparkHalo: { position: 'absolute', width: 16, height: 16, borderRadius: 8, opacity: 0.32 },
  previewSparkCore: { width: 9, height: 9, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  previewSparkCoreLarge: { width: 12, height: 12, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  actionSlot: { minWidth: 96 },
  houseCardBody: { flex: 1, paddingHorizontal: 8 },
  // Names the pixels a house upgrade actually adds, under the flavour copy.
  houseSurfaceLine: {
    fontSize: FONT_SIZE.caption,
    fontWeight: '500',
    fontFamily: BODY_FONT,
    lineHeight: 15,
    marginTop: 4,
  },
  // An owned upgrade: the row on top, its walk-back button beneath it.
  inPlaceCard: {
    paddingVertical: 14,
    paddingHorizontal: SURFACE.cardPadX,
    marginBottom: 14,
  },
  inPlaceRow: { flexDirection: 'row', alignItems: 'center' },
  inPlaceAction: { marginTop: 12, alignSelf: 'flex-start', minWidth: 96 },
  houseFeedback: {
    fontSize: FONT_SIZE.small,
    fontWeight: '600',
    fontFamily: BODY_FONT,
    lineHeight: 17,
    marginBottom: 10,
  },
  houseCost: { fontSize: FONT_SIZE.body, fontWeight: '800', fontFamily: PIXEL_FONT_BOLD, marginTop: 6 },
  attuneLevel: {
    fontSize: FONT_SIZE.caption,
    fontWeight: '700',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  statusChip: {
    minWidth: 96,
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: SURFACE.buttonRadius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equippedChip: {
    // Settled, lifted tint: the framed "this one is worn" state.
    backgroundColor: `rgba(255, 255, 255, ${SURFACE.highlightAlpha})`,
  },
  equippedChipText: { fontSize: FONT_SIZE.body, fontWeight: '800', fontFamily: PIXEL_FONT_BOLD },
  lockedChipText: { fontSize: FONT_SIZE.small, fontWeight: '700', textAlign: 'center', fontFamily: PIXEL_FONT_BOLD },
  // In-card purchase resolution chip (F50): amber inset + check + short line.
  resolveChip: {
    minWidth: 96,
    maxWidth: 130,
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: SURFACE.buttonRadius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolveCheckIcon: { width: 18, height: 18 },
  // Inline check / star marks (generateGameIcons chrome), x-height sized.
  inlineMark: { width: 12, height: 12 },
  resolveMsg: { fontSize: FONT_SIZE.micro, fontWeight: '700', textAlign: 'center', fontFamily: PIXEL_FONT_BOLD, marginTop: 2 },
  storeBridge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: SURFACE.cardPadX,
    marginTop: 8,
    marginBottom: 4,
  },
  storeBridgeBody: { flex: 1 },
  storeBridgeTitle: { fontSize: FONT_SIZE.bodyLg, fontWeight: '800', marginBottom: 2, fontFamily: PIXEL_FONT_BOLD },
  storeBridgeSub: { fontSize: FONT_SIZE.small, fontWeight: '600', fontFamily: PIXEL_FONT_BOLD },
  storeBridgeChevronIcon: { width: 18, height: 18, marginLeft: 10 },
  footnote: {
    fontSize: FONT_SIZE.caption,
    fontWeight: '500',
    fontFamily: BODY_FONT,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
    opacity: 0.75,
  },
  // Cosmetic-purchase reward moment: a small centered tray floating above the
  // dock, showing the spend count-up + the in-world line.
  purchaseRevealOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 90,
    alignItems: 'center',
  },
  purchaseRevealCard: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: SURFACE.cardRadius,
    borderWidth: 1.5,
  },
});
