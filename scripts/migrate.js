/**
 * BookTalk 마이그레이션 스크립트 (구현 완료 후 1회 실행)
 * 실행: node scripts/migrate.js
 *
 * 사전 조건:
 *  1. Firebase Admin SDK 설치: npm install firebase-admin --save-dev
 *  2. scripts/serviceAccountKey.json 준비 (Firebase 콘솔 > 서비스 계정)
 *
 * 수행 작업:
 *  Step 1. users — birthDate 기본값 추가
 *  Step 2. topics — proCount/conCount 집계 채우기
 *  Step 3. agree-disagree 발제의 neutral 답변 → con으로 변경
 *  Step 4. 기존 리뷰 → userBooks 생성 (status: 'read')
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

async function main() {
  // ─── Step 1: users — birthDate 기본값 ───────────────────
  console.log('[Step 1] users 컬렉션 — birthDate 기본값 추가...');
  const users = await db.collection('users').get();
  let userCount = 0;
  for (const doc of users.docs) {
    if (!doc.data().birthDate) {
      await doc.ref.update({ birthDate: '2000-01-01' });
      userCount++;
    }
  }
  console.log(`  → ${userCount}개 문서 업데이트 완료`);

  // ─── Step 2: topics — proCount/conCount 집계 ────────────
  console.log('[Step 2] topics 컬렉션 — proCount/conCount 집계...');
  const topics = await db.collection('topics').get();
  let topicCount = 0;
  for (const doc of topics.docs) {
    if (doc.data().type !== 'agree-disagree') continue;
    const answers = await db.collection('answers')
      .where('topicId', '==', doc.id).get();
    const proCount = answers.docs.filter(a => a.data().side === 'pro').length;
    const conCount = answers.docs.filter(a => a.data().side === 'con').length;
    await doc.ref.update({ proCount, conCount });
    topicCount++;
  }
  console.log(`  → ${topicCount}개 찬반발제 업데이트 완료`);

  // ─── Step 3: agree-disagree 발제의 neutral → con ────────
  console.log('[Step 3] neutral 답변 → con 변경 (agree-disagree 발제 한정)...');
  const neutralAnswers = await db.collection('answers')
    .where('side', '==', 'neutral').get();
  let neutralCount = 0;
  for (const doc of neutralAnswers.docs) {
    const topic = await db.collection('topics').doc(doc.data().topicId).get();
    if (topic.data()?.type === 'agree-disagree') {
      await doc.ref.update({ side: 'con' });
      neutralCount++;
    }
  }
  console.log(`  → ${neutralCount}개 답변 변환 완료`);

  // ─── Step 4: 리뷰 → userBooks 생성 ──────────────────────
  console.log('[Step 4] reviews → userBooks 생성...');
  const reviews = await db.collection('reviews').get();
  let ubCount = 0;
  for (const doc of reviews.docs) {
    const { userId, bookId, bookTitle, bookCoverUrl, displayName } = doc.data();
    if (!userId || !bookId) continue;
    const ubRef = db.collection('userBooks').doc(`${userId}_${bookId}`);
    const existing = await ubRef.get();
    if (!existing.exists) {
      await ubRef.set({
        userId,
        bookId,
        bookTitle: bookTitle ?? '',
        bookCoverUrl: bookCoverUrl ?? '',
        author: displayName ?? '',
        status: 'read',
        addedAt: doc.data().createdAt,
      });
      ubCount++;
    }
  }
  console.log(`  → ${ubCount}개 userBooks 생성 완료`);

  console.log('\n✅ 마이그레이션 완료!');
  process.exit(0);
}

main().catch(e => {
  console.error('❌ 마이그레이션 실패:', e);
  process.exit(1);
});
