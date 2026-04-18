import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { ClubStackParamList } from '@/navigation/ClubStackNavigator';
import { fetchBookTopics } from '@/services/firebase/topics';
import { addTopicToClub, removeTopicFromClub } from '@/services/firebase/clubs';
import { Topic } from '@/types';

type Props = NativeStackScreenProps<ClubStackParamList, 'SelectTopic'>;

export default function SelectTopicScreen({ route, navigation }: Props) {
  const { clubId, bookId, selectedTopicIds } = route.params;
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedTopicIds);

  useEffect(() => {
    fetchBookTopics(bookId)
      .then(setTopics)
      .catch(() => setTopics([]))
      .finally(() => setIsLoading(false));
  }, [bookId]);

  async function handleSelect(topic: Topic) {
    if (localSelectedIds.includes(topic.topicId)) return;
    setAdding(topic.topicId);
    try {
      await addTopicToClub(clubId, topic.topicId);
      setLocalSelectedIds(prev => [...prev, topic.topicId]);
    } catch {
      Alert.alert('오류', '발제 선택에 실패했습니다.');
    } finally {
      setAdding(null);
    }
  }

  async function handleDeselect(topic: Topic) {
    setRemoving(topic.topicId);
    try {
      await removeTopicFromClub(clubId, topic.topicId);
      setLocalSelectedIds(prev => prev.filter(id => id !== topic.topicId));
    } catch {
      Alert.alert('오류', '선택 해제에 실패했습니다.');
    } finally {
      setRemoving(null);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3D4DC4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={topics}
        keyExtractor={item => item.topicId}
        renderItem={({ item }) => {
          const alreadySelected = localSelectedIds.includes(item.topicId);
          const isBusy = adding === item.topicId || removing === item.topicId;
          return (
            <TouchableOpacity
              style={[styles.topicCard, alreadySelected && styles.topicCardSelected]}
              onPress={() => alreadySelected ? handleDeselect(item) : handleSelect(item)}
              disabled={isBusy}
              activeOpacity={0.7}
            >
              <View style={styles.topicHeader}>
                <Text style={[styles.typeBadge, item.type === 'agree-disagree' && styles.typeBadgeAgree]}>
                  {item.type === 'agree-disagree' ? '찬반' : '자유'}
                </Text>
                <Text style={styles.date}>{dayjs(item.createdAt.toDate()).format('MM.DD')}</Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="chatbubble-outline" size={12} color="#767676" />
                <Text style={styles.metaText}>답변 {item.answerCount}개</Text>
              </View>
              <View style={styles.statusBadge}>
                {isBusy ? (
                  <ActivityIndicator size="small" color="#3D4DC4" />
                ) : alreadySelected ? (
                  <Text style={styles.deselectLabel}>✓ 선택됨  (탭하여 해제)</Text>
                ) : (
                  <Text style={styles.selectLabel}>+ 선택</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.writeBtn}
            onPress={() => {
              // bookTitle/bookCoverUrl은 ClubDetailScreen에서 전달 필요
              // SelectTopicScreen에서 직접 접근 불가 → goBack 후 ClubDetail에서 처리
              navigation.navigate('WriteTopic', {
                bookId,
                bookTitle: '',
                bookCoverUrl: '',
                clubId,
              });
            }}
          >
            <Text style={styles.writeBtnText}>+ 새 발제 직접 작성</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>이 책에 등록된 발제가 없어요.</Text>
            <Text style={styles.emptySubText}>위 버튼으로 새 발제를 작성해보세요.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 10 },
  writeBtn: {
    backgroundColor: '#3D4DC4', paddingVertical: 12,
    borderRadius: 8, alignItems: 'center', marginBottom: 8,
  },
  writeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  topicCard: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#F0F0F0', gap: 6,
  },
  topicCardSelected: { borderColor: '#3D4DC4', backgroundColor: '#F3F4FC' },
  topicHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: {
    fontSize: 11, color: '#3D4DC4', backgroundColor: '#ECEFFE',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },
  typeBadgeAgree: { color: '#E67E22', backgroundColor: '#FEF0E7' },
  date: { fontSize: 11, color: '#9E9E9E' },
  title: { fontSize: 15, fontWeight: '600', color: '#212121' },
  body: { fontSize: 13, color: '#616161', lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#767676' },
  statusBadge: { alignSelf: 'flex-end', marginTop: 4 },
  selectedLabel: { fontSize: 13, color: '#3D4DC4', fontWeight: '600' },
  deselectLabel: { fontSize: 13, color: '#9E9E9E', fontWeight: '500' },
  selectLabel: { fontSize: 13, color: '#3D4DC4', fontWeight: '600' },
  empty: { paddingTop: 40, alignItems: 'center', gap: 6 },
  emptyText: { fontSize: 15, color: '#767676' },
  emptySubText: { fontSize: 13, color: '#9E9E9E' },
});
