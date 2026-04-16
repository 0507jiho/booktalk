import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/services/firebase/config';

GoogleSignin.configure({
  webClientId: '793791694591-lll969641q9o2tsof76n23nft49qo4ri.apps.googleusercontent.com',
});

export async function signInWithGoogle(): Promise<void> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (response.type !== 'success') return;

  const { idToken } = response.data;
  const credential = GoogleAuthProvider.credential(idToken);
  const { user } = await signInWithCredential(auth, credential);

  // 신규 유저면 Firestore 프로필 생성
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName ?? '이름 없음',
      bio: '',
      photoURL: user.photoURL ?? null,
      followersCount: 0,
      followingCount: 0,
      badgeIds: [],
      createdAt: serverTimestamp(),
    });
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch {
    // 구글 로그인 사용자가 아닐 수 있음 — 무시
  }
}

export { statusCodes };
