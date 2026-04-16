import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { createReport } from '@/services/firebase/reports';
import { ReportTargetType, ReportReason } from '@/types';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: '스팸 또는 광고' },
  { value: 'hate', label: '혐오·차별 발언' },
  { value: 'misinformation', label: '허위 정보' },
  { value: 'adult', label: '성인 / 불건전한 콘텐츠' },
  { value: 'other', label: '기타' },
];

type Props = {
  visible: boolean;
  targetId: string;
  targetType: ReportTargetType;
  reporterId: string;
  onClose: () => void;
};

export default function ReportModal({ visible, targetId, targetType, reporterId, onClose }: Props) {
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!selected) return;
    setIsLoading(true);
    try {
      await createReport(reporterId, targetId, targetType, selected);
      onClose();
      Alert.alert('신고 접수', '신고가 접수되었습니다. 검토 후 조치하겠습니다.');
    } catch {
      Alert.alert('오류', '신고 접수에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
      setSelected(null);
    }
  }

  function handleClose() {
    setSelected(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>신고하기</Text>
        <Text style={styles.subtitle}>신고 사유를 선택해주세요.</Text>
        {REASONS.map(r => (
          <TouchableOpacity
            key={r.value}
            style={[styles.reasonRow, selected === r.value && styles.reasonRowSelected]}
            onPress={() => setSelected(r.value)}
            activeOpacity={0.7}
          >
            <View style={[styles.radio, selected === r.value && styles.radioSelected]} />
            <Text style={[styles.reasonText, selected === r.value && styles.reasonTextSelected]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.submitBtn, (!selected || isLoading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selected || isLoading}
          activeOpacity={0.8}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>신고 접수</Text>
          }
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#212121', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#767676', marginBottom: 16 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 12,
    marginBottom: 4,
  },
  reasonRowSelected: { backgroundColor: '#EAF2FB' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#E0E0E0',
  },
  radioSelected: { borderColor: '#4A90E2', backgroundColor: '#4A90E2' },
  reasonText: { fontSize: 15, color: '#424242' },
  reasonTextSelected: { color: '#4A90E2', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#E74C3C',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnDisabled: { backgroundColor: '#BDBDBD' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
