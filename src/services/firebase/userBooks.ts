import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { UserBook, ReadingStatus } from '@/types';

function docId(userId: string, bookId: string) {
  return `${userId}_${bookId}`;
}

export async function setUserBook(
  userId: string,
  book: { bookId: string; bookTitle: string; bookCoverUrl: string; author: string },
  status: ReadingStatus,
  myRating?: number
): Promise<void> {
  const id = docId(userId, book.bookId);
  const data: Omit<UserBook, 'addedAt'> & { addedAt: unknown } = {
    userId,
    bookId: book.bookId,
    bookTitle: book.bookTitle,
    bookCoverUrl: book.bookCoverUrl,
    author: book.author,
    status,
    addedAt: serverTimestamp(),
  };
  if (myRating !== undefined) data.myRating = myRating;
  await setDoc(doc(db, 'userBooks', id), data, { merge: true });
}

export async function fetchUserBooks(
  userId: string,
  status?: ReadingStatus
): Promise<UserBook[]> {
  const constraints: Parameters<typeof query>[1][] = [where('userId', '==', userId)];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('addedAt', 'desc'));
  const snap = await getDocs(query(collection(db, 'userBooks'), ...constraints));
  return snap.docs.map(d => d.data() as UserBook);
}

export async function removeUserBook(userId: string, bookId: string): Promise<void> {
  await deleteDoc(doc(db, 'userBooks', docId(userId, bookId)));
}
