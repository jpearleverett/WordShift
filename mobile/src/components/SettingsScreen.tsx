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
} from 'react-native';
import { CandyColors } from '../theme/colors';
import { GameSettings, getSettings, updateSetting, resetSettings } from '../services/settings';
import { clearStats } from '../services/starRating';
import { clearAchievements } from '../services/achievements';
import { clearDailyProgress } from '../services/dailyChallenge';
import { clearProgress } from '../services/amberCurrency';
import { clearWordHistory } from '../services/wordHistory';
import { clearAllSessions } from '../services/dialogueSession';
import { clearEvents } from '../services/eventLogger';
import { resetTutorial } from './Tutorial';
import { resetOnboarding } from '../services/onboarding';
import { hapticLight } from '../services/haptics';
import { clearPuzzleState } from '../services/puzzleSaveState';
import { clearHarvestState } from '../services/wordHarvest';
import { clearSacrificeState } from '../services/sacrifice';
import { clearWeeklyQuests } from '../services/weeklyQuests';
import { clearWhisperGallery } from '../services/whisperGallery';
import { clearChoiceState } from '../services/dialogueChoices';
import { resetMicroBeats } from '../services/phaseNarrative';
import { resetNotificationPrefs } from '../services/notifications';
import { clearRoomUpgrades } from '../services/roomUpgrades';
import { clearAnalyticsState } from '../services/analytics';
import {
  checkForNewerSave,
  clearSyncStatus,
  downloadFromCloud,
  getSyncStatus,
  uploadToCloud,
} from '../services/cloudSave';
import {
  clearMonetizationState,
  getMonetizationState,
  purchasePatronKey,
  restorePatronKeyPurchases,
  setPatronKeyOwned,
} from '../services/monetization';

interface SettingsScreenProps {
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [patronKeyOwned, setPatronKeyState] = useState(false);
  const [rewardedClaimsRemaining, setRewardedClaimsRemaining] = useState(0);
  const [iapConfigured, setIapConfigured] = useState(false);
  const [syncProvider, setSyncProvider] = useState('Not Connected');
  const [syncPending, setSyncPending] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(0);

  useEffect(() => {
    Promise.all([
      getSettings(),
      getMonetizationState(),
      getSyncStatus(),
    ]).then(([loadedSettings, monetizationState, syncStatus]) => {
      setSettings(loadedSettings);
      setPatronKeyState(monetizationState.patronKeyOwned);
      setRewardedClaimsRemaining(monetizationState.rewardedAmberClaimsRemaining);
      setIapConfigured(monetizationState.iapConfigured);
      setSyncProvider(syncStatus.provider);
      setSyncPending(syncStatus.pendingChanges);
      setLastSyncTimestamp(syncStatus.lastSyncTimestamp);
    });
  }, []);

