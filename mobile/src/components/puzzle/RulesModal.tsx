import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { CandyColors, getPhaseSurfaceTheme, getPhaseTheme } from '../../theme/colors';
import { getRulesText } from '../../services/phaseNarrative';
import { DialoguePhase } from '../../types/homeWorld';

const STEP_COLORS = [
  { bg: CandyColors.pink.light, text: CandyColors.pink.dark },
  { bg: CandyColors.blue.light, text: CandyColors.blue.dark },
  { bg: CandyColors.yellow.light, text: CandyColors.yellow.shadow },
  { bg: CandyColors.green.light, text: CandyColors.green.dark },
];

interface RulesModalProps {
  visible: boolean;
  phase: DialoguePhase;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  visible,
  phase,
  onClose,
}) => {
  const rules = getRulesText(phase);
  const surfaceTheme = getPhaseSurfaceTheme(phase);
  const phaseTheme = getPhaseTheme(phase);

  const getStepColor = (index: number) => {
    if (phase <= 1) {
      return STEP_COLORS[index % STEP_COLORS.length];
    }
    if (phase === 2) {
      return { bg: '#5A4B86', text: '#D7CCF5' };
    }
    if (phase === 3) {
      return { bg: '#4A355F', text: '#BFA8D8' };
    }
    if (phase >= 4) {
      return { bg: '#4B2234', text: '#D8A8B8' };
    }
    return STEP_COLORS[index % STEP_COLORS.length];
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={[styles.modalOverlay, { backgroundColor: surfaceTheme.modalOverlay }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.rulesModal,
            {
              backgroundColor: surfaceTheme.cardBg,
              borderColor: surfaceTheme.cardBorder,
              shadowColor: surfaceTheme.cardShadow,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.modalShine, { backgroundColor: surfaceTheme.glassShine }]} />

          <TouchableOpacity
            style={[
              styles.closeButton,
              {
                backgroundColor: surfaceTheme.glassStrong,
                borderColor: surfaceTheme.glassBorder,
              },
            ]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: surfaceTheme.textSecondary }]}>{'\u2715'}</Text>
          </TouchableOpacity>

          <Text style={[styles.rulesTitle, { color: phaseTheme.victoryTitleColor }]}>{rules.title}</Text>

          {rules.steps.map((step, idx) => {
            const color = getStepColor(idx);
            return (
              <View key={idx} style={styles.ruleItem}>
                <View style={[styles.ruleNumber, { backgroundColor: color.bg }]}>
                  <Text style={[styles.ruleNumberText, { color: color.text }]}>{idx + 1}</Text>
                </View>
                <View style={styles.ruleContent}>
                  <Text style={[styles.ruleHeading, { color: phase >= 2 ? surfaceTheme.textSecondary : CandyColors.gray[700] }]}>
                    {step.heading}
                  </Text>
                  <Text style={[styles.ruleDesc, { color: phase >= 2 ? surfaceTheme.textMuted : CandyColors.gray[500] }]}>
                    {step.desc}
                  </Text>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[
              styles.gotItButton,
              {
                backgroundColor: surfaceTheme.accent,
                shadowColor: surfaceTheme.accent,
              },
              phase >= 4 && styles.gotItButtonDark,
            ]}
            onPress={onClose}
          >
            <View style={[styles.buttonShine, { backgroundColor: surfaceTheme.glassShine }]} />
            <Text style={styles.gotItButtonText}>{rules.dismissLabel}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  rulesModal: {
    borderRadius: 32,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  rulesTitle: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 24,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  ruleNumber: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  ruleNumberText: {
    fontSize: 20,
    fontWeight: '900',
  },
  ruleContent: {
    flex: 1,
  },
  ruleHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: CandyColors.gray[700],
    marginBottom: 2,
  },
  ruleDesc: {
    fontSize: 13,
    color: CandyColors.gray[500],
  },
  gotItButton: {
    backgroundColor: CandyColors.purple.main,
    borderRadius: 18,
    paddingVertical: 16,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: CandyColors.purple.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  gotItButtonDark: {
    borderWidth: 1,
    borderColor: 'rgba(212, 156, 176, 0.18)',
  },
  buttonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  gotItButtonText: {
    color: CandyColors.white,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
  },
});
