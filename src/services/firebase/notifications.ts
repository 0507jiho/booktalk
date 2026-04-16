import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Notification } from '@/types';

const PAGE_SIZE = 30;

export async function fetchNotifications(uid: string): Promise<Notification[]> {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    )
  );
  return snap.docs.map(d => ({ notificationId: d.id, ...d.data() } as Notification));
}

export async function markAllAsRead(uid: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      where('isRead', '==', false)
    )
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(doc(db, 'notifications', d.id), { isRead: true }));
  await batch.commit();
}
