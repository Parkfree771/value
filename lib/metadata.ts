import { Metadata } from 'next';
import { Report } from '@/types/report';
import { formatReturnRate } from './stockPrice';

const SITE_NAME = 'AntStreet';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

const THEME_NAMES: Record<string, string> = {
  'physical-ai': '피지컬AI',
  'quantum-computing': '양자컴퓨터',
  'secondary-battery': '2차전지',
  'ai-semiconductor': 'AI반도체',
  'robotics': '로봇',
  'autonomous-driving': '자율주행',
  'bio-healthcare': '바이오/헬스케어',
  'space-aerospace': '우주항공',
  'nuclear-energy': '원자력',
  'defense': '방산',
};

function opinionLabel(opinion: Report['opinion']): string {
  return opinion === 'buy' ? '매수' : opinion === 'sell' ? '매도' : '보유';
}

function positionLabel(positionType?: 'long' | 'short'): string {
  return positionType === 'short' ? '숏' : '롱';
}

function tickerVariants(ticker: string): string[] {
  if (!ticker) return [];
  const variants = new Set<string>([ticker]);
  // 005930.KS → 005930
  const noSuffix = ticker.replace(/\.[A-Z]{1,3}$/i, '');
  if (noSuffix !== ticker) variants.add(noSuffix);
  // 대문자 변형
  variants.add(ticker.toUpperCase());
  return Array.from(variants);
}

/**
 * 동적 OG 이미지 URL 빌더
 * /api/og가 ImageResponse로 1200x630 PNG 렌더 (Edge Runtime, ~200ms 콜드 / SNS 캐시 7일)
 */
function buildOgImageUrl(report: Report, returnRate: number): string {
  const currency = report.stockData?.currency || (report.exchange === 'KRX' ? 'KRW' : 'USD');
  const params = new URLSearchParams({
    title: report.title || '',
    stockName: report.stockName || '',
    ticker: report.ticker || '',
    exchange: report.exchange || '',
    currency,
    initialPrice: String(report.initialPrice ?? 0),
    currentPrice: String(report.currentPrice ?? 0),
    returnRate: String(returnRate ?? 0),
    author: report.author || '익명',
    date: report.createdAt || '',
    positionType: report.positionType || 'long',
  });
  return `${SITE_URL}/api/og?${params.toString()}`;
}

function buildKeywords(report: Report): string[] {
  const op = opinionLabel(report.opinion);
  const pos = positionLabel(report.positionType);
  const themes = (report.themes || []).map((t) => THEME_NAMES[t] || t);
  const tickers = tickerVariants(report.ticker);

  const baseKeywords = [
    report.stockName,
    ...tickers,
    // 종목명 + 의도 (한국 개미가 실제로 치는 패턴)
    `${report.stockName} 주가`,
    `${report.stockName} 분석`,
    `${report.stockName} 전망`,
    `${report.stockName} 리포트`,
    `${report.stockName} ${op}`,
    `${report.stockName} ${op} 의견`,
    `${report.stockName} 목표주가`,
    `${report.stockName} 매수 매도`,
    `${report.stockName} 투자`,
    // 티커 + 의도
    report.ticker ? `${report.ticker} 종목분석` : '',
    report.ticker ? `${report.ticker} 분석` : '',
    report.ticker ? `${report.ticker} 차트` : '',
    // 일반
    `${op} 의견`,
    `${pos} 포지션`,
    '주식 리포트', '투자 분석', '종목 분석', '투자 의견',
    '수익률 인증', '실시간 수익률', '수익률 검증',
    SITE_NAME, '앤트스트릿', '개미투자자',
  ];

  return [...baseKeywords, ...themes].filter(Boolean) as string[];
}

function buildContentPreview(content: string, maxLen = 90): string {
  return content
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/^#+\s+/gm, '')
    .replace(/^-\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, maxLen);
}

