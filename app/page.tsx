import { Metadata } from 'next';
import { cookies } from 'next/headers';
import HomeClient from '@/components/HomeClient';
import type { FeedData } from '@/types/feed';
import { createClient } from '@/utils/supabase/server';
import { getLatestPrices } from '@/lib/priceCache';
import { calculateReturn } from '@/utils/calculateReturn';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

// ISR — 1시간 캐시 (그러나 실제로는 가격 cron 완료 / 글 작성/삭제 시 /api/revalidate · revalidatePath('/')로 즉시 무효화)
// 가격 cron이 하루 6번 (아시아 3 + 미국 3) 트리거하므로 그 외엔 캐시 유지 → egress 최소
export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    absolute: '주식 리포트 공유 · 작성가 대비 실시간 수익률 검증 | AntStreet',
  },
  description:
    '한·미·일·중·홍콩 주식 분석을 공유하고, 작성가 대비 현재가로 수익률이 자동 검증되는 투자 커뮤니티. 매수·매도 의견의 결과가 실시간으로 추적되며, 검증된 실력의 투자자 리포트를 찾을 수 있습니다.',
  keywords: [
    // 메인 진입 키워드
    '주식 리포트', '주식 분석', '주식 SNS', '투자 커뮤니티', '투자 의견 공유',
    '주식 인사이트', '종목 분석', '매수 의견', '매도 의견',
    // 차별점
    '실시간 수익률', '수익률 인증', '수익률 검증', '리포트 수익률 추적',
    '검증된 투자자', '주식 고수', '개미 투자자',
    // 시장 커버리지
    '한국 주식', '미국 주식', '일본 주식', '중국 주식', '홍콩 주식',
    '코스피', '코스닥', '나스닥', 'S&P 500',
    // 종목별 long-tail 진입
    '삼성전자 분석', 'SK하이닉스 분석', '엔비디아 분석', 'NVDA 분석',
    'TSLA 분석', '테슬라 분석', 'AAPL 분석',
    // 브랜드
    'AntStreet', '앤트스트릿', '앤트스트리트',
  ],
  openGraph: {
    title: '주식 리포트 공유 · 작성가 대비 실시간 수익률 검증',
    description:
      '한·미·일·중·홍콩 주식 분석을 공유하고, 작성가 대비 현재가로 수익률이 자동 검증되는 투자 커뮤니티. 결과로 증명된 개미 투자자의 분석을 한곳에서.',
    url: SITE_URL,
    images: [{ url: '/og-v2.jpg', width: 1200, height: 630, alt: 'AntStreet' }],
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

// 서버에서 초기 피드 데이터 fetch — /api/feed/public 과 동일 형상으로 Postgres 합성
async function getInitialFeed(): Promise<FeedData | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const [{ data: rows, error }, prices] = await Promise.all([
      supabase
        .from('posts')
        .select(
          'id, title, ticker, exchange, opinion, position_type, initial_price, current_price, target_price, return_rate, themes, stock_name, stock_data, views, likes, comment_count, category, created_at, author_id, author:users!posts_author_id_fkey(nickname, equipped_badge_id, is_virtual)',
        )
        .order('created_at', { ascending: false })
        .limit(500), // 홈 초기 LCP 보호 — 글 수 늘어나면 페이징으로 전환
      getLatestPrices(),
    ]);

    if (error) {
      console.error('[getInitialFeed] posts query error:', error);
      return null;
    }

    const posts = (rows ?? []).map((r) => {
      const author = (r as { author?: { nickname?: string; equipped_badge_id?: string | null; is_virtual?: boolean } | null }).author;
      const ticker = (r.ticker || '').toUpperCase();
      const initialPrice = Number(r.initial_price ?? 0);
      const currentPrice = prices[ticker]?.currentPrice ?? Number(r.current_price ?? 0);
      const positionType: 'long' | 'short' = (r.position_type as 'long' | 'short') ?? 'long';
      const returnRate =
        initialPrice && currentPrice
          ? parseFloat(calculateReturn(initialPrice, currentPrice, positionType).toFixed(2))
          : Number(r.return_rate ?? 0);

      return {
        id: r.id,
        title: r.title ?? '',
        author: author?.nickname ?? '익명',
        authorId: r.author_id,
        authorIsVirtual: author?.is_virtual ?? false,
        equippedBadgeId: author?.equipped_badge_id ?? null,
        stockName: r.stock_name ?? '',
        ticker: r.ticker ?? '',
        exchange: r.exchange ?? '',
        opinion: (r.opinion ?? 'hold') as 'buy' | 'sell' | 'hold',
        positionType,
        initialPrice,
        currentPrice,
        returnRate,
        targetPrice: Number(r.target_price ?? 0),
        createdAt:
          typeof r.created_at === 'string' ? r.created_at.split('T')[0] : '',
        views: r.views ?? 0,
        likes: r.likes ?? 0,
        commentCount: (r as { comment_count?: number }).comment_count ?? 0,
        category: r.category ?? '',
        stockData: r.stock_data ?? null,
        themes: r.themes ?? undefined,
      };
    });

    const nowIso = new Date().toISOString();
    const pricesOut: Record<string, { currentPrice: number; exchange: string; lastUpdated: string }> = {};
    for (const [t, v] of Object.entries(prices)) {
      pricesOut[t] = {
        currentPrice: v.currentPrice,
        exchange: v.exchange,
        lastUpdated: nowIso,
      };
    }

    return {
      lastUpdated: new Date().toISOString(),
      totalPosts: posts.length,
      posts: posts as FeedData['posts'],
      prices: pricesOut,
    };
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
