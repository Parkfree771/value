/**
 * 종목별 일별 종가 히스토리 백필 (1회성)
 *
 * 실행:
 *   npx tsx scripts/backfill-price-history.ts
 *   npx tsx scripts/backfill-price-history.ts AAPL TSLA   # 특정 ticker만
 *   npx tsx scripts/backfill-price-history.ts --force     # 기존 파일 무시하고 재백필
 *
 * 흐름:
 * 1. feed.json 읽기 → ticker별 가장 오래된 createdAt 추출
 * 2. 각 ticker별로 createdAt~오늘 KIS/Upbit 일봉 조회
 * 3. prices-history/{TICKER}.json 저장
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// ===== Firebase Admin 초기화 =====
if (getApps().length === 0) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const sa = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
    );
    initializeApp({
      credential: cert(sa),
      storageBucket: `${sa.project_id}.firebasestorage.app`,
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
    console.error('[ERROR] Firebase 인증 정보 없음 (.env.local 확인)');
    process.exit(1);
  }
}

// 동적 import: Firebase Admin 초기화 후에 로드
async function main() {
  const { backfillTicker, readHistory } = await import('../lib/priceHistory');
  const bucket = getStorage().bucket();

  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const onlyTickers = args.filter((a) => !a.startsWith('--')).map((s) => s.toUpperCase());

  // ===== 1. feed.json 읽기 =====
  console.log('[Backfill] feed.json 읽는 중...');
  const file = bucket.file('feed.json');
  const [exists] = await file.exists();
  if (!exists) {
    console.error('[ERROR] feed.json 없음');
    process.exit(1);
  }
  const [content] = await file.download();

  interface FeedPost {
    ticker: string;
    exchange: string;
    createdAt: string;
  }
  const feedData = JSON.parse(content.toString()) as { posts: FeedPost[] };

  // ===== 2. ticker별 oldest createdAt 추출 =====
  type Target = { ticker: string; exchange: string; from: Date };
  const targets = new Map<string, Target>();

  for (const post of feedData.posts) {
    const ticker = (post.ticker || '').toUpperCase().trim();
    const exchange = (post.exchange || '').toUpperCase().trim();
    if (!ticker || !exchange) continue;
    if (onlyTickers.length > 0 && !onlyTickers.includes(ticker)) continue;

    const created = new Date(post.createdAt);
    if (isNaN(created.getTime())) continue;

    const existing = targets.get(ticker);
    if (!existing || created < existing.from) {
      targets.set(ticker, { ticker, exchange, from: created });
    }
  }

  console.log(`[Backfill] 대상 ticker ${targets.size}개`);
  if (targets.size === 0) {
    console.log('[Backfill] 처리할 ticker 없음');
    return;
  }

  // ===== 3. 각 ticker 백필 =====
  let success = 0;
  let skipped = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const target of targets.values()) {
    const fromStr = target.from.toISOString().slice(0, 10);
    process.stdout.write(`  ${target.ticker} (${target.exchange}) ${fromStr}~ ... `);

    try {
      // 이미 있으면 skip (--force가 없을 때)
      if (!force) {
        const existing = await readHistory(target.ticker);
        if (existing && existing.history.length > 0) {
          console.log(`스킵 (${existing.history.length} entries)`);
          skipped++;
          continue;
        }
      }

      const result = await backfillTicker(target.ticker, target.exchange, target.from);
      console.log(`✓ ${result.history.length} entries`);
      success++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ ${msg}`);
      failed++;
      failures.push(`${target.ticker}: ${msg}`);
    }

    // ticker 간 200ms 간격 (KIS 안전 마진)
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('');
  console.log(`[Backfill] 완료: ${success}개 성공, ${skipped}개 스킵, ${failed}개 실패`);
  if (failures.length > 0) {
    console.log('[Backfill] 실패 목록:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Backfill] 치명 오류:', err);
    process.exit(1);
  });
