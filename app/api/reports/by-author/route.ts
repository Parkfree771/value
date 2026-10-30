// GET /api/reports/by-author?uid=<userId>
// 특정 사용자가 쓴 글만 조회. 가격은 feed.json, 그 외는 Postgres.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getLatestPrices } from '@/lib/priceCache';
import { calculateReturn } from '@/utils/calculateReturn';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uid = (searchParams.get('uid') || '').trim();

  if (!uid) {
    return NextResponse.json({ error: 'uid가 필요합니다.' }, { status: 400 });
  }

  try {
    // 작성자 정보는 author 객체로 중첩 (옛 PostgREST embed 형태 유지)
    const [rows, prices] = await Promise.all([
      sql`
        select p.id, p.title, p.ticker, p.exchange, p.category, p.opinion, p.position_type,
               p.initial_price, p.current_price, p.target_price, p.return_rate, p.themes,
               p.stock_name, p.stock_data, p.views, p.likes, p.comment_count, p.created_at,
               case when u.id is null then null else json_build_object(
                 'nickname', u.nickname,
                 'level_points', u.level_points,
                 'is_virtual', u.is_virtual
               ) end as author
        from posts p
        left join users u on u.id = p.author_id
        where p.author_id = ${uid}
        order by p.created_at desc
        limit 200
      `,
      getLatestPrices(),
    ]);

    const reports = rows.map((r) => {
      const ticker = (r.ticker || '').toUpperCase();
      const initialPrice = Number(r.initial_price) || 0;
      // 글 row의 current_price 우선. cache는 row가 0/null인 비정상 케이스의 backup.
      const currentPrice = Number(r.current_price) || prices[ticker]?.currentPrice || 0;
      const positionType: 'long' | 'short' = (r.position_type as 'long' | 'short') ?? 'long';
      const returnRate =
        currentPrice && initialPrice
          ? parseFloat(calculateReturn(initialPrice, currentPrice, positionType).toFixed(2))
          : 0;

      const author = (r as { author?: { nickname?: string; level_points?: number; is_virtual?: boolean } | null }).author;

      return {
        id: r.id,
        title: r.title ?? '',
        author: author?.nickname ?? '',
        authorId: uid,
        authorIsVirtual: author?.is_virtual ?? false,
        levelPoints: author?.level_points ?? 0,
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
