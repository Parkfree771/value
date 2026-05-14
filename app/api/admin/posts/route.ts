// /api/admin/posts — 관리자 전용
//   GET    - 게시글 목록 (최신순, 커서 페이지네이션)
//   DELETE - 게시글 삭제 (CASCADE로 likes/comments 자동 삭제)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin/adminVerify';
import { getServiceClient } from '@/lib/supabase-admin';
import { adminStorage } from '@/lib/firebase-admin';
import { calculateReturn } from '@/utils/calculateReturn';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    const lastDocId = searchParams.get('lastDocId');

    const supabase = getServiceClient();

    let query = supabase
      .from('posts')
      .select(
        'id, title, ticker, stock_name, author_id, initial_price, current_price, position_type, views, likes, created_at, author:users!posts_author_id_fkey(nickname)',
      )
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(pageSize);

    if (lastDocId) {
      const { data: cursor } = await supabase
        .from('posts')
        .select('created_at')
        .eq('id', lastDocId)
        .maybeSingle();
      if (cursor) {
        query = query.or(
          `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${lastDocId})`,
        );
      }
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error('[admin/posts GET]:', error);
      return NextResponse.json({ error: '게시글 조회 실패' }, { status: 500 });
    }

    const posts = (rows ?? []).map((r) => {
      const author = (r as { author?: { nickname?: string } | null }).author;
      return {
        id: r.id,
        title: r.title ?? '',
        authorName: author?.nickname ?? '익명',
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

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .select('id');

    if (error) {
      console.error('[admin/posts DELETE]:', error);
      return NextResponse.json({ error: '게시글 삭제 실패' }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
    }

    // feed.json 동기화
    try {
      const bucket = adminStorage.bucket();
      const file = bucket.file('feed.json');
      const [exists] = await file.exists();
      if (exists) {
        const [content] = await file.download();
        const feed = JSON.parse(content.toString());
        if (feed.posts) {
          feed.posts = feed.posts.filter((p: { id: string }) => p.id !== postId);
          feed.totalPosts = feed.posts.length;
          feed.lastUpdated = new Date().toISOString();
          await file.save(JSON.stringify(feed, null, 2), {
            contentType: 'application/json',
            metadata: { cacheControl: 'public, max-age=60' },
          });
        }
      }
    } catch (feedError) {
      console.error('[Admin] feed.json 동기화 실패:', feedError);
    }

    console.log(`[Admin] 게시글 삭제: ${postId} by ${admin.email}`);
    return NextResponse.json({ success: true, message: '게시글이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    return NextResponse.json({ error: '게시글 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
