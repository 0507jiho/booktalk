import {
  collection,
  query,
  where,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Review, Topic } from '@/types';
import { FeedItem } from '@/stores/feedStore';

const PAGE_SIZE = 20;

async function getFollowingIds(uid: string): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, 'follows'), where('followerId', '==', uid))
  );
  return snap.docs.map(d => d.data().followingId as string);
}

export async function fetchFeed(
  uid: string
): Promise<{ items: FeedItem[] }> {
  console.log('[feed] fetchFeed uid:', uid);

  const followingIds = await getFollowingIds(uid);
  console.log('[feed] followingIds:', followingIds);

  if (followingIds.length === 0) {
    console.log('[feed] 팔로잉 없음 → 빈 피드');
    return { items: [] };
  }

  const ids = followingIds.slice(0, 30);

  const [reviewsSnap, topicsSnap] = await Promise.all([
    getDocs(query(collection(db, 'reviews'), where('userId', 'in', ids), limit(PAGE_SIZE))),
    getDocs(query(collection(db, 'topics'), where('userId', 'in', ids), limit(PAGE_SIZE))),
  ]);

  console.log('[feed] reviews:', reviewsSnap.size, 'topics:', topicsSnap.size);

  const reviews: FeedItem[] = reviewsSnap.docs.map(d => ({
    type: 'review',
    data: { reviewId: d.id, ...d.data() } as Review,
  }));

  const topics: FeedItem[] = topicsSnap.docs.map(d => ({
    type: 'topic',
    data: { topicId: d.id, ...d.data() } as Topic,
  }));

  const merged = [...reviews, ...topics].sort((a, b) => {
    const aMs = a.data.createdAt?.toMillis?.() ?? 0;
    const bMs = b.data.createdAt?.toMillis?.() ?? 0;
    return bMs - aMs;
  });

  console.log('[feed] merged items:', merged.length);
  return { items: merged };
}
