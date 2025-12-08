'use client';

import { useState, useEffect, useRef } from 'react';

interface Stock {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  currency: string;
  marketCap: number;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  exchange: string;
  industry?: string;
  sector?: string;
}

interface StockSearchInputProps {
  onStockSelect: (stockData: StockData) => void;
  selectedStock?: StockData | null;
}

export default function StockSearchInput({ onStockSelect, selectedStock }: StockSearchInputProps) {
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

  // 검색 API 호출 (디바운스)
  useEffect(() => {
    const searchStocks = async () => {
      if (query.length < 1) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.stocks || []);
        setShowResults(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchStocks, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  // 주식 선택 시 상세 데이터 가져오기
  const handleStockSelect = async (stock: Stock) => {
    setQuery('');
    setShowResults(false);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/stocks/${stock.symbol}`);
      const stockData = await response.json();
      onStockSelect(stockData);
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
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

  return (
    <div ref={searchRef} className="relative w-full">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        종목 검색 *
      </label>

      {selectedStock ? (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30
                      rounded-lg border-2 border-blue-200 dark:border-blue-700">
          <div className="flex-1">
            <div className="font-semibold text-gray-900 dark:text-white">
              {selectedStock.name}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {selectedStock.symbol} · {selectedStock.exchange}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 grid grid-cols-2 gap-2">
              <div>현재가: {selectedStock.currency} {selectedStock.currentPrice?.toFixed(2)}</div>
              <div>시가총액: {(selectedStock.marketCap / 1e9).toFixed(2)}B</div>
              {selectedStock.per && <div>PER: {selectedStock.per.toFixed(2)}</div>}
              {selectedStock.pbr && <div>PBR: {selectedStock.pbr.toFixed(2)}</div>}
              {selectedStock.eps && <div>EPS: {selectedStock.eps.toFixed(2)}</div>}
            </div>
          </div>
          <button
            onClick={() => onStockSelect(null as any)}
            className="ml-4 text-red-600 hover:text-red-700 dark:text-red-400
                     dark:hover:text-red-300 font-medium"
          >
            변경
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="기업명 또는 티커 입력 (예: 삼성전자, 005930.KS, AAPL)"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       placeholder-gray-400 dark:placeholder-gray-500"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>

          {/* 검색 결과 드롭다운 */}
          {showResults && results.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800
                          border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg
                          max-h-96 overflow-y-auto">
              {results.map((stock, index) => (
                <button
                  key={stock.symbol}
                  onClick={() => handleStockSelect(stock)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700
                            transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0
                            ${index === selectedIndex ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {stock.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {stock.symbol}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {stock.exchange}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 검색 결과 없음 */}
          {showResults && !isLoading && query.length > 0 && results.length === 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800
                          border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
              <p className="text-gray-500 dark:text-gray-400 text-center">
                검색 결과가 없습니다
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
