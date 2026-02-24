/**
 * SEC 13F 포트폴리오 배치 스크립트
 *
 * Q3 2025 vs Q4 2025 보유 종목을 비교하여 로컬 JSON에 저장합니다.
 * Firestore 없이 data/guru-portfolios.json에 모든 포트폴리오 데이터를 저장합니다.
 *
 * 사용법:
 *   npm run fetch-13f -- --all              (6명 전체)
 *   npm run fetch-13f -- --name=warren-buffett   (특정 구루)
 *   npm run fetch-13f -- --all --dry-run    (저장 없이 결과만 확인)
 */

import { GURU_LIST } from '../app/guru-tracker/types';
import * as fs from 'fs';
import * as path from 'path';
import { getRecentFilings, findFilingForQuarter, findInfoTableUrl, downloadXml } from '../lib/sec13f/fetchFiling';
import { parse13FXml, aggregateHoldings } from '../lib/sec13f/parseXml';
import { compareHoldings, printComparisonStats } from '../lib/sec13f/compareHoldings';
import { printMappingStats } from '../lib/sec13f/cusipMap';
import { GuruPortfolioDoc } from '../lib/sec13f/types';

// Q3 2025, Q4 2025 마감일
const Q3_END = '2025-09-30';
const Q4_END = '2025-12-31';

// 로컬 JSON 경로
const PORTFOLIOS_PATH = path.join(__dirname, '..', 'data', 'guru-portfolios.json');

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

