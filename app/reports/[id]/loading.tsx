// /reports/[id] — 글 본문 + 가격·작성자 join. SSR 동안 리포트 모양 뼈대.
import { ReportSkeleton } from '@/components/loading/Loading';

export default function ReportLoading() {
  return <ReportSkeleton />;
}
