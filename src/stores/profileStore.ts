import { create } from 'zustand';
import { UserBook, Review, Topic, Answer } from '@/types';
import { fetchUserBooks } from '@/services/firebase/userBooks';
import { fetchUserReviews } from '@/services/firebase/reviews';
import { fetchUserTopics } from '@/services/firebase/topics';
import { fetchUserAnswers } from '@/services/firebase/answers';

interface ProfileState {
  userBooks: UserBook[];
  myReviews: Review[];
  myTopics: Topic[];
  myAnswers: Answer[];
  isLoading: boolean;
  fetchUserBooks: (userId: string) => Promise<void>;
  fetchMyContent: (userId: string) => Promise<void>;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  userBooks: [],
  myReviews: [],
  myTopics: [],
  myAnswers: [],
  isLoading: false,

  fetchUserBooks: async (userId: string) => {
    set({ isLoading: true });
    try {
      const books = await fetchUserBooks(userId);
      set({ userBooks: books });
    } catch (e) {
      console.error('내가 읽은 책 로드 실패:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMyContent: async (userId: string) => {
    set({ isLoading: true });
    try {
      const [reviews, topics, answers] = await Promise.all([
        fetchUserReviews(userId),
        fetchUserTopics(userId),
        fetchUserAnswers(userId),
      ]);
      set({ myReviews: reviews, myTopics: topics, myAnswers: answers });
    } catch (e) {
      console.error('내가 쓴 글 로드 실패:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () => set({ userBooks: [], myReviews: [], myTopics: [], myAnswers: [], isLoading: false }),
}));
