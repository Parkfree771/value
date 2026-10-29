/**
 * 액면분할/병합 가격 보정 스크립트
 *
 * test-split-detect.ts로 적용일 D와 배율 R을 확정한 뒤 실행.
 * (R = 옛 종가에 곱해 새 스케일로 만드는 값. 1:10 역분할이면 R=10, 10:1 분할이면 R=0.1)
 *
 * 보정 내용:
 *   1. price_history: date < D 인 행의 close × R
 *   2. posts (created_at < D):
 *      - initial_price × R, target_price × R, stock_data.currentPrice × R
 *      - return_rate 재계산 (long: (cur-init)/init, short: (init-cur)/init)
 *      - prev_return_rate = 재계산된 return_rate (보정 직후 등락 표시 튀지 않게)
 *
 * --apply 시 모든 UPDATE를 한 트랜잭션으로 묶어 원자적으로 반영 (중간 실패 시 전체 롤백 →
 * 일부만 ×R 된 상태로 남아 재실행 시 중복 ×R 되는 사고 방지).
 *
 * 환경변수: DATABASE_URL (Neon Postgres)
 *
 * 실행 (기본 dry-run, --apply 붙여야 실제 반영):
 *   npx tsx scripts/fix-split.ts SOXS 2026-07-15 10
 *   npx tsx scripts/fix-split.ts SOXS 2026-07-15 10 --apply
 */
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });
import { neon } from '@neondatabase/serverless';

const [ticker, D, rStr] = [process.argv[2]?.toUpperCase(), process.argv[3], process.argv[4]];
const R = parseFloat(rStr ?? '');
const apply = process.argv.includes('--apply');

if (!ticker || !/^\d{4}-\d{2}-\d{2}$/.test(D ?? '') || !isFinite(R) || R <= 0) {
  console.error('사용법: npx tsx scripts/fix-split.ts <TICKER> <D: YYYY-MM-DD> <R> [--apply]');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('환경변수 DATABASE_URL 누락');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const round2 = (n: number) => Math.round(n * 100) / 100;
// 부동소수점 곱셈 찌꺼기 방지 (42.8*10 = 428.00000000000006)
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
// posts.created_at 비교 기준 — D 00:00 UTC (기존 Supabase 세션 타임존 UTC와 동일하게 명시)
const D_UTC = `${D}T00:00:00Z`;

(async () => {
  console.log(`\n=== ${ticker} 분할 보정 — D=${D}, R=${R} ${apply ? '(실제 반영)' : '(dry-run)'} ===\n`);

  // 트랜잭션에 넣을 UPDATE 모음 (--apply 일 때만 마지막에 한 번에 실행)
  const queries: ReturnType<typeof sql>[] = [];

  // ── 1. price_history: date < D → close × R ──
  // numeric은 문자열로 오므로 Number(), date는 text로 캐스팅해 'YYYY-MM-DD' 그대로 받음
  const hist = (await sql`
    select date::text as date, close from price_history
    where ticker = ${ticker} and date < ${D}::date
    order by date asc
  `).map((r) => ({ date: r.date as string, close: Number(r.close) }));
  console.log(`price_history 보정 대상: ${hist.length}행 (${hist[0]?.date} ~ ${hist.at(-1)?.date})`);

  if (apply && hist.length) {
    const dates = hist.map((r) => r.date);
    const closes = hist.map((r) => round6(r.close * R));
    queries.push(sql`
      update price_history ph
      set close = v.close
      from unnest(${dates}::date[], ${closes}::numeric[]) as v(date, close)
      where ph.ticker = ${ticker} and ph.date = v.date
    `);
  }

  // ── 2. posts: created_at < D ──
  const posts = await sql`
    select id, title, created_at::text as created_at, position_type,
           initial_price, current_price, return_rate, target_price, stock_data
    from posts
    where ticker = ${ticker} and created_at < ${D_UTC}::timestamptz
  `;
  console.log(`\nposts 보정 대상: ${posts.length}건`);

  for (const p of posts) {
    const initial = Number(p.initial_price);
    const target = Number(p.target_price);
    const newInit = round6(initial * R);
    const newTarget = round6(target * R);
    const cur = Number(p.current_price);
    const newRet =
      newInit > 0
        ? round2(
            p.position_type === 'long'
              ? ((cur - newInit) / newInit) * 100
              : ((newInit - cur) / newInit) * 100,
          )
        : 0;
    const newStockData = p.stock_data
      ? { ...p.stock_data, currentPrice: round6(Number(p.stock_data.currentPrice ?? 0) * R) }
      : p.stock_data;

    console.log(
      `  [${(p.created_at as string).slice(0, 10)}] ${(p.title as string).slice(0, 25)}\n` +
        `    init ${initial} → ${newInit} | target ${target} → ${newTarget} | ret ${Number(p.return_rate)}% → ${newRet}%`,
    );

    if (apply) {
      queries.push(sql`
        update posts set
          initial_price = ${newInit},
          target_price = ${newTarget},
          return_rate = ${newRet},
          prev_return_rate = ${newRet},
          stock_data = ${newStockData == null ? null : JSON.stringify(newStockData)}::jsonb
        where id = ${p.id}
      `);
    }
  }

  if (apply && queries.length) {
    await sql.transaction(queries);
    console.log(`\n  → price_history ${hist.length}행 close × ${R}, posts ${posts.length}건 반영 (단일 트랜잭션)`);
  }

  console.log(apply ? '\n✅ 보정 완료' : '\n(dry-run — 반영하려면 --apply 추가)');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
