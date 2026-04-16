import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { TopicStackParamList } from '@/navigation/TopicStackNavigator';
import { fetchTopic } from '@/services/firebase/topics';
import { fetchAnswers, addAnswer } from '@/services/firebase/answers';
import { fetchReplies, addReply } from '@/services/firebase/replies';
import { checkIsLiked, toggleLike } from '@/services/firebase/likes';
import { fetchVote, castVote } from '@/services/firebase/votes';
import { useAuthStore } from '@/stores/authStore';
import { Topic, Answer, AnswerSide, Reply, SubQuestion } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { fixImageUrl } from '@/utils/image';
import StanceProgressBar from '@/components/StanceProgressBar';

type Props = NativeStackScreenProps<TopicStackParamList, 'TopicDetail'>;

const SIDE_OPTIONS: { label: string; value: AnswerSide; color: string }[] = [
  { label: '찬성', value: 'pro', color: '#27AE60' },
  { label: '반대', value: 'con', color: '#E74C3C' },
  { label: '중립', value: 'neutral', color: '#7F8C8D' },
];

export default function TopicDetailScreen({ route, navigation }: Props) {
  const { topicId } = route.params;
  const insets = useSafeAreaInsets();
  const { firebaseUser, userProfile } = useAuthStore();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddAnswer, setShowAddAnswer] = useState(false);
  const [topicIsLiked, setTopicIsLiked] = useState(false);
  const [topicLikeCount, setTopicLikeCount] = useState(0);
  const [sideFilter, setSideFilter] = useState<'all' | AnswerSide>('all');
  const [sortBy, setSortBy] = useState<'likes' | 'date'>('likes');
  const [selectedSubQuestion, setSelectedSubQuestion] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<AnswerSide | null>(null);
  const [voteCounts, setVoteCounts] = useState({ proCount: 0, conCount: 0, neutralCount: 0 });

  const load = useCallback(async () => {
    setIsLoading(true);
    const uid = firebaseUser?.uid;
    try {
      const [t, ans, liked, vote] = await Promise.all([
        fetchTopic(topicId),
        fetchAnswers(topicId),
        uid ? checkIsLiked(uid, topicId, 'topic') : Promise.resolve(false),
        uid ? fetchVote(uid, topicId) : Promise.resolve(null),
      ]);
      setTopic(t);
      setAnswers(ans);
      setTopicIsLiked(liked);
      setTopicLikeCount(t?.likeCount ?? 0);
      setUserVote(vote);
      setVoteCounts({
        proCount: t?.proCount ?? 0,
        conCount: t?.conCount ?? 0,
        neutralCount: t?.neutralCount ?? 0,
      });
    } catch (e) {
      console.error('발제 상세 로드 실패:', e);
    } finally {
      setIsLoading(false);
    }
  }, [topicId, firebaseUser?.uid]);

  async function handleVote(side: AnswerSide) {
    const uid = firebaseUser?.uid;
    if (!uid) return;
    // optimistic
    const prev = userVote;
    const prevCounts = { ...voteCounts };
    const newVote = prev === side ? null : side;
    setUserVote(newVote);
    setVoteCounts(c => {
      const next = { ...c };
      if (prev) next[`${prev}Count` as keyof typeof next] = Math.max(0, next[`${prev}Count` as keyof typeof next] - 1);
      if (newVote) next[`${newVote}Count` as keyof typeof next]++;
      return next;
    });
    try {
      const result = await castVote(uid, topicId, side);
      setUserVote(result.userVote);
      setVoteCounts({ proCount: result.proCount, conCount: result.conCount, neutralCount: result.neutralCount });
    } catch {
      setUserVote(prev);
      setVoteCounts(prevCounts);
    }
  }

  async function handleTopicLike() {
    const uid = firebaseUser?.uid;
    if (!uid) return;
    const prev = topicIsLiked;
    setTopicIsLiked(!prev);
    setTopicLikeCount(c => prev ? c - 1 : c + 1);
    try {
      const result = await toggleLike(uid, topicId, 'topic');
      setTopicIsLiked(result.liked);
      setTopicLikeCount(result.likeCount);
    } catch {
      setTopicIsLiked(prev);
      setTopicLikeCount(c => prev ? c + 1 : c - 1);
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  function handleAnswerAdded(answer: Answer) {
    setAnswers(prev => [answer, ...prev]);
    setTopic(prev => prev ? { ...prev, answerCount: prev.answerCount + 1 } : prev);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3D4DC4" />
      </View>
    );
  }

  if (!topic) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>발제를 찾을 수 없어요.</Text>
      </View>
    );
  }

  const isAgreeDisagree = topic.type === 'agree-disagree';

  const filteredAnswers = answers
    .filter(a => !selectedSubQuestion || a.subQuestionId === selectedSubQuestion)
    .filter(a => !isAgreeDisagree || sideFilter === 'all' || a.side === sideFilter)
    .sort((a, b) =>
      sortBy === 'likes'
        ? (b.likeCount - a.likeCount) || (b.createdAt.toMillis() - a.createdAt.toMillis())
        : b.createdAt.toMillis() - a.createdAt.toMillis()
    );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredAnswers}
        keyExtractor={item => item.answerId}
        renderItem={({ item }) => (
          <AnswerItem
            answer={item}
            uid={firebaseUser?.uid ?? ''}
            displayName={userProfile?.displayName ?? ''}
            subQuestions={topic?.subQuestions}
            onAuthorPress={(userId) => navigation.navigate('UserProfile', { userId })}
          />
        )}
        ListHeaderComponent={
          <>
            <TopicHeader
              topic={topic}
              proCount={voteCounts.proCount}
              conCount={voteCounts.conCount}
              neutralCount={voteCounts.neutralCount}
              answerCount={answers.length}
              userVote={userVote}
              onVote={handleVote}
              isLiked={topicIsLiked}
              likeCount={topicLikeCount}
              onLike={handleTopicLike}
              onBookPress={() =>
                navigation.navigate('BookDetail', {
                  bookId: topic.bookId,
                  title: topic.bookTitle,
                  author: '',
                  publisher: '',
                  cover: fixImageUrl(topic.bookCoverUrl),
                })
              }
              onAuthorPress={() =>
                navigation.navigate('UserProfile', { userId: topic.userId })
              }
            />
            <AnswerControls
              isAgreeDisagree={isAgreeDisagree}
              sideFilter={sideFilter}
              sortBy={sortBy}
              answerCountAll={answers.length}
              answerCountPro={answers.filter(a => a.side === 'pro').length}
              answerCountCon={answers.filter(a => a.side === 'con').length}
              answerCountNeutral={answers.filter(a => a.side === 'neutral').length}
              onSideFilter={setSideFilter}
              onSortBy={setSortBy}
              subQuestions={topic.subQuestions}
              selectedSubQuestion={selectedSubQuestion}
              answers={answers}
              onSelectSubQuestion={setSelectedSubQuestion}
            />
          </>
        }
        ListEmptyComponent={<EmptyAnswers />}
        contentContainerStyle={styles.list}
      />

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.addAnswerBtn}
          onPress={() => setShowAddAnswer(true)}
          accessibilityRole="button"
          accessibilityLabel="답변 작성하기"
        >
          <View style={styles.addAnswerInner}>
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.addAnswerText}>답변 작성하기</Text>
          </View>
        </TouchableOpacity>
      </View>

      <AddAnswerModal
        visible={showAddAnswer}
        topic={topic}
        uid={firebaseUser?.uid ?? ''}
        displayName={userProfile?.displayName ?? ''}
        onClose={() => setShowAddAnswer(false)}
        onAdded={answer => {
          handleAnswerAdded(answer);
          setShowAddAnswer(false);
        }}
      />
    </View>
  );
}

