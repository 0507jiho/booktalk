import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { ClubStackParamList } from '@/navigation/ClubStackNavigator';
import {
  fetchClub,
  updateClub,
  deleteClub,
  leaveClub,
  removeMember,
  approveMember,
  rejectMember,
  fetchClubMembersWithProfile,
  fetchPendingMembers,
  generateInviteCode,
  addBookToClub,
  removeBookFromClub,
  MemberWithProfile,
} from '@/services/firebase/clubs';
import {
  fetchClubEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  toggleEventAttendance,
} from '@/services/firebase/events';
import { fetchTopic } from '@/services/firebase/topics';
import { useAuthStore } from '@/stores/authStore';
import { Club, Event, Membership, Topic, BookRef } from '@/types';
import { ScrollView } from 'react-native';
import { fixImageUrl } from '@/utils/image';

type Props = NativeStackScreenProps<ClubStackParamList, 'ClubDetail'>;
type TabKey = 'events' | 'members' | 'topics';

const TABS: { label: string; key: TabKey }[] = [
  { label: '일정', key: 'events' },
  { label: '회원', key: 'members' },
  { label: '발제', key: 'topics' },
];

export default function ClubDetailScreen({ route, navigation }: Props) {
  const { clubId } = route.params;
  const { firebaseUser } = useAuthStore();
  const uid = firebaseUser?.uid ?? '';

  const [club, setClub] = useState<Club | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Membership[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('events');

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const isOwner = club?.ownerId === uid;
  const isMember = members.some(m => m.uid === uid);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [c, ev, mem, pending] = await Promise.all([
        fetchClub(clubId),
        fetchClubEvents(clubId),
        fetchClubMembersWithProfile(clubId),
        fetchPendingMembers(clubId),
      ]);
      setClub(c);
      setEvents(ev);
      setMembers(mem);
      setPendingMembers(pending);

      if (c) {
        navigation.setOptions({ title: c.name });
        const topicIds = c.selectedTopicIds ?? [];
        if (topicIds.length > 0) {
          const topics = await Promise.all(topicIds.map(id => fetchTopic(id)));
          setSelectedTopics(topics.filter(Boolean) as Topic[]);
        } else {
          setSelectedTopics([]);
        }
      }
    } catch (e) {
      console.error('모임 상세 로드 실패:', e);
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ─── 일정 ──────────────────────────────────────────────

  async function handleToggleAttend(event: Event) {
    if (!uid) return;
    const attending = event.attendees.includes(uid);
    try {
      await toggleEventAttendance(event.eventId, uid, !attending);
      setEvents(prev =>
        prev.map(e =>
          e.eventId === event.eventId
            ? { ...e, attendees: attending ? e.attendees.filter(id => id !== uid) : [...e.attendees, uid] }
            : e
        )
      );
    } catch {
      Alert.alert('오류', '참석 변경에 실패했습니다.');
    }
  }

  function handleEventLongPress(event: Event) {
    if (!isOwner) return;
    Alert.alert(event.title, '일정을 어떻게 할까요?', [
      { text: '수정', onPress: () => setEditingEvent(event) },
      {
        text: '삭제', style: 'destructive', onPress: () =>
          Alert.alert('일정 삭제', `"${event.title}" 일정을 삭제할까요?`, [
            { text: '취소', style: 'cancel' },
            {
              text: '삭제', style: 'destructive', onPress: async () => {
                try {
                  await deleteEvent(event.eventId);
                  setEvents(prev => prev.filter(e => e.eventId !== event.eventId));
                } catch {
                  Alert.alert('오류', '일정 삭제에 실패했습니다.');
                }
              },
            },
          ]),
      },
      { text: '취소', style: 'cancel' },
    ]);
  }

  // ─── 회원 ──────────────────────────────────────────────

  async function handleApprove(targetUid: string) {
    try {
      await approveMember(clubId, targetUid);
      await load();
    } catch {
      Alert.alert('오류', '승인에 실패했습니다.');
    }
  }

  async function handleReject(targetUid: string) {
    try {
      await rejectMember(clubId, targetUid);
      setPendingMembers(prev => prev.filter(m => m.uid !== targetUid));
    } catch {
      Alert.alert('오류', '거절에 실패했습니다.');
    }
  }

  function handleMemberLongPress(member: MemberWithProfile) {
    if (!isOwner || member.uid === uid) return;
    Alert.alert(member.displayName, '멤버를 강퇴할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '강퇴', style: 'destructive', onPress: async () => {
          try {
            await removeMember(clubId, member.uid);
            setMembers(prev => prev.filter(m => m.uid !== member.uid));
          } catch {
            Alert.alert('오류', '강퇴에 실패했습니다.');
          }
        },
      },
    ]);
  }

  async function handleLeave() {
    Alert.alert('모임 탈퇴', '정말 탈퇴할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴', style: 'destructive', onPress: async () => {
          try {
            await leaveClub(clubId, uid);
            navigation.goBack();
          } catch (e) {
            Alert.alert('오류', (e as Error).message ?? '탈퇴에 실패했습니다.');
          }
        },
      },
    ]);
  }

  // ─── 설정 ──────────────────────────────────────────────

  async function handleDeleteClub() {
    Alert.alert('모임 삭제', '정말 모임을 삭제할까요? 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          try {
            await deleteClub(clubId);
            navigation.goBack();
          } catch {
            Alert.alert('오류', '모임 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  }

  // ─── 렌더 ──────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3D4DC4" />
      </View>
    );
  }

  if (!club) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>모임을 찾을 수 없어요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Club Info */}
      <View style={styles.clubInfo}>
        <View style={styles.clubInfoRow}>
          <View style={styles.clubNameRow}>
            <Text style={styles.clubName}>{club.name}</Text>
            {club.isPrivate && <Text style={styles.privateBadge}>비공개</Text>}
          </View>
          {isOwner && (
            <TouchableOpacity onPress={() => setShowSettings(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="settings-outline" size={20} color="#767676" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.clubDesc}>{club.description}</Text>
        <View style={styles.memberCountRow}>
          <Ionicons name="people-outline" size={14} color="#767676" />
          <Text style={styles.memberCount}>멤버 {club.memberCount}명</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
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

      {/* Tab Content */}
      {activeTab === 'events' && (
        <EventsTab
          events={events}
          uid={uid}
          isOwner={isOwner}
          onToggleAttend={handleToggleAttend}
          onAddEvent={() => setShowAddEvent(true)}
          onLongPress={handleEventLongPress}
        />
      )}
      {activeTab === 'members' && (
        <MembersTab
          members={members}
          pendingMembers={pendingMembers}
          ownerId={club.ownerId}
          currentUid={uid}
          isOwner={isOwner}
          onApprove={handleApprove}
          onReject={handleReject}
          onLongPress={handleMemberLongPress}
          onLeave={handleLeave}
        />
      )}
      {activeTab === 'topics' && (
        <TopicsTab
          club={club}
          topics={selectedTopics}
          isOwner={isOwner}
          onTopicPress={topicId => navigation.navigate('ClubTopicDetail', { topicId, clubId })}
          onSelectBook={() => navigation.navigate('SelectBook', { clubId })}
          onRemoveBook={(bookId) => {
            Alert.alert('책 제거', '이 책을 모임에서 제거할까요?', [
              { text: '취소', style: 'cancel' },
              { text: '제거', style: 'destructive', onPress: async () => {
                try {
                  await removeBookFromClub(clubId, bookId);
                  setClub(prev => prev ? { ...prev, books: (prev.books ?? []).filter(b => b.bookId !== bookId) } : prev);
                } catch {
                  Alert.alert('오류', '책 제거에 실패했습니다.');
                }
              }},
            ]);
          }}
          onSelectTopic={(bookId) => {
            navigation.navigate('SelectTopic', { clubId, bookId, selectedTopicIds: club.selectedTopicIds ?? [] });
          }}
          onWriteTopic={(bookId) => {
            const book = club.books?.find(b => b.bookId === bookId);
            const bookTitle = book?.title ?? club.bookTitle ?? '';
            const bookCoverUrl = book?.coverUrl ?? club.bookCoverUrl ?? '';
            navigation.navigate('WriteTopic', { clubId, bookId, bookTitle, bookCoverUrl });
          }}
        />
      )}

      {/* Modals */}
      <EventFormModal
        visible={showAddEvent || editingEvent !== null}
        clubId={clubId}
        books={club.books ?? (club.bookId ? [{ bookId: club.bookId, title: club.bookTitle ?? '', coverUrl: club.bookCoverUrl ?? '', author: club.bookAuthor ?? '' }] : [])}
        editingEvent={editingEvent}
        onClose={() => { setShowAddEvent(false); setEditingEvent(null); }}
        onSaved={event => {
          if (editingEvent) {
            setEvents(prev => prev.map(e => e.eventId === event.eventId ? event : e));
          } else {
            setEvents(prev => [...prev, event].sort((a, b) => a.date.toMillis() - b.date.toMillis()));
          }
          setShowAddEvent(false);
          setEditingEvent(null);
        }}
      />

      <ClubSettingsModal
        visible={showSettings}
        club={club}
        onClose={() => setShowSettings(false)}
        onUpdated={updated => { setClub(updated); setShowSettings(false); }}
        onDelete={handleDeleteClub}
      />
    </View>
  );
}

// ─── EventsTab ────────────────────────────────────────────────────────────────

function EventsTab({
  events, uid, isOwner, onToggleAttend, onAddEvent, onLongPress,
}: {
  events: Event[];
  uid: string;
  isOwner: boolean;
  onToggleAttend: (event: Event) => void;
  onAddEvent: () => void;
  onLongPress: (event: Event) => void;
}) {
  return (
    <View style={styles.tabContent}>
      {isOwner && (
        <TouchableOpacity style={styles.addBtn} onPress={onAddEvent}>
          <Text style={styles.addBtnText}>+ 일정 추가</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={events}
        keyExtractor={item => item.eventId}
        renderItem={({ item }) => {
          const attending = item.attendees.includes(uid);
          return (
            <TouchableOpacity
              style={styles.eventCard}
              onLongPress={() => onLongPress(item)}
              delayLongPress={400}
              activeOpacity={0.85}
            >
              <View style={styles.eventDateBlock}>
                <Text style={styles.eventMonth}>{dayjs(item.date.toDate()).format('MM월')}</Text>
                <Text style={styles.eventDay}>{dayjs(item.date.toDate()).format('DD')}</Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                {item.location ? (
                  <View style={styles.eventMetaRow}>
                    <Ionicons name="location-outline" size={12} color="#616161" />
                    <Text style={styles.eventLocation}>{item.location}</Text>
                  </View>
                ) : null}
                <View style={styles.eventMetaRow}>
                  <Ionicons name="people-outline" size={12} color="#767676" />
                  <Text style={styles.eventAttendees}>{item.attendees.length}명 참석</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.attendBtn, attending && styles.attendBtnActive]}
                onPress={() => onToggleAttend(item)}
              >
                <Text style={[styles.attendText, attending && styles.attendTextActive]}>
                  {attending ? '참석 중' : '참석'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>등록된 일정이 없어요.</Text></View>}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

// ─── MembersTab ───────────────────────────────────────────────────────────────

function MembersTab({
  members, pendingMembers, ownerId, currentUid, isOwner,
  onApprove, onReject, onLongPress, onLeave,
}: {
  members: MemberWithProfile[];
  pendingMembers: Membership[];
  ownerId: string;
  currentUid: string;
  isOwner: boolean;
  onApprove: (uid: string) => void;
  onReject: (uid: string) => void;
  onLongPress: (member: MemberWithProfile) => void;
  onLeave: () => void;
}) {
  const isMember = members.some(m => m.uid === currentUid);

  return (
    <View style={styles.tabContent}>
      <FlatList
        data={members}
        keyExtractor={item => item.uid}
        ListHeaderComponent={
          isOwner && pendingMembers.length > 0 ? (
            <View style={styles.pendingSection}>
              <Text style={styles.pendingSectionTitle}>가입 대기 {pendingMembers.length}명</Text>
              {pendingMembers.map(m => (
                <View key={m.uid} style={styles.pendingRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>?</Text>
                  </View>
                  <Text style={styles.pendingUid}>{m.uid.slice(0, 10)}...</Text>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => onApprove(m.uid)}>
                    <Text style={styles.approveBtnText}>승인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => onReject(m.uid)}>
                    <Text style={styles.rejectBtnText}>거절</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.memberRow}
            onLongPress={() => onLongPress(item)}
            delayLongPress={400}
            activeOpacity={0.85}
          >
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>
                {item.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.memberName}>{item.displayName}</Text>
            {item.uid === ownerId && <Text style={styles.ownerBadge}>운영자</Text>}
            <Text style={styles.memberJoined}>
              {dayjs(item.joinedAt.toDate()).format('YY.MM.DD')} 가입
            </Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          isMember && !isOwner ? (
            <TouchableOpacity style={styles.leaveBtn} onPress={onLeave}>
              <Text style={styles.leaveBtnText}>모임 탈퇴</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>멤버가 없어요.</Text></View>}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

// ─── TopicsTab ────────────────────────────────────────────────────────────────

function TopicsTab({
  club, topics, isOwner,
  onTopicPress, onSelectBook, onRemoveBook, onSelectTopic, onWriteTopic,
}: {
  club: Club;
  topics: Topic[];
  isOwner: boolean;
  onTopicPress: (topicId: string) => void;
  onSelectBook: () => void;
  onRemoveBook: (bookId: string) => void;
  onSelectTopic: (bookId: string) => void;
  onWriteTopic: (bookId: string) => void;
}) {
  const books = club.books ?? [];
  const [selectedBookId, setSelectedBookId] = useState<string | null>(books[0]?.bookId ?? null);

  useEffect(() => {
    if (books.length > 0 && !books.find(b => b.bookId === selectedBookId)) {
      setSelectedBookId(books[0]?.bookId ?? null);
    }
  }, [books.length]);

  const filteredTopics = selectedBookId
    ? topics.filter(t => t.bookId === selectedBookId)
    : topics;

  const hasBooks = books.length > 0 || !!club.bookId;

  return (
    <View style={styles.tabContent}>
      {/* 읽는 책 목록 */}
      <View style={styles.bookHeader}>
        <View style={styles.bookHeaderRow}>
          <Text style={styles.bookHeaderTitle}>읽는 책</Text>
          {isOwner && (
            <TouchableOpacity style={styles.addBookBtn} onPress={onSelectBook}>
              <Ionicons name="add-outline" size={14} color="#3D4DC4" />
              <Text style={styles.addBookBtnText}>책 추가</Text>
            </TouchableOpacity>
          )}
        </View>
        {books.length > 0 ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookListContent}>
              {books.map(b => {
                const isSelected = b.bookId === selectedBookId;
                return (
                  <TouchableOpacity
                    key={b.bookId}
                    style={[styles.bookCard, isSelected && styles.bookCardSelected]}
                    onPress={() => setSelectedBookId(b.bookId)}
                    activeOpacity={0.7}
                  >
                    {b.coverUrl ? (
                      <Image source={{ uri: fixImageUrl(b.coverUrl) }} style={styles.bookCover} />
                    ) : (
                      <View style={styles.bookCoverPlaceholder}>
                        <Ionicons name="book-outline" size={20} color="#9E9E9E" />
                      </View>
                    )}
                    <Text style={styles.bookCardTitle} numberOfLines={2}>{b.title}</Text>
                    <Text style={styles.bookCardAuthor} numberOfLines={1}>{b.author}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        ) : club.bookId ? (
          <View style={styles.bookRow}>
            {club.bookCoverUrl ? (
              <Image source={{ uri: fixImageUrl(club.bookCoverUrl) }} style={styles.bookCover} />
            ) : (
              <View style={styles.bookCoverPlaceholder}>
                <Ionicons name="book-outline" size={24} color="#9E9E9E" />
              </View>
            )}
            <View style={styles.bookMeta}>
              <Text style={styles.bookTitle} numberOfLines={2}>{club.bookTitle}</Text>
              <Text style={styles.bookAuthor}>{club.bookAuthor}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.noBookRow}>
            <Text style={styles.noBookText}>
              {isOwner ? '읽을 책을 추가해주세요.' : '아직 책이 선택되지 않았어요.'}
            </Text>
          </View>
        )}
      </View>

      {/* 발제 목록 */}
      <FlatList
        data={filteredTopics}
        keyExtractor={item => item.topicId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.topicCard}
            onPress={() => onTopicPress(item.topicId)}
            activeOpacity={0.7}
          >
            <Text style={[styles.topicTypeBadge, item.type === 'agree-disagree' && styles.topicTypeBadgeAgree]}>
              {item.type === 'agree-disagree' ? '찬반' : '자유'}
            </Text>
            <Text style={styles.topicTitle}>{item.title}</Text>
            <Text style={styles.topicBody} numberOfLines={2}>{item.body}</Text>
            <View style={styles.topicMetaRow}>
              <Ionicons name="chatbubble-outline" size={12} color="#767676" />
              <Text style={styles.topicMeta}>{dayjs(item.createdAt.toDate()).format('MM.DD')}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          isOwner && hasBooks && selectedBookId ? (
            <View style={styles.topicActions}>
              <TouchableOpacity style={styles.topicActionBtn} onPress={() => onSelectTopic(selectedBookId)}>
                <Ionicons name="search-outline" size={15} color="#3D4DC4" />
                <Text style={styles.topicActionBtnText}>발제 선택</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.topicActionBtn} onPress={() => onWriteTopic(selectedBookId)}>
                <Ionicons name="add-outline" size={15} color="#3D4DC4" />
                <Text style={styles.topicActionBtnText}>발제 작성</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          hasBooks ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {isOwner ? '발제를 선택하거나 새로 작성해보세요.' : '아직 발제가 없어요.'}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isOwner && selectedBookId && books.length > 0 ? (
            <TouchableOpacity
              style={styles.removeSelectedBookBtn}
              onPress={() => onRemoveBook(selectedBookId)}
            >
              <Ionicons name="trash-outline" size={14} color="#E74C3C" />
              <Text style={styles.removeSelectedBookBtnText}>이 책 제거</Text>
            </TouchableOpacity>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

// ─── EventFormModal ───────────────────────────────────────────────────────────

function EventFormModal({
  visible, clubId, books, editingEvent, onClose, onSaved,
}: {
  visible: boolean;
  clubId: string;
  books: BookRef[];
  editingEvent: Event | null;
  onClose: () => void;
  onSaved: (event: Event) => void;
}) {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setEventDate(editingEvent.date.toDate());
      setLocation(editingEvent.location ?? '');
      setSelectedBookId(editingEvent.bookId ?? null);
    } else {
      setTitle(''); setEventDate(new Date()); setLocation(''); setSelectedBookId(null);
    }
  }, [editingEvent, visible]);

  function handleDateChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && date) setEventDate(date);
  }

  async function handleSave() {
    if (!title.trim()) { Alert.alert('입력 오류', '일정 제목을 입력해주세요.'); return; }
    setIsLoading(true);
    try {
      if (editingEvent) {
        const { Timestamp } = await import('firebase/firestore');
        const updates = {
          title: title.trim(),
          date: Timestamp.fromDate(eventDate),
          location: location.trim(),
          ...(selectedBookId ? { bookId: selectedBookId } : {}),
        };
        await updateEvent(editingEvent.eventId, updates);
        onSaved({ ...editingEvent, ...updates });
      } else {
        const event = await createEvent(clubId, title.trim(), eventDate, location.trim(), undefined, selectedBookId ?? undefined);
        onSaved(event);
      }
    } catch {
      Alert.alert('오류', '일정 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{editingEvent ? '일정 수정' : '일정 추가'}</Text>
          <TextInput style={styles.input} placeholder="일정 제목" value={title} onChangeText={setTitle} />
          <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.datePickerText}>{dayjs(eventDate).format('YYYY년 MM월 DD일')}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={eventDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date(2020, 0, 1)}
            />
          )}
          <TextInput style={styles.input} placeholder="장소 (선택)" value={location} onChangeText={setLocation} />
          {books.length > 0 && (
            <View style={styles.bookPickerSection}>
              <Text style={styles.bookPickerLabel}>관련 책 (선택)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity
                  style={[styles.bookChip, selectedBookId === null && styles.bookChipActive]}
                  onPress={() => setSelectedBookId(null)}
                >
                  <Text style={[styles.bookChipText, selectedBookId === null && styles.bookChipTextActive]}>없음</Text>
                </TouchableOpacity>
                {books.map(b => (
                  <TouchableOpacity
                    key={b.bookId}
                    style={[styles.bookChip, selectedBookId === b.bookId && styles.bookChipActive]}
                    onPress={() => setSelectedBookId(b.bookId)}
                  >
                    <Text style={[styles.bookChipText, selectedBookId === b.bookId && styles.bookChipTextActive]} numberOfLines={1}>
                      {b.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, isLoading && styles.buttonDisabled]} onPress={handleSave} disabled={isLoading}>
              <Text style={styles.confirmText}>{isLoading ? '저장 중...' : (editingEvent ? '수정' : '추가')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── ClubSettingsModal ────────────────────────────────────────────────────────

function ClubSettingsModal({
  visible, club, onClose, onUpdated, onDelete,
}: {
  visible: boolean;
  club: Club;
  onClose: () => void;
  onUpdated: (updated: Club) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState<string | undefined>(undefined);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(club.name);
      setDescription(club.description);
      setIsPrivate(club.isPrivate);
      setCurrentInviteCode(club.inviteCode);
    }
  }, [visible, club]);

  async function handleRegenerateCode() {
    setRegenerating(true);
    try {
      const code = await generateInviteCode(club.clubId);
      setCurrentInviteCode(code);
    } catch {
      Alert.alert('오류', '초대 코드 발급에 실패했습니다.');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('입력 오류', '모임 이름을 입력해주세요.'); return; }
    setIsLoading(true);
    try {
      await updateClub(club.clubId, { name: name.trim(), description: description.trim(), isPrivate });
      onUpdated({ ...club, name: name.trim(), description: description.trim(), isPrivate });
    } catch {
      Alert.alert('오류', '모임 정보 수정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>모임 설정</Text>
          <TextInput style={styles.input} placeholder="모임 이름" value={name} onChangeText={setName} />
          <TextInput
            style={[styles.input, { height: 80, paddingTop: 12, textAlignVertical: 'top' }]}
            placeholder="모임 설명"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>비공개 모임</Text>
            <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: '#3D4DC4' }} />
          </View>
          {isPrivate && (
            <View style={styles.inviteCodeRow}>
              <View>
                <Text style={styles.inviteCodeLabel}>초대 코드</Text>
                <Text style={styles.inviteCodeValue}>{currentInviteCode ?? '—'}</Text>
              </View>
              <TouchableOpacity
                style={[styles.regenBtn, regenerating && styles.buttonDisabled]}
                onPress={handleRegenerateCode}
                disabled={regenerating}
              >
                <Text style={styles.regenBtnText}>{regenerating ? '발급 중...' : '재발급'}</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, isLoading && styles.buttonDisabled]} onPress={handleSave} disabled={isLoading}>
              <Text style={styles.confirmText}>{isLoading ? '저장 중...' : '저장'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.deleteClubBtn} onPress={() => { onClose(); onDelete(); }}>
            <Text style={styles.deleteClubBtnText}>모임 삭제</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#767676' },

  clubInfo: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  clubInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  clubNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  clubName: { fontSize: 20, fontWeight: '700', color: '#212121' },
  privateBadge: {
    fontSize: 11, color: '#767676', backgroundColor: '#F5F5F5',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },
  clubDesc: { fontSize: 14, color: '#616161', lineHeight: 20, marginBottom: 8 },
  memberCountRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  memberCount: { fontSize: 13, color: '#767676' },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#3D4DC4' },
  tabText: { fontSize: 14, color: '#767676', fontWeight: '500' },
  tabTextActive: { color: '#3D4DC4', fontWeight: '700' },

  tabContent: { flex: 1 },
  listContent: { padding: 16, gap: 8 },

  addBtn: {
    margin: 16, marginBottom: 0, backgroundColor: '#3D4DC4',
    paddingVertical: 10, borderRadius: 8, alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  eventCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  eventDateBlock: { alignItems: 'center', width: 44 },
  eventMonth: { fontSize: 11, color: '#3D4DC4', fontWeight: '600' },
  eventDay: { fontSize: 24, fontWeight: '700', color: '#212121' },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: '#212121', marginBottom: 4 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  eventLocation: { fontSize: 13, color: '#616161' },
  eventAttendees: { fontSize: 12, color: '#767676' },
  attendBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 16, borderWidth: 1, borderColor: '#3D4DC4',
  },
  attendBtnActive: { backgroundColor: '#3D4DC4' },
  attendText: { fontSize: 13, color: '#3D4DC4', fontWeight: '600' },
  attendTextActive: { color: '#fff' },

  pendingSection: {
    backgroundColor: '#FFF8E1', borderRadius: 10, padding: 14,
    marginBottom: 8, gap: 8,
  },
  pendingSectionTitle: { fontSize: 13, fontWeight: '700', color: '#F57F17' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingUid: { flex: 1, fontSize: 13, color: '#424242' },
  approveBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: '#3D4DC4',
  },
  approveBtnText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  rejectBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  rejectBtnText: { fontSize: 12, color: '#767676' },

  memberRow: {
    backgroundColor: '#fff', padding: 14, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#ECEFFE', justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarText: { fontSize: 16, fontWeight: '700', color: '#3D4DC4' },
  memberName: { flex: 1, fontSize: 14, color: '#424242', fontWeight: '500' },
  ownerBadge: {
    fontSize: 11, color: '#3D4DC4', backgroundColor: '#ECEFFE',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },
  memberJoined: { fontSize: 11, color: '#BDBDBD' },

  leaveBtn: {
    marginTop: 16, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: '#FFCDD2', alignItems: 'center',
  },
  leaveBtnText: { fontSize: 14, color: '#C62828', fontWeight: '600' },

  bookHeader: {
    backgroundColor: '#fff', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookCover: { width: 48, height: 68, borderRadius: 4 },
  bookCoverPlaceholder: {
    width: 48, height: 68, borderRadius: 4,
    backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center',
  },
  bookMeta: { flex: 1 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: '#212121', marginBottom: 4 },
  bookAuthor: { fontSize: 12, color: '#616161' },
  bookHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bookHeaderTitle: { fontSize: 13, fontWeight: '700', color: '#424242' },
  addBookBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#3D4DC4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  addBookBtnText: { fontSize: 12, color: '#3D4DC4', fontWeight: '600' },
  bookListContent: { paddingVertical: 4, gap: 10 },
  bookCard: { width: 100, backgroundColor: '#F8F8F8', borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  bookCardSelected: { borderColor: '#3D4DC4', backgroundColor: '#F3F4FC' },
  bookCardTitle: { fontSize: 11, fontWeight: '600', color: '#212121', textAlign: 'center', marginTop: 6 },
  removeSelectedBookBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#E74C3C' },
  removeSelectedBookBtnText: { fontSize: 13, color: '#E74C3C', fontWeight: '600' },
  bookCardAuthor: { fontSize: 10, color: '#9E9E9E', textAlign: 'center', marginTop: 2 },
  bookPickerSection: { marginBottom: 12 },
  bookPickerLabel: { fontSize: 13, color: '#616161', marginBottom: 6 },
  bookChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#F8F8F8' },
  bookChipActive: { backgroundColor: '#3D4DC4', borderColor: '#3D4DC4' },
  bookChipText: { fontSize: 13, color: '#424242' },
  bookChipTextActive: { color: '#fff', fontWeight: '600' },
  changeBookBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
    borderWidth: 1, borderColor: '#3D4DC4',
  },
  changeBookBtnText: { fontSize: 12, color: '#3D4DC4', fontWeight: '600' },
  noBookRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noBookText: { fontSize: 14, color: '#9E9E9E' },
  selectBookBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
    backgroundColor: '#3D4DC4',
  },
  selectBookBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },

  topicActions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  topicActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#3D4DC4',
  },
  topicActionBtnText: { fontSize: 13, color: '#3D4DC4', fontWeight: '600' },

  topicCard: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#F0F0F0', gap: 6,
  },
  topicTypeBadge: {
    alignSelf: 'flex-start', fontSize: 12, color: '#3D4DC4',
    backgroundColor: '#ECEFFE', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4, overflow: 'hidden',
  },
  topicTypeBadgeAgree: { color: '#E67E22', backgroundColor: '#FEF0E7' },
  topicTitle: { fontSize: 15, fontWeight: '600', color: '#212121' },
  topicBody: { fontSize: 13, color: '#616161', lineHeight: 18 },
  topicMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topicMeta: { fontSize: 12, color: '#767676' },

  emptyContainer: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#767676' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContainer: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#212121', marginBottom: 20 },
  input: {
    width: '100%', height: 48, borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 8, paddingHorizontal: 16, marginBottom: 12, fontSize: 15,
  },
  datePickerBtn: {
    width: '100%', height: 48, borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 8, paddingHorizontal: 16, marginBottom: 12, justifyContent: 'center',
  },
  datePickerText: { fontSize: 15, color: '#212121' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  switchLabel: { fontSize: 15, color: '#424242' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
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
  inviteCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  inviteCodeLabel: { fontSize: 12, color: '#767676', marginBottom: 4 },
  inviteCodeValue: { fontSize: 20, fontWeight: '700', color: '#212121', letterSpacing: 3 },
  regenBtn: {
    backgroundColor: '#3D4DC4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  regenBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  deleteClubBtn: {
    marginTop: 16, paddingVertical: 12, alignItems: 'center',
    borderRadius: 8, borderWidth: 1, borderColor: '#FFCDD2',
  },
  deleteClubBtnText: { fontSize: 14, color: '#C62828', fontWeight: '600' },
});
