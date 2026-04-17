import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '@/navigation/HomeStackNavigator';
import { useAuthStore } from '@/stores/authStore';
import { createReview } from '@/services/firebase/reviews';
import { saveBook } from '@/services/firebase/books';

type Props = NativeStackScreenProps<HomeStackParamList, 'WriteReview'>;

export default function WriteReviewScreen({ route, navigation }: Props) {
  const { bookId, bookTitle, bookCoverUrl, author } = route.params;
  const { userProfile, firebaseUser } = useAuthStore();

  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!firebaseUser || !userProfile) return;
    if (rating === 0) {
      Alert.alert('별점을 선택해주세요.');
      return;
    }
    if (content.trim().length < 10) {
      Alert.alert('리뷰를 10자 이상 작성해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveBook({ isbn13: bookId, title: bookTitle, author, cover: bookCoverUrl, publisher: '', itemId: 0, description: '' });
      await createReview({
        bookId,
        bookTitle,
        bookCoverUrl,
        userId: firebaseUser.uid,
        displayName: userProfile.displayName,
        rating: rating as 1 | 2 | 3 | 4 | 5,
        content: content.trim(),
        ...(hasSpoiler ? { hasSpoiler: true } : {}),
      });
      navigation.goBack();
    } catch (e) {
      console.error('리뷰 작성 실패:', e);
      Alert.alert('오류', '리뷰 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* 책 헤더 */}
        <View style={styles.bookHeader}>
          <Image source={{ uri: bookCoverUrl }} style={styles.cover} resizeMode="cover" />
          <View style={styles.bookMeta}>
            <Text style={styles.bookTitle} numberOfLines={3}>{bookTitle}</Text>
            <Text style={styles.bookAuthor}>{author}</Text>
          </View>
        </View>

        {/* 별점 */}
        <View style={styles.section}>
          <Text style={styles.label}>별점</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.star, n <= rating && styles.starFilled]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 리뷰 내용 */}
        <View style={styles.section}>
          <Text style={styles.label}>리뷰</Text>
          <TextInput
            style={styles.textInput}
            placeholder="이 책에 대한 생각을 자유롭게 남겨주세요. (10자 이상)"
            placeholderTextColor="#BDBDBD"
            multiline
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
          />
        </View>

        {/* 스포일러 토글 */}
        <View style={styles.spoilerRow}>
          <View>
            <Text style={styles.spoilerLabel}>스포일러 포함</Text>
            <Text style={styles.spoilerDesc}>독자에게 내용이 가려져 표시됩니다</Text>
          </View>
          <Switch
            value={hasSpoiler}
            onValueChange={setHasSpoiler}
            trackColor={{ false: '#E0E0E0', true: '#3D4DC4' }}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, (rating === 0 || content.trim().length < 10) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || rating === 0 || content.trim().length < 10}
          activeOpacity={0.8}
        >
          {isSubmitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>리뷰 등록</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },

  bookHeader: {
    flexDirection: 'row',
    gap: 14,
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cover: { width: 64, height: 92, borderRadius: 4 },
  bookMeta: { flex: 1, justifyContent: 'center' },
  bookTitle: { fontSize: 15, fontWeight: '700', color: '#212121', marginBottom: 4, lineHeight: 21 },
  bookAuthor: { fontSize: 13, color: '#616161' },

  section: { backgroundColor: '#fff', padding: 20, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#424242', marginBottom: 12 },

  stars: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 36, color: '#E0E0E0' },
  starFilled: { color: '#F5A623' },

  textInput: {
    minHeight: 160,
    fontSize: 15,
    color: '#212121',
    lineHeight: 22,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
  },

  spoilerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14, marginTop: 8,
  },
  spoilerLabel: { fontSize: 15, color: '#212121', fontWeight: '600', marginBottom: 2 },
  spoilerDesc: { fontSize: 12, color: '#767676' },

  submitBtn: {
    margin: 20,
    paddingVertical: 14,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#B0C4DE' },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
