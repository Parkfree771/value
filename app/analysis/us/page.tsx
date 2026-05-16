import type { Metadata } from 'next';
import AnalysisUsClient from './AnalysisUsClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export const metadata: Metadata = {
  title: '미국주식 기업분석 — 엔비디아·애플·테슬라 5년 차트 | SEC EDGAR 공식',
  description:
    '엔비디아·애플·테슬라·마이크로소프트·구글·아마존 등 미국 상장사의 매출, 영업이익, ROE, 현금흐름을 한글 검색으로 5년/10년 시계열 차트로. 미국 증권거래위원회(SEC) EDGAR 공식 XBRL 공시 데이터 기반. 해외주식도 한국 사이트만큼 편하게.',
  keywords: [
    // 핵심
    '미국주식 분석', '미국 기업분석', '미국 재무제표', '해외주식 분석', '해외주식 차트',
    'SEC EDGAR', 'SEC 공시', 'XBRL', '10-K', '10-Q', 'US Securities and Exchange Commission',
    // 종목별 (한국인 검색량 최상위)
    '엔비디아 매출', '엔비디아 재무', '엔비디아 차트', 'NVDA 분석',
    '애플 매출', '애플 재무제표', 'AAPL 분석',
    '테슬라 매출', '테슬라 영업이익', 'TSLA 분석',
    '마이크로소프트 매출', 'MSFT 재무',
    '구글 매출', '알파벳 재무', 'GOOGL 분석',
    '아마존 매출', 'AMZN 재무',
    '메타 매출', 'META 재무',
    'TSMC 분석', '브로드컴 재무',
    // 의도
    '미국주식 한글 검색', '나스닥 종목 분석', 'S&P500 분석', 'NYSE 분석', 'NASDAQ 분석',
    '미국주식 영업이익률', '미국주식 ROE', '해외주식 시계열',
    '미국 빅테크 재무', 'AI 종목 분석',
  ],
  authors: [{ name: 'AntStreet' }],
  openGraph: {
    title: '미국주식 기업분석 — 엔비디아·애플·테슬라 한글 검색 | AntStreet',
    description:
      'SEC EDGAR 공식 데이터로 미국 상장사 매출·영업이익·현금흐름을 5년 시계열로. 엔비디아, 애플, 테슬라 한글로 즉시 검색.',
    url: `${SITE_URL}/analysis/us`,
    siteName: 'AntStreet',
    images: [{ url: '/og-v2.jpg', width: 1200, height: 630, alt: '미국주식 기업분석 - AntStreet' }],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '미국주식 기업분석 — SEC EDGAR 공식 5년 차트',
    description: '엔비디아·애플·테슬라 한글 검색, 매출·영업이익·현금흐름 시계열',
    images: ['/og-v2.jpg'],
  },
  alternates: {
    canonical: `${SITE_URL}/analysis/us`,
    languages: {
      'ko-KR': `${SITE_URL}/analysis/us`,
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
    { '@type': 'ListItem', position: 3, name: '미국 (SEC EDGAR)', item: `${SITE_URL}/analysis/us` },
  ],
};

const webAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '미국주식 기업분석 - AntStreet',
  url: `${SITE_URL}/analysis/us`,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  description:
    '미국 증권거래위원회(SEC) EDGAR 공식 XBRL 공시 데이터를 기반으로 미국 상장사(NASDAQ, NYSE)의 재무제표를 5년/10년 시계열 차트로 시각화. 한글·영문·티커로 검색 가능.',
  inLanguage: 'ko-KR',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
  featureList: [
    'SEC EDGAR XBRL 기반 5년 재무 시계열',
    '엔비디아·애플·테슬라 등 한글명 검색',
    '매출·영업이익·순이익 차트',
    'ROE·영업이익률 수익성',
    '부채비율·유동비율 안정성',
    '영업/투자/재무 현금흐름',
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
      name: '미국주식 재무 데이터는 어디서 가져오나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '미국 증권거래위원회(SEC)가 운영하는 EDGAR(Electronic Data Gathering, Analysis, and Retrieval) 공식 API에서 XBRL 표준으로 태깅된 10-K(연차), 10-Q(분기) 공시 데이터를 직접 가져옵니다. 미국 정부 공식 데이터로 무료 공개되어 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '엔비디아나 애플을 한글로 검색할 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네. 검색창에 "엔비디아", "애플", "테슬라", "마이크로소프트" 같은 한글명을 입력하면 자동으로 NVDA, AAPL, TSLA, MSFT 등으로 매핑되어 검색됩니다. 영문명(NVIDIA), 티커(NVDA) 어느 쪽이든 가능합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '어떤 미국 기업을 분석할 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'NASDAQ과 NYSE에 상장된 7,800여 개 미국 기업을 분석할 수 있습니다. 한국인이 자주 거래하는 200여 개 인기 종목(매그니피센트 7, 반도체, 빅테크, 헬스케어, 핀테크 등)은 한글명으로도 즉시 검색됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '어떤 재무 지표를 볼 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '매출(Revenue), 영업이익(Operating Income), 순이익(Net Income), 자산·부채·자본, 영업/투자/재무 현금흐름 등 핵심 항목과 영업이익률, 순이익률, ROE, ROA, 부채비율, 유동비율, 잉여현금흐름(FCF)을 5년/10년 시계열 차트로 제공합니다. 단위는 백만 USD.',
      },
    },
    {
      '@type': 'Question',
      name: 'NVDA의 fiscal year는 한국과 다른데 어떻게 처리되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '미국 회사의 회계연도(fiscal year)를 그대로 따릅니다. 예를 들어 NVIDIA의 FY2025는 2024년 1월 28일에 종료되는 회계연도이며, 그 시점의 회사 공시 그대로 표기됩니다. SEC EDGAR의 end date 기반으로 정확한 기간을 매핑합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '한국 기업도 같은 방식으로 분석할 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 상단 [국내] 탭으로 전환하면 금융감독원 DART(전자공시시스템) 공식 공시 기반의 한국 상장사(코스피·코스닥) 재무 분석으로 이동합니다. 삼성전자, SK하이닉스, 네이버 등을 검색할 수 있습니다.',
      },
    },
  ],
};

export default function AnalysisUsPage() {
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
      <AnalysisUsClient />
    </>
  );
}
