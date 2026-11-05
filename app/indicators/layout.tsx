import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export const metadata: Metadata = {
  title: '경제 지표 — 미국 VIX·장단기금리차·CPI·M2 · 한국 물가·경상수지·소비자심리',
  description:
    '미국(FRED)·한국(한국은행 ECOS) 핵심 경제 지표를 차트로. VIX 공포지수, 장단기금리차(T10Y2Y), 실업률, CPI·PCE 물가상승률, M2 통화량, 크레딧 스프레드와 한국 소비자물가·생산자물가·M2·경상수지·주택가격·소비자심리지수(CSI)를 1개월~전체 기간으로 확인하세요.',
  keywords: [
    '경제지표', '경제 지표 대시보드', '매크로 지표',
    'VIX', '공포지수', '장단기금리차', 'T10Y2Y', '금리 역전', 'yield curve',
    '미국 실업률', '미국 CPI', 'CPI 발표', 'PCE', 'PCE 물가', 'M2', '통화량', '크레딧 스프레드', '하이일드 스프레드',
    '한국 소비자물가', '한국 CPI', '생산자물가지수', 'PPI', '경상수지', '주택매매가격지수', '소비자심리지수', 'CSI',
    'FRED', 'ECOS', '한국은행 경제통계', '경제분석', '금리', '인플레이션',
  ],
  openGraph: {
    type: 'website',
    title: '경제 지표 — 미국 VIX·금리차·CPI·M2 · 한국 물가·경상수지·소비자심리',
    description: '미국 FRED · 한국은행 ECOS 핵심 경제 지표를 차트로 한눈에.',
    url: `${SITE_URL}/indicators`,
    siteName: 'AntStreet',
    locale: 'ko_KR',
    images: [{ url: '/api/og/site', width: 1200, height: 630, alt: 'AntStreet 경제 지표' }],
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
        text: '미국 지표는 세인트루이스 연방준비은행(FRED), 한국 지표는 한국은행 경제통계시스템(ECOS)의 공식 API 데이터를 사용합니다.',
      },
    },
  ],
};

// 지표 묶음을 Dataset 으로 — 구글 데이터셋 검색 대상
const datasetJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Dataset',
      name: '미국 핵심 경제 지표 (FRED)',
      description: 'VIX 공포지수, 장단기금리차(T10Y2Y), 실업률, PCE·CPI 물가상승률, M2 통화량, Baa·Aaa 크레딧 스프레드 시계열',
      url: `${SITE_URL}/indicators`,
      inLanguage: 'ko-KR',
      isAccessibleForFree: true,
      creator: { '@type': 'Organization', name: 'Federal Reserve Bank of St. Louis', url: 'https://fred.stlouisfed.org' },
      keywords: ['VIX', 'T10Y2Y', 'UNRATE', 'CPI', 'PCE', 'M2'],
    },
    {
      '@type': 'Dataset',
      name: '한국 핵심 경제 지표 (한국은행 ECOS)',
      description: '소비자물가지수, M2 통화량, 생산자물가지수, 경상수지, 주택매매가격지수, 소비자심리지수(CSI) 시계열',
      url: `${SITE_URL}/indicators`,
      inLanguage: 'ko-KR',
      isAccessibleForFree: true,
      creator: { '@type': 'Organization', name: '한국은행', url: 'https://ecos.bok.or.kr' },
      keywords: ['소비자물가', 'PPI', '경상수지', '주택가격', '소비자심리지수'],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />
      {children}
    </>
  );
}
