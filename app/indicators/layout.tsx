import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export const metadata: Metadata = {
  title: '경제 지표 대시보드 - VIX, 장단기금리차, 실업률, CPI, PCE, M2',
  description: 'FRED 경제 지표 대시보드. VIX 공포지수, 장단기금리차(T10Y2Y), 미국 실업률, CPI 소비자물가지수, PCE 물가지수, M2 통화량을 차트와 함께 확인하세요.',
  keywords: [
    '경제지표', 'VIX', '공포지수', '장단기금리차', 'T10Y2Y', 'yield curve',
    '실업률', 'CPI', '소비자물가지수', 'PCE', 'M2', '통화량',
    'FRED', '경제분석', '매크로', '금리', '인플레이션',
  ],
  openGraph: {
    title: '경제 지표 대시보드 - VIX, 장단기금리차, 실업률, CPI, PCE, M2',
    description: 'FRED 경제 지표 대시보드. VIX, 장단기금리차, 실업률, CPI, PCE, M2를 한눈에.',
  },
  alternates: {
    canonical: `${SITE_URL}/indicators`,
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'VIX 공포지수란 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'VIX는 S&P 500 옵션의 향후 30일 변동성을 나타내는 지수입니다. 20 이하면 안정, 30 이상이면 공포 구간으로 판단합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '장단기금리차(T10Y2Y)가 중요한 이유는?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '미국 10년물과 2년물 국채 금리 차이입니다. 이 값이 마이너스(역전)되면 역사적으로 경기침체가 뒤따랐기 때문에 중요한 선행 지표로 활용됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '경제 지표 데이터는 어디서 가져오나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '미국 연방준비은행(FRED)의 공식 API에서 제공하는 데이터를 사용합니다. VIX, 장단기금리차, 실업률, CPI, PCE, M2 통화량 등을 제공합니다.',
      },
    },
  ],
};

export default function IndicatorsLayout({
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
