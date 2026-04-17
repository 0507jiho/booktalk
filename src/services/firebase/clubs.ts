import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  limit,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Club, Membership, User, BookRef } from '@/types';

export async function fetchClub(clubId: string): Promise<Club | null> {
  const snap = await getDoc(doc(db, 'clubs', clubId));
  if (!snap.exists()) return null;
  return { clubId: snap.id, ...snap.data() } as Club;
}

export async function fetchMyClubs(uid: string): Promise<Club[]> {
  const membershipsSnap = await getDocs(
    query(collection(db, 'memberships'), where('uid', '==', uid), where('status', '==', 'active'))
  );

  const clubIds = membershipsSnap.docs.map(d => d.data().clubId as string);
  if (clubIds.length === 0) return [];

  const clubs = await Promise.all(
    clubIds.map(async id => {
      const snap = await getDoc(doc(db, 'clubs', id));
      if (!snap.exists()) return null;
      return { clubId: snap.id, ...snap.data() } as Club;
    })
  );

  return clubs.filter(Boolean) as Club[];
}

export async function createClub(
  uid: string,
  name: string,
  description: string,
  isPrivate: boolean
): Promise<Club> {
  const clubData: Record<string, unknown> = {
    name,
    description,
    ownerId: uid,
    memberCount: 1,
    isPrivate,
    createdAt: serverTimestamp(),
  };
  if (isPrivate) clubData.inviteCode = makeInviteCode();
  const clubRef = await addDoc(collection(db, 'clubs'), clubData);

  await setDoc(doc(db, 'memberships', membershipId(clubRef.id, uid)), {
    clubId: clubRef.id,
    uid,
    role: 'owner',
    status: 'active',
    joinedAt: serverTimestamp(),
  });

  const snap = await getDoc(clubRef);
  return { clubId: clubRef.id, ...snap.data() } as Club;
}

// ─── 수정 / 삭제 ──────────────────────────────────────

export async function updateClub(
  clubId: string,
  updates: Partial<Pick<Club, 'name' | 'description' | 'isPrivate' | 'bookId' | 'bookTitle' | 'bookCoverUrl' | 'bookAuthor' | 'selectedTopicIds'>>
): Promise<void> {
  await updateDoc(doc(db, 'clubs', clubId), updates);
}

export async function deleteClub(clubId: string): Promise<void> {
  // memberships 삭제
  const memSnap = await getDocs(query(collection(db, 'memberships'), where('clubId', '==', clubId)));
  await Promise.all(memSnap.docs.map(d => deleteDoc(d.ref)));
  // club 삭제
  await deleteDoc(doc(db, 'clubs', clubId));
}

// ─── 책 / 발제 선택 ──────────────────────────────────

export async function selectBookForClub(
  clubId: string,
  book: { bookId: string; bookTitle: string; bookCoverUrl: string; bookAuthor: string }
): Promise<void> {
  await updateDoc(doc(db, 'clubs', clubId), {
    bookId: book.bookId,
    bookTitle: book.bookTitle,
    bookCoverUrl: book.bookCoverUrl,
    bookAuthor: book.bookAuthor,
    selectedTopicIds: [], // 책 변경 시 기존 선택 초기화
  });
}

export async function addBookToClub(clubId: string, book: BookRef): Promise<void> {
  await updateDoc(doc(db, 'clubs', clubId), { books: arrayUnion(book) });
}

export async function removeBookFromClub(clubId: string, bookId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'clubs', clubId));
  const current: BookRef[] = snap.data()?.books ?? [];
  const updated = current.filter(b => b.bookId !== bookId);
  await updateDoc(doc(db, 'clubs', clubId), { books: updated });
}

export async function addTopicToClub(clubId: string, topicId: string): Promise<void> {
  await updateDoc(doc(db, 'clubs', clubId), { selectedTopicIds: arrayUnion(topicId) });
}

export async function removeTopicFromClub(clubId: string, topicId: string): Promise<void> {
  await updateDoc(doc(db, 'clubs', clubId), { selectedTopicIds: arrayRemove(topicId) });
}

// ─── 멤버 관리 ────────────────────────────────────────

/** 멤버십 ID: {clubId}_{uid} */
function membershipId(clubId: string, uid: string) {
  return `${clubId}_${uid}`;
}

