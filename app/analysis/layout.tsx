import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export const metadata: Metadata = {
  title: '기업 분석 - DART 재무제표 기반 핵심 지표',
  description: 'DART 공시 데이터 기반 기업 재무 분석. 삼성전자, SK하이닉스, 네이버, 카카오, 현대차의 매출액, 영업이익, ROE, 부채비율 등 핵심 재무 지표를 차트로 확인하세요.',
  keywords: [
    '기업분석', 'DART', '재무제표', '매출액', '영업이익', '순이익',
    'ROE', '부채비율', '영업이익률', '현금흐름', '삼성전자', 'SK하이닉스',
    '네이버', '카카오', '현대차', '주식분석', '재무분석',
  ],
  openGraph: {
    title: '기업 분석 - DART 재무제표 기반 핵심 지표',
    description: 'DART 공시 데이터로 보는 핵심 재무 지표. 매출, 영업이익, ROE, 부채비율을 한눈에.',
  },
  alternates: {
    canonical: `${SITE_URL}/analysis`,
  },
};

export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
