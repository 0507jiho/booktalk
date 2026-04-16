import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { signOut, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
// import { signOutGoogle } from '@/services/firebase/googleAuth'; // TODO: 네이티브 빌드 시 활성화
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { useClubStore } from '@/stores/clubStore';
import { useFeedStore } from '@/stores/feedStore';
import { useProfileStore } from '@/stores/profileStore';
import { fixImageUrl } from '@/utils/image';
import { fetchLikeState, toggleLike } from '@/services/firebase/likes';
import dayjs from 'dayjs';
import { Review, Topic, Answer } from '@/types';

type TabKey = 'posts' | 'badges';

export default function ProfileScreen() {
  const { userProfile, firebaseUser } = useAuthStore();
  const { reset: resetClub } = useClubStore();
  const { reset: resetFeed } = useFeedStore();
  const { myReviews, myTopics, myAnswers, isLoading, fetchMyContent, reset: resetProfile } = useProfileStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useState<TabKey>('posts');
  const [signingOut, setSigningOut] = useState(false);

  const uid = firebaseUser?.uid;

  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      fetchMyContent(uid);
    }, [uid])
  );

  async function handleDeleteAccount() {
    Alert.alert(
      '계정 탈퇴',
      '탈퇴하면 모든 활동 내역이 삭제되며 복구할 수 없습니다. 정말 탈퇴하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                displayName: '탈퇴한 사용자',
                bio: '',
                photoURL: null,
              });
              resetClub();
              resetFeed();
              resetProfile();
              await deleteUser(user);
            } catch (e: any) {
              if (e.code === 'auth/requires-recent-login') {
                Alert.alert(
                  '재인증 필요',
                  '보안을 위해 로그아웃 후 다시 로그인한 뒤 탈퇴를 진행해주세요.'
                );
              } else {
                Alert.alert('오류', '계정 탈퇴에 실패했습니다. 다시 시도해주세요.');
              }
            }
          },
        },
      ]
    );
  }

  async function handleSignOut() {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            resetClub();
            resetFeed();
            resetProfile();
            // await signOutGoogle(); // TODO: 네이티브 빌드 시 활성화
            await signOut(auth);
          } catch (e) {
            Alert.alert('오류', '로그아웃에 실패했습니다.');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }

  const displayName = userProfile?.displayName ?? firebaseUser?.email ?? '사용자';

  type PostItem =
    | (Review & { _type: 'review' })
    | (Topic & { _type: 'topic' })
    | (Answer & { _type: 'answer' });

  const myPosts: PostItem[] = [
    ...myReviews.map(r => ({ ...r, _type: 'review' as const })),
    ...myTopics.map(t => ({ ...t, _type: 'topic' as const })),
    ...myAnswers.map(a => ({ ...a, _type: 'answer' as const })),
  ].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

  function navigateToReviewDetail(item: Review) {
    navigation.navigate('Home', {
      screen: 'ReviewDetail',
      params: {
        reviewId: item.reviewId,
        bookId: item.bookId,
        rating: item.rating,
        content: item.content,
        likeCount: item.likeCount,
        createdAtMillis: item.createdAt.toMillis(),
        bookTitle: item.bookTitle,
        bookCoverUrl: item.bookCoverUrl,
        author: item.bookTitle,
        displayName: item.displayName,
      },
    });
  }

  function navigateToTopicDetail(topicId: string) {
    navigation.navigate('Home', {
      screen: 'TopicDetail',
      params: { topicId },
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>{displayName}</Text>
          {userProfile?.bio ? <Text style={styles.bio} numberOfLines={2}>{userProfile.bio}</Text> : null}
          <View style={styles.statsRow}>
            <Text style={styles.stat}><Text style={styles.statNum}>{userProfile?.followersCount ?? 0}</Text> 팔로워</Text>
            <Text style={styles.statSep}>·</Text>
            <Text style={styles.stat}><Text style={styles.statNum}>{userProfile?.followingCount ?? 0}</Text> 팔로잉</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleSignOut}
            disabled={signingOut}
            style={styles.signOutIcon}
            accessibilityRole="button"
            accessibilityLabel="로그아웃"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.signOutIconText}>⎋</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteAccount}
            style={styles.deleteAccountBtn}
            accessibilityRole="button"
            accessibilityLabel="계정 탈퇴"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteAccountText}>탈퇴</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 탭 */}
      <View style={styles.tabBar}>
        {([
          { key: 'posts', label: `내가 쓴 글 ${myPosts.length}` },
          { key: 'badges', label: `뱃지 ${userProfile?.badgeIds?.length ?? 0}` },
        ] as { key: TabKey; label: string }[]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#4A90E2" /></View>
      ) : activeTab === 'posts' ? (
        <FlatList
          key="posts"
          data={myPosts}
          keyExtractor={item => {
            if (item._type === 'review') return `r_${item.reviewId}`;
            if (item._type === 'topic') return `t_${item.topicId}`;
            return `a_${item.answerId}`;
          }}
          renderItem={({ item }) => {
            if (item._type === 'review') {
              return (
                <ReviewPostCard
                  item={item as Review & { _type: 'review' }}
                  uid={uid ?? ''}
                  onPress={() => navigateToReviewDetail(item as Review)}
                  onBookPress={() =>
                    navigation.navigate('Home', {
                      screen: 'BookDetail',
                      params: {
                        bookId: item.bookId,
                        title: item.bookTitle,
                        author: '',
                        publisher: '',
                        cover: fixImageUrl(item.bookCoverUrl),
                      },
                    })
                  }
                />
              );
            }
            if (item._type === 'topic') {
              return (
                <TopicPostCard
                  item={item as Topic & { _type: 'topic' }}
                  uid={uid ?? ''}
                  onPress={() => navigateToTopicDetail(item.topicId)}
                  onBookPress={() =>
                    navigation.navigate('Home', {
                      screen: 'BookDetail',
                      params: {
                        bookId: item.bookId,
                        title: item.bookTitle,
                        author: '',
                        publisher: '',
                        cover: fixImageUrl(item.bookCoverUrl),
                      },
                    })
                  }
                />
              );
            }
            return (
              <AnswerPostCard
                item={item as Answer & { _type: 'answer' }}
                uid={uid ?? ''}
                onPress={() => navigateToTopicDetail((item as Answer).topicId)}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState text="아직 작성한 글이 없어요." />}
        />
      ) : (
        <FlatList
          key="badges"
          data={userProfile?.badgeIds ?? []}
          keyExtractor={id => id}
          numColumns={4}
          renderItem={({ item }) => (
            <View style={styles.badgeCell}>
              <Text style={styles.badgeIcon}>🏅</Text>
              <Text style={styles.badgeId} numberOfLines={1}>{item}</Text>
            </View>
          )}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={<EmptyState text="아직 획득한 뱃지가 없어요." />}
        />
      )}
    </View>
  );
}

