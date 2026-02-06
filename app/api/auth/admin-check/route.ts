import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthTokenWithEmail } from '@/lib/firebase-admin';
import { isAdminEmail } from '@/lib/admin/adminConfig.server';

/**
 * 현재 로그인한 사용자가 관리자인지 확인하는 API
 * GET /api/auth/admin-check
 *
 * 클라이언트에서 관리자 이메일을 직접 확인하지 않고
 * 이 API를 통해 관리자 여부만 확인합니다.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ isAdmin: false });
    }

    const user = await verifyAuthTokenWithEmail(authHeader);

    if (!user || !user.email) {
      return NextResponse.json({ isAdmin: false });
    }

    const isAdmin = isAdminEmail(user.email);

    return NextResponse.json({
      isAdmin,
      // 관리자 이메일은 노출하지 않음
    });
  } catch (error) {
    console.error('[Admin Check] Error:', error);
    return NextResponse.json({ isAdmin: false });
  }
}
