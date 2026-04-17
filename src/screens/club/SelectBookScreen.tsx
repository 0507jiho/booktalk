import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Keyboard,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ClubStackParamList } from '@/navigation/ClubStackNavigator';
import { searchBooks, AladinBook } from '@/services/aladin/client';
import { addBookToClub } from '@/services/firebase/clubs';
import { fixImageUrl } from '@/utils/image';

type Props = NativeStackScreenProps<ClubStackParamList, 'SelectBook'>;

export default function SelectBookScreen({ route, navigation }: Props) {
  const { clubId } = route.params;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AladinBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    Keyboard.dismiss();
    setIsLoading(true);
    setSearched(true);
    try {
      const res = await searchBooks(q);
      setResults(res.item ?? []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  async function handleSelect(book: AladinBook) {
    setIsSelecting(true);
    try {
      await addBookToClub(clubId, {
        bookId: book.isbn13 || String(book.itemId),
        title: book.title,
        coverUrl: book.cover,
        author: book.author,
      });
      navigation.goBack();
    } catch {
      Alert.alert('오류', '책 선택에 실패했습니다.');
    } finally {
      setIsSelecting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="책 제목, 저자, ISBN 검색..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>검색</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color="#3D4DC4" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => String(item.itemId)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bookRow}
              onPress={() => handleSelect(item)}
              disabled={isSelecting}
              activeOpacity={0.7}
            >
              <Image source={{ uri: fixImageUrl(item.cover) }} style={styles.cover} />
              <View style={styles.bookInfo}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
                <Text style={styles.publisher} numberOfLines={1}>{item.publisher}</Text>
              </View>
              <Text style={styles.selectBtn}>선택</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            searched ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>검색 결과가 없어요.</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>책 제목이나 저자를 검색해보세요.</Text>
              </View>
            )
          }
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  searchBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 8,
  },
  input: {
    flex: 1, height: 40, backgroundColor: '#F5F5F5',
    borderRadius: 8, paddingHorizontal: 14, fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#3D4DC4', borderRadius: 8,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  loader: { marginTop: 40 },
  list: { padding: 12, gap: 8 },
  bookRow: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10,
    padding: 12, gap: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  cover: { width: 50, height: 72, borderRadius: 4 },
  bookInfo: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: '#212121', marginBottom: 4 },
  author: { fontSize: 12, color: '#616161', marginBottom: 2 },
  publisher: { fontSize: 11, color: '#9E9E9E' },
  selectBtn: {
    fontSize: 13, fontWeight: '700', color: '#3D4DC4',
    paddingHorizontal: 8, paddingVertical: 4,
  },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9E9E9E' },
});