  const handleToggle = async (key: keyof GameSettings, value: boolean) => {
    hapticLight();
    const updated = await updateSetting(key, value);
    setSettings(updated);
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
              clearMonetizationState(),
              clearAnalyticsState(),
              clearSyncStatus(),
            ]);
            const [freshSettings, monetizationState, syncStatus] = await Promise.all([
              getSettings(),
              getMonetizationState(),
              getSyncStatus(),
            ]);
            setSettings(freshSettings);
            setPatronKeyState(monetizationState.patronKeyOwned);
            setRewardedClaimsRemaining(monetizationState.rewardedAmberClaimsRemaining);
            setIapConfigured(monetizationState.iapConfigured);
            setSyncProvider(syncStatus.provider);
            setSyncPending(syncStatus.pendingChanges);
            setLastSyncTimestamp(syncStatus.lastSyncTimestamp);
            Alert.alert('Done', 'All data has been reset.');
          },
        },
      ]
    );
  };

  const handleTogglePatronKey = async () => {
    hapticLight();
    await setPatronKeyOwned(!patronKeyOwned);
    const monetizationState = await getMonetizationState();
    setPatronKeyState(monetizationState.patronKeyOwned);
    setRewardedClaimsRemaining(monetizationState.rewardedAmberClaimsRemaining);
    setIapConfigured(monetizationState.iapConfigured);
  };

  const refreshSyncStatus = async () => {
    const syncStatus = await getSyncStatus();
    setSyncProvider(syncStatus.provider);
    setSyncPending(syncStatus.pendingChanges);
    setLastSyncTimestamp(syncStatus.lastSyncTimestamp);
  };

  const handlePurchasePatronKey = async () => {
    hapticLight();
    const result = await purchasePatronKey();
    Alert.alert(result.success ? 'Purchase' : 'Purchase Unavailable', result.message);
    const monetizationState = await getMonetizationState();
    setPatronKeyState(monetizationState.patronKeyOwned);
    setRewardedClaimsRemaining(monetizationState.rewardedAmberClaimsRemaining);
    setIapConfigured(monetizationState.iapConfigured);
  };

  const handleRestorePatronKey = async () => {
    hapticLight();
    const result = await restorePatronKeyPurchases();
    Alert.alert(result.success ? 'Restore' : 'Restore Result', result.message);
    const monetizationState = await getMonetizationState();
    setPatronKeyState(monetizationState.patronKeyOwned);
    setRewardedClaimsRemaining(monetizationState.rewardedAmberClaimsRemaining);
    setIapConfigured(monetizationState.iapConfigured);
  };

  const handleSyncNow = async () => {
    hapticLight();
    const success = await uploadToCloud();
    await refreshSyncStatus();
    Alert.alert(success ? 'Sync Complete' : 'Sync Failed', success ? 'Progress uploaded to cloud.' : 'Cloud upload failed.');
  };

  const handlePullCloud = async () => {
    hapticLight();
    const hasNewer = await checkForNewerSave();
    if (!hasNewer) {
      Alert.alert('Cloud Save', 'No newer cloud save found.');
      return;
    }
    Alert.alert(
      'Use Cloud Save?',
      'A newer cloud save was found. This will overwrite local progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Cloud',
          style: 'destructive',
          onPress: async () => {
            const success = await downloadFromCloud();
            await refreshSyncStatus();
            Alert.alert(success ? 'Cloud Restored' : 'Restore Failed', success
              ? 'Cloud save restored. Restart the app to refresh all in-memory state.'
              : 'Unable to restore cloud save.');
          },
        },
      ]
    );
  };

  if (!settings) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
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
              accessibilityState={{ checked: settings.reducedMotion }}
            />
          </View>
        </View>

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

        {/* Supporter / Monetization */}
        <Text style={styles.sectionTitle}>SUPPORTER</Text>
        <View style={styles.section}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Patron's Key</Text>
            <Text style={styles.aboutValue}>{patronKeyOwned ? 'Owned' : 'Not owned'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>IAP Mode</Text>
            <Text style={styles.aboutValue}>{iapConfigured ? 'RevenueCat' : 'Local fallback'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Bonus amber claims left</Text>
            <Text style={styles.aboutValue}>{rewardedClaimsRemaining}/{3}</Text>
          </View>
          {iapConfigured ? (
            <>
              <TouchableOpacity
                style={[styles.patronButton, patronKeyOwned && styles.patronButtonActive]}
                onPress={handlePurchasePatronKey}
                accessibilityLabel="Buy Patron Key"
                accessibilityRole="button"
              >
                <Text style={styles.patronButtonText}>
                  {patronKeyOwned ? 'Patron Key Active' : "Buy Patron's Key"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.patronButton, styles.patronButtonSecondary]}
                onPress={handleRestorePatronKey}
                accessibilityLabel="Restore purchases"
                accessibilityRole="button"
              >
                <Text style={styles.patronButtonText}>Restore Purchases</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.patronButton, patronKeyOwned && styles.patronButtonActive]}
                onPress={handleTogglePatronKey}
                accessibilityLabel={patronKeyOwned ? 'Disable Patron key' : 'Enable Patron key'}
                accessibilityRole="button"
              >
                <Text style={styles.patronButtonText}>
                  {patronKeyOwned ? 'Disable Patron Key' : 'Enable Patron Key (Local)'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.helperText}>
                RevenueCat keys are missing or IAP is disabled. Using local fallback entitlement.
              </Text>
            </>
          )}
        </View>

        {/* Sync diagnostics */}
        <Text style={styles.sectionTitle}>SYNC</Text>
        <View style={styles.section}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Provider</Text>
            <Text style={styles.aboutValue}>{syncProvider}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Pending changes</Text>
            <Text style={styles.aboutValue}>{syncPending ? 'Yes' : 'No'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Last sync</Text>
            <Text style={styles.aboutValue}>
              {lastSyncTimestamp > 0 ? new Date(lastSyncTimestamp).toLocaleString() : 'Never'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncNow}
            accessibilityLabel="Upload cloud save now"
            accessibilityRole="button"
          >
            <Text style={styles.syncButtonText}>Sync Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.syncButton, styles.syncButtonSecondary]}
            onPress={handlePullCloud}
            accessibilityLabel="Download newer cloud save"
            accessibilityRole="button"
          >
            <Text style={styles.syncButtonText}>Check / Pull Cloud Save</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.section}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>WordShift</Text>
            <Text style={styles.aboutValue}>v1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Made with</Text>
            <Text style={styles.aboutValue}>love and existential dread</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 50,
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
  patronButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
    backgroundColor: CandyColors.purple.main,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  patronButtonActive: {
    backgroundColor: CandyColors.green.main,
  },
  patronButtonSecondary: {
    backgroundColor: CandyColors.blue.main,
    marginTop: -4,
  },
  patronButtonText: {
    color: CandyColors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  helperText: {
    fontSize: 11,
    color: CandyColors.gray[400],
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  syncButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
    backgroundColor: CandyColors.purple.main,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  syncButtonSecondary: {
    backgroundColor: CandyColors.gray[400],
  },
  syncButtonText: {
    color: CandyColors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  bottomSpacer: {
    height: 60,
  },
});
