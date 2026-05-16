import dynamic from 'next/dynamic';

// EconomicClient는 recharts(AreaChart, Brush, ReferenceLine 등 다수) + 1000줄짜리 클라이언트 컴포넌트라
// 페이지에 진입할 때만 청크 로드되도록 lazy. 모바일 초기 번들 보호.
const EconomicClient = dynamic(() => import('./EconomicClient'), {
  loading: () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="card-base p-6 sm:p-12 text-center">
        <div className="inline-block w-8 h-8 border-2 border-ant-red-600 border-t-transparent animate-spin mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">경제지표를 불러오는 중...</p>
      </div>
    </div>
  ),
});

export default function IndicatorsPage() {
  return <EconomicClient />;
}
