import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

async function getFcmToken(uid: string): Promise<string | null> {
  const snap = await db.doc(`users/${uid}`).get();
  return (snap.data()?.fcmToken as string) ?? null;
}

async function saveNotification(params: {
  userId: string;
  type: string;
  fromUserId?: string;
  targetId?: string;
}): Promise<void> {
  await db.collection('notifications').add({
    ...params,
    isRead: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function sendPush(token: string, title: string, body: string): Promise<void> {
  await messaging.send({
    token,
    notification: { title, body },
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  });
}

// ─── 1. 좋아요 알림 ─────────────────────────────────────────────────────────────

export const onLikeCreated = onDocumentCreated('likes/{likeId}', async (event) => {
  const like = event.data?.data();
  if (!like) return;

  const { userId: fromUserId, targetId, targetType } = like as {
    userId: string;
    targetId: string;
    targetType: string;
  };

  const collectionMap: Record<string, string> = {
    review: 'reviews',
    topic: 'topics',
    answer: 'answers',
    reply: 'replies',
  };
  const col = collectionMap[targetType];
  if (!col) return;

  const targetSnap = await db.doc(`${col}/${targetId}`).get();
  const targetOwnerId = targetSnap.data()?.userId as string | undefined;
  if (!targetOwnerId || targetOwnerId === fromUserId) return;

  const typeLabel: Record<string, string> = {
    review: '리뷰', topic: '발제', answer: '답변', reply: '답글',
  };

  await saveNotification({ userId: targetOwnerId, type: 'like', fromUserId, targetId });

  const token = await getFcmToken(targetOwnerId);
  if (!token) return;

  const fromSnap = await db.doc(`users/${fromUserId}`).get();
  const fromName = (fromSnap.data()?.displayName as string) ?? '누군가';
  await sendPush(token, '좋아요', `${fromName}님이 내 ${typeLabel[targetType] ?? '글'}에 좋아요를 눌렀어요.`);
});

// ─── 2. 팔로우 알림 ─────────────────────────────────────────────────────────────

export const onFollowCreated = onDocumentCreated('follows/{followId}', async (event) => {
  const follow = event.data?.data();
  if (!follow) return;

  const { followerId, followingId } = follow as { followerId: string; followingId: string };
  if (!followerId || !followingId) return;

  await saveNotification({ userId: followingId, type: 'follow', fromUserId: followerId });

  const token = await getFcmToken(followingId);
  if (!token) return;

  const fromSnap = await db.doc(`users/${followerId}`).get();
  const fromName = (fromSnap.data()?.displayName as string) ?? '누군가';
  await sendPush(token, '새 팔로워', `${fromName}님이 팔로우하기 시작했어요.`);
});

// ─── 3. 답변 알림 ───────────────────────────────────────────────────────────────

export const onAnswerCreated = onDocumentCreated('answers/{answerId}', async (event) => {
  const answer = event.data?.data();
  if (!answer) return;

  const { topicId, userId: fromUserId } = answer as { topicId: string; userId: string };

  const topicSnap = await db.doc(`topics/${topicId}`).get();
  const topicOwnerId = topicSnap.data()?.userId as string | undefined;
  if (!topicOwnerId || topicOwnerId === fromUserId) return;

  const topicTitle = (topicSnap.data()?.title as string) ?? '발제';

  await saveNotification({ userId: topicOwnerId, type: 'answer', fromUserId, targetId: topicId });

  const token = await getFcmToken(topicOwnerId);
  if (!token) return;

  const fromSnap = await db.doc(`users/${fromUserId}`).get();
  const fromName = (fromSnap.data()?.displayName as string) ?? '누군가';
  await sendPush(token, '새 답변', `${fromName}님이 "${topicTitle}"에 답변을 남겼어요.`);
});

// ─── 4. 일정 하루 전 알림 (매일 오전 9시 KST) ────────────────────────────────────

export const eventReminder = onSchedule(
  { schedule: '0 0 * * *', timeZone: 'Asia/Seoul' },
  async () => {
    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(now.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const eventsSnap = await db
      .collection('events')
      .where('date', '>=', admin.firestore.Timestamp.fromDate(tomorrowStart))
      .where('date', '<=', admin.firestore.Timestamp.fromDate(tomorrowEnd))
      .get();

    for (const eventDoc of eventsSnap.docs) {
      const event = eventDoc.data();
      const attendees: string[] = event.attendees ?? [];
      const eventTitle: string = event.title ?? '일정';

      for (const uid of attendees) {
        await saveNotification({ userId: uid, type: 'event_reminder', targetId: eventDoc.id });
        const token = await getFcmToken(uid);
        if (!token) continue;
        await sendPush(token, '내일 일정이 있어요', `"${eventTitle}" 일정이 내일로 예정되어 있어요.`);
      }
    }
  }
);

// ─── 5. 알라딘 API 프록시 ────────────────────────────────────────────────────────

const ALADIN_API_KEY = process.env.ALADIN_API_KEY ?? '';
const ALADIN_BASE = 'https://www.aladin.co.kr/ttb/api';

export const aladinSearch = onCall(async (request) => {
  const query = (request.data.query as string) ?? '';
  const start = (request.data.start as number) ?? 1;

  const params = new URLSearchParams({
    TTBKey: ALADIN_API_KEY,
    Query: query,
    QueryType: 'Keyword',
    MaxResults: '20',
    start: String(start),
    SearchTarget: 'Book',
    output: 'js',
    Version: '20131101',
  });

  const res = await fetch(`${ALADIN_BASE}/ItemSearch.aspx?${params}`);
  if (!res.ok) throw new HttpsError('internal', '알라딘 검색 실패');
  return res.json();
});

export const aladinLookup = onCall(async (request) => {
  const isbn = (request.data.isbn as string) ?? '';

  const params = new URLSearchParams({
    TTBKey: ALADIN_API_KEY,
    itemIdType: 'ISBN13',
    ItemId: isbn,
    output: 'js',
    Version: '20131101',
  });

  const res = await fetch(`${ALADIN_BASE}/ItemLookUp.aspx?${params}`);
  if (!res.ok) throw new HttpsError('internal', '알라딘 조회 실패');
  const json = await res.json() as { item?: unknown[] };
  return json.item?.[0] ?? null;
});
