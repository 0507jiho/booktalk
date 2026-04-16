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
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Event, Membership } from '@/types';

export async function fetchClubEvents(clubId: string): Promise<Event[]> {
  const snap = await getDocs(
    query(
      collection(db, 'events'),
      where('clubId', '==', clubId),
      orderBy('date', 'asc')
    )
  );
  return snap.docs.map(d => ({ eventId: d.id, ...d.data() } as Event));
}

export async function createEvent(
  clubId: string,
  title: string,
  date: Date,
  location: string,
  topicId?: string
): Promise<Event> {
  const ref = await addDoc(collection(db, 'events'), {
    clubId,
    title,
    date: Timestamp.fromDate(date),
    location,
    attendees: [],
    ...(topicId ? { topicId } : {}),
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return { eventId: ref.id, ...snap.data() } as Event;
}

export async function toggleEventAttendance(
  eventId: string,
  uid: string,
  attending: boolean
): Promise<void> {
  await updateDoc(doc(db, 'events', eventId), {
    attendees: attending ? arrayUnion(uid) : arrayRemove(uid),
  });
}

export async function updateEvent(
  eventId: string,
  updates: Partial<Pick<Event, 'title' | 'date' | 'location'>>
): Promise<void> {
  await updateDoc(doc(db, 'events', eventId), updates);
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, 'events', eventId));
}

export async function fetchClubMembers(clubId: string): Promise<Membership[]> {
  const snap = await getDocs(
    query(
      collection(db, 'memberships'),
      where('clubId', '==', clubId),
      where('status', '==', 'active')
    )
  );
  return snap.docs.map(d => ({ ...d.data() } as Membership));
}
