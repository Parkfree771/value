/**
 * 게시글 작성자 닉네임 변경 스크립트
 *
 * 제목으로 게시글을 찾아서 authorName을 변경하고 feed.json도 갱신합니다.
 * 매핑된 닉네임이 users 컬렉션에 없으면 자동으로 신규 유저를 생성합니다.
 *
 * 사용법:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/change-author.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';

// ============================================================
// 여기서 편집하세요!
// ============================================================

// 게시글 → 작성자 닉네임 매핑
// (users 컬렉션에 없는 닉네임은 NEW_USERS 항목으로 자동 생성됩니다)
const POST_AUTHOR_MAP: { titleContains: string; authorName: string }[] = [
  {
    titleContains: 'BofA 경제 전망 전면 수정',
    authorName: '전문가 추적',
  },
];

// users 컬렉션에 없으면 자동으로 만들 신규 유저
// (닉네임이 이미 존재하면 건너뜀)
const NEW_USERS: { nickname: string; bio?: string }[] = [];

// ============================================================

// .env 로드
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Firebase Admin 초기화
if (getApps().length === 0) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
    );
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
    });
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    console.error('Firebase 인증 정보가 없습니다.');
    process.exit(1);
  }
}

const db = getFirestore();
const bucket = getStorage().bucket();

// 닉네임으로 uid 조회 (없으면 null)
async function findUidByNickname(nickname: string): Promise<string | null> {
  const snap = await db.collection('users').where('nickname', '==', nickname).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return doc.data().uid || doc.id;
}

// 신규 유저 생성 (이미 존재하면 기존 uid 반환)
async function ensureUser(nickname: string, bio?: string): Promise<string> {
  const existing = await findUidByNickname(nickname);
  if (existing) {
    console.log(`  ✓ 기존 사용자: ${nickname} (uid: ${existing})`);
    return existing;
  }

  const uid = randomUUID();
  const now = Timestamp.now();
  const userDoc = {
    uid,
    email: `${nickname}@local.invalid`,
    displayName: nickname,
    nickname,
    photoURL: null,
    createdAt: now,
    updatedAt: now,
    onboardingCompleted: true,
    termsAgreed: true,
    privacyAgreed: true,
    investmentDisclaimerAgreed: true,
    marketingAgreed: false,
    bio: bio || '',
  };

  await db.collection('users').doc(uid).set(userDoc);
  console.log(`  + 신규 사용자 생성: ${nickname} (uid: ${uid})`);
  return uid;
}

async function main() {
  console.log('\n작성자 변경 스크립트 시작\n');

  // 0. 신규 유저 생성 (필요 시)
  if (NEW_USERS.length > 0) {
    console.log('[0/3] 신규 유저 확인/생성...');
    for (const u of NEW_USERS) {
      await ensureUser(u.nickname, u.bio);
    }
    console.log();
  }

  // 1. 매핑별 작성자 uid 조회
  const authorIdByName = new Map<string, string>();
  const uniqueAuthors = Array.from(new Set(POST_AUTHOR_MAP.map(m => m.authorName)));
  for (const name of uniqueAuthors) {
    const uid = await findUidByNickname(name);
    if (!uid) {
      console.error(`✗ users 컬렉션에서 "${name}" 닉네임을 찾지 못했습니다. NEW_USERS에 추가하세요.`);
      process.exit(1);
    }
    authorIdByName.set(name, uid);
  }

  // 2. posts 컬렉션에서 제목으로 검색
  const postsSnapshot = await db.collection('posts').get();
  type Matched = { id: string; title: string; oldAuthor: string; newAuthor: string; newAuthorId: string };
  const matchedPosts: Matched[] = [];

  for (const doc of postsSnapshot.docs) {
    const data = doc.data();
    const title = (data.title || '').trim();
    if (!title) continue;

    const mapping = POST_AUTHOR_MAP.find(m => title.includes(m.titleContains));
    if (mapping) {
      matchedPosts.push({
        id: doc.id,
        title,
        oldAuthor: data.authorName || '',
        newAuthor: mapping.authorName,
        newAuthorId: authorIdByName.get(mapping.authorName)!,
      });
    }
  }

  if (matchedPosts.length === 0) {
    console.log('일치하는 게시글을 찾지 못했습니다.');
    console.log('\n전체 게시글 제목 목록:');
    for (const doc of postsSnapshot.docs) {
      console.log(`  - "${doc.data().title}" (by ${doc.data().authorName})`);
    }
    return;
  }

  console.log(`${matchedPosts.length}개 게시글 발견:`);
  for (const post of matchedPosts) {
    console.log(`  "${post.title}"\n    ${post.oldAuthor} → ${post.newAuthor}`);
  }

  // 3. Firestore posts 컬렉션 업데이트
  console.log('\n[1/3] Firestore posts 업데이트 중...');
  const batch = db.batch();
  for (const post of matchedPosts) {
    batch.update(db.collection('posts').doc(post.id), {
      authorName: post.newAuthor,
      authorId: post.newAuthorId,
    });
  }
  await batch.commit();
  console.log('  ✓ posts 컬렉션 업데이트 완료');

  // 4. feed.json 업데이트
  console.log('[2/3] feed.json 업데이트 중...');
  try {
    const file = bucket.file('feed.json');
    const [exists] = await file.exists();

    if (exists) {
      const [content] = await file.download();
      const feedData = JSON.parse(content.toString());

      let feedUpdated = 0;
      for (const post of feedData.posts) {
        const match = matchedPosts.find(mp => mp.id === post.id);
        if (match) {
          post.author = match.newAuthor;
          post.authorId = match.newAuthorId;
          feedUpdated++;
        }
      }

      await file.save(JSON.stringify(feedData, null, 2), {
        contentType: 'application/json',
        metadata: { cacheControl: 'public, max-age=60' },
      });
      console.log(`  ✓ feed.json 업데이트 완료 (${feedUpdated}개 게시글)`);
    } else {
      console.log('  ⚠ feed.json 없음 — 건너뜀');
    }
  } catch (err) {
    console.error('  ✗ feed.json 업데이트 실패:', err);
  }

  console.log('[3/3] 완료\n');
  for (const post of matchedPosts) {
    console.log(`  ✓ "${post.title}" → ${post.newAuthor}`);
  }
  console.log();
}

main().catch(console.error);
