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
}

const SearchBar = memo(function SearchBar({
  searchQuery,
  setSearchQuery,
  placeholder = '검색어를 입력하세요...',
  showStockSuggestions = true,
  onSelectStock
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
        <span className="font-bold text-red-600 dark:text-red-400">
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    );
  }, []);

  const getExchangeBadgeColor = (exchange: string) => {
    if (exchange === 'KRX') return 'bg-ant-red-100 dark:bg-ant-red-900 text-ant-red-700 dark:text-ant-red-300';
    if (exchange === 'NAS' || exchange === 'NYS') return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
    return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  };

  const getExchangeLabel = (exchange: string) => {
    if (exchange === 'KRX') return '한국';
    if (exchange === 'NAS') return 'NASDAQ';
    if (exchange === 'NYS') return 'NYSE';
    return exchange;
  };

  return (
    <div className="mb-4 sm:mb-6" ref={searchRef}>
      <div className="relative">
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
          className="w-full px-4 sm:px-5 py-2.5 sm:py-3 pl-10 sm:pl-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
        />
        <svg
          className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setShowSuggestions(false);
            }}
            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* 자동완성 드롭다운 */}
        {showStockSuggestions && showSuggestions && (isLoading || suggestions.length > 0) && (
          <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 sm:max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                검색 중...
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((stock, index) => (
                <button
                  key={`${stock.exchange}-${stock.symbol}`}
                  onClick={() => handleSelectSuggestion(stock)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                    focusedIndex === index ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className={`px-1.5 sm:px-2 py-0.5 text-xs font-semibold rounded flex-shrink-0 ${getExchangeBadgeColor(stock.exchange)}`}>
                      {getExchangeLabel(stock.exchange)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                          {highlightMatch(stock.symbol, searchQuery)}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
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

      {showStockSuggestions && searchQuery && !showSuggestions && (
        <div className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold">&ldquo;{searchQuery}&rdquo;</span> 검색 중...
        </div>
      )}
    </div>
  );
});

export default SearchBar;