function relativeTimeLabel(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 30) return `${days}일 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

function formatPrice(price: number): string {
  if (!price) return '-';
  return price.toLocaleString();
}

/**
 * 리포트 상세 페이지의 동적 메타데이터를 생성합니다.
 * - 수익률은 매번 렌더 시 최신값 반영 (ISR 1시간)
 * - 종목명/티커/포지션/테마 키워드 폭넓게 포함
 * - article:modified_time으로 검색엔진에 변경 알림
 */
export function generateReportMetadata(
  report: Report,
  currentReturnRate?: number,
): Metadata {
  const returnRate = currentReturnRate ?? report.returnRate;
  const returnRateText = formatReturnRate(returnRate);
  const op = opinionLabel(report.opinion);
  const pos = positionLabel(report.positionType);
  const timeAgo = relativeTimeLabel(report.createdAt);

  // 제목: layout template "%s | AntStreet" 가 브랜드를 뒤에 붙이므로 여기선 본문만
  // 종목코드와 수익률을 포함하여 검색 매칭 강화 (한국 검색결과는 페이지명이 앞이어야 CTR↑)
  const titleCore = `${report.title}`;
  const titleSuffix =
    report.stockName && !report.title.includes(report.stockName)
      ? ` - ${report.stockName}(${report.ticker}) ${op}의견 ${returnRateText}`
      : ` (${returnRateText})`;
  const title = `${titleCore}${titleSuffix}`;

  // 설명: 핵심 가격 정보 + 본문 미리보기
  const priceLine = report.initialPrice
    ? `작성가 ${formatPrice(report.initialPrice)} → 현재가 ${formatPrice(report.currentPrice)}`
    : '';
  const targetLine = report.targetPrice ? ` (목표 ${formatPrice(report.targetPrice)})` : '';
  const preview = buildContentPreview(report.content, 80);
  const description = [
    `${report.stockName}(${report.ticker}) ${op} 리포트.`,
    priceLine ? `${priceLine}${targetLine}, 수익률 ${returnRateText}.` : `수익률 ${returnRateText}.`,
    preview ? `${preview}...` : '',
    `| ${report.author} 작성, ${timeAgo}`,
  ]
    .filter(Boolean)
    .join(' ')
    .substring(0, 200);

  // OG 이미지: 동적 (피드 카드형) — /api/og 라우트가 1200x630 PNG 렌더
  const ogImageUrl = buildOgImageUrl(report, returnRate);
  const themeTags = (report.themes || []).map((t) => THEME_NAMES[t] || t);
  const lastModified =
    report.updatedAt && report.updatedAt.length > 0
      ? new Date(report.updatedAt[report.updatedAt.length - 1]).toISOString()
      : new Date().toISOString();

  const metadata: Metadata = {
    title,
    description,
    keywords: buildKeywords(report),
    authors: [{ name: report.author, url: `${SITE_URL}/user/${encodeURIComponent(report.author)}` }],
    creator: report.author,
    publisher: SITE_NAME,
    category: '투자 리포트',
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${SITE_URL}/reports/${report.id}`,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      publishedTime: new Date(report.createdAt).toISOString(),
      modifiedTime: lastModified,
      authors: [report.author],
      section: '투자 리포트',
      tags: [report.stockName, report.ticker, op, pos, ...themeTags].filter(Boolean) as string[],
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${report.stockName}(${report.ticker}) ${op} ${returnRateText} - ${report.title}`,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: `@${report.author}`,
      images: [ogImageUrl],
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
      types: {
        'application/rss+xml': `${SITE_URL}/feed.xml`,
      },
    },
    other: {
      // 네이버/다음에서 활용
      'article:published_time': new Date(report.createdAt).toISOString(),
      'article:modified_time': lastModified,
      'article:author': report.author,
      'article:section': '투자 리포트',
      'article:tag': [report.stockName, report.ticker, op, ...themeTags]
        .filter(Boolean)
        .join(','),
      // 종목 정보 (rich snippet 후보)
      'stock:symbol': report.ticker,
      'stock:name': report.stockName,
      'stock:opinion': op,
      'stock:return_rate': `${returnRate.toFixed(2)}%`,
    },
  };

  return metadata;
}

/**
 * JSON-LD 구조화된 데이터를 생성합니다.
 * - NewsArticle: 네이버가 일반 Article보다 가중치 높게 봄
 * - dateModified로 수익률 갱신 시 검색엔진 재인덱싱 유도
 * - Speakable: 음성 검색(구글 어시스턴트, 빅스비) 대응
 * - FinancialProduct: 종목 자체에 대한 구조화된 메타데이터
 */
export function generateReportJsonLd(
  report: Report,
  currentReturnRate?: number,
): string {
  const returnRate = currentReturnRate ?? report.returnRate;
  const op = opinionLabel(report.opinion);
  const themeTags = (report.themes || []).map((t) => THEME_NAMES[t] || t);
  const ogImageUrl = `${SITE_URL}/og-v2.png`;
  const cleanContent = buildContentPreview(report.content, 5000);
  const lastModified =
    report.updatedAt && report.updatedAt.length > 0
      ? new Date(report.updatedAt[report.updatedAt.length - 1]).toISOString()
      : new Date().toISOString();

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'NewsArticle',
      '@id': `${SITE_URL}/reports/${report.id}#article`,
      headline: report.title.substring(0, 110),
      alternativeHeadline: `${report.stockName}(${report.ticker}) ${op} - 수익률 ${returnRate.toFixed(2)}%`,
      description: buildContentPreview(report.content, 200),
      author: {
        '@type': 'Person',
        name: report.author,
        url: `${SITE_URL}/user/${encodeURIComponent(report.author)}`,
      },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/og-v2.png`,
          width: 1731,
          height: 909,
        },
      },
      datePublished: new Date(report.createdAt).toISOString(),
      dateModified: lastModified,
      inLanguage: 'ko-KR',
      image: [ogImageUrl],
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/reports/${report.id}`,
      },
      articleSection: '투자 리포트',
      keywords: [
        report.stockName,
        report.ticker,
        ...tickerVariants(report.ticker),
        '주식 리포트',
        '투자 분석',
        op,
        ...themeTags,
      ]
        .filter(Boolean)
        .join(', '),
      articleBody: cleanContent,
      wordCount: cleanContent.split(/\s+/).length,
      about: {
        '@type': 'Corporation',
        name: report.stockName,
        identifier: report.ticker,
      },
      mentions: [
        {
          '@type': 'Thing',
          name: `${report.stockName} (${report.ticker})`,
          identifier: report.ticker,
        },
        ...themeTags.map((t) => ({ '@type': 'Thing', name: t })),
      ],
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['h1', '.article-content p:first-of-type'],
      },
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
      additionalProperty: [
        { '@type': 'PropertyValue', name: '투자 의견', value: op },
        { '@type': 'PropertyValue', name: '포지션', value: positionLabel(report.positionType) },
        { '@type': 'PropertyValue', name: '수익률', value: `${returnRate.toFixed(2)}%` },
        { '@type': 'PropertyValue', name: '작성가', value: report.initialPrice?.toString() || '0' },
        { '@type': 'PropertyValue', name: '현재가', value: report.currentPrice?.toString() || '0' },
        ...(report.targetPrice
          ? [{ '@type': 'PropertyValue', name: '목표가', value: report.targetPrice.toString() }]
          : []),
        ...(report.stockData?.per
          ? [{ '@type': 'PropertyValue', name: 'PER', value: report.stockData.per.toFixed(2) }]
          : []),
        ...(report.stockData?.pbr
          ? [{ '@type': 'PropertyValue', name: 'PBR', value: report.stockData.pbr.toFixed(2) }]
          : []),
      ],
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${SITE_URL}/reports/${report.id}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: '리포트', item: `${SITE_URL}/ranking` },
        { '@type': 'ListItem', position: 3, name: report.stockName || report.title },
      ],
    },
  ];

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph,
  });
}

/**
 * 메인 페이지 메타데이터를 생성합니다.
 */
export function generateHomeMetadata(): Metadata {
  return {
    title: `${SITE_NAME} - 주식 리포트 & 수익률 인증 플랫폼`,
    description:
      '실시간 수익률 검증이 가능한 주식 리포트 플랫폼. 투자자들의 매수/매도 리포트와 실제 수익률을 확인하세요. 개미 투자자들의 집단 지혜로 함께 성장하세요.',
    keywords: [
      '주식 투자',
      '주식 리포트',
      '투자 분석',
      '수익률 인증',
      'AntStreet',
      '앤트스트릿',
      '개미투자자',
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
