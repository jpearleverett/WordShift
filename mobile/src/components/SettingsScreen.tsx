import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../theme/fonts';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as Application from 'expo-application';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { getOrCreateRecoveryCode, linkRecoveryCode, downloadFromCloud, clearSyncStatus, uploadToCloud, getSyncStatus } from '../services/cloudSave';
import { showGameAlert } from '../services/gameAlert';
import { SURFACE, getSurfaceTheme, getModalInSpring, SurfaceTheme } from '../theme/surfaces';
import { PanelCard } from './ui/PanelCard';
import { PixelPlaque } from './ui/PixelPlaque';
import { CandyButton } from './ui/CandyButton';
import { PhaseTransitionOverlay } from './PhaseTransitionOverlay';
import { NEW_CYCLE_EVENT, PhaseTransitionEvent } from '../services/phaseEvents';
import { shouldSimplifyAnimations } from '../services/deviceTier';
import { useScreenInsets } from '../hooks/useScreenInsets';
import { EXTERNAL_LINKS, PLAY_STORE_URL, getSupportMailto } from '../constants/links';
import { GameSettings, getSettings, updateSetting, resetSettings } from '../services/settings';
import { clearStats } from '../services/starRating';
import { clearAchievements } from '../services/achievements';
import { clearDailyProgress } from '../services/dailyChallenge';
import {
  clearProgress,
  getAmberBalance,
  getStreakFreezeCount,
  purchaseStreakFreeze,
  STREAK_FREEZE_AMBER_COST,
  canStartNewCycle,
  startNewCycle,
} from '../services/amberCurrency';
import { restorePurchases } from '../services/iap';
import { STREAK_FREEZE_CAP } from '../constants/gameBalance';
import { isPatronSync, isAdFreeSync } from '../services/entitlements';
import { clearWordHistory } from '../services/wordHistory';
import { clearAllSessions } from '../services/dialogueSession';
import { clearEvents } from '../services/eventLogger';
import { resetTutorial } from './Tutorial';
import { resetOnboarding } from '../services/onboarding';
import { hapticLight } from '../services/haptics';
import { clearPuzzleState } from '../services/puzzleSaveState';
import { clearHarvestState } from '../services/wordHarvest';
import { clearSacrificeState } from '../services/sacrifice';
import { clearTendingState } from '../services/tending';
import { clearWeeklyQuests } from '../services/weeklyQuests';
import { clearWhisperGallery } from '../services/whisperGallery';
import { clearChoiceState } from '../services/dialogueChoices';
import { clearNarrativeDeliveryState } from '../services/dialogue/animalDialogueNarrative';
import { resetMicroBeats, getNewCycleTitle, getNewCycleDescription, getNewCycleCTA } from '../services/phaseNarrative';
import {
  resetNotificationPrefs,
  getNotificationPrefs,
  setNotificationPrefs,
  requestNotificationPermission,
} from '../services/notifications';
import { clearRoomUpgrades } from '../services/roomUpgrades';
import { clearEntitlements } from '../services/entitlements';
import { clearCosmetics } from '../services/cosmetics';
import { clearAdPacing, privacyOptionsRequired, showPrivacyOptions } from '../services/ads';
import { clearHints } from '../services/hints';
import { clearMonetPrompts } from '../services/monetizationPrompts';
import { clearSharePrompts } from '../services/sharePrompts';
import { clearDailyLoginReward } from '../services/dailyLoginReward';
import { clearSupporterState } from '../services/supporterStipend';
import { clearSeasonPass } from '../services/seasonPass';
import { clearDailyAmberReward } from '../services/dailyAmberReward';
import { clearMasteryRecords } from '../services/masteryRecords';
import { clearDailyLadder } from '../services/dailyLadder';
import { clearOfferingRequests } from '../services/offeringRequests';
import { clearReviewPrompt } from '../services/reviewPrompt';
import { FONT_SIZE } from '../theme/typeScale';
import { playUiSound, uiHapticSelection } from '../services/uiSound';

const AMBER_ICON = require('../../assets/ui/amber.png');
// The carved-wood chevron (generateGameIcons chrome) that trails every link
// row, where an ASCII '>' used to sit beside the cottage plaques.
const CHEVRON_ICON = require('../../assets/ui/chevron.png');

interface SettingsScreenProps {
  /** Current narrative phase (0-5) — drives the phase-aware surface theme. */
  phase: number;
  onClose: () => void;
  /**
   * Called after Reset All when an in-place reload is unavailable
   * (Updates.reloadAsync throws in Expo Go / dev clients). The host (App.tsx)
   * must rebuild ALL in-memory session state from the now-cleared services —
   * a plain onClose would return the player to their stale in-memory save.
   */
  onReset?: () => void;
  /**
   * Called after a successful "Use the newer save" conflict restore so the
   * host rebuilds the running session from the restored storage WITHOUT
   * restarting onboarding (App.tsx: rebuildSessionFromStorage({restartOnboarding:false})).
   */
  onCloudRestored?: () => void;
}

// Native build identity. `expo-application` reads the installed APK/IPA's real
// versionName + versionCode from the OS, so it identifies the NATIVE build on
// the device regardless of any OTA update layered on top (unlike
// Constants.expoConfig, which reflects whatever JS bundle is running).
const NATIVE_VERSION = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0';
const NATIVE_BUILD = Application.nativeBuildVersion ?? '?';
const APP_VERSION = NATIVE_VERSION; // support mailto subject

// Which JS bundle is actually running: the one embedded in the native build,
// or an over-the-air update. The quickest way to tell if OTA is overriding
// the build you just installed.
function getBundleSource(): string {
  try {
    if (!Updates.isEnabled) return 'dev';
    return Updates.isEmbeddedLaunch ? 'embedded' : `update · ${Updates.channel ?? '?'}`;
  } catch {
    return 'dev';
  }
}
const BUNDLE_SOURCE = getBundleSource();

