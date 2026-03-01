import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '경제 지표 대시보드 - VIX, 장단기금리차, 실업률, CPI, PCE, M2',
  description: 'FRED 경제 지표 대시보드. VIX 공포지수, 장단기금리차(T10Y2Y), 미국 실업률, CPI 소비자물가지수, PCE 물가지수, M2 통화량을 차트와 함께 확인하세요.',
  keywords: [
    '경제지표', 'VIX', '공포지수', '장단기금리차', 'T10Y2Y', 'yield curve',
    '실업률', 'CPI', '소비자물가지수', 'PCE', 'M2', '통화량',
    'FRED', '경제분석', '매크로', '금리', '인플레이션',
  ],
  openGraph: {
    title: '경제 지표 대시보드 | AntStreet',
    description: 'FRED 경제 지표 대시보드. VIX, 장단기금리차, 실업률, CPI, PCE, M2를 한눈에.',
  },
  alternates: {
    canonical: '/indicators',
  },
};

export default function IndicatorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
