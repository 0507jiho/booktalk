/**
 * Firebase 테스트 데이터 시드 스크립트 (멱등성 보장)
 * 실행: node scripts/seed.js
 *
 * 사전 조건:
 *  Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성
 *  다운로드한 JSON → scripts/serviceAccountKey.json 으로 저장
 *
 * 커버 범위:
 *  users(5) books(6) reviews(10) topics(8) answers(12) replies(6)
 *  likes clubs(2) memberships events(4) badges(5) notifications(6)
 *  follows userBooks
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const authAdmin = admin.auth();
const TS = () => admin.firestore.Timestamp.fromDate(new Date());
const daysFromNow = (n) => admin.firestore.Timestamp.fromDate(
  new Date(Date.now() + n * 86400000)
);

// ── 유저 ID ────────────────────────────────────────────────
const U1 = 'test-user-001'; // 김독서 (주요 테스터)
const U2 = 'test-user-002'; // 이토론
const U3 = 'test-user-003'; // 박소설
const U4 = 'test-user-004'; // 최시집
const U5 = 'test-user-005'; // 정에세이

// ── 책 ─────────────────────────────────────────────────────
const BOOKS = {
  vegetarian: {
    bookId: '9788936434120',
    title: '채식주의자',
    author: '한강',
    publisher: '창비',
    coverUrl: 'https://image.aladin.co.kr/product/641/37/coversum/8936434128_1.jpg',
    isbn: '9788936434120',
    avgRating: 4.2,
    reviewCount: 3,
  },
  kimjiyoung: {
    bookId: '9788937473135',
    title: '82년생 김지영',
    author: '조남주',
    publisher: '민음사',
    coverUrl: 'https://image.aladin.co.kr/product/13258/99/coversum/8937473135_1.jpg',
    isbn: '9788937473135',
    avgRating: 4.1,
    reviewCount: 2,
  },
  pachinko: {
    bookId: '9791191891010',
    title: '파친코',
    author: '이민진',
    publisher: '애플북스',
    coverUrl: 'https://image.aladin.co.kr/product/28560/48/coversum/K012731648_1.jpg',
    isbn: '9791191891010',
    avgRating: 4.6,
    reviewCount: 2,
  },
  almond: {
    bookId: '9791157842742',
    title: '아몬드',
    author: '손원평',
    publisher: '창비',
    coverUrl: 'https://image.aladin.co.kr/product/18236/70/coversum/8936434570_1.jpg',
    isbn: '9791157842742',
    avgRating: 4.0,
    reviewCount: 2,
  },
  cosmos: {
    bookId: '9788983711892',
    title: '코스모스',
    author: '칼 세이건',
    publisher: '사이언스북스',
    coverUrl: 'https://image.aladin.co.kr/product/338/1/coversum/8983711892_1.jpg',
    isbn: '9788983711892',
    avgRating: 4.7,
    reviewCount: 1,
  },
  sapiens: {
    bookId: '9788934972464',
    title: '사피엔스',
    author: '유발 하라리',
    publisher: '김영사',
    coverUrl: 'https://image.aladin.co.kr/product/6044/11/coversum/8934972467_1.jpg',
    isbn: '9788934972464',
    avgRating: 4.3,
    reviewCount: 0,
  },
};

async function upsertAuthUser(uid, email, password, displayName) {
  try {
    await authAdmin.updateUser(uid, { email, password, displayName });
    console.log(`  ↩️  Auth 업데이트: ${email}`);
  } catch {
    await authAdmin.createUser({ uid, email, password, displayName });
    console.log(`  ✅ Auth 생성: ${email}`);
  }
}

async function seed() {
  console.log('🌱 시드 데이터 생성 시작...\n');

  // ── 1. Auth 계정 ──────────────────────────────────────────
  console.log('[1/12] Auth 계정...');
  await upsertAuthUser(U1, 'test1@booktalk.dev', 'test1234!', '김독서');
  await upsertAuthUser(U2, 'test2@booktalk.dev', 'test1234!', '이토론');
  await upsertAuthUser(U3, 'test3@booktalk.dev', 'test1234!', '박소설');
  await upsertAuthUser(U4, 'test4@booktalk.dev', 'test1234!', '최시집');
  await upsertAuthUser(U5, 'test5@booktalk.dev', 'test1234!', '정에세이');

  // ── 2. 유저 프로필 ────────────────────────────────────────
  console.log('[2/12] 유저 프로필...');
  const users = [
    { uid: U1, displayName: '김독서', bio: '한국 문학을 사랑합니다. 매달 5권 이상 읽는 게 목표!', followersCount: 3, followingCount: 2, badgeIds: ['first-review', 'bookworm', 'first-topic'] },
    { uid: U2, displayName: '이토론', bio: '찬반토론이 좋아요. 철학과 문학의 경계에서 읽습니다.', followersCount: 2, followingCount: 1, badgeIds: ['first-review', 'first-topic'] },
    { uid: U3, displayName: '박소설', bio: '소설 전문 독자. 국내외 현대 소설을 주로 읽어요.', followersCount: 1, followingCount: 2, badgeIds: ['first-review'] },
    { uid: U4, displayName: '최시집', bio: '시와 에세이를 좋아하는 사람. 느리게 읽는 독자.', followersCount: 1, followingCount: 1, badgeIds: [] },
    { uid: U5, displayName: '정에세이', bio: '과학책과 역사책 위주로 읽습니다. 비문학도 독서!', followersCount: 0, followingCount: 2, badgeIds: ['first-review'] },
  ];
  for (const u of users) {
    await db.doc(`users/${u.uid}`).set({ ...u, photoURL: null, createdAt: TS() });
  }

  // ── 3. 팔로우 관계 ────────────────────────────────────────
  console.log('[3/12] 팔로우...');
  const follows = [
    [U1, U2], [U1, U3], [U2, U1], [U3, U1], [U3, U2], [U4, U1], [U5, U2], [U5, U3],
  ];
  for (const [a, b] of follows) {
    await db.doc(`follows/${a}_${b}`).set({ followerId: a, followingId: b, createdAt: TS() });
  }

  // ── 4. 책 ─────────────────────────────────────────────────
  console.log('[4/12] 책...');
  for (const book of Object.values(BOOKS)) {
    await db.doc(`books/${book.bookId}`).set(book);
  }

  // ── 5. userBooks ──────────────────────────────────────────
  console.log('[5/12] userBooks...');
  const userBooks = [
    [U1, BOOKS.vegetarian, 'read', 4],
    [U1, BOOKS.pachinko, 'reading', null],
    [U1, BOOKS.kimjiyoung, 'read', 5],
    [U2, BOOKS.vegetarian, 'read', 5],
    [U2, BOOKS.kimjiyoung, 'read', 4],
    [U2, BOOKS.almond, 'reading', null],
    [U3, BOOKS.pachinko, 'read', 5],
    [U3, BOOKS.almond, 'read', 4],
    [U3, BOOKS.sapiens, 'archived', 3],
    [U4, BOOKS.cosmos, 'read', 5],
    [U5, BOOKS.cosmos, 'read', 4],
    [U5, BOOKS.sapiens, 'reading', null],
  ];
  for (const [uid, book, status, rating] of userBooks) {
    const id = `${uid}_${book.bookId}`;
    const data = { userId: uid, bookId: book.bookId, bookTitle: book.title, bookCoverUrl: book.coverUrl, author: book.author, status, addedAt: TS() };
    if (rating) data.myRating = rating;
    await db.doc(`userBooks/${id}`).set(data);
  }

  // ── 6. 리뷰 ──────────────────────────────────────────────
  console.log('[6/12] 리뷰...');
  const reviews = [
    { id: 'review-001', bookId: BOOKS.vegetarian.bookId, bookTitle: BOOKS.vegetarian.title, bookCoverUrl: BOOKS.vegetarian.coverUrl, userId: U2, displayName: '이토론', rating: 5, likeCount: 4, content: '한강의 문체가 정말 독특합니다. 채식을 거부하는 행위가 단순한 식습관의 변화가 아닌 존재에 대한 근본적인 질문이라는 점이 인상적이었어요. 읽는 내내 불편함과 매혹이 공존했습니다.' },
    { id: 'review-002', bookId: BOOKS.vegetarian.bookId, bookTitle: BOOKS.vegetarian.title, bookCoverUrl: BOOKS.vegetarian.coverUrl, userId: U1, displayName: '김독서', rating: 4, likeCount: 2, content: '읽는 내내 불편하고 묘한 느낌이 들었습니다. 영혜의 선택이 가족에게 미치는 영향을 통해 우리 사회의 폭력성을 보게 됩니다.' },
    { id: 'review-003', bookId: BOOKS.vegetarian.bookId, bookTitle: BOOKS.vegetarian.title, bookCoverUrl: BOOKS.vegetarian.coverUrl, userId: U3, displayName: '박소설', rating: 5, likeCount: 1, content: '처음엔 충격적이었는데 읽을수록 깊은 공감이 생겼습니다. 가부장적 사회에 대한 은유로 읽으면 더욱 의미있어요.' },
    { id: 'review-004', bookId: BOOKS.kimjiyoung.bookId, bookTitle: BOOKS.kimjiyoung.title, bookCoverUrl: BOOKS.kimjiyoung.coverUrl, userId: U2, displayName: '이토론', rating: 4, likeCount: 3, content: '많은 것을 생각하게 만드는 책입니다. 특별한 사건 없이도 차별이 얼마나 일상 깊이 침투해 있는지 담담하게 보여줘요.' },
    { id: 'review-005', bookId: BOOKS.kimjiyoung.bookId, bookTitle: BOOKS.kimjiyoung.title, bookCoverUrl: BOOKS.kimjiyoung.coverUrl, userId: U1, displayName: '김독서', rating: 5, likeCount: 1, content: '남성인 저도 많이 반성하게 된 책이에요. 주변 여성들의 이야기가 떠올라 마음이 무거웠습니다.' },
    { id: 'review-006', bookId: BOOKS.pachinko.bookId, bookTitle: BOOKS.pachinko.title, bookCoverUrl: BOOKS.pachinko.coverUrl, userId: U1, displayName: '김독서', rating: 5, likeCount: 6, content: '4대에 걸친 재일 조선인 가족의 이야기를 통해 역사, 정체성, 생존을 담아낸 대작입니다. "역사는 우리를 저버렸지만, 그래도 상관없다"라는 첫 문장부터 압도적이었어요.' },
    { id: 'review-007', bookId: BOOKS.pachinko.bookId, bookTitle: BOOKS.pachinko.title, bookCoverUrl: BOOKS.pachinko.coverUrl, userId: U3, displayName: '박소설', rating: 4, likeCount: 2, content: '영어 원서로 읽었는데 번역판도 좋다고 들었어요. 선자 할머니의 삶이 오래 기억에 남습니다.' },
    { id: 'review-008', bookId: BOOKS.almond.bookId, bookTitle: BOOKS.almond.title, bookCoverUrl: BOOKS.almond.coverUrl, userId: U2, displayName: '이토론', rating: 4, likeCount: 2, content: '감정을 느끼지 못하는 주인공을 통해 오히려 감정에 대해 깊이 생각하게 됩니다. 청소년 문학이지만 어른이 읽어도 충분히 울림이 있어요.' },
    { id: 'review-009', bookId: BOOKS.almond.bookId, bookTitle: BOOKS.almond.title, bookCoverUrl: BOOKS.almond.coverUrl, userId: U3, displayName: '박소설', rating: 4, likeCount: 1, content: '곤이라는 캐릭터가 특히 인상적이었어요. 상처받은 아이가 어떻게 연결을 만들어가는지 잘 그려냈습니다.' },
    { id: 'review-010', bookId: BOOKS.cosmos.bookId, bookTitle: BOOKS.cosmos.title, bookCoverUrl: BOOKS.cosmos.coverUrl, userId: U5, displayName: '정에세이', rating: 5, likeCount: 3, content: '칼 세이건의 경이감이 페이지마다 가득합니다. 우주의 광대함 앞에서 인간의 작음을 느끼면서도, 그 작은 존재가 얼마나 경이로운지 깨닫게 해줍니다.' },
  ];
  for (const r of reviews) {
    const { id, ...data } = r;
    await db.doc(`reviews/${id}`).set({ ...data, createdAt: TS() });
  }

  // ── 7. 발제 ──────────────────────────────────────────────
  console.log('[7/12] 발제...');
  const topics = [
    { id: 'topic-001', bookId: BOOKS.vegetarian.bookId, bookTitle: BOOKS.vegetarian.title, bookCoverUrl: BOOKS.vegetarian.coverUrl, userId: U2, displayName: '이토론', type: 'agree-disagree', title: '영혜의 채식 선언은 자유 의지인가, 정신적 고통의 표출인가?', body: '영혜의 채식은 자신의 의지로 선택한 자유인가, 억압된 환경에서 비롯된 증상인가? 두 해석은 배타적이지 않을 수도 있습니다.', answerCount: 3, likeCount: 5, proCount: 2, conCount: 1, neutralCount: 0, trendScore: 8.2 },
    { id: 'topic-002', bookId: BOOKS.kimjiyoung.bookId, bookTitle: BOOKS.kimjiyoung.title, bookCoverUrl: BOOKS.kimjiyoung.coverUrl, userId: U1, displayName: '김독서', type: 'free', title: '82년생 김지영을 읽고 가장 인상 깊었던 장면은?', body: '공감했거나 충격받은 장면, 생각이 바뀐 부분이 있다면 자유롭게 이야기해주세요.', answerCount: 2, likeCount: 3, trendScore: 5.1 },
    { id: 'topic-003', bookId: BOOKS.pachinko.bookId, bookTitle: BOOKS.pachinko.title, bookCoverUrl: BOOKS.pachinko.coverUrl, userId: U1, displayName: '김독서', type: 'agree-disagree', title: '파친코에서 선자의 선택은 옳았는가?', body: '고수의 아이를 임신한 상황에서 이삭과 결혼하는 선자의 선택 — 생존을 위한 현실적 결단인가, 자신의 감정을 희생한 타협인가?', answerCount: 3, likeCount: 4, proCount: 1, conCount: 2, neutralCount: 0, trendScore: 6.7 },
    { id: 'topic-004', bookId: BOOKS.almond.bookId, bookTitle: BOOKS.almond.title, bookCoverUrl: BOOKS.almond.coverUrl, userId: U3, displayName: '박소설', type: 'free', title: '아몬드의 주인공 윤재에게 공감할 수 있었나요?', body: '감정을 느끼지 못하는 주인공에게 감정 이입하는 것이 어려웠나요, 쉬웠나요? 독자로서의 경험을 나눠주세요.', answerCount: 2, likeCount: 2, trendScore: 4.3 },
    { id: 'topic-005', bookId: BOOKS.vegetarian.bookId, bookTitle: BOOKS.vegetarian.title, bookCoverUrl: BOOKS.vegetarian.coverUrl, userId: U2, displayName: '이토론', type: 'free', title: '한강 작가 작품에서 반복되는 주제는 무엇인가요?', body: '채식주의자 외에도 소년이 온다, 흰 등 여러 작품에서 공통적으로 나타나는 주제가 있다면?', answerCount: 1, likeCount: 1, trendScore: 2.1 },
    { id: 'topic-006', bookId: BOOKS.cosmos.bookId, bookTitle: BOOKS.cosmos.title, bookCoverUrl: BOOKS.cosmos.coverUrl, userId: U5, displayName: '정에세이', type: 'agree-disagree', title: '과학책은 문학적 감동을 줄 수 있는가?', body: '코스모스를 읽으며 문학적 감동을 받은 분들이 많습니다. 과학 글쓰기가 문학과 동등한 감동을 줄 수 있다고 생각하시나요?', answerCount: 2, likeCount: 3, proCount: 2, conCount: 0, neutralCount: 0, trendScore: 5.5 },
    { id: 'topic-007', bookId: BOOKS.sapiens.bookId, bookTitle: BOOKS.sapiens.title, bookCoverUrl: BOOKS.sapiens.coverUrl, userId: U5, displayName: '정에세이', type: 'agree-disagree', title: '사피엔스의 핵심 주장 — 인류 발전이 곧 행복인가?', body: '하라리는 농업혁명을 "역사상 최대의 사기"라고 부릅니다. 문명의 발전이 개인의 행복을 증진시켰다고 생각하시나요?', answerCount: 1, likeCount: 2, proCount: 0, conCount: 1, neutralCount: 0, trendScore: 3.8 },
    { id: 'topic-008', bookId: BOOKS.kimjiyoung.bookId, bookTitle: BOOKS.kimjiyoung.title, bookCoverUrl: BOOKS.kimjiyoung.coverUrl, userId: U4, displayName: '최시집', type: 'free', title: '82년생 김지영 이후 한국 사회가 얼마나 변했나요?', body: '2016년 출판 이후 8년이 지났습니다. 책에서 묘사된 상황들이 현재는 얼마나 개선됐다고 느끼시나요?', answerCount: 0, likeCount: 1, trendScore: 1.2 },
  ];
  for (const t of topics) {
    const { id, ...data } = t;
    await db.doc(`topics/${id}`).set({ ...data, createdAt: TS() });
  }

  // ── 8. 답변 ──────────────────────────────────────────────
  console.log('[8/12] 답변...');
  const answers = [
    { id: 'answer-001', topicId: 'topic-001', userId: U1, displayName: '김독서', side: 'pro', likeCount: 3, content: '자유 의지라고 생각합니다. 극단적인 방식이지만 영혜는 자신의 방식으로 세상과 단절하고자 했고, 폭력적인 아버지 밑에서 "아니요"라고 말하는 것 자체가 혁명이었습니다.' },
    { id: 'answer-002', topicId: 'topic-001', userId: U3, displayName: '박소설', side: 'pro', likeCount: 1, content: '선택 맞습니다. 사회가 그녀에게 강요하는 모든 것에 대한 거부, 그 자체가 의지의 표현이에요.' },
    { id: 'answer-003', topicId: 'topic-001', userId: U5, displayName: '정에세이', side: 'con', likeCount: 2, content: '정신적 고통의 표출에 더 가깝다고 봅니다. 자유로운 선택이라기엔 영혜가 처한 환경이 너무 극단적이었어요. 진정한 선택은 선택지가 존재할 때만 가능합니다.' },
    { id: 'answer-004', topicId: 'topic-002', userId: U2, displayName: '이토론', side: 'neutral', likeCount: 2, content: '가장 충격적인 장면은 회식 장면이었어요. 상사가 부하 여직원에게 "다음엔 짧은 치마 입고 와"라고 말하는 장면 — 너무 일상적으로 묘사돼서 오히려 더 무서웠습니다.' },
    { id: 'answer-005', topicId: 'topic-002', userId: U4, displayName: '최시집', side: 'neutral', likeCount: 1, content: '아이를 낳고 나서 점점 자신이 사라지는 느낌을 묘사한 부분에서 울었습니다. 주변 여성들이 다 그 기분을 알 것 같아서.' },
    { id: 'answer-006', topicId: 'topic-003', userId: U2, displayName: '이토론', side: 'con', likeCount: 2, content: '옳지 않았다고 봅니다. 사랑하지 않는 사람과의 결혼은 양쪽 모두에게 불공평합니다. 이삭도 진실을 알 권리가 있었어요.' },
    { id: 'answer-007', topicId: 'topic-003', userId: U3, displayName: '박소설', side: 'con', likeCount: 1, content: '시대와 상황을 고려하면 이해는 가지만, 그래도 선택의 결과로 이삭이 짊어진 짐이 너무 무거웠죠.' },
    { id: 'answer-008', topicId: 'topic-003', userId: U5, displayName: '정에세이', side: 'pro', likeCount: 3, content: '그 시대 그 상황에서 그것이 최선이었습니다. 단순히 도덕적 잣대로 판단하기 어려운 선택이에요. 생존과 尊嚴 사이에서 한 결단입니다.' },
    { id: 'answer-009', topicId: 'topic-004', userId: U1, displayName: '김독서', side: 'neutral', likeCount: 1, content: '공감보다는 측은함에 가까웠어요. 윤재의 무표정한 서술이 오히려 독자로 하여금 감정을 더 강하게 느끼게 만드는 역설이 흥미로웠습니다.' },
    { id: 'answer-010', topicId: 'topic-004', userId: U4, displayName: '최시집', side: 'neutral', likeCount: 0, content: '처음엔 거리감이 있었는데, 곤이 등장하면서 윤재의 내면을 간접적으로 볼 수 있게 되어 점차 몰입이 됐어요.' },
    { id: 'answer-011', topicId: 'topic-006', userId: U1, displayName: '김독서', side: 'pro', likeCount: 2, content: '코스모스를 읽으며 몇 번이고 감동으로 책을 덮었습니다. 과학적 사실이 시적으로 표현될 때 그 감동은 문학과 다를 바 없어요.' },
    { id: 'answer-012', topicId: 'topic-006', userId: U3, displayName: '박소설', side: 'pro', likeCount: 1, content: '"우리는 모두 별의 먼지로 만들어졌다" — 이 문장 하나가 수많은 시보다 더 시적이라고 생각합니다.' },
  ];
  for (const a of answers) {
    const { id, ...data } = a;
    await db.doc(`answers/${id}`).set({ ...data, createdAt: TS() });
  }

  // ── 9. 답글 ──────────────────────────────────────────────
  console.log('[9/12] 답글...');
  const replies = [
    { id: 'reply-001', answerId: 'answer-001', userId: U2, displayName: '이토론', likeCount: 1, content: '좋은 관점이네요. 저도 비슷하게 생각했는데 "아니요"라는 표현이 정확한 것 같아요.' },
    { id: 'reply-002', answerId: 'answer-001', userId: U3, displayName: '박소설', likeCount: 0, content: '동의합니다. 하지만 그 선택이 자신을 파괴하는 방식이었다는 점이 안타까워요.' },
    { id: 'reply-003', answerId: 'answer-003', userId: U1, displayName: '김독서', likeCount: 1, content: '"선택지가 있을 때만 선택이다" — 이 말이 정말 인상적입니다. 재고해보게 되네요.' },
    { id: 'reply-004', answerId: 'answer-008', userId: U2, displayName: '이토론', likeCount: 0, content: '생존을 위한 선택이라는 건 이해하지만, 이삭 입장에서는 너무 불공평하지 않았을까요?' },
    { id: 'reply-005', answerId: 'answer-011', userId: U5, displayName: '정에세이', likeCount: 2, content: '저도 그 순간들이 생생히 기억납니다. 세이건의 문장은 정말 경이로워요.' },
    { id: 'reply-006', answerId: 'answer-012', userId: U4, displayName: '최시집', likeCount: 1, content: '그 문장 정말 좋죠. 코스모스 읽어봐야겠다는 생각이 드네요!' },
  ];
  for (const r of replies) {
    const { id, ...data } = r;
    await db.doc(`replies/${id}`).set({ ...data, createdAt: TS() });
  }

  // ── 10. 좋아요 ────────────────────────────────────────────
  console.log('[10/12] 좋아요...');
  const likes = [
    // 리뷰 좋아요
    { id: `${U1}_review-001_review`, userId: U1, targetId: 'review-001', targetType: 'review' },
    { id: `${U2}_review-006_review`, userId: U2, targetId: 'review-006', targetType: 'review' },
    { id: `${U3}_review-006_review`, userId: U3, targetId: 'review-006', targetType: 'review' },
    { id: `${U4}_review-001_review`, userId: U4, targetId: 'review-001', targetType: 'review' },
    // 발제 좋아요
    { id: `${U1}_topic-001_topic`, userId: U1, targetId: 'topic-001', targetType: 'topic' },
    { id: `${U3}_topic-001_topic`, userId: U3, targetId: 'topic-001', targetType: 'topic' },
    { id: `${U4}_topic-003_topic`, userId: U4, targetId: 'topic-003', targetType: 'topic' },
    // 답변 좋아요
    { id: `${U2}_answer-001_answer`, userId: U2, targetId: 'answer-001', targetType: 'answer' },
    { id: `${U4}_answer-001_answer`, userId: U4, targetId: 'answer-001', targetType: 'answer' },
    // 답글 좋아요
    { id: `${U2}_reply-005_reply`, userId: U2, targetId: 'reply-005', targetType: 'reply' },
  ];
  for (const l of likes) {
    const { id, ...data } = l;
    await db.doc(`likes/${id}`).set({ ...data, createdAt: TS() });
  }

  // ── 11. 모임 + 멤버십 + 일정 ──────────────────────────────
  console.log('[11/12] 모임...');

  // 모임 1: 한강 읽기 모임
  await db.doc('clubs/club-001').set({ name: '한강 작가 읽기 모임', description: '한강 작가의 작품을 함께 읽고 토론하는 모임. 매월 1권씩 읽습니다.', ownerId: U1, memberCount: 3, isPrivate: false, createdAt: TS() });
  for (const [uid, role] of [[U1, 'owner'], [U2, 'member'], [U3, 'member']]) {
    await db.doc(`memberships/club-001_${uid}`).set({ clubId: 'club-001', uid, role, status: 'active', joinedAt: TS() });
  }

  // 모임 2: SF·과학 독서회 (비공개)
  await db.doc('clubs/club-002').set({ name: 'SF·과학 독서회', description: 'SF 소설과 과학 교양서를 읽는 독서 모임입니다. 비공개 운영.', ownerId: U5, memberCount: 3, isPrivate: true, createdAt: TS() });
  for (const [uid, role] of [[U5, 'owner'], [U4, 'member'], [U1, 'member']]) {
    await db.doc(`memberships/club-002_${uid}`).set({ clubId: 'club-002', uid, role, status: 'active', joinedAt: TS() });
  }
  // 대기 중인 멤버
  await db.doc(`memberships/club-002_${U2}`).set({ clubId: 'club-002', uid: U2, role: 'member', status: 'pending', joinedAt: TS() });

  // 일정 4개 (과거, 오늘, 이번 주, 다음 달)
  const events = [
    { id: 'event-001', clubId: 'club-001', title: '채식주의자 토론', date: daysFromNow(-14), location: '서울 강남 스터디카페', topicId: 'topic-001', attendees: [U1, U2, U3] },
    { id: 'event-002', clubId: 'club-001', title: '82년생 김지영 발표', date: daysFromNow(7), location: '서울 마포 북카페', topicId: 'topic-002', attendees: [U1, U2] },
    { id: 'event-003', clubId: 'club-001', title: '파친코 자유 토론', date: daysFromNow(21), location: '온라인(Zoom)', topicId: 'topic-003', attendees: [U1] },
    { id: 'event-004', clubId: 'club-002', title: '코스모스 독후감 발표', date: daysFromNow(3), location: '서울 종로 카페', topicId: 'topic-006', attendees: [U5, U4] },
  ];
  for (const e of events) {
    const { id, ...data } = e;
    await db.doc(`events/${id}`).set({ ...data, createdAt: TS() });
  }

  // ── 12. 뱃지·알림 ─────────────────────────────────────────
  console.log('[12/12] 뱃지·알림...');
  const badges = [
    { badgeId: 'first-review', name: '첫 리뷰', description: '첫 번째 리뷰를 작성했어요.', iconUrl: '', condition: 'reviewCount >= 1' },
    { badgeId: 'first-topic', name: '첫 발제', description: '첫 번째 발제를 작성했어요.', iconUrl: '', condition: 'topicCount >= 1' },
    { badgeId: 'bookworm', name: '책벌레', description: '읽은 책이 5권 이상이에요.', iconUrl: '', condition: 'readCount >= 5' },
    { badgeId: 'popular-review', name: '인기 리뷰어', description: '리뷰 좋아요 합계 10개 달성!', iconUrl: '', condition: 'totalReviewLikes >= 10' },
    { badgeId: 'debater', name: '토론왕', description: '찬반 발제에 답변 5회 이상.', iconUrl: '', condition: 'debateAnswerCount >= 5' },
  ];
  for (const b of badges) {
    await db.doc(`badges/${b.badgeId}`).set(b);
  }

  // 모든 타입의 알림
  const notifications = [
    { id: 'notif-001', userId: U1, type: 'like', fromUserId: U2, targetId: 'review-002', isRead: false },
    { id: 'notif-002', userId: U1, type: 'follow', fromUserId: U3, isRead: false },
    { id: 'notif-003', userId: U1, type: 'answer', fromUserId: U3, targetId: 'topic-002', isRead: true },
    { id: 'notif-004', userId: U2, type: 'club_invite', fromUserId: U1, targetId: 'club-001', isRead: false },
    { id: 'notif-005', userId: U2, type: 'like', fromUserId: U4, targetId: 'review-001', isRead: true },
    { id: 'notif-006', userId: U5, type: 'event_reminder', targetId: 'event-004', isRead: false },
  ];
  for (const n of notifications) {
    const { id, ...data } = n;
    await db.doc(`notifications/${id}`).set({ ...data, createdAt: TS() });
  }

  // ── 완료 ──────────────────────────────────────────────────
  console.log('\n🎉 시드 완료!\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('  테스트 계정 (비밀번호 공통: test1234!)');
  console.log('───────────────────────────────────────────────────');
  console.log('  test1@booktalk.dev  →  김독서  (팔로워3, 팔로잉2)');
  console.log('  test2@booktalk.dev  →  이토론  (팔로워2, 팔로잉1)');
  console.log('  test3@booktalk.dev  →  박소설  (팔로워1, 팔로잉2)');
  console.log('  test4@booktalk.dev  →  최시집  (팔로워1, 팔로잉1)');
  console.log('  test5@booktalk.dev  →  정에세이 (팔로워0, 팔로잉2)');
  console.log('───────────────────────────────────────────────────');
  console.log('  책 6권 / 리뷰 10개 / 발제 8개 / 답변 12개');
  console.log('  답글 6개 / 좋아요 10개 / 모임 2개 / 일정 4개');
  console.log('  뱃지 5개 / 알림 6개 (전 타입)');
  console.log('═══════════════════════════════════════════════════');

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ 시드 실패:', err);
  process.exit(1);
});
