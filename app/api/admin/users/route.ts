// /api/admin/users — 관리자 전용
//   GET  - 사용자 목록 (게시글 수 포함)
//   PUT  - 사용자 정지/해제 (users.is_suspended 토글)

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin/adminVerify';
import { sql } from '@/lib/db';

interface AdminUserRow {
  id: string;
  email: string | null;
  nickname: string | null;
  created_at: string;
  is_suspended: boolean | null;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    let users: AdminUserRow[];
    try {
      users = (await sql`
        select id, email, nickname, created_at, is_suspended
        from users
        order by created_at desc
        limit 100
      `) as AdminUserRow[];
    } catch (usersError) {
      console.error('[admin/users GET]:', usersError);
      return NextResponse.json({ error: '사용자 조회 실패' }, { status: 500 });
    }

    const userIds = users.map((u) => u.id);
    // user_post_counts view로 SQL group by 결과만 가져옴 (posts 풀스캔 안 함)
    const counts = userIds.length
      ? await sql`
          select author_id, post_count from user_post_counts where author_id = any(${userIds}::uuid[])
        `
      : [];

    const countByUser: Record<string, number> = {};
    for (const row of counts) {
      countByUser[row.author_id as string] = row.post_count as number;
    }

    const mapped = users.map((u) => ({
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

    // public.users 프로필만 갱신 — 로그인 계정(neon_auth."user")은 Neon Auth가 관리.
    let data: Record<string, unknown>[];
    try {
      data = await sql`update users set is_suspended = ${isSuspended} where id = ${userId} returning id`;
    } catch (error) {
      console.error('[admin/users PUT]:', error);
      return NextResponse.json({ error: '사용자 정지/해제 실패' }, { status: 500 });
    }
    if (data.length === 0) {
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
