import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/session';
import { isAdminEmail } from '@/lib/admin/adminConfig.server';

/**
 * GET /api/auth/admin-check
 * 현재 로그인 사용자가 관리자 이메일에 포함되는지 확인. (Neon Auth 세션 쿠키 기반)
 */
export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user || !user.email) {
      return NextResponse.json({ isAdmin: false });
    }

    return NextResponse.json({ isAdmin: isAdminEmail(user.email) });
  } catch (error) {
    console.error('[Admin Check] Error:', error);
    return NextResponse.json({ isAdmin: false });
  }
}
