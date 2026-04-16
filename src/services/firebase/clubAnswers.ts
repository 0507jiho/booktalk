import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { ClubAnswer, AnswerSide } from '@/types';
import { checkIsLiked } from '@/services/firebase/likes';

export async function fetchClubAnswers(topicId: string, clubId: string): Promise<ClubAnswer[]> {
  const snap = await getDocs(
    query(
      collection(db, 'clubAnswers'),
      where('topicId', '==', topicId),
      where('clubId', '==', clubId),
      orderBy('createdAt', 'desc')
    )
  );
  return snap.docs.map(d => ({ clubAnswerId: d.id, ...d.data() } as ClubAnswer));
}

export async function addClubAnswer(params: {
  clubId: string;
  topicId: string;
  userId: string;
  displayName: string;
  side: AnswerSide;
  content: string;
}): Promise<ClubAnswer> {
  const ref = await addDoc(collection(db, 'clubAnswers'), {
    ...params,
    likeCount: 0,
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return { clubAnswerId: ref.id, ...snap.data() } as ClubAnswer;
}

export async function toggleClubAnswerLike(
  uid: string,
  clubAnswerId: string,
): Promise<{ liked: boolean; likeCount: number }> {
  const alreadyLiked = await checkIsLiked(uid, clubAnswerId, 'clubAnswer');
  const delta = alreadyLiked ? -1 : 1;

  const answerRef = doc(db, 'clubAnswers', clubAnswerId);
  await updateDoc(answerRef, { likeCount: increment(delta) });

  const likeDocId = `${uid}_${clubAnswerId}_clubAnswer`;
  if (alreadyLiked) {
    await deleteDoc(doc(db, 'likes', likeDocId));
  } else {
    await setDoc(doc(db, 'likes', likeDocId), {
      userId: uid,
      targetId: clubAnswerId,
      targetType: 'clubAnswer',
      createdAt: serverTimestamp(),
    });
  }

  const snap = await getDoc(answerRef);
  return {
    liked: !alreadyLiked,
    likeCount: (snap.data()?.likeCount as number) ?? 0,
  };
}
