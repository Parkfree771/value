import {
  getKISHistoricalStockPrice,
  getKISHistoricalOverseaStockPrice,
  detectExchange,
} from './kis';
import { formatReturn } from '@/utils/calculateReturn';

export interface HistoricalPrice {
  date: string;
  close: number;
  symbol: string;
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
  exchange?: string,
): Promise<HistoricalPrice | null> {
  try {
    console.log(`[HistoricalPrice] 과거 주가 조회 시작: ${ticker} at ${date}`);

    const detectedExchange = exchange || detectExchange(ticker);

    let stockCode = ticker;
    if (ticker.includes('.')) {
      stockCode = ticker.split('.')[0];
    }

    if (detectedExchange === 'CRYPTO') {
      console.log(`[HistoricalPrice] 암호화폐 과거 시세 미지원: ${ticker}`);
      return null;
    }

    if (/^\d{6}$/.test(stockCode)) {
      const data = await getKISHistoricalStockPrice(stockCode, date);
      if (!data) {
        console.error(`[HistoricalPrice] 과거 주가 없음: ${ticker} at ${date}`);
        return null;
      }
      return { date, close: data.close, symbol: stockCode };
    }

    const data = await getKISHistoricalOverseaStockPrice(stockCode, detectedExchange, date);
    if (!data) {
      console.error(`[HistoricalPrice] 과거 주가 없음: ${ticker} at ${date}`);
      return null;
    }
    return { date, close: data.close, symbol: stockCode };
  } catch (error) {
    console.error(`[HistoricalPrice] 과거 주가 조회 실패 (${ticker} at ${date}):`, error);
    return null;
  }
}
