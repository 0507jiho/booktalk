import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';

function followDocId(followerId: string, followingId: string) {
  return `${followerId}_${followingId}`;
}

export async function checkIsFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const snap = await getDoc(doc(db, 'follows', followDocId(followerId, followingId)));
  return snap.exists();
}

export async function toggleFollow(
  followerId: string,
  followingId: string
): Promise<{ isFollowing: boolean }> {
  const followRef = doc(db, 'follows', followDocId(followerId, followingId));
  const followerUserRef = doc(db, 'users', followerId);
  const followingUserRef = doc(db, 'users', followingId);

  let isFollowing = false;

  await runTransaction(db, async (tx) => {
    const followSnap = await tx.get(followRef);
    const alreadyFollowing = followSnap.exists();
    const delta = alreadyFollowing ? -1 : 1;

    if (alreadyFollowing) {
      tx.delete(followRef);
    } else {
      tx.set(followRef, {
        followerId,
        followingId,
        createdAt: serverTimestamp(),
      });
    }

    tx.update(followerUserRef, { followingCount: increment(delta) });
    tx.update(followingUserRef, { followersCount: increment(delta) });
    isFollowing = !alreadyFollowing;
  });

  return { isFollowing };
}
