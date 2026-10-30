import { Metadata } from 'next';
import HomeClient from '@/components/HomeClient';
import type { FeedData } from '@/types/feed';
import { sql } from '@/lib/db';
import { getLatestPrices } from '@/lib/priceCache';
import { getLookbackPrices, calcReportPeriodReturns } from '@/lib/priceLookback';
import { calculateReturn } from '@/utils/calculateReturn';
import { getBriefing } from '@/lib/briefing';
import { getTickerData } from '@/lib/ticker';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr';

// ISR — 1시간 캐시 (그러나 실제로는 가격 cron 완료 / 글 작성/삭제 시 /api/revalidate · revalidatePath('/')로 즉시 무효화)
// 가격 cron이 하루 6번 (아시아 3 + 미국 3) 트리거하므로 그 외엔 캐시 유지 → egress 최소.
// ※ cookies() 호출이 있으면 페이지가 자동으로 dynamic 으로 강제됨 → revalidate 무의미.
//   그래서 세션 없이 서버 DB 클라이언트(lib/db)로 공개 데이터만 읽어 진짜 ISR 가능하도록 유지한다.
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
    images: [{ url: '/api/og/site', width: 1200, height: 630, alt: 'AntStreet' }],
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
      description: '13F 구루 포트폴리오 · 개미 투자자 리포트 · 실시간 수익률 검증',
      inLanguage: 'ko-KR',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      hasPart: [
        { '@type': 'SiteNavigationElement', name: '구루 포트폴리오 (13F)', url: `${SITE_URL}/guru-tracker`, description: '워렌 버핏·빌 애크먼·하워드 막스 SEC 13F 분기별 포트폴리오 추적' },
        { '@type': 'SiteNavigationElement', name: '경제 지표 (FRED)', url: `${SITE_URL}/indicators`, description: 'VIX·장단기금리차·CPI·M2 등 미국 매크로 지표' },
        { '@type': 'SiteNavigationElement', name: '투자 리포트', url: `${SITE_URL}/ranking`, description: '개미 투자자 리포트 + 작성가 대비 실시간 수익률 검증' },
        { '@type': 'SiteNavigationElement', name: '종목 검색', url: `${SITE_URL}/search`, description: '한·미·일·중·홍콩 종목별 리포트와 컨센서스' },
      ],
    },
  ],
};

// 카드용 본문 미리보기 — <style>/<script>/<head> 블록과 태그를 걷어낸 앞 240자.
// 본문 평균 ~20KB(HTML 모드)라 원문을 내려받지 않고 DB에서 잘라 egress 를 줄인다.
// (Postgres ARE: 첫 수량자가 non-greedy 여야 전체가 non-greedy 로 동작 → [^>]*?)
const EXCERPT_SQL = `left(btrim(regexp_replace(regexp_replace(regexp_replace(
      p.content,
      '<(style|script|head)[^>]*?>.*?</(style|script|head)>', ' ', 'gi'),
      '<[^>]*>|&[a-z]+;|&#[0-9]+;', ' ', 'gi'),
      '\\s+', ' ', 'g')), 240)`;
// 썸네일 — 첨부 이미지 우선, 없으면 본문 첫 <img> 중 Neon Storage 에 올린 것
const THUMBNAIL_SQL = `coalesce(p.images->>0,
      substring(p.content from '<img[^>]+src="(https://[^"]*\\.neon\\.tech/[^"]+)"'))`;

/**
 * 1일/7일/한달 각각 TOP30(홈 순위표 펼침까지) 에 들어갈 글 id — 같은 종목·방향은 한 묶음(기간 수익률이 같으므로)으로 보고,
 * 묶음마다 기간 수익률이 가장 높은 글 하나만 (클라이언트 TopReturnSlider 의 중복 제거 규칙과 동일).
 */
// 홈 순위표: 1·2·3위 + 4~15위, 더보기로 30위까지
const PERIOD_TOP_N = 30;

