// /api/me/posts/[id] — 리포트 수정 (작성자 또는 관리자)
//   GET  — 수정 폼에 채울 필드 (snake_case 그대로)
//   PUT  — 편집 가능 컬럼(payload.ts)만 UPDATE. 가격·작성자·통계는 유지,
//          updated_at 배열에 오늘(UTC) 날짜가 없으면 now() 추가.
// 권한: 옛 posts_update_own RLS — auth.uid() = author_id OR users.is_admin.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAuthUser } from '@/lib/auth/session';
import { parseEditablePostFields } from '../payload';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 });
    }

    const rows = await sql`
      select p.title, p.ticker, p.exchange, p.opinion, p.position_type, p.target_price, p.mode,
             p.content, p.css_content, p.initial_price, p.author_id, p.stock_data, p.themes,
             p.images, p.files,
             exists (select 1 from users where id = ${authUser.id} and is_admin = true) as requester_is_admin
      from posts p
      where p.id = ${id}
    `;
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 });
    }
    if (row.author_id !== authUser.id && !row.requester_is_admin) {
      return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
    }

    const { requester_is_admin: _omit, ...post } = row;
    return NextResponse.json({ post });
  } catch (error) {
    console.error('[me/posts GET] error:', error);
    return NextResponse.json({ error: '리포트 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = parseEditablePostFields(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const p = parsed.value;

    // 권한 조건을 WHERE에 포함 — 0행이면 아래에서 404/403 구분
    const updated = await sql`
      update posts set
        title = ${p.title},
        ticker = ${p.ticker},
        exchange = ${p.exchange},
        stock_name = ${p.stock_name},
        category = ${p.category},
        stock_data = ${p.stock_data === null ? null : JSON.stringify(p.stock_data)}::jsonb,
        opinion = ${p.opinion}::post_opinion,
        position_type = ${p.position_type}::post_position,
        target_price = ${p.target_price},
        themes = ${p.themes}::text[],
        content = ${p.content},
        mode = ${p.mode}::post_mode,
        images = ${JSON.stringify(p.images)}::jsonb,
        files = ${JSON.stringify(p.files)}::jsonb,
        updated_at = case
          when exists (
            select 1 from unnest(updated_at) d
            where (d at time zone 'UTC')::date = (now() at time zone 'UTC')::date
          ) then updated_at
          else array_append(updated_at, now())
        end
      where id = ${id}
        and (
          author_id = ${authUser.id}
          or exists (select 1 from users where id = ${authUser.id} and is_admin = true)
        )
      returning id
    `;

    if (updated.length === 0) {
      const exists = await sql`select 1 from posts where id = ${id}`;
      return exists.length === 0
        ? NextResponse.json({ error: '리포트를 찾을 수 없습니다.' }, { status: 404 })
        : NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('[me/posts PUT] error:', error);
    return NextResponse.json({ error: '리포트 수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
