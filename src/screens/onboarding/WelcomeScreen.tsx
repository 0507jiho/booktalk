import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>📚</Text>
        <Text style={styles.title}>BookTalk에 오신 걸 환영해요!</Text>
        <Text style={styles.subtitle}>
          책을 사랑하는 사람들과 함께{'\n'}리뷰·발제·토론을 이어가보세요.
        </Text>

        <View style={styles.features}>
          {[
            { icon: '⭐', text: '읽은 책에 리뷰를 남겨보세요' },
            { icon: '💬', text: '발제로 생각을 나눠보세요' },
            { icon: '📖', text: '독서모임을 만들고 함께 읽어요' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => navigation.navigate('GenreSelect')}
          activeOpacity={0.8}
        >
          <Text style={styles.nextBtnText}>시작하기 →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  logo: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#212121', textAlign: 'center', marginBottom: 12 },
  subtitle: {
    fontSize: 15, color: '#767676', textAlign: 'center', lineHeight: 22, marginBottom: 40,
  },
  features: { width: '100%', gap: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  featureText: { fontSize: 15, color: '#424242', flex: 1 },
  footer: { paddingHorizontal: 24, paddingBottom: 32 },
  nextBtn: {
    backgroundColor: '#4A90E2', paddingVertical: 16, borderRadius: 12, alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
