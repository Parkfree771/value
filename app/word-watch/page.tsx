'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GuruTrackingEvent } from '@/app/guru-tracker/types';
import GuruTrackingCard from '@/components/GuruTrackingCard';
import { MOCK_GURU_EVENTS } from '@/app/guru-tracker/mockData';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function WordWatchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedGuru, setSelectedGuru] = useState('');
  const [selectedOpinion, setSelectedOpinion] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [firebaseEvents, setFirebaseEvents] = useState<GuruTrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Firebase에서 워드워치 데이터 가져오기
  useEffect(() => {
    const fetchWordWatch = async () => {
      try {
        const wordWatchRef = collection(db, 'word-watch');
        const q = query(wordWatchRef, orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(q);

        const events: GuruTrackingEvent[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate()?.toISOString() || new Date().toISOString(),
        } as GuruTrackingEvent));

        setFirebaseEvents(events);
      } catch (error) {
        console.error('Error fetching word watch:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWordWatch();
  }, []);

  // Mock 데이터와 Firebase 데이터 합치기
  const allEvents = [...firebaseEvents, ...MOCK_GURU_EVENTS.filter(e => e.data_type === 'MENTION')];
  const mentionEvents = allEvents;

  // Apply filters
  const filteredEvents = mentionEvents
    .filter(e => !selectedGuru || e.guru_name_kr === selectedGuru)
    .filter(e => !selectedOpinion || e.badge_info.label === selectedOpinion)
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
      } else if (sortBy === 'return') {
        return (b.return_rate || 0) - (a.return_rate || 0);
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
              <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Market Visionaries Monitor</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-1.5 sm:mb-2 tracking-tight leading-tight">
              WORD WATCH
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-cyan-100 tracking-wide font-light">
              소음과 신호를 구분하는 데이터 모니터
            </p>
          </div>

          <div className="max-w-3xl mx-auto text-center px-4 sm:px-6">
            <blockquote className="relative">
              <p className="text-sm sm:text-base md:text-lg text-gray-100 leading-relaxed font-serif italic mb-4 sm:mb-5">
                시장을 지배하는 <strong className="text-cyan-300">빅 마우스(Big Mouth)</strong>들의 발언을 추적하고,
                <br className="hidden sm:block" />
                그 말을 따랐을 때의 실제 수익률을 데이터로 검증합니다.
                <br className="hidden sm:block" />
                <br className="hidden sm:block" />
                믿음의 영역이 아닌, 숫자의 영역에서 그들을 평가합니다.
              </p>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Word Watch Content */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-wide">
                SNS 발언 추적
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                시장 인플루언서들의 트위터, 인터뷰, 컨퍼런스 발언을 추적하고 그들의 예측이 맞았는지 검증합니다.
              </p>
            </div>
            {user && (
              <button
                onClick={() => router.push('/word-watch/write')}
                className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                작성하기
              </button>
            )}
          </div>

          {/* 필터 */}
          <div className="mb-6 flex flex-wrap gap-3">
            <select
              value={selectedGuru}
              onChange={(e) => setSelectedGuru(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">전체 인물</option>
              <option value="스탠리 드러켄밀러">스탠리 드러켄밀러</option>
              <option value="캐시 우드">캐시 우드</option>
              <option value="리 루">리 루</option>
              <option value="데이비드 스워츠">데이비드 스워츠</option>
            </select>
            <select
              value={selectedOpinion}
              onChange={(e) => setSelectedOpinion(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">전체 의견</option>
              <option value="BULLISH">강세 (BULLISH)</option>
              <option value="BEARISH">약세 (BEARISH)</option>
              <option value="WARNING">경고 (WARNING)</option>
              <option value="OPINION">의견 (OPINION)</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="newest">최신순</option>
              <option value="return">수익률순</option>
            </select>
          </div>
        </div>

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
              <GuruTrackingCard key={event.id} event={event} />
            ))
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
              <div className="text-4xl font-bold text-gray-300 dark:text-gray-600 mb-4">WORD WATCH</div>
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

      {/* Firebase 데이터 카운트 표시 (개발 확인용) */}
      {!loading && firebaseEvents.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          사용자 작성 글: {firebaseEvents.length}개 | Mock 데이터: {MOCK_GURU_EVENTS.filter(e => e.data_type === 'MENTION').length}개
        </div>
      )}

      {/* 면책 조항 */}
      <section className="mt-12 p-6 sm:p-8 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-l-4 border-cyan-600 dark:border-cyan-500 rounded-r-lg shadow-lg">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 tracking-wide uppercase">
          발언 추적의 한계
        </h3>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p className="leading-relaxed">
            이 페이지의 데이터는 공개된 발언을 기준으로 합니다. 실제 매매 시점과 공개 발언 시점이 다를 수 있으며,
            발언 이후 입장이 변경되었을 가능성도 있습니다.
          </p>
          <p className="leading-relaxed">
            표기된 수익률은 <strong>"발언 시점의 가격을 기준으로 따라 샀을 때"</strong>를 가정한 시뮬레이션이며,
            실제 투자 성과와는 차이가 있을 수 있습니다.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-cyan-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 space-y-2">
          <div className="flex gap-2"><strong className="font-semibold text-cyan-700 dark:text-cyan-400">TIMING RISK:</strong> <span>공개 발언과 실제 매매 시점은 다를 수 있습니다.</span></div>
          <div className="flex gap-2"><strong className="font-semibold text-cyan-700 dark:text-cyan-400">TRACKING METHOD:</strong> <span>발언 시점 가격 대비 현재가를 산출한 것으로, 실제 수익률과 무관합니다.</span></div>
          <div className="flex gap-2"><strong className="font-semibold text-cyan-700 dark:text-cyan-400">FOR ENTERTAINMENT:</strong> <span>이 데이터는 투자 권유가 아니며, 발언 검증을 위한 시뮬레이션입니다. 실제 투자의 책임은 본인에게 있습니다.</span></div>
        </div>
      </section>
    </div>
  );
}
