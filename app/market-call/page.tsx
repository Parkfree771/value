'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GuruTrackingEvent } from '@/app/guru-tracker/types';
import GuruTrackingCard from '@/components/GuruTrackingCard';

export default function MarketCallPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState('newest');
  const [firebaseEvents, setFirebaseEvents] = useState<GuruTrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 5; // 페이지당 5개

  // API에서 마켓콜 데이터 가져오기 (가격 계산 포함)
  useEffect(() => {
    const fetchMarketCall = async () => {
      try {
        setLoading(true);
        const sortByField = sortBy === 'newest' ? 'created_at' : sortBy === 'return' ? 'return_rate' : 'views';
        const response = await fetch(`/api/market-call?sortBy=${sortByField}&limit=100&page=${currentPage}&pageSize=${pageSize}`);
        const data = await response.json();

        if (data.success) {
          setFirebaseEvents(data.events);
          setTotalPages(data.totalPages);
        } else {
          console.error('마켓콜 가져오기 실패:', data.error);
        }
      } catch (error) {
        console.error('Error fetching market call:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketCall();
  }, [sortBy, currentPage]);

  // Firebase 데이터만 사용
  const mentionEvents = firebaseEvents;

  // Apply sorting
  const filteredEvents = mentionEvents.sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
    } else if (sortBy === 'return') {
      return (b.return_rate || 0) - (a.return_rate || 0);
    } else if (sortBy === 'popular') {
      // 인기순: 조회수 + 좋아요 수 기준
      const scoreA = (a.views || 0) + (a.likes || 0) * 2; // 좋아요에 2배 가중치
      const scoreB = (b.views || 0) + (b.likes || 0) * 2;
      return scoreB - scoreA;
    }
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* 페이지 소개 섹션 */}
      <section className="mb-6 sm:mb-8 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 dark:from-black dark:via-gray-950 dark:to-black rounded-none sm:rounded-2xl p-6 sm:p-8 shadow-2xl border-t-4 border-b-4 sm:border-4 border-cyan-600 dark:border-cyan-500 relative overflow-hidden">
        {/* 장식 요소 */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>

        <div className="relative z-10">
          <div className="text-center mb-6 sm:mb-7">
            <div className="inline-block mb-2 sm:mb-3 px-4 py-1.5 bg-cyan-600/20 border border-cyan-600/50 rounded-full">
              <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Expert Market Predictions</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-1.5 sm:mb-2 tracking-tight leading-tight">
              MARKET CALL
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-cyan-100 tracking-wide font-light">
              전문가들의 예측, 데이터로 검증하다
            </p>
          </div>

          <div className="max-w-3xl mx-auto text-center px-4 sm:px-6">
            <blockquote className="relative">
              <p className="text-sm sm:text-base md:text-lg text-gray-100 leading-relaxed font-serif italic mb-4 sm:mb-5">
                투자 전문가들이 공개적으로 내놓은 <strong className="text-cyan-300">마켓 콜(Market Call)</strong>을 추적합니다.
                <br className="hidden sm:block" />
                "테슬라 매수", "금 상승 전망", "달러 약세 예상" - 그들의 예측을 따랐다면 어땠을까요?
                <br className="hidden sm:block" />
                <br className="hidden sm:block" />
                발언 시점의 가격부터 현재까지, 실제 수익률로 검증합니다.
              </p>
            </blockquote>
          </div>
        </div>
      </section>

      {/* 정렬 버튼 & 작성하기 버튼 */}
      <div className="mb-6 flex items-center justify-between gap-4">
        {/* 왼쪽: 정렬 버튼 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSortBy('newest')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              sortBy === 'newest'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setSortBy('popular')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              sortBy === 'popular'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            인기순
          </button>
          <button
            onClick={() => setSortBy('return')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              sortBy === 'return'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            수익률순
          </button>
        </div>

        {/* 오른쪽: 작성하기 버튼 */}
        {user && (
          <button
            onClick={() => router.push('/market-call/write')}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            마켓 콜 작성
          </button>
        )}
      </div>

      {/* Market Call Content */}
      <div className="space-y-6">

        {/* Event Cards */}
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
              <div className="flex justify-center items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                <span className="text-lg text-gray-600 dark:text-gray-400">데이터 로딩 중...</span>
              </div>
            </div>
          ) : filteredEvents.length > 0 ? (
            filteredEvents.map(event => (
              <GuruTrackingCard key={event.id} event={event} collection="market-call" />
            ))
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
              <div className="text-4xl font-bold text-gray-300 dark:text-gray-600 mb-4">MARKET CALL</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                필터 조건에 맞는 데이터가 없습니다
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                다른 필터 조건을 선택해보세요.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 페이지네이션 */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            이전
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  currentPage === page
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>
      )}

      {/* Firebase 데이터 카운트 표시 (개발 확인용) */}
      {!loading && firebaseEvents.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          사용자 작성 글: {firebaseEvents.length}개 | 페이지: {currentPage}/{totalPages}
        </div>
      )}

      {/* 면책 조항 */}
      <section className="mt-12 p-6 sm:p-8 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-l-4 border-cyan-600 dark:border-cyan-500 rounded-r-lg shadow-lg">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 tracking-wide uppercase">
          마켓 콜 추적의 한계
        </h3>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p className="leading-relaxed">
            이 페이지는 전문가들이 공개한 마켓 콜(투자 의견)을 추적합니다. 실제 매매 시점과 공개 발언 시점이 다를 수 있으며,
            발언 이후 의견이 변경되었을 가능성도 있습니다.
          </p>
          <p className="leading-relaxed">
            표기된 수익률은 <strong>"발언 시점의 가격을 기준으로 따라 샀을 때"</strong>를 가정한 시뮬레이션이며,
            실제 투자 성과와는 차이가 있을 수 있습니다.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-cyan-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 space-y-2">
          <div className="flex gap-2"><strong className="font-semibold text-cyan-700 dark:text-cyan-400">TIMING RISK:</strong> <span>공개 발언과 실제 매매 시점은 다를 수 있습니다.</span></div>
          <div className="flex gap-2"><strong className="font-semibold text-cyan-700 dark:text-cyan-400">TRACKING METHOD:</strong> <span>발언 시점 가격 대비 현재가를 산출한 것으로, 실제 수익률과 무관합니다.</span></div>
          <div className="flex gap-2"><strong className="font-semibold text-cyan-700 dark:text-cyan-400">FOR REFERENCE ONLY:</strong> <span>이 데이터는 투자 권유가 아니며, 전문가 예측 검증을 위한 참고 자료입니다. 실제 투자의 책임은 본인에게 있습니다.</span></div>
        </div>
      </section>
    </div>
  );
}
