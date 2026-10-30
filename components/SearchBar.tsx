'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';

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
  /** 바깥 래퍼 클래스 (기본: 아래 여백) */
  className?: string;
}

const SearchBar = memo(function SearchBar({
  searchQuery,
  setSearchQuery,
  placeholder = '검색어를 입력하세요...',
  showStockSuggestions = true,
  onSelectStock,
  className = 'mb-4 sm:mb-6',
}: SearchBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

        if (data.success && Array.isArray(data.stocks)) {
          setSuggestions(data.stocks);
        } else {
          setSuggestions([]);
        }
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
    const timeoutId = setTimeout(fetchSuggestions, 300);

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
    setSearchQuery(stock.symbol);
    setShowSuggestions(false);
    setFocusedIndex(-1);
    setSuggestions([]);
  }, [setSearchQuery, onSelectStock]);

  const highlightMatch = useCallback((text: string, query: string) => {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;

    return (
      <>
        {text.substring(0, index)}
        <span className="font-bold text-[var(--theme-accent)] dark:text-[var(--theme-accent-light)]">
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    );
  }, []);

  const getExchangeBadgeColor = (exchange: string) => {
    if (exchange === 'KRX') return 'bg-red-500/15 text-red-500 border-red-500';
    if (exchange === 'NAS' || exchange === 'NYS') return 'bg-green-500/15 text-green-500 border-green-500';
    return 'bg-gray-500/15 text-gray-500 border-gray-500';
  };

  const getExchangeLabel = (exchange: string) => {
    if (exchange === 'KRX') return '한국';
    if (exchange === 'NAS') return 'NASDAQ';
    if (exchange === 'NYS') return 'NYSE';
    return exchange;
  };

  return (
    <div className={className} ref={searchRef}>
      {/* 검색 — 버튼 없이 입력창 하나: 왼쪽 돋보기, 아래 괘선(포커스 시 잉크색 굵게), 오른쪽 지우기 */}
      <div className="w-full sm:max-w-md">
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
            className="w-full h-11 bg-transparent pl-7 pr-8 text-[15px] text-[var(--foreground)] placeholder:text-[var(--theme-ink-soft)] border-0 border-b border-[var(--theme-border-muted)] rounded-none outline-none focus:border-b-2 focus:border-[var(--theme-border)] transition-colors"
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
            <div className="absolute z-50 left-0 right-0 mt-2 bg-[var(--theme-bg-card)] border border-[var(--theme-border)] rounded-sm max-h-[50vh] sm:max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
                  검색 중...
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((stock, index) => (
                  <button
                    key={`${stock.exchange}-${stock.symbol}`}
                    onClick={() => handleSelectSuggestion(stock)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all border-b border-[var(--theme-border-muted)] last:border-b-0 ${
                      focusedIndex === index ? 'bg-blue-50 dark:bg-blue-900/10 border-l-2 border-l-[var(--theme-accent)]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold border rounded-sm flex-shrink-0 ${getExchangeBadgeColor(stock.exchange)}`}>
                        {getExchangeLabel(stock.exchange)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="font-mono font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                            {highlightMatch(stock.symbol, searchQuery)}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                            {highlightMatch(stock.nameKr || stock.name, searchQuery)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : null}
            </div>
          )}
        </div>

      </div>

      {showStockSuggestions && searchQuery && !showSuggestions && (
        <div className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold">&ldquo;{searchQuery}&rdquo;</span> 검색 중...
        </div>
      )}
    </div>
  );
});

export default SearchBar;
