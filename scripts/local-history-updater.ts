/**
 * 차트 히스토리 업데이트 (1회성)
 *
 * Firebase Storage의 prices-history/{TICKER}.json 에 빠진 일자의 종가를 채워 넣음.
 * 마지막 거래일까지 이미 있는 종목은 스킵.
 *
 * 실행:
 *   npx tsx scripts/local-history-updater.ts
 *
 * 실행할 때마다 한 번만 돌고 종료. 매일 7시 자동 실행 안 함.
 * → 사용자가 원할 때 배치파일 더블클릭하면 그 시점까지의 종가 동기화.
 */

// 시작 즉시 로그 (init 실패해도 뭐라도 보이게)
console.log('');
console.log('────────────────────────────────────────────────');
console.log('  [START] 차트 히스토리 업데이트 스크립트 진입');
console.log('────────────────────────────────────────────────');

import * as dotenv from 'dotenv';
dotenv.config();
console.log('  ✓ 환경변수 로드');

import { initializeApp, cert, getApps, deleteApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// ⚠️ lib/priceHistory 는 동적 import로 로드됨 (main 함수 안에서)
// 이유: lib/priceHistory → kisTokenManager → lib/firebase-admin 체인이
//      import 시점에 자동 초기화하려 하는데, ES module hoisting으로
//      dotenv.config() 보다 먼저 실행돼서 환경변수를 못 읽음.
//      dynamic import로 미루면 우리가 먼저 Firebase 초기화 → priceHistory 로드 순서 보장.
type PriceHistoryModule = typeof import('../lib/priceHistory');

// ===== 타입 =====
interface FeedPost {
  id: string;
  ticker: string;
  exchange: string;
  createdAt: string;
}

interface FeedData {
  posts: FeedPost[];
}

// ===== Firebase Admin 초기화 =====
if (getApps().length === 0) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8'));
    initializeApp({
      credential: cert(sa),
      storageBucket: `${sa.project_id}.firebasestorage.app`,
    });
    console.log('  ✓ Firebase Admin 초기화 (SERVICE_ACCOUNT_BASE64)');
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    console.log('  ✓ Firebase Admin 초기화 (CLIENT_EMAIL)');
  } else {
    console.error('');
    console.error('  [ERROR] Firebase 인증 정보가 없습니다.');
    console.error('  .env에 FIREBASE_SERVICE_ACCOUNT_BASE64 또는');
    console.error('  FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY 필요');
    console.error('');
    process.exit(1);
  }
}

const bucket = getStorage().bucket();

// ===== 헬퍼 =====

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * 거래소별 "기대되는 마지막 거래일".
 * - CRYPTO: 24/7 → 달력상 어제
 * - 주식: 어제부터 거꾸로 평일 (주말 건너뛰기)
 *   ※ 한국/미국 공휴일은 별도 처리 안 함 — 1년 ~10일 헛 호출 허용
 */
function expectedLastDateStr(exchange: string): string {
  if (exchange.toUpperCase() === 'CRYPTO') return yesterdayStr();
  const d = new Date();
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function findOldestCreatedAt(posts: FeedPost[], ticker: string): Date | null {
  let oldest: Date | null = null;
  for (const p of posts) {
    if ((p.ticker || '').toUpperCase() !== ticker.toUpperCase()) continue;
    const d = new Date(p.createdAt);
    if (isNaN(d.getTime())) continue;
    if (!oldest || d < oldest) oldest = d;
  }
  return oldest;
}

async function syncHistoryForTicker(
  ph: PriceHistoryModule,
  ticker: string,
  exchange: string,
  posts: FeedPost[]
): Promise<'created' | 'updated' | 'skipped' | 'failed'> {
  try {
    const existing = await ph.readHistory(ticker);
    const expected = expectedLastDateStr(exchange);

    // 신규 종목 → 전체 백필
    if (!existing || existing.history.length === 0) {
      const oldest = findOldestCreatedAt(posts, ticker);
      if (!oldest) return 'skipped';
      const file = await ph.backfillTicker(ticker, exchange, oldest);
      const last = file.history[file.history.length - 1];
      console.log(
        `  [신규] ${ticker} (${exchange}) → Storage 저장 성공 ✓ ` +
          `${file.history.length}일치 (마지막 ${last.d} ${last.c.toLocaleString()})`
      );
      return 'created';
    }

    // 이미 마지막 거래일까지 있으면 스킵
    const lastDate = existing.history[existing.history.length - 1].d;
    if (lastDate >= expected) {
      console.log(`  [최신] ${ticker} (${exchange}) — ${lastDate}까지 이미 있음`);
      return 'skipped';
    }

    // 빠진 일자 받아서 append
    const fromDate = new Date(lastDate);
    fromDate.setDate(fromDate.getDate() + 1);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() - 1);

    const newPoints = await ph.fetchDailyRange(ticker, exchange, fromDate, toDate);
    if (newPoints.length === 0) {
      console.log(`  [없음] ${ticker} (${exchange}) — 새 종가 없음 (휴장 등)`);
      return 'skipped';
    }

    const map = new Map<string, number>();
    for (const p of existing.history) map.set(p.d, p.c);
    for (const p of newPoints) map.set(p.d, p.c);
    const merged = Array.from(map.entries())
      .map(([d, c]) => ({ d, c }))
      .sort((a, b) => a.d.localeCompare(b.d));

    existing.history = merged;
    existing.lastUpdated = new Date().toISOString();
    existing.exchange = exchange.toUpperCase();
    await ph.writeHistory(existing);

    const last = merged[merged.length - 1];
    console.log(
      `  [갱신] ${ticker} (${exchange}) → Storage 저장 성공 ✓ ` +
        `+${newPoints.length}일 추가 (마지막 ${last.d} ${last.c.toLocaleString()})`
    );
    return 'updated';
  } catch (err) {
    console.error(`  [실패] ${ticker} (${exchange}):`, err instanceof Error ? err.message : err);
    return 'failed';
  }
}

