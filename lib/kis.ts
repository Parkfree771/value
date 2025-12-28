// 한국투자증권 API 유틸리티

interface KISTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface KISStockPriceResponse {
  output: {
    stck_prpr: string; // 주식 현재가
    prdy_vrss: string; // 전일 대비
    prdy_vrss_sign: string; // 전일 대비 부호
    prdy_ctrt: string; // 전일 대비율
    stck_oprc: string; // 시가
    stck_hgpr: string; // 고가
    stck_lwpr: string; // 저가
    acml_vol: string; // 누적 거래량
  };
}

// 토큰 캐시 (메모리에 저장)
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * 한국투자증권 OAuth 토큰 발급
 */
export async function getKISToken(): Promise<string> {
  // 캐시된 토큰이 유효한 경우 재사용
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    console.log('[KIS Token] Using cached token');
    return cachedToken;
  }

  console.log('[KIS Token] Generating new token...');
  console.log('[KIS Token] BASE_URL:', process.env.KIS_BASE_URL);
  console.log('[KIS Token] APP_KEY exists:', !!process.env.KIS_APP_KEY);
  console.log('[KIS Token] APP_SECRET exists:', !!process.env.KIS_APP_SECRET);

  const url = `${process.env.KIS_BASE_URL}/oauth2/tokenP`;

  const requestBody = {
    grant_type: 'client_credentials',
    appkey: process.env.KIS_APP_KEY,
    appsecret: process.env.KIS_APP_SECRET,
  };

  console.log('[KIS Token] Request URL:', url);
  console.log('[KIS Token] Request body:', { ...requestBody, appsecret: '***' });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log('[KIS Token] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KIS Token] Error response:', errorText);
    throw new Error(`토큰 발급 실패: ${response.status} - ${errorText}`);
  }

  const data: KISTokenResponse = await response.json();

  // 토큰 캐시 (만료 시간 - 5분 여유)
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

  return data.access_token;
}

/**
 * 국내 주식 현재가 조회
 * @param stockCode 종목코드 (예: 005930 - 삼성전자)
 */
export async function getKISStockPrice(stockCode: string) {
  const token = await getKISToken();

  // 쿼리 파라미터 추가
  const params = new URLSearchParams({
    fid_cond_mrkt_div_code: 'J', // J: 주식, ETF, ETN
    fid_input_iscd: stockCode,    // 종목코드 6자리
  });

  const url = `${process.env.KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'authorization': `Bearer ${token}`,
      'appkey': process.env.KIS_APP_KEY!,
      'appsecret': process.env.KIS_APP_SECRET!,
      'tr_id': 'FHKST01010100', // 국내주식 현재가 시세
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`주식 시세 조회 실패: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // 응답 구조 검증
  if (!data.output) {
    throw new Error(`잘못된 API 응답 구조: ${JSON.stringify(data)}`);
  }

  return {
    price: parseFloat(data.output.stck_prpr),
    change: parseFloat(data.output.prdy_vrss),
    changePercent: parseFloat(data.output.prdy_ctrt),
    open: parseFloat(data.output.stck_oprc),
    high: parseFloat(data.output.stck_hgpr),
    low: parseFloat(data.output.stck_lwpr),
    volume: parseInt(data.output.acml_vol),
  };
}

/**
 * 해외 주식 현재가 조회
 * @param symbol 종목 심볼 (예: AAPL, TSLA)
 * @param exchange 거래소 코드 (예: NAS, NYS, HKS)
 */
export async function getKISOverseaStockPrice(symbol: string, exchange: string = 'NAS') {
  const token = await getKISToken();

  const params = new URLSearchParams({
    AUTH: '',
    EXCD: exchange,  // 거래소 코드
    SYMB: symbol,    // 종목 심볼
  });

  const url = `${process.env.KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'authorization': `Bearer ${token}`,
      'appkey': process.env.KIS_APP_KEY!,
      'appsecret': process.env.KIS_APP_SECRET!,
      'tr_id': 'HHDFS00000300', // 해외주식 현재가 시세
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`해외주식 시세 조회 실패: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // 응답 구조 검증
  if (!data.output) {
    throw new Error(`잘못된 API 응답 구조: ${JSON.stringify(data)}`);
  }

  const output = data.output;

  return {
    price: parseFloat(output.last || output.curr_price || 0),
    change: parseFloat(output.diff || 0),
    changePercent: parseFloat(output.rate || 0),
    open: parseFloat(output.open || 0),
    high: parseFloat(output.high || 0),
    low: parseFloat(output.low || 0),
    volume: parseInt(output.tvol || output.volume || 0),
    currency: getCurrencyByExchange(exchange),
  };
}

