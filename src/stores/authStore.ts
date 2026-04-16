import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '@/types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  onboardingDone: boolean;
  setFirebaseUser: (user: FirebaseUser | null) => void;
  setUserProfile: (profile: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setOnboardingDone: (done: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  firebaseUser: null,
  userProfile: null,
  isLoading: false,
  isInitialized: false,
  onboardingDone: false,
  setFirebaseUser: user => set({ firebaseUser: user }),
  setUserProfile: profile => set({ userProfile: profile }),
  setLoading: loading => set({ isLoading: loading }),
  setInitialized: initialized => set({ isInitialized: initialized }),
  setOnboardingDone: done => set({ onboardingDone: done }),
  reset: () => set({ firebaseUser: null, userProfile: null, isLoading: false }),
}));
