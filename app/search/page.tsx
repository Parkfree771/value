'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReportCard from '@/components/ReportCard';
import FilterBar from '@/components/FilterBar';
import SearchBar, { StockSuggestion } from '@/components/SearchBar';
import Container from '@/components/Container';

type SearchType = 'title' | 'stockName' | 'ticker' | 'author';

const searchTypeLabels: Record<SearchType, string> = {
  title: '제목',
  stockName: '종목명',
  ticker: '티커',
  author: '작성자',
};

const searchTypePlaceholders: Record<SearchType, string> = {
  title: '리포트 제목으로 검색...',
  stockName: '종목명으로 검색...',
  ticker: '티커(종목코드)로 검색...',
  author: '작성자 이름으로 검색...',
};

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('title');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // API에서 리포트 가져오기
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('/api/reports');
        const data = await response.json();

        if (data.success) {
          setReports(data.reports);
        }
      } catch (error) {
        console.error('리포트 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // 자동완성에서 종목 선택 시 티커 검색으로 전환
  const handleSelectStock = (stock: StockSuggestion) => {
    setSearchType('ticker');
  };

  // 검색 필터링 - 선택된 검색 타입에 따라 필터링
  const filteredReports = reports.filter((report) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();

    switch (searchType) {
      case 'title':
        return report.title.toLowerCase().includes(query);
      case 'stockName':
        return report.stockName.toLowerCase().includes(query);
      case 'ticker':
        return report.ticker.toLowerCase().includes(query);
      case 'author':
        return report.author.toLowerCase().includes(query);
      default:
        return true;
    }
  });

  return (
    <Container>
      {/* Header */}
      <div className="mb-3 sm:mb-6 flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => router.back()}
          className="md:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          검색
        </h1>
      </div>

      {/* Search Bar */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder={searchTypePlaceholders[searchType]}
        showStockSuggestions={searchType === 'stockName' || searchType === 'ticker'}
        onSelectStock={handleSelectStock}
      />

      {/* 검색 방식 선택 */}
      <div className="mb-3 sm:mb-6">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mr-0.5 sm:mr-1">검색 방식:</span>
          {(Object.keys(searchTypeLabels) as SearchType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSearchType(type)}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-all ${
                searchType === type
                  ? 'bg-red-600 text-white font-semibold'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {searchTypeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Popular Search Keywords (when no search query) */}
      {!searchQuery && (
        <div className="mt-3 mb-4 sm:mt-4 sm:mb-6 p-3 sm:p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <h2 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-2.5 sm:mb-4">
            인기 검색어
          </h2>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {['삼성전자', 'NVIDIA', 'Apple', '현대차', 'Tesla', '네이버', 'SK하이닉스', 'Microsoft'].map((keyword, index) => (
              <button
                key={keyword}
                onClick={() => setSearchQuery(keyword)}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:border-red-500 dark:hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <span className="text-xs text-gray-400 mr-1">{index + 1}</span>
                {keyword}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterBar />

      {/* Search Results Summary */}
      {searchQuery && (
        <div className="mb-4 px-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="text-red-600 dark:text-red-400 font-medium">{searchTypeLabels[searchType]}</span>
            {' '}검색: <span className="font-semibold text-gray-900 dark:text-white">&ldquo;{searchQuery}&rdquo;</span>
            {' '}결과 {filteredReports.length}개
          </p>
        </div>
      )}

      {/* Reports Grid */}
      <div className="space-y-3 sm:space-y-6">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <ReportCard key={report.id} {...report} />
          ))
        ) : searchQuery ? (
          <div className="text-center py-10 sm:py-16">
            <div className="mb-3 sm:mb-4">
              <svg className="w-10 h-10 sm:w-16 sm:h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-lg mb-1 sm:mb-2">
              검색 결과가 없습니다
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm">
              다른 검색어를 입력해보세요
            </p>
          </div>
        ) : (
          <div className="text-center py-10 sm:py-16">
            <div className="mb-3 sm:mb-4">
              <svg className="w-10 h-10 sm:w-16 sm:h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-lg mb-1 sm:mb-2">
              검색어를 입력해주세요
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm">
              위에서 검색 방식을 선택하고 검색할 수 있습니다
            </p>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {filteredReports.length > 0 && (
        <div className="text-center mt-6 sm:mt-8">
          <button className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-red-700 transition-colors">
            더 보기
          </button>
        </div>
      )}
    </Container>
  );
}
