import React, { useCallback, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { fixImageUrl } from '@/utils/image';
import { UserBook, ReadingStatus } from '@/types';
import { BookStackParamList } from '@/navigation/BookStackNavigator';

type Nav = NativeStackNavigationProp<BookStackParamList>;

type ShelfFilter = 'all' | ReadingStatus;

const FILTERS: { label: string; value: ShelfFilter }[] = [
  { label: '전체', value: 'all' },
  { label: '읽는 중', value: 'reading' },
  { label: '읽음', value: 'read' },
  { label: '담아둔 책', value: 'archived' },
];

const STATUS_LABEL: Record<ReadingStatus, string> = {
  reading: '읽는 중',
  read: '읽음',
  archived: '담아둔',
};

export default function BookShelfScreen() {
  const navigation = useNavigation<Nav>();
  const { firebaseUser } = useAuthStore();
  const { userBooks, isLoading, fetchUserBooks } = useProfileStore();
  const [filter, setFilter] = useState<ShelfFilter>('all');

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '내 서재',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('BookSearch')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="책 검색"
        >
          <Ionicons name="search" size={22} color="#4A90E2" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (firebaseUser?.uid) fetchUserBooks(firebaseUser.uid);
    }, [firebaseUser?.uid])
  );

  const filtered = filter === 'all' ? userBooks : userBooks.filter(b => b.status === filter);

  const readCount = userBooks.filter(b => b.status === 'read').length;
  const readingCount = userBooks.filter(b => b.status === 'reading').length;

  if (isLoading && userBooks.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4A90E2" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* 통계 바 */}
      <View style={styles.statsBar}>
        <Text style={styles.statText}>전체 <Text style={styles.statNum}>{userBooks.length}</Text>권</Text>
        <Text style={styles.statSep}>·</Text>
        <Text style={styles.statText}>읽음 <Text style={styles.statNum}>{readCount}</Text>권</Text>
        <Text style={styles.statSep}>·</Text>
        <Text style={styles.statText}>읽는 중 <Text style={styles.statNum}>{readingCount}</Text>권</Text>
      </View>

      {/* 필터 */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterBtn, filter === f.value && styles.filterBtnActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.bookId}
        numColumns={3}
        renderItem={({ item }) => (
          <BookCell
            item={item}
            onPress={() =>
              navigation.navigate('BookDetail', {
                bookId: item.bookId,
                title: item.bookTitle,
                author: item.author,
                publisher: '',
                cover: fixImageUrl(item.bookCoverUrl),
              })
            }
          />
        )}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.gridContent}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Text style={styles.emptyText}>서재가 비어있어요.</Text>
            <Text style={styles.emptySubText}>책을 검색해서 서재에 추가해 보세요.</Text>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => navigation.navigate('BookSearch')}
            >
              <Ionicons name="search" size={16} color="#fff" />
              <Text style={styles.searchButtonText}>책 검색하기</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

function BookCell({ item, onPress }: { item: UserBook; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.bookCell} onPress={onPress} activeOpacity={0.7}>
      <Image source={{ uri: fixImageUrl(item.bookCoverUrl) }} style={styles.bookCover} resizeMode="cover" />
      <View style={styles.statusBadge}>
        <Text style={styles.statusBadgeText}>{STATUS_LABEL[item.status]}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  statText: { fontSize: 13, color: '#616161' },
  statNum: { fontWeight: '700', color: '#212121' },
  statSep: { fontSize: 13, color: '#BDBDBD' },

  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  filterBtnActive: { backgroundColor: '#4A90E2' },
  filterText: { fontSize: 12, color: '#757575' },
  filterTextActive: { color: '#fff', fontWeight: '600' },

  gridContent: { padding: 4 },
  emptyContainer: { flex: 1 },
  emptyInner: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#424242' },
  emptySubText: { fontSize: 14, color: '#9E9E9E' },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  searchButtonText: { fontSize: 14, color: '#fff', fontWeight: '600' },

  bookCell: { flex: 1 / 3, margin: 4, aspectRatio: 0.7, position: 'relative' },
  bookCover: { width: '100%', height: '100%', borderRadius: 4 },
  statusBadge: {
    position: 'absolute', bottom: 4, left: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 3, paddingVertical: 2,
  },
  statusBadgeText: { color: '#fff', fontSize: 10, textAlign: 'center', fontWeight: '600' },
});
