/**
 * SEC 13F 포트폴리오 배치 스크립트
 *
 * 누적형: 매 실행마다 SEC에서 지정된 분기들을 가져와 per-guru `quarters` 맵에 누적 저장.
 * 비교 뷰(`holdings`)는 최신 두 분기의 비교 결과로 항상 재구성됨.
 *
 * 사용법:
 *   npm run fetch-13f -- --all              (전체 구루)
 *   npm run fetch-13f -- --name=warren-buffett   (특정 구루)
 *   npm run fetch-13f -- --all --dry-run    (저장 없이 결과만 확인)
 *
 * 환경:
 *   QUARTERS=2025-12-31,2026-03-31 (선택, 기본값은 아래 DEFAULT_QUARTERS)
 */

import { GURU_LIST } from '../app/guru-tracker/types';
import * as fs from 'fs';
import * as path from 'path';
import { getRecentFilings, findFilingForQuarter, findInfoTableUrl, downloadXml } from '../lib/sec13f/fetchFiling';
import { parse13FXml, aggregateHoldings } from '../lib/sec13f/parseXml';
import { compareHoldings, printComparisonStats, getDisplayName } from '../lib/sec13f/compareHoldings';
import { resolveCusip, printMappingStats } from '../lib/sec13f/cusipMap';
import {
  GuruPortfolioDoc,
  PortfolioHolding,
  Raw13FHolding,
  EdgarFiling,
} from '../lib/sec13f/types';

// === 가져올 분기 목록 (오래된→최신 순) ===
// 매 실행마다 이 리스트의 분기들을 SEC에서 새로 가져옴.
// 기존 quarters 맵에 머지되므로 더 옛 분기는 이전 실행에서 누적된 그대로 보존됨.
const DEFAULT_QUARTERS = ['2025-12-31', '2026-03-31'];

const QUARTERS = (process.env.QUARTERS
  ? process.env.QUARTERS.split(',').map(s => s.trim())
  : DEFAULT_QUARTERS
).sort(); // 사전식 정렬 = 날짜 오름차순

// 로컬 JSON 경로
const PORTFOLIOS_PATH = path.join(__dirname, '..', 'data', 'guru-portfolios.json');

// === 누적형 스키마 ===
interface QuarterHolding {
  cusip: string;
  ticker: string | null;
  exchange: string;
  name_of_issuer: string;
  title_of_class: string;
  value: number; // USD (천달러 → 달러 변환 후)
  shares: number;
  weight: number; // 0-100
  ticker_source: 'manual' | 'auto' | 'unmapped';
}

interface QuarterSnapshot {
  report_date: string; // "2026-03-31"
  filing_date: string;
  accession_number: string;
  form: string; // "13F-HR" or "13F-HR/A"
  total_value: number; // USD
  holdings_count: number; // 보유 종목 수 (shares > 0)
  holdings: QuarterHolding[];
}

interface ExtendedGuruDoc extends GuruPortfolioDoc {
  quarters: Record<string, QuarterSnapshot>;
}

interface PortfoliosJson {
  meta: {
    updated_at: string;
    total_unique_tickers: number;
    quarters?: string[]; // 최신 비교에 사용된 두 분기
  };
  gurus: Record<string, ExtendedGuruDoc>;
  tickers: Array<{ ticker: string; exchange: string; filingPrice: number }>;
}

// === CLI 인자 파싱 ===
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string | boolean> = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      parsed[key] = value || true;
    }
  }
  return parsed;
}

// KIS API로 가격 조회 불가능한 티커
const UNFETCHABLE_TICKERS = new Set(['EXE/WS', 'KRSP/WS', 'ALVOW', 'JBSAY']);