/**
 * Reset All Progress — the full local wipe, exported for regression testing.
 *
 * Root-cause notes for the "Reset All doesn't reset" player report:
 *  1. The clears used to run under Promise.all: a single rejection abandoned
 *     the batch mid-flight and skipped the restart flow entirely.
 *     Promise.allSettled makes every clear independent; failures are logged
 *     and returned, never fatal.
 *  2. With cloud save configured, the pre-reset save survived in the backend.
 *     The wipe clears `wordshift_home_progress` — the very key
 *     maybeAutoRestoreOnFreshInstall() uses as its fresh-install sentinel — so
 *     the next launch looked like a reinstall and silently restored the OLD
 *     cloud save. The reset must therefore overwrite the cloud row with the
 *     cleared state (uploadToCloud below) before the app reloads.
 *
 * Every service clear also resets its in-memory cache, so services report
 * virgin state immediately (no process restart required).
 *
 * Returns the names of any clears that failed (empty array on full success).
 */
export async function performFullReset(): Promise<string[]> {
  const clears: Array<[string, () => Promise<unknown>]> = [
    ['stats', clearStats],
    ['achievements', clearAchievements],
    ['dailyChallenge', clearDailyProgress],
    ['progress', clearProgress],
    ['wordHistory', clearWordHistory],
    ['dialogueSessions', clearAllSessions],
    ['events', clearEvents],
    ['tutorial', resetTutorial],
    ['onboarding', resetOnboarding],
    ['settings', resetSettings],
    ['puzzleState', clearPuzzleState],
    ['harvest', clearHarvestState],
    ['sacrifice', clearSacrificeState],
    ['weeklyQuests', clearWeeklyQuests],
    ['whisperGallery', clearWhisperGallery],
    ['dialogueChoices', clearChoiceState],
    ['narrativeDelivery', clearNarrativeDeliveryState],
    ['microBeats', resetMicroBeats],
    ['notificationPrefs', resetNotificationPrefs],
    ['roomUpgrades', clearRoomUpgrades],
    ['entitlements', clearEntitlements],
    ['cosmetics', clearCosmetics],
    ['adPacing', clearAdPacing],
    ['tending', clearTendingState],
    ['hints', clearHints],
    ['monetPrompts', clearMonetPrompts],
    ['sharePrompts', clearSharePrompts],
    ['dailyLogin', clearDailyLoginReward],
    ['dailyAmber', clearDailyAmberReward],
    ['supporterStipend', clearSupporterState],
    ['seasonPass', clearSeasonPass],
    ['masteryRecords', clearMasteryRecords],
    ['dailyLadder', clearDailyLadder],
    ['offeringRequests', clearOfferingRequests],
    ['reviewPrompt', clearReviewPrompt],
    ['syncStatus', clearSyncStatus],
    // The preview-graduation card is a TEACHING beat about a rules change that
    // recurs at solve 12 after any reset, so unlike the device-sticky mercy/
    // pointer flags (first-stuck, swift-hint) it must re-arm with progress —
    // observed on-device: a Reset All replay hit the neutral handoff with the
    // beat still consumed from the prior run. Literal key mirrors
    // PREVIEW_GRADUATION_SEEN_KEY in App.tsx (drift pinned by appIntegration).
    ['previewGraduation', () => AsyncStorage.removeItem('wordshift_preview_graduation_seen_v2')],
  ];

  // The async wrapper converts a synchronous throw (e.g. a broken import
  // making `fn` undefined) into a rejection, so one bad entry can never
  // abort the remaining clears.
  const results = await Promise.allSettled(clears.map(async ([, fn]) => fn()));
  const failures: string[] = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      failures.push(clears[i][0]);
      console.warn(`Reset All: clearing "${clears[i][0]}" failed:`, result.reason);
    }
  });

  // Overwrite the cloud row with the now-empty local state so the bootstrap's
  // fresh-install auto-restore can't resurrect the pre-reset save after the
  // reload. NoOp provider (cloud unconfigured) makes this a harmless no-op;
  // an offline failure must never block the reset itself.
  try {
    await uploadToCloud();
  } catch {
    // Non-fatal: the local wipe already succeeded.
  }

  return failures;
}

/**
 * Begin a New Cycle (NG+) — a PARTIAL reset that replays the descent while
 * keeping the collection. amberCurrency.startNewCycle() resets the phase /
 * finale / post-revelation progression and its own dialogue bookkeeping; here we
 * additionally reset the cross-service narrative state (dialogue sessions,
 * narrative delivery, player choices, micro-beats, offering requests) so the
 * story genuinely replays. Amber, unlocked rooms/animals, cosmetics,
 * achievements, stats, and the whisper archive are deliberately KEPT.
 *
 * No-op (returns 0) if the player hasn't reached the true endgame.
 * Exported for regression testing.
 */
export async function performNewCycle(): Promise<number> {
  const before = await canStartNewCycle();
  if (!before) return 0;
  const cycle = await startNewCycle();
  // Reset only the narrative-gating state so the descent replays; each is
  // independent, so one failure can't abort the rest.
  const clears: Array<() => Promise<unknown>> = [
    clearAllSessions,
    clearNarrativeDeliveryState,
    clearChoiceState,
    resetMicroBeats,
    clearOfferingRequests,
  ];
  await Promise.allSettled(clears.map(async (fn) => fn()));
  try {
    // NG+ is a deliberate overwrite of narrative state — force past the
    // newer-save conflict guard so the new cycle always becomes the cloud row.
    await uploadToCloud(true);
  } catch {
    // Non-fatal.
  }
  return cycle;
}

