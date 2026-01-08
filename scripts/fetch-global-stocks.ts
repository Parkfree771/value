/**
 * 전 세계 거래소 종목 데이터 수집 스크립트
 * GitHub: LondonMarket/Global-Stock-Symbols 저장소에서 데이터 수집
 */

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

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/LondonMarket/Global-Stock-Symbols/main';
const FINANCE_DB_BASE = 'https://raw.githubusercontent.com/JerBouma/FinanceDatabase/main/database';

// 거래소 코드 매핑 (FinanceDatabase → KIS API 형식)
const EXCHANGE_CODE_MAP: Record<string, { code: string; country: string }> = {
  // 미국
  'NYQ': { code: 'NYS', country: 'US' },  // NYSE
  'NMS': { code: 'NAS', country: 'US' },  // NASDAQ
  'ASE': { code: 'AMS', country: 'US' },  // AMEX

  // 한국
  'KSC': { code: 'KRX', country: 'KR' },  // KOSPI
  'KOE': { code: 'KRX', country: 'KR' },  // KOSDAQ

  // 일본
  'JPX': { code: 'TSE', country: 'JP' },  // Tokyo Stock Exchange

  // 홍콩
  'HKG': { code: 'HKS', country: 'HK' },  // Hong Kong Stock Exchange

  // 중국
  'SHH': { code: 'SHS', country: 'CN' },  // Shanghai Stock Exchange
  'SHZ': { code: 'SZS', country: 'CN' },  // Shenzhen Stock Exchange

  // 영국
  'LSE': { code: 'LSE', country: 'GB' },  // London Stock Exchange

  // 독일
  'FRA': { code: 'FRA', country: 'DE' },  // Frankfurt Stock Exchange
  'GER': { code: 'FRA', country: 'DE' },  // XETRA

  // 호주
  'ASX': { code: 'ASX', country: 'AU' },  // Australian Stock Exchange
};

/**
 * CSV 파싱 함수
 */
function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * GitHub에서 CSV 다운로드
 */
async function fetchCSV(filename: string): Promise<string> {
  const url = `${GITHUB_RAW_BASE}/${filename}`;
  console.log(`[Fetch] ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${filename}: ${response.status}`);
  }

  return await response.text();
}

/**
 * 한국투자증권 지원 주요 종목 데이터 (lib/kis.ts STOCK_CODES 기반)
 */
