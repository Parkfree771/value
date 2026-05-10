/**
 * /analysis 공통 레이아웃 — 자식 페이지(/analysis 국내, /analysis/us 미국)에
 * 공통 적용. 시장별 메타데이터/구조화 데이터는 각 page.tsx에서 정의.
 */
export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