/**
 * 거래소 코드 매핑
 */
export const EXCHANGE_CODES: Record<string, string> = {
  // 미국
  'NASDAQ': 'NAS',
  'NYSE': 'NYS',
  'AMEX': 'AMS',
  // 아시아
  'HONG_KONG': 'HKS',
  'SHANGHAI': 'SHS',
  'SHENZHEN': 'SZS',
  'TOKYO': 'TSE',
  'HANOI': 'HNX',
  'HOCHIMINH': 'HSX',
};

/**
 * 거래소별 통화 반환
 */
export function getCurrencyByExchange(exchange: string): string {
  const currencyMap: Record<string, string> = {
    'NAS': 'USD',
    'NYS': 'USD',
    'AMS': 'USD',
    'HKS': 'HKD',
    'SHS': 'CNY',
    'SZS': 'CNY',
    'TSE': 'JPY',
    'HNX': 'VND',
    'HSX': 'VND',
  };
  return currencyMap[exchange] || 'USD';
}

/**
 * 티커 심볼로 거래소 추정
 */
export function detectExchange(symbol: string): string {
  // 6자리 숫자 = 한국 주식
  if (/^\d{6}$/.test(symbol)) {
    return 'KRX';
  }

  // 접미사로 거래소 판단
  if (symbol.endsWith('.T')) return 'TSE';  // 도쿄
  if (symbol.endsWith('.HK')) return 'HKS'; // 홍콩
  if (symbol.endsWith('.SS')) return 'SHS'; // 상하이
  if (symbol.endsWith('.SZ')) return 'SZS'; // 심천
  if (symbol.endsWith('.HN')) return 'HNX'; // 하노이
  if (symbol.endsWith('.HM')) return 'HSX'; // 호치민

  // 특정 티커의 거래소 매핑 (알파벳 순서)
  const tickerExchangeMap: Record<string, string> = {
    'BRK-A': 'NYS',  // Berkshire Hathaway Class A
    'BRK-B': 'NYS',  // Berkshire Hathaway Class B
    'NVO': 'NYS',    // Novo Nordisk (NYSE에 상장)
    // 필요시 추가 매핑
  };

  const upperSymbol = symbol.toUpperCase();
  if (tickerExchangeMap[upperSymbol]) {
    return tickerExchangeMap[upperSymbol];
  }

  // 기본적으로 미국 주식 (NASDAQ)
  return 'NAS';
}

/**
 * 국내 주식 과거 시세 조회 (일봉)
 * @param stockCode 종목코드 (예: 005930 - 삼성전자)
 * @param date 조회 날짜 (YYYYMMDD 형식)
 */
export async function getKISHistoricalStockPrice(stockCode: string, date: string) {
  const token = await getKISToken();

  // YYYY-MM-DD를 YYYYMMDD로 변환
  const formattedDate = date.replace(/-/g, '');

  const params = new URLSearchParams({
    fid_cond_mrkt_div_code: 'J', // J: 주식
    fid_input_iscd: stockCode,
    fid_input_date_1: formattedDate, // 조회 시작일
    fid_input_date_2: formattedDate, // 조회 종료일 (같은 날짜)
    fid_period_div_code: 'D',        // D: 일봉
  });

  const url = `${process.env.KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-price?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'authorization': `Bearer ${token}`,
      'appkey': process.env.KIS_APP_KEY!,
      'appsecret': process.env.KIS_APP_SECRET!,
      'tr_id': 'FHKST03010100', // 국내주식 기간별 시세
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`과거 주식 시세 조회 실패: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // 응답 구조 검증
  if (!data.output2 || !Array.isArray(data.output2) || data.output2.length === 0) {
    console.warn(`과거 시세 데이터 없음: ${stockCode} at ${date}`);
    return null;
  }

  const dayData = data.output2[0]; // 첫 번째 데이터 (해당 날짜)

  return {
    date: formattedDate,
    close: parseFloat(dayData.stck_clpr), // 종가
    open: parseFloat(dayData.stck_oprc),  // 시가
    high: parseFloat(dayData.stck_hgpr),  // 고가
    low: parseFloat(dayData.stck_lwpr),   // 저가
    volume: parseInt(dayData.acml_vol),   // 거래량
  };
}