// === 티커 목록 + 공시일가 추출 ===
function extractTickers(gurus: Record<string, GuruPortfolioDoc>): Array<{ ticker: string; exchange: string; filingPrice: number }> {
  const allUnique = new Map<string, { ticker: string; exchange: string; filingPrice: number }>();

  for (const doc of Object.values(gurus)) {
    for (const h of doc.holdings) {
      if (h.ticker && h.status !== 'SOLD OUT' && h.shares_curr > 0) {
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

// === 단일 구루 처리 ===
async function processGuru(guruSlug: string): Promise<{ slug: string; doc: GuruPortfolioDoc } | null> {
  const guru = GURU_LIST.find(
    g => g.name_en.toLowerCase().replace(/\s+/g, '-') === guruSlug
  );

  if (!guru) {
    console.error(`구루를 찾을 수 없습니다: ${guruSlug}`);
    console.log('가능한 slug:', GURU_LIST.map(g => g.name_en.toLowerCase().replace(/\s+/g, '-')).join(', '));
    return null;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${guru.name_kr} (${guru.name_en})`);
  console.log(`  CIK: ${guru.cik} | 운용사: ${guru.filing_name}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // 1. SEC EDGAR에서 최근 13F 공시 목록 가져오기
    console.log('[Step 1/4] SEC EDGAR 제출 목록 조회...');
    const filings = await getRecentFilings(guru.cik);

    if (filings.length === 0) {
      console.error(`13F-HR 공시를 찾을 수 없습니다: ${guru.cik}`);
      return null;
    }

    console.log('\n최근 13F-HR 공시:');
    filings.slice(0, 8).forEach(f => {
      console.log(`  ${f.reportDate} (제출일: ${f.filingDate}) - ${f.accessionNumber}`);
    });

    // 2. Q3, Q4 filing 찾기
    console.log(`\n[Step 2/4] Q3(${Q3_END}) / Q4(${Q4_END}) 공시 탐색...`);
    const q3Filing = findFilingForQuarter(filings, Q3_END);
    const q4Filing = findFilingForQuarter(filings, Q4_END);

    if (!q3Filing) {
      console.error(`Q3 2025 (${Q3_END}) 공시를 찾을 수 없습니다.`);
      console.log('사용 가능한 reportDate:', filings.map(f => f.reportDate).join(', '));
      return null;
    }
    if (!q4Filing) {
      console.error(`Q4 2025 (${Q4_END}) 공시를 찾을 수 없습니다.`);
      console.log('사용 가능한 reportDate:', filings.map(f => f.reportDate).join(', '));
      return null;
    }

    console.log(`  Q3: ${q3Filing.reportDate} (${q3Filing.accessionNumber})`);
    console.log(`  Q4: ${q4Filing.reportDate} (${q4Filing.accessionNumber})`);

    // 3. XML 다운로드 및 파싱
    console.log('\n[Step 3/4] XML 다운로드 및 파싱...');

    const q3XmlUrl = await findInfoTableUrl(guru.cik, q3Filing);
    const q3Xml = await downloadXml(q3XmlUrl);
    const q3Raw = parse13FXml(q3Xml);
    const q3Holdings = aggregateHoldings(q3Raw);
    console.log(`  Q3: ${q3Holdings.length}개 종목 (합산 후)`);

    const q4XmlUrl = await findInfoTableUrl(guru.cik, q4Filing);
    const q4Xml = await downloadXml(q4XmlUrl);
    const q4Raw = parse13FXml(q4Xml);
    const q4Holdings = aggregateHoldings(q4Raw);
    console.log(`  Q4: ${q4Holdings.length}개 종목 (합산 후)`);

    // 4. Q3 vs Q4 비교
    console.log('\n[Step 4/4] Q3 vs Q4 비교 분석...');
    const portfolio = compareHoldings(q3Holdings, q4Holdings);

    printComparisonStats(portfolio);
    printMappingStats(portfolio);

    // 상위 10개 종목 미리보기
    console.log('\n[상위 10개 종목]');
    console.log('─'.repeat(90));
    console.log(
      '#'.padEnd(4) +
      '티커'.padEnd(10) +
      '회사명'.padEnd(30) +
      '비중(%)'.padEnd(10) +
      '주식수'.padEnd(15) +
      '변동(%)'.padEnd(10) +
      '상태'
    );
    console.log('─'.repeat(90));

    portfolio.slice(0, 10).forEach((h, i) => {
      const ticker = (h.ticker || '???').padEnd(10);
      const name = h.name_of_issuer.slice(0, 25).padEnd(30);
      const weight = h.weight_curr.toFixed(2).padEnd(10);
      const shares = h.shares_curr.toLocaleString().padEnd(15);
      const change = h.shares_change_pct !== null ? `${h.shares_change_pct > 0 ? '+' : ''}${h.shares_change_pct.toFixed(1)}%` : 'NEW';
      const status = h.status;

      console.log(
        `${(i + 1).toString().padEnd(4)}${ticker}${name}${weight}${shares}${change.padEnd(10)}${status}`
      );
    });
    console.log('─'.repeat(90));

    // 결과 구성
    const slug = guru.name_en.toLowerCase().replace(/\s+/g, '-');
    const totalValuePrev = q3Holdings.reduce((sum, h) => sum + h.value, 0) * 1000;
    const totalValueCurr = q4Holdings.reduce((sum, h) => sum + h.value, 0) * 1000;

    const doc: GuruPortfolioDoc = {
      guru_name_en: guru.name_en,
      guru_name_kr: guru.name_kr,
      cik: guru.cik,
      filing_name: guru.filing_name,
      report_date_prev: q3Filing.reportDate,
      report_date_curr: q4Filing.reportDate,
      filing_date_curr: q4Filing.filingDate,
      total_value_prev: totalValuePrev,
      total_value_curr: totalValueCurr,
      holdings_count: portfolio.filter(h => h.status !== 'SOLD OUT').length,
      updated_at: new Date().toISOString(),
      holdings: portfolio,
    };

    console.log(`  총 포트폴리오: $${(totalValueCurr / 1e9).toFixed(2)}B`);
    console.log(`  보유 종목: ${doc.holdings_count}개`);
    console.log(`  전체 엔트리: ${portfolio.length}개 (SOLD OUT 포함)`);

    return { slug, doc };

  } catch (error) {
    console.error(`\n[오류] ${guru.name_kr} 처리 실패:`, error);
    return null;
  }
}

// === JSON 저장 ===
function savePortfoliosJson(gurus: Record<string, GuruPortfolioDoc>) {
  const tickers = extractTickers(gurus);

  const portfoliosJson = {
    meta: {
      updated_at: new Date().toISOString().split('T')[0],
      total_unique_tickers: tickers.length,
    },
    gurus,
    tickers,
  };

  fs.mkdirSync(path.dirname(PORTFOLIOS_PATH), { recursive: true });
  fs.writeFileSync(PORTFOLIOS_PATH, JSON.stringify(portfoliosJson, null, 2));

  console.log(`\n[저장] data/guru-portfolios.json`);
  console.log(`  구루: ${Object.keys(gurus).length}명`);
  console.log(`  고유 티커: ${tickers.length}개`);
}

// === 메인 ===
async function main() {
  const args = parseArgs();
  const dryRun = !!args['dry-run'];

  if (dryRun) {
    console.log('[MODE] DRY RUN - JSON에 저장하지 않습니다.\n');
  }

  if (args['all']) {
    console.log(`전체 ${GURU_LIST.length}명의 구루 포트폴리오를 처리합니다.\n`);
    const allGurus: Record<string, GuruPortfolioDoc> = {};

    for (const guru of GURU_LIST) {
      const slug = guru.name_en.toLowerCase().replace(/\s+/g, '-');
      const result = await processGuru(slug);
      if (result) {
        allGurus[result.slug] = result.doc;
      }
      console.log('\n');
    }

    if (Object.keys(allGurus).length > 0 && !dryRun) {
      savePortfoliosJson(allGurus);
    }
  } else if (args['name']) {
    const result = await processGuru(args['name'] as string);

    if (result && !dryRun) {
      // 기존 JSON 읽어서 해당 구루만 업데이트
      let existing: Record<string, GuruPortfolioDoc> = {};
      if (fs.existsSync(PORTFOLIOS_PATH)) {
        const data = JSON.parse(fs.readFileSync(PORTFOLIOS_PATH, 'utf-8'));
        existing = data.gurus || {};
      }
      existing[result.slug] = result.doc;
      savePortfoliosJson(existing);
    }
  } else {
    console.log('사용법:');
    console.log('  npm run fetch-13f -- --all              (전체 구루)');
    console.log('  npm run fetch-13f -- --name=warren-buffett   (특정 구루)');
    console.log('  npm run fetch-13f -- --all --dry-run    (저장 없이 확인)');
    console.log('\n사용 가능한 구루:');
    GURU_LIST.forEach(g => {
      const slug = g.name_en.toLowerCase().replace(/\s+/g, '-');
      console.log(`  --name=${slug}  (${g.name_kr})`);
    });
  }
}

main().catch(console.error);
