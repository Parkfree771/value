import { useState, useEffect } from 'react';

interface StockPriceData {
  currentPrice: number | null;
  currency: string | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * 실시간 주식 가격을 가져오는 커스텀 훅
 * @param ticker 주식 티커 심볼 (예: NKE, AAPL)
 * @param basePrice 기준 가격 (발언 시점 가격)
 * @param actionDirection 매수/매도 방향 (LONG or SHORT)
 * @param refreshInterval 갱신 주기 (ms, 기본값: 60000 = 1분)
 */
export function useStockPrice(
  ticker: string | undefined,
  basePrice: number | undefined,
  actionDirection: 'LONG' | 'SHORT' = 'LONG',
  refreshInterval: number = 60000
): StockPriceData & { returnRate: number | null } {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!ticker) {
      setLoading(false);
      return;
    }

    const fetchPrice = async () => {
      try {
        setLoading(true);
        setError(null);

        // Next.js API route를 통해 주식 가격 가져오기
        const response = await fetch(`/api/stock-price?ticker=${ticker}`);

        if (!response.ok) {
          throw new Error(`API 요청 실패: ${response.status}`);
        }

        const data = await response.json();

        if (data.price) {
          setCurrentPrice(data.price);
          setCurrency(data.currency || 'USD');
          setLastUpdated(new Date());
        } else {
          throw new Error('가격 데이터를 찾을 수 없습니다');
        }
      } catch (err) {
        // 에러 발생 시 기본 가격 사용 (조용히 처리)
        if (basePrice) {
          setCurrentPrice(basePrice);
          setLastUpdated(new Date());
        }
        // 콘솔에만 로그 남기고 사용자에게는 표시 안함
        console.warn('주식 가격 업데이트 실패, 기본 가격 사용:', ticker);
      } finally {
        setLoading(false);
      }
    };

    // 초기 로드
    fetchPrice();

    // 주기적으로 가격 업데이트
    const interval = setInterval(fetchPrice, refreshInterval);

    return () => clearInterval(interval);
  }, [ticker, basePrice, refreshInterval]);

  // 수익률 계산
  // LONG: 가격 상승 시 +수익 (현재가 - 기준가)
  // SHORT: 가격 하락 시 +수익 (기준가 - 현재가)
  const returnRate =
    currentPrice !== null && basePrice
      ? actionDirection === 'LONG'
        ? ((currentPrice - basePrice) / basePrice) * 100
        : ((basePrice - currentPrice) / basePrice) * 100
      : null;

  return {
    currentPrice,
    currency,
    loading,
    error,
    lastUpdated,
    returnRate,
  };
}
