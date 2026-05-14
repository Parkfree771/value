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
import { calculateReturn } from '@/utils/calculateReturn';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const [{ data: rows, error }, prices] = await Promise.all([
      supabase
        .from('posts')
        .select(
          'id, title, ticker, exchange, opinion, position_type, initial_price, current_price, target_price, return_rate, themes, stock_name, stock_data, views, likes, category, created_at, author_id, author:users!posts_author_id_fkey(nickname, equipped_badge_id)',
        )
        .order('created_at', { ascending: false }),
      getLatestPrices(),
    ]);

    if (error) {
      console.error('[feed/public] error:', error);
      return NextResponse.json({ posts: [], prices: {}, totalPosts: 0 }, { status: 500 });
    }

    const posts = (rows ?? []).map((r) => {
      const author = (r as { author?: { nickname?: string; equipped_badge_id?: string | null } | null }).author;
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
        equippedBadgeId: author?.equipped_badge_id ?? null,
        stockName: r.stock_name ?? '',
        ticker: r.ticker ?? '',
        exchange: r.exchange ?? '',
        opinion: r.opinion ?? 'hold',
        positionType,
        initialPrice,
        currentPrice,
        returnRate,
        targetPrice: Number(r.target_price ?? 0),
        createdAt:
          typeof r.created_at === 'string' ? r.created_at.split('T')[0] : '',
        views: r.views ?? 0,
        likes: r.likes ?? 0,
        category: r.category ?? '',
        stockData: r.stock_data ?? null,
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
