// GET /api/reports - posts 목록 (커서 페이지네이션)
// posts는 Supabase, 가격은 feed.json (Storage 잔존) — returnRate는 런타임 재계산.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getLatestPrices } from '@/lib/priceCache';
import { calculateReturn } from '@/utils/calculateReturn';

const SELECT_COLUMNS =
  'id, title, ticker, exchange, category, opinion, position_type, initial_price, current_price, target_price, return_rate, themes, stock_name, stock_data, views, likes, created_at, author:users!posts_author_id_fkey(nickname)';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const sortByRaw = sp.get('sortBy') || 'created_at';
    const pageSize = Math.min(parseInt(sp.get('pageSize') || '10', 10), 50);
    const cursor = sp.get('cursor'); // post id (커서)

    // Firestore 호환: camelCase 정렬 키를 snake_case로
    const sortBy =
      sortByRaw === 'createdAt' ? 'created_at'
      : sortByRaw === 'returnRate' ? 'return_rate'
      : sortByRaw === 'likes' ? 'likes'
      : sortByRaw === 'views' ? 'views'
      : 'created_at';

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 페이지네이션: cursor가 있으면 해당 post의 sortBy 값을 가져와 그 이하로 필터.
    // 같은 값이 있을 때 안정 정렬을 위해 id로 tie-break.
    let query = supabase.from('posts').select(SELECT_COLUMNS, { count: 'exact' }).order(sortBy, { ascending: false }).order('id', { ascending: false }).limit(pageSize);

    if (cursor) {
      const { data: cursorRow } = await supabase
        .from('posts')
        .select(`${sortBy}, id`)
        .eq('id', cursor)
        .maybeSingle();

      if (cursorRow) {
        const cursorVal = (cursorRow as Record<string, unknown>)[sortBy];
        // 값이 더 작거나, 같으면 id가 더 작은 행
        query = query.or(`${sortBy}.lt.${cursorVal},and(${sortBy}.eq.${cursorVal},id.lt.${cursor})`);
      }
    }

    const [{ data: rows, error, count }, latestPrices] = await Promise.all([
      query,
      getLatestPrices(),
    ]);

    if (error) {
      console.error('[API Reports] supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch reports', message: error.message },
        { status: 500 },
      );
    }

    const reports = (rows ?? []).map((r) => {
      const ticker = (r.ticker || '').toUpperCase();
      const jsonPrice = latestPrices[ticker]?.currentPrice;
      const initialPrice = Number(r.initial_price ?? 0);
      const currentPrice = jsonPrice ?? Number(r.current_price ?? 0);
      const positionType: 'long' | 'short' = (r.position_type as 'long' | 'short') ?? 'long';
      const returnRate = parseFloat(
        calculateReturn(initialPrice, currentPrice, positionType).toFixed(2),
      );

      const author = (r as { author?: { nickname?: string } | null }).author;

      return {
        id: r.id,
        title: r.title ?? '',
        author: author?.nickname ?? '익명',
        stockName: r.stock_name ?? '',
        ticker: r.ticker ?? '',
        opinion: r.opinion ?? 'hold',
        returnRate,
        initialPrice,
        currentPrice,
        createdAt:
          typeof r.created_at === 'string'
            ? r.created_at.split('T')[0]
            : new Date().toISOString().split('T')[0],
        views: r.views ?? 0,
        likes: r.likes ?? 0,
        exchange: r.exchange ?? '',
        category: r.category ?? '',
        stockData: r.stock_data ?? null,
        themes: r.themes ?? [],
      };
    });

    const lastId = rows && rows.length ? rows[rows.length - 1].id : null;
    const hasMore = rows ? rows.length === pageSize : false;

    const response = NextResponse.json({
      success: true,
      reports,
      count: reports.length,
      total: count ?? null,
      nextCursor: lastId,
      hasMore,
      pageSize,
    });

    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return response;
  } catch (error) {
    console.error('[API Reports] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch reports',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
