/**
 * 사용자 배지 진단 스크립트 (read-only)
 *
 * 데이터 소스: Firebase Storage 의 feed.json
 *   - posts 컬렉션은 returnRate 가 비어 있고 currentPrice 도 작성 당시 스냅샷이라
 *     배지 통계 계산에 쓸 수 없음.
 *   - feed.json 은 가격 cron 이 갱신하는 single source of truth.
 *
 * 보여주는 것
 *   1) 임시(시드/스크립트로 생성된) 사용자 식별
 *   2) 각 사용자의 글 통계 + 현재 장착 배지 + 해금된 배지 ID 목록
 *   3) 데이터 무결성 경고 (authorName 누락, 잠금 배지 장착 등)
 *
 * 사용법
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/inspect-user-badges.ts
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/inspect-user-badges.ts --all      (실유저 포함)
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/inspect-user-badges.ts --nickname="만리경"
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';
import {
  BADGES,
  BADGES_BY_ID,
  calculateUserStats,
  getUnlockedBadgeIds,
  isInverseEtf,
  type PostForStats,
} from '../lib/badges';

dotenv.config({ path: '.env.local' });
dotenv.config();

if (getApps().length === 0) {
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    console.error('Firebase 인증 정보가 없습니다. (.env / .env.local)');
    process.exit(1);
  }
}

const db = getFirestore();
const bucket = getStorage().bucket();

const args = process.argv.slice(2);
const INCLUDE_ALL = args.includes('--all');
const FILTER_NICK = args.find((a) => a.startsWith('--nickname='))?.slice('--nickname='.length);

// ─── 임시 사용자 식별 ───
// 운영 Firebase Auth uid 는 28자 영숫자. 시드/관리 스크립트는 일관된 prefix 부여.
const TEMP_UID_PREFIXES = ['user-', 'guru-tracker-', 'seed-user-'];
const TEMP_EMAIL_RE = [
  /\.local$/i,
  /\.invalid$/i,
  /@example\.(com|invalid|org|net)$/i,
  /@test\.(com|invalid|local)$/i,
];
function isTempUser(u: { uid: string; email?: string; bio?: string }): boolean {
  if (TEMP_UID_PREFIXES.some((p) => u.uid.startsWith(p))) return true;
  if (u.email && TEMP_EMAIL_RE.some((re) => re.test(u.email!))) return true;
  if (u.bio && u.bio.includes('시드 데이터로 생성된 사용자입니다.')) return true;
  return false;
}

async function main() {
  // 1. users
  const usnap = await db.collection('users').get();
  const users: { uid: string; nickname: string; email: string; bio: string; equippedBadgeId: string | null; isWithdrawn: boolean }[] = [];
  usnap.forEach((d) => {
    const x = d.data();
    users.push({
      uid: d.id,
      nickname: x.nickname || '',
      email: x.email || '',
      bio: x.bio || '',
      equippedBadgeId:
        typeof x.equippedBadgeId === 'string' && BADGES_BY_ID[x.equippedBadgeId]
          ? x.equippedBadgeId
          : null,
      isWithdrawn: !!x.isWithdrawn,
    });
  });

  // 2. feed.json
  const [content] = await bucket.file('feed.json').download();
  const feed: { posts: any[]; lastUpdated: string } = JSON.parse(content.toString());
  console.log(`feed.json lastUpdated: ${feed.lastUpdated}  · posts: ${feed.posts.length}`);

  // 3. authorId → posts
  const byAuthor = new Map<string, PostForStats[]>();
  for (const p of feed.posts) {
    if (!p.authorId) continue;
    const arr = byAuthor.get(p.authorId) ?? [];
    arr.push({
      returnRate: typeof p.returnRate === 'number' ? p.returnRate : 0,
      views: p.views ?? 0,
      likes: p.likes ?? 0,
      positionType: p.positionType,
      ticker: p.ticker,
      stockName: p.stockName,
      exchange: p.exchange,
    });
    byAuthor.set(p.authorId, arr);
  }

  // 4. 필터
  const target = users
    .filter((u) => !u.isWithdrawn)
    .filter((u) => (INCLUDE_ALL ? true : isTempUser(u)))
    .filter((u) => (FILTER_NICK ? u.nickname === FILTER_NICK : true));

  if (target.length === 0) {
    console.log('대상 사용자가 없습니다.');
    return;
  }

  // 5. 정렬: 글 많은 사람부터
  target.sort((a, b) => (byAuthor.get(b.uid)?.length ?? 0) - (byAuthor.get(a.uid)?.length ?? 0));

  // 6. 출력
  let warnEquipped = 0;
  let withEquipped = 0;
  for (const u of target) {
    const posts = byAuthor.get(u.uid) ?? [];
    const s = calculateUserStats(posts);
    const unlocked = getUnlockedBadgeIds(s);
    const equipped = u.equippedBadgeId;
    const equippedDef = equipped ? BADGES_BY_ID[equipped] : null;
    const equippedLocked = !!equipped && !unlocked.includes(equipped);
    if (equipped) withEquipped++;
    if (equippedLocked) warnEquipped++;

    const invertedLong = posts.filter((p) => isInverseEtf(p.ticker) && p.positionType !== 'short').length;

    console.log('\n──────────────────────────────────────────────────────────');
    console.log(`▸ ${u.nickname || '(닉네임 없음)'}  · uid=${u.uid}  · ${isTempUser(u) ? '[임시]' : '[실]'}`);
    console.log(`  email   : ${u.email}`);
    if (u.bio) console.log(`  bio     : ${u.bio}`);
    console.log(`  posts   : ${posts.length}개  (인버스 ETF long ${invertedLong}개)`);
    console.log(
      `  stats   : 평균 ${s.avgReturnRate.toFixed(1)}% / 최대 ${s.maxReturnRate.toFixed(
        1,
      )}% / 최소 ${s.minReturnRate.toFixed(1)}% / 승률 ${s.winRate.toFixed(0)}% / 숏(인버스 포함) ${s.shortPositions}개(평균 ${s.shortAvgReturnRate.toFixed(1)}%)`,
    );
    console.log(`            조회 ${s.totalViews.toLocaleString()} / 좋아요 ${s.totalLikes} / 종목 ${s.uniqueTickers}개`);
    console.log(
      `  장착    : ${equippedDef ? equippedDef.name + (equippedLocked ? '  ⚠ 잠금 상태(조건 미충족)' : '') : '—'}`,
    );
    if (unlocked.length === 0) {
      console.log(`  해금    : (없음)`);
    } else {
      console.log(`  해금 ${unlocked.length}개:`);
      for (const id of unlocked) {
        const def = BADGES_BY_ID[id];
        if (!def) continue;
        const star = id === equipped ? ' ★장착' : '';
        console.log(`            · ${def.name.padEnd(12)} (${def.description})${star}`);
      }
    }
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`총 ${target.length}명  ·  장착 ${withEquipped}명  ·  잠금 상태 장착 경고 ${warnEquipped}명`);
  console.log('══════════════════════════════════════════════════════════');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
