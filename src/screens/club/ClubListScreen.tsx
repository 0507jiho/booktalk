import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  fetchMyClubs,
  createClub,
  fetchPublicClubs,
  checkIsMember,
  joinClub,
} from '@/services/firebase/clubs';
import { useAuthStore } from '@/stores/authStore';
import { useClubStore } from '@/stores/clubStore';
import { Club } from '@/types';
import { ClubStackParamList } from '@/navigation/ClubStackNavigator';
import { Ionicons } from '@expo/vector-icons';

type Nav = NativeStackNavigationProp<ClubStackParamList, 'ClubList'>;

interface PublicClubEntry {
  club: Club;
  isMember: boolean;
}

export default function ClubListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { firebaseUser } = useAuthStore();
  const { myClubs, setMyClubs } = useClubStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [publicClubs, setPublicClubs] = useState<PublicClubEntry[]>([]);
  const [isPublicLoading, setIsPublicLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const loadMyClubs = useCallback(async () => {
    if (!firebaseUser) return;
    setIsLoading(true);
    try {
      const clubs = await fetchMyClubs(firebaseUser.uid);
      setMyClubs(clubs);
    } catch (e) {
      console.error('모임 로드 실패:', e);
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser]);

  const loadPublicClubs = useCallback(async () => {
    if (!firebaseUser) return;
    setIsPublicLoading(true);
    try {
      const clubs = await fetchPublicClubs(20);
      const entries = await Promise.all(
        clubs.map(async club => {
          const member = await checkIsMember(club.clubId, firebaseUser.uid);
          return { club, isMember: member };
        })
      );
      // 이미 내 모임인 것도 공개 섹션에 표시 (상태만 다르게)
      setPublicClubs(entries);
    } catch (e) {
      console.error('공개 모임 로드 실패:', e);
    } finally {
      setIsPublicLoading(false);
    }
  }, [firebaseUser]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadMyClubs(), loadPublicClubs()]);
  }, [loadMyClubs, loadPublicClubs]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleJoin(club: Club) {
    if (!firebaseUser) return;
    setJoiningId(club.clubId);
    try {
      const status = await joinClub(club.clubId, firebaseUser.uid);
      if (status === 'active') {
        Alert.alert('가입 완료', `${club.name}에 가입했습니다!`);
        // 내 모임 목록 갱신
        await loadMyClubs();
      } else {
        Alert.alert('가입 요청 완료', '모임 오너의 승인 후 가입됩니다.');
      }
      // 공개 모임 목록 멤버십 상태 갱신
      setPublicClubs(prev =>
        prev.map(e =>
          e.club.clubId === club.clubId
            ? { ...e, isMember: status === 'active' }
            : e
        )
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '가입에 실패했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>모임</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setShowCreateModal(true)}
          accessibilityRole="button"
          accessibilityLabel="새 모임 만들기"
        >
          <Text style={styles.createBtnText}>+ 모임 만들기</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isPublicLoading}
            onRefresh={loadAll}
            tintColor="#3D4DC4"
          />
        }
      >
        {/* 내 모임 섹션 */}
        <Text style={styles.sectionTitle}>내 모임</Text>
        {isLoading ? (
          <ActivityIndicator color="#3D4DC4" style={styles.sectionLoader} />
        ) : myClubs.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons name="people-outline" size={28} color="#BDBDBD" />
            <Text style={styles.emptySectionText}>아직 참여 중인 모임이 없어요.</Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.emptyCreateText}>모임 만들기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          myClubs.map(club => (
            <ClubCard
              key={club.clubId}
              club={club}
              onPress={() => navigation.navigate('ClubDetail', { clubId: club.clubId })}
            />
          ))
        )}

        {/* 공개 모임 탐색 섹션 */}
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>공개 모임 탐색</Text>
        {isPublicLoading ? (
          <ActivityIndicator color="#3D4DC4" style={styles.sectionLoader} />
        ) : publicClubs.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>공개 모임이 없습니다.</Text>
          </View>
        ) : (
          publicClubs.map(({ club, isMember }) => (
            <PublicClubCard
              key={club.clubId}
              club={club}
              isMember={isMember}
              isJoining={joiningId === club.clubId}
              onPress={() => navigation.navigate('ClubDetail', { clubId: club.clubId })}
              onJoin={() => handleJoin(club)}
            />
          ))
        )}
      </ScrollView>

      <CreateClubModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={club => {
          setMyClubs([club, ...myClubs]);
          setShowCreateModal(false);
          loadPublicClubs();
        }}
        uid={firebaseUser?.uid ?? ''}
      />
    </View>
  );
}

