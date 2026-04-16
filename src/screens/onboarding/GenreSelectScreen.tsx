import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { Analytics } from '@/services/analytics';
import { useAuthStore } from '@/stores/authStore';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'GenreSelect'>;

const GENRES = [
  '소설', '시/에세이', '자기계발', '경제/경영',
  '역사', '과학', '철학', '예술', '사회', '기타',
];

export default function GenreSelectScreen({ navigation: _navigation }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const { setOnboardingDone } = useAuthStore();

  function toggleGenre(genre: string) {
    setSelected(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  }

  async function handleComplete() {
    await AsyncStorage.setItem('onboarding_done', 'true');
    if (selected.length > 0) {
      await AsyncStorage.setItem('preferred_genres', JSON.stringify(selected));
    }
    Analytics.onboardingComplete();
    setOnboardingDone(true); // RootNavigator re-renders → MainTabNavigator
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.step}>2 / 2</Text>
        <Text style={styles.title}>관심 장르를 선택해주세요</Text>
        <Text style={styles.subtitle}>선택한 장르의 발제를 먼저 추천해드려요. (선택 안 해도 됩니다)</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {GENRES.map(genre => (
          <TouchableOpacity
            key={genre}
            style={[styles.chip, selected.includes(genre) && styles.chipSelected]}
            onPress={() => toggleGenre(genre)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, selected.includes(genre) && styles.chipTextSelected]}>
              {genre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.completeBtn}
          onPress={handleComplete}
          activeOpacity={0.8}
        >
          <Text style={styles.completeBtnText}>
            {selected.length > 0 ? `${selected.length}개 선택 완료` : '건너뛰기'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  step: { fontSize: 13, color: '#4A90E2', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#212121', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#767676', lineHeight: 20 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 20, paddingBottom: 20, gap: 10,
  },
  chip: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  chipSelected: { borderColor: '#4A90E2', backgroundColor: '#EAF2FB' },
  chipText: { fontSize: 14, color: '#616161' },
  chipTextSelected: { color: '#4A90E2', fontWeight: '600' },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
  completeBtn: {
    backgroundColor: '#4A90E2', paddingVertical: 16, borderRadius: 12, alignItems: 'center',
  },
  completeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
