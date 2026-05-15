import {
  getKISStockPrice,
  getKISOverseaStockPrice,
  getKISHistoricalStockPrice,
  getKISHistoricalOverseaStockPrice,
  detectExchange
} from './kis';
import { getLatestPrices, getCurrencyFromExchange } from './priceCache';
import {
  calculateReturn as calculateReturnUtil,
  getReturnColorClass,
  formatReturn
} from '@/utils/calculateReturn';

export interface StockQuote {
  symbol: string;
  price: number;
  currency: string;
  marketCap?: number;
  regularMarketChangePercent?: number;
}

export interface HistoricalPrice {
  date: string;
  close: number;
  symbol: string;
}

/**
 * Supabase current_prices 캐시(priceCache)에서 주가를 가져옵니다.
 */
async function getPriceFromJSON(ticker: string): Promise<StockQuote | null> {
  try {
    const cachedPrices = await getLatestPrices();

    const stockCode = ticker.includes('.') ? ticker.split('.')[0] : ticker;
    const tickerUpper = stockCode.toUpperCase();
    const priceData = cachedPrices[tickerUpper];

    if (priceData && priceData.currentPrice) {
      const currency = getCurrencyFromExchange(priceData.exchange);
      console.log(`[StockPrice] JSON hit: ${tickerUpper} = ${priceData.currentPrice} ${currency}`);
      return {
        symbol: tickerUpper,
        price: priceData.currentPrice,
        currency,
        marketCap: undefined,
        regularMarketChangePercent: undefined,
      };
    }

    console.log(`[StockPrice] JSON miss: ${tickerUpper}`);
    return null;
  } catch (error) {
    console.error(`[StockPrice] Error fetching ${ticker} from JSON:`, error);
    return null;
  }
}

/**
 * 실시간 주가 정보를 가져옵니다.
 * JSON 캐시를 먼저 확인하고, 없으면 KIS API를 호출합니다.
 * @param ticker 주식 티커 심볼 (예: '005930', 'AAPL', 'TSLA')
 * @param exchange 거래소 코드 (선택사항, 예: 'NAS', 'NYS')
 * @param _collectionName 미사용 (하위 호환성)
 * @returns 주가 정보
 */
export async function getCurrentStockPrice(
  ticker: string,
  exchange?: string,
  _collectionName: string = 'stock_data'
): Promise<StockQuote | null> {
  try {
    console.log(`[StockPrice] 주가 조회 시작: ${ticker}`);

    // 1. JSON 캐시 먼저 확인
    const cachedPrice = await getPriceFromJSON(ticker);
    if (cachedPrice) {
      return cachedPrice;
    }

    // 2. 캐시 미스 - API 직접 호출
    console.log(`[StockPrice] JSON 캐시 미스, API 호출: ${ticker}`);

    // 거래소 자동 감지 (접미사 제거 전에 먼저 감지)
    const detectedExchange = exchange || detectExchange(ticker);

    // 종목코드 정규화 (접미사 제거)
    let stockCode = ticker;
    if (ticker.includes('.')) {
      stockCode = ticker.split('.')[0];
    }

    // 암호화폐 (업비트 API)
    if (detectedExchange === 'CRYPTO') {
      const { getUpbitPrice } = await import('./upbit');
      const cryptoData = await getUpbitPrice(stockCode);
      if (!cryptoData) {
        console.error(`[StockPrice] 암호화폐 가격 조회 실패: ${ticker}`);
        return null;
      }
      return {
        symbol: stockCode.toUpperCase(),
        price: cryptoData.price,
        currency: 'KRW',
        marketCap: undefined,
        regularMarketChangePercent: cryptoData.changePercent,
      };
    }

    // 한국 주식 (6자리 숫자)
    if (/^\d{6}$/.test(stockCode)) {
      console.log(`[StockPrice] 국내 주식 조회 (KIS API): ${stockCode}`);
      const data = await getKISStockPrice(stockCode);

      if (!data) {
        console.error(`[StockPrice] 주가 정보를 찾을 수 없습니다: ${ticker}`);
        return null;
      }

      const result: StockQuote = {
        symbol: stockCode,
        price: data.price,
        currency: 'KRW',
        marketCap: undefined,
        regularMarketChangePercent: data.changePercent,
      };

      console.log(`[StockPrice] 국내 주가 조회 성공:`, result);
      return result;
    }

    // 해외 주식 (AAPL, TSLA 등)
    console.log(`[StockPrice] 해외 주식 조회 (KIS API): ${stockCode} (거래소: ${detectedExchange})`);
    const data = await getKISOverseaStockPrice(stockCode, detectedExchange);

    if (!data) {
      console.error(`[StockPrice] 주가 정보를 찾을 수 없습니다: ${ticker}`);
      return null;
    }

    const result: StockQuote = {
      symbol: stockCode,
      price: data.price,
      currency: data.currency,
      marketCap: undefined,
      regularMarketChangePercent: data.changePercent,
    };

    console.log(`[StockPrice] 해외 주가 조회 성공:`, result);
    return result;
  } catch (error) {
    console.error(`[StockPrice] 주가 조회 실패 (${ticker}):`, error);
    return null;
  }
}

