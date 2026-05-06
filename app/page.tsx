import { Metadata } from 'next';
import HomeClient from '@/components/HomeClient';
import type { FeedData } from '@/types/feed';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export const metadata: Metadata = {
  title: {
    absolute: 'AntStreet - 13F 구루 포트폴리오 · DART 재무 · 실시간 수익률 검증 플랫폼',
  },
  description:
    '한 곳에서 보는 글로벌 투자 인사이트. ① 워렌 버핏·빌 애크먼 13F 구루 포트폴리오 추적 ② DART 재무제표 기반 한국 기업 분석 ③ FRED 경제지표(VIX·금리차·CPI) ④ 미국 시장 모닝 브리핑 ⑤ 작성가 vs 현재가 실시간 수익률 검증 리포트. 한·미·일·중·홍콩 종목 지원.',
  keywords: [
    'AntStreet', '앤트스트릿', '주식 리포트', '실시간 수익률', '수익률 인증',
    '13F', '13F 공시', '구루 포트폴리오', '워렌 버핏', '빌 애크먼', '하워드 막스',
    'DART', 'DART 재무제표', '기업 분석', '재무 분석', 'ROE', '영업이익률',
    'FRED', '경제 지표', 'VIX', '장단기금리차', 'CPI',
    '모닝 브리핑', '글로벌 시장 브리핑', '미국 시장',
    '투자 의견 컨센서스', '종목 컨센서스', '개미 투자자',
    '한국 주식', '미국 주식', '일본 주식', '코스피', '코스닥', '나스닥',
    '삼성전자', 'SK하이닉스', 'TSMC', 'NVDA', 'AAPL', 'TSLA',
  ],
  openGraph: {
    title: 'AntStreet - 13F 구루 포트폴리오 · DART 재무 · 실시간 수익률 검증',
    description:
      '워렌 버핏 13F 추적 · DART 재무 분석 · FRED 경제지표 · 모닝 브리핑 · 실시간 수익률 검증 리포트. 개미 투자자가 글로벌 인사이트를 한곳에서 보는 플랫폼.',
    url: SITE_URL,
    images: [{ url: '/og-v2.png', width: 1731, height: 909, alt: 'AntStreet' }],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

// 사이트 주요 기능을 검색엔진에 명시 (sitelinks 후보)
const homeJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/#homepage`,
      url: SITE_URL,
      name: 'AntStreet',
      description: '13F 구루 포트폴리오 · DART 재무 분석 · 실시간 수익률 검증',
      inLanguage: 'ko-KR',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      hasPart: [
        { '@type': 'SiteNavigationElement', name: '구루 포트폴리오 (13F)', url: `${SITE_URL}/guru-tracker`, description: '워렌 버핏·빌 애크먼·하워드 막스 SEC 13F 분기별 포트폴리오 추적' },
        { '@type': 'SiteNavigationElement', name: '기업 분석 (DART)', url: `${SITE_URL}/analysis`, description: 'DART 공시 기반 한국 기업 재무제표·핵심 지표 차트' },
        { '@type': 'SiteNavigationElement', name: '경제 지표 (FRED)', url: `${SITE_URL}/indicators`, description: 'VIX·장단기금리차·CPI·M2 등 미국 매크로 지표' },
        { '@type': 'SiteNavigationElement', name: '글로벌 모닝 브리핑', url: `${SITE_URL}/briefing`, description: '미국 주요 매체 기반 일일 시장 요약' },
        { '@type': 'SiteNavigationElement', name: '투자 리포트', url: `${SITE_URL}/ranking`, description: '개미 투자자 리포트 + 작성가 대비 실시간 수익률 검증' },
        { '@type': 'SiteNavigationElement', name: '종목 검색', url: `${SITE_URL}/search`, description: '한·미·일·중·홍콩 종목별 리포트와 컨센서스' },
      ],
    },
  ],
};

// 서버에서 초기 피드 데이터 fetch
async function getInitialFeed(): Promise<FeedData | null> {
  try {
    const FEED_URL = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/feed.json?alt=media`;

    const res = await fetch(FEED_URL, {
      next: { revalidate: 60 }, // 1분 캐시
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Failed to fetch initial feed:', error);
    return null;
  }
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'AntStreet는 어떤 서비스인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AntStreet는 개미 투자자들이 투자 리포트를 작성하고 실시간 수익률을 추적할 수 있는 플랫폼입니다. 한국, 미국, 일본, 중국, 홍콩 주식을 지원합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '수익률은 어떻게 계산되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '리포트 작성 시점의 주가를 기준으로 현재 실시간 주가와 비교하여 수익률을 자동 계산합니다. 매수(Long)와 매도(Short) 포지션 모두 지원합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '어떤 주식 시장을 지원하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '한국(코스피, 코스닥), 미국(NYSE, NASDAQ), 일본(도쿄증권거래소), 중국(상해, 심천), 홍콩(HKEX) 주식을 지원합니다.',
      },
    },
    {
      '@type': 'Question',
      name: 'AntStreet에서만 볼 수 있는 차별화된 기능은?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '① SEC 13F 공시 기반 워렌 버핏·빌 애크먼·하워드 막스 등 투자 대가 포트폴리오 한국어 추적, ② DART 공시 기반 한국 기업 재무제표 핵심 지표 시각화, ③ FRED 경제 지표(VIX·금리차·CPI·M2) 대시보드, ④ 미국 주요 매체 분석 기반 글로벌 모닝 브리핑, ⑤ 작성 시점 vs 현재 주가 실시간 비교로 검증되는 투자 리포트 — 이 다섯 가지를 한곳에서 제공합니다.',
      },
    },
  ],
};

// 서버 컴포넌트 - 초기 데이터를 서버에서 fetch하여 props로 전달
export default async function HomePage() {
  const initialData = await getInitialFeed();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HomeClient initialData={initialData} />
    </>
  );
}
