/**
 * Firestore 테스트 데이터 전체 삭제
 * 실행: node scripts/clear.js
 */

const admin = require('firebase-admin');
const readline = require('readline');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const COLLECTIONS = [
  'users', 'books', 'reviews', 'topics', 'answers',
  'replies', 'follows', 'likes', 'clubs', 'memberships',
  'events', 'notifications', 'badges', 'userBooks',
];

async function deleteAuthUsers() {
  let total = 0;
  let nextPageToken;
  do {
    const result = await admin.auth().listUsers(1000, nextPageToken);
    if (result.users.length > 0) {
      const uids = result.users.map(u => u.uid);
      await admin.auth().deleteUsers(uids);
      total += uids.length;
    }
    nextPageToken = result.pageToken;
  } while (nextPageToken);
  if (total > 0) console.log(`  Auth 유저 — ${total}명 삭제`);
}

async function deleteCollection(colName) {
  let total = 0;
  while (true) {
    const snap = await db.collection(colName).limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
  }
  if (total > 0) console.log(`  ${colName} — ${total}개 삭제`);
}

function confirm(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
  });
}

async function clear() {
  console.log(`\n프로젝트: ${serviceAccount.project_id}`);
  console.log(`대상 컬렉션: ${COLLECTIONS.join(', ')}\n`);

  const answer = await confirm('모든 데이터를 삭제합니다. 계속하려면 "yes" 입력: ');
  if (answer !== 'yes') {
    console.log('취소됨.');
    process.exit(0);
  }

  console.log('\n삭제 중...');
  await deleteAuthUsers();
  for (const col of COLLECTIONS) {
    await deleteCollection(col);
  }
  console.log('\n완료');
  process.exit(0);
}

clear().catch(err => {
  console.error('실패:', err);
  process.exit(1);
});