/**
 * 수익률을 계산합니다.
 * @deprecated utils/calculateReturn.ts의 calculateReturn 사용 권장
 */
export const calculateReturnRate = calculateReturnUtil;

/**
 * @deprecated utils/calculateReturn.ts의 getReturnColorClass 사용 권장
 */
export const getReturnRateColor = getReturnColorClass;

/**
 * 수익률에 따른 배경색 클래스를 반환합니다.
 * @param returnRate 수익률 (%)
 * @returns Tailwind CSS 배경색 클래스
 */
export function getReturnRateBackground(returnRate: number): string {
  if (returnRate > 0) return 'bg-red-50 dark:bg-red-900/20';
  if (returnRate < 0) return 'bg-blue-50 dark:bg-blue-900/20';
  return 'bg-gray-50 dark:bg-gray-900/20';
}

/**
 * @deprecated utils/calculateReturn.ts의 formatReturn 사용 권장
 */
export const formatReturnRate = formatReturn;

/**
 * 특정 날짜의 주식 종가를 가져옵니다.
 *
 * @param ticker 주식 티커 심볼 (예: '005930', 'AAPL')
 * @param date 조회할 날짜 (YYYY-MM-DD 형식)
 * @param exchange (선택) 거래소 코드
 * @returns 해당 날짜의 종가 정보
 */
export async function getHistoricalPrice(
  ticker: string,
  date: string,
  exchange?: string
): Promise<HistoricalPrice | null> {
  try {
    console.log(`[HistoricalPrice] 과거 주가 조회 시작: ${ticker} at ${date}`);

    // 거래소 자동 감지 (접미사 제거 전에 먼저 감지)
    const detectedExchange = exchange || detectExchange(ticker);

    // 종목코드 정규화 (접미사 제거)
    let stockCode = ticker;
    if (ticker.includes('.')) {
      stockCode = ticker.split('.')[0];
    }

    // 암호화폐 (과거가 미지원)
    if (detectedExchange === 'CRYPTO') {
      console.log(`[HistoricalPrice] 암호화폐 과거 시세 미지원: ${ticker}`);
      return null;
    }

    // 한국 주식 (6자리 숫자)
    if (/^\d{6}$/.test(stockCode)) {
      console.log(`[HistoricalPrice] 국내 주식 과거 조회: ${stockCode} at ${date}`);
      const data = await getKISHistoricalStockPrice(stockCode, date);

      if (!data) {
        console.error(`[HistoricalPrice] 과거 주가 정보를 찾을 수 없습니다: ${ticker} at ${date}`);
        return null;
      }

      const result: HistoricalPrice = {
        date: date,
        close: data.close,
        symbol: stockCode,
      };

      console.log(`[HistoricalPrice] 국내 과거 주가 조회 성공:`, result);
      return result;
    }

    // 해외 주식
    console.log(`[HistoricalPrice] 해외 주식 과거 조회: ${stockCode} at ${date} (거래소: ${detectedExchange})`);
    const data = await getKISHistoricalOverseaStockPrice(stockCode, detectedExchange, date);

    if (!data) {
      console.error(`[HistoricalPrice] 과거 주가 정보를 찾을 수 없습니다: ${ticker} at ${date}`);
      return null;
    }

    const result: HistoricalPrice = {
      date: date,
      close: data.close,
      symbol: stockCode,
    };

    console.log(`[HistoricalPrice] 해외 과거 주가 조회 성공:`, result);
    return result;
  } catch (error) {
    console.error(`[HistoricalPrice] 과거 주가 조회 실패 (${ticker} at ${date}):`, error);
    return null;
  }
}
