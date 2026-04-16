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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '@/navigation/HomeStackNavigator';
import { searchBooks, AladinBook } from '@/services/aladin/client';

type Props = NativeStackScreenProps<HomeStackParamList, 'BookSearch'>;

export default function BookSearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AladinBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
    } catch (e) {
      console.error('책 검색 실패:', e);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  function handleBookPress(book: AladinBook) {
    navigation.navigate('BookDetail', {
      bookId: book.isbn13 || String(book.itemId),
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      cover: book.cover,
      description: book.description,
    });
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
          clearButtonMode="while-editing"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>검색</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.isbn13 || String(item.itemId)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.bookItem} onPress={() => handleBookPress(item)} activeOpacity={0.7}>
              <Image source={{ uri: item.cover }} style={styles.cover} resizeMode="cover" />
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
                <Text style={styles.bookPublisher} numberOfLines={1}>{item.publisher}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            searched ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>검색 결과가 없어요.</Text>
              </View>
            ) : (
              <View style={styles.hint}>
                <Text style={styles.hintText}>읽은 책, 읽고 싶은 책을 검색해보세요.</Text>
              </View>
            )
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  searchBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  list: { paddingVertical: 8 },
  bookItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 14,
    alignItems: 'center',
  },
  cover: { width: 56, height: 80, borderRadius: 4 },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 15, fontWeight: '600', color: '#212121', marginBottom: 4, lineHeight: 20 },
  bookAuthor: { fontSize: 13, color: '#616161', marginBottom: 2 },
  bookPublisher: { fontSize: 12, color: '#767676' },
  emptyText: { fontSize: 15, color: '#767676' },
  hint: { paddingTop: 60, alignItems: 'center' },
  hintText: { fontSize: 15, color: '#BDBDBD' },
});
