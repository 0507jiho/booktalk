import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '@/screens/onboarding/WelcomeScreen';
import GenreSelectScreen from '@/screens/onboarding/GenreSelectScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  GenreSelect: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="GenreSelect" component={GenreSelectScreen} />
    </Stack.Navigator>
  );
}
