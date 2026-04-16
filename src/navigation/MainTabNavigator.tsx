import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeStackNavigator from '@/navigation/HomeStackNavigator';
import TopicStackNavigator from '@/navigation/TopicStackNavigator';
import ClubStackNavigator from '@/navigation/ClubStackNavigator';
import BookStackNavigator from '@/navigation/BookStackNavigator';
import ProfileScreen from '@/screens/profile/ProfileScreen';

export type MainTabParamList = {
  Home: undefined;
  Topic: undefined;
  Book: undefined;
  Club: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Topic: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Book: { active: 'book', inactive: 'book-outline' },
  Club: { active: 'people', inactive: 'people-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#212121' },
        headerShadowVisible: false,
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#767676',
        tabBarStyle: { paddingTop: 8, paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{ title: '홈', headerShown: false }} />
      <Tab.Screen name="Topic" component={TopicStackNavigator} options={{ title: '발제', headerShown: false }} />
      <Tab.Screen name="Book" component={BookStackNavigator} options={{ title: '책', headerShown: false }} />
      <Tab.Screen name="Club" component={ClubStackNavigator} options={{ title: '모임', headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '프로필', headerShown: false }} />
    </Tab.Navigator>
  );
}