function TopicHeader({
  topic,
  proCount,
  conCount,
  neutralCount,
  answerCount,
  userVote,
  onVote,
  isLiked,
  likeCount,
  onLike,
  onBookPress,
  onAuthorPress,
}: {
  topic: Topic;
  proCount: number;
  conCount: number;
  neutralCount: number;
  answerCount: number;
  userVote: AnswerSide | null;
  onVote: (side: AnswerSide) => void;
  isLiked: boolean;
  likeCount: number;
  onLike: () => void;
  onBookPress: () => void;
  onAuthorPress: () => void;
}) {
  return (
    <View style={styles.header}>
      {/* 작성자 */}
      <TouchableOpacity style={styles.authorRow} onPress={onAuthorPress} activeOpacity={0.7}>
        <View style={styles.authorAvatar}>
          <Text style={styles.authorAvatarText}>
            {(topic.displayName ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.authorName}>{topic.displayName ?? '알 수 없음'}</Text>
        <Text style={styles.metaDate}>{dayjs(topic.createdAt.toDate()).format('YYYY.MM.DD')}</Text>
      </TouchableOpacity>

      {/* 책 미니카드 (클릭 가능) */}
      {(topic.bookCoverUrl || topic.bookTitle) && (
        <TouchableOpacity style={styles.bookCard} onPress={onBookPress} activeOpacity={0.7}>
          {topic.bookCoverUrl ? (
            <Image source={{ uri: fixImageUrl(topic.bookCoverUrl) }} style={styles.bookCover} resizeMode="cover" />
          ) : null}
          <Text style={styles.bookCardTitle} numberOfLines={2}>{topic.bookTitle}</Text>
          <Text style={styles.bookArrow}>›</Text>
        </TouchableOpacity>
      )}

      <View style={styles.headerBadges}>
        <Text style={[styles.typeBadge, topic.type === 'agree-disagree' && styles.typeBadgeAgree]}>
          {topic.type === 'agree-disagree' ? '찬반' : '자유'}
        </Text>
        {topic.clubId && <Text style={styles.clubBadge}>모임 발제</Text>}
      </View>
      <Text style={styles.topicTitle}>{topic.title}</Text>

      {/* 인용 — 제목 아래, 본문 위 */}
      {topic.references?.filter(r => r.type === 'quote' && r.quote).map(ref => (
        <View key={ref.id} style={styles.quoteBlock}>
          <View style={styles.quoteAccentBar} />
          <View style={styles.quoteInner}>
            <Text style={styles.quoteText}>"{ref.quote!.text}"</Text>
            {ref.quote!.page && <Text style={styles.quotePage}>— p.{ref.quote!.page}</Text>}
          </View>
        </View>
      ))}

      <Text style={styles.topicBody}>{topic.body}</Text>

      {/* 링크 — 미니멀 인라인 출처 표기 */}
      {topic.references?.filter(r => r.type === 'link' && r.link).map(ref => {
        const domain = ref.link!.url.replace(/^https?:\/\//, '').split('/')[0];
        return (
          <TouchableOpacity key={ref.id} style={styles.linkInline} onPress={() => Linking.openURL(ref.link!.url)} activeOpacity={0.7}>
            <Ionicons name="link-outline" size={12} color="#9E9E9E" />
            <Text style={styles.linkInlineText}>{ref.link!.title || domain}</Text>
          </TouchableOpacity>
        );
      })}

      {/* 세부 질문 섹션 */}
      {topic.subQuestions && topic.subQuestions.length > 0 && (
        <View style={styles.subQSection}>
          <View style={styles.subQDivider} />
          <Text style={styles.subQSectionLabel}>세부 질문</Text>
          {topic.subQuestions.map((q, i) => (
            <View key={q.id} style={styles.subQListItem}>
              <Text style={styles.subQListNum}>{i + 1}.</Text>
              <Text style={styles.subQListText}>{q.text}</Text>
            </View>
          ))}
        </View>
      )}

      {topic.type === 'agree-disagree' && (
        <>
          {/* 투표 버튼 */}
          <View style={styles.voteButtons}>
            {SIDE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.voteBtn,
                  { borderColor: opt.color },
                  userVote === opt.value && { backgroundColor: opt.color },
                ]}
                onPress={() => onVote(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.voteBtnText, { color: userVote === opt.value ? '#fff' : opt.color }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* 투표 집계 바 */}
          <StanceProgressBar
            proCount={proCount}
            conCount={conCount}
            neutralCount={neutralCount}
          />
        </>
      )}

      <View style={styles.headerMeta}>
        <View style={styles.metaRow}>
          <Ionicons name="chatbubble-outline" size={13} color="#767676" />
          <Text style={styles.metaText}>답변 {answerCount}개</Text>
        </View>
        <TouchableOpacity style={styles.metaRow} onPress={onLike} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={14} color={isLiked ? '#E74C3C' : '#767676'} />
          <Text style={[styles.metaText, isLiked && { color: '#E74C3C' }]}>{likeCount}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>답변</Text>
    </View>
  );
}

function AnswerItem({
  answer,
  uid,
  displayName,
  subQuestions,
  onAuthorPress,
}: {
  answer: Answer;
  uid: string;
  displayName: string;
  subQuestions?: SubQuestion[];
  onAuthorPress: (userId: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [answerIsLiked, setAnswerIsLiked] = useState(false);
  const [answerLikeCount, setAnswerLikeCount] = useState(answer.likeCount);

  useEffect(() => {
    if (!uid) return;
    checkIsLiked(uid, answer.answerId, 'answer').then(setAnswerIsLiked);
  }, [uid, answer.answerId]);

  async function handleAnswerLike() {
    if (!uid) return;
    const prev = answerIsLiked;
    setAnswerIsLiked(!prev);
    setAnswerLikeCount(c => prev ? c - 1 : c + 1);
    try {
      const result = await toggleLike(uid, answer.answerId, 'answer');
      setAnswerIsLiked(result.liked);
      setAnswerLikeCount(result.likeCount);
    } catch {
      setAnswerIsLiked(prev);
      setAnswerLikeCount(c => prev ? c + 1 : c - 1);
    }
  }

  async function handleShowReplies() {
    if (!showReplies && replies.length === 0) {
      setReplyLoading(true);
      try {
        const r = await fetchReplies(answer.answerId);
        setReplies(r);
      } catch (e) {
        console.error('답글 로드 실패:', e);
      } finally {
        setReplyLoading(false);
      }
    }
    setShowReplies(v => !v);
  }

  async function handleAddReply() {
    if (!replyInput.trim() || !uid) return;
    setSubmitting(true);
    try {
      const r = await addReply(answer.answerId, uid, displayName, replyInput.trim());
      setReplies(prev => [...prev, r]);
      setReplyInput('');
    } catch (e) {
      Alert.alert('오류', '답글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  const sideInfo = SIDE_OPTIONS.find(s => s.value === answer.side);
  const linkedQuestion = answer.subQuestionId
    ? subQuestions?.find(q => q.id === answer.subQuestionId)
    : null;

  return (
    <View style={styles.answerCard}>
      <View style={styles.answerHeader}>
        <TouchableOpacity
          style={styles.answerAuthorRow}
          activeOpacity={0.7}
          onPress={() => onAuthorPress(answer.userId)}
          accessibilityRole="button"
          accessibilityLabel={`${answer.displayName ?? '사용자'} 프로필 보기`}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.answerAvatar}>
            <Text style={styles.answerAvatarText}>
              {(answer.displayName ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.answerAuthorName}>{answer.displayName ?? '알 수 없음'}</Text>
        </TouchableOpacity>
        {sideInfo && (
          <Text style={[styles.sideBadge, { color: sideInfo.color, borderColor: sideInfo.color }]}>
            {sideInfo.label}
          </Text>
        )}
        <Text style={styles.answerDate}>{dayjs(answer.createdAt.toDate()).format('MM.DD HH:mm')}</Text>
      </View>
      {linkedQuestion && (
        <View style={styles.subQBadge}>
          <Text style={styles.subQBadgeText} numberOfLines={1}>Q{(subQuestions?.findIndex(q => q.id === linkedQuestion.id) ?? 0) + 1}: {linkedQuestion.text}</Text>
        </View>
      )}
      <Text style={styles.answerContent}>{answer.content}</Text>
      <View style={styles.answerActions}>
        <TouchableOpacity style={styles.actionItem} onPress={handleAnswerLike} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={answerIsLiked ? 'heart' : 'heart-outline'} size={14} color={answerIsLiked ? '#E74C3C' : '#767676'} />
          <Text style={[styles.likeText, answerIsLiked && { color: '#E74C3C' }]}>{answerLikeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShowReplies} style={styles.replyToggle}>
          <View style={styles.actionItem}>
            <Ionicons name="chatbubble-outline" size={13} color="#3D4DC4" />
            <Text style={styles.replyToggleText}>
              답글 {showReplies ? '접기' : '보기'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {showReplies && (
        <View style={styles.repliesSection}>
          {replyLoading ? (
            <ActivityIndicator size="small" color="#3D4DC4" style={{ marginVertical: 8 }} />
          ) : (
            replies.map(r => (
              <View key={r.replyId} style={styles.replyItem}>
                <TouchableOpacity
                  style={styles.replyAuthorRow}
                  activeOpacity={0.7}
                  onPress={() => onAuthorPress(r.userId)}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.displayName ?? '사용자'} 프로필 보기`}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <View style={styles.replyAvatar}>
                    <Text style={styles.replyAvatarText}>
                      {(r.displayName ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.replyAuthorName}>{r.displayName ?? '알 수 없음'}</Text>
                </TouchableOpacity>
                <Text style={styles.replyContent}>{r.content}</Text>
                <Text style={styles.replyDate}>{dayjs(r.createdAt.toDate()).format('MM.DD HH:mm')}</Text>
              </View>
            ))
          )}
          {replies.length === 0 && !replyLoading && (
            <Text style={styles.emptyReply}>아직 답글이 없어요.</Text>
          )}
          <View style={styles.replyInputRow}>
            <TextInput
              style={styles.replyInput}
              placeholder="답글 작성..."
              value={replyInput}
              onChangeText={setReplyInput}
              multiline
            />
            <TouchableOpacity
              style={[styles.replySubmit, submitting && styles.buttonDisabled]}
              onPress={handleAddReply}
              disabled={submitting}
            >
              <Text style={styles.replySubmitText}>등록</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function AnswerControls({
  isAgreeDisagree,
  sideFilter,
  sortBy,
  answerCountAll,
  answerCountPro,
  answerCountCon,
  answerCountNeutral,
  onSideFilter,
  onSortBy,
  subQuestions,
  selectedSubQuestion,
  answers,
  onSelectSubQuestion,
}: {
  isAgreeDisagree: boolean;
  sideFilter: 'all' | AnswerSide;
  sortBy: 'likes' | 'date';
  answerCountAll: number;
  answerCountPro: number;
  answerCountCon: number;
  answerCountNeutral: number;
  onSideFilter: (v: 'all' | AnswerSide) => void;
  onSortBy: (v: 'likes' | 'date') => void;
  subQuestions?: SubQuestion[];
  selectedSubQuestion: string | null;
  answers: Answer[];
  onSelectSubQuestion: (id: string | null) => void;
}) {
  const filterOptions: { label: string; value: 'all' | AnswerSide; count: number }[] = [
    { label: '전체', value: 'all', count: answerCountAll },
    { label: '찬성', value: 'pro', count: answerCountPro },
    { label: '반대', value: 'con', count: answerCountCon },
    { label: '중립', value: 'neutral', count: answerCountNeutral },
  ];

  return (
    <View style={styles.controls}>
      {/* 세부 질문 필터 — 자유 발제에서만 표시 */}
      {!isAgreeDisagree && subQuestions && subQuestions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subQRow}
          contentContainerStyle={styles.subQRowContent}
        >
          <TouchableOpacity
            style={[styles.subQChip, selectedSubQuestion === null && styles.subQChipActive]}
            onPress={() => onSelectSubQuestion(null)}
          >
            <Text style={[styles.subQChipText, selectedSubQuestion === null && styles.subQChipTextActive]}>
              전체 ({answers.length})
            </Text>
          </TouchableOpacity>
          {subQuestions.map((q, i) => {
            const count = answers.filter(a => a.subQuestionId === q.id).length;
            const isActive = selectedSubQuestion === q.id;
            return (
              <TouchableOpacity
                key={q.id}
                style={[styles.subQChip, isActive && styles.subQChipActive]}
                onPress={() => onSelectSubQuestion(isActive ? null : q.id)}
              >
                <Text style={[styles.subQChipText, isActive && styles.subQChipTextActive]}>
                  Q{i + 1} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {isAgreeDisagree && (
        <View style={styles.sideFilterRow}>
          {filterOptions.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sideFilterBtn, sideFilter === opt.value && styles.sideFilterBtnActive]}
              onPress={() => onSideFilter(opt.value)}
            >
              <Text style={[styles.sideFilterText, sideFilter === opt.value && styles.sideFilterTextActive]}>
                {opt.label} {opt.count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.sortRow}>
        <TouchableOpacity onPress={() => onSortBy('likes')} style={styles.sortBtn}>
          <Text style={[styles.sortText, sortBy === 'likes' && styles.sortTextActive]}>좋아요순</Text>
        </TouchableOpacity>
        <Text style={styles.sortSep}>·</Text>
        <TouchableOpacity onPress={() => onSortBy('date')} style={styles.sortBtn}>
          <Text style={[styles.sortText, sortBy === 'date' && styles.sortTextActive]}>최신순</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyAnswers() {
  return (
    <View style={styles.emptyAnswers}>
      <Text style={styles.emptyText}>아직 답변이 없어요. 첫 번째 답변을 남겨보세요!</Text>
    </View>
  );
}

function AddAnswerModal({
  visible,
  topic,
  uid,
  displayName,
  onClose,
  onAdded,
}: {
  visible: boolean;
  topic: Topic;
  uid: string;
  displayName: string;
  onClose: () => void;
  onAdded: (answer: Answer) => void;
}) {
  const isAgreeDisagree = topic.type === 'agree-disagree';
  const hasSubQuestions = (topic.subQuestions?.length ?? 0) > 0;
  const [side, setSide] = useState<AnswerSide>(isAgreeDisagree ? 'pro' : 'neutral');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubQuestionId, setSelectedSubQuestionId] = useState<string | null>(null);

  async function handleSubmit() {
    if (!content.trim()) {
      Alert.alert('입력 오류', '답변 내용을 입력해주세요.');
      return;
    }
    if (!uid) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }
    setIsLoading(true);
    try {
      const answer = await addAnswer(
        topic.topicId,
        uid,
        displayName,
        side,
        content.trim(),
        selectedSubQuestionId ?? undefined,
      );
      setContent('');
      setSide(isAgreeDisagree ? 'pro' : 'neutral');
      setSelectedSubQuestionId(null);
      onAdded(answer);
    } catch (e) {
      Alert.alert('오류', '답변 작성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAwareScrollView
          style={styles.modalContainer}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          extraScrollHeight={24}
          enableOnAndroid
        >
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>답변 작성</Text>

          {/* 세부 질문 선택 */}
          {hasSubQuestions && (
            <View style={styles.subQSelector}>
              <Text style={styles.subQSelectorLabel}>어떤 질문에 답변하시나요? <Text style={styles.optional}>(선택)</Text></Text>
              <TouchableOpacity
                style={[styles.subQOption, selectedSubQuestionId === null && styles.subQOptionActive]}
                onPress={() => setSelectedSubQuestionId(null)}
              >
                <Text style={[styles.subQOptionText, selectedSubQuestionId === null && styles.subQOptionTextActive]}>
                  전체 발제에 대한 답변
                </Text>
              </TouchableOpacity>
              {topic.subQuestions!.map((q, i) => (
                <TouchableOpacity
                  key={q.id}
                  style={[styles.subQOption, selectedSubQuestionId === q.id && styles.subQOptionActive]}
                  onPress={() => setSelectedSubQuestionId(q.id)}
                >
                  <Text style={[styles.subQOptionText, selectedSubQuestionId === q.id && styles.subQOptionTextActive]} numberOfLines={2}>
                    Q{i + 1}: {q.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {isAgreeDisagree && (
            <View style={styles.sideSelector}>
              {SIDE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.sideBtn,
                    { borderColor: opt.color },
                    side === opt.value && { backgroundColor: opt.color },
                  ]}
                  onPress={() => setSide(opt.value)}
                >
                  <Text style={[styles.sideBtnText, side === opt.value && styles.sideBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TextInput
            style={styles.contentInput}
            placeholder="답변 내용을 입력하세요..."
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.confirmText}>{isLoading ? '등록 중...' : '등록'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#767676' },
  list: { paddingBottom: 80 },

  // Header
  header: { backgroundColor: '#fff', padding: 20, marginBottom: 8 },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  authorAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#3D4DC4', justifyContent: 'center', alignItems: 'center',
  },
  authorAvatarText: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  authorName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#424242' },
  metaDate: { fontSize: 12, color: '#767676' },

  bookCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8F8F8', borderRadius: 8, padding: 10,
    marginBottom: 16, borderWidth: 1, borderColor: '#F0F0F0',
  },
  bookCover: { width: 36, height: 52, borderRadius: 3 },
  bookCardTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: '#424242', lineHeight: 18 },
  bookArrow: { fontSize: 18, color: '#BDBDBD' },

  headerBadges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBadge: {
    fontSize: 12, color: '#3D4DC4', backgroundColor: '#ECEFFE',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4, overflow: 'hidden',
  },
  typeBadgeAgree: { color: '#E67E22', backgroundColor: '#FEF0E7' },
  clubBadge: {
    fontSize: 12, color: '#27AE60', backgroundColor: '#E9F7EF',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4, overflow: 'hidden',
  },
  topicTitle: { fontSize: 20, fontWeight: '700', color: '#212121', marginBottom: 10, lineHeight: 28 },
  topicBody: { fontSize: 15, color: '#424242', lineHeight: 22, marginBottom: 14 },
  headerMeta: { flexDirection: 'row', gap: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, color: '#767676' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#424242' },

  // Vote buttons
  voteButtons: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  voteBtn: {
    flex: 1, height: 40, borderWidth: 1.5, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  voteBtnText: { fontSize: 14, fontWeight: '600' },

  // Answer controls
  controls: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 8,
  },
  sideFilterRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  sideFilterBtn: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 16, backgroundColor: '#F5F5F5',
  },
  sideFilterBtnActive: { backgroundColor: '#3D4DC4' },
  sideFilterText: { fontSize: 13, color: '#757575' },
  sideFilterTextActive: { color: '#fff', fontWeight: '600' },
  sortRow: { flexDirection: 'row', alignItems: 'center' },
  sortBtn: { paddingVertical: 2, paddingHorizontal: 4 },
  sortText: { fontSize: 13, color: '#BDBDBD' },
  sortTextActive: { color: '#3D4DC4', fontWeight: '600' },
  sortSep: { fontSize: 13, color: '#E0E0E0', marginHorizontal: 4 },

  // Answer card
  answerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  answerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  answerAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  answerAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#3D4DC4', justifyContent: 'center', alignItems: 'center',
  },
  answerAvatarText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
  answerAuthorName: { fontSize: 13, fontWeight: '600', color: '#424242' },
  sideBadge: {
    fontSize: 12, fontWeight: '600', borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },
  answerDate: { fontSize: 12, color: '#767676' },
  answerContent: { fontSize: 15, color: '#212121', lineHeight: 22, marginBottom: 12 },
  answerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeText: { fontSize: 13, color: '#767676' },
  replyToggle: { marginLeft: 'auto' },
  replyToggleText: { fontSize: 13, color: '#3D4DC4' },

  // Replies
  repliesSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  replyItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  replyAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  replyAvatar: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#616161', justifyContent: 'center', alignItems: 'center',
  },
  replyAvatarText: { fontSize: 9, fontWeight: 'bold', color: '#fff' },
  replyAuthorName: { fontSize: 12, fontWeight: '600', color: '#616161' },
  replyContent: { fontSize: 14, color: '#424242', lineHeight: 20 },
  replyDate: { fontSize: 11, color: '#BDBDBD', marginTop: 4 },
  emptyReply: { fontSize: 13, color: '#767676', textAlign: 'center', paddingVertical: 8 },
  replyInputRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'flex-end' },
  replyInput: {
    flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, maxHeight: 80,
  },
  replySubmit: {
    backgroundColor: '#3D4DC4', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 8, justifyContent: 'center',
  },
  replySubmitText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Empty
  emptyAnswers: { paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 15, color: '#767676', textAlign: 'center', lineHeight: 22 },

  // Bottom bar
  bottomBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  addAnswerBtn: {
    backgroundColor: '#3D4DC4',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAnswerInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addAnswerText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#212121', marginBottom: 20 },
  sideSelector: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  sideBtn: {
    flex: 1, height: 48, borderWidth: 1.5, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  sideBtnText: { fontSize: 14, fontWeight: '600', color: '#757575' },
  sideBtnTextActive: { color: '#fff' },
  contentInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
    height: 120, marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, height: 48, borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  cancelText: { fontSize: 15, color: '#757575' },
  confirmBtn: {
    flex: 1, height: 48, backgroundColor: '#3D4DC4',
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#9BA5E0' },
  confirmText: { fontSize: 15, color: '#fff', fontWeight: '600' },

  // References — inline quote (between title and body)
  quoteBlock: { flexDirection: 'row', marginBottom: 12 },
  quoteAccentBar: { width: 3, borderRadius: 2, backgroundColor: '#BDBDBD', marginRight: 12 },
  quoteInner: { flex: 1 },
  quoteText: { fontSize: 14, fontStyle: 'italic', color: '#616161', lineHeight: 21 },
  quotePage: { fontSize: 12, color: '#BDBDBD', marginTop: 4 },

  // Links — minimal inline footnote (below body)
  linkInline: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, marginBottom: 4 },
  linkInlineText: { fontSize: 12, color: '#9E9E9E', textDecorationLine: 'underline' },

  // Sub-question list in topic header (below all content)
  subQSection: { marginTop: 16, marginBottom: 4 },
  subQDivider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 14 },
  subQSectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9E9E9E',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
  },
  subQListItem: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  subQListNum: { fontSize: 14, fontWeight: '700', color: '#3D4DC4', minWidth: 18 },
  subQListText: { flex: 1, fontSize: 14, color: '#212121', lineHeight: 21 },


  // Sub-question chips
  subQRow: { marginBottom: 8 },
  subQRowContent: { paddingVertical: 4, gap: 8, flexDirection: 'row' },
  subQChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1.5, borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  subQChipActive: { borderColor: '#3D4DC4', backgroundColor: '#ECEFFE' },
  subQChipText: { fontSize: 13, color: '#767676' },
  subQChipTextActive: { color: '#3D4DC4', fontWeight: '600' },

  // Sub-question badge on answer card
  subQBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF2FB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    maxWidth: '90%',
  },
  subQBadgeText: { fontSize: 12, color: '#3D72A4', fontWeight: '600' },

  // AddAnswerModal sub-question selector
  subQSelector: { marginBottom: 16 },
  subQSelectorLabel: { fontSize: 13, fontWeight: '600', color: '#424242', marginBottom: 8 },
  optional: { fontSize: 12, fontWeight: '400', color: '#9E9E9E' },
  subQOption: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0',
    marginBottom: 6, backgroundColor: '#fff',
  },
  subQOptionActive: { borderColor: '#3D4DC4', backgroundColor: '#ECEFFE' },
  subQOptionText: { fontSize: 13, color: '#424242', lineHeight: 18 },
  subQOptionTextActive: { color: '#3D4DC4', fontWeight: '600' },
});
