import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useFeedStore } from '@/stores/feedStore';
import { useAuthStore } from '@/stores/authStore';
import { fetchFeed } from '@/services/firebase/feed';
import { fetchTrendingTopics } from '@/services/firebase/topics';
import { fetchTrendingBooks } from '@/services/firebase/books';
import { Review, Topic, Book, LikeTargetType } from '@/types';
import { fetchLikeState, toggleLike } from '@/services/firebase/likes';
import { HomeStackParamList } from '@/navigation/HomeStackNavigator';
import { fixImageUrl } from '@/utils/image';
import dayjs from 'dayjs';
import SkeletonCard from '@/components/SkeletonCard';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeFeed'>;

const PRIMARY = '#3D4DC4';
const PRIMARY_LIGHT = '#ECEFFE';

export default function HomeScreen({ navigation }: Props) {
  const { items, isLoading, setItems, setLoading, reset } = useFeedStore();
  const { firebaseUser } = useAuthStore();
  const [trendingTopics, setTrendingTopics] = useState<Topic[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);

  const loadDiscover = useCallback(async () => {
    setDiscoverLoading(true);
    try {
      const [books, topics] = await Promise.all([
        fetchTrendingBooks(10),
        fetchTrendingTopics(8),
      ]);
      setTrendingBooks(books);
      setTrendingTopics(topics);
    } catch (e) {
      console.error('디스커버 로드 실패:', e);
    } finally {
      setDiscoverLoading(false);
    }
  }, []);

  const loadFeed = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const { items: newItems } = await fetchFeed(firebaseUser.uid);
      setItems(newItems);
    } catch (e) {
      console.error('피드 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  const handleRefresh = useCallback(() => {
    Promise.all([loadFeed(), loadDiscover()]);
  }, [loadFeed, loadDiscover]);

  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(useCallback(() => { setFocusKey(k => k + 1); }, []));

  useEffect(() => {
    loadFeed();
    loadDiscover();
    return () => reset();
  }, [loadFeed, loadDiscover]);

  const listHeader = (
    <HomeHeader
      trendingBooks={trendingBooks}
      trendingTopics={trendingTopics}
      isLoading={discoverLoading}
      hasFeed={items.length > 0}
      onBookPress={(book) =>
        navigation.navigate('BookDetail', {
          bookId: book.bookId,
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          cover: fixImageUrl(book.coverUrl),
        })
      }
      onTopicPress={(topicId) => navigation.navigate('TopicDetail', { topicId })}
      onBooksMore={() => navigation.navigate('TrendingBooks')}
      onTopicsMore={() => navigation.navigate('TrendingTopics')}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) =>
          item.type === 'review' ? item.data.reviewId : item.data.topicId
        }
        renderItem={({ item }) => {
          if (item.type === 'review') {
            return (
              <ReviewCard
                review={item.data}
                uid={firebaseUser?.uid ?? ''}
                focusKey={focusKey}
                onPress={() =>
                  navigation.navigate('ReviewDetail', {
                    reviewId: item.data.reviewId,
                    bookId: item.data.bookId,
                    rating: item.data.rating,
                    content: item.data.content,
                    likeCount: item.data.likeCount,
                    createdAtMillis: item.data.createdAt.toMillis(),
                    bookTitle: item.data.bookTitle,
                    bookCoverUrl: item.data.bookCoverUrl,
                    author: item.data.bookTitle,
                    displayName: item.data.displayName,
                  })
                }
                onAuthorPress={() =>
                  navigation.navigate('UserProfile', { userId: item.data.userId })
                }
              />
            );
          }
          return (
            <TopicCard
              topic={item.data}
              uid={firebaseUser?.uid ?? ''}
              focusKey={focusKey}
              onPress={() =>
                navigation.navigate('TopicDetail', { topicId: item.data.topicId })
              }
              onAuthorPress={() =>
                navigation.navigate('UserProfile', { userId: item.data.userId })
              }
            />
          );
        }}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={PRIMARY} />
        }
        ListEmptyComponent={
          !isLoading && !discoverLoading ? (
            <View style={styles.feedEmptyNote}>
              <Ionicons name="people-outline" size={15} color="#9BA5E0" />
              <Text style={styles.feedEmptyText}>
                팔로잉 피드가 비어있어요. 다른 사용자를 팔로우해보세요.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoading && items.length > 0 ? (
            <ActivityIndicator style={{ padding: 16 }} color={PRIMARY} />
          ) : null
        }
      />
    </View>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function HomeHeader({
  trendingBooks,
  trendingTopics,
  isLoading,
  hasFeed,
  onBookPress,
  onTopicPress,
  onBooksMore,
  onTopicsMore,
}: {
  trendingBooks: Book[];
  trendingTopics: Topic[];
  isLoading: boolean;
  hasFeed: boolean;
  onBookPress: (book: Book) => void;
  onTopicPress: (topicId: string) => void;
  onBooksMore: () => void;
  onTopicsMore: () => void;
}) {
  return (
    <View>
      {/* 인기 도서 */}
      <View style={styles.section}>
        <SectionHeader title="인기 도서" icon="flame-outline" onPress={onBooksMore} />
        {isLoading ? (
          <View style={styles.skeletonRow}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.bookCardSkeleton} />
            ))}
          </View>
        ) : trendingBooks.length > 0 ? (
          <FlatList
            data={trendingBooks}
            keyExtractor={(b) => b.bookId}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item }) => (
              <BookCard book={item} onPress={() => onBookPress(item)} />
            )}
          />
        ) : null}
      </View>

      {/* 지금 뜨는 발제 */}
      <View style={styles.section}>
        <SectionHeader title="지금 뜨는 발제" icon="trending-up-outline" onPress={onTopicsMore} />
        {isLoading ? (
          <View style={[styles.skeletonRow, { gap: 10 }]}>
            {[1, 2].map((i) => (
              <View key={i} style={styles.trendingCardSkeleton} />
            ))}
          </View>
        ) : trendingTopics.length > 0 ? (
          <FlatList
            data={trendingTopics}
            keyExtractor={(t) => t.topicId}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item }) => (
              <TrendingTopicCard topic={item} onPress={() => onTopicPress(item.topicId)} />
            )}
          />
        ) : null}
      </View>

      {/* 팔로잉 피드 구분선 */}
      <FeedDivider />
    </View>
  );
}