// ---------------------------------------------------------------------------
// CottageSwitch — an on-brand toggle that replaces the stock platform Switch
// (off-brand against the fully pixel-skinned app). It draws a cottage/surface-
// palette track + thumb from getSurfaceTheme, slides the thumb with a native-
// driver transform, and cross-fades the ON-state track fill via native-driver
// opacity (so the color change never needs a JS-bridge backgroundColor anim).
// Reduced motion OR a low-tier device snaps to the end state instantly. It
// keeps the SAME onValueChange(value) API and accessibility contract
// (accessibilityRole "switch" + accessibilityState.checked) as the old Switch.
// RN uses border-box sizing: content box = size - 2*(border + pad).
// ---------------------------------------------------------------------------
const SWITCH_WIDTH = 52;
const SWITCH_HEIGHT = 30;
const SWITCH_BORDER = 2;
const SWITCH_PAD = 3;
const SWITCH_INSET = SWITCH_BORDER + SWITCH_PAD;
const SWITCH_THUMB = SWITCH_HEIGHT - SWITCH_INSET * 2; // 20
const SWITCH_TRAVEL = SWITCH_WIDTH - SWITCH_INSET * 2 - SWITCH_THUMB; // 22

interface CottageSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  theme: SurfaceTheme;
  reducedMotion: boolean;
  accessibilityLabel?: string;
}

