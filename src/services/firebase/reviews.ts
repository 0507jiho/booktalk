import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Analytics } from '@/services/analytics';
import { Review } from '@/types';
import { updateBookStats } from '@/services/firebase/books';

export async function fetchBookReviews(bookId: string): Promise<Review[]> {
  const snap = await getDocs(
    query(
      collection(db, 'reviews'),
      where('bookId', '==', bookId),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
  );
  return snap.docs.map(d => ({ reviewId: d.id, ...d.data() } as Review));
}

export async function fetchUserReviews(userId: string): Promise<Review[]> {
  const snap = await getDocs(
    query(
      collection(db, 'reviews'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
  );
  return snap.docs.map(d => ({ reviewId: d.id, ...d.data() } as Review));
}

export async function fetchTrendingReviews(pageSize = 5): Promise<Review[]> {
  const snap = await getDocs(
    query(collection(db, 'reviews'), orderBy('likeCount', 'desc'), limit(pageSize))
  );
  return snap.docs.map(d => ({ reviewId: d.id, ...d.data() } as Review));
}

export async function createReview(
  data: Omit<Review, 'reviewId' | 'likeCount' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'reviews'), {
    ...data,
    likeCount: 0,
    createdAt: serverTimestamp(),
  });
  // 책의 reviewCount, avgRating, popularityScore 갱신
  await updateBookStats(data.bookId, data.rating);
  Analytics.reviewCreated(data.bookId);
  return ref.id;
}
