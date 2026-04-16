import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { fetchTrendingTopics } from '@/services/firebase/topics';
import { Topic } from '@/types';
import { HomeStackParamList } from '@/navigation/HomeStackNavigator';
import dayjs from 'dayjs';

type Props = NativeStackScreenProps<HomeStackParamList, 'TrendingTopics'>;

const PRIMARY = '#3D4DC4';

export default function TrendingTopicsScreen({ navigation }: Props) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchTrendingTopics(50);
      setTopics(result);
    } catch (e) {
      console.error('지금 뜨는 발제 로드 실패:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <FlatList
      data={topics}
      keyExtractor={t => t.topicId}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('TopicDetail', { topicId: item.topicId })}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.typeBadge, item.type === 'agree-disagree' && styles.typeBadgeAgree]}>
              {item.type === 'agree-disagree' ? '찬반' : '자유'}
            </Text>
            {item.clubId && <Text style={styles.clubBadge}>모임</Text>}
            <Text style={styles.date}>{dayjs(item.createdAt.toDate()).format('MM.DD')}</Text>
          </View>
          <View style={styles.bookRow}>
            <Ionicons name="book-outline" size={11} color="#9BA5E0" />
            <Text style={styles.bookTitle} numberOfLines={1}>{item.bookTitle}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="chatbubble-outline" size={12} color="#767676" />
              <Text style={styles.metaText}>답변 {item.answerCount}개</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="heart-outline" size={12} color="#767676" />
              <Text style={styles.metaText}>{item.likeCount ?? 0}개</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      contentContainerStyle={topics.length === 0 ? styles.emptyContainer : styles.list}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={load} tintColor={PRIMARY} />
      }
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 60 }} />
        ) : (
          <View style={styles.empty}>
            <Ionicons name="trending-up-outline" size={40} color="#9BA5E0" />
            <Text style={styles.emptyText}>아직 발제 데이터가 없어요.</Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 8, backgroundColor: '#F7F8FF' },
  emptyContainer: { flex: 1, backgroundColor: '#F7F8FF' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 5,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECEFFE',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  typeBadge: {
    fontSize: 11,
    color: PRIMARY,
    backgroundColor: '#ECEFFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    fontWeight: '600',
  },
  typeBadgeAgree: { color: '#E67E22', backgroundColor: '#FEF0E7' },
  clubBadge: {
    fontSize: 11,
    color: '#27AE60',
    backgroundColor: '#E9F7EF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  date: { fontSize: 11, color: '#767676', marginLeft: 'auto' },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  bookTitle: { fontSize: 11, color: '#9BA5E0', fontWeight: '500', flexShrink: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#212121', lineHeight: 22, marginBottom: 4 },
  body: { fontSize: 13, color: '#616161', lineHeight: 19, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#767676' },
  empty: { paddingTop: 80, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#767676' },
});
