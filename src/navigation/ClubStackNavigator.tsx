import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ClubListScreen from '@/screens/club/ClubListScreen';
import ClubDetailScreen from '@/screens/club/ClubDetailScreen';
import ClubTopicDetailScreen from '@/screens/club/ClubTopicDetailScreen';
import SelectBookScreen from '@/screens/club/SelectBookScreen';
import SelectTopicScreen from '@/screens/club/SelectTopicScreen';
import WriteTopicScreen from '@/screens/topic/WriteTopicScreen';

export type ClubStackParamList = {
  ClubList: undefined;
  ClubDetail: { clubId: string };
  ClubTopicDetail: { topicId: string; clubId: string };
  SelectBook: { clubId: string };
  SelectTopic: { clubId: string; bookId: string; selectedTopicIds: string[] };
  WriteTopic: { bookId: string; bookTitle: string; bookCoverUrl: string; clubId: string };
};

const Stack = createNativeStackNavigator<ClubStackParamList>();

export default function ClubStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#212121' },
        headerShadowVisible: false,
        headerTintColor: '#4A90E2',
      }}
    >
      <Stack.Screen name="ClubList" component={ClubListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ClubDetail" component={ClubDetailScreen} options={{ title: '모임 상세' }} />
      <Stack.Screen name="ClubTopicDetail" component={ClubTopicDetailScreen} options={{ title: '모임 토론' }} />
      <Stack.Screen name="SelectBook" component={SelectBookScreen} options={{ title: '모임 책 선택' }} />
      <Stack.Screen name="SelectTopic" component={SelectTopicScreen} options={{ title: '발제 선택' }} />
      <Stack.Screen name="WriteTopic" component={WriteTopicScreen} options={{ title: '발제 작성' }} />
    </Stack.Navigator>
  );
}
