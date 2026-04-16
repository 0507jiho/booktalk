import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { User } from '@/types';

export async function fetchUserProfile(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as User;
}
