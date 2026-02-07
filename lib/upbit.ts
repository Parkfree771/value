/**
 * 업비트(Upbit) API 통합 모듈
 * 서버 전용 - 암호화폐 시세 조회
 * API키 불필요 (무료 공개 API)
 */

import type { CompanyProfile } from './kis';
import { CRYPTO_COINS } from './cryptoCoins';

interface UpbitTickerResponse {
  market: string;
  trade_price: number;          // 현재가
  signed_change_price: number;  // 부호 있는 변화량
  signed_change_rate: number;   // 부호 있는 변화율
  high_price: number;           // 당일 고가
  low_price: number;            // 당일 저가
  acc_trade_volume_24h: number; // 24시간 누적 거래량
  acc_trade_price_24h: number;  // 24시간 누적 거래대금
  opening_price: number;        // 시가
}

export interface UpbitPriceResult {
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  tradeValue24h: number;
  currency: string;
}

/**
 * 업비트 API로 암호화폐 현재가 조회
 * @param symbol 코인 심볼 (예: BTC, ETH)
 * @returns 가격 정보 또는 null
 */
export async function getUpbitPrice(symbol: string): Promise<UpbitPriceResult | null> {
  try {
    const market = `KRW-${symbol.toUpperCase()}`;
    const url = `https://api.upbit.com/v1/ticker?markets=${market}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Upbit] API 오류: ${response.status} for ${symbol}`);
      return null;
    }

    const data: UpbitTickerResponse[] = await response.json();

    if (!data || data.length === 0) {
      console.warn(`[Upbit] 데이터 없음: ${symbol}`);
      return null;
    }

    const ticker = data[0];

    return {
      price: ticker.trade_price,
      change: ticker.signed_change_price,
      changePercent: ticker.signed_change_rate * 100,
      high: ticker.high_price,
      low: ticker.low_price,
      volume: ticker.acc_trade_volume_24h,
      tradeValue24h: ticker.acc_trade_price_24h,
      currency: 'KRW',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[Upbit] 타임아웃: ${symbol}`);
    } else {
      console.error(`[Upbit] 오류 (${symbol}):`, error);
    }
    return null;
  }
}

/**
 * getCompanyProfile()과 호환되는 형태로 암호화폐 프로필 반환
 */
export async function getUpbitCryptoProfile(symbol: string): Promise<CompanyProfile | null> {
  const upperSymbol = symbol.toUpperCase();
  const coin = CRYPTO_COINS[upperSymbol];

  if (!coin) {
    console.warn(`[Upbit] 지원하지 않는 코인: ${symbol}`);
    return null;
  }

  const priceData = await getUpbitPrice(upperSymbol);

  if (!priceData) {
    return null;
  }

  return {
    symbol: upperSymbol,
    name: coin.nameKr,
    exchange: 'CRYPTO',
    currentPrice: priceData.price,
    currency: 'KRW',
    per: undefined,
    pbr: undefined,
    eps: undefined,
    high52w: undefined,
    low52w: undefined,
    volume: priceData.volume,
    // 추가 필드 (crypto 전용)
    change24h: priceData.change,
    changePercent24h: priceData.changePercent,
    tradeValue24h: priceData.tradeValue24h,
  } as CompanyProfile & {
    change24h: number;
    changePercent24h: number;
    tradeValue24h: number;
  };
}
