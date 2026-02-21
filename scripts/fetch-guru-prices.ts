/**
 * 구루 포트폴리오 가격 업데이트 스크립트
 *
 * localhost:3000의 KIS API를 통해 공시일 종가 + 현재가를 조회하고
 * Firestore guru_portfolios/{slug} 문서를 업데이트합니다.
 *
 * 사전 조건: npm run dev 로 서버가 3000 포트에서 실행중이어야 합니다.
 *
 * 사용법:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fetch-guru-prices.ts --all
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fetch-guru-prices.ts --name=warren-buffett
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fetch-guru-prices.ts --all --dry-run
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { GURU_LIST } from '../app/guru-tracker/types';
import { GuruPortfolioDoc, PortfolioHolding } from '../lib/sec13f/types';

import * as dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'] });

const BASE_URL = 'http://localhost:3000';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// KIS API 전용 티커 변환 (표시 티커 → KIS 조회용 티커)
const KIS_TICKER_MAP: Record<string, string> = {
  'BRK-B': 'BRK/B',   // Berkshire Hathaway Class B
  'FI': 'FISV',        // Fiserv (2023년 FI로 변경, KIS는 아직 FISV)
};

// === Firebase Admin 초기화 ===
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
      throw new Error('Firebase 인증 정보가 없습니다.');
    }
  }

  _db = getFirestore();
  return _db;
}

// === API 호출 ===

async function fetchCurrentPrice(ticker: string, exchange: string): Promise<number | null> {
  try {
    const url = `${BASE_URL}/api/kis/stock?code=${ticker}&exchange=${exchange}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data?.price) {
      return Number(json.data.price);
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchHistoricalPrice(ticker: string, date: string, exchange: string): Promise<number | null> {
  try {
    const url = `${BASE_URL}/api/kis/historical?code=${ticker}&date=${date}&exchange=${exchange}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data?.close) {
      return Number(json.data.close);
    }
    return null;
  } catch {
    return null;
  }
}

// === 단일 구루 처리 ===

async function processGuru(slug: string, dryRun: boolean) {
  const guru = GURU_LIST.find(
    g => g.name_en.toLowerCase().replace(/\s+/g, '-') === slug
  );

  if (!guru) {
    console.error(`구루를 찾을 수 없습니다: ${slug}`);
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${guru.name_kr} (${guru.name_en}) - 가격 업데이트`);
  console.log(`${'='.repeat(60)}\n`);

  // Firestore에서 기존 포트폴리오 읽기
  const docRef = getDb().collection('guru_portfolios').doc(slug);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    console.error(`Firestore에 포트폴리오가 없습니다: ${slug}`);
    return;
  }

  const portfolio = docSnap.data() as GuruPortfolioDoc;
  const filingDate = portfolio.filing_date_curr;
  console.log(`  공시일: ${filingDate}`);
  console.log(`  보유 종목: ${portfolio.holdings.length}개\n`);

  let successCount = 0;
  let failCount = 0;
  const updatedHoldings: PortfolioHolding[] = [];

  for (const holding of portfolio.holdings) {
    // 티커 없거나 SOLD OUT이면 스킵
    if (!holding.ticker || holding.status === 'SOLD OUT') {
      updatedHoldings.push({
        ...holding,
        price_at_filing: null,
        price_current: null,
        price_change_pct: null,
      });
      continue;
    }

    const ticker = holding.ticker;
    const kisTicker = KIS_TICKER_MAP[ticker] || ticker;
    const exchange = holding.exchange || 'NAS';

    // 현재가 조회
    const priceCurrent = await fetchCurrentPrice(kisTicker, exchange);
    await delay(200); // KIS API rate limit

    // 공시일 종가 조회
    const priceAtFiling = await fetchHistoricalPrice(kisTicker, filingDate, exchange);
    await delay(200);

    // 변동률 계산
    let priceChangePct: number | null = null;
    if (priceAtFiling && priceCurrent && priceAtFiling > 0) {
      priceChangePct = Math.round(((priceCurrent - priceAtFiling) / priceAtFiling) * 10000) / 100;
    }

    const statusIcon = priceCurrent && priceAtFiling ? '✓' : '✗';
    const changeStr = priceChangePct !== null ? `${priceChangePct > 0 ? '+' : ''}${priceChangePct.toFixed(1)}%` : 'N/A';

    console.log(
      `  ${statusIcon} ${ticker.padEnd(8)} 공시일: ${priceAtFiling ? `$${priceAtFiling.toFixed(2)}` : 'N/A'.padEnd(10)} → 현재: ${priceCurrent ? `$${priceCurrent.toFixed(2)}` : 'N/A'.padEnd(10)} (${changeStr})`
    );

    if (priceCurrent || priceAtFiling) {
      successCount++;
    } else {
      failCount++;
    }

    updatedHoldings.push({
      ...holding,
      price_at_filing: priceAtFiling ?? null,
      price_current: priceCurrent ?? null,
      price_change_pct: priceChangePct ?? null,
    });
  }

  console.log(`\n  결과: 성공 ${successCount}개 / 실패 ${failCount}개`);

  if (dryRun) {
    console.log('  [DRY RUN] Firestore 업데이트를 건너뜁니다.');
    return;
  }

  // Firestore 업데이트
  await docRef.update({
    holdings: updatedHoldings,
    prices_updated_at: new Date().toISOString(),
  });

  console.log(`  Firestore 업데이트 완료!`);
}

// === CLI ===

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

async function main() {
  const args = parseArgs();
  const dryRun = !!args['dry-run'];

  if (dryRun) {
    console.log('[MODE] DRY RUN\n');
  }

  // 서버 연결 확인
  try {
    const res = await fetch(`${BASE_URL}/api/kis/stock?code=AAPL&exchange=NAS`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    console.log('[서버] localhost:3000 연결 확인 ✓\n');
  } catch (e) {
    console.error('[오류] localhost:3000에 연결할 수 없습니다. npm run dev 를 먼저 실행하세요.');
    process.exit(1);
  }

  if (args['all']) {
    for (const guru of GURU_LIST) {
      const slug = guru.name_en.toLowerCase().replace(/\s+/g, '-');
      await processGuru(slug, dryRun);
    }
  } else if (args['name']) {
    await processGuru(args['name'] as string, dryRun);
  } else {
    console.log('사용법:');
    console.log('  npx ts-node ... scripts/fetch-guru-prices.ts --all');
    console.log('  npx ts-node ... scripts/fetch-guru-prices.ts --name=warren-buffett');
    console.log('  npx ts-node ... scripts/fetch-guru-prices.ts --all --dry-run');
  }
}

main().catch(console.error);
