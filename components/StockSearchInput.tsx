'use client';

import { useState } from 'react';

interface Stock {
  ticker: string;
  name: string;
  market: string;
}

interface StockSearchInputProps {
  onSelect: (stock: Stock) => void;
  selectedStock: Stock | null;
}

// Mock stock data
const mockStocks: Stock[] = [
  { ticker: '005930', name: '삼성전자', market: 'KOSPI' },
  { ticker: '000660', name: 'SK하이닉스', market: 'KOSPI' },
  { ticker: '035720', name: '카카오', market: 'KOSPI' },
  { ticker: '005380', name: '현대차', market: 'KOSPI' },
  { ticker: 'AAPL', name: 'Apple', market: 'NASDAQ' },
  { ticker: 'TSLA', name: 'Tesla', market: 'NASDAQ' },
  { ticker: 'NVDA', name: 'NVIDIA', market: 'NASDAQ' },
  { ticker: 'MSFT', name: 'Microsoft', market: 'NASDAQ' },
];

export default function StockSearchInput({ onSelect, selectedStock }: StockSearchInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);

  const handleSearch = (value: string) => {
    setQuery(value);
    setIsOpen(true);

    if (value.trim() === '') {
      setFilteredStocks([]);
      return;
    }

    const filtered = mockStocks.filter(
      (stock) =>
        stock.name.toLowerCase().includes(value.toLowerCase()) ||
        stock.ticker.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredStocks(filtered);
  };

  const handleSelect = (stock: Stock) => {
    onSelect(stock);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        종목 검색 *
      </label>

      {selectedStock ? (
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <div>
            <div className="font-semibold text-gray-900">{selectedStock.name}</div>
            <div className="text-sm text-gray-600">
              {selectedStock.ticker} · {selectedStock.market}
            </div>
          </div>
          <button
            onClick={() => onSelect(null as any)}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            변경
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="종목명 또는 티커를 입력하세요"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {isOpen && filteredStocks.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredStocks.map((stock) => (
                <button
                  key={stock.ticker}
                  onClick={() => handleSelect(stock)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                >
                  <div className="font-semibold text-gray-900">{stock.name}</div>
                  <div className="text-sm text-gray-600">
                    {stock.ticker} · {stock.market}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
