import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { LikeTargetType } from '@/types';

const TARGET_COLLECTION: Record<LikeTargetType, string> = {
  review: 'reviews',
  topic: 'topics',
  answer: 'answers',
  reply: 'replies',
  clubAnswer: 'clubAnswers',
};

export async function checkIsLiked(
  uid: string,
  targetId: string,
  targetType: LikeTargetType,
): Promise<boolean> {
  const snap = await getDoc(doc(db, 'likes', `${uid}_${targetId}_${targetType}`));
  return snap.exists();
}

/** isLiked + 최신 likeCount를 병렬 조회 — 포커스 복귀 시 stale 방지용 */
export async function fetchLikeState(
  uid: string,
  targetId: string,
  targetType: LikeTargetType,
): Promise<{ isLiked: boolean; likeCount: number }> {
  const likeRef = doc(db, 'likes', `${uid}_${targetId}_${targetType}`);
  const targetRef = doc(db, TARGET_COLLECTION[targetType], targetId);
  const [likeSnap, targetSnap] = await Promise.all([getDoc(likeRef), getDoc(targetRef)]);
  return {
    isLiked: likeSnap.exists(),
    likeCount: (targetSnap.data()?.likeCount ?? 0) as number,
  };
}

export async function fetchLikedSet(
  uid: string,
  targetIds: string[],
  targetType: LikeTargetType,
): Promise<Set<string>> {
  if (!targetIds.length) return new Set();
  const liked = new Set<string>();
  await Promise.all(
    targetIds.map(async (id) => {
      const snap = await getDoc(doc(db, 'likes', `${uid}_${id}_${targetType}`));
      if (snap.exists()) liked.add(id);
    }),
  );
  return liked;
}

export async function toggleLike(
  uid: string,
  targetId: string,
  targetType: LikeTargetType,
): Promise<{ liked: boolean; likeCount: number }> {
  const likeRef = doc(db, 'likes', `${uid}_${targetId}_${targetType}`);
  const targetRef = doc(db, TARGET_COLLECTION[targetType], targetId);

  let liked = false;
  let likeCount = 0;

  await runTransaction(db, async (tx) => {
    const [likeSnap, targetSnap] = await Promise.all([
      tx.get(likeRef),
      tx.get(targetRef),
    ]);

    const currentCount = (targetSnap.data()?.likeCount ?? 0) as number;
    const alreadyLiked = likeSnap.exists();
    const delta = alreadyLiked ? -1 : 1;
    const newCount = Math.max(0, currentCount + delta);

    if (alreadyLiked) {
      tx.delete(likeRef);
    } else {
      tx.set(likeRef, {
        userId: uid,
        targetId,
        targetType,
        createdAt: serverTimestamp(),
      });
    }

    const targetUpdate: Record<string, unknown> = { likeCount: increment(delta) };

    // trendScore 재계산 (topic 좋아요 시)
    if (targetType === 'topic' && targetSnap.exists()) {
      const data = targetSnap.data();
      const answerCount = (data.answerCount ?? 0) as number;
      const createdMillis = (data.createdAt?.toMillis() ?? Date.now()) as number;
      const hours = (Date.now() - createdMillis) / 3600000;
      targetUpdate.trendScore = (answerCount + newCount) / Math.pow(hours + 2, 1.5);
    }

    tx.update(targetRef, targetUpdate);
    liked = !alreadyLiked;
    likeCount = newCount;
  });

  return { liked, likeCount };
}
