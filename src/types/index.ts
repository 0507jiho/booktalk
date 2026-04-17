import { Timestamp } from 'firebase/firestore';

// ─── User ─────────────────────────────────────────────
export interface User {
  uid: string;
  displayName: string;
  bio: string;
  photoURL: string | null;
  followersCount: number;
  followingCount: number;
  badgeIds: string[];
  createdAt: Timestamp;
  fcmToken?: string;
}

// ─── Book ─────────────────────────────────────────────
export interface Book {
  bookId: string;
  title: string;
  author: string;
  publisher: string;
  coverUrl: string;
  isbn: string;
  avgRating: number;
  reviewCount: number;
  popularityScore?: number; // reviewCount * 10 + avgRating * 2
}

// ─── Review ───────────────────────────────────────────
export interface Review {
  reviewId: string;
  bookId: string;
  bookTitle: string;    // 목록/프로필 탭 표시용 비정규화
  bookCoverUrl: string;
  userId: string;
  displayName: string;  // 작성자 이름 (작성 시점 기록)
  rating: 1 | 2 | 3 | 4 | 5;
  content: string;
  likeCount: number;
  hasSpoiler?: boolean;
  createdAt: Timestamp;
}

// ─── Topic Reference (참고 자료) ──────────────────────
export type ReferenceType = 'quote' | 'link' | 'image';

/** 책 인용 */
export interface BookQuote {
  text: string;
  page?: number;
}

/** 외부 링크 */
export interface ExternalLink {
  url: string;
  title?: string;
  description?: string;
}

/** 이미지 첨부 */
export interface TopicImage {
  uri: string;        // Firebase Storage URL
  caption?: string;
  width?: number;
  height?: number;
}

/** 참고 자료 유니온 */
export interface TopicReference {
  id: string;         // nanoid
  type: ReferenceType;
  quote?: BookQuote;
  link?: ExternalLink;
  image?: TopicImage;
  order: number;
}

// ─── Sub Question (세부 질문) ─────────────────────────
export interface SubQuestion {
  id: string;         // nanoid
  text: string;
  order: number;
}

// ─── Topic (발제) ──────────────────────────────────────
export type TopicType = 'free' | 'agree-disagree';

export interface Topic {
  topicId: string;
  bookId: string;
  bookTitle: string;    // 목록/프로필 탭 표시용 비정규화
  bookCoverUrl: string;
  userId: string;
  displayName: string;  // 작성자 이름 (작성 시점 기록)
  type: TopicType;
  title: string;
  body: string;
  answerCount: number;
  likeCount?: number;
  trendScore?: number;  // (answerCount + likeCount) / (hoursSinceCreated + 2)^1.5
  proCount?: number;      // agree-disagree 타입 전용
  conCount?: number;      // agree-disagree 타입 전용
  neutralCount?: number;  // agree-disagree 타입 전용
  proLabel?: string;      // 커스텀 찬성 레이블 (기본: '찬성')
  conLabel?: string;      // 커스텀 반대 레이블 (기본: '반대')
  createdAt: Timestamp;
  clubId?: string; // 모임 소속 발제인 경우
  references?: TopicReference[];   // 참고 자료 (최대 10개)
  subQuestions?: SubQuestion[];    // 세부 질문 (최대 5개)
  hasSpoiler?: boolean;
}

// ─── Answer (답변) ─────────────────────────────────────
export type AnswerSide = 'pro' | 'con' | 'neutral';

export interface Answer {
  answerId: string;
  topicId: string;
  userId: string;
  displayName?: string;
  side: AnswerSide;
  content: string;
  likeCount: number;
  createdAt: Timestamp;
  subQuestionId?: string;  // 연결된 세부 질문 ID
}

// ─── Reply (답글) ──────────────────────────────────────
export interface Reply {
  replyId: string;
  answerId: string;
  userId: string;
  displayName?: string;
  content: string;
  likeCount: number;
  createdAt: Timestamp;
}

// ─── Like ─────────────────────────────────────────────
export type LikeTargetType = 'review' | 'topic' | 'answer' | 'reply' | 'clubAnswer';

export interface Like {
  userId: string;
  targetId: string;
  targetType: LikeTargetType;
  createdAt: Timestamp;
}

// ─── Follow ───────────────────────────────────────────
export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: Timestamp;
}

// ─── UserBook (읽기 상태) ──────────────────────────────
export type ReadingStatus = 'reading' | 'read' | 'archived';

export interface UserBook {
  userId: string;
  bookId: string;
  bookTitle: string;
  bookCoverUrl: string;
  author: string;
  status: ReadingStatus;
  myRating?: number;
  addedAt: Timestamp;
}
// Firestore: userBooks/{userId}_{bookId}

// ─── BookRef (모임 내 책 참조) ────────────────────────
export interface BookRef {
  bookId: string;
  title: string;
  coverUrl: string;
  author: string;
}

// ─── Club (모임) ───────────────────────────────────────
export interface Club {
  clubId: string;
  name: string;
  description: string;
  ownerId: string;
  memberCount: number;
  isPrivate: boolean;
  coverUrl?: string;
  createdAt: Timestamp;
  // 현재 읽는 책 목록 (다중)
  books?: BookRef[];
  // 하위 호환: 단수 필드 (기존 문서 지원)
  bookId?: string;
  bookTitle?: string;
  bookCoverUrl?: string;
  bookAuthor?: string;
  // 오너가 선택한 발제 ID 목록
  selectedTopicIds?: string[];
  inviteCode?: string;
}

// ─── Event (모임 일정) ─────────────────────────────────
export interface Event {
  eventId: string;
  clubId: string;
  title: string;
  date: Timestamp;
  location: string;
  topicId?: string;
  bookId?: string;
  attendees: string[]; // uid[]
  createdAt: Timestamp;
}

// ─── Membership ───────────────────────────────────────
export type MemberRole = 'owner' | 'member';
export type MemberStatus = 'active' | 'pending';

export interface Membership {
  clubId: string;
  uid: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: Timestamp;
}

// ─── ClubAnswer (모임 전용 답변) ──────────────────────
export interface ClubAnswer {
  clubAnswerId: string;
  clubId: string;
  topicId: string;
  userId: string;
  displayName?: string;
  side: AnswerSide;
  content: string;
  likeCount: number;
  createdAt: Timestamp;
}

// ─── Badge ────────────────────────────────────────────
export interface Badge {
  badgeId: string;
  name: string;
  description: string;
  iconUrl: string;
  condition: string;
}

// ─── Report / Block ───────────────────────────────────
export type ReportTargetType = 'review' | 'topic' | 'answer' | 'reply' | 'user';
export type ReportReason = 'spam' | 'hate' | 'misinformation' | 'adult' | 'other';

export interface Report {
  reportId: string;
  targetId: string;
  targetType: ReportTargetType;
  reporterId: string;
  reason: ReportReason;
  createdAt: Timestamp;
}

export interface Block {
  blockId: string; // `${blockerId}_${blockedId}`
  blockerId: string;
  blockedId: string;
  createdAt: Timestamp;
}

// ─── Notification ─────────────────────────────────────
export type NotificationType = 'like' | 'answer' | 'follow' | 'club_invite' | 'event_reminder';

export interface Notification {
  notificationId: string;
  userId: string;
  type: NotificationType;
  fromUserId?: string;
  targetId?: string;
  isRead: boolean;
  createdAt: Timestamp;
}
