import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '@/services/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { registerPushToken } from '@/services/push';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import OnboardingNavigator from './OnboardingNavigator';

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
      setFirebaseUser(user);
      if (user) {
        const [snap, done] = await Promise.all([
          getDoc(doc(db, 'users', user.uid)),
          AsyncStorage.getItem('onboarding_done'),
        ]);
        if (snap.exists()) {
          setUserProfile(snap.data() as any);
        }
        setOnboardingDone(done === 'true');
        registerPushToken(user.uid);
      } else {
        setUserProfile(null);
        setOnboardingDone(false);
      }
      setInitialized(true);
    });
    return unsubscribe;
  }, []);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (!firebaseUser) return <AuthNavigator />;
  if (!onboardingDone) return <OnboardingNavigator />;
  return <MainTabNavigator />;
}
