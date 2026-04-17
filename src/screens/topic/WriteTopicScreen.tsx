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
  Switch,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { nanoid } from 'nanoid/non-secure';
import { useAuthStore } from '@/stores/authStore';
import { createTopic } from '@/services/firebase/topics';
import { saveBook } from '@/services/firebase/books';
import { addTopicToClub } from '@/services/firebase/clubs';
import { TopicType, TopicReference, SubQuestion } from '@/types';

type WriteTopicParams = { bookId: string; bookTitle: string; bookCoverUrl: string; clubId?: string };

export default function WriteTopicScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ WriteTopic: WriteTopicParams }, 'WriteTopic'>>();
  const { bookId, bookTitle, bookCoverUrl, clubId } = route.params;
  const { userProfile, firebaseUser } = useAuthStore();

  const [type, setType] = useState<TopicType>('free');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 참고 자료
  const [references, setReferences] = useState<TopicReference[]>([]);
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [quotePage, setQuotePage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // 찬반 레이블
  const [proLabel, setProLabel] = useState('');
  const [conLabel, setConLabel] = useState('');

  // 스포일러
  const [hasSpoiler, setHasSpoiler] = useState(false);

  // 세부 질문
  const [subQuestions, setSubQuestions] = useState<SubQuestion[]>([]);
  const [showQuestionInput, setShowQuestionInput] = useState(false);
  const [questionText, setQuestionText] = useState('');

  const insets = useSafeAreaInsets();
  const maxQuestions = type === 'agree-disagree' ? 1 : 5;
  const canSubmit = title.trim().length >= 5 && body.trim().length >= 10 && subQuestions.length >= 1;

  // ── 참고 자료 추가 ──────────────────────────────────

  function addQuote() {
    if (!quoteText.trim()) return;
    const ref: TopicReference = {
      id: nanoid(),
      type: 'quote',
      quote: { text: quoteText.trim(), page: quotePage ? parseInt(quotePage, 10) : undefined },
      order: references.length,
    };
    setReferences(prev => [...prev, ref]);
    setQuoteText('');
    setQuotePage('');
    setShowQuoteInput(false);
  }

  function addLink() {
    const url = linkUrl.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert('올바른 URL을 입력해주세요.', 'http:// 또는 https://로 시작해야 합니다.');
      return;
    }
    const ref: TopicReference = {
      id: nanoid(),
      type: 'link',
      link: { url, title: linkTitle.trim() || undefined },
      order: references.length,
    };
    setReferences(prev => [...prev, ref]);
    setLinkUrl('');
    setLinkTitle('');
    setShowLinkInput(false);
  }

  function removeReference(id: string) {
    setReferences(prev => prev.filter(r => r.id !== id));
  }

  // ── 세부 질문 추가 ──────────────────────────────────

  function addQuestion() {
    if (questionText.trim().length < 5) return;
    if (subQuestions.length >= maxQuestions) return;
    const q: SubQuestion = { id: nanoid(), text: questionText.trim(), order: subQuestions.length };
    setSubQuestions(prev => [...prev, q]);
    setQuestionText('');
    setShowQuestionInput(false);
  }

  function removeQuestion(id: string) {
    setSubQuestions(prev => prev.filter(q => q.id !== id));
  }

  // ── 발제 등록 ───────────────────────────────────────

  const handleSubmit = async () => {
    if (!firebaseUser || !userProfile) return;
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      await saveBook({ isbn13: bookId, title: bookTitle, author: '', cover: bookCoverUrl, publisher: '', itemId: 0, description: '' });

      const topic = await createTopic({
        bookId,
        bookTitle,
        bookCoverUrl,
        userId: firebaseUser.uid,
        displayName: userProfile.displayName,
        type,
        title: title.trim(),
        body: body.trim(),
        references,
        subQuestions,
        ...(clubId ? { clubId } : {}),
        ...(type === 'agree-disagree' && proLabel.trim() ? { proLabel: proLabel.trim() } : {}),
        ...(type === 'agree-disagree' && conLabel.trim() ? { conLabel: conLabel.trim() } : {}),
        ...(hasSpoiler ? { hasSpoiler: true } : {}),
      });

      if (clubId) {
        await addTopicToClub(clubId, topic);
      }

      navigation.goBack();
    } catch (e) {
      console.error('발제 작성 실패:', e);
      Alert.alert('오류', '발제 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
      extraScrollHeight={24}
      enableOnAndroid
    >
        {/* 책 헤더 */}
        <View style={styles.bookHeader}>
          <Image source={{ uri: bookCoverUrl }} style={styles.cover} resizeMode="cover" />
          <View style={styles.bookMeta}>
            <Text style={styles.bookTitle} numberOfLines={3}>{bookTitle}</Text>
          </View>
        </View>

        {/* 발제 타입 */}
        <View style={styles.section}>
          <Text style={styles.label}>발제 유형</Text>
          <View style={styles.typeRow}>
            {(['free', 'agree-disagree'] as TopicType[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                onPress={() => {
                  setType(t);
                  if (t === 'agree-disagree') setSubQuestions(prev => prev.slice(0, 1));
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                  {t === 'free' ? '자유 발제' : '찬반 발제'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 찬반 레이블 커스텀 */}
        {type === 'agree-disagree' && (
          <View style={styles.section}>
            <Text style={styles.label}>선택지 이름 <Text style={styles.optional}>(선택, 기본값: 찬성 / 반대)</Text></Text>
            <View style={styles.labelRow}>
              <TextInput
                style={[styles.titleInput, { flex: 1 }]}
                placeholder="찬성 측 이름"
                placeholderTextColor="#BDBDBD"
                value={proLabel}
                onChangeText={setProLabel}
                maxLength={20}
              />
              <TextInput
                style={[styles.titleInput, { flex: 1 }]}
                placeholder="반대 측 이름"
                placeholderTextColor="#BDBDBD"
                value={conLabel}
                onChangeText={setConLabel}
                maxLength={20}
              />
            </View>
          </View>
        )}

        {/* 제목 */}
        <View style={styles.section}>
          <Text style={styles.label}>제목</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="발제 제목을 입력하세요. (5자 이상)"
            placeholderTextColor="#BDBDBD"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* 본문 */}
        <View style={styles.section}>
          <Text style={styles.label}>내용</Text>
          <TextInput
            style={styles.bodyInput}
            placeholder="발제 내용을 자유롭게 작성해주세요. (10자 이상)"
            placeholderTextColor="#BDBDBD"
            multiline
            value={body}
            onChangeText={setBody}
            textAlignVertical="top"
          />
        </View>

        {/* 참고 자료 */}
        <View style={styles.section}>
          <Text style={styles.label}>참고 자료 <Text style={styles.optional}>(선택)</Text></Text>

          {/* 추가된 참고 자료 목록 */}
          {references.map(ref => (
            <View key={ref.id} style={styles.refCard}>
              {ref.type === 'quote' && (
                <View style={styles.refQuoteInner}>
                  <Text style={styles.refQuoteText}>&ldquo;{ref.quote?.text}&rdquo;</Text>
                  {ref.quote?.page && <Text style={styles.refQuotePage}>— p.{ref.quote.page}</Text>}
                </View>
              )}
              {ref.type === 'link' && (
                <View style={styles.refLinkInner}>
                  <Text style={styles.refLinkIcon}>🔗</Text>
                  <View style={{ flex: 1 }}>
                    {ref.link?.title ? <Text style={styles.refLinkTitle} numberOfLines={1}>{ref.link.title}</Text> : null}
                    <Text style={styles.refLinkUrl} numberOfLines={1}>{ref.link?.url}</Text>
                  </View>
                </View>
              )}
              <TouchableOpacity style={styles.refDeleteBtn} onPress={() => removeReference(ref.id)}>
                <Text style={styles.refDeleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* 인용 입력 */}
          {showQuoteInput && (
            <View style={styles.inputBox}>
              <TextInput
                style={[styles.bodyInput, { minHeight: 72 }]}
                placeholder="인용할 내용을 입력하세요."
                placeholderTextColor="#BDBDBD"
                multiline
                value={quoteText}
                onChangeText={setQuoteText}
                textAlignVertical="top"
              />
              <TextInput
                style={[styles.titleInput, { marginTop: 8 }]}
                placeholder="페이지 번호 (선택)"
                placeholderTextColor="#BDBDBD"
                keyboardType="number-pad"
                value={quotePage}
                onChangeText={setQuotePage}
              />
              <View style={styles.inputBtnRow}>
                <TouchableOpacity onPress={() => setShowQuoteInput(false)} style={styles.inputCancelBtn}>
                  <Text style={styles.inputCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={addQuote} style={styles.inputConfirmBtn} disabled={!quoteText.trim()}>
                  <Text style={styles.inputConfirmText}>추가</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 링크 입력 */}
          {showLinkInput && (
            <View style={styles.inputBox}>
              <TextInput
                style={styles.titleInput}
                placeholder="URL (https://...)"
                placeholderTextColor="#BDBDBD"
                keyboardType="url"
                autoCapitalize="none"
                value={linkUrl}
                onChangeText={setLinkUrl}
              />
              <TextInput
                style={[styles.titleInput, { marginTop: 8 }]}
                placeholder="제목 (선택)"
                placeholderTextColor="#BDBDBD"
                value={linkTitle}
                onChangeText={setLinkTitle}
              />
              <View style={styles.inputBtnRow}>
                <TouchableOpacity onPress={() => setShowLinkInput(false)} style={styles.inputCancelBtn}>
                  <Text style={styles.inputCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={addLink} style={styles.inputConfirmBtn} disabled={!linkUrl.trim()}>
                  <Text style={styles.inputConfirmText}>추가</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 버튼 행 */}
          {!showQuoteInput && !showLinkInput && references.length < 10 && (
            <View style={styles.refBtnRow}>
              <TouchableOpacity style={styles.refAddBtn} onPress={() => setShowQuoteInput(true)}>
                <Text style={styles.refAddBtnText}>+ 책 인용</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.refAddBtn} onPress={() => setShowLinkInput(true)}>
                <Text style={styles.refAddBtnText}>+ 링크</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 세부 질문 */}
        <View style={styles.section}>
          <Text style={styles.label}>세부 질문 <Text style={styles.optional}>(필수{type === 'agree-disagree' ? ', 1개' : ', 최대 5개'})</Text></Text>

          {subQuestions.map((q, i) => (
            <View key={q.id} style={styles.questionRow}>
              <Text style={styles.questionNum}>{i + 1}.</Text>
              <Text style={styles.questionText}>{q.text}</Text>
              <TouchableOpacity onPress={() => removeQuestion(q.id)} style={styles.refDeleteBtn}>
                <Text style={styles.refDeleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {showQuestionInput && (
            <View style={styles.inputBox}>
              <TextInput
                style={styles.questionInput}
                placeholder="질문을 입력하세요. (5자 이상)"
                placeholderTextColor="#BDBDBD"
                value={questionText}
                onChangeText={setQuestionText}
                maxLength={200}
                multiline
                scrollEnabled={false}
              />
              <View style={styles.inputBtnRow}>
                <TouchableOpacity onPress={() => setShowQuestionInput(false)} style={styles.inputCancelBtn}>
                  <Text style={styles.inputCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={addQuestion}
                  style={styles.inputConfirmBtn}
                  disabled={questionText.trim().length < 5}
                >
                  <Text style={styles.inputConfirmText}>추가</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!showQuestionInput && subQuestions.length < maxQuestions && (
            <TouchableOpacity style={[styles.refAddBtn, { alignSelf: 'flex-start' }]} onPress={() => setShowQuestionInput(true)}>
              <Text style={styles.refAddBtnText}>+ 질문 추가</Text>
            </TouchableOpacity>
          )}
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
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || !canSubmit}
          activeOpacity={0.8}
        >
          {isSubmitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>발제 등록</Text>
          }
        </TouchableOpacity>
    </KeyboardAwareScrollView>
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
  bookTitle: { fontSize: 15, fontWeight: '700', color: '#212121', lineHeight: 21 },

  section: { backgroundColor: '#fff', padding: 20, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#424242', marginBottom: 12 },
  optional: { fontSize: 12, fontWeight: '400', color: '#9E9E9E' },

  typeRow: { flexDirection: 'row', gap: 10 },
  labelRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  typeBtnActive: { borderColor: '#4A90E2', backgroundColor: '#EAF2FB' },
  typeBtnText: { fontSize: 14, color: '#767676', fontWeight: '600' },
  typeBtnTextActive: { color: '#4A90E2' },

  titleInput: {
    height: 48,
    fontSize: 15,
    color: '#212121',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  questionInput: {
    minHeight: 48,
    fontSize: 15,
    color: '#212121',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  bodyInput: {
    minHeight: 160,
    fontSize: 15,
    color: '#212121',
    lineHeight: 22,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
  },

  // 참고 자료 카드
  refCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    marginBottom: 8,
  },
  refQuoteInner: { flex: 1 },
  refQuoteText: { fontSize: 14, fontStyle: 'italic', color: '#424242', lineHeight: 20 },
  refQuotePage: { fontSize: 12, color: '#9E9E9E', marginTop: 4, textAlign: 'right' },
  refLinkInner: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center' },
  refLinkIcon: { fontSize: 16 },
  refLinkTitle: { fontSize: 13, fontWeight: '600', color: '#212121' },
  refLinkUrl: { fontSize: 12, color: '#9E9E9E' },
  refDeleteBtn: { paddingLeft: 12, paddingTop: 2 },
  refDeleteText: { fontSize: 14, color: '#BDBDBD' },

  refBtnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  refAddBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#4A90E2',
  },
  refAddBtnText: { fontSize: 13, color: '#4A90E2', fontWeight: '600' },

  // 인라인 입력 박스
  inputBox: {
    backgroundColor: '#F4F8FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D0E4FF',
  },
  inputBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  inputCancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  inputCancelText: { fontSize: 13, color: '#767676' },
  inputConfirmBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#4A90E2' },
  inputConfirmText: { fontSize: 13, color: '#fff', fontWeight: '600' },

  // 세부 질문
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    marginBottom: 8,
  },
  questionNum: { fontSize: 14, fontWeight: '700', color: '#4A90E2', marginRight: 8, lineHeight: 20 },
  questionText: { flex: 1, fontSize: 14, color: '#212121', lineHeight: 20 },

  spoilerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 8, marginBottom: 12,
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
