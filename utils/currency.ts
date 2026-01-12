/**
 * 통화 관련 유틸리티 함수
 */

/**
 * 거래소, 카테고리, 티커 정보를 기반으로 통화를 추론합니다.
 * @param options 추론에 사용할 정보
 * @returns 추론된 통화 코드 (기본값: USD)
 */
export function inferCurrency(options: {
  exchange?: string;
  category?: string;
  ticker?: string;
  stockData?: { currency?: string };
}): string {
  const { exchange, category, ticker, stockData } = options;

  // stockData에 currency가 있으면 사용
  if (stockData?.currency) {
    return stockData.currency;
  }

  // exchange 기반 추론 (가장 정확)
  if (exchange) {
    const exchangeUpper = exchange.toUpperCase();
    // 한국
    if (['KRX', 'KOSPI', 'KOSDAQ', 'KSC'].includes(exchangeUpper)) return 'KRW';
    // 일본
    if (['TYO', 'JPX', 'TSE'].includes(exchangeUpper)) return 'JPY';
    // 미국
    if (['NAS', 'NYS', 'NYSE', 'NASDAQ', 'AMEX'].includes(exchangeUpper)) return 'USD';
    // 홍콩
    if (['HKG', 'HKEX'].includes(exchangeUpper)) return 'HKD';
    // 중국
    if (['SHH', 'SHZ', 'SSE', 'SZSE'].includes(exchangeUpper)) return 'CNY';
    // 영국
    if (['LON', 'LSE'].includes(exchangeUpper)) return 'GBP';
    // 유럽
    if (['FRA', 'PAR', 'AMS'].includes(exchangeUpper)) return 'EUR';
  }

  // category 기반 추론
  if (category) {
    const categoryUpper = category.toUpperCase();
    if (categoryUpper.includes('KOSPI') || categoryUpper.includes('KOSDAQ')) return 'KRW';
    if (categoryUpper.includes('NIKKEI')) return 'JPY';
    if (categoryUpper.includes('NYSE') || categoryUpper.includes('NASDAQ')) return 'USD';
    if (categoryUpper.includes('HANGSENG')) return 'HKD';
  }

  // 티커 suffix 기반 추론
  if (ticker) {
    if (ticker.endsWith('.T')) return 'JPY';
    if (ticker.endsWith('.KS') || ticker.endsWith('.KQ')) return 'KRW';
    if (ticker.endsWith('.L')) return 'GBP';
    if (ticker.endsWith('.HK')) return 'HKD';
    if (ticker.endsWith('.SS') || ticker.endsWith('.SZ')) return 'CNY';
  }

  return 'USD'; // 기본값
}

/**
 * 통화 코드에 해당하는 기호를 반환합니다.
 * @param currency 통화 코드 (예: USD, KRW, JPY)
 * @returns 통화 기호 (예: $, ₩, ¥)
 */
export function getCurrencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'USD': return '$';
    case 'JPY': return '¥';
    case 'KRW': return '₩';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'CNY':
    case 'CNH': return '¥';
    case 'HKD': return 'HK$';
    default: return '$';
  }
}
