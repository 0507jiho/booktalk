import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '@/screens/home/HomeScreen';
import BookSearchScreen from '@/screens/home/BookSearchScreen';
import BookDetailScreen from '@/screens/home/BookDetailScreen';
import TopicDetailScreen from '@/screens/topic/TopicDetailScreen';
import ReviewDetailScreen from '@/screens/home/ReviewDetailScreen';
import WriteReviewScreen from '@/screens/home/WriteReviewScreen';
import WriteTopicScreen from '@/screens/topic/WriteTopicScreen';
import UserProfileScreen from '@/screens/profile/UserProfileScreen';
import NotificationScreen from '@/screens/notification/NotificationScreen';
import TrendingBooksScreen from '@/screens/home/TrendingBooksScreen';
import TrendingTopicsScreen from '@/screens/home/TrendingTopicsScreen';

export type HomeStackParamList = {
  HomeFeed: undefined;
  BookSearch: undefined;
  BookDetail: {
    bookId: string;
    title: string;
    author: string;
    publisher: string;
    cover: string;
    description?: string;
  };
  TopicDetail: { topicId: string };
  ReviewDetail: {
    reviewId: string;
    bookId: string;
    rating: number;
    content: string;
    likeCount: number;
    createdAtMillis: number;
    bookTitle?: string;
    bookCoverUrl?: string;
    author?: string;
    displayName?: string;
  };
  WriteReview: {
    bookId: string;
    bookTitle: string;
    bookCoverUrl: string;
    author: string;
  };
  WriteTopic: {
    bookId: string;
    bookTitle: string;
    bookCoverUrl: string;
  };
  UserProfile: { userId: string };
  Notification: undefined;
  TrendingBooks: undefined;
  TrendingTopics: undefined;
};

function HomeFeedHeader({ navigation }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <Text style={styles.headerTitle}>홈</Text>
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.navigate('BookSearch')}
        activeOpacity={0.7}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPlaceholder}>책 제목, 저자 검색...</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('Notification')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="알림"
      >
        <Ionicons name="notifications-outline" size={24} color="#424242" />
      </TouchableOpacity>
    </View>
  );
}

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#212121' },
        headerShadowVisible: false,
        headerTintColor: '#3D4DC4',
      }}
    >
      <Stack.Screen
        name="HomeFeed"
        component={HomeScreen}
        options={{ header: (props) => <HomeFeedHeader {...props} /> }}
      />
      <Stack.Screen name="BookSearch" component={BookSearchScreen} options={{ title: '책 검색' }} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="TopicDetail" component={TopicDetailScreen} options={{ title: '발제 상세' }} />
      <Stack.Screen name="ReviewDetail" component={ReviewDetailScreen} options={{ title: '리뷰' }} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: '리뷰 작성' }} />
      <Stack.Screen name="WriteTopic" component={WriteTopicScreen} options={{ title: '발제 작성' }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: '프로필' }} />
      <Stack.Screen name="Notification" component={NotificationScreen} options={{ title: '알림', headerShown: true }} />
      <Stack.Screen name="TrendingBooks" component={TrendingBooksScreen} options={{ title: '인기 도서' }} />
      <Stack.Screen name="TrendingTopics" component={TrendingTopicsScreen} options={{ title: '지금 뜨는 발제' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 36,
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: { fontSize: 14 },
  searchPlaceholder: { fontSize: 14, color: '#BDBDBD' },
});