const CottageSwitch: React.FC<CottageSwitchProps> = ({
  value,
  onValueChange,
  theme,
  reducedMotion,
  accessibilityLabel,
}) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion || shouldSimplifyAnimations()) {
      anim.setValue(value ? 1 : 0);
      return;
    }
    const slide = Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 160,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });
    slide.start();
    return () => slide.stop();
  }, [value, reducedMotion, anim]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, SWITCH_TRAVEL] });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={10}
      style={[styles.switchTrack, { backgroundColor: theme.sectionBorder, borderColor: theme.cardBorder }]}
    >
      {/* ON-state fill cross-fades in (native-driver opacity) so the track
          color shift never needs a JS-bridge backgroundColor animation. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.switchTrackOn, { backgroundColor: theme.primaryBg, opacity: anim }]}
      />
      <Animated.View
        style={[
          styles.switchThumb,
          {
            backgroundColor: theme.headerTitle,
            borderColor: theme.cardBorder,
            transform: [{ translateX }],
          },
        ]}
      />
    </Pressable>
  );
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ phase, onClose, onReset, onCloudRestored }) => {
  const screenInsets = useScreenInsets();
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [dailyRemindersOn, setDailyRemindersOn] = useState(false);
  const [freezeCount, setFreezeCount] = useState(0);
  const [amberBalance, setAmberBalance] = useState(0);
  // Cloud backup & restore
  const cloudEnabled = isSupabaseConfigured();
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreInput, setRestoreInput] = useState('');
  const [restoreBusy, setRestoreBusy] = useState(false);
  // A newer cloud save exists on another device (upload conflict guard fired).
  const [syncConflict, setSyncConflict] = useState(false);
  const [purchaseRestoreBusy, setPurchaseRestoreBusy] = useState(false);
  // UMP privacy-options entry point (required to stay visible for EEA users
  // under the Google EU User Consent Policy; hidden everywhere else).
  const [privacyOptionsAvailable, setPrivacyOptionsAvailable] = useState(false);

  // Restore-modal choreography (presentation only — showRestore remains the
  // source of truth): backdrop fade + panel spring in, fast timing out.
  // New Cycle (NG+) availability — only at the true endgame (post-revelation).
  const [canCycle, setCanCycle] = useState(false);
  // The re-descent ceremony that plays BEFORE the reload once the player
  // confirms a New Cycle (null = not playing). PhaseTransitionOverlay renders
  // it; its onComplete performs the reload so the milestone lands first.
  const [cycleCeremony, setCycleCeremony] = useState<PhaseTransitionEvent | null>(null);
  // `restoreVisible` keeps the Modal mounted while the exit animation plays.
  const [restoreVisible, setRestoreVisible] = useState(false);
  const restoreBackdrop = useRef(new Animated.Value(0)).current;
  const restoreScale = useRef(new Animated.Value(0.92)).current;
  const reducedMotion = settings?.reducedMotion ?? false;

  useEffect(() => {
    if (showRestore) {
      setRestoreVisible(true);
      if (reducedMotion) {
        restoreBackdrop.setValue(1);
        restoreScale.setValue(1);
        return;
      }
      const enter = Animated.parallel([
        Animated.timing(restoreBackdrop, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(restoreScale, { toValue: 1, ...getModalInSpring(phase), useNativeDriver: true }),
      ]);
      enter.start();
      return () => enter.stop();
    }
    if (!restoreVisible) return;
    if (reducedMotion) {
      restoreBackdrop.setValue(0);
      restoreScale.setValue(0.92);
      setRestoreVisible(false);
      return;
    }
    const exit = Animated.parallel([
      Animated.timing(restoreBackdrop, {
        toValue: 0,
        duration: SURFACE.modalOutMs,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(restoreScale, {
        toValue: 0.92,
        duration: SURFACE.modalOutMs,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    exit.start(({ finished }) => {
      if (finished) setRestoreVisible(false);
    });
    return () => exit.stop();
  }, [showRestore, restoreVisible, reducedMotion, restoreBackdrop, restoreScale]);

  // Restore previously-purchased IAP entitlements (Patron / ad-free). Store
  // policy requires an accessible restore path outside the purchase modal, so
  // this lives in Settings as well as the Patron modal.
  const handleRestorePurchases = async () => {
    if (purchaseRestoreBusy) return;
    hapticLight();
    setPurchaseRestoreBusy(true);
    try {
      await restorePurchases();
      const patron = isPatronSync();
      const adFree = isAdFreeSync();
      if (patron) {
        showGameAlert('Purchases Restored', 'Welcome back. Your Patron benefits are active again.');
      } else if (adFree) {
        showGameAlert('Purchases Restored', 'Your ad-free purchase has been restored.');
      } else {
        showGameAlert('Restore Purchases', 'No previous purchases were found for this store account.');
      }
    } catch {
      showGameAlert('Restore Purchases', "We couldn't reach the store. Please try again in a moment.");
    } finally {
      setPurchaseRestoreBusy(false);
    }
  };

  const handleShowRecoveryCode = async () => {
    hapticLight();
    try {
      const code = await getOrCreateRecoveryCode();
      setRecoveryCode(code);
    } catch {
      showGameAlert('Backup', 'Could not generate a recovery code right now.');
    }
  };

  const handleRestoreFromCode = async () => {
    const code = restoreInput.trim();
    if (!code) return;
    setRestoreBusy(true);
    try {
      const linked = await linkRecoveryCode(code);
      if (!linked) {
        showGameAlert('Restore', "That code doesn't look right. Check it and try again.");
        return;
      }
      const restored = await downloadFromCloud();
      setShowRestore(false);
      setRestoreInput('');
      if (restored) {
        showGameAlert('Restored', 'Your progress was restored. The app will use it from now on.');
      } else {
        showGameAlert('Restore', 'No saved progress was found for that code yet.');
      }
    } catch {
      showGameAlert('Restore', 'Something went wrong restoring your progress.');
    } finally {
      setRestoreBusy(false);
    }
  };

  const refreshStreakFreeze = async () => {
    const [count, balance] = await Promise.all([getStreakFreezeCount(), getAmberBalance()]);
    setFreezeCount(count);
    setAmberBalance(balance);
  };

  useEffect(() => {
    getSettings().then(setSettings);
    getNotificationPrefs().then((prefs) => {
      setDailyRemindersOn(prefs.enabled && prefs.dailyReminderEnabled);
    });
    privacyOptionsRequired().then(setPrivacyOptionsAvailable);
    refreshStreakFreeze();
    canStartNewCycle().then(setCanCycle).catch(() => {});
    getSyncStatus().then((status) => setSyncConflict(!!status.conflictDetected)).catch(() => {});
  }, []);

  // A newer cloud save exists on another device (upload conflict guard fired).
  // Surface it with an explicit choice instead of silently clobbering either
  // side. Restoring the cloud save is DESTRUCTIVE to this device's progress, so
  // it is gated behind a confirm that spells out exactly what is kept vs lost
  // (the old one-tap "Use the newer save" wiped local progress with no warning).
  const runCloudRestore = () => {
    (async () => {
      try {
        const restored = await downloadFromCloud();
        if (restored) {
          // The conflict clears only on a real restore, and the running
          // session must rebuild from the restored storage (service caches
          // were invalidated by the restore; React state was not).
          setSyncConflict(false);
          onCloudRestored?.();
          showGameAlert('Restored', 'The newer save was restored. The app will use it from now on.');
        } else {
          showGameAlert('Restore', 'Could not fetch the newer save right now. Try again later.');
        }
      } catch {
        showGameAlert('Restore', 'Something went wrong restoring your progress.');
      }
    })();
  };

  const handleUseCloudSave = () => {
    hapticLight();
    showGameAlert(
      'Restore the newer cloud save?',
      "The save from your other device is newer. This device's current progress will be replaced by the cloud save, and anything you have played here since will be lost. This cannot be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace this device',
          style: 'destructive',
          onPress: runCloudRestore,
        },
      ],
    );
  };

  const handleKeepThisDevice = () => {
    hapticLight();
    showGameAlert(
      "Keep this device's save?",
      "This device's progress will be uploaded and will overwrite the newer save from your other device. The cloud copy will be lost. This cannot be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Keep this device',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear the conflict only when the forced upload actually
              // succeeded; a false return (offline, backend error) must leave
              // the banner standing or the newer save silently stays at risk.
              const uploaded = await uploadToCloud(true);
              if (uploaded) {
                setSyncConflict(false);
              } else {
                showGameAlert('Backup', 'Could not reach the cloud right now. Try again later.');
              }
            } catch {
              // Non-fatal; the conflict row stays until an upload succeeds.
            }
          },
        },
      ],
    );
  };

  // The New Cycle (NG+) session rebuild, run AFTER the re-descent ceremony has
  // played so the milestone lands as a moment rather than a hard restart.
  // performNewCycle() already committed the new cycle to storage before the
  // ceremony played, so this reuses the SAME in-place session rebuild the
  // cloud-restore conflict path already uses (App.tsx wires onCloudRestored to
  // rebuildSessionFromStorage({ restartOnboarding: false })) — New Cycle keeps
  // the running session exactly like that path, so no hard Updates.reloadAsync
  // is needed to pick up the new cycle's state. Only when no host rebuild is
  // wired (a bare render in isolation) does this fall back to the old
  // reload-or-manual-restart path, so the cycle can never be stranded.
  const handleCycleCeremonyComplete = () => {
    setCycleCeremony(null);
    if (onCloudRestored) {
      onCloudRestored();
      return;
    }
    (async () => {
      try {
        await Updates.reloadAsync();
      } catch {
        showGameAlert('The pattern turns', 'Restart WordShift to begin again.', [
          { text: 'OK', onPress: onClose },
        ]);
      }
    })();
  };

  const handleNewCycle = () => {
    hapticLight();
    showGameAlert(
      getNewCycleTitle(),
      getNewCycleDescription(),
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: getNewCycleCTA(),
          onPress: async () => {
            // Commit the new cycle to storage (force-uploads it as the cloud
            // row inside performNewCycle), then play the serene re-descent
            // ceremony; its onComplete performs the reload.
            await performNewCycle();
            setCycleCeremony(NEW_CYCLE_EVENT);
          },
        },
      ]
    );
  };

  const handleBuyStreakFreeze = () => {
    hapticLight();
    if (freezeCount >= STREAK_FREEZE_CAP) {
      showGameAlert(
        'Freezes Full',
        `You can hold up to ${STREAK_FREEZE_CAP} streak freezes. Use one first, then stock up again.`
      );
      return;
    }
    if (amberBalance < STREAK_FREEZE_AMBER_COST) {
      showGameAlert(
        'Not enough amber',
        `A streak freeze costs ${STREAK_FREEZE_AMBER_COST} amber. Solve a few more puzzles and come back.`
      );
      return;
    }
    showGameAlert(
      'Buy Streak Freeze',
      `Spend ${STREAK_FREEZE_AMBER_COST} amber for a streak freeze? It automatically protects your streak the next time you miss a day.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            const ok = await purchaseStreakFreeze();
            await refreshStreakFreeze();
            if (ok) {
              showGameAlert('Streak Freeze Ready', 'Your streak is now protected against one missed day.');
            } else {
              showGameAlert('Not enough amber', 'Purchase could not be completed.');
            }
          },
        },
      ]
    );
  };

  const handleToggle = async (key: keyof GameSettings, value: boolean) => {
    hapticLight();
    const updated = await updateSetting(key, value);
    setSettings(updated);
  };

  const handleMusicToggle = async (value: boolean) => {
    await handleToggle('musicEnabled', value);
    // Apply to any playing bed right away. Guarded lazy require: audio.ts
    // pulls expo-audio, which must not enter this module's import graph
    // (resetAll.test.ts loads SettingsScreen in Node), and audio failures
    // must never break the settings screen.
    try {
      const audio = require('../services/audio');
      if (value) {
        audio.startMusicForPhase(phase);
      } else {
        audio.stopMusic();
      }
    } catch {}
  };

  const handleDailyReminderToggle = async (value: boolean) => {
    hapticLight();
    if (value) {
      setDailyRemindersOn(true);
      const granted = await requestNotificationPermission();
      if (granted) {
        // Pass the current narrative phase so the rescheduled ladder carries
        // phase-appropriate copy, never bright Phase-0 lines at Phase 3-4.
        await setNotificationPrefs({ enabled: true, dailyReminderEnabled: true }, phase);
      } else {
        setDailyRemindersOn(false);
      }
    } else {
      setDailyRemindersOn(false);
      await setNotificationPrefs({ dailyReminderEnabled: false }, phase);
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const handleResetData = () => {
    showGameAlert(
      'Reset All Progress',
      'This erases everything on this device. Your house and every room, all your animal friends, and all your amber are lost, along with achievements, statistics, streaks, and daily challenge history. The game starts over from the very beginning. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await performFullReset();
            const fresh = await getSettings();
            setSettings(fresh);
            const freshPrefs = await getNotificationPrefs();
            setDailyRemindersOn(freshPrefs.enabled && freshPrefs.dailyReminderEnabled);
            await refreshStreakFreeze();
            // Reload the app so it re-enters the intro tutorial from a clean slate.
            // Onboarding only initializes at launch, so a live wipe alone would
            // leave the running session stuck on a stale "complete" state — the
            // player would have to kill the app by hand to see the tutorial again.
            // reloadAsync throws in Expo Go / dev; there onReset lets App.tsx
            // rebuild its in-memory session (persistence, puzzle board, victory
            // state, onboarding) so the reset is real without a process restart.
            showGameAlert(
              'Reset Complete',
              'WordShift will restart and replay the intro.',
              [
                {
                  text: 'OK',
                  onPress: async () => {
                    try {
                      await Updates.reloadAsync();
                    } catch {
                      if (onReset) {
                        onReset();
                      } else {
                        onClose();
                      }
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // Skeleton: render the header + a few empty PanelCards from static props
  // while the settings load lands, so the reveal never exposes a blank
  // screen — content cascades in as it arrives instead of popping
  // fully-formed once everything resolves.
  if (!settings) {
    const st = getSurfaceTheme(phase);
    const skeletonChipBg = `rgba(255, 255, 255, ${SURFACE.highlightAlpha})`;
    return (
      <View style={[styles.container, { backgroundColor: st.screenBg }]}>
        <View style={[styles.header, { paddingTop: screenInsets.top + 16 }]}>
          <TouchableOpacity
            style={[styles.backChip, { backgroundColor: skeletonChipBg, borderColor: st.headerChipBorder }]}
            onPress={() => { playUiSound('selection'); uiHapticSelection(); onClose(); }}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
          >
            <Text style={[styles.backChipText, { color: st.headerTitle }]}>{'<'} Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: st.headerTitle }]}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.content}>
          <PanelCard phase={phase} kind="panel" style={styles.section}>
            <View style={styles.skeletonBlock} />
          </PanelCard>
          <PanelCard phase={phase} kind="panel" style={styles.section}>
            <View style={styles.skeletonBlock} />
          </PanelCard>
          <PanelCard phase={phase} kind="panel" style={styles.section}>
            <View style={styles.skeletonBlock} />
          </PanelCard>
        </View>
      </View>
    );
  }

  const t = getSurfaceTheme(phase);
  // Framed light lift for the back chip — the kit's own highlight band alpha
  // over the deep screen base, framed with the panel border tint.
  const chipBg = `rgba(255, 255, 255, ${SURFACE.highlightAlpha})`;
  const rowTint = { backgroundColor: t.rowBg };

  return (
    <View style={[styles.container, { backgroundColor: t.screenBg }]}>
      <View style={[styles.header, { paddingTop: screenInsets.top + 16 }]}>
        <TouchableOpacity
          style={[styles.backChip, { backgroundColor: chipBg, borderColor: t.headerChipBorder }]}
          onPress={() => { playUiSound('selection'); uiHapticSelection(); onClose(); }}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Text style={[styles.backChipText, { color: t.headerTitle }]}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.headerTitle }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sound & Haptics */}
        <PanelCard phase={phase} kind="panel" style={styles.section}>
          <PixelPlaque phase={phase} label={'FEEDBACK'} style={styles.sectionPlaque} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: t.title }]}>Sound Effects</Text>
              <Text style={[styles.settingDescription, { color: t.muted }]}>Play sounds on moves and victories</Text>
            </View>
            <CottageSwitch
              value={settings.soundEnabled}
              onValueChange={(v) => handleToggle('soundEnabled', v)}
              theme={t}
              reducedMotion={reducedMotion}
              accessibilityLabel="Sound effects"
            />
          </View>

          <View style={[styles.settingRow, rowTint]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: t.title }]}>Music</Text>
              <Text style={[styles.settingDescription, { color: t.muted }]}>Gentle background music that follows the mood</Text>
            </View>
            <CottageSwitch
              value={settings.musicEnabled}
              onValueChange={handleMusicToggle}
              theme={t}
              reducedMotion={reducedMotion}
              accessibilityLabel="Music"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: t.title }]}>Haptic Feedback</Text>
              <Text style={[styles.settingDescription, { color: t.muted }]}>Vibration on taps and interactions</Text>
            </View>
            <CottageSwitch
              value={settings.hapticsEnabled}
              onValueChange={(v) => handleToggle('hapticsEnabled', v)}
              theme={t}
              reducedMotion={reducedMotion}
              accessibilityLabel="Haptic feedback"
            />
          </View>
        </PanelCard>

        {/* Accessibility */}
        <PanelCard phase={phase} kind="panel" style={styles.section}>
          <PixelPlaque phase={phase} label={'ACCESSIBILITY'} style={styles.sectionPlaque} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: t.title }]}>Reduced Motion</Text>
              <Text style={[styles.settingDescription, { color: t.muted }]}>Minimize animations for accessibility</Text>
            </View>
            <CottageSwitch
              value={settings.reducedMotion}
              onValueChange={(v) => handleToggle('reducedMotion', v)}
              theme={t}
              reducedMotion={reducedMotion}
              accessibilityLabel="Reduced motion"
            />
          </View>

          <View style={[styles.settingRow, rowTint]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: t.title }]}>Swift Victories</Text>
              <Text style={[styles.settingDescription, { color: t.muted }]}>
                A quicker results card after each solve. Big moments still play in full.
              </Text>
            </View>
            <CottageSwitch
              value={settings.swiftVictories}
              onValueChange={(v) => handleToggle('swiftVictories', v)}
              theme={t}
              reducedMotion={reducedMotion}
              accessibilityLabel="Swift victories"
            />
          </View>
        </PanelCard>

        {/* Notifications */}
        <PanelCard phase={phase} kind="panel" style={styles.section}>
          <PixelPlaque phase={phase} label={'NOTIFICATIONS'} style={styles.sectionPlaque} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: t.title }]}>Daily Reminders</Text>
              <Text style={[styles.settingDescription, { color: t.muted }]}>Daily puzzle reminder</Text>
            </View>
            <CottageSwitch
              value={dailyRemindersOn}
              onValueChange={handleDailyReminderToggle}
              theme={t}
              reducedMotion={reducedMotion}
              accessibilityLabel="Daily reminders"
            />
          </View>
        </PanelCard>

        {/* Streak Protection */}
        <PanelCard phase={phase} kind="panel" style={styles.section}>
          <PixelPlaque phase={phase} label={'STREAK PROTECTION'} style={styles.sectionPlaque} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: t.title }]}>Streak Freezes</Text>
              <Text style={[styles.settingDescription, { color: t.muted }]}>
                {freezeCount > 0
                  ? `${freezeCount} ready. Each protects your streak for one missed day.`
                  : 'Protects your streak the next time you miss a day.'}
              </Text>
            </View>
            {/* Stays fully enabled even when unaffordable — tapping explains
                the shortfall via the Alert (deliberate), so no dimmed-but-
                pressable fake-disabled state for screen readers. */}
            <CandyButton
              label={`Buy · ${STREAK_FREEZE_AMBER_COST}`}
              onPress={handleBuyStreakFreeze}
              phase={phase}
              variant="amber"
              icon={AMBER_ICON}
              accessibilityLabel={`Buy a streak freeze for ${STREAK_FREEZE_AMBER_COST} amber`}
            />
          </View>
        </PanelCard>

        {/* Backup & Restore (only when a cloud backend is configured) */}
        {cloudEnabled && (
          <PanelCard phase={phase} kind="panel" style={styles.section}>
            <PixelPlaque phase={phase} label={'BACKUP & RESTORE'} style={styles.sectionPlaque} />
            <TouchableOpacity style={styles.aboutRow} onPress={handleShowRecoveryCode} accessibilityRole="button" accessibilityLabel="Show recovery code">
              <Text style={[styles.linkText, { color: t.secondaryText }]}>{recoveryCode ? 'Your recovery code' : 'Show recovery code'}</Text>
            </TouchableOpacity>
            {recoveryCode && (
              <View style={[styles.recoveryCodeBox, { backgroundColor: t.rowBg, borderColor: t.rowBorder }]}>
                <Text style={[styles.recoveryCodeText, { color: t.title }]} accessibilityLabel={`Recovery code ${recoveryCode}`}>{recoveryCode}</Text>
                <Text style={[styles.recoveryCodeHint, { color: t.muted }]}>Write this down. Enter it on a new device to restore your progress.</Text>
              </View>
            )}
            <TouchableOpacity style={[styles.aboutRow, rowTint]} onPress={() => { hapticLight(); setShowRestore(true); }} accessibilityRole="button" accessibilityLabel="Restore from another device">
              <Text style={[styles.linkText, { color: t.secondaryText }]}>Restore from another device</Text>
            </TouchableOpacity>
            {syncConflict && (
              <View style={[styles.recoveryCodeBox, { backgroundColor: t.rowBg, borderColor: t.amberTintBorder }]}>
                <Text style={[styles.recoveryCodeHint, { color: t.title }]}>
                  A newer save was found on another device. Choose which one to keep. Either choice replaces the other and cannot be undone.
                </Text>
                <TouchableOpacity style={styles.aboutRow} onPress={handleUseCloudSave} accessibilityRole="button" accessibilityLabel="Restore the newer cloud save, replacing this device">
                  <Text style={[styles.linkText, { color: t.amberText }]}>Restore the newer cloud save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.aboutRow} onPress={handleKeepThisDevice} accessibilityRole="button" accessibilityLabel="Keep this device's save, replacing the cloud copy">
                  <Text style={[styles.linkText, { color: t.secondaryText }]}>{"Keep this device's save"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </PanelCard>
        )}

        {/* Data */}
        {/* New Cycle (NG+) — only surfaced at the true endgame (post-revelation) */}
        {canCycle && (
          <PanelCard phase={phase} kind="panel" style={styles.section}>
            <PixelPlaque phase={phase} label={'THE PATTERN'} style={styles.sectionPlaque} />
            <TouchableOpacity
              style={styles.aboutRow}
              onPress={handleNewCycle}
              accessibilityRole="button"
              accessibilityLabel={getNewCycleTitle()}
            >
              <Text style={[styles.linkText, { color: t.title }]}>{getNewCycleTitle()}</Text>
              <Image source={CHEVRON_ICON} style={styles.linkChevronIcon} resizeMode="contain" accessible={false} />
            </TouchableOpacity>
            <Text style={[styles.dangerDescription, { color: t.muted, paddingHorizontal: 4 }]}>
              Begin the descent again. The house stays as you built it.
            </Text>
          </PanelCard>
        )}

        <PanelCard phase={phase} kind="panel" style={styles.section}>
          <PixelPlaque phase={phase} label={'DATA'} style={styles.sectionPlaque} />
          <TouchableOpacity style={styles.dangerRow} onPress={handleResetData}>
            <Text style={[styles.dangerText, { color: t.dangerText }]}>Reset All Progress</Text>
            <Text style={[styles.dangerDescription, { color: t.muted }]}>
              Erases your house, animals, and amber, plus statistics, achievements, and daily challenge history. Cannot be undone.
            </Text>
          </TouchableOpacity>
        </PanelCard>

        {/* Purchases — restore IAP entitlements (store-policy requirement) */}
        <PanelCard phase={phase} kind="panel" style={styles.section}>
          <PixelPlaque phase={phase} label={'PURCHASES'} style={styles.sectionPlaque} />
          <TouchableOpacity
            style={styles.aboutRow}
            onPress={handleRestorePurchases}
            disabled={purchaseRestoreBusy}
            accessibilityRole="button"
            accessibilityLabel="Restore Purchases"
          >
            <Text style={[styles.linkText, { color: t.secondaryText }]}>Restore Purchases</Text>
            {purchaseRestoreBusy
              ? <ActivityIndicator color={t.secondaryText} />
              : <Image source={CHEVRON_ICON} style={styles.linkChevronIcon} resizeMode="contain" accessible={false} />}
          </TouchableOpacity>
        </PanelCard>

        {/* About */}
        <PanelCard phase={phase} kind="panel" style={styles.section}>
          <PixelPlaque phase={phase} label={'ABOUT'} style={styles.sectionPlaque} />
          {/* Passive, player-initiated store link. Deliberately NOT a prompt:
              the review-bomb guard in reviewPrompt.ts stays the only surface
              that ever ASKS, and it never asks past Phase 1. */}
          <TouchableOpacity
            style={[styles.aboutRow, rowTint]}
            onPress={() => openLink(PLAY_STORE_URL)}
            accessibilityRole="link"
            accessibilityLabel="Rate WordShift"
          >
            <Text style={[styles.linkText, { color: t.secondaryText }]}>Rate WordShift</Text>
            <Image source={CHEVRON_ICON} style={styles.linkChevronIcon} resizeMode="contain" accessible={false} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.aboutRow}
            onPress={() => openLink(EXTERNAL_LINKS.privacyPolicy)}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
          >
            <Text style={[styles.linkText, { color: t.secondaryText }]}>Privacy Policy</Text>
            <Image source={CHEVRON_ICON} style={styles.linkChevronIcon} resizeMode="contain" accessible={false} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.aboutRow, rowTint]}
            onPress={() => openLink(EXTERNAL_LINKS.termsOfService)}
            accessibilityRole="link"
            accessibilityLabel="Terms of Service"
          >
            <Text style={[styles.linkText, { color: t.secondaryText }]}>Terms of Service</Text>
            <Image source={CHEVRON_ICON} style={styles.linkChevronIcon} resizeMode="contain" accessible={false} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.aboutRow}
            onPress={() => openLink(EXTERNAL_LINKS.dataDeletion)}
            accessibilityRole="link"
            accessibilityLabel="Data Deletion"
          >
            <Text style={[styles.linkText, { color: t.secondaryText }]}>Data Deletion</Text>
            <Image source={CHEVRON_ICON} style={styles.linkChevronIcon} resizeMode="contain" accessible={false} />
          </TouchableOpacity>
          {privacyOptionsAvailable && (
            <TouchableOpacity
              style={styles.aboutRow}
              onPress={() => {
                hapticLight();
                showPrivacyOptions();
              }}
              accessibilityRole="button"
              accessibilityLabel="Privacy Options"
            >
              <Text style={[styles.linkText, { color: t.secondaryText }]}>Privacy Options</Text>
              <Image source={CHEVRON_ICON} style={styles.linkChevronIcon} resizeMode="contain" accessible={false} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.aboutRow, rowTint]}
            onPress={() => openLink(getSupportMailto(APP_VERSION))}
            accessibilityRole="button"
            accessibilityLabel="Contact Support"
          >
            <Text style={[styles.linkText, { color: t.secondaryText }]}>Contact Support</Text>
            <Image source={CHEVRON_ICON} style={styles.linkChevronIcon} resizeMode="contain" accessible={false} />
          </TouchableOpacity>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: t.body }]}>WordShift</Text>
            <Text style={[styles.aboutValue, { color: t.muted }]}>{`v${NATIVE_VERSION} (${NATIVE_BUILD})`}</Text>
          </View>
          <View style={[styles.aboutRow, rowTint]}>
            <Text style={[styles.aboutLabel, { color: t.body }]}>Build</Text>
            <Text style={[styles.aboutValue, { color: t.muted }]}>{BUNDLE_SOURCE}</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: t.body }]}>Made with</Text>
            <Text style={[styles.aboutValue, { color: t.muted }]}>love and existential dread</Text>
          </View>
        </PanelCard>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal visible={restoreVisible} transparent animationType="none" statusBarTranslucent onRequestClose={() => setShowRestore(false)}>
        <View style={styles.restoreRoot}>
          <Animated.View
            style={[styles.restoreBackdrop, { backgroundColor: t.overlay, opacity: restoreBackdrop }]}
          />
          <Animated.View style={{ opacity: restoreBackdrop, transform: [{ scale: restoreScale }] }}>
            <PanelCard phase={phase} kind="panel" style={styles.restoreCard}>
              <Text style={[styles.restoreTitle, { color: t.title }]}>Restore progress</Text>
              <Text style={[styles.restoreHint, { color: t.body }]}>Enter the recovery code from your other device. This replaces the data currently on this device.</Text>
              <TextInput
                style={[styles.restoreInput, { borderColor: t.sectionBorder, backgroundColor: t.sectionBg, color: t.title }]}
                value={restoreInput}
                onChangeText={setRestoreInput}
                placeholder="WS-XXXX-XXXX"
                placeholderTextColor={t.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!restoreBusy}
                accessibilityLabel="Recovery code"
              />
              <View style={styles.restoreButtons}>
                <CandyButton
                  label="Cancel"
                  onPress={() => { setShowRestore(false); setRestoreInput(''); }}
                  phase={phase}
                  variant="quiet"
                  disabled={restoreBusy}
                  accessibilityLabel="Cancel"
                  style={styles.restoreCancel}
                />
                {/* Primary confirm keeps the CandyButton bevel anatomy inline so
                    the busy spinner can live on the face (label-only component). */}
                <TouchableOpacity
                  style={[styles.restoreConfirm, (restoreBusy || !restoreInput.trim()) && styles.restoreConfirmDisabled]}
                  onPress={handleRestoreFromCode}
                  disabled={restoreBusy || !restoreInput.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Restore"
                >
                  <View style={[styles.confirmEdge, { backgroundColor: t.primaryEdge }]} />
                  <View style={[styles.confirmFace, { backgroundColor: t.primaryBg }]}>
                    <View style={styles.confirmHighlight} />
                    {restoreBusy
                      ? <ActivityIndicator color={t.primaryText} />
                      : <Text style={[styles.restoreConfirmText, { color: t.primaryText }]}>Restore</Text>}
                  </View>
                </TouchableOpacity>
              </View>
            </PanelCard>
          </Animated.View>
        </View>
      </Modal>

      {/* New Cycle (NG+) re-descent ceremony — plays over everything before the
          app reloads, so the milestone lands as a moment (see handleNewCycle).
          Renders null until a cycle is confirmed. */}
      <PhaseTransitionOverlay event={cycleCeremony} onComplete={handleCycleCeremonyComplete} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor applied inline (phase-aware screenBg)
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    // paddingTop applied inline via useScreenInsets (safe-area aware)
    paddingBottom: 14,
  },
  backChip: {
    width: 88,
    minHeight: 44,
    borderRadius: SURFACE.buttonRadius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChipText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.callout,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 88,
  },
  title: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.display,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionPlaque: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.small,
    fontWeight: '800',
    letterSpacing: SURFACE.sectionLetterSpacing,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  section: {
    marginBottom: 20,
    paddingTop: 18,
    paddingHorizontal: SURFACE.panelPadX,
    paddingBottom: 18,
  },
  // Skeleton placeholder block (empty card body while the settings load lands).
  skeletonBlock: {
    height: 96,
  },
  // Cottage-styled toggle (replaces the stock platform Switch).
  switchTrack: {
    width: SWITCH_WIDTH,
    height: SWITCH_HEIGHT,
    borderRadius: SWITCH_HEIGHT / 2,
    borderWidth: SWITCH_BORDER,
    padding: SWITCH_PAD,
    alignItems: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  switchTrackOn: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: SWITCH_HEIGHT / 2,
  },
  switchThumb: {
    width: SWITCH_THUMB,
    height: SWITCH_THUMB,
    borderRadius: SWITCH_THUMB / 2,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    marginBottom: 6,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.large,
    fontWeight: '700',
  },
  settingDescription: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.small,
    marginTop: 2,
  },
  freezeDim: {
    opacity: 0.55,
  },
  dangerRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    marginBottom: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  dangerText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.large,
    fontWeight: '700',
  },
  dangerDescription: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.small,
    marginTop: 2,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    marginBottom: 6,
    minHeight: 44,
  },
  aboutLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.callout,
    fontWeight: '600',
  },
  aboutValue: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.bodyLg,
  },
  linkText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.callout,
    fontWeight: '600',
  },
  linkChevronIcon: {
    width: 14,
    height: 14,
    opacity: 0.85,
  },
  bottomSpacer: {
    height: 60,
  },
  recoveryCodeBox: {
    marginHorizontal: 4,
    marginBottom: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  recoveryCodeText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.headline,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  recoveryCodeHint: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.small,
    textAlign: 'center',
    marginTop: 6,
  },
  restoreRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  restoreBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  restoreCard: {
    paddingVertical: 22,
    paddingHorizontal: SURFACE.panelPadX,
  },
  restoreTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.headline,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  restoreHint: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.body,
    marginBottom: 16,
    lineHeight: 19,
  },
  restoreInput: {
    fontFamily: PIXEL_FONT_BOLD,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FONT_SIZE.title,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 18,
  },
  restoreButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restoreCancel: {
    flex: 1,
    marginRight: 8,
  },
  restoreConfirm: {
    flex: 1,
    marginLeft: 8,
    paddingBottom: SURFACE.bevelDepth,
  },
  restoreConfirmDisabled: {
    opacity: 0.45,
  },
  confirmEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: SURFACE.bevelDepth,
    bottom: 0,
    borderRadius: SURFACE.buttonRadius,
  },
  confirmFace: {
    borderRadius: SURFACE.buttonRadius,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  confirmHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
    backgroundColor: `rgba(255, 255, 255, ${SURFACE.highlightAlpha})`,
  },
  restoreConfirmText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.callout,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
