import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { ClubStackParamList } from '@/navigation/ClubStackNavigator';
import { fetchTopic } from '@/services/firebase/topics';
import { fetchClubAnswers, addClubAnswer, toggleClubAnswerLike } from '@/services/firebase/clubAnswers';
import { fetchVote, castVote } from '@/services/firebase/votes';
import { useAuthStore } from '@/stores/authStore';
import { Topic, ClubAnswer, AnswerSide } from '@/types';

type Props = NativeStackScreenProps<ClubStackParamList, 'ClubTopicDetail'>;

export default function ClubTopicDetailScreen({ route }: Props) {
  const { topicId, clubId } = route.params;
  const { firebaseUser, userProfile } = useAuthStore();
  const uid = firebaseUser?.uid ?? '';

  const [topic, setTopic] = useState<Topic | null>(null);
  const [answers, setAnswers] = useState<ClubAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userVote, setUserVote] = useState<AnswerSide | null>(null);
  const [voteCounts, setVoteCounts] = useState({ proCount: 0, conCount: 0, neutralCount: 0 });

  const [answerText, setAnswerText] = useState('');
  const [selectedSide, setSelectedSide] = useState<AnswerSide>('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAgreeDisagree = topic?.type === 'agree-disagree';

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [t, ans, vote] = await Promise.all([
        fetchTopic(topicId),
        fetchClubAnswers(topicId, clubId),
        uid ? fetchVote(uid, topicId) : Promise.resolve(null),
      ]);
      setTopic(t);
      setAnswers(ans);
      setUserVote(vote);
      setVoteCounts({
        proCount: t?.proCount ?? 0,
        conCount: t?.conCount ?? 0,
        neutralCount: t?.neutralCount ?? 0,
      });
    } catch (e) {
      console.error('모임 발제 로드 실패:', e);
    } finally {
      setIsLoading(false);
    }
  }, [topicId, clubId, uid]);

  useEffect(() => { load(); }, [load]);

  async function handleVote(side: AnswerSide) {
    if (!uid) return;
    try {
      const result = await castVote(uid, topicId, side);
      setUserVote(result.userVote);
      setVoteCounts({ proCount: result.proCount, conCount: result.conCount, neutralCount: result.neutralCount });
    } catch {
      Alert.alert('오류', '투표에 실패했습니다.');
    }
  }

  async function handleSubmitAnswer() {
    if (!answerText.trim()) {
      Alert.alert('입력 오류', '답변 내용을 입력해주세요.');
      return;
    }
    if (!uid || !userProfile) return;
    setIsSubmitting(true);
    try {
      const answer = await addClubAnswer({
        clubId,
        topicId,
        userId: uid,
        displayName: userProfile.displayName,
        side: isAgreeDisagree ? selectedSide : 'neutral',
        content: answerText.trim(),
      });
      setAnswers(prev => [answer, ...prev]);
      setAnswerText('');
    } catch {
      Alert.alert('오류', '답변 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLike(answer: ClubAnswer) {
    if (!uid) return;
    const prev = answer.likeCount;
    setAnswers(as =>
      as.map(a => a.clubAnswerId === answer.clubAnswerId
        ? { ...a, likeCount: a.likeCount + 1 }
        : a
      )
    );
    try {
      const result = await toggleClubAnswerLike(uid, answer.clubAnswerId);
      setAnswers(as =>
        as.map(a => a.clubAnswerId === answer.clubAnswerId
          ? { ...a, likeCount: result.likeCount }
          : a
        )
      );
    } catch {
      setAnswers(as =>
        as.map(a => a.clubAnswerId === answer.clubAnswerId
          ? { ...a, likeCount: prev }
          : a
        )
      );
    }
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

  const totalVotes = voteCounts.proCount + voteCounts.conCount + voteCounts.neutralCount;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <FlatList
        data={answers}
        keyExtractor={item => item.clubAnswerId}
        renderItem={({ item }) => (
          <View style={styles.answerCard}>
            <View style={styles.answerHeader}>
              <View style={styles.authorAvatar}>
                <Text style={styles.authorAvatarText}>
                  {(item.displayName ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.authorName}>{item.displayName ?? '익명'}</Text>
              {isAgreeDisagree && (
                <Text style={[
                  styles.sideBadge,
                  item.side === 'pro' && styles.sidePro,
                  item.side === 'con' && styles.sideCon,
                ]}>
                  {item.side === 'pro' ? '찬성' : item.side === 'con' ? '반대' : '중립'}
                </Text>
              )}
              <Text style={styles.answerDate}>
                {dayjs(item.createdAt.toDate()).format('MM.DD HH:mm')}
              </Text>
            </View>
            <Text style={styles.answerContent}>{item.content}</Text>
            <TouchableOpacity style={styles.likeRow} onPress={() => handleLike(item)}>
              <Ionicons name="heart-outline" size={14} color="#767676" />
              <Text style={styles.likeCount}>{item.likeCount}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListHeaderComponent={
          <View>
            {/* 모임 전용 뱃지 */}
            <View style={styles.clubBadgeRow}>
              <Ionicons name="lock-closed-outline" size={13} color="#3D4DC4" />
              <Text style={styles.clubBadgeText}>모임 전용 토론</Text>
            </View>

            {/* 발제 내용 */}
            <View style={styles.topicCard}>
              <Text style={[styles.typeBadge, isAgreeDisagree && styles.typeBadgeAgree]}>
                {isAgreeDisagree ? '찬반' : '자유'}
              </Text>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Text style={styles.topicBody}>{topic.body}</Text>
              <Text style={styles.topicDate}>
                {dayjs(topic.createdAt.toDate()).format('YYYY.MM.DD')} · {topic.displayName}
              </Text>
            </View>

            {/* 찬반 투표 */}
            {isAgreeDisagree && (
              <View style={styles.voteSection}>
                <Text style={styles.voteTitle}>내 의견</Text>
                <View style={styles.voteButtons}>
                  {(['pro', 'con', 'neutral'] as AnswerSide[]).map(side => (
                    <TouchableOpacity
                      key={side}
                      style={[styles.voteBtn, userVote === side && styles.voteBtnActive]}
                      onPress={() => handleVote(side)}
                    >
                      <Text style={[styles.voteBtnText, userVote === side && styles.voteBtnTextActive]}>
                        {side === 'pro' ? `찬성 ${voteCounts.proCount}`
                          : side === 'con' ? `반대 ${voteCounts.conCount}`
                          : `중립 ${voteCounts.neutralCount}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {totalVotes > 0 && (
                  <Text style={styles.voteSummary}>총 {totalVotes}명 투표</Text>
                )}
              </View>
            )}

            <Text style={styles.answerSectionTitle}>답변 {answers.length}개</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyAnswers}>
            <Text style={styles.emptyText}>아직 답변이 없어요. 첫 번째로 답변해보세요!</Text>
          </View>
        }
      />

      {/* 답변 입력 */}
      <View style={styles.inputArea}>
        {isAgreeDisagree && (
          <View style={styles.sideSelector}>
            {(['pro', 'con', 'neutral'] as AnswerSide[]).map(side => (
              <TouchableOpacity
                key={side}
                style={[styles.sideSelectorBtn, selectedSide === side && styles.sideSelectorBtnActive]}
                onPress={() => setSelectedSide(side)}
              >
                <Text style={[styles.sideSelectorText, selectedSide === side && styles.sideSelectorTextActive]}>
                  {side === 'pro' ? '찬성' : side === 'con' ? '반대' : '중립'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.answerInput}
            placeholder="답변을 입력하세요..."
            value={answerText}
            onChangeText={setAnswerText}
            multiline
          />
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmitAnswer}
            disabled={isSubmitting}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#767676' },
  list: { padding: 16, gap: 12, paddingBottom: 8 },

  clubBadgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ECEFFE', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12,
  },
  clubBadgeText: { fontSize: 12, color: '#3D4DC4', fontWeight: '600' },

  topicCard: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#F0F0F0', gap: 8, marginBottom: 12,
  },
  typeBadge: {
    alignSelf: 'flex-start', fontSize: 11, color: '#3D4DC4',
    backgroundColor: '#ECEFFE', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4, overflow: 'hidden',
  },
  typeBadgeAgree: { color: '#E67E22', backgroundColor: '#FEF0E7' },
  topicTitle: { fontSize: 17, fontWeight: '700', color: '#212121' },
  topicBody: { fontSize: 14, color: '#424242', lineHeight: 21 },
  topicDate: { fontSize: 12, color: '#9E9E9E' },

  voteSection: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#F0F0F0', marginBottom: 12, gap: 10,
  },
  voteTitle: { fontSize: 14, fontWeight: '600', color: '#424242' },
  voteButtons: { flexDirection: 'row', gap: 8 },
  voteBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#E0E0E0', alignItems: 'center',
  },
  voteBtnActive: { borderColor: '#3D4DC4', backgroundColor: '#ECEFFE' },
  voteBtnText: { fontSize: 13, color: '#767676', fontWeight: '600' },
  voteBtnTextActive: { color: '#3D4DC4' },
  voteSummary: { fontSize: 12, color: '#9E9E9E', textAlign: 'center' },

  answerSectionTitle: {
    fontSize: 15, fontWeight: '700', color: '#212121', marginBottom: 4,
  },

  answerCard: {
    backgroundColor: '#fff', padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#F0F0F0', gap: 8,
  },
  answerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#3D4DC4', justifyContent: 'center', alignItems: 'center',
  },
  authorAvatarText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  authorName: { fontSize: 13, fontWeight: '600', color: '#424242', flex: 1 },
  sideBadge: {
    fontSize: 11, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, overflow: 'hidden',
    backgroundColor: '#F5F5F5', color: '#767676',
  },
  sidePro: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  sideCon: { backgroundColor: '#FFEBEE', color: '#C62828' },
  answerDate: { fontSize: 11, color: '#BDBDBD' },
  answerContent: { fontSize: 14, color: '#424242', lineHeight: 20 },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  likeCount: { fontSize: 12, color: '#767676' },

  emptyAnswers: { paddingTop: 20, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9E9E9E' },

  inputArea: {
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0',
    padding: 12, gap: 8,
  },
  sideSelector: { flexDirection: 'row', gap: 8 },
  sideSelectorBtn: {
    flex: 1, paddingVertical: 6, borderRadius: 6,
    borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center',
  },
  sideSelectorBtnActive: { borderColor: '#3D4DC4', backgroundColor: '#ECEFFE' },
  sideSelectorText: { fontSize: 12, color: '#767676', fontWeight: '600' },
  sideSelectorTextActive: { color: '#3D4DC4' },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  answerInput: {
    flex: 1, minHeight: 40, maxHeight: 100, borderWidth: 1,
    borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 8, fontSize: 14, textAlignVertical: 'top',
  },
  submitBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#3D4DC4', justifyContent: 'center', alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#9BA5E0' },
});