function ReviewPostCard({
  item,
  uid,
  onPress,
  onBookPress,
}: {
  item: Review & { _type: 'review' };
  uid: string;
  onPress: () => void;
  onBookPress: () => void;
}) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likeCount);

  useEffect(() => { setLikeCount(item.likeCount); }, [item.likeCount]);
  useEffect(() => {
    if (!uid) return;
    fetchLikeState(uid, item.reviewId, 'review').then(({ isLiked: liked, likeCount: count }) => {
      setIsLiked(liked);
      setLikeCount(count);
    });
  }, [uid, item.reviewId]);

  async function handleLike() {
    if (!uid) return;
    const prev = isLiked;
    setIsLiked(!prev);
    setLikeCount(c => prev ? c - 1 : c + 1);
    try {
      const result = await toggleLike(uid, item.reviewId, 'review');
      setIsLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch {
      setIsLiked(prev);
      setLikeCount(c => prev ? c + 1 : c - 1);
    }
  }

  return (
    <TouchableOpacity style={styles.postCard} onPress={onPress} activeOpacity={0.7}>
      <TouchableOpacity style={styles.postBookRow} onPress={onBookPress} activeOpacity={0.7}>
        {item.bookCoverUrl ? (
          <Image source={{ uri: fixImageUrl(item.bookCoverUrl) }} style={styles.postCover} resizeMode="cover" />
        ) : null}
        <Text style={styles.postBookTitle} numberOfLines={1}>{item.bookTitle}</Text>
      </TouchableOpacity>
      <View style={styles.postMeta}>
        <Text style={styles.postTypeBadge}>리뷰</Text>
        <Text style={styles.postStars}>{'★'.repeat(item.rating)}</Text>
        <Text style={styles.postDate}>{dayjs(item.createdAt.toDate()).format('MM.DD')}</Text>
      </View>
      <Text style={styles.postContent} numberOfLines={2}>{item.content}</Text>
      <TouchableOpacity style={styles.postLikeRow} onPress={handleLike} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={13} color={isLiked ? '#E74C3C' : '#BDBDBD'} />
        <Text style={[styles.postLikeCount, isLiked && { color: '#E74C3C' }]}>{likeCount}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function TopicPostCard({
  item,
  uid,
  onPress,
  onBookPress,
}: {
  item: Topic & { _type: 'topic' };
  uid: string;
  onPress: () => void;
  onBookPress: () => void;
}) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likeCount ?? 0);

  useEffect(() => { setLikeCount(item.likeCount ?? 0); }, [item.likeCount]);
  useEffect(() => {
    if (!uid) return;
    fetchLikeState(uid, item.topicId, 'topic').then(({ isLiked: liked, likeCount: count }) => {
      setIsLiked(liked);
      setLikeCount(count);
    });
  }, [uid, item.topicId]);

  async function handleLike() {
    if (!uid) return;
    const prev = isLiked;
    setIsLiked(!prev);
    setLikeCount(c => prev ? c - 1 : c + 1);
    try {
      const result = await toggleLike(uid, item.topicId, 'topic');
      setIsLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch {
      setIsLiked(prev);
      setLikeCount(c => prev ? c + 1 : c - 1);
    }
  }

  return (
    <TouchableOpacity style={styles.postCard} onPress={onPress} activeOpacity={0.7}>
      <TouchableOpacity style={styles.postBookRow} onPress={onBookPress} activeOpacity={0.7}>
        {item.bookCoverUrl ? (
          <Image source={{ uri: fixImageUrl(item.bookCoverUrl) }} style={styles.postCover} resizeMode="cover" />
        ) : null}
        <Text style={styles.postBookTitle} numberOfLines={1}>{item.bookTitle}</Text>
      </TouchableOpacity>
      <View style={styles.postMeta}>
        <Text style={[styles.postTypeBadge, styles.postTypeTopic]}>
          {item.type === 'agree-disagree' ? '찬반' : '자유'}발제
        </Text>
        <Text style={styles.postDate}>{dayjs(item.createdAt.toDate()).format('MM.DD')}</Text>
      </View>
      <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
      <TouchableOpacity style={styles.postLikeRow} onPress={handleLike} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={13} color={isLiked ? '#E74C3C' : '#BDBDBD'} />
        <Text style={[styles.postLikeCount, isLiked && { color: '#E74C3C' }]}>{likeCount}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function AnswerPostCard({
  item,
  uid,
  onPress,
}: {
  item: Answer & { _type: 'answer' };
  uid: string;
  onPress: () => void;
}) {
  const SIDE_LABEL: Record<string, { label: string; color: string }> = {
    pro: { label: '찬성', color: '#27AE60' },
    con: { label: '반대', color: '#E74C3C' },
    neutral: { label: '중립', color: '#7F8C8D' },
  };
  const sideInfo = SIDE_LABEL[item.side];

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likeCount ?? 0);

  useEffect(() => { setLikeCount(item.likeCount ?? 0); }, [item.likeCount]);
  useEffect(() => {
    if (!uid) return;
    fetchLikeState(uid, item.answerId, 'answer').then(({ isLiked: liked, likeCount: count }) => {
      setIsLiked(liked);
      setLikeCount(count);
    });
  }, [uid, item.answerId]);

  async function handleLike() {
    if (!uid) return;
    const prev = isLiked;
    setIsLiked(!prev);
    setLikeCount(c => prev ? c - 1 : c + 1);
    try {
      const result = await toggleLike(uid, item.answerId, 'answer');
      setIsLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch {
      setIsLiked(prev);
      setLikeCount(c => prev ? c + 1 : c - 1);
    }
  }

  return (
    <TouchableOpacity style={styles.postCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.postMeta}>
        <Text style={[styles.postTypeBadge, styles.postTypeAnswer]}>답변</Text>
        {sideInfo && (
          <Text style={[styles.sideBadge, { color: sideInfo.color, borderColor: sideInfo.color }]}>
            {sideInfo.label}
          </Text>
        )}
        <Text style={styles.postDate}>{dayjs(item.createdAt.toDate()).format('MM.DD')}</Text>
      </View>
      <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>
      <View style={styles.postCardFooter}>
        <Text style={styles.answerHint}>발제 보기 →</Text>
        <TouchableOpacity style={styles.postLikeRow} onPress={handleLike} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={13} color={isLiked ? '#E74C3C' : '#BDBDBD'} />
          <Text style={[styles.postLikeCount, isLiked && { color: '#E74C3C' }]}>{likeCount}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },

  profileHeader: {
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signOutIcon: { padding: 8 },
  signOutIconText: { fontSize: 20, color: '#767676' },
  deleteAccountBtn: { padding: 8 },
  deleteAccountText: { fontSize: 12, color: '#E74C3C' },

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

  postCard: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#F0F0F0', gap: 6,
  },
  postBookRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postCover: { width: 28, height: 40, borderRadius: 2 },
  postBookTitle: { flex: 1, fontSize: 12, color: '#767676' },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postTypeBadge: {
    fontSize: 11, color: '#4A90E2', backgroundColor: '#EAF2FB',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, overflow: 'hidden',
  },
  postTypeTopic: { color: '#E67E22', backgroundColor: '#FEF0E7' },
  postTypeAnswer: { color: '#8E44AD', backgroundColor: '#F5EEF8' },
  sideBadge: {
    fontSize: 11, fontWeight: '600', borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3, overflow: 'hidden',
  },
  postStars: { fontSize: 13, color: '#F5A623' },
  postDate: { fontSize: 12, color: '#BDBDBD', marginLeft: 'auto' },
  postContent: { fontSize: 14, color: '#424242', lineHeight: 20 },
  postTitle: { fontSize: 14, fontWeight: '600', color: '#212121', lineHeight: 20 },
  answerHint: { fontSize: 12, color: '#4A90E2', marginTop: 2 },
  postCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  postLikeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postLikeCount: { fontSize: 12, color: '#BDBDBD' },

  badgeCell: { flex: 1 / 4, margin: 4, alignItems: 'center', paddingVertical: 12 },
  badgeIcon: { fontSize: 32 },
  badgeId: { fontSize: 10, color: '#767676', marginTop: 4, textAlign: 'center' },

  emptyText: { fontSize: 15, color: '#767676' },
});
