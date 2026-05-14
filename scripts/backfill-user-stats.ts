/**
 * 사용자 통계·해금배지 백필 스크립트
 *
 * 현재 feed.json 을 기준으로 모든 사용자의 stats / unlockedBadgeIds /
 * lastStatsUpdate 를 users 컬렉션에 1회 채워넣는다.
 * lib/userStats.ts 의 recomputeAllUserStatsFromFeed 를 그대로 호출하므로
 * 런타임 트리거와 동일한 로직.
 *
 * 사용법
 *   dry-run:
 *     npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/backfill-user-stats.ts
 *   적용:
 *     npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/backfill-user-stats.ts --apply
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
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

import { recomputeAllUserStatsFromFeed } from '../lib/userStats';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

async function main() {
  const bucket = getStorage().bucket();
  const [content] = await bucket.file('feed.json').download();
  const feed: { posts: any[]; lastUpdated: string } = JSON.parse(content.toString());

  console.log(`feed.json lastUpdated: ${feed.lastUpdated} · posts: ${feed.posts.length}`);
  console.log(`${APPLY ? 'APPLY' : 'DRY-RUN'} 모드로 백필 시작...\n`);

  const r = await recomputeAllUserStatsFromFeed(feed.posts, { dryRun: !APPLY });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`feed 등장 authorId : ${r.scanned}`);
  console.log(`users 도큐먼트 없음 : ${r.skippedMissing}`);
  console.log(`변경 대상           : ${r.written}`);
  console.log(`신규 해금 합산      : ${r.newlyUnlocked}개`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (!APPLY) console.log('\n실제 적용은 --apply');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
