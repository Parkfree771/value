'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { stockSearchIndex, type GlobalStock, type Stock } from '@/lib/stockSearchIndex';
import { getCryptoStocksForIndex, getCryptoImageUrl } from '@/lib/cryptoCoins';
import type { StockData } from '@/types/stock';
import { shortStockName, exchangeLabel } from '@/utils/reportDisplay';

interface GlobalStocksData {
  stocks: GlobalStock[];
}

// 모듈 레벨 캐시 (컴포넌트 재렌더링에도 유지)
let cachedStocksData: GlobalStock[] | null = null;
let loadPromise: Promise<GlobalStock[]> | null = null;
let isIndexBuilt = false;

async function loadGlobalStocks(): Promise<GlobalStock[]> {
  if (cachedStocksData && isIndexBuilt) {
    return cachedStocksData;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = fetch('/data/global-stocks.json')
    .then(res => res.json())
    .then((data: GlobalStocksData) => {
      // 코인 데이터를 주식 앞에 추가
      const cryptoStocks = getCryptoStocksForIndex();
      const allStocks = [...cryptoStocks, ...data.stocks];
      cachedStocksData = allStocks;
      // 인덱스 빌드
      stockSearchIndex.build(allStocks);
      isIndexBuilt = true;
      return allStocks;
    })
    .catch(err => {
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}

// 인덱스 기반 검색 (O(1) 조회)
function searchStocksLocal(query: string, limit: number = 20): Stock[] {
  if (!stockSearchIndex.ready) {
    return [];
  }
  return stockSearchIndex.search(query, limit);
}

interface StockSearchInputProps {
  onStockSelect: (stockData: StockData) => void;
  selectedStock?: StockData | null;
  /** 바깥에서 단계 제목을 붙이면 기본 라벨을 숨긴다 */
  hideLabel?: boolean;
}

const StockSearchInput = memo(function StockSearchInput({ onStockSelect, selectedStock, hideLabel = false }: StockSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // 검색 결과 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 로컬 검색 (디바운스 + 인덱스 기반 O(1) 조회)
  useEffect(() => {
    const searchStocks = async () => {
      if (query.length < 1) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setIsLoading(true);
      try {
        // 인덱스가 준비되지 않았으면 데이터 로드
        if (!isIndexBuilt) {
          await loadGlobalStocks();
        }

        // 인덱스 기반 검색 (O(1))
        const searchResults = searchStocksLocal(query, 20);
        setResults(searchResults);
        setShowResults(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    // 인덱스가 준비되어 있으면 디바운스 줄임 (50ms)
    const debounceTime = isIndexBuilt ? 50 : 150;
    const debounceTimer = setTimeout(searchStocks, debounceTime);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  // 주식 선택 시 상세 데이터 가져오기
  const handleStockSelect = async (stock: Stock) => {
    setQuery('');
    setShowResults(false);
    setIsLoading(true);

    try {
      // API 호출해서 정확한 정보 가져오기
      const url = `/api/stocks/${stock.symbol}?exchange=${encodeURIComponent(stock.exchange)}`;
      console.log(`[StockSearchInput] API 호출: ${url}`);
      const response = await fetch(url);
      const stockData = await response.json();

      // API 응답 에러 체크
      if (!response.ok) {
        alert(stockData.error || `${stock.symbol} 주가 데이터를 가져올 수 없습니다.`);
        return;
      }

      // 주가 데이터 유효성 체크
      if (!stockData.currentPrice || stockData.currentPrice === 0) {
        alert(`${stock.symbol}의 주가 정보가 없습니다. 다른 종목을 선택해주세요.`);
        return;
      }

      // 자동완성에서 표시된 기업명 그대로 사용 (한글명이 있으면 한글, 없으면 영어)
      const displayName = ((stock.exchange === 'KRX' || stock.exchange === 'CRYPTO') && stock.nameKr) ? stock.nameKr : stock.name;

      console.log('Stock data loaded:', { ...stockData, name: displayName });
      onStockSelect({
        ...stockData,
        name: displayName,
      });
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
      alert(`주가 조회 중 오류가 발생했습니다: ${stock.symbol}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleStockSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        break;
    }
  };

  // 통화 심볼 변환 함수
  const getCurrencySymbol = (currency: string): string => {
    switch (currency.toUpperCase()) {
      case 'USD': return '$';
      case 'JPY': return '¥';
      case 'KRW': return '₩';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'CNY': return '¥';
      case 'HKD': return 'HK$';
      default: return currency;
    }
  };

  // 숫자 포맷팅 (천 단위 콤마)
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
  };

  return (
    <div ref={searchRef} className="relative w-full">
      {!hideLabel && (
        <label className="pixel-label mb-2">
          종목 검색 *
        </label>
      )}

      {selectedStock ? (
        // 선택된 종목 — 이름 · 티커·거래소 · 지금 가격(= 작성가로 박제) · 지표
        <div className="border-y-2 border-[var(--theme-border)] py-3 sm:py-4">
          <div className="flex items-start gap-3">
            {selectedStock.exchange === 'CRYPTO' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getCryptoImageUrl(selectedStock.symbol)}
                alt=""
                className="w-10 h-10 rounded-full flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="headline text-xl sm:text-2xl leading-tight break-keep">{shortStockName(selectedStock.name, selectedStock.symbol)}</p>
              <p className="mt-0.5 text-xs text-[var(--theme-ink-soft)]">
                <span className="font-mono">{selectedStock.symbol}</span>
                {' · '}
                {exchangeLabel(selectedStock.exchange)}
                {selectedStock.sector && <> · {selectedStock.sector}</>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStockSelect(null as any)}
              className="flex-shrink-0 text-sm font-bold underline underline-offset-4 hover:text-[var(--theme-ink-soft)]"
            >
              변경
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <p className="text-[11px] text-[var(--theme-ink-soft)]">지금 가격 · 이 가격이 작성가로 기록돼요</p>
              <p className="font-mono text-2xl sm:text-3xl font-black tabular-nums leading-tight">
                {getCurrencySymbol(selectedStock.currency)}{formatNumber(selectedStock.currentPrice)}
              </p>
            </div>
            {selectedStock.exchange === 'CRYPTO' ? (
              selectedStock.changePercent24h !== undefined && (
                <p className="text-xs text-[var(--theme-ink-soft)] tabular-nums">
                  24시간{' '}
                  <span className={`font-bold ${selectedStock.changePercent24h >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}`}>
                    {selectedStock.changePercent24h >= 0 ? '+' : ''}{selectedStock.changePercent24h.toFixed(2)}%
                  </span>
                </p>
              )
            ) : (
              <dl className="flex gap-4 text-xs tabular-nums">
                {[
                  ['PER', selectedStock.per && selectedStock.per > 0 ? selectedStock.per.toFixed(2) : null],
                  ['PBR', selectedStock.pbr && selectedStock.pbr > 0 ? selectedStock.pbr.toFixed(2) : null],
                  ['EPS', selectedStock.eps && selectedStock.eps !== 0 ? selectedStock.eps.toFixed(2) : null],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <dt className="text-[var(--theme-ink-soft)]">{k}</dt>
                    <dd className="font-bold">{v ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="기업명 또는 티커 입력 (예: 삼성전자, 나이키, AAPL)"
              aria-label="종목 검색"
              className="pixel-input !py-3"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--theme-border-muted)] border-t-[var(--theme-border)]"></div>
              </div>
            )}
          </div>

          {/* 검색 결과 드롭다운 */}
          {showResults && results.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-2 bg-[var(--theme-bg-card)]
                          border border-[var(--theme-border-muted)] rounded-sm
                          max-h-[50vh] sm:max-h-96 overflow-y-auto">
              {results.map((stock, index) => (
                <button
                  key={`${stock.symbol}-${stock.exchange}-${index}`}
                  onClick={() => handleStockSelect(stock)}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/10
                            transition-colors border-b border-[var(--theme-border-muted)] last:border-b-0
                            ${index === selectedIndex ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {stock.exchange === 'CRYPTO' && (
                        <img
                          src={getCryptoImageUrl(stock.symbol)}
                          alt={stock.symbol}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                          {(stock.exchange === 'KRX' || stock.exchange === 'CRYPTO') && stock.nameKr ? stock.nameKr : stock.name}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {stock.symbol}
                          {(stock.exchange === 'KRX' || stock.exchange === 'CRYPTO') && stock.nameKr && <span className="ml-1.5 sm:ml-2 text-gray-400">· {stock.name}</span>}
                        </div>
                      </div>
                    </div>
                    {stock.exchange === 'CRYPTO' ? (
                      <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-medium flex-shrink-0 ml-2">
                        코인
                      </span>
                    ) : (
                      <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                        {stock.exchange}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 검색 결과 없음 */}
          {showResults && !isLoading && query.length > 0 && results.length === 0 && (
            <div className="absolute z-50 left-0 right-0 mt-2 bg-[var(--theme-bg-card)]
                          border border-[var(--theme-border-muted)] rounded-sm p-4">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
                검색 결과가 없습니다
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default StockSearchInput;
