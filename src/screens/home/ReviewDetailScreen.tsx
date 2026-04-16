import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { HomeStackParamList } from '@/navigation/HomeStackNavigator';
import { fixImageUrl } from '@/utils/image';
import { useAuthStore } from '@/stores/authStore';
import { checkIsLiked, toggleLike } from '@/services/firebase/likes';

type Props = NativeStackScreenProps<HomeStackParamList, 'ReviewDetail'>;

const PRIMARY = '#3D4DC4';

export default function ReviewDetailScreen({ route, navigation }: Props) {
  const { reviewId, rating, content, likeCount: initialLikeCount, createdAtMillis, bookTitle, bookCoverUrl, bookId, author, displayName } = route.params;
  const { firebaseUser } = useAuthStore();

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (!uid || !reviewId) return;
    checkIsLiked(uid, reviewId, 'review').then(setIsLiked);
  }, [firebaseUser?.uid, reviewId]);

  async function handleLike() {
    const uid = firebaseUser?.uid;
    if (!uid || !reviewId) return;
    const prev = isLiked;
    setIsLiked(!prev);
    setLikeCount(c => prev ? c - 1 : c + 1);
    try {
      const result = await toggleLike(uid, reviewId, 'review');
      setIsLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch {
      setIsLiked(prev);
      setLikeCount(c => prev ? c + 1 : c - 1);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 작성자 */}
      {displayName && (
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.authorName}>{displayName}</Text>
        </View>
      )}

      {/* 책 미니카드 */}
      {(bookCoverUrl || bookTitle) && (
        <TouchableOpacity
          style={styles.bookCard}
          activeOpacity={0.7}
          onPress={() => {
            if (bookId && bookTitle) {
              navigation.navigate('BookDetail', {
                bookId,
                title: bookTitle,
                author: author ?? '',
                publisher: '',
                cover: fixImageUrl(bookCoverUrl),
              });
            }
          }}
        >
          {bookCoverUrl ? (
            <Image source={{ uri: fixImageUrl(bookCoverUrl) }} style={styles.bookCover} resizeMode="cover" />
          ) : null}
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitleText} numberOfLines={2}>{bookTitle}</Text>
            {author ? <Text style={styles.bookAuthor}>{author}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
        </TouchableOpacity>
      )}

      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map(i => (
          <Ionicons key={i} name={i <= rating ? 'star' : 'star-outline'} size={20} color="#F5A623" />
        ))}
        <Text style={styles.ratingNum}>{rating}.0</Text>
      </View>
      <Text style={styles.date}>{dayjs(createdAtMillis).format('YYYY년 MM월 DD일')}</Text>
      <View style={styles.divider} />
      <Text style={styles.reviewContent}>{content}</Text>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.likeBtn} onPress={handleLike} activeOpacity={0.7}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? '#E74C3C' : '#BDBDBD'}
          />
          <Text style={[styles.likeText, isLiked && styles.likeTextActive]}>
            {likeCount}명이 좋아해요
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorAvatarText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  authorName: { fontSize: 15, fontWeight: '600', color: '#212121' },

  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F7F8FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ECEFFE',
  },
  bookCover: { width: 44, height: 62, borderRadius: 3 },
  bookInfo: { flex: 1 },
  bookTitleText: { fontSize: 14, fontWeight: '600', color: '#212121', lineHeight: 20 },
  bookAuthor: { fontSize: 12, color: '#767676', marginTop: 2 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  ratingNum: { fontSize: 18, fontWeight: '700', color: '#212121', marginLeft: 6 },
  date: { fontSize: 13, color: '#BDBDBD', marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 20 },
  reviewContent: { fontSize: 16, color: '#212121', lineHeight: 26 },

  footer: { marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  likeText: { fontSize: 14, color: '#BDBDBD' },
  likeTextActive: { color: '#E74C3C' },
});