function periodTopIds(
  lightRows: Record<string, any>[],
  lookback: Awaited<ReturnType<typeof getLookbackPrices>>,
): string[] {
  const rows = lightRows.map((r) => {
    const ticker = (r.ticker || '').toUpperCase();
    const positionType: 'long' | 'short' = r.position_type === 'short' ? 'short' : 'long';
    return {
      id: r.id as string,
      group: `${ticker}:${positionType}`,
      createdAt: typeof r.created_at === 'string' ? r.created_at : '',
      ...calcReportPeriodReturns(
        {
          currentPrice: Number(r.current_price) || 0,
          initialPrice: Number(r.initial_price) || 0,
          createdAt: typeof r.created_at === 'string' ? r.created_at : '',
          positionType,
        },
        lookback[ticker],
      ),
    };
  });
  const ids = new Set<string>();
  for (const key of ['returnRate1D', 'returnRate1W', 'returnRate1M'] as const) {
    const best = new Map<string, { id: string; rate: number; createdAt: string }>();
    for (const r of rows) {
      const rate = r[key];
      if (rate === null) continue;
      const cur = best.get(r.group);
      // 동률이면 최신 글 (클라이언트와 같은 규칙)
      if (!cur || rate > cur.rate || (rate === cur.rate && r.createdAt > cur.createdAt)) {
        best.set(r.group, { id: r.id, rate, createdAt: r.createdAt });
      }
    }
    [...best.values()].sort((a, b) => b.rate - a.rate).slice(0, PERIOD_TOP_N).forEach((x) => ids.add(x.id));
  }
  return [...ids];
}

