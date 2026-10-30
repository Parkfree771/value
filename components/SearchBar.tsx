'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { shortStockName, exchangeLabel } from '@/utils/reportDisplay';

export interface StockSuggestion {
  symbol: string;
  name: string;
  nameKr?: string;
  exchange: string;
  type: 'EQUITY' | 'ETF';
}

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  placeholder?: string;
  showStockSuggestions?: boolean;
  onSelectStock?: (stock: StockSuggestion) => void;
  /** 자동완성 결과가 바뀔 때 — 리포트 검색에 종목 별칭·초성 매칭을 보태는 데 쓴다 */
  onSuggestions?: (stocks: StockSuggestion[]) => void;
  /** 바깥 래퍼 클래스 (기본: 아래 여백) */
  className?: string;
}

const SearchBar = memo(function SearchBar({
  searchQuery,
  setSearchQuery,
  placeholder = '검색어를 입력하세요...',
  showStockSuggestions = true,
  onSelectStock,
  onSuggestions,
  className = 'mb-4 sm:mb-6',
}: SearchBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // 콜백은 ref 로 — 부모가 매 렌더 새 함수를 넘겨도 검색이 다시 돌지 않게
  const onSuggestionsRef = useRef(onSuggestions);
  onSuggestionsRef.current = onSuggestions;

  // 실시간 종목 검색 API 호출 (showStockSuggestions가 true일 때만)
  useEffect(() => {
    const fetchSuggestions = async () => {
      // 종목 자동완성이 비활성화된 경우 API 호출 안 함
      if (!showStockSuggestions) {
        setSuggestions([]);
        return;
      }

      const query = searchQuery.trim();

      if (!query || query.length < 1) {
        setSuggestions([]);
        onSuggestionsRef.current?.([]);
        return;
      }

      // 이전 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(query)}&limit=10`,
          { signal: abortControllerRef.current.signal }
        );

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();

        const stocks: StockSuggestion[] = data.success && Array.isArray(data.stocks) ? data.stocks : [];
        setSuggestions(stocks);
        onSuggestionsRef.current?.(stocks);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Stock search error:', error);
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // 디바운싱
    const timeoutId = setTimeout(fetchSuggestions, 200);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery, showStockSuggestions]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[focusedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    }
  };

  const handleSelectSuggestion = useCallback((stock: StockSuggestion) => {
    // 종목 선택 시 콜백 호출 (검색 타입 변경 등)
    if (onSelectStock) {
      onSelectStock(stock);
    }
    setShowSuggestions(false);
    setFocusedIndex(-1);
    setSuggestions([]);
  }, [onSelectStock]);

  const highlightMatch = useCallback((text: string, query: string) => {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;

    return (
      <>
        {text.substring(0, index)}
        <span className="font-bold text-[var(--theme-orange)]">
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    );
  }, []);



  return (
    <div className={className} ref={searchRef}>
      {/* 검색 — 버튼 없이 입력창 하나: 왼쪽 돋보기, 아래 괘선(포커스 시 잉크색 굵게), 오른쪽 지우기 */}
      <div className="w-full">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--theme-ink-soft)]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (showStockSuggestions) {
                setShowSuggestions(true);
              }
              setFocusedIndex(-1);
            }}
            onFocus={() => showStockSuggestions && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="검색어 입력"
            className="w-full h-11 bg-transparent pl-7 pr-8 text-[15px] text-[var(--foreground)] placeholder:text-[var(--theme-ink-soft)] border-0 border-b-2 border-[var(--theme-border-control)] rounded-none outline-none focus:border-b-2 focus:border-[var(--theme-border)] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSuggestions(false);
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-[var(--theme-ink-soft)] hover:text-[var(--foreground)] transition-colors"
              aria-label="검색어 지우기"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          {/* 자동완성 드롭다운 */}
          {showStockSuggestions && showSuggestions && (isLoading || suggestions.length > 0) && (
            <div className="absolute z-50 left-0 right-0 mt-2 bg-[var(--theme-bg-card)] border border-[var(--theme-border)] rounded-sm max-h-[50vh] sm:max-h-80 overflow-y-auto shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
              <p className="px-3 sm:px-4 pt-2 pb-1 text-[11px] font-bold text-[var(--theme-ink-soft)]">종목으로 보기</p>
              {isLoading ? (
                <div className="px-4 py-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
                  검색 중...
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((stock, index) => (
                  <button
                    key={`${stock.exchange}-${stock.symbol}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(stock)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`w-full px-3 sm:px-4 py-2.5 text-left border-b border-[var(--theme-border-muted)] last:border-b-0 transition-colors ${
                      focusedIndex === index ? 'bg-[var(--theme-bg)]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">
                          {highlightMatch(stock.nameKr || shortStockName(stock.name, stock.symbol), searchQuery)}
                        </p>
                        <p className="text-xs text-[var(--theme-ink-soft)] truncate font-mono">{stock.symbol}</p>
                      </div>
                      <span className="flex-shrink-0 text-[11px] font-bold text-[var(--theme-ink-soft)]">{exchangeLabel(stock.exchange)}</span>
                    </div>
                  </button>
                ))
              ) : null}
            </div>
          )}
        </div>

      </div>

    </div>
  );
});

export default SearchBar;
