import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import * as Notifications from 'expo-notifications';
import RootNavigator from '@/navigation/RootNavigator';
import { ThemeProvider } from '@/theme';

function App() {
  const navigationRef = useRef<NavigationContainerRef<ParamListBase>>(null);
  const notificationResponseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

  useEffect(() => {
    // 알림 탭 → 홈 탭의 알림 화면으로 이동
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener(() => {
        navigationRef.current?.navigate('Home', { screen: 'Notification' });
      });

    return () => {
      notificationResponseListener.current?.remove();
    };
  }, []);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

registerRootComponent(App);