// 서버에서 초기 피드 데이터 fetch — /api/feed/public 과 동일 형상으로 Postgres 합성
async function getInitialFeed(): Promise<FeedData | null> {
  try {
    // 공개 posts 조회만 함 — cookies() 호출하면 ISR이 깨지므로
    // 세션 없이 서버 전용 sql 클라이언트 사용. SELECT만 하므로 안전.

    // [LCP 최적화]
    // ① 최신 50건 (홈 피드 LCP)
    // ② 수익률 상위 30건 (TopReturnSlider가 정확한 top10 즉시 렌더할 수 있도록)
    //    — ②가 없으면 슬라이더가 "최신 50건 중 top10" 만 보여 → 백그라운드 fetch 들어올
    //    때까지 부정확. ②는 작은 쿼리(30 row)라 ①과 병렬 실행해도 LCP에 거의 영향 없음.
    // 클라이언트가 hydration 후 /api/feed/public 호출해서 풀세트(500)로 교체한다.
    // stock_data 제외 — HomeClient에서 어차피 undefined로 폐기되는 컬럼이라
    // SSR HTML 페이로드를 크게 줄여줌(글당 stock_data JSON 수 KB).
    // (고정 문자열 — 사용자 입력 없음)
    const SELECT_FROM = `
      select p.id, p.title, p.ticker, p.exchange, p.opinion, p.position_type, p.initial_price,
             p.current_price, p.target_price, p.return_rate, p.themes, p.stock_name, p.views,
             p.likes, p.comment_count, p.category, p.created_at, p.author_id,
             json_build_object('nickname', u.nickname, 'level_points', u.level_points,
                               'is_virtual', u.is_virtual) as author,
             ${EXCERPT_SQL} as excerpt,
             ${THUMBNAIL_SQL} as thumbnail
      from posts p
      left join users u on u.id = p.author_id`;

    const [latestRows, topRows, statsRows, lightRows] = await Promise.all([
      sql.query(`${SELECT_FROM} order by p.created_at desc limit 50`).catch((error) => {
        console.error('[getInitialFeed] posts query error:', error);
        return null;
      }),
      // 수익률 상위는 보조 데이터 — 실패해도 최신 50건만으로 렌더
      sql.query(`${SELECT_FROM} order by p.return_rate desc limit 30`).catch(() => []),
      // 히어로 통계 — 피드는 최신 50건만 싣기 때문에 전체 글 수는 따로 센다
      sql.query(`select count(*)::int as total_posts, count(distinct author_id)::int as authors from posts`).catch(() => []),
      // 1일/7일/한달 TOP10 후보 계산용 — 전체 글의 가벼운 컬럼만 (최신 50 + 누적 상위 30 밖의 글도 기간 순위엔 들어갈 수 있음)
      sql.query(`select id, ticker, position_type, initial_price, current_price, created_at from posts`).catch(() => []),
    ]);

    if (!latestRows) return null;

    // 두 결과 dedup by id (최신 50건 우선 — 이미 createdAt desc 정렬됨)
    const seenIds = new Set<string>();
    const rows: typeof latestRows = [];
    for (const r of latestRows) {
      if (seenIds.has(r.id)) continue;
      seenIds.add(r.id);
      rows.push(r);
    }
    for (const r of topRows) {
      if (seenIds.has(r.id)) continue;
      seenIds.add(r.id);
      rows.push(r);
    }

    const tickers = Array.from(
      new Set([...rows, ...lightRows].map((r) => (r.ticker || '').toUpperCase()).filter(Boolean)),
    );
    const [prices, lookback] = await Promise.all([
      getLatestPrices(),
      getLookbackPrices(tickers),
    ]);

    // 기간 TOP10에 들어갈 글이 아직 없으면 추가로 불러온다
    const missingIds = periodTopIds(lightRows, lookback).filter((id) => !seenIds.has(id));
    if (missingIds.length > 0) {
      const extra = await sql.query(`${SELECT_FROM} where p.id = any($1::uuid[])`, [missingIds]).catch(() => []);
      for (const r of extra) {
        seenIds.add(r.id);
        rows.push(r);
      }
    }

    const posts = rows.map((r) => {
      const author = (r as { author?: { nickname?: string; level_points?: number; is_virtual?: boolean } | null }).author;
      const ticker = (r.ticker || '').toUpperCase();
      const initialPrice = Number(r.initial_price ?? 0);
      // 글 row의 current_price를 우선 — 가격 갱신 배치/cron이 글마다 직접 UPDATE함.
      // ticker별 cache(current_prices)는 row가 비어있을 때만 fallback. (작성 직후
      // row=작성가, cache는 옛 시장가일 수 있어 cache가 row를 덮으면 "방금 썼는데 ±%" 버그 발생)
      const currentPrice = Number(r.current_price) || prices[ticker]?.currentPrice || 0;
      const positionType: 'long' | 'short' = (r.position_type as 'long' | 'short') ?? 'long';
      const returnRate =
        initialPrice && currentPrice
          ? parseFloat(calculateReturn(initialPrice, currentPrice, positionType).toFixed(2))
          : Number(r.return_rate ?? 0);

      const lb = lookback[ticker];
      const createdAtIso = typeof r.created_at === 'string' ? r.created_at : '';
      const { returnRate1D, returnRate1W, returnRate1M } = calcReportPeriodReturns(
        { currentPrice, initialPrice, createdAt: createdAtIso, positionType },
        lb,
      );

      return {
        id: r.id,
        title: r.title ?? '',
        author: author?.nickname ?? '익명',
        authorId: r.author_id,
        authorIsVirtual: author?.is_virtual ?? false,
        levelPoints: author?.level_points ?? 0,
        stockName: r.stock_name ?? '',
        ticker: r.ticker ?? '',
        exchange: r.exchange ?? '',
        opinion: (r.opinion ?? 'hold') as 'buy' | 'sell' | 'hold',
        positionType,
        initialPrice,
        currentPrice,
        returnRate,
        returnRate1D,
        returnRate1W,
        returnRate1M,
        targetPrice: Number(r.target_price ?? 0),
        createdAt: createdAtIso ? createdAtIso.split('T')[0] : '',
        views: r.views ?? 0,
        likes: r.likes ?? 0,
        commentCount: (r as { comment_count?: number }).comment_count ?? 0,
        category: r.category ?? '',
        themes: r.themes ?? undefined,
        excerpt: (r.excerpt as string | null) ?? '',
        thumbnail: (r.thumbnail as string | null) ?? null,
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

    const stats = statsRows[0] as { total_posts?: number; authors?: number } | undefined;

    return {
      lastUpdated: new Date().toISOString(),
      totalPosts: stats?.total_posts ?? posts.length,
      stats: stats ? { totalPosts: stats.total_posts ?? posts.length, authors: stats.authors ?? 0 } : undefined,
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
  // 피드 · 모닝 브리핑 · 지수 띠 — 모두 홈 ISR 재생성 때만 읽는다 (1시간 또는 cron/글쓰기 revalidate)
  const [initialData, briefing, ticker] = await Promise.all([
    getInitialFeed(),
    getBriefing(),
    getTickerData().catch(() => null),
  ]);

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
      <HomeClient initialData={initialData} briefing={briefing} ticker={ticker} />
    </>
  );
}