// === Raw 보유 → 스냅샷 변환 ===
function buildSnapshot(rawHoldings: Raw13FHolding[], filing: EdgarFiling): QuarterSnapshot {
  const totalValue = rawHoldings.reduce((s, h) => s + h.value, 0) * 1000;

  const holdings: QuarterHolding[] = rawHoldings.map(h => {
    const mapping = resolveCusip(h.cusip, h.nameOfIssuer);
    const valueUsd = h.value * 1000;
    return {
      cusip: h.cusip,
      ticker: mapping?.ticker ?? null,
      exchange: mapping?.exchange ?? 'NAS',
      name_of_issuer: getDisplayName(h.nameOfIssuer, h.titleOfClass, mapping?.name),
      title_of_class: h.titleOfClass,
      value: valueUsd,
      shares: h.shares,
      weight: totalValue > 0 ? Math.round((valueUsd / totalValue) * 10000) / 100 : 0,
      ticker_source: (mapping?.source ?? 'unmapped') as 'manual' | 'auto' | 'unmapped',
    };
  });

  // 비중 내림차순 정렬
  holdings.sort((a, b) => b.weight - a.weight);

  return {
    report_date: filing.reportDate,
    filing_date: filing.filingDate,
    accession_number: filing.accessionNumber,
    form: filing.form,
    total_value: totalValue,
    holdings_count: holdings.filter(h => h.shares > 0).length,
    holdings,
  };
}

// === 기존 비교 holdings[]에서 prev 스냅샷 백필 ===
// 이전 실행 결과의 `holdings[]` 비교 뷰에서 value_prev/shares_prev/weight_prev를
// 추출해서 prev 분기 스냅샷을 복원. quarters에 누적되지 않았던 옛 분기를 살리는 용도.
function backfillPrevSnapshot(
  doc: ExtendedGuruDoc | undefined,
): QuarterSnapshot | null {
  if (!doc) return null;
  if (!doc.report_date_prev || !doc.holdings) return null;

  const reportDate = doc.report_date_prev;
  const totalValue = doc.total_value_prev || 0;

  // value_prev !== null 인 행 = Q-prev에 있었던 종목
  const rows = doc.holdings.filter(h => h.value_prev !== null && h.shares_prev !== null);
  if (rows.length === 0) return null;

  // 백필 시점에 cusipMap을 재적용. 옛 매핑 오류가 있더라도 현재 manual map 기준으로 갱신됨.
  const holdings: QuarterHolding[] = rows.map(h => {
    const remap = resolveCusip(h.cusip, h.name_of_issuer);
    return {
      cusip: h.cusip,
      ticker: remap?.ticker ?? h.ticker,
      exchange: remap?.exchange ?? h.exchange,
      name_of_issuer: remap?.name && remap.name !== h.name_of_issuer
        ? remap.name
        : h.name_of_issuer,
      title_of_class: h.title_of_class,
      value: h.value_prev as number,
      shares: h.shares_prev as number,
      weight: h.weight_prev ?? 0,
      ticker_source: (remap?.source ?? (h.ticker_source as 'manual' | 'auto' | 'unmapped')) || 'unmapped',
    };
  });

  holdings.sort((a, b) => b.weight - a.weight);

  return {
    report_date: reportDate,
    filing_date: '', // 옛 실행에서는 prev의 filing_date를 저장하지 않았음
    accession_number: '',
    form: '13F-HR',
    total_value: totalValue,
    holdings_count: holdings.filter(h => h.shares > 0).length,
    holdings,
  };
}

// === 스냅샷 → Raw13FHolding (비교 함수 입력용) ===
// compareHoldings는 raw를 받아 매핑까지 재실행하므로, 스냅샷에서 raw 형태로 환원.
function snapshotToRaw(snapshot: QuarterSnapshot): Raw13FHolding[] {
  return snapshot.holdings
    .filter(h => h.shares > 0) // SOLD OUT 부분은 비교 입력에서 제외 (다음 분기 비교 시 새로 매핑됨)
    .map(h => ({
      nameOfIssuer: h.name_of_issuer,
      titleOfClass: h.title_of_class,
      cusip: h.cusip,
      value: Math.round(h.value / 1000), // 천달러 단위로 환원
      shares: h.shares,
      sharesType: 'SH' as const,
      investmentDiscretion: '',
    }));
}

