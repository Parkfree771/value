/**
 * 게시글 작성자 닉네임 변경 스크립트
 *
 * 제목으로 게시글을 찾아서 authorName을 변경하고 feed.json도 갱신합니다.
 *
 * 사용법:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/change-author.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// ============================================================
// 여기서 편집하세요!
// ============================================================

// 변경할 닉네임 (users 컬렉션에서 이 닉네임의 uid를 자동 조회)
const NEW_AUTHOR_NAME = '도널드덕';

// 변경할 게시글 제목 목록
const TARGET_TITLES = [
  '구조적 약세의 시작',
];

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

async function main() {
  console.log(`\n닉네임을 "${NEW_AUTHOR_NAME}"(으)로 변경합니다.\n`);

  // 0. users 컬렉션에서 닉네임으로 uid 조회
  const usersSnapshot = await db.collection('users')
    .where('nickname', '==', NEW_AUTHOR_NAME)
    .get();

  let newAuthorId: string | null = null;
  if (usersSnapshot.empty) {
    console.log(`⚠ users 컬렉션에서 "${NEW_AUTHOR_NAME}" 닉네임을 찾지 못했습니다.`);
    console.log('  authorName만 변경하고 authorId는 유지합니다.\n');
  } else {
    const userDoc = usersSnapshot.docs[0];
    newAuthorId = userDoc.data().uid || userDoc.id;
    console.log(`✓ 사용자 발견: ${NEW_AUTHOR_NAME} (uid: ${newAuthorId})\n`);
  }

  // 1. posts 컬렉션에서 제목으로 검색
  const postsSnapshot = await db.collection('posts').get();
  const matchedPosts: { id: string; title: string; oldAuthor: string }[] = [];

  for (const doc of postsSnapshot.docs) {
    const data = doc.data();
    const title = (data.title || '').trim();

    if (title && TARGET_TITLES.some(t => title.includes(t) || t.includes(title))) {
      matchedPosts.push({
        id: doc.id,
        title,
        oldAuthor: data.authorName || '',
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

  console.log(`${matchedPosts.length}개 게시글 발견:\n`);
  for (const post of matchedPosts) {
    console.log(`  "${post.title}" (${post.oldAuthor} → ${NEW_AUTHOR_NAME})`);
  }

  // 2. Firestore posts 컬렉션 업데이트
  console.log('\n[1/2] Firestore posts 업데이트 중...');
  const batch = db.batch();
  for (const post of matchedPosts) {
    const updateData: Record<string, string> = {
      authorName: NEW_AUTHOR_NAME,
    };
    if (newAuthorId) {
      updateData.authorId = newAuthorId;
    }
    batch.update(db.collection('posts').doc(post.id), updateData);
  }
  await batch.commit();
  console.log('  ✓ posts 컬렉션 업데이트 완료');

  // 3. feed.json 업데이트
  console.log('[2/2] feed.json 업데이트 중...');
  try {
    const file = bucket.file('feed.json');
    const [exists] = await file.exists();

    if (exists) {
      const [content] = await file.download();
      const feedData = JSON.parse(content.toString());

      let feedUpdated = 0;
      for (const post of feedData.posts) {
        if (matchedPosts.some(mp => mp.id === post.id)) {
          post.author = NEW_AUTHOR_NAME;
          if (newAuthorId) {
            post.authorId = newAuthorId;
          }
          feedUpdated++;
        }
      }

      await file.save(JSON.stringify(feedData, null, 2), {
        contentType: 'application/json',
        metadata: { cacheControl: 'public, max-age=60' },
      });
      console.log(`  ✓ feed.json 업데이트 완료 (${feedUpdated}개 게시글)`);
    }
  } catch (err) {
    console.error('  ✗ feed.json 업데이트 실패:', err);
  }

  console.log(`\n완료! ${matchedPosts.length}개 게시글의 닉네임이 "${NEW_AUTHOR_NAME}"(으)로 변경되었습니다.\n`);
}

main().catch(console.error);
