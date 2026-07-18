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
 * 실행 (기본 dry-run, --apply 붙여야 실제 반영):
 *   npx tsx scripts/fix-split.ts SOXS 2026-07-15 10
 *   npx tsx scripts/fix-split.ts SOXS 2026-07-15 10 --apply
 */
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const [ticker, D, rStr] = [process.argv[2]?.toUpperCase(), process.argv[3], process.argv[4]];
const R = parseFloat(rStr ?? '');
const apply = process.argv.includes('--apply');

if (!ticker || !/^\d{4}-\d{2}-\d{2}$/.test(D ?? '') || !isFinite(R) || R <= 0) {
  console.error('사용법: npx tsx scripts/fix-split.ts <TICKER> <D: YYYY-MM-DD> <R> [--apply]');
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
const round2 = (n: number) => Math.round(n * 100) / 100;
// 부동소수점 곱셈 찌꺼기 방지 (42.8*10 = 428.00000000000006)
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

(async () => {
  console.log(`\n=== ${ticker} 분할 보정 — D=${D}, R=${R} ${apply ? '(실제 반영)' : '(dry-run)'} ===\n`);

  // ── 1. price_history: date < D → close × R ──
  const { data: hist, error: he } = await supabase
    .from('price_history')
    .select('date, close')
    .eq('ticker', ticker)
    .lt('date', D)
    .order('date', { ascending: true });
  if (he) throw he;
  console.log(`price_history 보정 대상: ${hist?.length ?? 0}행 (${hist?.[0]?.date} ~ ${hist?.at(-1)?.date})`);

  if (apply && hist?.length) {
    for (const row of hist) {
      const { error } = await supabase
        .from('price_history')
        .update({ close: round6(row.close * R) })
        .eq('ticker', ticker)
        .eq('date', row.date);
      if (error) throw error;
    }
    console.log(`  → ${hist.length}행 close × ${R} 완료`);
  }

  // ── 2. posts: created_at < D ──
  const { data: posts, error: pe } = await supabase
    .from('posts')
    .select('id, title, created_at, position_type, initial_price, current_price, return_rate, target_price, stock_data')
    .eq('ticker', ticker)
    .lt('created_at', D);
  if (pe) throw pe;
  console.log(`\nposts 보정 대상: ${posts?.length ?? 0}건`);

  for (const p of posts ?? []) {
    const newInit = round6(p.initial_price * R);
    const newTarget = round6(p.target_price * R);
    const cur = p.current_price;
    const newRet =
      newInit > 0
        ? round2(
            p.position_type === 'long'
              ? ((cur - newInit) / newInit) * 100
              : ((newInit - cur) / newInit) * 100,
          )
        : 0;
    const newStockData = p.stock_data
      ? { ...p.stock_data, currentPrice: round6((p.stock_data.currentPrice ?? 0) * R) }
      : p.stock_data;

    console.log(
      `  [${p.created_at.slice(0, 10)}] ${p.title.slice(0, 25)}\n` +
        `    init ${p.initial_price} → ${newInit} | target ${p.target_price} → ${newTarget} | ret ${p.return_rate}% → ${newRet}%`,
    );

    if (apply) {
      const { error } = await supabase
        .from('posts')
        .update({
          initial_price: newInit,
          target_price: newTarget,
          return_rate: newRet,
          prev_return_rate: newRet,
          stock_data: newStockData,
        })
        .eq('id', p.id);
      if (error) throw error;
    }
  }

  console.log(apply ? '\n✅ 보정 완료' : '\n(dry-run — 반영하려면 --apply 추가)');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
