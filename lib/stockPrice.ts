import yahooFinance from 'yahoo-finance2';

export interface StockQuote {
  symbol: string;
  price: number;
  currency: string;
  marketCap?: number;
  regularMarketChangePercent?: number;
}

/**
 * Yahoo Finance API를 사용하여 실시간 주가 정보를 가져옵니다.
 * @param ticker 주식 티커 심볼 (예: 'AAPL', '005930.KS')
 * @returns 주가 정보
 */
export async function getCurrentStockPrice(ticker: string): Promise<StockQuote | null> {
  try {
    // 한국 주식의 경우 .KS 또는 .KQ 접미사 추가
    let formattedTicker = ticker;
    if (/^\d{6}$/.test(ticker)) {
      // 6자리 숫자인 경우 한국 주식으로 간주
      formattedTicker = `${ticker}.KS`; // 코스피
    }

    const quote: any = await yahooFinance.quote(formattedTicker);

    if (!quote || !quote.regularMarketPrice) {
      console.error(`주가 정보를 찾을 수 없습니다: ${ticker}`);
      return null;
    }

    return {
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      currency: quote.currency || 'KRW',
      marketCap: quote.marketCap,
      regularMarketChangePercent: quote.regularMarketChangePercent,
    };
  } catch (error) {
    console.error(`주가 조회 실패 (${ticker}):`, error);

    // .KS로 실패한 경우 .KQ 시도 (코스닥)
    if (ticker.endsWith('.KS')) {
      try {
        const kosdaqTicker = ticker.replace('.KS', '.KQ');
        const quote: any = await yahooFinance.quote(kosdaqTicker);

        if (quote && quote.regularMarketPrice) {
          return {
            symbol: quote.symbol,
            price: quote.regularMarketPrice,
            currency: quote.currency || 'KRW',
            marketCap: quote.marketCap,
            regularMarketChangePercent: quote.regularMarketChangePercent,
          };
        }
      } catch (kosdaqError) {
        console.error(`코스닥 조회도 실패 (${ticker}):`, kosdaqError);
      }
    }

    return null;
  }
}

/**
 * 수익률을 계산합니다.
 * @param initialPrice 초기 가격 (매수/매도 시점)
 * @param currentPrice 현재 가격
 * @param positionType 포지션 타입 ('long' 또는 'short')
 * @returns 수익률 (%)
 */
export function calculateReturnRate(
  initialPrice: number,
  currentPrice: number,
  positionType: 'long' | 'short' = 'long'
): number {
  if (!initialPrice || initialPrice === 0) {
    return 0;
  }

  const returnRate = ((currentPrice - initialPrice) / initialPrice) * 100;

  // 숏 포지션의 경우 수익률 반전
  return positionType === 'short' ? -returnRate : returnRate;
}

/**
 * 리포트의 수익률을 업데이트합니다.
 * @param ticker 주식 티커
 * @param initialPrice 작성 시점 주가
 * @param positionType 포지션 타입
 * @returns 업데이트된 주가 및 수익률 정보
 */
export async function updateReportReturnRate(
  ticker: string,
  initialPrice: number,
  positionType: 'long' | 'short' = 'long'
): Promise<{
  currentPrice: number;
  returnRate: number;
  currency: string;
  stockData: any;
} | null> {
  const stockQuote = await getCurrentStockPrice(ticker);

  if (!stockQuote) {
    return null;
  }

  const returnRate = calculateReturnRate(
    initialPrice,
    stockQuote.price,
    positionType
  );

  return {
    currentPrice: stockQuote.price,
    returnRate: parseFloat(returnRate.toFixed(2)),
    currency: stockQuote.currency,
    stockData: {
      currency: stockQuote.currency,
      marketCap: stockQuote.marketCap,
      regularMarketChangePercent: stockQuote.regularMarketChangePercent,
    },
  };
}

/**
 * 수익률에 따른 색상 클래스를 반환합니다.
 * @param returnRate 수익률 (%)
 * @returns Tailwind CSS 색상 클래스
 */
export function getReturnRateColor(returnRate: number): string {
  if (returnRate > 0) return 'text-red-600 dark:text-red-400'; // 한국에서는 빨간색이 상승
  if (returnRate < 0) return 'text-blue-600 dark:text-blue-400'; // 파란색이 하락
  return 'text-gray-600 dark:text-gray-400';
}

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
 * 수익률을 포맷팅합니다.
 * @param returnRate 수익률 (%)
 * @returns 포맷팅된 문자열 (예: '+24.5%', '-12.3%')
 */
export function formatReturnRate(returnRate: number): string {
  const sign = returnRate > 0 ? '+' : '';
  return `${sign}${returnRate.toFixed(2)}%`;
}
