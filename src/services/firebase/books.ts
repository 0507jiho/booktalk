import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Book } from '@/types';
import { AladinBook } from '@/services/aladin/client';

export function aladinToBook(aladin: AladinBook): Book {
  return {
    bookId: aladin.isbn13,
    title: aladin.title,
    author: aladin.author,
    publisher: aladin.publisher,
    coverUrl: aladin.cover,
    isbn: aladin.isbn13,
    avgRating: 0,
    reviewCount: 0,
    popularityScore: 0,
  };
}

export async function saveBook(aladin: AladinBook): Promise<void> {
  const bookId = aladin.isbn13;
  if (!bookId) return;
  const ref = doc(db, 'books', bookId);
  const snap = await getDoc(ref);
  // 이미 존재하면 핵심 메타만 merge (avgRating/reviewCount 덮어쓰지 않음)
  if (snap.exists()) {
    await setDoc(
      ref,
      {
        title: aladin.title,
        author: aladin.author,
        publisher: aladin.publisher,
        coverUrl: aladin.cover,
        isbn: aladin.isbn13,
      },
      { merge: true }
    );
  } else {
    await setDoc(ref, aladinToBook(aladin));
  }
}

/**
 * 리뷰 추가 시 호출 — avgRating, reviewCount, popularityScore 원자적 업데이트
 * popularityScore = reviewCount * 10 + avgRating * 2
 */
export async function updateBookStats(bookId: string, newRating: number): Promise<void> {
  const ref = doc(db, 'books', bookId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const oldCount = (data.reviewCount ?? 0) as number;
    const oldAvg = (data.avgRating ?? 0) as number;
    const newCount = oldCount + 1;
    const newAvg = (oldAvg * oldCount + newRating) / newCount;
    const popularityScore = newCount * 10 + newAvg * 2;
    tx.update(ref, {
      reviewCount: newCount,
      avgRating: Math.round(newAvg * 10) / 10,
      popularityScore,
    });
  });
}

export async function fetchTrendingBooks(pageSize = 10): Promise<Book[]> {
  const snap = await getDocs(
    query(collection(db, 'books'), orderBy('popularityScore', 'desc'), limit(pageSize))
  );
  return snap.docs.map(d => ({ bookId: d.id, ...d.data() } as Book));
}

export async function fetchBook(bookId: string): Promise<Book | null> {
  const snap = await getDoc(doc(db, 'books', bookId));
  if (!snap.exists()) return null;
  return { bookId: snap.id, ...snap.data() } as Book;
}
