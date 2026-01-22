'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReportCard from '@/components/ReportCard';
import FilterBar from '@/components/FilterBar';
import SearchBar from '@/components/SearchBar';
import Container from '@/components/Container';

// 한글명 → 티커 매핑 타입
interface StockNameMap {
  nameKrToTicker: Map<string, string[]>;  // 한글명 → 티커들
  tickerToNameKr: Map<string, string>;    // 티커 → 한글명
}

// 필터 상태 타입
interface FilterState {
  period: string;
  market: string;
  opinion: string;
  sortBy: string;
}

// 시장 필터 매핑 (국가별 → 실제 exchange 값)
const MARKET_MAPPING: Record<string, string[]> = {
  'KR': ['KRX'],
  'US': ['NAS', 'NYS'],
  'JP': ['TSE'],
  'CN': ['HKS', 'SHS', 'SZS'],
};

// 의견 필터 매핑 (FilterBar 옵션 → 실제 opinion 값)
const OPINION_MAPPING: Record<string, string[]> = {
  'buy': ['buy', 'BUY', '매수', 'long', 'LONG'],
  'sell': ['sell', 'SELL', '매도', 'short', 'SHORT'],
  'hold': ['hold', 'HOLD', '보유', '중립'],
};

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockNameMap, setStockNameMap] = useState<StockNameMap>({
    nameKrToTicker: new Map(),
    tickerToNameKr: new Map(),
  });
  const [filters, setFilters] = useState<FilterState>({
    period: 'all',
    market: 'all',
    opinion: 'all',
    sortBy: 'latest',
  });

  // 필터 변경 핸들러
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  // global-stocks.json에서 한글명 매핑 로드
  useEffect(() => {
    const loadStockNames = async () => {
      try {
        const response = await fetch('/data/global-stocks.json');
        const data = await response.json();

        const nameKrToTicker = new Map<string, string[]>();
        const tickerToNameKr = new Map<string, string>();

        for (const stock of data.stocks || []) {
          if (stock.nameKr) {
            const nameKrLower = stock.nameKr.toLowerCase();
            // 한글명 → 티커 (여러 티커가 같은 한글명을 가질 수 있음)
            const existing = nameKrToTicker.get(nameKrLower) || [];
            existing.push(stock.symbol.toUpperCase());
            nameKrToTicker.set(nameKrLower, existing);
            // 티커 → 한글명
            tickerToNameKr.set(stock.symbol.toUpperCase(), stock.nameKr);
          }
        }

        setStockNameMap({ nameKrToTicker, tickerToNameKr });
        console.log(`[Search] Loaded ${nameKrToTicker.size} Korean stock names`);
      } catch (error) {
        console.error('한글명 매핑 로드 실패:', error);
      }
    };

    loadStockNames();
  }, []);

  // feed.json에서 리포트 가져오기 (Firestore 비용 절감)
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('/api/feed/public');
        const data = await response.json();

        // feed.json 형식에 맞게 변환
        const posts = data.posts || [];
        setReports(posts.map((post: any) => ({
          id: post.id,
          title: post.title,
          author: post.author,
          stockName: post.stockName,
          ticker: post.ticker,
          opinion: post.opinion,
          returnRate: post.returnRate,
          initialPrice: post.initialPrice,
          currentPrice: post.currentPrice,
          createdAt: post.createdAt,
          views: post.views,
          likes: post.likes,
          exchange: post.exchange,
          category: post.category,
          positionType: post.positionType,
        })));
      } catch (error) {
        console.error('리포트 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // 검색 + 필터링 + 정렬 (한글명 매핑 포함)
  const filteredReports = useMemo(() => {
    let result = [...reports];

    // 1. 검색어 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      // 한글명으로 검색 시 해당 티커들 찾기
      const matchedTickers = new Set<string>();
      for (const [nameKr, tickers] of stockNameMap.nameKrToTicker.entries()) {
        if (nameKr.includes(query)) {
          tickers.forEach(t => matchedTickers.add(t));
        }
      }

      result = result.filter((report) => {
        const tickerUpper = report.ticker?.toUpperCase() || '';
        const stockNameKr = stockNameMap.tickerToNameKr.get(tickerUpper) || '';

        return (
          // 기존 검색 (영문명, 티커, 작성자, 제목)
          report.stockName?.toLowerCase().includes(query) ||
          report.ticker?.toLowerCase().includes(query) ||
          report.author?.toLowerCase().includes(query) ||
          report.title?.toLowerCase().includes(query) ||
          // 한글명 검색 (티커의 한글명이 검색어 포함)
          stockNameKr.toLowerCase().includes(query) ||
          // 한글명으로 찾은 티커와 일치
          matchedTickers.has(tickerUpper)
        );
      });
    }

    // 2. 기간 필터링
    if (filters.period !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();

      switch (filters.period) {
        case '1m':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case '3m':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case '6m':
          cutoffDate.setMonth(now.getMonth() - 6);
          break;
        case '1y':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      result = result.filter((report) => {
        const reportDate = new Date(report.createdAt);
        return reportDate >= cutoffDate;
      });
    }

    // 3. 시장 필터링
    if (filters.market !== 'all') {
      const validExchanges = MARKET_MAPPING[filters.market] || [filters.market];
      result = result.filter((report) => {
        const exchange = report.exchange?.toUpperCase() || '';
        return validExchanges.some(e => exchange.includes(e.toUpperCase()));
      });
    }

    // 4. 의견 필터링
    if (filters.opinion !== 'all') {
      const validOpinions = OPINION_MAPPING[filters.opinion] || [filters.opinion];
      result = result.filter((report) => {
        const opinion = report.opinion || '';
        return validOpinions.some(o =>
          opinion.toLowerCase() === o.toLowerCase() ||
          opinion.toUpperCase() === o.toUpperCase()
        );
      });
    }

    // 5. 정렬
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'returnRate':
          return (b.returnRate || 0) - (a.returnRate || 0);
        case 'latest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'popular':
          return (b.likes || 0) - (a.likes || 0);
        case 'views':
          return (b.views || 0) - (a.views || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [reports, searchQuery, stockNameMap, filters]);

  return (
    <Container>
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          검색
        </h1>
      </div>

      {/* Search Bar - 검색 페이지에서는 게시물 검색이 핵심이므로 종목 자동완성 비활성화 */}
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} showStockSuggestions={false} />

      {/* Popular Search Keywords (when no search query) */}
      {!searchQuery && (
        <div className="mt-4 mb-6 p-4 sm:p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            인기 검색어
          </h2>
          <div className="flex flex-wrap gap-2">
            {['삼성전자', 'NVIDIA', 'Apple', '현대차', 'Tesla', '네이버', 'SK하이닉스', 'Microsoft'].map((keyword, index) => (
              <button
                key={keyword}
                onClick={() => setSearchQuery(keyword)}
                className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <span className="text-xs text-gray-400 mr-1">{index + 1}</span>
                {keyword}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterBar onFilterChange={handleFilterChange} />

      {/* Search Results Summary */}
      <div className="mb-4 px-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {searchQuery ? (
            <>
              <span className="font-semibold text-gray-900 dark:text-white">&ldquo;{searchQuery}&rdquo;</span>
              {' '}검색 결과
            </>
          ) : (
            '전체 게시물'
          )}
          {' '}<span className="font-semibold text-blue-600 dark:text-blue-400">{filteredReports.length}</span>개
          {(filters.period !== 'all' || filters.market !== 'all' || filters.opinion !== 'all') && (
            <span className="ml-2 text-xs text-gray-500">(필터 적용됨)</span>
          )}
        </p>
      </div>

      {/* Reports Grid */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">로딩 중...</p>
          </div>
        ) : filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <ReportCard key={report.id} {...report} />
          ))
        ) : (
          <div className="text-center py-16">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
              {searchQuery ? '검색 결과가 없습니다' : '조건에 맞는 게시물이 없습니다'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {searchQuery ? '다른 검색어를 입력해보세요' : '필터 조건을 변경해보세요'}
            </p>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {filteredReports.length > 0 && (
        <div className="text-center mt-6 sm:mt-8">
          <button className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-blue-700 transition-colors">
            더 보기
          </button>
        </div>
      )}
    </Container>
  );
}
