import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
  Animated, TouchableWithoutFeedback, Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { HomeStackParamList } from '@/navigation/HomeStackNavigator';
import { fixImageUrl } from '@/utils/image';
import { useAuthStore } from '@/stores/authStore';
import { checkIsLiked, toggleLike } from '@/services/firebase/likes';
import { updateReview, deleteReview } from '@/services/firebase/reviews';
import SpoilerContent from '@/components/SpoilerContent';
import ActionSheet from '@/components/ActionSheet';
import ConfirmSheet from '@/components/ConfirmSheet';

type Props = NativeStackScreenProps<HomeStackParamList, 'ReviewDetail'>;

const PRIMARY = '#3D4DC4';

export default function ReviewDetailScreen({ route, navigation }: Props) {
  const {
    reviewId, rating, content: initialContent, hasSpoiler,
    likeCount: initialLikeCount, createdAtMillis,
    bookTitle, bookCoverUrl, bookId, author, displayName, userId,
  } = route.params;
  const { firebaseUser } = useAuthStore();
  const uid = firebaseUser?.uid;
  const isOwner = !!uid && uid === userId;

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [content, setContent] = useState(initialContent);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editContent, setEditContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const SHEET_HEIGHT = Dimensions.get('window').height * 0.6;
  const editOverlayOpacity = useRef(new Animated.Value(0)).current;
  const editSheetTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (editVisible) {
      editSheetTranslateY.setValue(SHEET_HEIGHT);
      Animated.parallel([
        Animated.timing(editOverlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(editSheetTranslateY, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [editVisible]);

  function handleCloseEdit() {
    Animated.parallel([
      Animated.timing(editOverlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(editSheetTranslateY, { toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true }),
    ]).start(() => setEditVisible(false));
  }

  useEffect(() => {
    if (!uid || !reviewId) return;
    checkIsLiked(uid, reviewId, 'review').then(setIsLiked);
  }, [uid, reviewId]);

  async function handleLike() {
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

  async function handleSaveEdit() {
    if (!editContent.trim()) return;
    setIsSaving(true);
    try {
      await updateReview(reviewId, editContent.trim());
      setContent(editContent.trim());
      setEditVisible(false);
    } catch {
      Alert.alert('오류', '수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteReview(reviewId);
      navigation.goBack();
    } catch {
      Alert.alert('오류', '삭제에 실패했습니다.');
    }
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* 작성자 */}
        {displayName && (
          <View style={styles.authorRow}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.authorName}>{displayName}</Text>
            {isOwner && (
              <TouchableOpacity
                style={styles.menuBtn}
                onPress={() => setMenuVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#767676" />
              </TouchableOpacity>
            )}
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
        <SpoilerContent hasSpoiler={hasSpoiler}>
          <Text style={styles.reviewContent}>{content}</Text>
        </SpoilerContent>

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

      {/* 관리 액션시트 */}
      <ActionSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        actions={[
          { label: '수정', icon: 'pencil-outline', onPress: () => { setEditContent(content); setEditVisible(true); } },
          { label: '삭제', icon: 'trash-outline', destructive: true, onPress: () => setDeleteVisible(true) },
        ]}
      />

      {/* 삭제 확인 */}
      <ConfirmSheet
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        title="리뷰 삭제"
        description="이 리뷰를 삭제할까요?"
        confirmLabel="삭제"
        destructive
        onConfirm={handleDelete}
      />

      {/* 수정 모달 */}
      <Modal visible={editVisible} transparent animationType="none" onRequestClose={handleCloseEdit}>
        <View style={styles.editRoot}>
          <TouchableWithoutFeedback onPress={handleCloseEdit}>
            <Animated.View style={[styles.editOverlay, { opacity: editOverlayOpacity }]} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Animated.View style={[styles.editSheet, { transform: [{ translateY: editSheetTranslateY }] }]}>
              <View style={styles.handle} />
              <Text style={styles.editTitle}>리뷰 수정</Text>
              <TextInput
                style={styles.editInput}
                value={editContent}
                onChangeText={setEditContent}
                multiline
                textAlignVertical="top"
                autoFocus
              />
              <View style={styles.editBtns}>
                <TouchableOpacity style={styles.editCancelBtn} onPress={handleCloseEdit}>
                  <Text style={styles.editCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editConfirmBtn, isSaving && { opacity: 0.6 }]}
                  onPress={handleSaveEdit}
                  disabled={isSaving}
                >
                  <Text style={styles.editConfirmText}>저장</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
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
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center',
  },
  authorAvatarText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  authorName: { fontSize: 15, fontWeight: '600', color: '#212121', flex: 1 },
  menuBtn: { padding: 4 },

  bookCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F7F8FF', borderRadius: 10, padding: 12, marginBottom: 20,
    borderWidth: 1, borderColor: '#ECEFFE',
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

  editRoot: { flex: 1, justifyContent: 'flex-end' },
  editOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  editSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0',
    alignSelf: 'center', marginBottom: 16,
  },
  editTitle: { fontSize: 18, fontWeight: 'bold', color: '#212121', marginBottom: 16 },
  editInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    minHeight: 140, marginBottom: 16,
  },
  editBtns: { flexDirection: 'row', gap: 12 },
  editCancelBtn: {
    flex: 1, height: 48, borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  editCancelText: { fontSize: 15, color: '#757575' },
  editConfirmBtn: {
    flex: 1, height: 48, backgroundColor: PRIMARY,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  editConfirmText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
