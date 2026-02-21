/**
 * SEC 13F 포트폴리오 배치 스크립트
 *
 * Q3 2025 vs Q4 2025 보유 종목을 비교하여 Firestore에 업로드합니다.
 *
 * 사용법:
 *   npm run fetch-13f -- --all              (6명 전체)
 *   npm run fetch-13f -- --name=warren-buffett   (특정 구루)
 *   npm run fetch-13f -- --all --dry-run    (업로드 없이 결과만 확인)
 *
 * 환경변수:
 *   FIREBASE_SERVICE_ACCOUNT_BASE64 또는
 *   FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { GURU_LIST } from '../app/guru-tracker/types';
import { getRecentFilings, findFilingForQuarter, findInfoTableUrl, downloadXml } from '../lib/sec13f/fetchFiling';
import { parse13FXml, aggregateHoldings } from '../lib/sec13f/parseXml';
import { compareHoldings, printComparisonStats } from '../lib/sec13f/compareHoldings';
import { printMappingStats } from '../lib/sec13f/cusipMap';
import { GuruPortfolioDoc } from '../lib/sec13f/types';

import * as dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'] });

// Q3 2025, Q4 2025 마감일
const Q3_END = '2025-09-30';
const Q4_END = '2025-12-31';

// === Firebase Admin 초기화 (lazy) ===
let _db: Firestore | null = null;

function getDb(): Firestore {
  if (_db) return _db;

  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
      });
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } else {
      throw new Error(
        'Firebase 인증 정보가 없습니다.\n' +
        '.env.local 파일에 FIREBASE_SERVICE_ACCOUNT_BASE64 또는\n' +
        'FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY를 설정하세요.'
      );
    }
    console.log('Firebase 초기화 완료');
  }

  _db = getFirestore();
  return _db;
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

// === 단일 구루 처리 ===
async function processGuru(guruSlug: string, dryRun: boolean) {
  // slug로 구루 찾기
  const guru = GURU_LIST.find(
    g => g.name_en.toLowerCase().replace(/\s+/g, '-') === guruSlug
  );

  if (!guru) {
    console.error(`구루를 찾을 수 없습니다: ${guruSlug}`);
    console.log('가능한 slug:', GURU_LIST.map(g => g.name_en.toLowerCase().replace(/\s+/g, '-')).join(', '));
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${guru.name_kr} (${guru.name_en})`);
  console.log(`  CIK: ${guru.cik} | 운용사: ${guru.filing_name}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // 1. SEC EDGAR에서 최근 13F 공시 목록 가져오기
    console.log('[Step 1/5] SEC EDGAR 제출 목록 조회...');
    const filings = await getRecentFilings(guru.cik);

    if (filings.length === 0) {
      console.error(`13F-HR 공시를 찾을 수 없습니다: ${guru.cik}`);
      return;
    }

    // 공시 목록 출력
    console.log('\n최근 13F-HR 공시:');
    filings.slice(0, 8).forEach(f => {
      console.log(`  ${f.reportDate} (제출일: ${f.filingDate}) - ${f.accessionNumber}`);
    });

    // 2. Q3, Q4 filing 찾기
    console.log(`\n[Step 2/5] Q3(${Q3_END}) / Q4(${Q4_END}) 공시 탐색...`);
    const q3Filing = findFilingForQuarter(filings, Q3_END);
    const q4Filing = findFilingForQuarter(filings, Q4_END);

    if (!q3Filing) {
      console.error(`Q3 2025 (${Q3_END}) 공시를 찾을 수 없습니다.`);
      console.log('사용 가능한 reportDate:', filings.map(f => f.reportDate).join(', '));
      return;
    }
    if (!q4Filing) {
      console.error(`Q4 2025 (${Q4_END}) 공시를 찾을 수 없습니다.`);
      console.log('사용 가능한 reportDate:', filings.map(f => f.reportDate).join(', '));
      return;
    }

    console.log(`  Q3: ${q3Filing.reportDate} (${q3Filing.accessionNumber})`);
    console.log(`  Q4: ${q4Filing.reportDate} (${q4Filing.accessionNumber})`);

    // 3. XML 다운로드 및 파싱
    console.log('\n[Step 3/5] XML 다운로드 및 파싱...');

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
    console.log('\n[Step 4/5] Q3 vs Q4 비교 분석...');
    const portfolio = compareHoldings(q3Holdings, q4Holdings);

    // 통계 출력
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

    // 5. Firestore 업로드
    if (dryRun) {
      console.log('\n[DRY RUN] Firestore 업로드를 건너뜁니다.');
      console.log(`데이터 미리보기: ${portfolio.length}개 종목`);
      return;
    }

    console.log('\n[Step 5/5] Firestore 업로드...');

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

    const slug = guru.name_en.toLowerCase().replace(/\s+/g, '-');
    await getDb().collection('guru_portfolios').doc(slug).set(doc);

    console.log(`Firestore guru_portfolios/${slug} 업로드 완료!`);
    console.log(`  총 포트폴리오: $${(totalValueCurr / 1e9).toFixed(2)}B`);
    console.log(`  보유 종목: ${doc.holdings_count}개`);
    console.log(`  전체 엔트리: ${portfolio.length}개 (SOLD OUT 포함)`);

  } catch (error) {
    console.error(`\n[오류] ${guru.name_kr} 처리 실패:`, error);
  }
}

// === 메인 ===
async function main() {
  const args = parseArgs();
  const dryRun = !!args['dry-run'];

  if (dryRun) {
    console.log('[MODE] DRY RUN - Firestore에 업로드하지 않습니다.\n');
  }

  if (args['all']) {
    // 전체 구루 처리
    console.log(`전체 ${GURU_LIST.length}명의 구루 포트폴리오를 처리합니다.\n`);
    for (const guru of GURU_LIST) {
      const slug = guru.name_en.toLowerCase().replace(/\s+/g, '-');
      await processGuru(slug, dryRun);
      console.log('\n');
    }
  } else if (args['name']) {
    // 특정 구루만 처리
    await processGuru(args['name'] as string, dryRun);
  } else {
    console.log('사용법:');
    console.log('  npm run fetch-13f -- --all              (전체 구루)');
    console.log('  npm run fetch-13f -- --name=warren-buffett   (특정 구루)');
    console.log('  npm run fetch-13f -- --all --dry-run    (업로드 없이 확인)');
    console.log('\n사용 가능한 구루:');
    GURU_LIST.forEach(g => {
      const slug = g.name_en.toLowerCase().replace(/\s+/g, '-');
      console.log(`  --name=${slug}  (${g.name_kr})`);
    });
  }
}

main().catch(console.error);
