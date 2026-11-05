import type { Metadata } from 'next';
import { getFeedData } from '@/lib/feedData';
import RankingClient from './RankingClient';
import { formatRate, ogCardUrl, seoStockName } from '@/lib/metadata';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

const baseMetadata: Metadata = {
  title: '수익률 랭킹 · 검증된 투자자 랭킹',
  description:
    '작성가 vs 현재가로 검증되는 투자 리포트 수익률 랭킹. 최고 수익률 리포트, 누적 수익률 상위 투자자, 인기 리포트를 매일 장 마감 종가 기준으로 확인하세요. 한·미·일·중·홍콩 종목 모두 같은 기준으로 비교됩니다. 결과로 증명된 개미 투자자를 찾는 가장 빠른 방법.',
  keywords: [
    '주식 수익률 랭킹', '실시간 수익률 랭킹', '리포트 수익률 랭킹',
    '투자자 랭킹', '인기 투자자', '검증된 투자자', '실력 투자자',
    '인기 리포트', '오늘의 리포트', '주간 인기 리포트',
    '주식 잘하는 사람', '수익률 인증', '실제 수익률', '주식 고수',
    '한국 주식 수익률', '미국 주식 수익률',
    'AntStreet', '앤트스트릿',
  ],
  openGraph: {
    title: 'AntStreet | 수익률 랭킹 · 검증된 투자자 랭킹',
    description:
      '작성가 vs 현재가로 자동 검증되는 리포트·투자자 랭킹. 결과로 증명된 개미 투자자를 한눈에.',
    url: `${SITE_URL}/ranking`,
    images: [{ url: '/api/og/site', width: 1200, height: 630, alt: 'AntStreet' }],
  },
  alternates: {
    canonical: `${SITE_URL}/ranking`,
  },
};

