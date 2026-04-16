import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { HomeStackParamList } from '@/navigation/HomeStackNavigator';
import { fetchBookReviews } from '@/services/firebase/reviews';
import { fetchBookTopics } from '@/services/firebase/topics';
import { setUserBook, fetchUserBooks, removeUserBook } from '@/services/firebase/userBooks';
import { useAuthStore } from '@/stores/authStore';
import { Review, Topic, ReadingStatus } from '@/types';
import { fixImageUrl } from '@/utils/image';

type Props = NativeStackScreenProps<HomeStackParamList, 'BookDetail'>;
type TabKey = 'reviews' | 'topics';

const STATUS_OPTIONS: { label: string; value: ReadingStatus }[] = [
  { label: '읽는 중', value: 'reading' },
  { label: '읽음', value: 'read' },
  { label: '보관', value: 'archived' },
];

const STATUS_LABELS: Record<ReadingStatus, string> = {
  reading: '읽는 중',
  read: '읽음',
  archived: '보관',
};

export default function BookDetailScreen({ route, navigation }: Props) {
  const { bookId, title, author, publisher, cover, description } = route.params;
  const { firebaseUser } = useAuthStore();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('reviews');
  const [readingStatus, setReadingStatus] = useState<ReadingStatus | null>(null);
  const [pendingStatus, setPendingStatus] = useState<ReadingStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const promises: Promise<unknown>[] = [
        fetchBookReviews(bookId),
        fetchBookTopics(bookId),
      ];
      if (firebaseUser) {
        promises.push(fetchUserBooks(firebaseUser.uid));
      }
      const results = await Promise.all(promises);
      setReviews(results[0] as Review[]);
      setTopics(results[1] as Topic[]);
      if (firebaseUser) {
        const userBooks = results[2] as import('@/types').UserBook[];
        const found = userBooks.find(b => b.bookId === bookId);
        setReadingStatus(found?.status ?? null);
        setPendingStatus(found?.status ?? null);
      }
    } catch (e) {
      console.error('책 상세 로드 실패:', e);
    } finally {
      setIsLoading(false);
    }
  }, [bookId, firebaseUser]);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [title]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  const hasStatusChange = pendingStatus !== readingStatus;

  const handleSaveStatus = async () => {
    if (!firebaseUser) return;
    setStatusLoading(true);
    try {
      if (pendingStatus === null) {
        await removeUserBook(firebaseUser.uid, bookId);
      } else {
        await setUserBook(firebaseUser.uid, { bookId, bookTitle: title, bookCoverUrl: cover, author }, pendingStatus);
      }
      setReadingStatus(pendingStatus);
      Alert.alert('저장 완료', pendingStatus ? `'${STATUS_LABELS[pendingStatus]}'(으)로 저장되었습니다.` : '책 목록에서 제거되었습니다.');
    } catch (e) {
      console.error('읽기 상태 업데이트 실패:', e);
      Alert.alert('오류', '저장에 실패했습니다.');
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 책 정보 헤더 */}
      <View style={styles.bookHeader}>
        <Image source={{ uri: fixImageUrl(cover) }} style={styles.cover} resizeMode="cover" />
        <View style={styles.bookMeta}>
          <Text style={styles.bookTitle} numberOfLines={3}>{title}</Text>
          <Text style={styles.bookAuthor}>{author}</Text>
          <Text style={styles.bookPublisher}>{publisher}</Text>
          <View style={styles.countRow}>
            <Text style={styles.countText}>⭐ 리뷰 {reviews.length}</Text>
            <Text style={styles.countText}>💬 발제 {topics.length}</Text>
          </View>
        </View>
      </View>

      {description ? (
        <Text style={styles.description} numberOfLines={3}>{description}</Text>
      ) : null}

      {/* 읽기 상태 버튼 */}
      <View style={styles.statusBar}>
        {STATUS_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.statusBtn,
              pendingStatus === opt.value && styles.statusBtnPending,
              readingStatus === opt.value && pendingStatus === opt.value && styles.statusBtnActive,
            ]}
            onPress={() => setPendingStatus(prev => prev === opt.value ? null : opt.value)}
            disabled={statusLoading}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.statusText,
              pendingStatus === opt.value && styles.statusTextPending,
              readingStatus === opt.value && pendingStatus === opt.value && styles.statusTextActive,
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
        {hasStatusChange && (
          <TouchableOpacity
            style={[styles.saveBtn, statusLoading && styles.saveBtnDisabled]}
            onPress={handleSaveStatus}
            disabled={statusLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>{statusLoading ? '저장 중' : '저장'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 탭 */}
      <View style={styles.tabBar}>
        {(['reviews', 'topics'] as TabKey[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'reviews' ? `리뷰 ${reviews.length}` : `발제 ${topics.length}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : activeTab === 'reviews' ? (
        <FlatList
          data={reviews}
          keyExtractor={item => item.reviewId}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.reviewCard}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('ReviewDetail', {
                  reviewId: item.reviewId,
                  bookId: item.bookId,
                  rating: item.rating,
                  content: item.content,
                  likeCount: item.likeCount,
                  createdAtMillis: item.createdAt.toMillis(),
                  bookTitle: title,
                  bookCoverUrl: cover,
                  author,
                  displayName: item.displayName,
                })
              }
            >
              {/* 작성자 */}
              <TouchableOpacity
                style={styles.authorRow}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
              >
                <View style={styles.authorAvatar}>
                  <Text style={styles.authorAvatarText}>
                    {(item.displayName ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.authorName}>{item.displayName ?? '알 수 없음'}</Text>
              </TouchableOpacity>
              <View style={styles.reviewHeader}>
                <Text style={styles.stars}>
                  {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                </Text>
                <Text style={styles.reviewDate}>{dayjs(item.createdAt.toDate()).format('YYYY.MM.DD')}</Text>
              </View>
              <Text style={styles.reviewContent} numberOfLines={3}>{item.content}</Text>
              <Text style={styles.likeText}>♡ {item.likeCount}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.writeBtn}
              onPress={() => navigation.navigate('WriteReview', { bookId, bookTitle: title, bookCoverUrl: cover, author })}
              activeOpacity={0.8}
            >
              <Text style={styles.writeBtnText}>+ 리뷰 작성</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={<EmptyState text="아직 리뷰가 없어요." />}
        />
      ) : (
        <FlatList
          data={topics}
          keyExtractor={item => item.topicId}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.topicCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('TopicDetail', { topicId: item.topicId })}
            >
              {/* 작성자 */}
              <TouchableOpacity
                style={styles.authorRow}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
              >
                <View style={styles.authorAvatar}>
                  <Text style={styles.authorAvatarText}>
                    {(item.displayName ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.authorName}>{item.displayName ?? '알 수 없음'}</Text>
              </TouchableOpacity>
              <View style={styles.topicHeader}>
                <Text style={[styles.typeBadge, item.type === 'agree-disagree' && styles.typeBadgeAgree]}>
                  {item.type === 'agree-disagree' ? '찬반' : '자유'}
                </Text>
                <Text style={styles.reviewDate}>{dayjs(item.createdAt.toDate()).format('MM.DD')}</Text>
              </View>
              <Text style={styles.topicTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.topicBody} numberOfLines={2}>{item.body}</Text>
              <Text style={styles.likeText}>💬 답변 {item.answerCount}개</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.writeBtn}
              onPress={() => navigation.navigate('WriteTopic', { bookId, bookTitle: title, bookCoverUrl: cover })}
              activeOpacity={0.8}
            >
              <Text style={styles.writeBtnText}>+ 발제 작성</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={<EmptyState text="아직 발제가 없어요." />}
        />
      )}
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  bookHeader: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cover: { width: 80, height: 116, borderRadius: 4 },
  bookMeta: { flex: 1, justifyContent: 'center' },
  bookTitle: { fontSize: 16, fontWeight: '700', color: '#212121', marginBottom: 6, lineHeight: 22 },
  bookAuthor: { fontSize: 13, color: '#616161', marginBottom: 2 },
  bookPublisher: { fontSize: 12, color: '#767676', marginBottom: 8 },
  countRow: { flexDirection: 'row', gap: 12 },
  countText: { fontSize: 13, color: '#4A90E2', fontWeight: '500' },

  description: {
    fontSize: 13, color: '#757575', lineHeight: 18,
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },

  statusBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  statusBtnActive: { borderColor: '#4A90E2', backgroundColor: '#EAF2FB' },
  statusBtnPending: { borderColor: '#F5A623', backgroundColor: '#FEF0E7' },
  statusText: { fontSize: 13, color: '#767676', fontWeight: '600' },
  statusTextActive: { color: '#4A90E2' },
  statusTextPending: { color: '#F5A623' },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#B0C4DE' },
  saveBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#4A90E2' },
  tabText: { fontSize: 14, color: '#767676', fontWeight: '500' },
  tabTextActive: { color: '#4A90E2', fontWeight: '700' },

  list: { padding: 16, gap: 8 },

  writeBtn: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  writeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  authorAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorAvatarText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  authorName: { fontSize: 13, fontWeight: '600', color: '#424242' },

  reviewCard: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stars: { fontSize: 16, color: '#F5A623' },
  reviewDate: { fontSize: 12, color: '#767676' },
  reviewContent: { fontSize: 14, color: '#424242', lineHeight: 20, marginBottom: 8 },
  likeText: { fontSize: 13, color: '#767676' },

  topicCard: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#F0F0F0', gap: 6,
  },
  topicHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeBadge: {
    fontSize: 12, color: '#4A90E2', backgroundColor: '#EAF2FB',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },
  typeBadgeAgree: { color: '#E67E22', backgroundColor: '#FEF0E7' },
  topicTitle: { fontSize: 15, fontWeight: '600', color: '#212121' },
  topicBody: { fontSize: 13, color: '#616161', lineHeight: 18 },

  emptyContainer: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#767676' },
});
