// 루트 loading boundary — 페이지 전환 중 첫 콘텐츠가 준비되기 전 표시 (홈 1면 모양 뼈대)
import { HomeSkeleton } from '@/components/loading/Loading';

export default function RootLoading() {
  return <HomeSkeleton />;
}
