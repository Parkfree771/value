/**
 * 전문가 추적기 유저 생성 + 게시글 작성자 변경 스크립트
 *
 * 1. Firestore users 컬렉션에 "전문가 추적기" 유저를 생성
 * 2. 지정된 게시글들의 authorId/authorName을 전문가 추적기로 변경
 * 3. feed.json도 갱신
 *
 * 사용법:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/create-guru-user-and-reassign.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// ============================================================
// 설정
// ============================================================

const GURU_USER_UID = 'guru-tracker-system';
const GURU_USER_NICKNAME = '전문가 추적';
const GURU_USER_EMAIL = 'guru-tracker@system.local';

// 변경할 게시글 제목 (부분 일치)
const TARGET_TITLES = [
  '노무라 증권 미-이란 전쟁에도',
  'BillAckman',
  '톰리 전쟁속에서도 S&P500',
];

// ============================================================

import * as dotenv from 'dotenv';
dotenv.config();

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
  // 1. 전문가 추적기 유저 생성/업데이트
  console.log('\n[1/3] 전문가 추적기 유저 생성 중...');
  const userRef = db.collection('users').doc(GURU_USER_UID);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    console.log('  → 이미 존재합니다. 업데이트합니다.');
    await userRef.update({
      nickname: GURU_USER_NICKNAME,
      updatedAt: Timestamp.now(),
    });
  } else {
    await userRef.set({
      uid: GURU_USER_UID,
      email: GURU_USER_EMAIL,
      displayName: GURU_USER_NICKNAME,
      nickname: GURU_USER_NICKNAME,
      photoURL: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      onboardingCompleted: true,
      termsAgreed: true,
      privacyAgreed: true,
      investmentDisclaimerAgreed: true,
      marketingAgreed: false,
      bio: '전문가들의 투자 의견을 추적합니다.',
      isSystemUser: true,
    });
    console.log('  ✓ 전문가 추적기 유저 생성 완료');
  }

  // 2. 게시글 검색 및 작성자 변경
  console.log('\n[2/3] 게시글 작성자 변경 중...');
  const postsSnapshot = await db.collection('posts').get();
  const matchedPosts: { id: string; title: string; oldAuthor: string; oldAuthorId: string }[] = [];

  for (const doc of postsSnapshot.docs) {
    const data = doc.data();
    const title = (data.title || '').trim();

    if (TARGET_TITLES.some(t => title.includes(t))) {
      matchedPosts.push({
        id: doc.id,
        title,
        oldAuthor: data.authorName || '',
        oldAuthorId: data.authorId || '',
      });
    }
  }

  if (matchedPosts.length === 0) {
    console.log('  일치하는 게시글을 찾지 못했습니다.');
    console.log('\n  전체 게시글 제목 목록:');
    for (const doc of postsSnapshot.docs) {
      console.log(`    - "${doc.data().title}" (by ${doc.data().authorName})`);
    }
    return;
  }

  console.log(`  ${matchedPosts.length}개 게시글 발견:\n`);
  for (const post of matchedPosts) {
    console.log(`    "${post.title}"`);
    console.log(`      작성자: ${post.oldAuthor} (${post.oldAuthorId}) → ${GURU_USER_NICKNAME} (${GURU_USER_UID})`);
  }

  const batch = db.batch();
  for (const post of matchedPosts) {
    batch.update(db.collection('posts').doc(post.id), {
      authorId: GURU_USER_UID,
      authorName: GURU_USER_NICKNAME,
      authorEmail: GURU_USER_EMAIL,
    });
  }
  await batch.commit();
  console.log(`\n  ✓ ${matchedPosts.length}개 게시글 작성자 변경 완료`);

  // 3. feed.json 업데이트
  console.log('\n[3/3] feed.json 업데이트 중...');
  try {
    const file = bucket.file('feed.json');
    const [exists] = await file.exists();

    if (exists) {
      const [content] = await file.download();
      const feedData = JSON.parse(content.toString());

      let feedUpdated = 0;
      for (const post of feedData.posts) {
        if (matchedPosts.some(mp => mp.id === post.id)) {
          // author 필드만 변경, 가격 등 다른 필드는 절대 건드리지 않음
          post.author = GURU_USER_NICKNAME;
          feedUpdated++;
        }
      }

      await file.save(JSON.stringify(feedData, null, 2), {
        contentType: 'application/json',
        metadata: { cacheControl: 'public, max-age=60' },
      });
      console.log(`  ✓ feed.json 업데이트 완료 (${feedUpdated}개 게시글)`);
    } else {
      console.log('  feed.json이 존재하지 않습니다.');
    }
  } catch (err) {
    console.error('  ✗ feed.json 업데이트 실패:', err);
  }

  console.log(`\n완료! 전문가 추적기 유저 생성 + ${matchedPosts.length}개 게시글 작성자 변경되었습니다.\n`);
}

main().catch(console.error);
