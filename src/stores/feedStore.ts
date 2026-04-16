import { create } from 'zustand';
import { Review, Topic } from '@/types';

export type FeedItem =
  | { type: 'review'; data: Review }
  | { type: 'topic'; data: Topic };

interface FeedState {
  items: FeedItem[];
  isLoading: boolean;
  hasMore: boolean;
  lastDocId: string | null;
  setItems: (items: FeedItem[]) => void;
  appendItems: (items: FeedItem[]) => void;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setLastDocId: (id: string | null) => void;
  reset: () => void;
}

export const useFeedStore = create<FeedState>(set => ({
  items: [],
  isLoading: false,
  hasMore: true,
  lastDocId: null,
  setItems: items => set({ items }),
  appendItems: items => set(state => ({ items: [...state.items, ...items] })),
  setLoading: loading => set({ isLoading: loading }),
  setHasMore: hasMore => set({ hasMore }),
  setLastDocId: id => set({ lastDocId: id }),
  reset: () => set({ items: [], isLoading: false, hasMore: true, lastDocId: null }),
}));
