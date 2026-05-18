import { cache } from 'react';
import { cookies } from 'next/headers';
import type { FeedData, FeedPost } from '@/types/feed';
import { createClient } from '@/utils/supabase/server';
import { getLatestPrices } from '@/lib/priceCache';
import { getLookbackPrices, calcPeriodReturn } from '@/lib/priceLookback';
import { calculateReturn } from '@/utils/calculateReturn';

// 피드 데이터를 Supabase에서 조립한다. app/page.tsx의 getInitialFeed와 동일 패턴.
// ranking 페이지·RelatedReports·관련 SSR 컴포넌트가 공통 사용.
export const getFeedData = cache(async (): Promise<FeedData | null> => {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const [{ data: rows, error }, prices, lookback] = await Promise.all([
      supabase
        .from('posts')
        .select(
          'id, title, ticker, exchange, opinion, position_type, initial_price, current_price, target_price, return_rate, themes, stock_name, stock_data, views, likes, comment_count, category, created_at, author_id, author:users!posts_author_id_fkey(nickname, equipped_badge_id, is_virtual)',
        )
        .order('created_at', { ascending: false })
        .limit(500), // ranking/related SSR용 — 글 수 늘어나면 페이징으로
      getLatestPrices(),
      getLookbackPrices(),
    ]);

    if (error) {
      console.error('[feedData] posts query error:', error);
      return null;
    }

    const posts: FeedPost[] = (rows ?? []).map((r) => {
      const author = (r as { author?: { nickname?: string; equipped_badge_id?: string | null; is_virtual?: boolean } | null }).author;
      const ticker = (r.ticker || '').toUpperCase();
      const initialPrice = Number(r.initial_price ?? 0);
      const currentPrice = prices[ticker]?.currentPrice ?? Number(r.current_price ?? 0);
      const positionType: 'long' | 'short' = (r.position_type as 'long' | 'short') ?? 'long';
      const returnRate =
        initialPrice && currentPrice
          ? parseFloat(calculateReturn(initialPrice, currentPrice, positionType).toFixed(2))
          : Number(r.return_rate ?? 0);

      const lb = lookback[ticker];
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
        opinion: (r.opinion ?? 'hold') as 'buy' | 'sell' | 'hold',
        positionType,
        initialPrice,
        currentPrice,
        returnRate,
        returnRate1D,
        returnRate1W,
        returnRate1M,
        targetPrice: Number(r.target_price ?? 0),
        createdAt:
          typeof r.created_at === 'string' ? r.created_at.split('T')[0] : '',
        views: r.views ?? 0,
        likes: r.likes ?? 0,
        commentCount: (r as { comment_count?: number }).comment_count ?? 0,
        category: r.category ?? '',
        themes: r.themes ?? undefined,
      } as FeedPost;
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
      posts,
      prices: pricesOut,
    };
  } catch (error) {
    console.error('[feedData] fetch failed:', error);
    return null;
  }
});

export interface RelatedSets {
  sameTicker: FeedPost[];
  sameAuthor: FeedPost[];
  sameTheme: FeedPost[];
  popular: FeedPost[];
}

export async function getRelatedReports(
  currentId: string,
  ticker: string,
  author: string,
  themes: string[] | undefined,
  limit = 5,
): Promise<RelatedSets> {
  const data = await getFeedData();
  if (!data) {
    return { sameTicker: [], sameAuthor: [], sameTheme: [], popular: [] };
  }

  const others = data.posts.filter((p) => p.id !== currentId);
  const tickerUpper = (ticker || '').toUpperCase();

  const sameTicker = tickerUpper
    ? others.filter((p) => (p.ticker || '').toUpperCase() === tickerUpper).slice(0, limit)
    : [];

  const sameAuthor = author
    ? others
        .filter((p) => p.author === author && (p.ticker || '').toUpperCase() !== tickerUpper)
        .slice(0, limit)
    : [];

  const themeSet = new Set(themes || []);
  const sameTheme = themeSet.size > 0
    ? others
        .filter(
          (p) =>
            (p.ticker || '').toUpperCase() !== tickerUpper &&
            p.author !== author &&
            (p.themes || []).some((t) => themeSet.has(t)),
        )
        .slice(0, limit)
    : [];

  const excludeIds = new Set<string>([
    ...sameTicker.map((p) => p.id),
    ...sameAuthor.map((p) => p.id),
    ...sameTheme.map((p) => p.id),
  ]);

  const popular = [...others]
    .filter((p) => !excludeIds.has(p.id))
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, limit);

  return { sameTicker, sameAuthor, sameTheme, popular };
}
