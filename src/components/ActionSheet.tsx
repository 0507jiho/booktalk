import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Dimensions,
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

const SHEET_HEIGHT = Dimensions.get('window').height * 0.5;

export default function ActionSheet({ visible, onClose, actions }: Props) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(SHEET_HEIGHT);
    }
  }, [visible]);

  function handleClose() {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={styles.handle} />
          {actions.map((action, index) => (
            <React.Fragment key={action.label}>
              {index > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => { handleClose(); setTimeout(action.onPress, 250); }}
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
          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
            <Text style={styles.cancelLabel}>취소</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
  actionIcon: { marginRight: 16 },
  actionLabel: { fontSize: 16, color: '#212121' },
  actionLabelDestructive: { color: '#E74C3C' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 24 },
  cancelSeparator: { height: 8, backgroundColor: '#F5F5F5', marginTop: 8 },
  cancelBtn: { height: 56, justifyContent: 'center', alignItems: 'center' },
  cancelLabel: { fontSize: 16, color: '#767676', fontWeight: '500' },
});
