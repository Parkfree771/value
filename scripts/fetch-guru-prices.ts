// 구루 포트폴리오 종목의 2025-09-30 종가 및 거래소 조회 스크립트
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// .env.local 로드
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// 거래소 코드 매핑
const EXCHANGE_MAP: Record<string, string> = {
  'NAS': 'NASDAQ',
  'NYS': 'NYSE',
  'AMS': 'AMEX',
  'HKS': 'HKEX',
  'SHS': 'SSE',
  'SZS': 'SZSE',
  'TSE': 'TSE',
};

// 잘 알려진 티커의 거래소 매핑
const KNOWN_EXCHANGES: Record<string, string> = {
  // NYSE
  'AAPL': 'NAS', 'MSFT': 'NAS', 'GOOGL': 'NAS', 'GOOG': 'NAS', 'AMZN': 'NAS',
  'META': 'NAS', 'NVDA': 'NAS', 'TSLA': 'NAS', 'NFLX': 'NAS', 'ADBE': 'NAS',
  'INTC': 'NAS', 'AMD': 'NAS', 'QCOM': 'NAS', 'AVGO': 'NAS', 'CSCO': 'NAS',
  'PYPL': 'NAS', 'UBER': 'NAS', 'ABNB': 'NAS', 'SBUX': 'NAS', 'TMUS': 'NAS',
  'VRSN': 'NAS', 'SIRI': 'NAS', 'CMCSA': 'NAS', 'PDD': 'NAS', 'JD': 'NAS',
  'BIDU': 'NAS', 'NTES': 'NAS', 'MELI': 'NAS', 'DOCU': 'NAS', 'ROKU': 'NAS',
  'TWLO': 'NAS', 'MDB': 'NAS', 'SNOW': 'NAS', 'CPNG': 'NAS',

  // NYSE
  'V': 'NYS', 'MA': 'NYS', 'AXP': 'NYS', 'JPM': 'NYS', 'BAC': 'NYS',
  'WFC': 'NYS', 'GS': 'NYS', 'MS': 'NYS', 'C': 'NYS', 'COF': 'NYS',
  'BRK-B': 'NYS', 'KO': 'NYS', 'PEP': 'NYS', 'PG': 'NYS', 'JNJ': 'NYS',
  'UNH': 'NYS', 'CVX': 'NYS', 'XOM': 'NYS', 'OXY': 'NYS', 'MCO': 'NYS',
  'CB': 'NYS', 'KHC': 'NYS', 'DVA': 'NYS', 'KR': 'NYS', 'STZ': 'NYS',
  'AON': 'NYS', 'DPZ': 'NYS', 'ALLY': 'NYS', 'POOL': 'NYS', 'LEN': 'NYS',
  'NUE': 'NYS', 'LPX': 'NYS', 'CHTR': 'NYS', 'LAMR': 'NYS', 'ALLE': 'NYS',
  'NVR': 'NYS', 'DEO': 'NYS', 'JEF': 'NYS', 'BN': 'NYS', 'HHH': 'NYS',
  'QSR': 'NYS', 'CMG': 'NYS', 'HLT': 'NYS', 'SEG': 'NYS', 'HTZ': 'NYS',
  'TRMD': 'NYS', 'EXE': 'NYS', 'GTX': 'NYS', 'AU': 'NYS', 'VNOM': 'NYS',
  'TDS': 'NYS', 'TLN': 'NYS', 'STKL': 'NAS', 'CORZ': 'NAS', 'B': 'NYS',
  'LBTYA': 'NAS', 'FTAI': 'NYS', 'CX': 'NYS', 'ITUB': 'NYS', 'CBL': 'NYS',
  'NOK': 'NYS', 'TAC': 'NYS', 'RWAY': 'NAS', 'KRC': 'NYS', 'GRAB': 'NAS',
  'NU': 'NYS', 'VIST': 'NYS', 'FCX': 'NYS', 'LILAK': 'NAS', 'YMM': 'NYS',
  'BLCO': 'NYS', 'SATS': 'NAS', 'BZ': 'NAS', 'XP': 'NAS', 'CRC': 'NYS',
  'SBLK': 'NAS', 'AD': 'NYS', 'TX': 'NYS', 'NBR': 'NYS', 'ECVT': 'NYS',
  'SE': 'NYS', 'OCSL': 'NAS', 'JBS': 'NYS', 'VALE': 'NYS', 'TEO': 'NYS',
  'OPTU': 'NAS', 'ALVO': 'NAS', 'INDV': 'NAS', 'SMRT': 'NYS', 'CHKEL': 'NAS',
  'MX': 'NYS', 'ACR': 'NYS', 'BHC': 'NYS', 'ALVOW': 'NAS', 'LILA': 'NAS',
  'HDB': 'NYS', 'LGN': 'NYS', 'BATL': 'NYS', 'TGS': 'NYS', 'BTAI': 'NAS',
  'TPICQ': 'NAS', 'ELV': 'NYS', 'CRH': 'NYS', 'WTW': 'NAS', 'UNP': 'NYS',
  'WCC': 'NYS', 'DG': 'NYS', 'FERG': 'NYS', 'LBTYK': 'NAS', 'FIS': 'NYS',
  'EXP': 'NYS', 'GPC': 'NYS', 'GDS': 'NAS', 'FISV': 'NYS', 'HLF': 'NYS',
  'COLD': 'NYS', 'PAGS': 'NYS', 'TBN': 'NYS', 'NTRA': 'NAS', 'INSM': 'NAS',
  'TEVA': 'NYS', 'TSM': 'NYS', 'WWD': 'NYS', 'VRNA': 'NAS', 'EEM': 'NYS',
  'WAB': 'NYS', 'SPY': 'NYS', 'IWM': 'NYS', 'NAMS': 'NAS', 'CRS': 'NYS',
  'GEV': 'NYS', 'VST': 'NYS', 'DHI': 'NYS', 'U': 'NYS', 'CLF': 'NYS',
  'BBB': 'NYS', 'PCT': 'NYS', 'DAKT': 'NAS', 'DKS': 'NYS', 'FLUT': 'NYS',
  'KBE': 'NYS', 'OPCH': 'NAS', 'AEVA': 'NYS', 'PCG': 'NYS', 'ARM': 'NAS',
  'SMTC': 'NAS', 'STX': 'NAS', 'ELVN': 'NAS', 'POST': 'NYS', 'SYF': 'NYS',
  'ARGT': 'NYS', 'COGT': 'NAS', 'PTGX': 'NAS', 'SEI': 'NYS', 'TXRH': 'NAS',
  'YPF': 'NYS', 'SAP': 'NYS', 'FMX': 'NYS', 'LIN': 'NYS', 'BHP': 'NYS',
  'BAP': 'NYS', 'ALC': 'NYS', 'RYAAY': 'NAS', 'NICE': 'NAS', 'ASML': 'NAS',
  'SHEL': 'NYS', 'SONY': 'NYS', 'CNI': 'NYS', 'BKNG': 'NAS', 'CME': 'NAS',
  'VRTX': 'NAS', 'PGR': 'NYS', 'BBVA': 'NYS', 'HLN': 'NYS', 'MFC': 'NYS',
  'APH': 'NYS', 'DE': 'NYS', 'TW': 'NAS', 'RIO': 'NYS', 'SNPS': 'NAS',
  'ACN': 'NYS', 'GMAB': 'NAS', 'HEI': 'NYS', 'ABBV': 'NYS', 'TLK': 'NYS',
  'CSGP': 'NAS', 'NOW': 'NYS', 'DHR': 'NYS', 'TMO': 'NYS', 'AME': 'NYS',
  'NVS': 'NYS', 'SLB': 'NYS', 'NOC': 'NYS', 'TTD': 'NAS', 'VXUS': 'NYS',
  'ATKR': 'NYS', 'HON': 'NAS', 'GLOB': 'NYS', 'ZTO': 'NYS', 'TS': 'NYS',
  'KSPI': 'NAS', 'ACWI': 'NAS', 'INDA': 'NAS', 'EPAM': 'NYS', 'IBN': 'NYS',
  'ACWX': 'NAS', 'VEA': 'NYS', 'EWBC': 'NAS', 'SOC': 'NYS',
  'LLYVK': 'NAS', 'LLYVA': 'NAS', 'FWONK': 'NAS', 'HEI-A': 'NYS',
  'LEN-B': 'NYS', 'BATRK': 'NAS',
};