// ===== 메인 =====
async function syncAllHistories() {
  const startTime = Date.now();
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Value - 차트 히스토리 업데이트              ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`[${now}] 시작\n`);

  // 0. priceHistory 모듈 동적 로드 (Firebase 초기화된 후에 실행)
  console.log('  ✓ lib/priceHistory 동적 로드 중...');
  const ph: PriceHistoryModule = await import('../lib/priceHistory');
  console.log('  ✓ lib/priceHistory 로드 완료\n');

  // 1. feed.json 읽기 (게시글 목록)
  const file = bucket.file('feed.json');
  const [exists] = await file.exists();
  if (!exists) {
    console.log('  feed.json 없음 - 종료');
    return;
  }

  const [content] = await file.download();
  const feedData: FeedData = JSON.parse(content.toString());

  if (!feedData.posts || feedData.posts.length === 0) {
    console.log('  게시글 없음 - 종료');
    return;
  }

  // 2. 대상 티커 수집 (중복 제거)
  const uniqueTickers = new Map<string, { ticker: string; exchange: string }>();
  for (const post of feedData.posts) {
    const ticker = (post.ticker || '').toUpperCase().trim();
    const exchange = (post.exchange || '').toUpperCase().trim();
    if (!ticker || !exchange) continue;
    const key = `${ticker}:${exchange}`;
    if (!uniqueTickers.has(key)) {
      uniqueTickers.set(key, { ticker, exchange });
    }
  }

  console.log(`  게시글 ${feedData.posts.length}개 / 종목 ${uniqueTickers.size}개\n`);

  // 3. ticker별 동기화 (각 ticker 결과는 syncHistoryForTicker 내부에서 로그 출력)
  let created = 0, updated = 0, skipped = 0, failed = 0;
  for (const [, { ticker, exchange }] of uniqueTickers) {
    const result = await syncHistoryForTicker(ph, ticker, exchange, feedData.posts);
    if (result === 'created') created++;
    else if (result === 'updated') updated++;
    else if (result === 'skipped') skipped++;
    else failed++;
    await new Promise(r => setTimeout(r, 250)); // KIS/Upbit rate limit 안전 마진
  }

  const sec = ((Date.now() - startTime) / 1000).toFixed(1);
  const writeCount = created + updated;
  console.log(`\n${'='.repeat(60)}`);
  if (writeCount > 0) {
    console.log(`  ✅ Storage 저장 완료: ${writeCount}개 종목 (신규 ${created} / 갱신 ${updated})`);
  } else {
    console.log(`  ℹ️  새로 저장한 종목 없음 (전부 최신 상태)`);
  }
  console.log(`     스킵 ${skipped} / 실패 ${failed} / 소요 ${sec}초`);
  console.log(`${'='.repeat(60)}\n`);
}

// ===== 실행 =====
// process.exit(0) 대신 Firebase app 명시적 종료 → 이벤트 루프 자연 종료
// (이렇게 해야 stdout 다 flush 된 다음 종료됨, "바로 꺼짐" 방지)
syncAllHistories()
  .catch((err) => {
    console.error('\n[ERROR]', err instanceof Error ? err.stack ?? err.message : err);
  })
  .finally(async () => {
    try {
      const app = getApps()[0];
      if (app) await deleteApp(app);
    } catch {
      // 무시
    }
    console.log('  [END] 스크립트 종료\n');
  });