// === 단일 분기 페치 ===
async function fetchQuarter(
  cik: string,
  quarterEnd: string,
  allFilings: EdgarFiling[],
): Promise<{ filing: EdgarFiling; snapshot: QuarterSnapshot } | null> {
  const filing = findFilingForQuarter(allFilings, quarterEnd);
  if (!filing) {
    console.error(`  [${quarterEnd}] 공시를 찾을 수 없음`);
    return null;
  }
  console.log(`  [${quarterEnd}] ${filing.form} filed=${filing.filingDate} acc=${filing.accessionNumber}`);

  const xmlUrl = await findInfoTableUrl(cik, filing);
  const xml = await downloadXml(xmlUrl);
  const raw = parse13FXml(xml);
  const aggregated = aggregateHoldings(raw);
  console.log(`  [${quarterEnd}] ${aggregated.length}개 종목 (합산 후)`);

  const snapshot = buildSnapshot(aggregated, filing);
  return { filing, snapshot };
}

// === 단일 구루 처리 ===
async function processGuru(
  guruSlug: string,
  existing: ExtendedGuruDoc | undefined,
): Promise<{ slug: string; doc: ExtendedGuruDoc } | null> {
  const guru = GURU_LIST.find(
    g => g.name_en.toLowerCase().replace(/\s+/g, '-') === guruSlug,
  );
  if (!guru) {
    console.error(`구루를 찾을 수 없습니다: ${guruSlug}`);
    return null;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${guru.name_kr} (${guru.name_en})`);
  console.log(`  CIK: ${guru.cik} | 운용사: ${guru.filing_name}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // 1. SEC EDGAR 제출 목록
    console.log('[Step 1] SEC EDGAR 제출 목록 조회...');
    const filings = await getRecentFilings(guru.cik);
    if (filings.length === 0) {
      console.error(`13F-HR 공시를 찾을 수 없음: ${guru.cik}`);
      return null;
    }
    console.log(`  최근 13F-HR ${Math.min(filings.length, 6)}건:`);
    filings.slice(0, 6).forEach(f => {
      console.log(`    ${f.reportDate} (${f.form}, filed ${f.filingDate})`);
    });

    // 2. 기존 quarters 맵 로드 + 현재 cusipMap 기준으로 재매핑 + prev 백필
    // 매 실행마다 옛 분기 스냅샷도 현재 cusipMap에 맞춰 ticker/exchange/name이 갱신됨.
    // cusipMap에 새 엔트리가 추가되거나 옛 오류가 수정될 때 자동 반영됨.
    const quartersMap: Record<string, QuarterSnapshot> = {};
    for (const [date, snap] of Object.entries(existing?.quarters ?? {})) {
      quartersMap[date] = {
        ...snap,
        holdings: snap.holdings.map(h => {
          const remap = resolveCusip(h.cusip, h.name_of_issuer);
          return {
            ...h,
            ticker: remap?.ticker ?? h.ticker,
            exchange: remap?.exchange ?? h.exchange,
            name_of_issuer: remap?.name && remap.name !== h.name_of_issuer
              ? remap.name
              : h.name_of_issuer,
            ticker_source: (remap?.source ?? h.ticker_source ?? 'unmapped') as 'manual' | 'auto' | 'unmapped',
          };
        }),
      };
    }

    // 백필: 기존 doc의 report_date_prev가 quarters에 없으면 holdings[]에서 복원
    if (existing && existing.report_date_prev && !quartersMap[existing.report_date_prev]) {
      const back = backfillPrevSnapshot(existing);
      if (back) {
        quartersMap[back.report_date] = back;
        console.log(`  [백필] ${back.report_date} 스냅샷을 기존 비교 데이터에서 복원 (${back.holdings.length}개 종목)`);
      }
    }

    // 3. 지정 분기 페치 + 스냅샷 빌드
    console.log(`\n[Step 2] 분기 페치: ${QUARTERS.join(', ')}`);
    for (const q of QUARTERS) {
      const result = await fetchQuarter(guru.cik, q, filings);
      if (!result) {
        console.error(`  [중단] ${q} 분기를 가져오지 못함`);
        return null;
      }
      quartersMap[q] = result.snapshot;
    }

    // 4. 최신 두 분기로 비교 뷰 재구성
    const sortedDates = Object.keys(quartersMap).sort();
    if (sortedDates.length < 2) {
      console.error(`  [중단] 비교를 위한 분기가 2개 미만 (${sortedDates.length}개)`);
      return null;
    }
    const prevDate = sortedDates[sortedDates.length - 2];
    const currDate = sortedDates[sortedDates.length - 1];
    const prevSnapshot = quartersMap[prevDate];
    const currSnapshot = quartersMap[currDate];

    console.log(`\n[Step 3] 비교 뷰 재구성: ${prevDate} vs ${currDate}`);
    const portfolio: PortfolioHolding[] = compareHoldings(
      snapshotToRaw(prevSnapshot),
      snapshotToRaw(currSnapshot),
    );

    printComparisonStats(portfolio);
    printMappingStats(portfolio);

    // 5. 상위 10개 미리보기
    console.log('\n[상위 10개 종목]');
    console.log('─'.repeat(90));
    portfolio.slice(0, 10).forEach((h, i) => {
      const ticker = (h.ticker || '???').padEnd(10);
      const name = h.name_of_issuer.slice(0, 25).padEnd(30);
      const weight = h.weight_curr.toFixed(2).padEnd(10);
      const shares = h.shares_curr.toLocaleString().padEnd(15);
      const change = h.shares_change_pct !== null
        ? `${h.shares_change_pct > 0 ? '+' : ''}${h.shares_change_pct.toFixed(1)}%`
        : 'NEW';
      console.log(
        `${(i + 1).toString().padEnd(4)}${ticker}${name}${weight}${shares}${change.padEnd(10)}${h.status}`,
      );
    });
    console.log('─'.repeat(90));

    // 6. doc 구성
    const slug = guru.name_en.toLowerCase().replace(/\s+/g, '-');
    const doc: ExtendedGuruDoc = {
      guru_name_en: guru.name_en,
      guru_name_kr: guru.name_kr,
      cik: guru.cik,
      filing_name: guru.filing_name,
      report_date_prev: prevDate,
      report_date_curr: currDate,
      filing_date_curr: currSnapshot.filing_date,
      total_value_prev: prevSnapshot.total_value,
      total_value_curr: currSnapshot.total_value,
      holdings_count: portfolio.filter(h => h.status !== 'SOLD OUT').length,
      updated_at: new Date().toISOString(),
      holdings: portfolio,
      quarters: quartersMap,
    };

    console.log(`\n  총 포트폴리오: $${(doc.total_value_curr / 1e9).toFixed(2)}B`);
    console.log(`  보유 종목: ${doc.holdings_count}개`);
    console.log(`  누적 분기: ${Object.keys(quartersMap).sort().join(', ')}`);

    return { slug, doc };
  } catch (error) {
    console.error(`\n[오류] ${guru.name_kr} 처리 실패:`, error);
    return null;
  }
}

