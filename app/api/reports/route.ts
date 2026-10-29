// GET /api/reports - posts 목록 (커서 페이지네이션)
// posts는 Neon Postgres, 가격은 feed.json (Storage 잔존) — returnRate는 런타임 재계산.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getLatestPrices } from '@/lib/priceCache';
import { calculateReturn } from '@/utils/calculateReturn';

// uuid 형식이 아니면 Postgres가 22P02를 던지므로 커서는 쿼리 전에 걸러냄 (옛 동작: 커서 무시)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const sortByRaw = sp.get('sortBy') || 'created_at';
    const pageSize = Math.min(parseInt(sp.get('pageSize') || '10', 10), 50);
    const cursor = sp.get('cursor'); // post id (커서)

    // Firestore 호환: camelCase 정렬 키를 snake_case로.
    // 화이트리스트 값만 SQL 식별자로 들어감 (사용자 입력이 그대로 들어가지 않음)
    const sortBy =
      sortByRaw === 'createdAt' ? 'created_at'
      : sortByRaw === 'returnRate' ? 'return_rate'
      : sortByRaw === 'likes' ? 'likes'
      : sortByRaw === 'views' ? 'views'
      : 'created_at';

    // 페이지네이션: cursor가 있으면 해당 post의 sortBy 값 이하로 필터 (서브쿼리로 비교 —
    // JS로 값을 왕복시키면 timestamptz 마이크로초가 잘려 커서가 어긋남).
    // 같은 값이 있을 때 안정 정렬을 위해 id로 tie-break. 커서 글이 없으면 필터 무시.
    // total: count(*) over () — 커서 필터 적용 후 전체 행 수 (posts 규모가 작아 비용 미미).
    const params: unknown[] = [pageSize];
    let cursorFilter = '';
    if (cursor && UUID_RE.test(cursor)) {
      params.push(cursor);
      // 값이 더 작거나, 같으면 id가 더 작은 행
      cursorFilter = `
        where not exists (select 1 from posts c where c.id = $2)
           or (p.${sortBy}, p.id) < (select c.${sortBy}, c.id from posts c where c.id = $2)`;
    }

    let rows: Record<string, any>[];
    let latestPrices: Awaited<ReturnType<typeof getLatestPrices>>;
    try {
      [rows, latestPrices] = await Promise.all([
        sql.query(
          `select p.id, p.title, p.ticker, p.exchange, p.category, p.opinion, p.position_type,
                  p.initial_price, p.current_price, p.target_price, p.return_rate, p.themes,
                  p.stock_name, p.stock_data, p.views, p.likes, p.created_at,
                  u.nickname as author_nickname,
                  count(*) over ()::int as total_count
           from posts p
           left join users u on u.id = p.author_id
           ${cursorFilter}
           order by p.${sortBy} desc, p.id desc
           limit $1`,
          params,
        ),
        getLatestPrices(),
      ]);
    } catch (error) {
      console.error('[API Reports] db error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch reports',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
    const count: number | null = rows.length ? rows[0].total_count : 0;

    const reports = rows.map((r) => {
      const ticker = (r.ticker || '').toUpperCase();
      const initialPrice = Number(r.initial_price ?? 0);
      // 글 row의 current_price 우선. cache는 row가 0/null인 비정상 케이스의 backup.
      const currentPrice = Number(r.current_price) || latestPrices[ticker]?.currentPrice || 0;
      const positionType: 'long' | 'short' = (r.position_type as 'long' | 'short') ?? 'long';
      const returnRate = parseFloat(
        calculateReturn(initialPrice, currentPrice, positionType).toFixed(2),
      );

      return {
        id: r.id,
        title: r.title ?? '',
        author: r.author_nickname ?? '익명',
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

    const lastId = rows.length ? rows[rows.length - 1].id : null;
    const hasMore = rows.length === pageSize;

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
