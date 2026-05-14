// /api/admin/users — 관리자 전용
//   GET  - 사용자 목록 (게시글 수 포함)
//   PUT  - 사용자 정지/해제 (users.is_suspended 토글)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin/adminVerify';
import { getServiceClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const supabase = getServiceClient();

    const [{ data: users, error: usersError }, { data: postCounts }] = await Promise.all([
      supabase
        .from('users')
        .select('id, email, nickname, created_at, is_suspended')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('posts').select('author_id'),
    ]);

    if (usersError) {
      console.error('[admin/users GET]:', usersError);
      return NextResponse.json({ error: '사용자 조회 실패' }, { status: 500 });
    }

    const countByUser: Record<string, number> = {};
    for (const p of postCounts ?? []) {
      countByUser[p.author_id] = (countByUser[p.author_id] ?? 0) + 1;
    }

    const mapped = (users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? '',
      nickname: u.nickname ?? '',
      createdAt: u.created_at,
      isSuspended: u.is_suspended ?? false,
      postCount: countByUser[u.id] ?? 0,
    }));

    return NextResponse.json({ success: true, users: mapped });
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    return NextResponse.json({ error: '사용자 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { userId, isSuspended } = await request.json();

    if (!userId || typeof isSuspended !== 'boolean') {
      return NextResponse.json(
        { error: '사용자 ID와 정지 상태가 필요합니다.' },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('users')
      .update({ is_suspended: isSuspended })
      .eq('id', userId)
      .select('id');

    if (error) {
      console.error('[admin/users PUT]:', error);
      return NextResponse.json({ error: '사용자 정지/해제 실패' }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    console.log(`[Admin] 사용자 ${isSuspended ? '정지' : '정지 해제'}: ${userId} by ${admin.email}`);
    return NextResponse.json({
      success: true,
      message: `사용자가 성공적으로 ${isSuspended ? '정지' : '정지 해제'}되었습니다.`,
    });
  } catch (error) {
    console.error('사용자 정지/해제 오류:', error);
    return NextResponse.json(
      { error: '사용자 정지/해제 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