// === 티커 추출 ===
function extractTickers(
  gurus: Record<string, ExtendedGuruDoc>,
): Array<{ ticker: string; exchange: string; filingPrice: number }> {
  const allUnique = new Map<string, { ticker: string; exchange: string; filingPrice: number }>();

  for (const doc of Object.values(gurus)) {
    for (const h of doc.holdings) {
      if (h.ticker && h.status !== 'SOLD OUT' && h.shares_curr > 0) {
        if (UNFETCHABLE_TICKERS.has(h.ticker)) continue;
        const key = `${h.ticker}:${h.exchange}`;
        if (!allUnique.has(key)) {
          allUnique.set(key, {
            ticker: h.ticker,
            exchange: h.exchange || 'NAS',
            filingPrice: Math.round((h.value_curr / h.shares_curr) * 100) / 100,
          });
        }
      }
    }
  }

  return Array.from(allUnique.values()).sort((a, b) => a.ticker.localeCompare(b.ticker));
}

// === JSON 저장 ===
function savePortfoliosJson(
  gurus: Record<string, ExtendedGuruDoc>,
  existingTickers: Array<{ ticker: string; exchange: string; filingPrice: number }>,
) {
  const newTickers = extractTickers(gurus);

  // 기존 tickers의 filingPrice (실거래일가)는 update-filing-prices.ts가 갱신한 값이므로
  // 가능하면 보존 (새 분기에서 가격 갱신을 별도 스크립트로 다시 받기 전까지)
  const existingMap = new Map(existingTickers.map(t => [`${t.ticker}:${t.exchange}`, t.filingPrice]));
  for (const t of newTickers) {
    // 새 분기 가격은 update-filing-prices.ts에서 다시 채울 거지만, 일단 13F value/shares 기반 추정가로 시작.
    // 기존에 같은 키가 있고 가격이 양수라면 그것을 우선 (수동 업데이트 결과 보존).
    // 단, 새 분기 추정가가 더 정확할 수도 있으니 update-filing-prices.ts 재실행 권장.
    const prev = existingMap.get(`${t.ticker}:${t.exchange}`);
    if (prev && prev > 0) {
      // 보존 안 함: 새 분기로 갱신해야 하므로 새 추정가 사용 (사용자가 다음 스크립트로 정확한 값 채울 것)
      // 보수적으로 새 값 채택
    }
  }

  const portfoliosJson: PortfoliosJson = {
    meta: {
      updated_at: new Date().toISOString().split('T')[0],
      total_unique_tickers: newTickers.length,
      quarters: QUARTERS,
    },
    gurus,
    tickers: newTickers,
  };

  fs.mkdirSync(path.dirname(PORTFOLIOS_PATH), { recursive: true });
  fs.writeFileSync(PORTFOLIOS_PATH, JSON.stringify(portfoliosJson, null, 2));

  console.log(`\n[저장] data/guru-portfolios.json`);
  console.log(`  구루: ${Object.keys(gurus).length}명`);
  console.log(`  고유 티커: ${newTickers.length}개`);
  console.log(`  비교 분기: ${QUARTERS.join(' → ')}`);
}