// 지금 1위 수익률을 제목·설명·OG 카드에 — 검색결과에서 "얼마나 벌었나"가 바로 보이게
export async function generateMetadata(): Promise<Metadata> {
  const data = await getFeedData();
  const top = [...((data?.posts ?? []) as unknown as FeedPost[])]
    .filter((p) => Number.isFinite(p.returnRate))
    .sort((a, b) => b.returnRate - a.returnRate)
    .slice(0, 3);
  if (top.length === 0) return baseMetadata;

  const best = top[0];
  const title = `수익률 랭킹 · 1위 ${formatRate(best.returnRate)} ${seoStockName(best.stockName, best.ticker)}`;
  const description = [
    `지금 수익률 1위 리포트는 ${seoStockName(best.stockName, best.ticker)} ${formatRate(best.returnRate)}(${best.author}).`,
    top.length > 1
      ? `이어서 ${top
          .slice(1)
          .map((p) => `${seoStockName(p.stockName, p.ticker)} ${formatRate(p.returnRate)}`)
          .join(', ')}.`
      : '',
    '작성가 대비 현재가로 자동 검증되는 리포트·투자자 랭킹. 한·미·일·중·홍콩 종목을 같은 기준으로 비교합니다.',
  ]
    .filter(Boolean)
    .join(' ');
  const ogImage = ogCardUrl({
    kicker: '수익률 랭킹 · 장 마감 기준',
    title: '수익률 랭킹',
    sub: '작성가 대비 현재가 · 자동 검증',
    metrics: top.map((p, i) => ({ label: `${i + 1}위 ${seoStockName(p.stockName, p.ticker)}`, value: formatRate(p.returnRate) })),
  });

  return {
    ...baseMetadata,
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}/ranking`,
      siteName: 'AntStreet',
      locale: 'ko_KR',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  };
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'AntStreet 랭킹은 어떻게 산정되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '리포트 작성 시점의 주가 대비 장 마감 종가를 기준으로 매일 수익률을 계산합니다. 수익률 랭킹, 투자자 랭킹, 인기글 랭킹을 제공합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '수익률은 언제 업데이트되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '각 시장이 마감한 뒤 종가로 하루 한 번 갱신됩니다. 한국·일본·중국·홍콩은 오후 4~7시, 미국은 오전 6~9시(한국 시간)에 반영되며, 장중 시세는 반영하지 않습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '투자자 랭킹은 어떤 기준인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '작성한 리포트들의 평균 수익률, 리포트 수, 조회수, 좋아요 수 등을 종합적으로 반영하여 투자자 순위를 산정합니다.',
      },
    },
  ],
};

export const revalidate = 86400; // 하루짜리 안전장치 — 실제 갱신은 데이터가 바뀔 때 신호로 (lib/cache.ts)

type FeedPost = {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  levelPoints?: number;
  stockName: string;
  ticker: string;
  exchange?: string;
  opinion: 'buy' | 'sell' | 'hold';
  positionType?: 'long' | 'short';
  returnRate: number;
  prevReturnRate?: number;
  returnRate1D?: number | null;
  returnRate1W?: number | null;
  returnRate1M?: number | null;
  initialPrice: number;
  currentPrice: number;
  createdAt: string;
  views: number;
  likes: number;
  themes?: string[];
  priceHistory?: Array<{ date: string; price: number; returnRate: number }>;
};

export default async function RankingPage() {
  const data = await getFeedData();
  const posts: FeedPost[] = (data?.posts ?? []) as unknown as FeedPost[];

  // 데이터 전처리 (서버에서 수행)
  const today = new Date();

  const reportsWithDays = posts
    .map((report) => {
      const createdDate = new Date(report.createdAt);
      const diffTime = Math.abs(today.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...report,
        daysElapsed: diffDays,
        priceHistory: report.priceHistory || [],
      };
    })
    .sort((a, b) => b.returnRate - a.returnRate);

  // 인기글 (조회수 + 좋아요 기준)
  const trendingData = [...reportsWithDays].sort((a, b) => {
    const scoreA = (a.views || 0) + (a.likes || 0) * 2;
    const scoreB = (b.views || 0) + (b.likes || 0) * 2;
    return scoreB - scoreA;
  });

  // 투자자 데이터 (작성자별 평균 수익률)
  const authorMap = new Map<string, { totalReturn: number; count: number; author: string; levelPoints?: number }>();
  reportsWithDays.forEach((report) => {
    const existing = authorMap.get(report.author);
    if (existing) {
      existing.totalReturn += report.returnRate;
      existing.count += 1;
    } else {
      authorMap.set(report.author, {
        totalReturn: report.returnRate,
        count: 1,
        author: report.author,
        levelPoints: report.levelPoints,
      });
    }
  });

  const investorsData = Array.from(authorMap.values())
    .map(({ author, totalReturn, count, levelPoints }) => ({
      rank: 0,
      name: author,
      levelPoints,
      avgReturnRate: totalReturn / count,
      totalReports: count,
      totalLikes: reportsWithDays
        .filter((r) => r.author === author)
        .reduce((sum, r) => sum + (r.likes || 0), 0),
      winCount: reportsWithDays.filter((r) => r.author === author && r.returnRate > 0).length,
    }))
    .sort((a, b) => b.avgReturnRate - a.avgReturnRate)
    .map((investor, index) => ({ ...investor, rank: index + 1 }));

  // 수익률 상위 20 리포트 — 검색엔진에 랭킹 목록을 구조화해 넘긴다
  const topListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '수익률 랭킹',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: reportsWithDays.slice(0, 20).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/reports/${r.id}`,
      name: `${seoStockName(r.stockName, r.ticker)} ${formatRate(r.returnRate)} · ${r.title}`.slice(0, 110),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(topListJsonLd) }}
      />
      <RankingClient
        initialReports={reportsWithDays}
        initialInvestors={investorsData}
        initialTrending={trendingData}
      />
    </>
  );
}
