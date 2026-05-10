import type { Metadata } from 'next';
import AnalysisClient from './AnalysisClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export const metadata: Metadata = {
  title: '한국 기업분석 — 코스피·코스닥 재무제표 5년 차트 | DART 공식 공시',
  description:
    '삼성전자·SK하이닉스·네이버·카카오·현대차 등 한국 상장사의 매출액, 영업이익, ROE, 부채비율, 영업이익률, 현금흐름을 5년/10년 시계열 차트로 한눈에. 금융감독원 DART(전자공시시스템) 공식 데이터 기반, 사업보고서 안 뒤지고도 핵심 재무지표를 즉시 확인.',
  keywords: [
    // 코어
    '한국 기업분석', '코스피 분석', '코스닥 분석', '재무제표 분석', '재무분석',
    'DART', 'DART 재무제표', 'DART 공시', '전자공시시스템', '사업보고서',
    // 지표
    '매출액 차트', '영업이익 차트', '순이익 추이', 'ROE', '자기자본이익률',
    '부채비율', '유동비율', '영업이익률', '현금흐름', '잉여현금흐름',
    // 종목별
    '삼성전자 재무제표', 'SK하이닉스 매출', '네이버 영업이익', '카카오 실적',
    '현대차 재무', 'LG에너지솔루션 분석', '셀트리온 매출',
    // 의도
    '주식 재무 분석', '기업 가치 분석', '재무 시각화', '실적 차트',
    '코스피 재무', '코스닥 재무',
  ],
  authors: [{ name: 'AntStreet' }],
  openGraph: {
    title: '한국 기업분석 — 코스피·코스닥 5년 재무 차트 | AntStreet',
    description:
      '삼성전자·SK하이닉스·네이버 등 매출·영업이익·ROE·현금흐름을 DART 공식 데이터로 시각화. 사업보고서 안 뒤지고 핵심만.',
    url: `${SITE_URL}/analysis`,
    siteName: 'AntStreet',
    images: [{ url: '/og-v2.png', width: 1731, height: 909, alt: '한국 기업분석 - AntStreet' }],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '한국 기업분석 — 코스피·코스닥 5년 재무 차트',
    description: '삼성전자·SK하이닉스·네이버 등 DART 공식 데이터 기반 재무 시각화',
    images: ['/og-v2.png'],
  },
  alternates: {
    canonical: `${SITE_URL}/analysis`,
    languages: {
      'ko-KR': `${SITE_URL}/analysis`,
      'en-US': `${SITE_URL}/analysis/us`,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

/* ─── 구조화 데이터 (JSON-LD) ─── */

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'AntStreet', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: '기업분석', item: `${SITE_URL}/analysis` },
    { '@type': 'ListItem', position: 3, name: '한국 (DART)', item: `${SITE_URL}/analysis` },
  ],
};

const webAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '한국 기업분석 - AntStreet',
  url: `${SITE_URL}/analysis`,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  description:
    '금융감독원 DART(전자공시시스템) 공식 공시 데이터를 기반으로 한국 상장사의 재무제표를 5년/10년 시계열 차트로 시각화하는 웹 애플리케이션.',
  inLanguage: 'ko-KR',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
  featureList: [
    '매출액·영업이익·순이익 5년 시계열',
    '영업이익률·ROE·ROA 수익성',
    '부채비율·유동비율 안정성',
    '영업/투자/재무활동 현금흐름',
    '관심도 트렌드 분석',
  ],
  publisher: {
    '@type': 'Organization',
    name: 'AntStreet',
    url: SITE_URL,
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '한국 기업의 재무제표 데이터는 어디서 가져오나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '금융감독원 DART(전자공시시스템) 공식 OpenAPI에서 사업보고서·반기보고서·분기보고서의 연결재무제표(CFS) 데이터를 실시간으로 가져옵니다. 분기 마감 후 새 보고서가 올라오면 자동 갱신됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '어떤 재무 지표를 볼 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '매출액, 영업이익, 순이익(손익계산서), 자산총계, 부채총계, 자본총계(재무상태표), 영업/투자/재무활동 현금흐름(현금흐름표) 등 핵심 항목과 영업이익률, ROE(자기자본이익률), ROA, 부채비율, 유동비율, 잉여현금흐름(FCF) 같은 파생 지표를 분기/연간 시계열 차트로 제공합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '어떤 한국 기업을 분석할 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '코스피·코스닥에 상장된 모든 기업을 분석할 수 있습니다. 삼성전자, SK하이닉스, 네이버, 카카오, 현대차, LG에너지솔루션, 셀트리온 등 주요 종목은 검색창에서 한글명·종목코드 어느 쪽으로든 즉시 찾을 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '미국주식도 같은 방식으로 분석할 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 상단 [미국] 탭으로 전환하면 SEC EDGAR 공식 XBRL 공시 기반의 미국 상장사 재무 분석으로 이동합니다. 엔비디아, 애플, 테슬라 등을 한글명으로 검색할 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '데이터는 얼마나 자주 갱신되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '과거 마감된 분기는 영구 캐시(절대 안 바뀜), 진행 중인 분기는 1시간 간격으로 갱신합니다. DART에 새 보고서가 올라오면 자동 반영됩니다.',
      },
    },
  ],
};

export default function AnalysisPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <AnalysisClient />
    </>
  );
}
