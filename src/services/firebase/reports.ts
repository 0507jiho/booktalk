import {
  collection,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { ReportTargetType, ReportReason } from '@/types';

export async function createReport(
  reporterId: string,
  targetId: string,
  targetType: ReportTargetType,
  reason: ReportReason
): Promise<void> {
  await addDoc(collection(db, 'reports'), {
    targetId,
    targetType,
    reporterId,
    reason,
    createdAt: serverTimestamp(),
  });
}

export async function createBlock(blockerId: string, blockedId: string): Promise<void> {
  const blockId = `${blockerId}_${blockedId}`;
  await setDoc(doc(db, 'blocks', blockId), {
    blockerId,
    blockedId,
    createdAt: serverTimestamp(),
  });
}