// === 메인 ===
async function main() {
  const args = parseArgs();
  const dryRun = !!args['dry-run'];

  if (dryRun) {
    console.log('[MODE] DRY RUN - JSON에 저장하지 않습니다.\n');
  }
  console.log(`[QUARTERS] 가져올 분기: ${QUARTERS.join(', ')}\n`);

  // 기존 JSON 로드
  let existingData: PortfoliosJson = {
    meta: { updated_at: '', total_unique_tickers: 0 },
    gurus: {},
    tickers: [],
  };
  if (fs.existsSync(PORTFOLIOS_PATH)) {
    existingData = JSON.parse(fs.readFileSync(PORTFOLIOS_PATH, 'utf-8'));
    console.log(`[기존 JSON] 구루 ${Object.keys(existingData.gurus).length}명, 티커 ${existingData.tickers.length}개\n`);
  }

  if (args['all']) {
    console.log(`전체 ${GURU_LIST.length}명의 구루 포트폴리오를 처리합니다.\n`);
    const allGurus: Record<string, ExtendedGuruDoc> = { ...existingData.gurus };

    for (const guru of GURU_LIST) {
      const slug = guru.name_en.toLowerCase().replace(/\s+/g, '-');
      const result = await processGuru(slug, existingData.gurus[slug]);
      if (result) {
        allGurus[result.slug] = result.doc;
      }
      console.log('\n');
    }

    if (!dryRun) {
      savePortfoliosJson(allGurus, existingData.tickers);
    }
  } else if (args['name']) {
    const slug = args['name'] as string;
    const result = await processGuru(slug, existingData.gurus[slug]);

    if (result && !dryRun) {
      const merged = { ...existingData.gurus };
      merged[result.slug] = result.doc;
      savePortfoliosJson(merged, existingData.tickers);
    }
  } else {
    console.log('사용법:');
    console.log('  npm run fetch-13f -- --all');
    console.log('  npm run fetch-13f -- --name=warren-buffett');
    console.log('  npm run fetch-13f -- --all --dry-run');
    console.log('  QUARTERS=2025-12-31,2026-03-31 npm run fetch-13f -- --all');
    console.log('\n사용 가능한 구루:');
    GURU_LIST.forEach(g => {
      const slug = g.name_en.toLowerCase().replace(/\s+/g, '-');
      console.log(`  --name=${slug}  (${g.name_kr})`);
    });
  }
}

main().catch(console.error);
