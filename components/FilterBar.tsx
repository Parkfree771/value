'use client';

import { useState, memo, useCallback, useEffect, useRef } from 'react';

interface FilterBarProps {
  onFilterChange?: (filters: FilterState) => void;
}

interface FilterState {
  period: string;
  market: string;
  opinion: string;
  sortBy: string;
}

const FilterBar = memo(function FilterBar({ onFilterChange }: FilterBarProps) {
  const [filters, setFilters] = useState<FilterState>({
    period: 'all',
    market: 'all',
    opinion: 'all',
    sortBy: 'returnRate',
  });
  const [showAllFilters, setShowAllFilters] = useState(false);
  const isInitialMount = useRef(true);
  const onFilterChangeRef = useRef(onFilterChange);

  // onFilterChange ref 업데이트
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  // filters가 변경되면 부모에게 알림 (초기 마운트 제외)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onFilterChangeRef.current?.(filters);
  }, [filters]);

  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // 활성화된 필터 개수 계산
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value !== 'all' && !(key === 'sortBy' && value === 'returnRate')
  ).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6 border border-gray-200 dark:border-gray-700 transition-colors">
      {/* 모바일: 한 줄 축약 버전 */}
      <div className="block md:hidden">
        <div className="p-3 flex items-center gap-2">
          {/* 정렬 (항상 표시) */}
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
          >
            <option value="returnRate">📈 수익률순</option>
            <option value="latest">🆕 최신순</option>
            <option value="popular">🔥 인기순</option>
            <option value="views">👁 조회순</option>
          </select>

          {/* 필터 버튼 */}
          <button
            onClick={() => setShowAllFilters(!showAllFilters)}
            className="relative px-4 py-2 text-sm font-semibold bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            필터
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* 확장된 필터 옵션 (모바일) */}
        {showAllFilters && (
          <div className="px-3 pb-3 space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
            <select
              value={filters.period}
              onChange={(e) => handleFilterChange('period', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
            >
              <option value="all">📅 기간: 전체</option>
              <option value="1m">📅 1개월</option>
              <option value="3m">📅 3개월</option>
              <option value="6m">📅 6개월</option>
              <option value="1y">📅 1년</option>
            </select>

            <select
              value={filters.market}
              onChange={(e) => handleFilterChange('market', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
            >
              <option value="all">국가: 전체</option>
              <option value="KR">🇰🇷 한국</option>
              <option value="US">🇺🇸 미국</option>
              <option value="JP">🇯🇵 일본</option>
              <option value="CN">🇨🇳 중국</option>
            </select>

            <select
              value={filters.opinion}
              onChange={(e) => handleFilterChange('opinion', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
            >
              <option value="all">💭 의견: 전체</option>
              <option value="buy">📈 매수</option>
              <option value="sell">📉 매도</option>
              <option value="hold">⏸ 보유</option>
            </select>

            {/* 초기화 버튼 */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setFilters({
                    period: 'all',
                    market: 'all',
                    opinion: 'all',
                    sortBy: 'returnRate',
                  });
                }}
                className="w-full px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                🔄 필터 초기화
              </button>
            )}
          </div>
        )}
      </div>

      {/* 데스크탑: 기존 4열 그리드 */}
      <div className="hidden md:block p-4">
        <div className="grid grid-cols-4 gap-4">
          {/* Period Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              기간
            </label>
            <select
              value={filters.period}
              onChange={(e) => handleFilterChange('period', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
            >
              <option value="all">전체</option>
              <option value="1m">1개월</option>
              <option value="3m">3개월</option>
              <option value="6m">6개월</option>
              <option value="1y">1년</option>
            </select>
          </div>

          {/* Market Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              국가
            </label>
            <select
              value={filters.market}
              onChange={(e) => handleFilterChange('market', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
            >
              <option value="all">전체</option>
              <option value="KR">🇰🇷 한국</option>
              <option value="US">🇺🇸 미국</option>
              <option value="JP">🇯🇵 일본</option>
              <option value="CN">🇨🇳 중국</option>
            </select>
          </div>

          {/* Opinion Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              의견
            </label>
            <select
              value={filters.opinion}
              onChange={(e) => handleFilterChange('opinion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
            >
              <option value="all">전체</option>
              <option value="buy">매수</option>
              <option value="sell">매도</option>
              <option value="hold">보유</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              정렬
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
            >
              <option value="returnRate">수익률순</option>
              <option value="latest">최신순</option>
              <option value="popular">인기순</option>
              <option value="views">조회순</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
});

export default FilterBar;