export async function joinClub(clubId: string, uid: string): Promise<'active' | 'pending'> {
  const clubSnap = await getDoc(doc(db, 'clubs', clubId));
  if (!clubSnap.exists()) throw new Error('존재하지 않는 모임입니다.');
  const isPrivate = clubSnap.data().isPrivate as boolean;
  const status: 'active' | 'pending' = isPrivate ? 'pending' : 'active';

  const memRef = doc(db, 'memberships', membershipId(clubId, uid));
  const existing = await getDoc(memRef);
  if (existing.exists()) throw new Error('이미 가입했거나 요청 중인 모임입니다.');

  await setDoc(memRef, {
    clubId,
    uid,
    role: 'member',
    status,
    joinedAt: serverTimestamp(),
  });

  if (status === 'active') {
    await updateDoc(doc(db, 'clubs', clubId), { memberCount: increment(1) });
  }
  return status;
}

export async function leaveClub(clubId: string, uid: string): Promise<void> {
  const memRef = doc(db, 'memberships', membershipId(clubId, uid));
  const snap = await getDoc(memRef);
  if (!snap.exists()) return;
  if (snap.data().role === 'owner') throw new Error('오너는 탈퇴할 수 없습니다. 모임을 삭제해주세요.');
  await deleteDoc(memRef);
  if (snap.data().status === 'active') {
    await updateDoc(doc(db, 'clubs', clubId), { memberCount: increment(-1) });
  }
}

export async function removeMember(clubId: string, uid: string): Promise<void> {
  const memRef = doc(db, 'memberships', membershipId(clubId, uid));
  const snap = await getDoc(memRef);
  if (!snap.exists()) return;
  await deleteDoc(memRef);
  if (snap.data().status === 'active') {
    await updateDoc(doc(db, 'clubs', clubId), { memberCount: increment(-1) });
  }
}

export async function approveMember(clubId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'memberships', membershipId(clubId, uid)), { status: 'active' });
  await updateDoc(doc(db, 'clubs', clubId), { memberCount: increment(1) });
}

export async function rejectMember(clubId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, 'memberships', membershipId(clubId, uid)));
}

// ─── 멤버 조회 ────────────────────────────────────────

export async function fetchPendingMembers(clubId: string): Promise<Membership[]> {
  const snap = await getDocs(
    query(collection(db, 'memberships'), where('clubId', '==', clubId), where('status', '==', 'pending'))
  );
  return snap.docs.map(d => ({ ...d.data() } as Membership));
}

export interface MemberWithProfile extends Membership {
  displayName: string;
}

export async function fetchClubMembersWithProfile(clubId: string): Promise<MemberWithProfile[]> {
  const snap = await getDocs(
    query(collection(db, 'memberships'), where('clubId', '==', clubId), where('status', '==', 'active'))
  );
  const memberships = snap.docs.map(d => d.data() as Membership);
  const members = await Promise.all(
    memberships.map(async m => {
      const userSnap = await getDoc(doc(db, 'users', m.uid));
      const displayName = (userSnap.data() as User | undefined)?.displayName ?? m.uid.slice(0, 8);
      return { ...m, displayName };
    })
  );
  return members;
}

// ─── 공개 모임 탐색 ──────────────────────────────────

export async function fetchPublicClubs(maxResults = 20): Promise<Club[]> {
  const snap = await getDocs(
    query(collection(db, 'clubs'), where('isPrivate', '==', false), limit(maxResults))
  );
  return snap.docs.map(d => ({ clubId: d.id, ...d.data() } as Club));
}

export async function checkIsMember(clubId: string, uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'memberships', `${clubId}_${uid}`));
  return snap.exists() && snap.data().status === 'active';
}

function makeInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function generateInviteCode(clubId: string): Promise<string> {
  const code = makeInviteCode();
  await updateDoc(doc(db, 'clubs', clubId), { inviteCode: code });
  return code;
}

export async function joinByInviteCode(code: string, uid: string): Promise<Club> {
  const snap = await getDocs(
    query(collection(db, 'clubs'), where('inviteCode', '==', code.toUpperCase()), limit(1))
  );
  if (snap.empty) throw new Error('유효하지 않은 초대 코드입니다.');
  const clubDoc = snap.docs[0];
  const club = { clubId: clubDoc.id, ...clubDoc.data() } as Club;
  await joinClub(club.clubId, uid);
  return club;
}

export async function searchClubs(keyword: string, maxResults = 20): Promise<Club[]> {
  if (!keyword.trim()) return fetchPublicClubs(maxResults);
  const end = keyword + '\uf8ff';
  const snap = await getDocs(
    query(
      collection(db, 'clubs'),
      where('isPrivate', '==', false),
      orderBy('name'),
      where('name', '>=', keyword),
      where('name', '<=', end),
      limit(maxResults),
    )
  );
  return snap.docs.map(d => ({ clubId: d.id, ...d.data() } as Club));
}
