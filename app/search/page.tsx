'use client';

import { useState, useEffect, useMemo } from 'react';
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

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockNameMap, setStockNameMap] = useState<StockNameMap>({
    nameKrToTicker: new Map(),
    tickerToNameKr: new Map(),
  });

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

  // 검색 필터링 (한글명 매핑 포함)
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;

    const query = searchQuery.toLowerCase();

    // 한글명으로 검색 시 해당 티커들 찾기
    const matchedTickers = new Set<string>();
    for (const [nameKr, tickers] of stockNameMap.nameKrToTicker.entries()) {
      if (nameKr.includes(query)) {
        tickers.forEach(t => matchedTickers.add(t));
      }
    }

    return reports.filter((report) => {
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
  }, [reports, searchQuery, stockNameMap]);

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

      {/* Search Bar */}
      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

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
      <FilterBar />

      {/* Search Results Summary */}
      {searchQuery && (
        <div className="mb-4 px-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">&ldquo;{searchQuery}&rdquo;</span>
            {' '}검색 결과 {filteredReports.length}개
          </p>
        </div>
      )}

      {/* Reports Grid */}
      <div className="space-y-6">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <ReportCard key={report.id} {...report} />
          ))
        ) : searchQuery ? (
          <div className="text-center py-16">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
              검색 결과가 없습니다
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              다른 검색어를 입력해보세요
            </p>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
              검색어를 입력해주세요
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              종목명, 티커, 작성자로 검색할 수 있습니다
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
