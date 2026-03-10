import { Metadata } from 'next';
import HomeClient from '@/components/HomeClient';
import type { FeedData } from '@/types/feed';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

export const metadata: Metadata = {
  title: {
    absolute: 'AntStreet - 주식 리포트 & 실시간 수익률 인증 플랫폼',
  },
  description: '개미 투자자들의 투자 리포트 공유 플랫폼. 한국, 미국, 일본, 중국, 홍콩 주식 리포트를 작성하고 실시간 수익률을 추적하세요. 수익률 랭킹, 투자자 랭킹, 13F 구루 포트폴리오 추적.',
  openGraph: {
    title: 'AntStreet - 주식 리포트 & 실시간 수익률 인증 플랫폼',
    description: '개미 투자자들의 투자 리포트 공유 플랫폼. 실시간 수익률 추적, 수익률 랭킹, 13F 구루 포트폴리오.',
    url: SITE_URL,
  },
  alternates: {
    canonical: SITE_URL,
  },
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
  ],
};

// 서버 컴포넌트 - 초기 데이터를 서버에서 fetch하여 props로 전달
export default async function HomePage() {
  const initialData = await getInitialFeed();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HomeClient initialData={initialData} />
    </>
  );
}
