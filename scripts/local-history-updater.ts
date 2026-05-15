/**
 * 차트 히스토리 업데이트 (PC 메인, 일 1회 수동 실행)
 *
 * 사장님 의도:
 *   - PC 배치파일이 메인, Supabase 장 마감 cron은 보조 fallback
 *   - 매일 한 번 .bat 더블클릭 → 그 시점까지 모든 ticker의 종가가 price_history에 1행/일 보장
 *
 * 흐름:
 *   1. posts 테이블에서 모든 (ticker, exchange, created_at) 조회
 *   2. ticker × exchange 별 oldest created_at 추출 (그 종목이 처음 등장한 날)
 *   3. 각 ticker마다:
 *      - 기존 price_history dates 조회
 *      - oldest ~ yesterday 기대 거래일(주식=평일 / 코인=전체) 계산
 *      - 빠진 일자 0개 → 스킵
 *      - 빠진 일자 있음 → oldest~yesterday 전체 KIS/Upbit fetch (UPSERT라 중복 무해)
 *      - 머지 → price_history UPSERT (onConflict ticker,date)
 *
 * 실행: 차트업데이트.bat → npx tsx scripts/local-history-updater.ts
 *
 * 환경변수:
 *   - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 *   - KIS_APP_KEY, KIS_APP_SECRET, KIS_BASE_URL
 */

console.log('');
console.log('────────────────────────────────────────────────');
console.log('  [START] 차트 히스토리 업데이트');
console.log('────────────────────────────────────────────────');

import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// .env.local도 시도 (Next.js 관례). 둘 다 있으면 dotenv/config가 먼저 .env를 읽고, .env.local이 덮어씀.
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

// lib/priceHistory는 dynamic import — getServiceClient가 env 읽는 시점이 호출 시점이라
// 정적 import해도 동작하지만 명시적으로 늦추는 게 향후 유지보수에 안전.
type PriceHistoryModule = typeof import('../lib/priceHistory');

// ===== Supabase Admin =====
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !supabaseSecret) {
  console.error('  [ERROR] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 누락');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseSecret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
console.log('  ✓ Supabase admin 클라이언트 준비');

// ===== 날짜 유틸 =====

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 1);
  return d;
}

/**
 * fromDate ~ toDate 범위의 기대 거래일 리스트.
 *  - 주식: 평일 (주말 제외, 한국·미국 공휴일은 별도 처리 안 함 → 휴장일이면 API가 빈 응답 = 자연 스킵)
 *  - 코인: 전체 일자 (24/7)
 */
function expectedTradingDates(exchange: string, fromDate: Date, toDate: Date): string[] {
  const isCrypto = exchange.toUpperCase() === 'CRYPTO';
  const dates: string[] = [];
  const cur = new Date(fromDate);
  cur.setHours(0, 0, 0, 0);
  while (cur <= toDate) {
    const day = cur.getDay(); // 0=Sun, 6=Sat
    if (isCrypto || (day !== 0 && day !== 6)) {
      dates.push(fmtDate(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ===== 메인 =====
async function main() {
  const startTime = Date.now();
  const nowStr = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Value - 차트 히스토리 업데이트              ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  [${nowStr}] 시작`);
  console.log('');

  console.log('  lib/priceHistory 로드 중...');
  const ph: PriceHistoryModule = await import('../lib/priceHistory');
  console.log('  ✓ 로드 완료');
  console.log('');

  // 1. posts 조회
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('ticker, exchange, created_at');
  if (postsError) {
    console.error('  [ERROR] posts 조회 실패:', postsError);
    process.exit(1);
  }
  if (!posts || posts.length === 0) {
    console.log('  posts 없음 - 종료');
    return;
  }
  console.log(`  posts 총 ${posts.length}개`);

  // 2. ticker × exchange 별 oldest created_at
  const tickerMap = new Map<string, { ticker: string; exchange: string; oldest: Date }>();
  for (const p of posts) {
    const t = (p.ticker || '').toUpperCase().trim();
    const e = (p.exchange || '').toUpperCase().trim();
    if (!t || !e) continue;
    const created = new Date(p.created_at as string);
    if (Number.isNaN(created.getTime())) continue;
    const key = `${t}:${e}`;
    const existing = tickerMap.get(key);
    if (!existing || created < existing.oldest) {
      tickerMap.set(key, { ticker: t, exchange: e, oldest: created });
    }
  }
  console.log(`  대상 ticker × exchange: ${tickerMap.size}개`);
  console.log('');

  // 3. 각 ticker마다 빠진 일자 체크 & UPSERT
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };
  const yest = yesterday();

  for (const { ticker, exchange, oldest } of tickerMap.values()) {
    try {
      const existing = await ph.readHistory(ticker);
      const expected = expectedTradingDates(exchange, oldest, yest);

      if (expected.length === 0) {
        // oldest가 어제보다 미래 — 게시물이 오늘 작성된 경우 등. 차트 없어도 OK.
        console.log(`  [건너뜀] ${ticker} (${exchange}) — 기대 거래일 0 (게시물이 오늘?)`);
        stats.skipped++;
        continue;
      }

      const existingDates = new Set((existing?.history ?? []).map((p) => p.d));
      const missing = expected.filter((d) => !existingDates.has(d));

      if (missing.length === 0) {
        console.log(
          `  [최신] ${ticker} (${exchange}) — ${expected.length}일치 완비 (~${expected[expected.length - 1]})`,
        );
        stats.skipped++;
        continue;
      }

      console.log(
        `  [받기] ${ticker} (${exchange}) — 빠진 ${missing.length}일 ` +
          `(첫 ${missing[0]} … 마지막 ${missing[missing.length - 1]})`,
      );

      // 빠진 게 있으면 oldest~yest 전체 받아 머지 (UPSERT는 같은 ticker,date면 같은 값 덮어쓰기, 무해)
      const points = await ph.fetchDailyRange(ticker, exchange, oldest, yest);
      if (points.length === 0) {
        console.log(`    → API가 0건 반환 (장기 휴장 / API 오류)`);
        stats.failed++;
        continue;
      }

      // 머지: 기존 + 새 데이터 (같은 날짜는 새 데이터 우선)
      const merged = new Map<string, number>();
      for (const p of existing?.history ?? []) merged.set(p.d, p.c);
      for (const p of points) merged.set(p.d, p.c);
      const mergedArr = Array.from(merged.entries())
        .map(([d, c]) => ({ d, c }))
        .sort((a, b) => a.d.localeCompare(b.d));

      await ph.writeHistory({
        ticker,
        exchange,
        lastUpdated: new Date().toISOString(),
        history: mergedArr,
      });

      const last = mergedArr[mergedArr.length - 1];
      const isNew = !existing || existing.history.length === 0;
      console.log(
        `    → ${isNew ? '신규' : '갱신'} ${mergedArr.length}일치 (마지막 ${last.d} ${last.c.toLocaleString()})`,
      );
      if (isNew) stats.created++;
      else stats.updated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [실패] ${ticker} (${exchange}): ${msg}`);
      stats.failed++;
    }
    // KIS rate limit 안전마진 (공식 초당 20회 → 250ms = 4회/초)
    await new Promise((r) => setTimeout(r, 250));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log(`║   완료 (${duration}s)`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  - 신규 백필:    ${stats.created}`);
  console.log(`  - 빠진 일자 채움: ${stats.updated}`);
  console.log(`  - 스킵 (이미 최신): ${stats.skipped}`);
  console.log(`  - 실패:         ${stats.failed}`);
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[CRITICAL]', err);
    process.exit(1);
  });