function ClubCard({ club, onPress }: { club: Club; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.clubName}>{club.name}</Text>
        {club.isPrivate && <Text style={styles.privateBadge}>비공개</Text>}
      </View>
      <Text style={styles.description} numberOfLines={2}>{club.description}</Text>
      <View style={styles.memberCountRow}>
        <Ionicons name="people-outline" size={13} color="#767676" />
        <Text style={styles.memberCount}>멤버 {club.memberCount}명</Text>
      </View>
    </TouchableOpacity>
  );
}

function PublicClubCard({
  club,
  isMember,
  isJoining,
  onPress,
  onJoin,
}: {
  club: Club;
  isMember: boolean;
  isJoining: boolean;
  onPress: () => void;
  onJoin: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.clubName}>{club.name}</Text>
        {club.isPrivate && <Text style={styles.privateBadge}>비공개</Text>}
      </View>
      <Text style={styles.description} numberOfLines={2}>{club.description}</Text>
      <View style={styles.publicCardFooter}>
        <View style={styles.memberCountRow}>
          <Ionicons name="people-outline" size={13} color="#767676" />
          <Text style={styles.memberCount}>멤버 {club.memberCount}명</Text>
        </View>
        {isMember ? (
          <TouchableOpacity style={styles.detailBtn} onPress={onPress}>
            <Text style={styles.detailBtnText}>상세보기</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.joinBtn, isJoining && styles.joinBtnDisabled]}
            onPress={onJoin}
            disabled={isJoining}
          >
            <Text style={styles.joinBtnText}>
              {isJoining ? '가입 중...' : club.isPrivate ? '가입 요청' : '가입하기'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function CreateClubModal({
  visible,
  onClose,
  onCreated,
  uid,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (club: Club) => void;
  uid: string;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('입력 오류', '모임 이름을 입력해주세요.');
      return;
    }
    setIsLoading(true);
    try {
      const club = await createClub(uid, name.trim(), description.trim(), isPrivate);
      setName('');
      setDescription('');
      setIsPrivate(false);
      onCreated(club);
    } catch {
      Alert.alert('오류', '모임 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>새 모임 만들기</Text>

          <TextInput
            style={styles.input}
            placeholder="모임 이름"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="모임 설명"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>비공개 모임</Text>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ true: '#3D4DC4' }}
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, isLoading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={isLoading}
            >
              <Text style={styles.confirmText}>{isLoading ? '생성 중...' : '만들기'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#212121' },
  createBtn: {
    backgroundColor: '#3D4DC4',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  scrollContent: { paddingBottom: 32 },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionDivider: {
    height: 8,
    backgroundColor: '#F0F0F0',
    marginTop: 8,
  },
  sectionLoader: { marginVertical: 16 },

  emptySection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptySectionText: { fontSize: 14, color: '#9E9E9E' },
  emptyCreateBtn: {
    marginTop: 4,
    backgroundColor: '#3D4DC4',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyCreateText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 5,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  clubName: { fontSize: 16, fontWeight: '700', color: '#212121', flex: 1 },
  privateBadge: {
    fontSize: 11,
    color: '#767676',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  description: { fontSize: 14, color: '#616161', lineHeight: 20, marginBottom: 10 },
  memberCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberCount: { fontSize: 13, color: '#767676' },

  publicCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinBtn: {
    backgroundColor: '#3D4DC4',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  joinBtnDisabled: { backgroundColor: '#9BA5E0' },
  joinBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  detailBtn: {
    borderWidth: 1,
    borderColor: '#3D4DC4',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  detailBtnText: { color: '#3D4DC4', fontSize: 12, fontWeight: '600' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#212121', marginBottom: 20 },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 15,
  },
  inputMultiline: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  switchLabel: { fontSize: 15, color: '#424242' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, color: '#757575' },
  confirmBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#3D4DC4',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#9BA5E0' },
  confirmText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
