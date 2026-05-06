import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export const metadata: Metadata = {
  title: '한국 기업 분석 - DART 재무제표 핵심 지표',
  description:
    'DART 공시 데이터 기반 한국 상장사 재무 분석 대시보드. 삼성전자·SK하이닉스·네이버·카카오·현대차의 매출액, 영업이익, 순이익, ROE, 부채비율, 영업이익률, 현금흐름을 분기/연간 시계열 차트로 시각화. 일일이 사업보고서 안 뒤져도 핵심만 한눈에.',
  keywords: [
    'DART', 'DART 재무제표', '전자공시', '한국 기업 분석', '재무 분석', '재무제표 분석',
    '매출액', '영업이익', '순이익', 'ROE', '자기자본이익률', '부채비율', '영업이익률', '현금흐름',
    '삼성전자 재무', 'SK하이닉스 재무', '네이버 재무', '카카오 재무', '현대차 재무',
    '코스피 재무', '코스닥 재무',
    '재무 시각화', '실적 차트', '주식 분석',
    'AntStreet', '앤트스트릿',
  ],
  openGraph: {
    title: '한국 기업 분석 - DART 재무제표 핵심 지표',
    description:
      'DART 공시 기반 매출·영업이익·ROE·부채비율 시계열 차트. 사업보고서 안 뒤져도 핵심 재무지표를 한눈에.',
    url: `${SITE_URL}/analysis`,
    images: [{ url: '/og-v2.png', width: 1731, height: 909, alt: 'AntStreet' }],
  },
  alternates: {
    canonical: `${SITE_URL}/analysis`,
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'DART 데이터는 어떻게 가져오나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '금융감독원 DART(전자공시시스템) 공식 OpenAPI에서 분기별 사업보고서·반기보고서·감사보고서 데이터를 가져옵니다.',
      },
    },
    {
      '@type': 'Question',
      name: '어떤 재무 지표를 볼 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '매출액, 영업이익, 순이익, ROE(자기자본이익률), 부채비율, 영업이익률, 영업현금흐름 등 투자 의사결정에 핵심적인 지표를 분기/연간 시계열 차트로 제공합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '어떤 한국 기업을 분석할 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '삼성전자, SK하이닉스, 네이버, 카카오, 현대차 등 코스피 주요 상장사를 우선 지원하며 점진적으로 확대 중입니다.',
      },
    },
  ],
};

export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
