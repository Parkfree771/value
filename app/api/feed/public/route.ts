/**
 * /api/feed/public
 *
 * 이전에는 feed.json 그대로 반환. 이제 Supabase posts에서 동일 형상으로 합성.
 * 클라이언트(예: 마이페이지 북마크 탭)가 전체 글 목록을 받아서 필터링.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getLatestPrices } from '@/lib/priceCache';
import { getLookbackPrices, calcPeriodReturn } from '@/lib/priceLookback';
import { calculateReturn } from '@/utils/calculateReturn';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 북마크/검색 필터링용 — 최신 500건. posts 조회를 먼저 끝낸 뒤 ticker 목록을
    // 만들어 lookback에 .in() 필터로 넘김 → 60일×전 종목 무필터 조회 회피.
    // stock_data 제외 — 이 API 호출 consumer (HomeClient, mypage, search)
    // 모두 stockData를 사용하지 않거나 {} 로 덮어쓴다. 페이로드 절감.
    const { data: rows, error } = await supabase
      .from('posts')
      .select(
        'id, title, ticker, exchange, opinion, position_type, initial_price, current_price, target_price, return_rate, themes, stock_name, views, likes, comment_count, category, created_at, author_id, author:users!posts_author_id_fkey(nickname, equipped_badge_id, is_virtual)',
      )
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('[feed/public] error:', error);
      return NextResponse.json({ posts: [], prices: {}, totalPosts: 0 }, { status: 500 });
    }

    const tickers = Array.from(
      new Set((rows ?? []).map((r) => (r.ticker || '').toUpperCase()).filter(Boolean)),
    );
    const [prices, lookback] = await Promise.all([
      getLatestPrices(),
      getLookbackPrices(tickers),
    ]);

    const posts = (rows ?? []).map((r) => {
      const author = (r as { author?: { nickname?: string; equipped_badge_id?: string | null; is_virtual?: boolean } | null }).author;
      const ticker = (r.ticker || '').toUpperCase();
      const initialPrice = Number(r.initial_price ?? 0);
      // 글 row의 current_price 우선. cache는 row가 0/null인 비정상 케이스의 backup.
      const currentPrice = Number(r.current_price) || prices[ticker]?.currentPrice || 0;
      const positionType: 'long' | 'short' = (r.position_type as 'long' | 'short') ?? 'long';
      const returnRate =
        initialPrice && currentPrice
          ? parseFloat(calculateReturn(initialPrice, currentPrice, positionType).toFixed(2))
          : Number(r.return_rate ?? 0);

      const lb = lookback[ticker];
      const createdAtIso = typeof r.created_at === 'string' ? r.created_at : '';
      const returnRate1D = calcPeriodReturn(currentPrice, lb?.close1d, positionType);
      const returnRate1W = calcPeriodReturn(currentPrice, lb?.close7d, positionType);
      const returnRate1M = calcPeriodReturn(currentPrice, lb?.close30d, positionType);

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
        opinion: r.opinion ?? 'hold',
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
      };
    });

    const pricesOut: Record<string, { currentPrice: number; exchange: string }> = {};
    for (const [t, v] of Object.entries(prices)) {
      pricesOut[t] = { currentPrice: v.currentPrice, exchange: v.exchange };
    }

    return NextResponse.json(
      {
        lastUpdated: new Date().toISOString(),
        totalPosts: posts.length,
        posts,
        prices: pricesOut,
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
      },
    );
  } catch (error) {
    console.error('[feed/public] error:', error);
    return NextResponse.json({ posts: [], prices: {}, totalPosts: 0 }, { status: 500 });
  }
}
