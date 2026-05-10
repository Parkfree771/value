/**
 * OpenFIGI API로 미매핑 CUSIP을 자동 매핑해서 cusipMap.ts 추가용 코드 출력
 *
 * 사용법: npx tsx scripts/resolve-cusips.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const PORTFOLIOS_PATH = path.join(__dirname, '..', 'data', 'guru-portfolios.json');
const FIGI_URL = 'https://api.openfigi.com/v3/mapping';

interface FigiResult {
  ticker?: string;
  exchCode?: string;
  name?: string;
  securityType?: string;
}

interface FigiResponse {
  data?: FigiResult[];
  error?: string;
  warning?: string;
}

const SEC_TO_KIS_EXCH: Record<string, string> = {
  'UN': 'NYS',  // NYSE
  'UW': 'NAS',  // NASDAQ Global Select
  'UR': 'NAS',  // NASDAQ Capital Market
  'UQ': 'NAS',  // NASDAQ Global Market
  'UA': 'AMS',  // NYSE American (AMEX)
  'UP': 'AMS',  // NYSE Arca
  'PQ': 'NAS',  // NASDAQ
};
// composite US ('US') is intentionally not mapped — we prefer specific exchange listings

async function batchQuery(cusips: string[]): Promise<(FigiResult | null)[]> {
  const body = cusips.map(c => ({ idType: 'ID_CUSIP', idValue: c }));
  const res = await fetch(FIGI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`OpenFIGI ${res.status}: ${await res.text()}`);
  }
  const arr: FigiResponse[] = await res.json();
  return arr.map((r) => {
    if (!r.data || r.data.length === 0) return null;
    const SHARE_TYPES = ['Common Stock', 'Depositary Receipt', 'ADR', 'ETP', 'REIT', 'MLP'];
    const candidates = r.data.filter(d =>
      d.securityType && SHARE_TYPES.some(t => d.securityType!.includes(t))
    );
    const pool = candidates.length > 0 ? candidates : r.data;
    // ETF는 UP(NYSE Arca)이 주거래소, 주식은 UN(NYSE)/UW(NASDAQ)이 주거래소
    const isEtf = pool.some(d => d.securityType === 'ETP');
    const priority = isEtf
      ? ['UP', 'UA', 'UN', 'UW', 'UR', 'UQ', 'PQ']
      : ['UN', 'UW', 'UR', 'UQ', 'UP', 'UA', 'PQ'];
    for (const code of priority) {
      const match = pool.find(d => d.exchCode === code);
      if (match) return match;
    }
    return pool[0];
  });
}

async function main() {
  // 1. 미매핑 CUSIP 수집
  const data = JSON.parse(fs.readFileSync(PORTFOLIOS_PATH, 'utf-8'));
  const unmapped = new Map<string, { name: string; gurus: string[] }>();
  for (const [, g] of Object.entries<any>(data.gurus)) {
    for (const h of g.holdings) {
      if (!h.ticker && h.status !== 'SOLD OUT' && h.shares_curr > 0) {
        const k = h.cusip;
        if (!unmapped.has(k)) unmapped.set(k, { name: h.name_of_issuer, gurus: [] });
        unmapped.get(k)!.gurus.push(g.guru_name_kr);
      }
    }
  }

  const cusipList = Array.from(unmapped.keys());
  console.log(`[입력] 미매핑 CUSIP ${cusipList.length}건\n`);

  // 2. 배치 쿼리 (OpenFIGI 무료: 25 req/min, 배치당 최대 10개 → 4 batch)
  const BATCH_SIZE = 10;
  const results = new Map<string, FigiResult | null>();
  for (let i = 0; i < cusipList.length; i += BATCH_SIZE) {
    const chunk = cusipList.slice(i, i + BATCH_SIZE);
    console.log(`[OpenFIGI] 배치 ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length}건 조회...`);
    const res = await batchQuery(chunk);
    chunk.forEach((c, idx) => results.set(c, res[idx]));
    if (i + BATCH_SIZE < cusipList.length) {
      await new Promise(r => setTimeout(r, 6000)); // rate limit 여유
    }
  }

  // 3. 결과 출력 (cusipMap.ts에 붙여넣을 형식)
  console.log('\n' + '='.repeat(80));
  console.log('// 신규 그루 미매핑 CUSIP 해결 (OpenFIGI 자동 조회)');
  console.log('='.repeat(80));
  const failed: { cusip: string; name: string }[] = [];
  for (const cusip of cusipList) {
    const r = results.get(cusip);
    const meta = unmapped.get(cusip)!;
    if (!r || !r.ticker) {
      failed.push({ cusip, name: meta.name });
      continue;
    }
    const kisExch = (r.exchCode && SEC_TO_KIS_EXCH[r.exchCode]) || 'NAS';
    // 티커 정규화: BF/A → BF-A, RDS/A → RDS-A 등 (KIS API는 / 사용하지만 cusipMap은 - 사용)
    const ticker = (r.ticker || '').replace(/\//g, '-').replace(/\s+/g, '');
    console.log(`  '${cusip}': { ticker: '${ticker}', exchange: '${kisExch}' }, // ${meta.name} [exchCode=${r.exchCode}, securityType=${r.securityType}]`);
  }

  if (failed.length > 0) {
    console.log('\n[실패]');
    failed.forEach(f => console.log(`  ${f.cusip}  ${f.name}`));
  }
  console.log(`\n[요약] 성공 ${cusipList.length - failed.length} / 실패 ${failed.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
