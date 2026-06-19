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
} from 'react-native';
import Constants from 'expo-constants';
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
import {
  resetNotificationPrefs,
  getNotificationPrefs,
  setNotificationPrefs,
  requestNotificationPermission,
} from '../services/notifications';
import { clearRoomUpgrades } from '../services/roomUpgrades';

interface SettingsScreenProps {
  onClose: () => void;
}

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [dailyRemindersOn, setDailyRemindersOn] = useState(false);
  const [freezeCount, setFreezeCount] = useState(0);
  const [amberBalance, setAmberBalance] = useState(0);

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
            ]);
            const fresh = await getSettings();
            setSettings(fresh);
            const freshPrefs = await getNotificationPrefs();
            setDailyRemindersOn(freshPrefs.enabled && freshPrefs.dailyReminderEnabled);
            await refreshStreakFreeze();
            Alert.alert('Done', 'All data has been reset.');
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
});
