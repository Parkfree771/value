/**
 * 임시 사용자 배지 매핑 스크립트
 *
 * 원칙: feed.json 통계로 *해금 조건이 충족된 배지* 만 장착.
 *       조건 미충족 배지는 매핑에 적어도 거부됨 (에러로 종료).
 *
 * 사용법
 *   dry-run (실제로 쓰지 않음 · 디폴트):
 *     npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/equip-temp-user-badges.ts
 *   실제 적용:
 *     npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/equip-temp-user-badges.ts --apply
 *   특정 닉네임만:
 *     npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/equip-temp-user-badges.ts --apply --nickname="도널드덕"
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';
import {
  BADGES_BY_ID,
  calculateUserStats,
  getUnlockedBadgeIds,
  type PostForStats,
} from '../lib/badges';

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
const bucket = getStorage().bucket();

// ─── uid → 부여할 배지 ID ───
// 원칙: 각 사용자가 *해금한* 배지 중 캐릭터를 가장 잘 살리는 1개.
// 해금 안 된 배지를 적으면 스크립트가 거부함.
const BADGE_OVERRIDES: Record<string, string> = {
  // 전문가 추적 — 직접 short 4 + 인버스 ETF 3 → 효과적 숏 7개
  'guru-tracker-system':         'short-master',
  // Boltzman — 11종목 미국 가치투자 다양화
  'user-boltzman-v01':           'variety-10',
  // 글로벌리서치 — 9종목 (잡식 1개 부족), 입문 분석가가 최선
  'user-globalresearch-v01':     'posts-5',
  // 도널드덕 — 글 8개 전부 인버스 ETF
  'user-donaldduck-v01':         'short-master',
  // 선반영 — MU +147%, 반도체 잭팟
  'user-sunbanyoung-v01':        'jackpot-100',
  // 東風 — 일본 시장 5개
  'user-dongpung-v01':           'posts-5',
  // 어디서바라보는가 — CES 현대차 +107%
  'user-eodiseo-v01':            'jackpot-100',

  // ─── 글 5개 미만 작가들 (새 배지 도입 후 매핑) ───
  // 비트코인 — CRYPTO 글 1+
  'user-bitcoin-v01':            'crypto-pioneer',
  // gururu — 13F 추적, 글 3개
  'user-gururu-v01':             'posts-1',
  // 만리경 — 중국주 2개
  'b6c4103e-ab74-415b-bca1-d4c349428f72': 'posts-1',
  // Minsky — 174360 short + 252670 인버스 = effective short 2
  'a1d008ac-2f4f-432b-bfc1-1bde847010b4': 'bear-shy',
  // rlatks — 방산
  '2616e752-1877-435d-a4f3-fcaa003c57bc': 'posts-1',
  // danielc — SQQQ 인버스
  '3427fbc6-c5e4-4bb7-9384-651e931d573e': 'bear-shy',
  // kyal2 — QQQ
  '40da658b-491c-4a2d-9d99-5a823a2b3cef': 'posts-1',
  // rkclxnwk — SBUX
  'c83bfa7f-edf5-4812-99cd-54cb96ed5e43': 'posts-1',
  // qkrtkddyd — 기후·농산물
  'db23ecf7-0a39-47a4-b56b-057427444a8d': 'posts-1',
  // rkdldj88 — 233160 인버스 ETF
  'f7c9026b-798a-4ac4-a375-009999d0ae6e': 'bear-shy',
  // vellum — 005930 long
  'user-vellum-v01':             'posts-1',
};

// ─── 인자 ───
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FILTER_NICK = args.find((a) => a.startsWith('--nickname='))?.slice('--nickname='.length);

async function main() {
  // 1. 매핑 검증
  for (const [uid, badgeId] of Object.entries(BADGE_OVERRIDES)) {
    if (!BADGES_BY_ID[badgeId]) {
      console.error(`✗ 알 수 없는 배지 ID: ${badgeId} (uid=${uid})`);
      process.exit(1);
    }
  }

  // 2. feed.json 로드 → authorId 별 글
  const [content] = await bucket.file('feed.json').download();
  const feed: { posts: any[] } = JSON.parse(content.toString());
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

  // 3. 대상 사용자 로드
  const uids = Object.keys(BADGE_OVERRIDES);
  const userRefs = uids.map((uid) => db.collection('users').doc(uid));
  const snaps = await db.getAll(...userRefs);

  console.log(`\n═══ ${APPLY ? 'APPLY' : 'DRY-RUN'}  ·  매핑 대상 ${uids.length}명 ═══\n`);

  let toApply: { uid: string; nickname: string; before: string | null; after: string }[] = [];
  let skipNoChange = 0;
  let missing = 0;

  for (const snap of snaps) {
    if (!snap.exists) {
      console.log(`✗ uid=${snap.id} — users 컬렉션에 없음`);
      missing++;
      continue;
    }
    const data = snap.data() as any;
    const uid = snap.id;
    const nickname: string = data.nickname || '(닉네임 없음)';
    if (FILTER_NICK && nickname !== FILTER_NICK) continue;

    const before: string | null =
      typeof data.equippedBadgeId === 'string' && BADGES_BY_ID[data.equippedBadgeId]
        ? data.equippedBadgeId
        : null;
    const after = BADGE_OVERRIDES[uid];

    const posts = byAuthor.get(uid) ?? [];
    const stats = calculateUserStats(posts);
    const unlocked = getUnlockedBadgeIds(stats);
    const isUnlocked = unlocked.includes(after);

    const beforeName = before ? BADGES_BY_ID[before].name : '—';
    const afterName = BADGES_BY_ID[after].name;

    // 해금 안 된 배지는 거부 — 사용자 정책상 잠금 배지 장착 금지
    if (!isUnlocked) {
      console.error(
        `✗ ${nickname} (uid=${uid}): "${afterName}" 미해금 상태. ` +
        `해금된 배지: [${unlocked.map((id) => BADGES_BY_ID[id]?.name ?? id).join(', ') || '없음'}]`,
      );
      process.exit(1);
    }

    if (before === after) {
      console.log(`= ${nickname.padEnd(15)} ${beforeName.padEnd(14)} (변경 없음)`);
      skipNoChange++;
    } else {
      console.log(
        `${APPLY ? '→' : '·'} ${nickname.padEnd(15)} ${beforeName.padEnd(14)} → ${afterName.padEnd(14)}  posts=${posts.length}`,
      );
      toApply.push({ uid, nickname, before, after });
    }
  }

  console.log(`\n──────────────────────────────────────`);
  console.log(`변경 필요 ${toApply.length}명 · 동일 ${skipNoChange}명 · 사용자 없음 ${missing}명`);

  if (!APPLY) {
    console.log('\n실제 적용하려면 --apply 플래그 추가');
    return;
  }
  if (toApply.length === 0) {
    console.log('적용할 변경 없음.');
    return;
  }

  // 4. 적용
  console.log('\n[적용 중...]');
  const now = new Date().toISOString();
  for (const t of toApply) {
    await db.collection('users').doc(t.uid).update({
      equippedBadgeId: t.after,
      updatedAt: now,
    });
    console.log(`  ✓ ${t.nickname} → ${BADGES_BY_ID[t.after].name}`);
  }
  console.log('\n완료.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
