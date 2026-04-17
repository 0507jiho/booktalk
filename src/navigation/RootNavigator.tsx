import React, { useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { auth, db } from '@/services/firebase/config';
import { User } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { registerPushToken } from '@/services/push';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import OnboardingNavigator from './OnboardingNavigator';

SplashScreen.preventAutoHideAsync();

export default function RootNavigator() {
  const {
    firebaseUser,
    isInitialized,
    onboardingDone,
    setFirebaseUser,
    setUserProfile,
    setInitialized,
    setOnboardingDone,
  } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        const autoLogin = await AsyncStorage.getItem('auto_login');
        if (autoLogin === 'false') {
          await signOut(auth);
          return;
        }
      }
      setFirebaseUser(user);
      if (user) {
        const [snap, done] = await Promise.all([
          getDoc(doc(db, 'users', user.uid)),
          AsyncStorage.getItem('onboarding_done'),
        ]);
        if (snap.exists()) {
          setUserProfile(snap.data() as User);
        }
        setOnboardingDone(done === 'true');
        registerPushToken(user.uid);
      } else {
        setUserProfile(null);
        setOnboardingDone(false);
      }
      setInitialized(true);
      SplashScreen.hideAsync();
    });
    return unsubscribe;
  }, []);

  if (!isInitialized) return null;

  if (!firebaseUser) return <AuthNavigator />;
  if (!onboardingDone) return <OnboardingNavigator />;
  return <MainTabNavigator />;
}
