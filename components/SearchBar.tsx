'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  reports?: Array<{
    id: string;
    stockName: string;
    ticker: string;
    author: string;
    title: string;
  }>;
}

export default function SearchBar({ searchQuery, setSearchQuery, reports = [] }: SearchBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // 자동완성 추천 목록 생성 - useMemo로 최적화
  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || !reports.length) return [];

    const query = searchQuery.toLowerCase();
    const suggestionsMap = new Map<string, { type: string; label: string; value: string }>();

    reports.forEach((report) => {
      // 종목명 매칭
      if (report.stockName.toLowerCase().includes(query)) {
        const key = `stock-${report.stockName}`;
        if (!suggestionsMap.has(key)) {
          suggestionsMap.set(key, {
            type: '종목',
            label: report.stockName,
            value: report.stockName,
          });
        }
      }

      // 티커 매칭
      if (report.ticker.toLowerCase().includes(query)) {
        const key = `ticker-${report.ticker}`;
        if (!suggestionsMap.has(key)) {
          suggestionsMap.set(key, {
            type: '티커',
            label: `${report.ticker} (${report.stockName})`,
            value: report.ticker,
          });
        }
      }

      // 작성자 매칭
      if (report.author.toLowerCase().includes(query)) {
        const key = `author-${report.author}`;
        if (!suggestionsMap.has(key)) {
          suggestionsMap.set(key, {
            type: '작성자',
            label: report.author,
            value: report.author,
          });
        }
      }
    });

    return Array.from(suggestionsMap.values()).slice(0, 8);
  }, [searchQuery, reports]);

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
      handleSelectSuggestion(suggestions[focusedIndex].value);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    }
  };

  const handleSelectSuggestion = useCallback((value: string) => {
    setSearchQuery(value);
    setShowSuggestions(false);
    setFocusedIndex(-1);
  }, [setSearchQuery]);

  const highlightMatch = useCallback((text: string, query: string) => {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;

    return (
      <>
        {text.substring(0, index)}
        <span className="font-bold text-blue-600 dark:text-blue-400">
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    );
  }, []);

  return (
    <div className="mb-4 sm:mb-6" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
            setFocusedIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder="종목명, 티커, 작성자로 검색..."
          className="w-full px-4 sm:px-5 py-2.5 sm:py-3 pl-10 sm:pl-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 sm:max-h-80 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.type}-${suggestion.value}`}
                onClick={() => handleSelectSuggestion(suggestion.value)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                  focusedIndex === index ? 'bg-gray-50 dark:bg-gray-700' : ''
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="px-1.5 sm:px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex-shrink-0">
                    {suggestion.type}
                  </span>
                  <span className="text-sm sm:text-base text-gray-900 dark:text-white truncate">
                    {highlightMatch(suggestion.label, searchQuery)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {searchQuery && !showSuggestions && (
        <div className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold">&ldquo;{searchQuery}&rdquo;</span> 검색 중...
        </div>
      )}
    </div>
  );
}