function SectionHeader({ title, icon, onPress }: { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <Ionicons name={icon} size={16} color={PRIMARY} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPress && (
        <View style={styles.sectionMore}>
          <Text style={styles.sectionMoreText}>더보기</Text>
          <Ionicons name="chevron-forward" size={13} color="#9BA5E0" />
        </View>
      )}
    </TouchableOpacity>
  );
}

function FeedDivider() {
  return (
    <View style={styles.feedDivider}>
      <View style={styles.feedDividerLine} />
      <View style={styles.feedDividerLabel}>
        <Ionicons name="people" size={12} color={PRIMARY} />
        <Text style={styles.feedDividerText}>팔로잉 피드</Text>
      </View>
      <View style={styles.feedDividerLine} />
    </View>
  );
}

// ─── Discover Cards ───────────────────────────────────────────────────────────

function BookCard({ book, onPress }: { book: Book; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.bookCard} onPress={onPress} activeOpacity={0.8}>
      {book.coverUrl ? (
        <Image
          source={{ uri: fixImageUrl(book.coverUrl) }}
          style={styles.bookCardCover}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.bookCardCover, styles.bookCardCoverPlaceholder]}>
          <Ionicons name="book-outline" size={26} color="#9BA5E0" />
        </View>
      )}
      <Text style={styles.bookCardTitle} numberOfLines={2}>{book.title}</Text>
      {book.avgRating > 0 && (
        <View style={styles.bookCardRating}>
          <Ionicons name="star" size={10} color="#F5A623" />
          <Text style={styles.bookCardRatingText}>{book.avgRating.toFixed(1)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function TrendingTopicCard({ topic, onPress }: { topic: Topic; onPress: () => void }) {
  const isAgreeDisagree = topic.type === 'agree-disagree';
  return (
    <TouchableOpacity style={styles.trendingCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.trendingBadgeRow}>
        <Text style={[styles.trendingBadge, isAgreeDisagree && styles.trendingBadgeAgree]}>
          {isAgreeDisagree ? '찬반' : '자유'}
        </Text>
        {topic.bookTitle ? (
          <Text style={styles.trendingBookLabel} numberOfLines={1}>{topic.bookTitle}</Text>
        ) : null}
      </View>
      <Text style={styles.trendingTitle} numberOfLines={3}>{topic.title}</Text>
      <View style={styles.trendingMeta}>
        <Ionicons name="chatbubble-outline" size={12} color="#767676" />
        <Text style={styles.trendingCount}>{topic.answerCount}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Feed Cards ───────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={13}
          color="#F5A623"
        />
      ))}
    </View>
  );
}

