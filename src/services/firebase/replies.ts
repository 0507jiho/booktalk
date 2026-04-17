import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Analytics } from '@/services/analytics';
import { Reply } from '@/types';

export async function fetchReplies(answerId: string): Promise<Reply[]> {
  const snap = await getDocs(
    query(
      collection(db, 'replies'),
      where('answerId', '==', answerId),
      orderBy('createdAt', 'asc')
    )
  );
  return snap.docs.map(d => ({ replyId: d.id, ...d.data() } as Reply));
}

export async function addReply(
  answerId: string,
  userId: string,
  displayName: string,
  content: string
): Promise<Reply> {
  const ref = await addDoc(collection(db, 'replies'), {
    answerId,
    userId,
    displayName,
    content,
    likeCount: 0,
    createdAt: serverTimestamp(),
  });
  Analytics.replyCreated();
  const snap = await getDoc(ref);
  return { replyId: ref.id, ...snap.data() } as Reply;
}

export async function updateReply(replyId: string, content: string): Promise<void> {
  await updateDoc(doc(db, 'replies', replyId), { content });
}

export async function deleteReply(replyId: string): Promise<void> {
  await deleteDoc(doc(db, 'replies', replyId));
}