/**
 * 해외 주식 과거 시세 조회 (일봉)
 * @param symbol 종목 심볼 (예: AAPL, TSLA)
 * @param exchange 거래소 코드 (예: NAS, NYS)
 * @param date 조회 날짜 (YYYYMMDD 형식)
 */
export async function getKISHistoricalOverseaStockPrice(
  symbol: string,
  exchange: string = 'NAS',
  date: string
) {
  console.log(`[KIS Historical Oversea] 요청: symbol=${symbol}, exchange=${exchange}, date=${date}`);

  const token = await getKISToken();

  // YYYY-MM-DD를 YYYYMMDD로 변환
  const formattedDate = date.replace(/-/g, '');

  const params = new URLSearchParams({
    AUTH: '',
    EXCD: exchange,
    SYMB: symbol,
    GUBN: '0',              // 0: 일봉
    BYMD: formattedDate,    // 조회 기준일
    MODP: '1',              // 1: 수정주가
  });

  const url = `${process.env.KIS_BASE_URL}/uapi/overseas-price/v1/quotations/dailyprice?${params.toString()}`;

  console.log(`[KIS Historical Oversea] URL: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'authorization': `Bearer ${token}`,
      'appkey': process.env.KIS_APP_KEY!,
      'appsecret': process.env.KIS_APP_SECRET!,
      'tr_id': 'HHDFS76240000', // 해외주식 기간별 시세
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[KIS Historical Oversea] API 오류: ${response.status} - ${errorText}`);
    throw new Error(`해외 과거 주식 시세 조회 실패: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`[KIS Historical Oversea] 응답:`, JSON.stringify(data, null, 2));

  // 응답 구조 검증
  if (!data.output2 || !Array.isArray(data.output2) || data.output2.length === 0) {
    console.warn(`[KIS Historical Oversea] 과거 시세 데이터 없음: ${symbol} at ${date}`);
    console.warn(`[KIS Historical Oversea] 전체 응답:`, data);
    return null;
  }

  const dayData = data.output2[0]; // 첫 번째 데이터 (해당 날짜)
  console.log(`[KIS Historical Oversea] dayData:`, dayData);

  return {
    date: formattedDate,
    close: parseFloat(dayData.clos || dayData.stck_clpr || 0),
    open: parseFloat(dayData.open || dayData.stck_oprc || 0),
    high: parseFloat(dayData.high || dayData.stck_hgpr || 0),
    low: parseFloat(dayData.low || dayData.stck_lwpr || 0),
    volume: parseInt(dayData.tvol || dayData.acml_vol || 0),
    currency: getCurrencyByExchange(exchange),
  };
}

/**
 * 종목 정보 인터페이스
 */
export interface StockInfo {
  symbol: string;
  name: string;
  nameKr?: string;
  exchange: string;
  type: 'EQUITY' | 'ETF';
}

/**
 * 종목 코드 매핑 (한글 이름 -> 종목 코드)
 */
export const STOCK_CODES: Record<string, string> = {
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
  'Moody\'s': 'MCO',
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

/**
 * 국내 주식 종목 검색 (로컬 STOCK_CODES 기반)
 * @param query 검색어 (종목명 또는 종목코드)
 * @param limit 결과 개수 제한
 */
export async function searchKoreanStocks(query: string, limit: number = 20): Promise<StockInfo[]> {
  if (!query || query.trim().length === 0) return [];

  const searchLower = query.toLowerCase().trim();
  const results: StockInfo[] = [];

  // STOCK_CODES에서 국내 주식만 검색
  Object.entries(STOCK_CODES).forEach(([name, symbol]) => {
    // 6자리 숫자 = 국내 주식
    if (/^\d{6}$/.test(symbol)) {
      const nameLower = name.toLowerCase();
      const symbolLower = symbol.toLowerCase();

      if (nameLower.includes(searchLower) || symbolLower.includes(searchLower)) {
        results.push({
          symbol: symbol,
          name: name,
          nameKr: name,
          exchange: 'KRX',
          type: 'EQUITY' as const,
        });
      }
    }
  });

  // 중복 제거 및 정렬
  const uniqueResults = Array.from(
    new Map(results.map(item => [item.symbol, item])).values()
  );

  // 검색어와 정확히 일치하는 것을 우선순위로
  uniqueResults.sort((a, b) => {
    const aExact = a.name.toLowerCase() === searchLower || a.symbol.toLowerCase() === searchLower;
    const bExact = b.name.toLowerCase() === searchLower || b.symbol.toLowerCase() === searchLower;

    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    // 시작하는 것을 우선순위로
    const aStarts = a.name.toLowerCase().startsWith(searchLower) || a.symbol.toLowerCase().startsWith(searchLower);
    const bStarts = b.name.toLowerCase().startsWith(searchLower) || b.symbol.toLowerCase().startsWith(searchLower);

    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    return 0;
  });

  return uniqueResults.slice(0, limit);
}

/**
 * 해외 주식 종목 검색 (로컬 STOCK_CODES 기반)
 * @param query 검색어 (종목명 또는 심볼)
 * @param exchange 거래소 코드 (사용 안 함)
 * @param limit 결과 개수 제한
 */
export async function searchOverseaStocks(
  query: string,
  exchange: string = 'NAS',
  limit: number = 20
): Promise<StockInfo[]> {
  if (!query || query.trim().length === 0) return [];

  const searchLower = query.toLowerCase().trim();
  const results: StockInfo[] = [];

  // STOCK_CODES에서 해외 주식만 검색
  Object.entries(STOCK_CODES).forEach(([name, symbol]) => {
    // 6자리 숫자가 아니면 해외 주식
    if (!/^\d{6}$/.test(symbol)) {
      const nameLower = name.toLowerCase();
      const symbolLower = symbol.toLowerCase();

      if (nameLower.includes(searchLower) || symbolLower.includes(searchLower)) {
        results.push({
          symbol: symbol,
          name: name,
          exchange: detectExchange(symbol),
          type: 'EQUITY' as const,
        });
      }
    }
  });

  // 중복 제거 및 정렬
  const uniqueResults = Array.from(
    new Map(results.map(item => [item.symbol, item])).values()
  );

  // 검색어와 정확히 일치하는 것을 우선순위로
  uniqueResults.sort((a, b) => {
    const aExact = a.name.toLowerCase() === searchLower || a.symbol.toLowerCase() === searchLower;
    const bExact = b.name.toLowerCase() === searchLower || b.symbol.toLowerCase() === searchLower;

    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    // 시작하는 것을 우선순위로
    const aStarts = a.name.toLowerCase().startsWith(searchLower) || a.symbol.toLowerCase().startsWith(searchLower);
    const bStarts = b.name.toLowerCase().startsWith(searchLower) || b.symbol.toLowerCase().startsWith(searchLower);

    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    return 0;
  });

  return uniqueResults.slice(0, limit);
}

/**
 * 통합 종목 검색 (국내 + 해외)
 */
export async function searchAllStocks(query: string, limit: number = 20): Promise<StockInfo[]> {
  if (!query || query.trim().length === 0) return [];

  try {
    // 병렬로 국내/해외 검색
    const [koreanResults, overseaResults] = await Promise.all([
      searchKoreanStocks(query, Math.ceil(limit / 2)),
      searchOverseaStocks(query, 'NAS', Math.ceil(limit / 2)),
    ]);

    // 결과 합치기
    const combined = [...koreanResults, ...overseaResults];

    // 중복 제거
    const unique = Array.from(
      new Map(combined.map(item => [item.symbol, item])).values()
    );

    return unique.slice(0, limit);
  } catch (error) {
    console.error('통합 종목 검색 오류:', error);
    return [];
  }
}

/**
 * 기업 프로필 정보 인터페이스
 */
export interface CompanyProfile {
  symbol: string;
  name: string;
  exchange: string;
  currentPrice: number;
  currency: string;
  marketCap?: number;      // 시가총액
  per?: number;            // PER
  pbr?: number;            // PBR
  eps?: number;            // EPS
  high52w?: number;        // 52주 최고가
  low52w?: number;         // 52주 최저가
  volume?: number;         // 거래량
  avgVolume?: number;      // 평균 거래량
  dividend?: number;       // 배당금
  dividendYield?: number;  // 배당 수익률
}

/**
 * 국내 기업 프로필 조회
 */
export async function getKoreanCompanyProfile(stockCode: string): Promise<CompanyProfile | null> {
  try {
    const token = await getKISToken();

    const params = new URLSearchParams({
      fid_cond_mrkt_div_code: 'J',
      fid_input_iscd: stockCode,
    });

    const url = `${process.env.KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'authorization': `Bearer ${token}`,
        'appkey': process.env.KIS_APP_KEY!,
        'appsecret': process.env.KIS_APP_SECRET!,
        'tr_id': 'FHKST01010100',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const output = data.output;

    if (!output) {
      return null;
    }

    // 종목명 찾기
    let stockName = stockCode;
    for (const [name, code] of Object.entries(STOCK_CODES)) {
      if (code === stockCode) {
        stockName = name;
        break;
      }
    }

    return {
      symbol: stockCode,
      name: stockName,
      exchange: 'KRX',
      currentPrice: parseFloat(output.stck_prpr),
      currency: 'KRW',
      marketCap: parseFloat(output.hts_avls || 0),  // 시가총액
      per: parseFloat(output.per || 0),              // PER
      pbr: parseFloat(output.pbr || 0),              // PBR
      eps: parseFloat(output.eps || 0),              // EPS
      high52w: parseFloat(output.w52_hgpr || 0),     // 52주 최고가
      low52w: parseFloat(output.w52_lwpr || 0),      // 52주 최저가
      volume: parseInt(output.acml_vol || 0),        // 거래량
    };
  } catch (error) {
    console.error('국내 기업 프로필 조회 오류:', error);
    return null;
  }
}

/**
 * 해외 기업 프로필 조회
 */
export async function getOverseaCompanyProfile(
  symbol: string,
  exchange: string = 'NAS'
): Promise<CompanyProfile | null> {
  try {
    const token = await getKISToken();

    const params = new URLSearchParams({
      AUTH: '',
      EXCD: exchange,
      SYMB: symbol,
    });

    const url = `${process.env.KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price-detail?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'authorization': `Bearer ${token}`,
        'appkey': process.env.KIS_APP_KEY!,
        'appsecret': process.env.KIS_APP_SECRET!,
        'tr_id': 'HHDFS76200200',  // 해외주식 현재가 상세
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const output = data.output;

    if (!output) {
      return null;
    }

    return {
      symbol: symbol,
      name: output.name || symbol,
      exchange: exchange,
      currentPrice: parseFloat(output.last || output.curr_price || 0),
      currency: getCurrencyByExchange(exchange),
      marketCap: parseFloat(output.valx || 0),           // 시가총액
      per: parseFloat(output.per || 0),                  // PER
      pbr: parseFloat(output.pbr || 0),                  // PBR
      eps: parseFloat(output.eps || 0),                  // EPS
      high52w: parseFloat(output.h52w || output.w52_hgpr || 0),   // 52주 최고가
      low52w: parseFloat(output.l52w || output.w52_lwpr || 0),    // 52주 최저가
      volume: parseInt(output.tvol || output.volume || 0),        // 거래량
      avgVolume: parseInt(output.avol || 0),             // 평균 거래량
      dividend: parseFloat(output.t_xprc || 0),          // 배당금
      dividendYield: parseFloat(output.t_rate || 0),     // 배당 수익률
    };
  } catch (error) {
    console.error('해외 기업 프로필 조회 오류:', error);
    return null;
  }
}

/**
 * 통합 기업 프로필 조회 (국내/해외 자동 감지)
 */
export async function getCompanyProfile(ticker: string, exchange?: string): Promise<CompanyProfile | null> {
  // 종목코드 정규화
  let stockCode = ticker;
  if (ticker.includes('.')) {
    stockCode = ticker.split('.')[0];
  }

  // 거래소 자동 감지
  const detectedExchange = exchange || detectExchange(stockCode);

  // 한국 주식 (6자리 숫자)
  if (/^\d{6}$/.test(stockCode)) {
    return getKoreanCompanyProfile(stockCode);
  }

  // 해외 주식
  return getOverseaCompanyProfile(stockCode, detectedExchange);
}