function AuthorRow({
  displayName,
  createdAtDate,
  onPress,
  label,
}: {
  displayName: string;
  createdAtDate: Date;
  onPress: () => void;
  label: string;
}) {
  return (
    <TouchableOpacity
      style={styles.authorRow}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={styles.authorAvatar}>
        <Text style={styles.authorAvatarText}>
          {(displayName || '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.authorName}>{displayName || '알 수 없음'}</Text>
      <Text style={styles.date}>{dayjs(createdAtDate).format('MM.DD')}</Text>
    </TouchableOpacity>
  );
}

function BookMini({ title }: { title: string }) {
  return (
    <View style={styles.bookMini}>
      <Ionicons name="book-outline" size={12} color="#9BA5E0" />
      <Text style={styles.bookMiniTitle} numberOfLines={1}>{title}</Text>
    </View>
  );
}

function ReviewCard({
  review,
  uid,
  focusKey,
  onPress,
  onAuthorPress,
}: {
  review: Review;
  uid: string;
  focusKey: number;
  onPress: () => void;
  onAuthorPress: () => void;
}) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(review.likeCount);

  useEffect(() => {
    if (!uid) return;
    fetchLikeState(uid, review.reviewId, 'review').then(({ isLiked: liked, likeCount: count }) => {
      setIsLiked(liked);
      setLikeCount(count);
    });
  }, [uid, review.reviewId, focusKey]);

  async function handleLike() {
    if (!uid) return;
    const prev = isLiked;
    setIsLiked(!prev);
    setLikeCount(c => prev ? c - 1 : c + 1);
    try {
      const result = await toggleLike(uid, review.reviewId, 'review');
      setIsLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch {
      setIsLiked(prev);
      setLikeCount(c => prev ? c + 1 : c - 1);
    }
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <AuthorRow
        displayName={review.displayName ?? ''}
        createdAtDate={review.createdAt.toDate()}
        onPress={onAuthorPress}
        label={`${review.displayName ?? '사용자'} 프로필 보기`}
      />
      <BookMini title={review.bookTitle} />
      <View style={styles.cardHeader}>
        <Text style={styles.badge}>리뷰</Text>
        <StarRating rating={review.rating} />
      </View>
      <Text style={styles.content} numberOfLines={3}>{review.content}</Text>
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.likeBtn} onPress={handleLike} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={15} color={isLiked ? '#E74C3C' : '#767676'} />
          <Text style={[styles.footerCount, isLiked && styles.footerCountLiked]}>{likeCount}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function TopicCard({
  topic,
  uid,
  focusKey,
  onPress,
  onAuthorPress,
}: {
  topic: Topic;
  uid: string;
  focusKey: number;
  onPress: () => void;
  onAuthorPress: () => void;
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
      <AuthorRow
        displayName={topic.displayName ?? ''}
        createdAtDate={topic.createdAt.toDate()}
        onPress={onAuthorPress}
        label={`${topic.displayName ?? '사용자'} 프로필 보기`}
      />
      <BookMini title={topic.bookTitle} />
      <View style={styles.cardHeader}>
        <Text style={[styles.badge, styles.topicBadge]}>
          {topic.type === 'agree-disagree' ? '찬반' : '자유'}발제
        </Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{topic.title}</Text>
      <Text style={styles.content} numberOfLines={2}>{topic.body}</Text>
      <View style={styles.cardFooter}>
        <Ionicons name="chatbubble-outline" size={14} color="#767676" />
        <Text style={styles.footerCount}>{topic.answerCount}</Text>
        <TouchableOpacity style={[styles.likeBtn, { marginLeft: 12 }]} onPress={handleLike} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={15} color={isLiked ? '#E74C3C' : '#767676'} />
          <Text style={[styles.footerCount, isLiked && styles.footerCountLiked]}>{likeCount}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FF' },
  list: { paddingBottom: 16 },

  // Sections
  section: {
    backgroundColor: '#fff',
    marginBottom: 8,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionMore: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  sectionMoreText: { fontSize: 12, color: '#9BA5E0' },
  horizontalList: { paddingHorizontal: 16, gap: 10 },

  // Skeleton placeholders
  skeletonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  bookCardSkeleton: {
    width: 90,
    height: 140,
    borderRadius: 8,
    backgroundColor: '#ECEFFE',
  },
  trendingCardSkeleton: {
    width: 180,
    height: 110,
    borderRadius: 10,
    backgroundColor: '#ECEFFE',
  },

  // Book card (horizontal)
  bookCard: { width: 90, alignItems: 'flex-start' },
  bookCardCover: {
    width: 90,
    height: 124,
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: '#ECEFFE',
  },
  bookCardCoverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookCardTitle: {
    fontSize: 12,
    color: '#212121',
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 4,
  },
  bookCardRating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bookCardRatingText: { fontSize: 11, color: '#767676' },

  // Trending topic card (horizontal)
  trendingCard: {
    width: 180,
    backgroundColor: '#F7F8FF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECEFFE',
    justifyContent: 'space-between',
    minHeight: 110,
  },
  trendingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  trendingBadge: {
    fontSize: 11,
    color: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    fontWeight: '600',
  },
  trendingBadgeAgree: { color: '#E67E22', backgroundColor: '#FEF0E7' },
  trendingBookLabel: {
    flex: 1,
    fontSize: 11,
    color: '#767676',
    fontStyle: 'italic',
  },
  trendingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212121',
    lineHeight: 18,
    flex: 1,
    marginBottom: 8,
  },
  trendingMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendingCount: { fontSize: 12, color: '#767676' },

  // Feed divider
  feedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  feedDividerLine: { flex: 1, height: 1, backgroundColor: '#ECEFFE' },
  feedDividerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginHorizontal: 12,
  },
  feedDividerText: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '600',
  },

  // Feed empty
  feedEmptyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  feedEmptyText: { fontSize: 13, color: '#9BA5E0', lineHeight: 18, flexShrink: 1 },

  // Feed cards
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 5,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECEFFE',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorAvatarText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  authorName: { fontSize: 13, fontWeight: '600', color: '#424242', flex: 1 },
  date: { fontSize: 12, color: '#767676' },

  bookMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  bookMiniTitle: { fontSize: 12, color: '#9BA5E0', fontWeight: '500', flexShrink: 1 },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  badge: {
    fontSize: 12,
    color: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    fontWeight: '600',
  },
  topicBadge: { color: '#E67E22', backgroundColor: '#FEF0E7' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#212121', marginBottom: 4 },
  content: { fontSize: 14, color: '#616161', lineHeight: 20 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  footerCount: { fontSize: 13, color: '#767676' },
  footerCountLiked: { color: '#E74C3C' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starRow: { flexDirection: 'row', gap: 1 },
});
