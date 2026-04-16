import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { fetchTrendingBooks } from '@/services/firebase/books';
import { Book } from '@/types';
import { HomeStackParamList } from '@/navigation/HomeStackNavigator';
import { fixImageUrl } from '@/utils/image';

type Props = NativeStackScreenProps<HomeStackParamList, 'TrendingBooks'>;

const PRIMARY = '#3D4DC4';

export default function TrendingBooksScreen({ navigation }: Props) {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchTrendingBooks(50);
      setBooks(result);
    } catch (e) {
      console.error('인기 도서 로드 실패:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <FlatList
      data={books}
      keyExtractor={b => b.bookId}
      renderItem={({ item, index }) => (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('BookDetail', {
              bookId: item.bookId,
              title: item.title,
              author: item.author,
              publisher: item.publisher,
              cover: fixImageUrl(item.coverUrl),
            })
          }
        >
          <Text style={styles.rank}>{index + 1}</Text>
          {item.coverUrl ? (
            <Image
              source={{ uri: fixImageUrl(item.coverUrl) }}
              style={styles.cover}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Ionicons name="book-outline" size={22} color="#9BA5E0" />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
            <View style={styles.meta}>
              {item.avgRating > 0 && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#F5A623" />
                  <Text style={styles.ratingText}>{item.avgRating.toFixed(1)}</Text>
                </View>
              )}
              <View style={styles.reviewRow}>
                <Ionicons name="document-text-outline" size={12} color="#9BA5E0" />
                <Text style={styles.reviewText}>리뷰 {item.reviewCount}개</Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
        </TouchableOpacity>
      )}
      contentContainerStyle={books.length === 0 ? styles.emptyContainer : styles.list}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={load} tintColor={PRIMARY} />
      }
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 60 }} />
        ) : (
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={40} color="#9BA5E0" />
            <Text style={styles.emptyText}>아직 도서 데이터가 없어요.</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 5,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECEFFE',
  },
  rank: {
    width: 24,
    fontSize: 15,
    fontWeight: '700',
    color: '#3D4DC4',
    textAlign: 'center',
  },
  cover: {
    width: 48,
    height: 68,
    borderRadius: 4,
    backgroundColor: '#ECEFFE',
  },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: '#212121', lineHeight: 20, marginBottom: 3 },
  author: { fontSize: 12, color: '#767676', marginBottom: 6 },
  meta: { flexDirection: 'row', gap: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, color: '#767676' },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reviewText: { fontSize: 12, color: '#9BA5E0' },
  empty: { paddingTop: 80, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#767676' },
});
