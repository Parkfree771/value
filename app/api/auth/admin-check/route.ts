import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserAny } from '@/lib/supabase-auth';
import { isAdminEmail } from '@/lib/admin/adminConfig.server';

/**
 * GET /api/auth/admin-check
 * 현재 로그인 사용자가 관리자 이메일에 포함되는지 확인.
 * 쿠키 기반 인증 우선, Bearer 토큰 fallback (점진 마이그레이션 호환).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await getAuthUserAny(authHeader);

    if (!user || !user.email) {
      return NextResponse.json({ isAdmin: false });
    }

    return NextResponse.json({ isAdmin: isAdminEmail(user.email) });
  } catch (error) {
    console.error('[Admin Check] Error:', error);
    return NextResponse.json({ isAdmin: false });
  }
}
