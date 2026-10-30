'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { stockSearchIndex, type GlobalStock, type Stock } from '@/lib/stockSearchIndex';
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
      const allStocks = data.stocks;
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

/** 목록에 보일 이름 — 한글명이 있으면 한글, 없으면 영문 약칭 */
function displayName(stock: Stock): string {
  return stock.nameKr || shortStockName(stock.name, stock.symbol);
}

/** 질의와 같은 부분 굵게 (공백 무시 비교는 생략 — 연속 일치만) */
function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent text-[var(--theme-orange)]">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
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
  // 고른 종목의 가격을 불러오는 중 / 실패 메시지 (alert 대신 입력창 아래에 표시)
  const [pending, setPending] = useState<Stock | null>(null);
  const [error, setError] = useState('');
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

  // 종목 선택 → 현재가·지표 조회
  const handleStockSelect = async (stock: Stock) => {
    setShowResults(false);
    setPending(stock);
    setError('');

    try {
      const response = await fetch(`/api/stocks/${encodeURIComponent(stock.symbol)}?exchange=${encodeURIComponent(stock.exchange)}`);
      const stockData = await response.json();
      if (!response.ok) {
        setError(stockData.error || `${displayName(stock)} 가격을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.`);
        return;
      }
      if (!stockData.currentPrice) {
        setError(`${displayName(stock)}은(는) 지금 가격 정보가 없어요. 다른 종목을 골라 주세요.`);
        return;
      }
      setQuery('');
      // 한국 종목은 한글명, 해외 종목은 원문(영문) — 카드에서 shortStockName 으로 한글 약칭 표시
      const name = stock.exchange === 'KRX' && stock.nameKr ? stock.nameKr : stock.name;
      onStockSelect({ ...stockData, name });
    } catch (err) {
      console.error('Failed to fetch stock data:', err);
      setError('가격 조회 중 문제가 생겼어요. 네트워크를 확인하고 다시 시도해 주세요.');
    } finally {
      setPending(null);
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
        handleStockSelect(results[selectedIndex >= 0 ? selectedIndex : 0]);
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
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError('');
              }}
              onFocus={() => {
                // 첫 글자 입력 전에 종목 목록(약 4MB)을 미리 받아 둔다
                loadGlobalStocks().catch(() => {});
                if (query) setShowResults(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="기업명 · 티커 · 초성 (예: 삼성전자, 하닉, NVDA, ㅅㅅㅈㅈ)"
              aria-label="종목 검색"
              autoComplete="off"
              disabled={!!pending}
              className="pixel-input !py-3 !text-base"
            />
            {(isLoading || pending) && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--theme-border-muted)] border-t-[var(--theme-border)]"></div>
              </div>
            )}
          </div>

          {pending && (
            <p className="mt-2 text-xs text-[var(--theme-ink-soft)]">{displayName(pending)} 가격을 불러오는 중…</p>
          )}
          {error && <p className="mt-2 text-xs font-bold text-[var(--color-error)]">{error}</p>}

          {/* 검색 결과 드롭다운 */}
          {showResults && results.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-2 bg-[var(--theme-bg-card)]
                          border border-[var(--theme-border-muted)] rounded-sm
                          max-h-[50vh] sm:max-h-96 overflow-y-auto shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
              {results.map((stock, index) => {
                const primary = displayName(stock);
                // 해외 종목만 원문 영문명 병기 (한국 종목 name 필드는 "SK" 처럼 잘려 있음)
                const isDomestic = stock.exchange === 'KRX';
                const secondary = !isDomestic && stock.nameKr ? shortStockName(stock.name, '') : null;
                return (
                  <button
                    key={`${stock.symbol}-${stock.exchange}-${index}`}
                    type="button"
                    onClick={() => handleStockSelect(stock)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-3 sm:px-4 py-2.5 text-left border-b border-[var(--theme-border-muted)] last:border-b-0 transition-colors ${
                      index === selectedIndex ? 'bg-[var(--theme-bg)]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-[15px] font-bold truncate">{highlight(primary, query)}</p>
                        <p className="text-xs text-[var(--theme-ink-soft)] truncate">
                          <span className="font-mono">{stock.symbol}</span>
                          {secondary && <span className="ml-1.5">· {secondary}</span>}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-[11px] font-bold text-[var(--theme-ink-soft)]">{exchangeLabel(stock.exchange)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 검색 결과 없음 */}
          {showResults && !isLoading && query.length > 0 && results.length === 0 && (
            <div className="absolute z-50 left-0 right-0 mt-2 bg-[var(--theme-bg-card)]
                          border border-[var(--theme-border-muted)] rounded-sm p-4">
              <p className="text-sm text-center">&lsquo;{query}&rsquo;에 맞는 종목이 없어요</p>
              <p className="mt-1 text-xs text-[var(--theme-ink-soft)] text-center">영문 이름이나 티커(예: TSLA, 005930)로도 찾아보세요</p>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default StockSearchInput;
