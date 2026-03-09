import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { CandyColors } from '../../theme/colors';
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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.rulesModal} onStartShouldSetResponder={() => true}>
          <View style={styles.modalShine} />

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>{'\u2715'}</Text>
          </TouchableOpacity>

          <Text style={styles.rulesTitle}>{rules.title}</Text>

          {rules.steps.map((step, idx) => {
            const color = STEP_COLORS[idx % STEP_COLORS.length];
            return (
              <View key={idx} style={styles.ruleItem}>
                <View style={[styles.ruleNumber, { backgroundColor: color.bg }]}>
                  <Text style={[styles.ruleNumberText, { color: color.text }]}>{idx + 1}</Text>
                </View>
                <View style={styles.ruleContent}>
                  <Text style={styles.ruleHeading}>{step.heading}</Text>
                  <Text style={styles.ruleDesc}>{step.desc}</Text>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.gotItButton}
            onPress={onClose}
          >
            <View style={styles.buttonShine} />
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
    backgroundColor: 'rgba(76, 29, 149, 0.7)',
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
    backgroundColor: CandyColors.white,
    borderRadius: 32,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CandyColors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 18,
    color: CandyColors.gray[400],
    fontWeight: '700',
  },
  rulesTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: CandyColors.purple.main,
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
