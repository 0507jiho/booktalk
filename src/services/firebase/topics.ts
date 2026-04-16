import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  doc,
  where,
  serverTimestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Analytics } from '@/services/analytics';
import { Topic, TopicType } from '@/types';

const PAGE_SIZE = 20;

/**
 * trendScore = (answerCount + likeCount) / (hoursSinceCreated + 2)^1.5
 * Hacker News 방식의 시간 감쇠 적용
 */
export function computeTopicTrendScore(
  answerCount: number,
  likeCount: number,
  createdAtMillis: number,
): number {
  const hours = (Date.now() - createdAtMillis) / 3600000;
  return (answerCount + likeCount) / Math.pow(hours + 2, 1.5);
}

export async function fetchTopics(
  filter: TopicType | 'all'
): Promise<{ topics: Topic[] }> {
  const constraints: QueryConstraint[] = [limit(PAGE_SIZE)];

  if (filter !== 'all') {
    constraints.unshift(where('type', '==', filter));
  }

  const snap = await getDocs(query(collection(db, 'topics'), ...constraints));
  const topics: Topic[] = snap.docs.map(d => ({ topicId: d.id, ...d.data() } as Topic));

  const sorted = topics.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

  return { topics: sorted };
}

export async function fetchBookTopics(bookId: string): Promise<Topic[]> {
  const snap = await getDocs(
    query(collection(db, 'topics'), where('bookId', '==', bookId), orderBy('createdAt', 'desc'), limit(50))
  );
  return snap.docs.map(d => ({ topicId: d.id, ...d.data() } as Topic));
}

export async function fetchClubTopics(clubId: string): Promise<Topic[]> {
  const snap = await getDocs(
    query(collection(db, 'topics'), where('clubId', '==', clubId), orderBy('createdAt', 'desc'), limit(50))
  );
  return snap.docs.map(d => ({ topicId: d.id, ...d.data() } as Topic));
}

export async function fetchTopic(topicId: string): Promise<Topic | null> {
  const snap = await getDoc(doc(db, 'topics', topicId));
  if (!snap.exists()) return null;
  return { topicId: snap.id, ...snap.data() } as Topic;
}

export async function fetchUserTopics(userId: string): Promise<Topic[]> {
  const snap = await getDocs(
    query(
      collection(db, 'topics'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
  );
  return snap.docs.map(d => ({ topicId: d.id, ...d.data() } as Topic));
}

export async function fetchTrendingTopics(pageSize = 20): Promise<Topic[]> {
  const snap = await getDocs(
    query(collection(db, 'topics'), orderBy('trendScore', 'desc'), limit(pageSize))
  );
  return snap.docs.map(d => ({ topicId: d.id, ...d.data() } as Topic));
}

/** 이미지 업로드 전에 topicId를 미리 확보할 때 사용 */
export function generateTopicId(): string {
  return doc(collection(db, 'topics')).id;
}

function buildTopicPayload(
  data: Omit<Topic, 'topicId' | 'answerCount' | 'likeCount' | 'trendScore' | 'createdAt'>,
  trendScore: number,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ...data,
    answerCount: 0,
    likeCount: 0,
    trendScore,
    createdAt: serverTimestamp(),
  };
  // 빈 배열은 Firestore에 저장하지 않음 (역호환 + 불필요한 필드 방지)
  if (!data.references?.length) {
    delete payload.references;
  } else {
    // Firestore는 undefined 값을 허용하지 않으므로 optional 필드 제거
    payload.references = data.references.map(ref => {
      const r: Record<string, unknown> = { id: ref.id, type: ref.type, order: ref.order };
      if (ref.quote) {
        const q: Record<string, unknown> = { text: ref.quote.text };
        if (ref.quote.page !== undefined) q.page = ref.quote.page;
        r.quote = q;
      }
      if (ref.link) {
        const l: Record<string, unknown> = { url: ref.link.url };
        if (ref.link.title !== undefined) l.title = ref.link.title;
        if (ref.link.description !== undefined) l.description = ref.link.description;
        r.link = l;
      }
      return r;
    });
  }
  if (!data.subQuestions?.length) delete payload.subQuestions;
  return payload;
}

export async function createTopic(
  data: Omit<Topic, 'topicId' | 'answerCount' | 'likeCount' | 'trendScore' | 'createdAt'>
): Promise<string> {
  const trendScore = computeTopicTrendScore(0, 0, Date.now());
  const ref = await addDoc(collection(db, 'topics'), buildTopicPayload(data, trendScore));
  Analytics.topicCreated(data.type);
  return ref.id;
}

/**
 * 미리 확보한 ID로 발제 문서를 생성.
 * 이미지 참고자료가 있을 때 Storage 업로드 → 문서 생성 순서로 진행할 때 사용.
 */
export async function createTopicWithId(
  topicId: string,
  data: Omit<Topic, 'topicId' | 'answerCount' | 'likeCount' | 'trendScore' | 'createdAt'>
): Promise<void> {
  const trendScore = computeTopicTrendScore(0, 0, Date.now());
  await setDoc(doc(db, 'topics', topicId), buildTopicPayload(data, trendScore));
  Analytics.topicCreated(data.type);
}
