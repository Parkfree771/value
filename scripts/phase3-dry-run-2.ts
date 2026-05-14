/**
 * Phase 3 dry-run 2단계 — likedBy/unlockedBadgeIds 임베드 데이터 정확 카운트
 *
 * 1차 dry-run 결과 좋아요/배지는 별도 컬렉션이 아니라
 *   posts.likedBy[] · users.unlockedBadgeIds[] 배열로 임베드된 것 확인.
 *
 * 이 스크립트는 그 임베드 데이터를 펼쳐서 실제 행 수를 계산하고
 * Postgres post_likes / user_badges 테이블에 들어갈 행 수를 추정.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' Phase 3 dry-run 2 — 임베드 카운트 + 매핑');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ───────── posts.likedBy ─────────
  const postsSnap = await db.collection('posts').get();
  let totalLikes = 0;
  const postLikePairs: { post_id: string; user_id: string; created_at: string }[] = [];
  const uniqueLikerUids = new Set<string>();
  const postAuthors = new Set<string>();
  const authorEmailByUid = new Map<string, string>();
  const authorNameByUid = new Map<string, string>();
  let postsWithImages = 0;
  let postsWithFiles = 0;

  for (const doc of postsSnap.docs) {
    const d = doc.data();
    const likedBy = (d.likedBy ?? []) as string[];
    totalLikes += likedBy.length;
    for (const uid of likedBy) {
      uniqueLikerUids.add(uid);
      postLikePairs.push({
        post_id: doc.id,
        user_id: uid,
        created_at: '',
      });
    }
    if (d.authorId) postAuthors.add(d.authorId as string);
    if (d.authorId && d.authorEmail) authorEmailByUid.set(d.authorId as string, d.authorEmail as string);
    if (d.authorId && d.authorName) authorNameByUid.set(d.authorId as string, d.authorName as string);
    if (Array.isArray(d.images) && d.images.length > 0) postsWithImages++;
    if (Array.isArray(d.files) && d.files.length > 0) postsWithFiles++;
  }
  console.log(`posts: ${postsSnap.size}개`);
  console.log(`  · likedBy 총합 (= post_likes 행 수): ${totalLikes}`);
  console.log(`  · 좋아요 누른 유니크 유저: ${uniqueLikerUids.size}`);
  console.log(`  · 이미지 있는 글: ${postsWithImages}`);
  console.log(`  · 파일(PDF) 있는 글: ${postsWithFiles}`);
  console.log(`  · 글 작성자(distinct authorId): ${postAuthors.size}`);

  // ───────── users.unlockedBadgeIds + equippedBadgeId ─────────
  const usersSnap = await db.collection('users').get();
  let totalUnlocked = 0;
  let totalEquipped = 0;
  const allUserUids = new Set<string>();
  const userDetail: Array<{
    uid: string;
    nickname: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    onboardingCompleted: boolean;
    unlockedCount: number;
    equipped: string | null;
    isWriterInPosts: boolean;
    bio: string | null;
  }> = [];

  for (const doc of usersSnap.docs) {
    const d = doc.data();
    allUserUids.add(doc.id);
    const unlocked = (d.unlockedBadgeIds ?? []) as string[];
    totalUnlocked += unlocked.length;
    if (d.equippedBadgeId) totalEquipped++;
    userDetail.push({
      uid: doc.id,
      nickname: (d.nickname ?? '') as string,
      email: (d.email ?? null) as string | null,
      displayName: (d.displayName ?? null) as string | null,
      photoURL: (d.photoURL ?? null) as string | null,
      onboardingCompleted: (d.onboardingCompleted ?? false) as boolean,
      unlockedCount: unlocked.length,
      equipped: (d.equippedBadgeId ?? null) as string | null,
      isWriterInPosts: postAuthors.has(doc.id),
      bio: (d.bio ?? null) as string | null,
    });
  }

  console.log(`\nusers: ${usersSnap.size}명`);
  console.log(`  · unlockedBadgeIds 총합 (= user_badges 행 수): ${totalUnlocked}`);
  console.log(`  · equippedBadgeId 보유: ${totalEquipped}`);

  // ───────── 작성자 UID 매핑 — users에 없는 authorId 있나? ─────────
  const orphanAuthors: string[] = [];
  for (const aid of postAuthors) {
    if (!allUserUids.has(aid)) orphanAuthors.push(aid);
  }
  console.log(`\n작성자 무결성: posts.authorId 중 users에 없는 UID: ${orphanAuthors.length}`);
  if (orphanAuthors.length > 0) {
    console.log('  · orphan authorIds:', orphanAuthors);
  }

  // ───────── bookmarks ─────────
  const bmSnap = await db.collection('bookmarks').get();
  const bookmarks: { user_id: string; post_id: string; created_at: string }[] = [];
  for (const doc of bmSnap.docs) {
    const d = doc.data();
    const userId = (d.userId ?? '') as string;
    const postId = (d.postId ?? '') as string;
    const ts = d.bookmarkedAt;
    const createdAt =
      ts && typeof ts === 'object' && '_seconds' in ts
        ? new Date(((ts as { _seconds: number })._seconds) * 1000).toISOString()
        : '';
    if (userId && postId) bookmarks.push({ user_id: userId, post_id: postId, created_at: createdAt });
  }
  console.log(`\nbookmarks: ${bookmarks.length}`);

  // ───────── 사용자별 표 ─────────
  console.log('\n[사용자별 요약 — 처음 5명]');
  console.table(
    userDetail.slice(0, 5).map((u) => ({
      uid: u.uid.slice(0, 10) + '…',
      nick: u.nickname,
      email: u.email ?? '-',
      writer: u.isWriterInPosts,
      badges: u.unlockedCount,
      equipped: u.equipped?.slice(0, 12) ?? '-',
      onboard: u.onboardingCompleted,
    })),
  );

  // ───────── 결과 저장 ─────────
  const outDir = path.join(process.cwd(), 'scripts', 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'phase3-dryrun-2.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          users: usersSnap.size,
          posts: postsSnap.size,
          postLikes: totalLikes,
          bookmarks: bookmarks.length,
          userBadges: totalUnlocked,
          equipped: totalEquipped,
          postsWithImages,
          postsWithFiles,
        },
        users: userDetail,
        orphanAuthors,
      },
      null,
      2,
    ),
    'utf-8',
  );
  console.log(`\n저장: ${outPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('실패:', err);
    process.exit(1);
  });
