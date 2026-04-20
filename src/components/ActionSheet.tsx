import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ActionSheetAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  actions: ActionSheetAction[];
};

export default function ActionSheet({ visible, onClose, actions }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.container}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              {actions.map((action, index) => (
                <React.Fragment key={action.label}>
                  {index > 0 && <View style={styles.divider} />}
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => { onClose(); action.onPress(); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={action.icon}
                      size={20}
                      color={action.destructive ? '#E74C3C' : '#212121'}
                      style={styles.actionIcon}
                    />
                    <Text style={[styles.actionLabel, action.destructive && styles.actionLabelDestructive]}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
              <View style={styles.cancelSeparator} />
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.cancelLabel}>취소</Text>
              </TouchableOpacity>
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
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginVertical: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 56,
  },
  actionIcon: {
    marginRight: 16,
  },
  actionLabel: {
    fontSize: 16,
    color: '#212121',
  },
  actionLabelDestructive: {
    color: '#E74C3C',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 24,
  },
  cancelSeparator: {
    height: 8,
    backgroundColor: '#F5F5F5',
    marginTop: 8,
  },
  cancelBtn: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelLabel: {
    fontSize: 16,
    color: '#767676',
    fontWeight: '500',
  },
});
