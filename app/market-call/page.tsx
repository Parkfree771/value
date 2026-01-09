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
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // API에서 마켓콜 데이터 가져오기 (가격 계산 포함)
  const fetchMarketCall = async (cursor?: string, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const sortByField = sortBy === 'newest' ? 'created_at' : sortBy === 'return' ? 'return_rate' : 'views';
      const url = cursor
        ? `/api/market-call?sortBy=${sortByField}&pageSize=${pageSize}&cursor=${cursor}`
        : `/api/market-call?sortBy=${sortByField}&pageSize=${pageSize}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        if (append) {
          setFirebaseEvents(prev => [...prev, ...data.events]);
        } else {
          setFirebaseEvents(data.events);
        }
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
        setTotal(data.total);
      } else {
        console.error('마켓콜 가져오기 실패:', data.error);
      }
    } catch (error) {
      console.error('Error fetching market call:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 초기 로드 및 정렬 변경 시
  useEffect(() => {
    setFirebaseEvents([]);
    setNextCursor(null);
    fetchMarketCall();
  }, [sortBy]);

  // 더 보기 핸들러
  const handleLoadMore = () => {
    if (nextCursor && hasMore && !loadingMore) {
      fetchMarketCall(nextCursor, true);
    }
  };

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
      <section className="mb-6 sm:mb-8 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 dark:from-black dark:via-gray-950 dark:to-black rounded-none sm:rounded-2xl p-6 sm:p-8 border-t-4 border-b-4 sm:border-4 border-electric-blue-600 dark:border-electric-blue-500 relative overflow-hidden">
        {/* 장식 요소 */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-electric-blue-500 to-transparent opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-electric-blue-500 to-transparent opacity-50"></div>

        <div className="relative z-10">
          <div className="text-center mb-6 sm:mb-7">
            <div className="inline-block mb-2 sm:mb-3 px-4 py-1.5 bg-electric-blue-500/20 border border-electric-blue-500/50 rounded-full">
              <span className="text-xs font-semibold tracking-widest text-electric-blue-400 uppercase font-heading">Expert Market Predictions</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-blue-400 to-neon-orange-500 mb-2 sm:mb-4 tracking-tight leading-tight font-heading drop-shadow-sm">
              MARKET CALL
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-electric-blue-100 tracking-wide font-light">
              전문가들의 예측, 데이터로 검증하다
            </p>
          </div>

          <div className="max-w-3xl mx-auto text-center px-4 sm:px-6">
            <blockquote className="relative">
              <p className="text-sm sm:text-base md:text-lg text-gray-100 leading-relaxed font-body mb-6 sm:mb-8">
                투자 전문가들이 공개적으로 내놓은 <strong className="text-electric-blue-400 font-bold">마켓 콜(Market Call)</strong>을 추적합니다.
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* 왼쪽: 정렬 버튼 */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => setSortBy('newest')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              sortBy === 'newest'
                ? 'bg-electric-blue text-white shadow-neon-blue'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setSortBy('popular')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              sortBy === 'popular'
                ? 'bg-electric-blue text-white shadow-neon-blue'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            인기순
          </button>
          <button
            onClick={() => setSortBy('return')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              sortBy === 'return'
                ? 'bg-electric-blue text-white shadow-neon-blue'
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
            className="px-4 py-2 bg-gradient-to-r from-electric-blue-600 to-electric-blue-800 hover:from-electric-blue-700 hover:to-electric-blue-900 text-white text-sm font-semibold rounded-lg transition-all shadow-neon-blue hover:shadow-lg flex items-center gap-2 whitespace-nowrap"
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
            <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-md rounded-lg shadow-glass p-12 text-center border border-gray-200 dark:border-white/10">
              <div className="flex justify-center items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue-600"></div>
                <span className="text-lg text-gray-600 dark:text-gray-400">데이터 로딩 중...</span>
              </div>
            </div>
          ) : filteredEvents.length > 0 ? (
            filteredEvents.map(event => (
              <GuruTrackingCard key={event.id} event={event} collection="market-call" />
            ))
          ) : (
            <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-md rounded-lg shadow-glass p-12 text-center border border-gray-200 dark:border-white/10">
              <div className="text-4xl font-bold text-gray-300 dark:text-gray-600 mb-4 font-heading">MARKET CALL</div>
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

      {/* 더 보기 버튼 */}
      {!loading && hasMore && (
        <div className="flex flex-col items-center gap-2 mt-8">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-8 py-3 bg-electric-blue hover:bg-electric-blue-600 text-white rounded-lg text-sm font-semibold transition-all shadow-neon-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                로딩 중...
              </span>
            ) : (
              '더 보기'
            )}
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {firebaseEvents.length} / {total}개
          </span>
        </div>
      )}

      {/* 면책 조항 */}
      <section className="mt-12 p-6 sm:p-8 bg-gradient-to-r from-electric-blue-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-l-4 border-electric-blue-600 dark:border-electric-blue-500 rounded-r-lg shadow-lg">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 tracking-wide uppercase font-heading">
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

        <div className="mt-6 pt-4 border-t border-electric-blue-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 space-y-2">
          <div className="flex gap-2"><strong className="font-semibold text-electric-blue-700 dark:text-electric-blue-400">TIMING RISK:</strong> <span>공개 발언과 실제 매매 시점은 다를 수 있습니다.</span></div>
          <div className="flex gap-2"><strong className="font-semibold text-electric-blue-700 dark:text-electric-blue-400">TRACKING METHOD:</strong> <span>발언 시점 가격 대비 현재가를 산출한 것으로, 실제 수익률과 무관합니다.</span></div>
          <div className="flex gap-2"><strong className="font-semibold text-electric-blue-700 dark:text-electric-blue-400">FOR REFERENCE ONLY:</strong> <span>이 데이터는 투자 권유가 아니며, 전문가 예측 검증을 위한 참고 자료입니다. 실제 투자의 책임은 본인에게 있습니다.</span></div>
        </div>
      </section>
    </div>
  );
}
