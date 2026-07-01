import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Platform,
  StatusBar,
  Alert,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { getOrCreateRecoveryCode, linkRecoveryCode, downloadFromCloud, clearSyncStatus } from '../services/cloudSave';
import { CandyColors } from '../theme/colors';
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
import { clearAdPacing } from '../services/ads';
import { clearHints } from '../services/hints';
import { clearMonetPrompts } from '../services/monetizationPrompts';
import { clearDailyLoginReward } from '../services/dailyLoginReward';

interface SettingsScreenProps {
  onClose: () => void;
}

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
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
            await Promise.all([
              clearStats(),
              clearAchievements(),
              clearDailyProgress(),
              clearProgress(),
              clearWordHistory(),
              clearAllSessions(),
              clearEvents(),
              resetTutorial(),
              resetOnboarding(),
              resetSettings(),
              clearPuzzleState(),
              clearHarvestState(),
              clearSacrificeState(),
              clearWeeklyQuests(),
              clearWhisperGallery(),
              clearChoiceState(),
              resetMicroBeats(),
              resetNotificationPrefs(),
              clearRoomUpgrades(),
              clearEntitlements(),
              clearCosmetics(),
              clearAdPacing(),
              clearTendingState(),
              clearHints(),
              clearMonetPrompts(),
              clearDailyLoginReward(),
              clearSyncStatus(),
            ]);
            const fresh = await getSettings();
            setSettings(fresh);
            const freshPrefs = await getNotificationPrefs();
            setDailyRemindersOn(freshPrefs.enabled && freshPrefs.dailyReminderEnabled);
            await refreshStreakFreeze();
            // Reload the app so it re-enters the intro tutorial from a clean slate.
            // Onboarding only initializes at launch, so a live wipe alone would
            // leave the running session stuck on a stale "complete" state — the
            // player would have to kill the app by hand to see the tutorial again.
            // reloadAsync throws in Expo Go / dev; there we just close Settings and
            // onboarding replays on the next manual launch.
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
                      onClose();
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sound & Haptics */}
        <Text style={styles.sectionTitle}>FEEDBACK</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sound Effects</Text>
              <Text style={styles.settingDescription}>Play sounds on moves and victories</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(v) => handleToggle('soundEnabled', v)}
              trackColor={{ false: CandyColors.gray[300], true: CandyColors.purple.light }}
              thumbColor={settings.soundEnabled ? CandyColors.purple.main : CandyColors.gray[100]}
              accessibilityRole="switch"
              accessibilityLabel="Sound effects"
              accessibilityState={{ checked: settings.soundEnabled }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>Vibration on taps and interactions</Text>
            </View>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(v) => handleToggle('hapticsEnabled', v)}
              trackColor={{ false: CandyColors.gray[300], true: CandyColors.purple.light }}
              thumbColor={settings.hapticsEnabled ? CandyColors.purple.main : CandyColors.gray[100]}
              accessibilityRole="switch"
              accessibilityLabel="Haptic feedback"
              accessibilityState={{ checked: settings.hapticsEnabled }}
            />
          </View>
        </View>

        {/* Accessibility */}
        <Text style={styles.sectionTitle}>ACCESSIBILITY</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Reduced Motion</Text>
              <Text style={styles.settingDescription}>Minimize animations for accessibility</Text>
            </View>
            <Switch
              value={settings.reducedMotion}
              onValueChange={(v) => handleToggle('reducedMotion', v)}
              trackColor={{ false: CandyColors.gray[300], true: CandyColors.purple.light }}
              thumbColor={settings.reducedMotion ? CandyColors.purple.main : CandyColors.gray[100]}
              accessibilityRole="switch"
              accessibilityLabel="Reduced motion"
              accessibilityState={{ checked: settings.reducedMotion }}
            />
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Daily Reminders</Text>
              <Text style={styles.settingDescription}>Daily puzzle reminder</Text>
            </View>
            <Switch
              value={dailyRemindersOn}
              onValueChange={handleDailyReminderToggle}
              trackColor={{ false: CandyColors.gray[300], true: CandyColors.purple.light }}
              thumbColor={dailyRemindersOn ? CandyColors.purple.main : CandyColors.gray[100]}
              accessibilityRole="switch"
              accessibilityState={{ checked: dailyRemindersOn }}
            />
          </View>
        </View>

        {/* Streak Protection */}
        <Text style={styles.sectionTitle}>STREAK PROTECTION</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Streak Freezes</Text>
              <Text style={styles.settingDescription}>
                {freezeCount > 0
                  ? `${freezeCount} ready — each protects your streak for one missed day.`
                  : 'Protects your streak the next time you miss a day.'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.freezeButton,
                amberBalance < STREAK_FREEZE_AMBER_COST && styles.freezeButtonDisabled,
              ]}
              onPress={handleBuyStreakFreeze}
              accessibilityRole="button"
              accessibilityLabel={`Buy a streak freeze for ${STREAK_FREEZE_AMBER_COST} amber`}
            >
              <Text style={styles.freezeButtonText}>{`Buy · ${STREAK_FREEZE_AMBER_COST}`}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Backup & Restore (only when a cloud backend is configured) */}
        {cloudEnabled && (
          <>
            <Text style={styles.sectionTitle}>BACKUP &amp; RESTORE</Text>
            <View style={styles.section}>
              <TouchableOpacity style={styles.aboutRow} onPress={handleShowRecoveryCode} accessibilityRole="button" accessibilityLabel="Show recovery code">
                <Text style={styles.linkText}>{recoveryCode ? 'Your recovery code' : 'Show recovery code'}</Text>
              </TouchableOpacity>
              {recoveryCode && (
                <View style={styles.recoveryCodeBox}>
                  <Text style={styles.recoveryCodeText} accessibilityLabel={`Recovery code ${recoveryCode}`}>{recoveryCode}</Text>
                  <Text style={styles.recoveryCodeHint}>Write this down. Enter it on a new device to restore your progress.</Text>
                </View>
              )}
              <TouchableOpacity style={styles.aboutRow} onPress={() => { hapticLight(); setShowRestore(true); }} accessibilityRole="button" accessibilityLabel="Restore from another device">
                <Text style={styles.linkText}>Restore from another device</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Data */}
        <Text style={styles.sectionTitle}>DATA</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleResetData}>
            <Text style={styles.dangerText}>Reset All Progress</Text>
            <Text style={styles.dangerDescription}>
              Clears statistics, achievements, and daily challenge history
            </Text>
          </TouchableOpacity>
        </View>

        {/* Purchases — restore IAP entitlements (store-policy requirement) */}
        <Text style={styles.sectionTitle}>PURCHASES</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.aboutRow}
            onPress={handleRestorePurchases}
            disabled={purchaseRestoreBusy}
            accessibilityRole="button"
            accessibilityLabel="Restore Purchases"
          >
            <Text style={styles.linkText}>Restore Purchases</Text>
            {purchaseRestoreBusy
              ? <ActivityIndicator color={CandyColors.purple.main} />
              : <Text style={styles.linkChevron}>{'>'}</Text>}
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.aboutRow}
            onPress={() => openLink(EXTERNAL_LINKS.privacyPolicy)}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
          >
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Text style={styles.linkChevron}>{'>'}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.aboutRow}
            onPress={() => openLink(EXTERNAL_LINKS.termsOfService)}
            accessibilityRole="link"
            accessibilityLabel="Terms of Service"
          >
            <Text style={styles.linkText}>Terms of Service</Text>
            <Text style={styles.linkChevron}>{'>'}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.aboutRow}
            onPress={() => openLink(EXTERNAL_LINKS.dataDeletion)}
            accessibilityRole="link"
            accessibilityLabel="Data Deletion"
          >
            <Text style={styles.linkText}>Data Deletion</Text>
            <Text style={styles.linkChevron}>{'>'}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.aboutRow}
            onPress={() => openLink(getSupportMailto(APP_VERSION))}
            accessibilityRole="button"
            accessibilityLabel="Contact Support"
          >
            <Text style={styles.linkText}>Contact Support</Text>
            <Text style={styles.linkChevron}>{'>'}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>WordShift</Text>
            <Text style={styles.aboutValue}>{`v${APP_VERSION}`}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Made with</Text>
            <Text style={styles.aboutValue}>love and existential dread</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal visible={showRestore} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowRestore(false)}>
        <View style={styles.restoreOverlay}>
          <View style={styles.restoreCard}>
            <Text style={styles.restoreTitle}>Restore progress</Text>
            <Text style={styles.restoreHint}>Enter the recovery code from your other device. This replaces the data currently on this device.</Text>
            <TextInput
              style={styles.restoreInput}
              value={restoreInput}
              onChangeText={setRestoreInput}
              placeholder="WS-XXXX-XXXX"
              placeholderTextColor={CandyColors.gray[400]}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!restoreBusy}
              accessibilityLabel="Recovery code"
            />
            <View style={styles.restoreButtons}>
              <TouchableOpacity style={styles.restoreCancel} onPress={() => { setShowRestore(false); setRestoreInput(''); }} disabled={restoreBusy} accessibilityRole="button" accessibilityLabel="Cancel">
                <Text style={styles.restoreCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.restoreConfirm} onPress={handleRestoreFromCode} disabled={restoreBusy || !restoreInput.trim()} accessibilityRole="button" accessibilityLabel="Restore">
                {restoreBusy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.restoreConfirmText}>Restore</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CandyColors.gray[100],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 60,
    paddingBottom: 16,
    backgroundColor: CandyColors.purple.main,
  },
  backButton: {
    width: 80,
  },
  backButtonText: {
    color: CandyColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: CandyColors.white,
    fontSize: 20,
    fontWeight: '900',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: CandyColors.gray[400],
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    backgroundColor: CandyColors.white,
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: CandyColors.gray[700],
  },
  settingDescription: {
    fontSize: 12,
    color: CandyColors.gray[400],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: CandyColors.gray[100],
    marginLeft: 16,
  },
  freezeButton: {
    backgroundColor: CandyColors.purple.main,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  freezeButtonDisabled: {
    backgroundColor: CandyColors.gray[300],
  },
  freezeButtonText: {
    color: CandyColors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  dangerRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dangerText: {
    fontSize: 16,
    fontWeight: '700',
    color: CandyColors.red.main,
  },
  dangerDescription: {
    fontSize: 12,
    color: CandyColors.gray[400],
    marginTop: 2,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  aboutLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: CandyColors.gray[600],
  },
  aboutValue: {
    fontSize: 14,
    color: CandyColors.gray[400],
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: CandyColors.purple.main,
  },
  linkChevron: {
    fontSize: 14,
    fontWeight: '700',
    color: CandyColors.gray[400],
  },
  bottomSpacer: {
    height: 60,
  },
  recoveryCodeBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CandyColors.gray[100],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CandyColors.gray[200],
  },
  recoveryCodeText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    color: CandyColors.purple.dark,
    textAlign: 'center',
  },
  recoveryCodeHint: {
    fontSize: 12,
    color: CandyColors.gray[500],
    textAlign: 'center',
    marginTop: 6,
  },
  restoreOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  restoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
  },
  restoreTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: CandyColors.gray[800],
    marginBottom: 8,
  },
  restoreHint: {
    fontSize: 13.5,
    color: CandyColors.gray[600],
    marginBottom: 16,
    lineHeight: 19,
  },
  restoreInput: {
    borderWidth: 1.5,
    borderColor: CandyColors.gray[300],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: CandyColors.gray[800],
    textAlign: 'center',
    marginBottom: 18,
  },
  restoreButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  restoreCancel: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: CandyColors.gray[200],
  },
  restoreCancelText: {
    fontSize: 15,
    fontWeight: '800',
    color: CandyColors.gray[700],
  },
  restoreConfirm: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: CandyColors.purple.main,
  },
  restoreConfirmText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
