// /api/admin/posts — 관리자 전용
//   GET    - 게시글 목록 (최신순, 커서 페이지네이션)
//   DELETE - 게시글 삭제 (CASCADE로 likes/comments 자동 삭제)

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/admin/adminVerify';
import { sql } from '@/lib/db';
import { calculateReturn } from '@/utils/calculateReturn';

interface AdminPostRow {
  id: string;
  title: string | null;
  ticker: string | null;
  stock_name: string | null;
  author_id: string;
  initial_price: number | null;
  current_price: number | null;
  position_type: string | null;
  views: number | null;
  likes: number | null;
  created_at: string;
  author_nickname: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    const lastDocId = searchParams.get('lastDocId');

    // 커서: lastDocId 글의 (created_at, id)보다 뒤. 커서 글이 없으면 필터 없이 첫 페이지.
    let rows: AdminPostRow[];
    try {
      rows = (lastDocId
        ? await sql`
            select p.id, p.title, p.ticker, p.stock_name, p.author_id, p.initial_price, p.current_price,
                   p.position_type, p.views, p.likes, p.created_at, u.nickname as author_nickname
            from posts p
            left join users u on u.id = p.author_id
            where not exists (select 1 from posts c where c.id = ${lastDocId})
               or (p.created_at, p.id) < (select c.created_at, c.id from posts c where c.id = ${lastDocId})
            order by p.created_at desc, p.id desc
            limit ${pageSize}
          `
        : await sql`
            select p.id, p.title, p.ticker, p.stock_name, p.author_id, p.initial_price, p.current_price,
                   p.position_type, p.views, p.likes, p.created_at, u.nickname as author_nickname
            from posts p
            left join users u on u.id = p.author_id
            order by p.created_at desc, p.id desc
            limit ${pageSize}
          `) as AdminPostRow[];
    } catch (error) {
      console.error('[admin/posts GET]:', error);
      return NextResponse.json({ error: '게시글 조회 실패' }, { status: 500 });
    }

    const posts = rows.map((r) => {
      return {
        id: r.id,
        title: r.title ?? '',
        authorName: r.author_nickname ?? '익명',
        authorId: r.author_id,
        stockName: r.stock_name ?? '',
        ticker: r.ticker ?? '',
        createdAt: r.created_at,
        views: r.views ?? 0,
        likes: r.likes ?? 0,
        returnRate: parseFloat(
          calculateReturn(
            Number(r.initial_price ?? 0),
            Number(r.current_price ?? 0),
            (r.position_type as 'long' | 'short') ?? 'long',
          ).toFixed(2),
        ),
      };
    });

    return NextResponse.json({
      success: true,
      posts,
      hasMore: posts.length === pageSize,
      lastDocId: posts.length > 0 ? posts[posts.length - 1].id : null,
    });
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    return NextResponse.json({ error: '게시글 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { postId } = await request.json();
    if (!postId) {
      return NextResponse.json({ error: '게시글 ID가 필요합니다.' }, { status: 400 });
    }

    let data: Record<string, unknown>[];
    try {
      data = await sql`delete from posts where id = ${postId} returning id`;
    } catch (error) {
      console.error('[admin/posts DELETE]:', error);
      return NextResponse.json({ error: '게시글 삭제 실패' }, { status: 500 });
    }
    if (data.length === 0) {
      return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
    }

    revalidatePath('/');
    revalidatePath('/ranking');
    revalidatePath('/search');

    console.log(`[Admin] 게시글 삭제: ${postId} by ${admin.email}`);
    return NextResponse.json({ success: true, message: '게시글이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    return NextResponse.json({ error: '게시글 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
