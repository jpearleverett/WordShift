import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as Application from 'expo-application';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { getOrCreateRecoveryCode, linkRecoveryCode, downloadFromCloud, clearSyncStatus, uploadToCloud } from '../services/cloudSave';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { PanelCard } from './ui/PanelCard';
import { CandyButton } from './ui/CandyButton';
import { useScreenInsets } from '../hooks/useScreenInsets';
import { EXTERNAL_LINKS, getSupportMailto } from '../constants/links';
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
} from '../services/amberCurrency';
import { restorePurchases } from '../services/iap';
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
import { resetMicroBeats } from '../services/phaseNarrative';
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
import { clearDailyLoginReward } from '../services/dailyLoginReward';
import { clearDailyAmberReward } from '../services/dailyAmberReward';

const AMBER_ICON = require('../../assets/ui/amber.png');

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
    ['dailyLogin', clearDailyLoginReward],
    ['dailyAmber', clearDailyAmberReward],
    ['syncStatus', clearSyncStatus],
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

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ phase, onClose, onReset }) => {
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
  const [purchaseRestoreBusy, setPurchaseRestoreBusy] = useState(false);
  // UMP privacy-options entry point (required to stay visible for EEA users
  // under the Google EU User Consent Policy; hidden everywhere else).
  const [privacyOptionsAvailable, setPrivacyOptionsAvailable] = useState(false);

  // Restore-modal choreography (presentation only — showRestore remains the
  // source of truth): backdrop fade + panel spring in, fast timing out.
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
        Animated.spring(restoreScale, { toValue: 1, ...SURFACE.modalIn, useNativeDriver: true }),
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
        Alert.alert('Purchases Restored', 'Welcome back. Your Patron benefits are active again.');
      } else if (adFree) {
        Alert.alert('Purchases Restored', 'Your ad-free purchase has been restored.');
      } else {
        Alert.alert('Restore Purchases', 'No previous purchases were found for this store account.');
      }
    } catch {
      Alert.alert('Restore Purchases', "We couldn't reach the store. Please try again in a moment.");
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
      Alert.alert('Backup', 'Could not generate a recovery code right now.');
    }
  };

  const handleRestoreFromCode = async () => {
    const code = restoreInput.trim();
    if (!code) return;
    setRestoreBusy(true);
    try {
      const linked = await linkRecoveryCode(code);
      if (!linked) {
        Alert.alert('Restore', "That code doesn't look right. Check it and try again.");
        return;
      }
      const restored = await downloadFromCloud();
      setShowRestore(false);
      setRestoreInput('');
      if (restored) {
        Alert.alert('Restored', 'Your progress was restored. The app will use it from now on.');
      } else {
        Alert.alert('Restore', 'No saved progress was found for that code yet.');
      }
    } catch {
      Alert.alert('Restore', 'Something went wrong restoring your progress.');
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
  }, []);

  const handleBuyStreakFreeze = () => {
    hapticLight();
    if (amberBalance < STREAK_FREEZE_AMBER_COST) {
      Alert.alert(
        'Not enough amber',
        `A streak freeze costs ${STREAK_FREEZE_AMBER_COST} amber. Solve a few more puzzles and come back.`
      );
      return;
    }
    Alert.alert(
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
              Alert.alert('Streak Freeze Ready', 'Your streak is now protected against one missed day.');
            } else {
              Alert.alert('Not enough amber', 'Purchase could not be completed.');
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

  const handleDailyReminderToggle = async (value: boolean) => {
    hapticLight();
    if (value) {
      setDailyRemindersOn(true);
      const granted = await requestNotificationPermission();
      if (granted) {
        await setNotificationPrefs({ enabled: true, dailyReminderEnabled: true });
      } else {
        setDailyRemindersOn(false);
      }
    } else {
      setDailyRemindersOn(false);
      await setNotificationPrefs({ dailyReminderEnabled: false });
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will reset all your progress, achievements, and statistics. This cannot be undone.',
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
            Alert.alert(
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

  if (!settings) return null;

  const t = getSurfaceTheme(phase);
  // Framed light lift for the back chip — the kit's own highlight band alpha
  // over the deep screen base, framed with the panel border tint.
  const chipBg = `rgba(255, 255, 255, ${SURFACE.highlightAlpha})`;
  const switchTrack = { false: t.sectionBorder, true: t.primaryBg };
  const rowTint = { backgroundColor: t.rowBg };

  return (
    <View style={[styles.container, { backgroundColor: t.screenBg }]}>
      <View style={[styles.header, { paddingTop: screenInsets.top + 16 }]}>
        <TouchableOpacity
          style={[styles.backChip, { backgroundColor: chipBg, borderColor: t.cardBorder }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Text style={[styles.backChipText, { color: t.primaryText }]}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.primaryText }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sound & Haptics */}
        <PanelCard phase={phase} kind="panel" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.muted }]}>FEEDBACK</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: t.title }]}>Sound Effects</Text>
              <Text style={[styles.settingDescription, { color: t.muted }]}>Play sounds on moves and victories</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(v) => handleToggle('soundEnabled', v)}
              trackColor={switchTrack}
              thumbColor={settings.soundEnabled ? t.primaryText : t.secondaryText}
              accessibilityRole="switch"
              accessibilityLabel="Sound effects"
              accessibilityState={{ checked: settings.soundEnabled }}
            />
          </View>

          <View style={[styles.settingRow, rowTint]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: t.title }]}>Haptic Feedback</Text>
              <Text style={[styles.settingDescription, { color: t.muted }]}>Vibration on taps and interactions</Text>
            </View>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(v) => handleToggle('hapticsEnabled', v)}
              trackColor={switchTrack}
              thumbColor={settings.hapticsEnabled ? t.primaryText : t.secondaryText}
              accessibilityRole="switch"
              accessibilityLabel="Haptic feedback"
              accessibilityState={{ checked: settings.hapticsEnabled }}
            />
          </View>
        </PanelCard>

        {/* Accessibility */}
        <PanelCard phase={phase} kind="panel" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.muted }]}>ACCESSIBILITY</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: t.title }]}>Reduced Motion</Text>
              <Text style={[styles.settingDescription, { color: t.muted }]}>Minimize animations for accessibility</Text>
            </View>
            <Switch
              value={settings.reducedMotion}
              onValueChange={(v) => handleToggle('reducedMotion', v)}
              trackColor={switchTrack}
              thumbColor={settings.reducedMotion ? t.primaryText : t.secondaryText}
              accessibilityRole="switch"
              accessibilityLabel="Reduced motion"
              accessibilityState={{ checked: settings.reducedMotion }}
            />
          </View>
        </PanelCard>

        {/* Notifications */}
        <PanelCard phase={phase} kind="panel" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.muted }]}>NOTIFICATIONS</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: t.title }]}>Daily Reminders</Text>
              <Text style={[styles.settingDescription, { color: t.muted }]}>Daily puzzle reminder</Text>
            </View>
            <Switch
              value={dailyRemindersOn}
              onValueChange={handleDailyReminderToggle}
              trackColor={switchTrack}
              thumbColor={dailyRemindersOn ? t.primaryText : t.secondaryText}
              accessibilityRole="switch"
              accessibilityState={{ checked: dailyRemindersOn }}
            />
          </View>
        </PanelCard>

        {/* Streak Protection */}
        <PanelCard phase={phase} kind="panel" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.muted }]}>STREAK PROTECTION</Text>
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
            <Text style={[styles.sectionTitle, { color: t.muted }]}>BACKUP &amp; RESTORE</Text>
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
          </PanelCard>
        )}

        {/* Data */}
        <PanelCard phase={phase} kind="panel" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.muted }]}>DATA</Text>
          <TouchableOpacity style={styles.dangerRow} onPress={handleResetData}>
            <Text style={[styles.dangerText, { color: t.dangerText }]}>Reset All Progress</Text>
            <Text style={[styles.dangerDescription, { color: t.muted }]}>
              Clears statistics, achievements, and daily challenge history
            </Text>
          </TouchableOpacity>
        </PanelCard>

        {/* Purchases — restore IAP entitlements (store-policy requirement) */}
        <PanelCard phase={phase} kind="panel" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.muted }]}>PURCHASES</Text>
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
              : <Text style={[styles.linkChevron, { color: t.muted }]}>{'>'}</Text>}
          </TouchableOpacity>
        </PanelCard>

        {/* About */}
        <PanelCard phase={phase} kind="panel" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.muted }]}>ABOUT</Text>
          <TouchableOpacity
            style={styles.aboutRow}
            onPress={() => openLink(EXTERNAL_LINKS.privacyPolicy)}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
          >
            <Text style={[styles.linkText, { color: t.secondaryText }]}>Privacy Policy</Text>
            <Text style={[styles.linkChevron, { color: t.muted }]}>{'>'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.aboutRow, rowTint]}
            onPress={() => openLink(EXTERNAL_LINKS.termsOfService)}
            accessibilityRole="link"
            accessibilityLabel="Terms of Service"
          >
            <Text style={[styles.linkText, { color: t.secondaryText }]}>Terms of Service</Text>
            <Text style={[styles.linkChevron, { color: t.muted }]}>{'>'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.aboutRow}
            onPress={() => openLink(EXTERNAL_LINKS.dataDeletion)}
            accessibilityRole="link"
            accessibilityLabel="Data Deletion"
          >
            <Text style={[styles.linkText, { color: t.secondaryText }]}>Data Deletion</Text>
            <Text style={[styles.linkChevron, { color: t.muted }]}>{'>'}</Text>
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
              <Text style={[styles.linkChevron, { color: t.muted }]}>{'>'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.aboutRow, rowTint]}
            onPress={() => openLink(getSupportMailto(APP_VERSION))}
            accessibilityRole="button"
            accessibilityLabel="Contact Support"
          >
            <Text style={[styles.linkText, { color: t.secondaryText }]}>Contact Support</Text>
            <Text style={[styles.linkChevron, { color: t.muted }]}>{'>'}</Text>
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
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 88,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: SURFACE.sectionLetterSpacing,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 6,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  freezeDim: {
    opacity: 0.55,
  },
  dangerRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  dangerText: {
    fontSize: 16,
    fontWeight: '700',
  },
  dangerDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 6,
    minHeight: 44,
  },
  aboutLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  aboutValue: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
  },
  linkChevron: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 60,
  },
  recoveryCodeBox: {
    marginHorizontal: 8,
    marginBottom: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  recoveryCodeText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  recoveryCodeHint: {
    fontSize: 12,
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
    padding: 22,
  },
  restoreTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  restoreHint: {
    fontSize: 13.5,
    marginBottom: 16,
    lineHeight: 19,
  },
  restoreInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
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
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
