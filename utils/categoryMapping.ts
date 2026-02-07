/**
 * 주식 시장 카테고리 정의
 */
export type MarketCategory =
  | 'KOSPI'      // 코스피
  | 'KOSDAQ'     // 코스닥
  | 'NASDAQ'     // 나스닥
  | 'NYSE'       // 뉴욕증권거래소 (S&P500, 다우 포함)
  | 'NIKKEI'     // 니케이
  | 'HANGSENG'   // 항셍
  | 'CRYPTO'     // 암호화폐
  | 'OTHER';     // 기타

/**
 * 거래소 정보와 티커를 기반으로 카테고리를 결정합니다.
 * @param exchange 거래소 정보 (Yahoo Finance API에서 제공)
 * @param ticker 종목 티커
 * @returns MarketCategory
 */
export function getMarketCategory(exchange?: string, ticker?: string): MarketCategory {
  if (!exchange && !ticker) return 'OTHER';

  const exchangeUpper = (exchange || '').toUpperCase();
  const tickerUpper = (ticker || '').toUpperCase();

  // 암호화폐 (CRYPTO)
  if (exchangeUpper === 'CRYPTO') {
    return 'CRYPTO';
  }

  // 코스피 (KRX, Korean Stock Exchange)
  if (
    exchangeUpper.includes('KRX') ||
    exchangeUpper.includes('KOREA') ||
    exchangeUpper.includes('KSC') ||
    tickerUpper.endsWith('.KS')
  ) {
    return 'KOSPI';
  }

  // 코스닥 (KOSDAQ)
  if (
    exchangeUpper.includes('KOSDAQ') ||
    tickerUpper.endsWith('.KQ')
  ) {
    return 'KOSDAQ';
  }

  // 나스닥 (NASDAQ)
  if (
    exchangeUpper.includes('NASDAQ') ||
    exchangeUpper === 'NMS' ||
    exchangeUpper === 'NGM' ||
    exchangeUpper === 'NCM'
  ) {
    return 'NASDAQ';
  }

  // 뉴욕증권거래소 (NYSE) - S&P500, 다우 포함
  if (
    exchangeUpper.includes('NYSE') ||
    exchangeUpper === 'NYQ'
  ) {
    return 'NYSE';
  }

  // 니케이 (도쿄증권거래소)
  if (
    exchangeUpper.includes('TOKYO') ||
    exchangeUpper.includes('JPX') ||
    exchangeUpper.includes('TSE') ||
    tickerUpper.endsWith('.T')
  ) {
    return 'NIKKEI';
  }

  // 항셍 (홍콩증권거래소)
  if (
    exchangeUpper.includes('HONG KONG') ||
    exchangeUpper.includes('HKEX') ||
    exchangeUpper.includes('HKG') ||
    tickerUpper.endsWith('.HK')
  ) {
    return 'HANGSENG';
  }

  return 'OTHER';
}

/**
 * 카테고리 한글 이름
 */
export const CATEGORY_LABELS: Record<MarketCategory, string> = {
  KOSPI: '코스피',
  KOSDAQ: '코스닥',
  NASDAQ: '나스닥',
  NYSE: 'NYSE',
  NIKKEI: '니케이',
  HANGSENG: '항셍',
  CRYPTO: '코인',
  OTHER: '기타',
};

/**
 * 카테고리 설명
 */
export const CATEGORY_DESCRIPTIONS: Record<MarketCategory, string> = {
  KOSPI: '한국 유가증권시장',
  KOSDAQ: '한국 코스닥시장',
  NASDAQ: '미국 나스닥',
  NYSE: '미국 뉴욕증권거래소',
  NIKKEI: '일본 도쿄증권거래소',
  HANGSENG: '홍콩증권거래소',
  CRYPTO: '암호화폐',
  OTHER: '기타 시장',
};

/**
 * 모든 카테고리 목록
 */
export const ALL_CATEGORIES: MarketCategory[] = [
  'KOSPI',
  'KOSDAQ',
  'NASDAQ',
  'NYSE',
  'NIKKEI',
  'HANGSENG',
  'CRYPTO',
  'OTHER',
];