interface PriceResult {
  ticker: string;
  exchange: string;
  exchangeName: string;
  price: number | null;
  error?: string;
}

// API 호출 딜레이
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// KIS API 토큰 가져오기
async function getKISToken(): Promise<string> {
  const url = `${process.env.KIS_BASE_URL}/oauth2/tokenP`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`토큰 발급 실패: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// 해외 주식 과거 시세 조회
async function getHistoricalPrice(
  token: string,
  symbol: string,
  exchange: string,
  date: string
): Promise<number | null> {
  const formattedDate = date.replace(/-/g, '');

  const params = new URLSearchParams({
    AUTH: '',
    EXCD: exchange,
    SYMB: symbol,
    GUBN: '0',
    BYMD: formattedDate,
    MODP: '1',
  });

  const url = `${process.env.KIS_BASE_URL}/uapi/overseas-price/v1/quotations/dailyprice?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'authorization': `Bearer ${token}`,
        'appkey': process.env.KIS_APP_KEY!,
        'appsecret': process.env.KIS_APP_SECRET!,
        'tr_id': 'HHDFS76240000',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.output2 || !Array.isArray(data.output2) || data.output2.length === 0) {
      return null;
    }

    // 해당 날짜 찾기
    const targetDate = formattedDate;
    const dayData = data.output2.find((d: any) => d.xymd === targetDate) || data.output2[0];

    const closePrice = parseFloat(dayData.clos || dayData.stck_clpr || 0);
    return closePrice > 0 ? closePrice : null;
  } catch (error) {
    return null;
  }
}

