import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BookShelfScreen from '@/screens/home/BookShelfScreen';
import BookSearchScreen from '@/screens/home/BookSearchScreen';
import BookDetailScreen from '@/screens/home/BookDetailScreen';
import TopicDetailScreen from '@/screens/topic/TopicDetailScreen';
import ReviewDetailScreen from '@/screens/home/ReviewDetailScreen';
import WriteReviewScreen from '@/screens/home/WriteReviewScreen';
import WriteTopicScreen from '@/screens/topic/WriteTopicScreen';
import UserProfileScreen from '@/screens/profile/UserProfileScreen';

export type BookStackParamList = {
  BookShelf: undefined;
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
};

const Stack = createNativeStackNavigator<BookStackParamList>();

export default function BookStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#212121' },
        headerShadowVisible: false,
        headerTintColor: '#4A90E2',
      }}
    >
      <Stack.Screen name="BookShelf" component={BookShelfScreen} options={{ title: '내 서재' }} />
      <Stack.Screen name="BookSearch" component={BookSearchScreen} options={{ title: '책 검색' }} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="TopicDetail" component={TopicDetailScreen} options={{ title: '발제 상세' }} />
      <Stack.Screen name="ReviewDetail" component={ReviewDetailScreen} options={{ title: '리뷰' }} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: '리뷰 작성' }} />
      <Stack.Screen name="WriteTopic" component={WriteTopicScreen} options={{ title: '발제 작성' }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: '프로필' }} />
    </Stack.Navigator>
  );
}
