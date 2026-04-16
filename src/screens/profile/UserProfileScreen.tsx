import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { fetchUserProfile } from '@/services/firebase/users';
import { fetchUserReviews } from '@/services/firebase/reviews';
import { fetchUserTopics } from '@/services/firebase/topics';
import { fetchUserBooks } from '@/services/firebase/userBooks';
import { createBlock } from '@/services/firebase/reports';
import { checkIsFollowing, toggleFollow } from '@/services/firebase/follows';
import { useAuthStore } from '@/stores/authStore';
import { User, Review, Topic, UserBook } from '@/types';
import { fixImageUrl } from '@/utils/image';

type Props = {
  route: { params: { userId: string } };
};

type TabKey = 'shelf' | 'posts' | 'badges';
type PostItem = (Review & { _type: 'review' }) | (Topic & { _type: 'topic' });

const STATUS_LABEL: Record<string, string> = {
  reading: '읽는 중',
  read: '읽음',
  archived: '담아둔',
};

export default function UserProfileScreen({ route }: Props) {
  const { userId } = route.params;
  const navigation = useNavigation<any>();
  const { firebaseUser } = useAuthStore();
  const myUid = firebaseUser?.uid;

  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('shelf');

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const [user, reviews, topics, books] = await Promise.all([
          fetchUserProfile(userId),
          fetchUserReviews(userId),
          fetchUserTopics(userId),
          fetchUserBooks(userId),
        ]);
        setProfile(user);
        setUserBooks(books);
        const merged: PostItem[] = [
          ...reviews.map(r => ({ ...r, _type: 'review' as const })),
          ...topics.map(t => ({ ...t, _type: 'topic' as const })),
        ].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setPosts(merged);
      } catch (e) {
        console.error('유저 프로필 로드 실패:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (!myUid || myUid === userId) return;
    checkIsFollowing(myUid, userId).then(setIsFollowing);
  }, [myUid, userId]);

  useEffect(() => {
    if (profile) navigation.setOptions({ title: profile.displayName });
  }, [profile]);

  async function handleFollow() {
    if (!myUid) return;
    setFollowLoading(true);
    const prev = isFollowing;
    setIsFollowing(!prev);
    setProfile(p => p
      ? { ...p, followersCount: p.followersCount + (prev ? -1 : 1) }
      : p
    );
    try {
      const result = await toggleFollow(myUid, userId);
      setIsFollowing(result.isFollowing);
    } catch {
      setIsFollowing(prev);
      setProfile(p => p
        ? { ...p, followersCount: p.followersCount + (prev ? 1 : -1) }
        : p
      );
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleBlock() {
    if (!myUid) return;
    Alert.alert(
      '사용자 차단',
      `${profile?.displayName ?? '이 사용자'}님을 차단하시겠습니까? 차단하면 이 사용자의 게시물이 피드에 표시되지 않습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차단',
          style: 'destructive',
          onPress: async () => {
            try {
              await createBlock(myUid, userId);
              setIsBlocked(true);
              Alert.alert('차단 완료', '해당 사용자를 차단했습니다.');
            } catch {
              Alert.alert('오류', '차단에 실패했습니다.');
            }
          },
        },
      ]
    );
  }

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4A90E2" /></View>;
  }

  if (!profile) {
    return <View style={styles.center}><Text style={styles.emptyText}>사용자를 찾을 수 없어요.</Text></View>;
  }

  const isOwnProfile = myUid === userId;
  const showActions = !!myUid && !isOwnProfile;

  // 탭별 데이터
  const tabData: unknown[] =
    activeTab === 'shelf' ? userBooks :
    activeTab === 'posts' ? posts :
    (profile.badgeIds ?? []);

  const numColumns =
    activeTab === 'shelf' ? 3 :
    activeTab === 'badges' ? 4 : 1;

  return (
    <View style={styles.container}>
      {/* 프로필 헤더 */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          {profile.bio ? <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text> : null}
          <View style={styles.statsRow}>
            <Text style={styles.stat}><Text style={styles.statNum}>{profile.followersCount}</Text> 팔로워</Text>
            <Text style={styles.statSep}>·</Text>
            <Text style={styles.stat}><Text style={styles.statNum}>{profile.followingCount}</Text> 팔로잉</Text>
          </View>
        </View>
        {showActions && (
          <View style={styles.actionBtns}>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followBtnActive]}
              onPress={handleFollow}
              disabled={followLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                {isFollowing ? '팔로잉' : '팔로우'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.blockBtn, isBlocked && styles.blockBtnDisabled]}
              onPress={handleBlock}
              disabled={isBlocked}
              activeOpacity={0.7}
            >
              <Text style={[styles.blockBtnText, isBlocked && styles.blockBtnTextDisabled]}>
                {isBlocked ? '차단됨' : '차단'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 탭 바 */}
      <View style={styles.tabBar}>
        {([
          { key: 'shelf', label: `서재 ${userBooks.length}` },
          { key: 'posts', label: `쓴 글 ${posts.length}` },
          { key: 'badges', label: `뱃지 ${profile.badgeIds?.length ?? 0}` },
        ] as { key: TabKey; label: string }[]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 탭 콘텐츠 */}
      <FlatList
        key={`${activeTab}-${numColumns}`}
        data={tabData as any[]}
        keyExtractor={(item, idx) => {
          if (activeTab === 'shelf') return (item as UserBook).bookId;
          if (activeTab === 'posts') return 'reviewId' in item ? (item as Review).reviewId : (item as Topic).topicId;
          return `badge-${idx}`;
        }}
        numColumns={numColumns}
        renderItem={({ item }) => {
          if (activeTab === 'shelf') {
            const book = item as UserBook;
            return (
              <TouchableOpacity
                style={styles.bookCell}
                onPress={() => navigation.navigate('BookDetail', {
                  bookId: book.bookId,
                  title: book.bookTitle,
                  author: book.author,
                  publisher: '',
                  cover: fixImageUrl(book.bookCoverUrl),
                })}
                activeOpacity={0.7}
              >
                <Image source={{ uri: fixImageUrl(book.bookCoverUrl) }} style={styles.bookCover} resizeMode="cover" />
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{STATUS_LABEL[book.status] ?? book.status}</Text>
                </View>
              </TouchableOpacity>
            );
          }
          if (activeTab === 'posts') {
            const post = item as PostItem;
            if (post._type === 'review') {
              return (
                <TouchableOpacity
                  style={styles.postCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('ReviewDetail', {
                    reviewId: post.reviewId,
                    bookId: post.bookId,
                    rating: post.rating,
                    content: post.content,
                    likeCount: post.likeCount,
                    createdAtMillis: post.createdAt.toMillis(),
                    bookTitle: post.bookTitle,
                    bookCoverUrl: post.bookCoverUrl,
                    author: post.bookTitle,
                    displayName: post.displayName,
                  })}
                >
                  <TouchableOpacity
                    style={styles.bookRow}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('BookDetail', {
                      bookId: post.bookId,
                      title: post.bookTitle,
                      author: '',
                      publisher: '',
                      cover: fixImageUrl(post.bookCoverUrl),
                    })}
                  >
                    {post.bookCoverUrl ? (
                      <Image source={{ uri: fixImageUrl(post.bookCoverUrl) }} style={styles.postCover} resizeMode="cover" />
                    ) : null}
                    <Text style={styles.postBookTitle} numberOfLines={1}>{post.bookTitle}</Text>
                  </TouchableOpacity>
                  <View style={styles.postMeta}>
                    <Text style={styles.postTypeBadge}>리뷰</Text>
                    <Text style={styles.postStars}>{'★'.repeat(post.rating)}</Text>
                    <Text style={styles.postDate}>{dayjs(post.createdAt.toDate()).format('MM.DD')}</Text>
                  </View>
                  <Text style={styles.postContent} numberOfLines={2}>{post.content}</Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                style={styles.postCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('TopicDetail', { topicId: post.topicId })}
              >
                <TouchableOpacity
                  style={styles.bookRow}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('BookDetail', {
                    bookId: post.bookId,
                    title: post.bookTitle,
                    author: '',
                    publisher: '',
                    cover: fixImageUrl(post.bookCoverUrl),
                  })}
                >
                  {post.bookCoverUrl ? (
                    <Image source={{ uri: fixImageUrl(post.bookCoverUrl) }} style={styles.postCover} resizeMode="cover" />
                  ) : null}
                  <Text style={styles.postBookTitle} numberOfLines={1}>{post.bookTitle}</Text>
                </TouchableOpacity>
                <View style={styles.postMeta}>
                  <Text style={[styles.postTypeBadge, styles.postTypeTopic]}>
                    {post.type === 'agree-disagree' ? '찬반' : '자유'}발제
                  </Text>
                  <Text style={styles.postDate}>{dayjs(post.createdAt.toDate()).format('MM.DD')}</Text>
                </View>
                <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
              </TouchableOpacity>
            );
          }
          // badges
          return (
            <View style={styles.badgeCell}>
              <Text style={styles.badgeIcon}>🏅</Text>
              <Text style={styles.badgeId} numberOfLines={1}>{item as string}</Text>
            </View>
          );
        }}
        contentContainerStyle={
          activeTab === 'shelf' ? styles.gridContent :
          activeTab === 'badges' ? styles.gridContent :
          styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyPosts}>
            <Text style={styles.emptyText}>
              {activeTab === 'shelf' ? '읽은 책이 없어요.' :
               activeTab === 'posts' ? '작성한 글이 없어요.' :
               '획득한 뱃지가 없어요.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#4A90E2',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  profileInfo: { flex: 1 },
  displayName: { fontSize: 17, fontWeight: '700', color: '#212121', marginBottom: 4 },
  bio: { fontSize: 13, color: '#757575', lineHeight: 18, marginBottom: 6 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stat: { fontSize: 13, color: '#616161' },
  statNum: { fontWeight: '700', color: '#212121' },
  statSep: { fontSize: 13, color: '#BDBDBD' },

  actionBtns: { flexDirection: 'column', gap: 6, alignItems: 'flex-end' },
  followBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 6, borderWidth: 1.5, borderColor: '#4A90E2',
    backgroundColor: '#4A90E2',
  },
  followBtnActive: { backgroundColor: '#fff' },
  followBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  followBtnTextActive: { color: '#4A90E2' },
  blockBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: '#E0E0E0',
  },
  blockBtnDisabled: { borderColor: '#BDBDBD', backgroundColor: '#F5F5F5' },
  blockBtnText: { fontSize: 11, color: '#9E9E9E' },
  blockBtnTextDisabled: { color: '#BDBDBD' },

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
  tabText: { fontSize: 12, color: '#767676', fontWeight: '500' },
  tabTextActive: { color: '#4A90E2', fontWeight: '700' },

  gridContent: { padding: 4 },
  listContent: { padding: 12, gap: 8 },

  bookCell: { flex: 1 / 3, margin: 4, aspectRatio: 0.7, position: 'relative' },
  bookCover: { width: '100%', height: '100%', borderRadius: 4 },
  statusBadge: {
    position: 'absolute', bottom: 4, left: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 3, paddingVertical: 2,
  },
  statusBadgeText: { color: '#fff', fontSize: 10, textAlign: 'center', fontWeight: '600' },

  postCard: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#F0F0F0', gap: 6,
    marginBottom: 8,
  },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postCover: { width: 28, height: 40, borderRadius: 2 },
  postBookTitle: { flex: 1, fontSize: 12, color: '#767676' },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postTypeBadge: {
    fontSize: 11, color: '#4A90E2', backgroundColor: '#EAF2FB',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, overflow: 'hidden',
  },
  postTypeTopic: { color: '#E67E22', backgroundColor: '#FEF0E7' },
  postStars: { fontSize: 13, color: '#F5A623' },
  postDate: { fontSize: 12, color: '#BDBDBD', marginLeft: 'auto' },
  postContent: { fontSize: 14, color: '#424242', lineHeight: 20 },
  postTitle: { fontSize: 14, fontWeight: '600', color: '#212121', lineHeight: 20 },

  badgeCell: { flex: 1 / 4, margin: 4, alignItems: 'center', paddingVertical: 12 },
  badgeIcon: { fontSize: 32 },
  badgeId: { fontSize: 10, color: '#767676', marginTop: 4, textAlign: 'center' },

  emptyPosts: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#767676' },
});
