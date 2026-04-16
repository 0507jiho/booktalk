import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TopicListScreen from '@/screens/topic/TopicListScreen';
import TopicDetailScreen from '@/screens/topic/TopicDetailScreen';
import WriteTopicScreen from '@/screens/topic/WriteTopicScreen';
import BookDetailScreen from '@/screens/home/BookDetailScreen';
import UserProfileScreen from '@/screens/profile/UserProfileScreen';

export type TopicStackParamList = {
  TopicList: undefined;
  TopicDetail: { topicId: string };
  WriteTopic: {
    bookId: string;
    bookTitle: string;
    bookCoverUrl: string;
  };
  BookDetail: {
    bookId: string;
    title: string;
    author: string;
    publisher: string;
    cover: string;
    description?: string;
  };
  UserProfile: { userId: string };
};

const Stack = createNativeStackNavigator<TopicStackParamList>();

export default function TopicStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#212121' },
        headerShadowVisible: false,
        headerTintColor: '#4A90E2',
      }}
    >
      <Stack.Screen name="TopicList" component={TopicListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TopicDetail" component={TopicDetailScreen} options={{ title: '발제 상세' }} />
      <Stack.Screen name="WriteTopic" component={WriteTopicScreen} options={{ title: '발제 작성' }} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: '프로필' }} />
    </Stack.Navigator>
  );
}
