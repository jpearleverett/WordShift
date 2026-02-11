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
import { CandyColors, getPhaseSurfaceTheme, getPhaseTheme } from '../theme/colors';
import { GameSettings, getSettings, updateSetting, resetSettings } from '../services/settings';
import { clearStats } from '../services/starRating';
import { clearAchievements } from '../services/achievements';
import { clearDailyProgress } from '../services/dailyChallenge';
import { clearProgress } from '../services/amberCurrency';
import { clearWordHistory } from '../services/wordHistory';
import { clearAllSessions } from '../services/dialogueSession';
import { clearEvents } from '../services/eventLogger';
import { resetTutorial } from './Tutorial';
import { hapticLight } from '../services/haptics';

interface SettingsScreenProps {
  onClose: () => void;
  phase?: number;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose, phase = 0 }) => {
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const surfaceTheme = getPhaseSurfaceTheme(phase);
  const phaseTheme = getPhaseTheme(phase);

  useEffect(() => {
    getSettings().then(setSettings);
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
              resetSettings(),
            ]);
            const fresh = await getSettings();
            setSettings(fresh);
            Alert.alert('Done', 'All data has been reset.');
          },
        },
      ]
    );
  };

  if (!settings) return null;

  return (
    <View style={[styles.container, { backgroundColor: phase >= 2 ? phaseTheme.bgPrimary : CandyColors.gray[100] }]}>
      <View style={[styles.header, { backgroundColor: phaseTheme.bgSecondary, borderBottomColor: surfaceTheme.glassBorder }]}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Text style={[styles.backButtonText, { color: surfaceTheme.textSecondary }]}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: surfaceTheme.textPrimary }]}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sound & Haptics */}
        <Text style={[styles.sectionTitle, { color: phase >= 2 ? surfaceTheme.textMuted : CandyColors.gray[400] }]}>FEEDBACK</Text>
        <View style={[styles.section, { backgroundColor: surfaceTheme.cardBg, borderColor: surfaceTheme.cardBorder }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: phase >= 2 ? surfaceTheme.textSecondary : CandyColors.gray[700] }]}>
                Sound Effects
              </Text>
              <Text style={[styles.settingDescription, { color: phase >= 2 ? surfaceTheme.textMuted : CandyColors.gray[400] }]}>
                Play sounds on moves and victories
              </Text>
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
              <Text style={[styles.settingLabel, { color: phase >= 2 ? surfaceTheme.textSecondary : CandyColors.gray[700] }]}>
                Haptic Feedback
              </Text>
              <Text style={[styles.settingDescription, { color: phase >= 2 ? surfaceTheme.textMuted : CandyColors.gray[400] }]}>
                Vibration on taps and interactions
              </Text>
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
        <Text style={[styles.sectionTitle, { color: phase >= 2 ? surfaceTheme.textMuted : CandyColors.gray[400] }]}>ACCESSIBILITY</Text>
        <View style={[styles.section, { backgroundColor: surfaceTheme.cardBg, borderColor: surfaceTheme.cardBorder }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: phase >= 2 ? surfaceTheme.textSecondary : CandyColors.gray[700] }]}>
                Reduced Motion
              </Text>
              <Text style={[styles.settingDescription, { color: phase >= 2 ? surfaceTheme.textMuted : CandyColors.gray[400] }]}>
                Minimize animations for accessibility
              </Text>
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
        <Text style={[styles.sectionTitle, { color: phase >= 2 ? surfaceTheme.textMuted : CandyColors.gray[400] }]}>DATA</Text>
        <View style={[styles.section, { backgroundColor: surfaceTheme.cardBg, borderColor: surfaceTheme.cardBorder }]}>
          <TouchableOpacity style={[styles.dangerRow, phase >= 2 && { backgroundColor: 'rgba(140, 50, 70, 0.12)' }]} onPress={handleResetData}>
            <Text style={styles.dangerText}>Reset All Progress</Text>
            <Text style={[styles.dangerDescription, { color: phase >= 2 ? surfaceTheme.textMuted : CandyColors.gray[400] }]}>
              Clears statistics, achievements, and daily challenge history
            </Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={[styles.sectionTitle, { color: phase >= 2 ? surfaceTheme.textMuted : CandyColors.gray[400] }]}>ABOUT</Text>
        <View style={[styles.section, { backgroundColor: surfaceTheme.cardBg, borderColor: surfaceTheme.cardBorder }]}>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: phase >= 2 ? surfaceTheme.textSecondary : CandyColors.gray[600] }]}>WordShift</Text>
            <Text style={[styles.aboutValue, { color: phase >= 2 ? surfaceTheme.textMuted : CandyColors.gray[400] }]}>v1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: phase >= 2 ? surfaceTheme.textSecondary : CandyColors.gray[600] }]}>Made with</Text>
            <Text style={[styles.aboutValue, { color: phase >= 2 ? surfaceTheme.textMuted : CandyColors.gray[400] }]}>love and existential dread</Text>
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
    borderBottomWidth: 1,
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
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
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
  bottomSpacer: {
    height: 60,
  },
});
