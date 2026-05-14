// GET /api/reports/by-author?uid=<userId>
// 특정 사용자가 쓴 글만 조회. 가격은 feed.json, 그 외는 Postgres.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getLatestPrices } from '@/lib/priceCache';
import { calculateReturn } from '@/utils/calculateReturn';

const SELECT_COLUMNS =
  'id, title, ticker, exchange, category, opinion, position_type, initial_price, current_price, target_price, return_rate, themes, stock_name, stock_data, views, likes, comment_count, created_at, author:users!posts_author_id_fkey(nickname, equipped_badge_id, is_virtual)';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uid = (searchParams.get('uid') || '').trim();

  if (!uid) {
    return NextResponse.json({ error: 'uid가 필요합니다.' }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const [{ data: rows, error }, prices] = await Promise.all([
      supabase
        .from('posts')
        .select(SELECT_COLUMNS)
        .eq('author_id', uid)
        .order('created_at', { ascending: false }),
      getLatestPrices(),
    ]);

    if (error) {
      console.error('[by-author] supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let equippedBadgeId: string | null = null;

    const reports = (rows ?? []).map((r) => {
      const ticker = (r.ticker || '').toUpperCase();
      const initialPrice = Number(r.initial_price) || 0;
      const currentPrice = prices[ticker]?.currentPrice ?? Number(r.current_price) ?? 0;
      const positionType: 'long' | 'short' = (r.position_type as 'long' | 'short') ?? 'long';
      const returnRate =
        currentPrice && initialPrice
          ? parseFloat(calculateReturn(initialPrice, currentPrice, positionType).toFixed(2))
          : 0;

      const author = (r as { author?: { nickname?: string; equipped_badge_id?: string | null; is_virtual?: boolean } | null }).author;
      if (equippedBadgeId === null && author?.equipped_badge_id !== undefined) {
        equippedBadgeId = author.equipped_badge_id;
      }

      return {
        id: r.id,
        title: r.title ?? '',
        author: author?.nickname ?? '',
        authorId: uid,
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
        targetPrice: Number(r.target_price) || 0,
        createdAt:
          typeof r.created_at === 'string'
            ? r.created_at.split('T')[0]
            : '',
        views: r.views ?? 0,
        likes: r.likes ?? 0,
        commentCount: (r as { comment_count?: number }).comment_count ?? 0,
        category: r.category ?? '',
        stockData: r.stock_data ?? null,
        themes: r.themes ?? [],
      };
    });

    return NextResponse.json(
      { reports, count: reports.length },
      { headers: { 'Cache-Control': 'private, max-age=30' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : '조회 실패';
    console.error('[by-author] error:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
