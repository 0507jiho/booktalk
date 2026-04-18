import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchTopics } from '@/services/firebase/topics';
import { Topic, TopicType } from '@/types';
import { TopicStackParamList } from '@/navigation/TopicStackNavigator';
import { useAuthStore } from '@/stores/authStore';
import { fetchLikeState, toggleLike } from '@/services/firebase/likes';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import StanceProgressBar from '@/components/StanceProgressBar';
import SkeletonCard from '@/components/SkeletonCard';
import EmptyState from '@/components/EmptyState';
import SpoilerContent from '@/components/SpoilerContent';

type Nav = NativeStackNavigationProp<TopicStackParamList, 'TopicList'>;

type Filter = TopicType | 'all';

const FILTERS: { label: string; value: Filter }[] = [
  { label: '전체', value: 'all' },
  { label: '자유', value: 'free' },
  { label: '찬반', value: 'agree-disagree' },
];

export default function TopicListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { firebaseUser } = useAuthStore();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [focusKey, setFocusKey] = useState(0);

  useFocusEffect(useCallback(() => { setFocusKey(k => k + 1); }, []));

  const loadTopics = useCallback(async (selectedFilter: Filter) => {
    setIsLoading(true);
    try {
      const { topics: newTopics } = await fetchTopics(selectedFilter);
      setTopics(newTopics);
    } catch (e) {
      console.error('발제 로드 실패:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics(filter);
  }, [filter, focusKey]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 필터 탭 */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterBtn, filter === f.value && styles.filterBtnActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={topics}
          keyExtractor={item => item.topicId}
          renderItem={({ item }) => (
            <TopicCard
              topic={item}
              uid={firebaseUser?.uid ?? ''}
              focusKey={focusKey}
              onPress={() => navigation.navigate('TopicDetail', { topicId: item.topicId })}
            />
          )}
          contentContainerStyle={topics.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => loadTopics(filter)}
              tintColor="#3D4DC4"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="chatbubble-outline"
              title="아직 발제가 없어요."
              subtitle="첫 번째 발제를 작성해보세요!"
            />
          }
        />
      )}
    </View>
  );
}

function TopicCard({
  topic,
  uid,
  focusKey,
  onPress,
}: {
  topic: Topic;
  uid: string;
  focusKey: number;
  onPress: () => void;
}) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(topic.likeCount ?? 0);

  useEffect(() => {
    if (!uid) return;
    fetchLikeState(uid, topic.topicId, 'topic').then(({ isLiked: liked, likeCount: count }) => {
      setIsLiked(liked);
      setLikeCount(count);
    });
  }, [uid, topic.topicId, focusKey]);

  async function handleLike() {
    if (!uid) return;
    const prev = isLiked;
    setIsLiked(!prev);
    setLikeCount(c => prev ? c - 1 : c + 1);
    try {
      const result = await toggleLike(uid, topic.topicId, 'topic');
      setIsLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch {
      setIsLiked(prev);
      setLikeCount(c => prev ? c + 1 : c - 1);
    }
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.bookMini}>
        <Ionicons name="book-outline" size={12} color="#9BA5E0" />
        <Text style={styles.bookMiniTitle} numberOfLines={1}>{topic.bookTitle}</Text>
      </View>

      <View style={styles.cardHeader}>
        <Text style={[styles.badge, topic.type === 'agree-disagree' && styles.badgeAgree]}>
          {topic.type === 'agree-disagree' ? '찬반' : '자유'}
        </Text>
        {topic.clubId && <Text style={styles.clubBadge}>모임</Text>}
        <Text style={styles.date}>{dayjs(topic.createdAt.toDate()).format('MM.DD')}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{topic.title}</Text>
      <SpoilerContent hasSpoiler={topic.hasSpoiler}>
        <Text style={styles.body} numberOfLines={2}>{topic.body}</Text>
      </SpoilerContent>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="chatbubble-outline" size={13} color="#767676" />
          <Text style={styles.answerCount}>답변 {topic.answerCount}개</Text>
        </View>
        <TouchableOpacity style={styles.metaItem} onPress={handleLike} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={13} color={isLiked ? '#E74C3C' : '#767676'} />
          <Text style={[styles.answerCount, isLiked && { color: '#E74C3C' }]}>{likeCount}</Text>
        </TouchableOpacity>
      </View>
      {topic.type === 'agree-disagree' && (topic.proCount !== undefined || topic.conCount !== undefined) && (
        <StanceProgressBar
          proCount={topic.proCount ?? 0}
          conCount={topic.conCount ?? 0}
          neutralCount={topic.neutralCount ?? 0}
          mini
        />
      )}
    </TouchableOpacity>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  filterBtnActive: { backgroundColor: '#3D4DC4' },
  filterText: { fontSize: 14, color: '#757575' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingVertical: 8 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  bookMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  bookMiniTitle: { fontSize: 12, color: '#9BA5E0', fontWeight: '500', flexShrink: 1 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    fontSize: 12,
    color: '#3D4DC4',
    backgroundColor: '#ECEFFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeAgree: { color: '#E67E22', backgroundColor: '#FEF0E7' },
  clubBadge: {
    fontSize: 12,
    color: '#27AE60',
    backgroundColor: '#E9F7EF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  date: { fontSize: 12, color: '#767676', marginLeft: 'auto' },
  title: { fontSize: 16, fontWeight: '600', color: '#212121', marginBottom: 4 },
  body: { fontSize: 14, color: '#616161', lineHeight: 20, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  answerCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  answerCount: { fontSize: 13, color: '#767676' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
  emptyText: { fontSize: 16, color: '#767676' },
});