function getKISStockCodes(): Stock[] {
  // lib/kis.ts의 STOCK_CODES를 여기에 복사
  const STOCK_CODES: Record<string, string> = {
    // 국내 주요 종목
    '삼성전자': '005930',
    '삼성전기': '009150',
    '삼성물산': '028260',
    '삼성SDI': '006400',
    '삼성생명': '032830',
    '삼성화재': '000810',
    'SK하이닉스': '000660',
    'SK이노베이션': '096770',
    'SK텔레콤': '017670',
    'SK': '034730',
    'NAVER': '035420',
    '카카오': '035720',
    '카카오뱅크': '323410',
    '카카오페이': '377300',
    'LG전자': '066570',
    'LG화학': '051910',
    'LG에너지솔루션': '373220',
    'LG': '003550',
    '현대자동차': '005380',
    '현대모비스': '012330',
    '기아': '000270',
    'POSCO홀딩스': '005490',
    'POSCO인터내셔널': '047050',
    '삼성바이오로직스': '207940',
    '셀트리온': '068270',
    '셀트리온헬스케어': '091990',
    '한국전력': '015760',
    '신한지주': '055550',
    'KB금융': '105560',
    '하나금융지주': '086790',
    'LG생활건강': '051900',
    '아모레퍼시픽': '090430',
    '현대중공업': '329180',
    '두산에너빌리티': '034020',
    'HD현대일렉트릭': '267260',
    '포스코퓨처엠': '003670',
    '한국투자증권': '030200',
    '미래에셋증권': '006800',
    'NH투자증권': '005940',
    '삼성증권': '016360',
    'KB증권': '030210',
    '키움증권': '039490',
    '메리츠증권': '008560',
    '하이투자증권': '003690',
    '신한투자증권': '001720',

    // 미국 주요 기술주
    'Apple': 'AAPL',
    'Microsoft': 'MSFT',
    'Tesla': 'TSLA',
    'Amazon': 'AMZN',
    'Alphabet': 'GOOGL',
    'Google': 'GOOGL',
    'Meta': 'META',
    'Facebook': 'META',
    'NVIDIA': 'NVDA',
    'Netflix': 'NFLX',
    'Adobe': 'ADBE',
    'Intel': 'INTC',
    'AMD': 'AMD',
    'Salesforce': 'CRM',
    'Oracle': 'ORCL',
    'Cisco': 'CSCO',
    'Broadcom': 'AVGO',
    'Qualcomm': 'QCOM',
    'PayPal': 'PYPL',
    'Uber': 'UBER',
    'Airbnb': 'ABNB',

    // 미국 금융/산업
    'JPMorgan': 'JPM',
    'Bank of America': 'BAC',
    'Wells Fargo': 'WFC',
    'Goldman Sachs': 'GS',
    'Morgan Stanley': 'MS',
    'Visa': 'V',
    'Mastercard': 'MA',
    'American Express': 'AXP',
    'Berkshire Hathaway': 'BRK-B',
    'Boeing': 'BA',
    'Caterpillar': 'CAT',
    '3M': 'MMM',
    'General Electric': 'GE',

    // 구루 트래커 추가 종목
    'Occidental Petroleum': 'OXY',
    "Moody's": 'MCO',
    'Chubb': 'CB',
    'Kraft Heinz': 'KHC',
    'DaVita': 'DVA',
    'Nu Holdings': 'NU',
    'Capital One': 'COF',
    'Charter Communications': 'CHTR',
    'T-Mobile US': 'TMUS',
    'Sirius XM': 'SIRI',
    'Verisign': 'VRSN',
    'Liberty Media': 'LSXMA',
    'Floor & Decor': 'FND',
    'Amazon.com': 'AMZN',
    'Snowflake': 'SNOW',
    'Constellation Brands': 'STZ',
    'Liberty SiriusXM': 'LSXMK',

    // 미국 소비재
    'Coca-Cola': 'KO',
    'PepsiCo': 'PEP',
    'Procter & Gamble': 'PG',
    'Nike': 'NKE',
    'Starbucks': 'SBUX',
    'McDonald': 'MCD',
    'Costco': 'COST',
    'Walmart': 'WMT',
    'Target': 'TGT',
    'Home Depot': 'HD',

    // 미국 헬스케어
    'Johnson & Johnson': 'JNJ',
    'Pfizer': 'PFE',
    'Moderna': 'MRNA',
    'UnitedHealth': 'UNH',
    'Eli Lilly': 'LLY',
    'Merck': 'MRK',
    'Abbott': 'ABT',
    'Novo Nordisk': 'NVO',

    // 미국 에너지
    'Exxon Mobil': 'XOM',
    'Chevron': 'CVX',
    'ConocoPhillips': 'COP',

    // 미국 통신
    'AT&T': 'T',
    'Verizon': 'VZ',
    'T-Mobile': 'TMUS',

    // ETF
    'KODEX 200': '069500',
    'KODEX 레버리지': '122630',
    'TIGER 미국S&P500': '360750',
    'SPY': 'SPY',
    'QQQ': 'QQQ',
    'VOO': 'VOO',
    'VTI': 'VTI',
  };

  // NYSE 주요 종목들 (detectExchange 함수 기반)
  const nyseSymbols = ['OXY', 'NKE', 'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'AXP', 'BRK-B', 'BA', 'CAT', 'MMM', 'GE', 'MCO', 'CB', 'KHC', 'DVA', 'COF', 'CHTR', 'STZ', 'KO', 'PEP', 'PG', 'SBUX', 'MCD', 'COST', 'WMT', 'TGT', 'HD', 'JNJ', 'PFE', 'UNH', 'LLY', 'MRK', 'ABT', 'XOM', 'CVX', 'COP', 'T', 'VZ'];

  const results: Stock[] = [];

  Object.entries(STOCK_CODES).forEach(([name, symbol]) => {
    // 국내 주식 (6자리 숫자)
    if (/^\d{6}$/.test(symbol)) {
      results.push({ symbol, name, exchange: 'KRX', country: 'KR' });
    }
    // 해외 주식 (알파벳)
    else {
      // NYSE vs NASDAQ 구분
      const exchange = nyseSymbols.includes(symbol) ? 'NYS' : 'NAS';
      results.push({ symbol, name, exchange, country: 'US' });
    }
  });

  return results;
}

/**
 * FinanceDatabase의 글로벌 주식 데이터 가져오기
 * 158,000+ 종목 (전 세계 주요 거래소 포함)
 */
async function fetchFinanceDatabaseEquities(): Promise<Stock[]> {
  try {
    console.log('📊 FinanceDatabase 글로벌 주식 데이터 다운로드...');
    console.log('   (158,000+ 종목, 전 세계 83개 거래소)\n');

    const url = `${FINANCE_DB_BASE}/equities.csv`;
    console.log(`[Fetch] ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch equities.csv: ${response.status}`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    console.log(`   원본 데이터: ${rows.length.toLocaleString()}개 종목`);

    const stocks: Stock[] = [];
    let skipped = 0;

    for (const row of rows) {
      // FinanceDatabase의 exchange 필드 확인
      const exchangeCode = row.exchange || row.Exchange || '';
      const mapping = EXCHANGE_CODE_MAP[exchangeCode];

      if (mapping) {
        const symbol = row.symbol || row.Symbol || '';
        const name = row.name || row.Name || '';

        if (symbol && name) {
          stocks.push({
            symbol,
            name,
            exchange: mapping.code,
            country: mapping.country,
          });
        }
      } else {
        skipped++;
      }
    }

    console.log(`   ✅ 지원 거래소 종목: ${stocks.length.toLocaleString()}개`);
    console.log(`   ⚠️  미지원 거래소: ${skipped.toLocaleString()}개 (제외)\n`);

    return stocks;
  } catch (error) {
    console.error('❌ FinanceDatabase 데이터 로드 실패:', error);
    return [];
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('🌍 전 세계 거래소 종목 데이터 수집 시작...\n');
  console.log('대상 국가: 🇰🇷 한국, 🇺🇸 미국, 🇯🇵 일본, 🇭🇰 홍콩, 🇨🇳 중국, 🇬🇧 영국, 🇩🇪 독일, 🇦🇺 호주\n');

  const allStocks: Stock[] = [];
  const exchangeCounts: Record<string, number> = {};

  // 1. FinanceDatabase에서 글로벌 주식 데이터 가져오기
  console.log('📊 [1/2] FinanceDatabase 글로벌 데이터 로드...');
  const globalStocks = await fetchFinanceDatabaseEquities();

  // 거래소별 카운트
  for (const stock of globalStocks) {
    exchangeCounts[stock.exchange] = (exchangeCounts[stock.exchange] || 0) + 1;
  }

  allStocks.push(...globalStocks);

  console.log('거래소별 종목 수:');
  Object.entries(exchangeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([exchange, count]) => {
      console.log(`  - ${exchange}: ${count.toLocaleString()}개`);
    });
  console.log();

  // 2. KIS API 지원 주요 종목 추가 (lib/kis.ts STOCK_CODES 기반)
  console.log('📊 [2/2] 한국투자증권 주요 종목 추가...');
  const kisStocks = getKISStockCodes();

  const newKisStocks = kisStocks.filter(s =>
    !allStocks.some(existing =>
      existing.symbol === s.symbol && existing.exchange === s.exchange
    )
  );

  // 거래소별 추가 카운트
  const kisAddedCounts: Record<string, number> = {};
  for (const stock of newKisStocks) {
    kisAddedCounts[stock.exchange] = (kisAddedCounts[stock.exchange] || 0) + 1;
    exchangeCounts[stock.exchange] = (exchangeCounts[stock.exchange] || 0) + 1;
  }

  allStocks.push(...newKisStocks);

  console.log(`✅ 총 +${newKisStocks.length}개 추가:`);
  Object.entries(kisAddedCounts).forEach(([ex, count]) => {
    console.log(`  - ${ex}: +${count}개`);
  });
  console.log();

  // 3. 통합 데이터 생성
  console.log('\n📦 통합 데이터 생성 중...');

  const globalData: GlobalStocksData = {
    version: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
    totalCount: allStocks.length,
    exchanges: exchangeCounts,
    stocks: allStocks,
  };

  // 4. JSON 파일 저장
  const outputPath = 'public/data/global-stocks.json';
  const fs = require('fs');
  const path = require('path');

  // public/data 폴더 생성
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(globalData, null, 2), 'utf-8');

  console.log('\n✅ 완료!');
  console.log(`📁 저장 위치: ${outputPath}`);
  console.log(`📊 총 종목 수: ${globalData.totalCount.toLocaleString()}개`);
  console.log('\n거래소별 종목 수:');
  Object.entries(exchangeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([exchange, count]) => {
      console.log(`  - ${exchange}: ${count.toLocaleString()}개`);
    });
}

main().catch(console.error);
