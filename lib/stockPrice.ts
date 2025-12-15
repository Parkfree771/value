import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

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
    console.log(`[StockPrice] 주가 조회 시작: ${ticker}`);

    // 한국 주식의 경우 .KS 또는 .KQ 접미사 추가
    let formattedTicker = ticker;
    if (/^\d{6}$/.test(ticker)) {
      // 6자리 숫자인 경우 한국 주식으로 간주
      formattedTicker = `${ticker}.KS`; // 코스피
      console.log(`[StockPrice] 6자리 티커 감지, .KS 추가: ${formattedTicker}`);
    }

    console.log(`[StockPrice] Yahoo Finance API 호출 중: ${formattedTicker}`);
    const quote: any = await yahooFinance.quote(formattedTicker);
    console.log(`[StockPrice] API 응답:`, {
      symbol: quote?.symbol,
      price: quote?.regularMarketPrice,
      currency: quote?.currency,
      hasData: !!quote
    });

    if (!quote || !quote.regularMarketPrice) {
      console.error(`[StockPrice] 주가 정보를 찾을 수 없습니다: ${ticker} (응답: ${JSON.stringify(quote)})`);
      return null;
    }

    const result = {
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      currency: quote.currency || 'KRW',
      marketCap: quote.marketCap,
      regularMarketChangePercent: quote.regularMarketChangePercent,
    };
    console.log(`[StockPrice] 주가 조회 성공:`, result);
    return result;
  } catch (error) {
    console.error(`[StockPrice] 주가 조회 실패 (${ticker}):`, error);

    // .KS로 실패한 경우 .KQ 시도 (코스닥)
    if (ticker.endsWith('.KS')) {
      try {
        const kosdaqTicker = ticker.replace('.KS', '.KQ');
        console.log(`[StockPrice] 코스닥 티커로 재시도: ${kosdaqTicker}`);
        const quote: any = await yahooFinance.quote(kosdaqTicker);

        if (quote && quote.regularMarketPrice) {
          const result = {
            symbol: quote.symbol,
            price: quote.regularMarketPrice,
            currency: quote.currency || 'KRW',
            marketCap: quote.marketCap,
            regularMarketChangePercent: quote.regularMarketChangePercent,
          };
          console.log(`[StockPrice] 코스닥 조회 성공:`, result);
          return result;
        }
      } catch (kosdaqError) {
        console.error(`[StockPrice] 코스닥 조회도 실패 (${ticker}):`, kosdaqError);
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
  console.log(`[UpdateReturnRate] 수익률 업데이트 시작:`, {
    ticker,
    initialPrice,
    positionType
  });

  // initialPrice 유효성 검증
  if (!initialPrice || initialPrice <= 0) {
    console.error(`[UpdateReturnRate] 유효하지 않은 initialPrice: ${initialPrice}`);
    return null;
  }

  const stockQuote = await getCurrentStockPrice(ticker);

  if (!stockQuote) {
    console.error(`[UpdateReturnRate] 주가 조회 실패 - ticker: ${ticker}`);
    return null;
  }

  const returnRate = calculateReturnRate(
    initialPrice,
    stockQuote.price,
    positionType
  );

  const result = {
    currentPrice: stockQuote.price,
    returnRate: parseFloat(returnRate.toFixed(2)),
    currency: stockQuote.currency,
    stockData: {
      currency: stockQuote.currency,
      marketCap: stockQuote.marketCap,
      regularMarketChangePercent: stockQuote.regularMarketChangePercent,
    },
  };

  console.log(`[UpdateReturnRate] 수익률 계산 완료:`, result);
  return result;
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
