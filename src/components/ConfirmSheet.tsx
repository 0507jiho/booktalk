import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
};

export default function ConfirmSheet({
  visible, onClose, title, description, confirmLabel = '확인', onConfirm, destructive = false,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.container}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <Text style={styles.title}>{title}</Text>
              {description ? <Text style={styles.description}>{description}</Text> : null}
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.cancelLabel}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, destructive && styles.confirmBtnDestructive]}
                  onPress={() => { onClose(); onConfirm(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.confirmLabel, destructive && styles.confirmLabelDestructive]}>
                    {confirmLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginVertical: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#212121',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#767676',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelLabel: {
    fontSize: 16,
    color: '#767676',
    fontWeight: '500',
  },
  confirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#3D4DC4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnDestructive: {
    backgroundColor: '#FEF0F0',
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  confirmLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  confirmLabelDestructive: {
    color: '#E74C3C',
  },
});
