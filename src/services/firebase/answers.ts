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
  increment,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Analytics } from '@/services/analytics';
import { Answer, AnswerSide } from '@/types';
import { computeTopicTrendScore } from '@/services/firebase/topics';

export async function fetchUserAnswers(userId: string): Promise<Answer[]> {
  const snap = await getDocs(
    query(
      collection(db, 'answers'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
  );
  return snap.docs.map(d => ({ answerId: d.id, ...d.data() } as Answer));
}

export async function fetchAnswers(topicId: string): Promise<Answer[]> {
  const snap = await getDocs(
    query(
      collection(db, 'answers'),
      where('topicId', '==', topicId),
      orderBy('createdAt', 'desc')
    )
  );
  return snap.docs.map(d => ({ answerId: d.id, ...d.data() } as Answer));
}

export async function addAnswer(
  topicId: string,
  userId: string,
  displayName: string,
  side: AnswerSide,
  content: string,
  subQuestionId?: string,
): Promise<Answer> {
  const answerData: Record<string, unknown> = {
    topicId,
    userId,
    displayName,
    side,
    content,
    likeCount: 0,
    createdAt: serverTimestamp(),
  };
  if (subQuestionId) answerData.subQuestionId = subQuestionId;

  const ref = await addDoc(collection(db, 'answers'), answerData);

  // answerCount 증가 + trendScore 재계산
  const topicRef = doc(db, 'topics', topicId);
  const topicSnap = await getDoc(topicRef);
  const td = topicSnap.data() ?? {};
  const newAnswerCount = ((td.answerCount ?? 0) as number) + 1;
  const trendScore = computeTopicTrendScore(
    newAnswerCount,
    (td.likeCount ?? 0) as number,
    (td.createdAt?.toMillis() ?? Date.now()) as number,
  );
  await updateDoc(topicRef, { answerCount: newAnswerCount, trendScore });

  Analytics.answerCreated(side);
  const snap = await getDoc(ref);
  return { answerId: ref.id, ...snap.data() } as Answer;
}

export async function updateAnswer(answerId: string, content: string): Promise<void> {
  await updateDoc(doc(db, 'answers', answerId), { content });
}

export async function deleteAnswer(answerId: string, topicId: string): Promise<void> {
  await deleteDoc(doc(db, 'answers', answerId));
  await updateDoc(doc(db, 'topics', topicId), { answerCount: increment(-1) });
}

export async function toggleAnswerLike(
  answerId: string,
  userId: string,
  liked: boolean
): Promise<void> {
  const likeId = `${userId}_${answerId}_answer`;
  if (liked) {
    await addDoc(collection(db, 'likes'), {
      userId,
      targetId: answerId,
      targetType: 'answer',
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'answers', answerId), { likeCount: increment(1) });
  } else {
    const snap = await getDocs(
      query(collection(db, 'likes'), where('userId', '==', userId), where('targetId', '==', answerId))
    );
    snap.docs.forEach(d => deleteDoc(d.ref));
    await updateDoc(doc(db, 'answers', answerId), { likeCount: increment(-1) });
  }
}