// 거래소 감지
function detectExchange(symbol: string): string {
  // 하이픈 처리 (BRK-B -> BRK-B, HEI-A -> HEI-A)
  const upperSymbol = symbol.toUpperCase();

  if (KNOWN_EXCHANGES[upperSymbol]) {
    return KNOWN_EXCHANGES[upperSymbol];
  }

  // 기본값: NASDAQ
  return 'NAS';
}

async function main() {
  console.log('=== 구루 포트폴리오 가격 조회 시작 ===\n');

  // portfolioData.ts 읽기
  const portfolioPath = path.join(__dirname, '..', 'app', 'guru-tracker', 'portfolioData.ts');
  const portfolioContent = fs.readFileSync(portfolioPath, 'utf-8');

  // 티커 추출 (ticker: 'XXX' 패턴)
  const tickerRegex = /ticker:\s*['"]([^'"]+)['"]/g;
  const tickers = new Set<string>();
  let match;

  while ((match = tickerRegex.exec(portfolioContent)) !== null) {
    tickers.add(match[1]);
  }

  console.log(`총 ${tickers.size}개의 고유 티커 발견\n`);

  // 토큰 발급
  console.log('KIS API 토큰 발급 중...');
  const token = await getKISToken();
  console.log('토큰 발급 완료!\n');

  const results: PriceResult[] = [];
  const targetDate = '2025-09-30';

  let count = 0;
  for (const ticker of tickers) {
    count++;
    const exchange = detectExchange(ticker);
    const exchangeName = EXCHANGE_MAP[exchange] || exchange;

    console.log(`[${count}/${tickers.size}] ${ticker} (${exchangeName}) 조회 중...`);

    const price = await getHistoricalPrice(token, ticker, exchange, targetDate);

    if (price !== null) {
      console.log(`  ✓ ${ticker}: $${price.toFixed(2)} @ ${exchangeName}`);
      results.push({ ticker, exchange, exchangeName, price });
    } else {
      // 다른 거래소 시도
      const altExchange = exchange === 'NAS' ? 'NYS' : 'NAS';
      const altPrice = await getHistoricalPrice(token, ticker, altExchange, targetDate);

      if (altPrice !== null) {
        const altExchangeName = EXCHANGE_MAP[altExchange] || altExchange;
        console.log(`  ✓ ${ticker}: $${altPrice.toFixed(2)} @ ${altExchangeName} (대체)`);
        results.push({ ticker, exchange: altExchange, exchangeName: altExchangeName, price: altPrice });
      } else {
        console.log(`  ✗ ${ticker}: 가격 조회 실패`);
        results.push({ ticker, exchange, exchangeName, price: null, error: '조회 실패' });
      }
    }

    // API 레이트 리밋 방지
    await delay(100);
  }

  // 결과 저장
  const outputPath = path.join(__dirname, '..', 'scripts', 'guru-prices-result.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log('\n=== 조회 완료 ===');
  console.log(`성공: ${results.filter(r => r.price !== null).length}`);
  console.log(`실패: ${results.filter(r => r.price === null).length}`);
  console.log(`결과 저장: ${outputPath}`);
}

main().catch(console.error);
