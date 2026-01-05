/**
 * 한국투자증권 종목 데이터 파싱 스크립트
 * public/data/*.COD 파일들을 읽어서 global-stocks.json 생성
 */

import * as fs from 'fs';
import * as path from 'path';

interface Stock {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
}

interface GlobalStocksData {
  version: string;
  updatedAt: string;
  totalCount: number;
  exchanges: Record<string, number>;
  stocks: Stock[];
}

// COD 파일명과 거래소 코드 매핑
const EXCHANGE_MAP: Record<string, { code: string; country: string }> = {
  'NASDAQ.COD': { code: 'NAS', country: 'US' },
  'NYSE.COD': { code: 'NYS', country: 'US' },
  'AMEX.COD': { code: 'AMS', country: 'US' },
  'TSE.COD': { code: 'TSE', country: 'JP' },
  'HKS.COD': { code: 'HKS', country: 'HK' },
  'SHS.COD': { code: 'SHS', country: 'CN' },
  'SZS.COD': { code: 'SZS', country: 'CN' },
};

/**
 * COD 파일 파싱
 * 파일 형식: Tab-separated values
 * 필드: 국가코드, 거래소코드, 거래소약자, 한글분류, 심볼, 풀심볼, 한글명, 영문명, ...
 */
function parseCODFile(filePath: string, exchangeInfo: { code: string; country: string }): Stock[] {
  const stocks: Stock[] = [];

  try {
    // UTF-8로 읽기 시도 (영문명 필드만 사용할 것이므로)
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    console.log(`  파일: ${path.basename(filePath)} - ${lines.length}개 라인`);

    for (const line of lines) {
      try {
        const fields = line.split('\t');

        // 최소 8개 필드 필요 (0-7 인덱스)
        if (fields.length < 8) continue;

        // 필드 인덱스:
        // 0: 국가코드 (US, JP, HK, CN)
        // 1: 거래소코드 (21=NYS, 22=NAS)
        // 2: 거래소약자 (NYS, NAS)
        // 3: 한글분류 (무시)
        // 4: 심볼 (AAPL, TSLA 등)
        // 5: 풀심볼 (NASAAPL 등)
        // 6: 한글명 (인코딩 깨짐)
        // 7: 영문명 (APPLE INC 등)

        const symbol = fields[4]?.trim();
        const name = fields[7]?.trim();

        // 유효한 심볼과 이름이 있는 경우만 추가
        if (symbol && name && symbol.length > 0 && name.length > 0) {
          stocks.push({
            symbol,
            name,
            exchange: exchangeInfo.code,
            country: exchangeInfo.country,
          });
        }
      } catch (error) {
        // 개별 라인 파싱 실패는 무시
        continue;
      }
    }

    console.log(`    → ${stocks.length}개 종목 파싱 성공`);
  } catch (error) {
    console.error(`  ❌ 파일 읽기 실패: ${filePath}`, error);
  }

  return stocks;
}

/**
 * 한국 시장 데이터 파싱 (KOSPI, KOSDAQ)
 */
function parseKoreanStocks(): Stock[] {
  const stocks: Stock[] = [];
  const kospiPath = 'public/data/KOSPI.mst';
  const kosdaqPath = 'public/data/KOSDAQ.mst';

  // KOSPI와 KOSDAQ 파일이 있으면 파싱 (형식 분석 필요)
  // 일단은 lib/kis.ts의 주요 종목들을 사용

  console.log('  한국 시장: lib/kis.ts 주요 종목 사용');

  return stocks;
}

/**
 * lib/kis.ts의 주요 종목 추가
 */
