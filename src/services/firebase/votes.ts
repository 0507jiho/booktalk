import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { AnswerSide } from '@/types';

export async function fetchVote(uid: string, topicId: string): Promise<AnswerSide | null> {
  const snap = await getDoc(doc(db, 'votes', `${uid}_${topicId}`));
  return snap.exists() ? (snap.data().side as AnswerSide) : null;
}

/**
 * 투표 등록/변경/취소 (트랜잭션).
 * newSide === null 이면 기존 투표 취소.
 * 같은 side 재선택 시 취소(토글).
 */
export async function castVote(
  uid: string,
  topicId: string,
  newSide: AnswerSide,
): Promise<{ userVote: AnswerSide | null; proCount: number; conCount: number; neutralCount: number }> {
  const voteRef = doc(db, 'votes', `${uid}_${topicId}`);
  const topicRef = doc(db, 'topics', topicId);

  let result = { userVote: null as AnswerSide | null, proCount: 0, conCount: 0, neutralCount: 0 };

  await runTransaction(db, async (tx) => {
    const [voteSnap, topicSnap] = await Promise.all([tx.get(voteRef), tx.get(topicRef)]);
    const prevSide = voteSnap.exists() ? (voteSnap.data().side as AnswerSide) : null;
    const td = topicSnap.data() ?? {};

    let proCount = (td.proCount ?? 0) as number;
    let conCount = (td.conCount ?? 0) as number;
    let neutralCount = (td.neutralCount ?? 0) as number;

    // 이전 투표 제거
    if (prevSide === 'pro') proCount = Math.max(0, proCount - 1);
    else if (prevSide === 'con') conCount = Math.max(0, conCount - 1);
    else if (prevSide === 'neutral') neutralCount = Math.max(0, neutralCount - 1);

    // 같은 선택지 재선택 = 취소
    const isCancelling = prevSide === newSide;
    const appliedSide: AnswerSide | null = isCancelling ? null : newSide;

    if (!isCancelling) {
      if (newSide === 'pro') proCount++;
      else if (newSide === 'con') conCount++;
      else if (newSide === 'neutral') neutralCount++;
    }

    if (appliedSide) {
      tx.set(voteRef, { userId: uid, topicId, side: appliedSide, createdAt: serverTimestamp() });
    } else {
      if (voteSnap.exists()) tx.delete(voteRef);
    }

    tx.update(topicRef, { proCount, conCount, neutralCount });
    result = { userVote: appliedSide, proCount, conCount, neutralCount };
  });

  return result;
}
