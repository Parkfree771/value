'use client';

import dynamic from 'next/dynamic';

// 수익률 차트 — recharts 번들이 무거우므로 첫 화면 JS 에서 빼고 따로 불러온다.
// 회원 리포트 상세 · 전문가 추적 상세가 같이 쓴다. 스켈레톤은 차트 카드 높이를 유지해 레이아웃이 밀리지 않게.
const LazyPriceChart = dynamic(() => import('@/components/PriceChart'), {
  ssr: false,
  loading: () => (
    <div className="border-t-2 border-[var(--theme-border)] pt-3">
      <div className="flex items-start justify-between mb-4 sm:mb-5">
        <div className="space-y-2">
          <div className="h-4 w-24 skel" />
          <div className="h-3 w-32 skel" />
        </div>
        <div className="h-7 w-24 skel" />
      </div>
      <div className="h-[180px] sm:h-[220px] skel" />
    </div>
  ),
});

export default LazyPriceChart;
