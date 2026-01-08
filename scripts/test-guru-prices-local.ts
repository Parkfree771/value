/**
 * 구루 포트폴리오 현재가 업데이트 - 로컬 테스트용
 * Firebase Storage 대신 public/data/guru-stock-prices.json에 저장
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// .env.local 로드
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('[TEST] Local guru price update');
console.log('[CWD]', process.cwd());

// Firebase Admin 초기화 (Firestore에서 토큰 가져오기 위해)
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

// 서비스 계정 파일이 없으면 환경변수에서 로드 시도
let serviceAccount: any;
if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
} else {
  // .env.local의 FIREBASE_PRIVATE_KEY 사용
  serviceAccount = {
    type: 'service_account',
    project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
  console.log('[Firebase] Admin initialized');
}

const db = getFirestore();
const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const DELAY_BETWEEN_REQUESTS = 100;

// guru-portfolio-data.json에서 종목 추출
function loadGuruPortfolios(): Map<string, { exchange: string; basePrice: number; companyName: string }> {
  const jsonPath = path.join(__dirname, '..', 'lib', 'guru-portfolio-data.json');
  console.log('[GURU] Loading from:', jsonPath);

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(rawData);

  const gurusData = data.gurus || data;
  const stockMap = new Map<string, { exchange: string; basePrice: number; companyName: string }>();

  for (const guruId of Object.keys(gurusData)) {
    const guru = gurusData[guruId];
    if (!guru?.holdings) continue;

    console.log(`[GURU] ${guruId}: ${guru.holdings.length} holdings`);

    for (const holding of guru.holdings) {
      if (!holding.exchange) continue;
      if (!stockMap.has(holding.ticker)) {
        stockMap.set(holding.ticker, {
          exchange: holding.exchange,
          basePrice: holding.basePrice,
          companyName: holding.companyName,
        });
      }
    }
  }

  return stockMap;
}

// Firestore에서 KIS 토큰 가져오기
async function getKISToken(): Promise<string> {
  try {
    const tokenDoc = await db.collection('settings').doc('kis_token').get();

    if (tokenDoc.exists && tokenDoc.data()?.token) {
      console.log('[KIS] Token loaded from Firestore');
      return tokenDoc.data()!.token;
    }
  } catch (e) {
    console.log('[KIS] Firestore token not available, generating new one...');
  }

  // Firestore에 없으면 새로 발급
  const response = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token generation failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('[KIS] New token generated');
  return data.access_token;
}

// 해외 주식 현재가 조회
async function getOverseaStockPrice(token: string, ticker: string, exchange: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price?AUTH=&EXCD=${exchange}&SYMB=${ticker}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`,
          'appkey': process.env.KIS_APP_KEY!,
          'appsecret': process.env.KIS_APP_SECRET!,
          'tr_id': 'HHDFS00000300',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.rt_cd !== '0') return null;

    const price = parseFloat(data.output.last);
    return isNaN(price) ? null : price;
  } catch {
    return null;
  }
}

async function main() {
  const startTime = Date.now();
  console.log('\n[GURU] ===== Starting local test =====\n');

  try {
    // 1. 종목 로드
    const stockMap = loadGuruPortfolios();
    console.log(`[GURU] Found ${stockMap.size} unique stocks\n`);

    // 2. KIS 토큰
    const token = await getKISToken();

    // 3. 현재가 조회
    const stocks: Record<string, any> = {};
    let successCount = 0;
    let failCount = 0;

    for (const [ticker, info] of stockMap) {
      const currentPrice = await getOverseaStockPrice(token, ticker, info.exchange);

      if (currentPrice !== null) {
        const returnRate = ((currentPrice - info.basePrice) / info.basePrice) * 100;

        stocks[ticker] = {
          basePrice: info.basePrice,
          currentPrice,
          returnRate: Math.round(returnRate * 100) / 100,
          exchange: info.exchange,
          companyName: info.companyName,
        };

        const sign = returnRate >= 0 ? '+' : '';
        console.log(`✓ ${ticker}: $${info.basePrice} → $${currentPrice} (${sign}${returnRate.toFixed(2)}%)`);
        successCount++;
      } else {
        stocks[ticker] = {
          basePrice: info.basePrice,
          currentPrice: null,
          returnRate: null,
          exchange: info.exchange,
          companyName: info.companyName,
        };
        console.log(`✗ ${ticker}: failed`);
        failCount++;
      }

      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }

    // 4. JSON 저장 (public/data 폴더)
    const outputDir = path.join(__dirname, '..', 'public', 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonData = {
      lastUpdated: new Date().toISOString(),
      totalStocks: stockMap.size,
      successCount,
      failCount,
      stocks,
    };

    const outputPath = path.join(outputDir, 'guru-stock-prices.json');
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n[GURU] ===== Completed: ${successCount} success, ${failCount} failed (${duration}s) =====`);
    console.log(`[GURU] JSON saved to: ${outputPath}`);

  } catch (error) {
    console.error('[ERROR]', error);
    process.exit(1);
  }
}

main();
