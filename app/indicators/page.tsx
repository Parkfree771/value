import dynamic from 'next/dynamic';
import { PageLoading } from '@/components/loading/Loading';

// EconomicClient는 recharts(AreaChart, Brush, ReferenceLine 등 다수) + 1000줄짜리 클라이언트 컴포넌트라
// 페이지에 진입할 때만 청크 로드되도록 lazy. 모바일 초기 번들 보호.
const EconomicClient = dynamic(() => import('./EconomicClient'), {
  loading: () => <PageLoading label="경제지표를 불러오는 중" />,
});

export default function IndicatorsPage() {
  return <EconomicClient />;
}
