/**
 * 분할/병합 점검 도구 (수동, 이상 데이터 발견 시 실행)
 *
 * 어떤 종목 가격이 갑자기 튀었을 때 "진짜 등락인지 분할인지"를 KIS 데이터로 판정.
 * 원리: KIS 해외 일봉을 MODP=0(원주가) / MODP=1(수정주가)로 각각 받아
 *       날짜별 ratio = raw/adj 를 본다.
 *         - ratio가 모든 날 ≈1.0     → 분할 없음. 그 점프는 진짜 등락.
 *         - ratio가 정수배(예 0.25)   → 분할/병합 있음. R = 1/ratio (0.25면 1:4 역분할).
 *         - ratio가 계단처럼 바뀌는 날 → 그 날이 분할 적용일 D.
 *
 * 실행:
 *   npx tsx scripts/test-split-detect.ts SCO AMS              # 오늘 기준
 *   npx tsx scripts/test-split-detect.ts AAPL NAS 20260601    # 특정 기준일(YYYYMMDD)
 *   (EXCD: NAS/NYS/AMS 등. price_history.exchange 값과 동일)
 */
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

import { getKISTokenWithCache } from '../lib/kisTokenManager';

const symbol = (process.argv[2] ?? 'SCO').toUpperCase();
const excd = (process.argv[3] ?? 'AMS').toUpperCase();
const bymd = process.argv[4] ?? (() => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
})();

interface Row { xymd: string; clos: string }

async function fetchDaily(token: string, modp: '0' | '1'): Promise<Map<string, number>> {
  const params = new URLSearchParams({
    AUTH: '', EXCD: excd, SYMB: symbol, GUBN: '0', BYMD: bymd, MODP: modp,
  });
  const url = `${process.env.KIS_BASE_URL}/uapi/overseas-price/v1/quotations/dailyprice?${params}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      authorization: `Bearer ${token}`,
      appkey: process.env.KIS_APP_KEY!,
      appsecret: process.env.KIS_APP_SECRET!,
      tr_id: 'HHDFS76240000',
    },
  });
  if (!res.ok) throw new Error(`MODP=${modp}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const m = new Map<string, number>();
  for (const r of (data.output2 ?? []) as Row[]) {
    const c = parseFloat(r.clos);
    if (r.xymd && isFinite(c) && c > 0) m.set(r.xymd, c);
  }
  return m;
}

(async () => {
  const token = await getKISTokenWithCache();
  const [raw, adj] = await Promise.all([fetchDaily(token, '0'), fetchDaily(token, '1')]);

  const dates = Array.from(new Set([...raw.keys(), ...adj.keys()]))
    .filter((d) => raw.has(d) && adj.has(d))
    .sort();

  if (dates.length === 0) {
    console.log(`\n${symbol} (${excd}): 데이터 없음. 티커/거래소 코드 확인 (NAS/NYS/AMS).`);
    process.exit(0);
  }

  console.log(`\n${symbol} (${excd}) — 원주가(MODP0) vs 수정주가(MODP1), BYMD=${bymd}`);
  console.log('date       raw(MODP0)   adj(MODP1)   ratio=raw/adj');
  console.log('--------------------------------------------------------');

  // 표는 최근 20행, 계단 탐지는 전체 구간으로 수행
  const splits: { date: string; ratio: number }[] = [];
  let prevRatio: number | null = null;
  for (const d of dates) {
    const ratio = raw.get(d)! / adj.get(d)!;
    if (prevRatio != null && Math.abs(ratio - prevRatio) / prevRatio > 0.03) {
      // ratio 계단 = 분할 적용일. R(옛 종가 ×R → 새 스케일) = ratio / prevRatio
      // (예: 0.25→1.0이면 R=4 = 1:4 역분할, 옛 가격 ×4)
      splits.push({ date: d, ratio: ratio / prevRatio });
    }
    prevRatio = ratio;
  }

  for (const d of dates.slice(-20)) {
    const ratio = raw.get(d)! / adj.get(d)!;
    const mark = splits.some((s) => s.date === d) ? '  <== ratio 계단(분할 적용일 D)' : '';
    console.log(
      `${d}   ${raw.get(d)!.toFixed(4).padStart(10)}   ${adj.get(d)!.toFixed(4).padStart(10)}   ${ratio.toFixed(4).padStart(8)}${mark}`,
    );
  }

  console.log('\n── 판정 ──────────────────────────────────────────────');
  if (splits.length === 0) {
    console.log('분할/병합 흔적 없음 (ratio 일정). 가격 점프가 있었다면 진짜 등락.');
  } else {
    for (const s of splits) {
      const R = s.ratio;
      const kind = R > 1 ? `1:${R.toFixed(2).replace(/\.00$/, '')} 역분할(병합)` : `${(1 / R).toFixed(2).replace(/\.00$/, '')}:1 액면분할`;
      console.log(`분할 감지 → 적용일 D=${s.date}, 배율 R=${R.toFixed(4)} (${kind})`);
    }
    console.log('보정법: project_stock_split_correction.md — date<D 종가 ×R, 작성일<D 글 initial_price ×R + 수익률 재계산');
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
