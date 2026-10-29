// POST /api/me/posts — 본인 명의로 새 리포트 작성 → { id }
// author_id는 세션 uid로 고정 (옛 posts_insert_own RLS: auth.uid() = author_id).
// 바디: 편집 가능 컬럼(payload.ts) + initial_price. current_price는 initial_price로 시작,
// 통계(likes/views/return_rate 등)는 DB 기본값.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/session';
import { parseEditablePostFields } from './payload';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = parseEditablePostFields(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const p = parsed.value;

    const initialPrice = body?.initial_price;
    if (typeof initialPrice !== 'number' || !Number.isFinite(initialPrice) || initialPrice <= 0) {
      return NextResponse.json({ error: '현재가 정보가 올바르지 않습니다.' }, { status: 400 });
    }

    const rows = await sql`
      insert into posts (
        author_id, title, ticker, exchange, stock_name, category, stock_data,
        opinion, position_type, target_price, themes, content, mode, images, files,
        initial_price, current_price
      ) values (
        ${authUser.id}, ${p.title}, ${p.ticker}, ${p.exchange}, ${p.stock_name}, ${p.category},
        ${p.stock_data === null ? null : JSON.stringify(p.stock_data)}::jsonb,
        ${p.opinion}::post_opinion, ${p.position_type}::post_position, ${p.target_price},
        ${p.themes}::text[], ${p.content}, ${p.mode}::post_mode,
        ${JSON.stringify(p.images)}::jsonb, ${JSON.stringify(p.files)}::jsonb,
        ${initialPrice}, ${initialPrice}
      )
      returning id
    `;

    return NextResponse.json({ success: true, id: rows[0].id as string });
  } catch (error) {
    console.error('[me/posts POST] error:', error);
    return NextResponse.json({ error: '리포트 작성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
