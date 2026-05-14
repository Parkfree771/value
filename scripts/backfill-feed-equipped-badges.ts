/**
 * feed.json post 에 작성자의 현재 equippedBadgeId 스냅샷 박기 (1회성 백필)
 *
 * 동작
 *   1) feed.json 로드
 *   2) feed.posts 의 unique authorId 수집
 *   3) users 컬렉션에서 각 작성자의 equippedBadgeId 가져옴
 *   4) post 마다 equippedBadgeId 박음 (null 도 명시적으로)
 *   5) feed.json 저장
 *
 * 사용법
 *   dry-run:
 *     npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/backfill-feed-equipped-badges.ts
 *   적용:
 *     npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/backfill-feed-equipped-badges.ts --apply
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
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

import { BADGES_BY_ID } from '../lib/badges';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

async function main() {
  const db = getFirestore();
  const bucket = getStorage().bucket();
  const file = bucket.file('feed.json');
  const [exists] = await file.exists();
  if (!exists) {
    console.error('feed.json 이 없습니다.');
    process.exit(1);
  }

  const [content] = await file.download();
  const feed = JSON.parse(content.toString());
  console.log(`feed posts: ${feed.posts.length}`);

  // 1) unique authorId
  const uids = Array.from(
    new Set(
      feed.posts.map((p: any) => (typeof p.authorId === 'string' ? p.authorId : null)).filter(Boolean),
    ),
  ) as string[];
  console.log(`unique authorIds: ${uids.length}`);

  // 2) users 일괄 조회
  const refs = uids.map((uid) => db.collection('users').doc(uid));
  const snaps = refs.length > 0 ? await db.getAll(...refs) : [];
  const badgeByUid = new Map<string, string | null>();
  for (const snap of snaps) {
    if (!snap.exists) {
      badgeByUid.set(snap.id, null);
      continue;
    }
    const v = (snap.data() as any)?.equippedBadgeId;
    badgeByUid.set(snap.id, typeof v === 'string' && BADGES_BY_ID[v] ? v : null);
  }

  // 3) post 별 박기
  let changed = 0;
  for (const p of feed.posts) {
    const desired = p.authorId ? badgeByUid.get(p.authorId) ?? null : null;
    if (p.equippedBadgeId !== desired) {
      p.equippedBadgeId = desired;
      changed++;
    }
  }

  console.log(`변경 대상 post: ${changed}`);
  if (!APPLY) {
    console.log('실제 적용은 --apply');
    return;
  }
  if (changed === 0) {
    console.log('변경 없음 — 저장 skip.');
    return;
  }

  feed.lastUpdated = new Date().toISOString();
  await file.save(JSON.stringify(feed, null, 2), {
    contentType: 'application/json',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  console.log('feed.json 저장 완료');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
