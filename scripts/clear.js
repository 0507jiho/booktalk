/**
 * Firestore 테스트 데이터 전체 삭제
 * 실행: node scripts/clear.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const COLLECTIONS = [
  'users', 'books', 'reviews', 'topics', 'answers',
  'replies', 'follows', 'likes', 'clubs', 'memberships',
  'events', 'notifications', 'badges', 'userBooks',
];

async function deleteCollection(colName) {
  const snap = await db.collection(colName).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  console.log(`🗑️  ${colName} (${snap.size}개 삭제)`);
}

async function clear() {
  console.log('🧹 Firestore 데이터 삭제 시작...\n');
  for (const col of COLLECTIONS) {
    await deleteCollection(col);
  }
  console.log('\n✅ 완료');
  process.exit(0);
}

clear().catch(err => {
  console.error('❌ 실패:', err);
  process.exit(1);
});
