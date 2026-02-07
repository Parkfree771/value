/**
 * 암호화폐 코인 목록 및 유틸리티
 * 클라이언트/서버 공용 모듈
 */

import type { GlobalStock } from './stockSearchIndex';

export interface CryptoCoin {
  name: string;
  nameKr: string;
}

/**
 * 지원하는 암호화폐 목록 (심볼 → 정보)
 */
export const CRYPTO_COINS: Record<string, CryptoCoin> = {
  BTC: { name: 'Bitcoin', nameKr: '비트코인' },
  ETH: { name: 'Ethereum', nameKr: '이더리움' },
  XRP: { name: 'Ripple', nameKr: '리플' },
  SOL: { name: 'Solana', nameKr: '솔라나' },
  DOGE: { name: 'Dogecoin', nameKr: '도지코인' },
  ADA: { name: 'Cardano', nameKr: '카르다노' },
  AVAX: { name: 'Avalanche', nameKr: '아발란체' },
  DOT: { name: 'Polkadot', nameKr: '폴카닷' },
  LINK: { name: 'Chainlink', nameKr: '체인링크' },
  TRX: { name: 'TRON', nameKr: '트론' },
  SHIB: { name: 'Shiba Inu', nameKr: '시바이누' },
  ETC: { name: 'Ethereum Classic', nameKr: '이더리움클래식' },
  ATOM: { name: 'Cosmos', nameKr: '코스모스' },
  NEAR: { name: 'NEAR Protocol', nameKr: '니어프로토콜' },
  MATIC: { name: 'Polygon', nameKr: '폴리곤' },
};

/**
 * 빠른 조회용 심볼 Set
 */
export const CRYPTO_SYMBOLS: Set<string> = new Set(Object.keys(CRYPTO_COINS));

/**
 * 심볼이 암호화폐인지 확인
 */
export function isCryptoSymbol(symbol: string): boolean {
  return CRYPTO_SYMBOLS.has(symbol.toUpperCase());
}

/**
 * 코인 아이콘 이미지 URL (CoinCap CDN)
 */
export function getCryptoImageUrl(symbol: string): string {
  return `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`;
}

/**
 * 검색 인덱스용 GlobalStock[] 형태로 변환
 */
export function getCryptoStocksForIndex(): GlobalStock[] {
  return Object.entries(CRYPTO_COINS).map(([symbol, coin]) => ({
    symbol,
    name: coin.name,
    nameKr: coin.nameKr,
    exchange: 'CRYPTO',
    country: 'CRYPTO',
  }));
}
