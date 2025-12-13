import { Metadata } from 'next';
import { Report } from '@/types/report';
import { formatReturnRate } from './stockPrice';

const SITE_NAME = '워렌버핏 따라잡기';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://warrennvalue.netlify.app';

/**
 * 리포트 상세 페이지의 동적 메타데이터를 생성합니다.
 * @param report 리포트 데이터
 * @param currentReturnRate 현재 수익률 (실시간 계산된 값)
 * @returns Next.js Metadata 객체
 */
export function generateReportMetadata(
  report: Report,
  currentReturnRate?: number
): Metadata {
  const returnRate = currentReturnRate ?? report.returnRate;
  const returnRateText = formatReturnRate(returnRate);

  // 메타 타이틀: 리포트 제목을 중심으로, 작성 당시 대비 수익률 표시
  const title = `${report.title} (작성 당시 대비 ${returnRateText}) - ${SITE_NAME}`;

  // 작성 날짜 계산
  const createdDate = new Date(report.createdAt);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

  let timeAgo = '';
  if (daysDiff === 0) {
    timeAgo = '오늘';
  } else if (daysDiff === 1) {
    timeAgo = '어제';
  } else if (daysDiff < 30) {
    timeAgo = `${daysDiff}일 전`;
  } else if (daysDiff < 365) {
    const months = Math.floor(daysDiff / 30);
    timeAgo = `${months}개월 전`;
  } else {
    const years = Math.floor(daysDiff / 365);
    timeAgo = `${years}년 전`;
  }

  // 메타 설명: 리포트 내용 중심으로 간단하게
  // 리포트 내용의 첫 100자를 가져와서 사용
  const contentPreview = report.content
    .replace(/^#+\s+/gm, '') // 마크다운 헤더 제거
    .replace(/^-\s+/gm, '') // 리스트 마커 제거
    .replace(/\n+/g, ' ') // 개행 제거
    .trim()
    .substring(0, 100);

  const description = `${report.stockName}(${report.ticker}) 투자 리포트. ${contentPreview}... | ${timeAgo} 작성, 작성 당시 대비 ${returnRateText}`;

  // 기본 메타데이터
  const metadata: Metadata = {
    title,
    description,
    keywords: [
      report.stockName,
      report.ticker,
      '주식 리포트',
      '투자 분석',
      `${report.opinion === 'buy' ? '매수' : report.opinion === 'sell' ? '매도' : '보유'} 추천`,
      SITE_NAME,
      '주식 투자',
      '가치 투자',
    ],
    authors: [{ name: report.author }],
    creator: report.author,
    publisher: SITE_NAME,
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${SITE_URL}/reports/${report.id}`,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      publishedTime: report.createdAt,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      creator: `@${report.author}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: `${SITE_URL}/reports/${report.id}`,
    },
  };

  return metadata;
}

/**
 * JSON-LD 구조화된 데이터를 생성합니다.
 * @param report 리포트 데이터
 * @param currentReturnRate 현재 수익률
 * @returns JSON-LD 스크립트 태그 문자열
 */
export function generateReportJsonLd(
  report: Report,
  currentReturnRate?: number
): string {
  const returnRate = currentReturnRate ?? report.returnRate;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: report.title,
    description: report.content.substring(0, 200),
    author: {
      '@type': 'Person',
      name: report.author,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    datePublished: report.createdAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/reports/${report.id}`,
    },
    about: {
      '@type': 'FinancialProduct',
      name: report.stockName,
      identifier: report.ticker,
    },
    keywords: `${report.stockName}, ${report.ticker}, 주식 리포트, 투자 분석`,
    articleBody: report.content,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: report.likes || 0,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ViewAction',
        userInteractionCount: report.views || 0,
      },
    ],
    // 투자 관련 추가 정보
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: '투자 의견',
        value: report.opinion === 'buy' ? '매수' : report.opinion === 'sell' ? '매도' : '보유',
      },
      {
        '@type': 'PropertyValue',
        name: '수익률',
        value: `${returnRate.toFixed(2)}%`,
      },
      {
        '@type': 'PropertyValue',
        name: '초기 가격',
        value: report.initialPrice.toString(),
      },
      {
        '@type': 'PropertyValue',
        name: '현재 가격',
        value: report.currentPrice.toString(),
      },
    ],
  };

  return JSON.stringify(jsonLd);
}

/**
 * 메인 페이지 메타데이터를 생성합니다.
 */
export function generateHomeMetadata(): Metadata {
  return {
    title: `${SITE_NAME} - 주식 리포트 & 수익률 인증 플랫폼`,
    description:
      '실시간 수익률 검증이 가능한 주식 리포트 플랫폼. 투자자들의 매수/매도 리포트와 실제 수익률을 확인하세요. 워렌버핏처럼 투자하는 방법을 배우세요.',
    keywords: [
      '주식 투자',
      '주식 리포트',
      '투자 분석',
      '수익률 인증',
      '워렌버핏',
      'value investing',
      '가치 투자',
    ],
    openGraph: {
      type: 'website',
      title: `${SITE_NAME} - 주식 리포트 & 수익률 인증 플랫폼`,
      description: '실시간 수익률 검증이 가능한 주식 리포트 플랫폼',
      url: SITE_URL,
      siteName: SITE_NAME,
      locale: 'ko_KR',
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