function getKISMainStocks(): Stock[] {
  const stocks: Stock[] = [
    // 한국 주요 종목
    { symbol: '005930', name: 'SAMSUNG ELECTRONICS', exchange: 'KRX', country: 'KR' },
    { symbol: '000660', name: 'SK HYNIX', exchange: 'KRX', country: 'KR' },
    { symbol: '035420', name: 'NAVER', exchange: 'KRX', country: 'KR' },
    { symbol: '035720', name: 'KAKAO', exchange: 'KRX', country: 'KR' },
    { symbol: '005380', name: 'HYUNDAI MOTOR', exchange: 'KRX', country: 'KR' },
    { symbol: '051910', name: 'LG CHEM', exchange: 'KRX', country: 'KR' },
    { symbol: '373220', name: 'LG ENERGY SOLUTION', exchange: 'KRX', country: 'KR' },
    { symbol: '207940', name: 'SAMSUNG BIOLOGICS', exchange: 'KRX', country: 'KR' },
    { symbol: '006400', name: 'SAMSUNG SDI', exchange: 'KRX', country: 'KR' },
    { symbol: '068270', name: 'CELLTRION', exchange: 'KRX', country: 'KR' },
  ];

  return stocks;
}

/**
 * 메인 함수
 */
async function main() {
  console.log('🌍 한국투자증권 종목 데이터 파싱 시작...\n');

  const allStocks: Stock[] = [];
  const exchangeCounts: Record<string, number> = {};

  // 1. COD 파일들 파싱
  console.log('📊 [1/2] COD 파일 파싱...\n');

  const dataDir = 'public/data';

  for (const [fileName, exchangeInfo] of Object.entries(EXCHANGE_MAP)) {
    const filePath = path.join(dataDir, fileName);

    if (fs.existsSync(filePath)) {
      const stocks = parseCODFile(filePath, exchangeInfo);
      allStocks.push(...stocks);

      exchangeCounts[exchangeInfo.code] = (exchangeCounts[exchangeInfo.code] || 0) + stocks.length;
    } else {
      console.log(`  ⚠️  파일 없음: ${fileName}`);
    }
  }

  console.log();

  // 2. 한국 주요 종목 추가
  console.log('📊 [2/2] 한국 주요 종목 추가...\n');
  const koreanStocks = getKISMainStocks();
  allStocks.push(...koreanStocks);
  exchangeCounts['KRX'] = (exchangeCounts['KRX'] || 0) + koreanStocks.length;
  console.log(`  ✅ ${koreanStocks.length}개 추가\n`);

  // 3. 중복 제거 (같은 exchange + symbol)
  console.log('🔍 중복 제거 중...');
  const uniqueMap = new Map<string, Stock>();

  for (const stock of allStocks) {
    const key = `${stock.exchange}:${stock.symbol}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, stock);
    }
  }

  const uniqueStocks = Array.from(uniqueMap.values());
  console.log(`  제거 전: ${allStocks.length.toLocaleString()}개`);
  console.log(`  제거 후: ${uniqueStocks.length.toLocaleString()}개`);
  console.log(`  중복: ${(allStocks.length - uniqueStocks.length).toLocaleString()}개 제거\n`);

  // 거래소별 최종 카운트 재계산
  const finalExchangeCounts: Record<string, number> = {};
  for (const stock of uniqueStocks) {
    finalExchangeCounts[stock.exchange] = (finalExchangeCounts[stock.exchange] || 0) + 1;
  }

  // 4. 통합 데이터 생성
  console.log('📦 통합 데이터 생성 중...\n');

  const globalData: GlobalStocksData = {
    version: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
    totalCount: uniqueStocks.length,
    exchanges: finalExchangeCounts,
    stocks: uniqueStocks,
  };

  // 5. JSON 파일 저장
  const outputPath = 'public/data/global-stocks.json';
  fs.writeFileSync(outputPath, JSON.stringify(globalData, null, 2), 'utf-8');

  console.log('✅ 완료!');
  console.log(`📁 저장 위치: ${outputPath}`);
  console.log(`📊 총 종목 수: ${globalData.totalCount.toLocaleString()}개\n`);
  console.log('거래소별 종목 수:');
  Object.entries(finalExchangeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([exchange, count]) => {
      console.log(`  - ${exchange}: ${count.toLocaleString()}개`);
    });
}

main().catch(console.error);
