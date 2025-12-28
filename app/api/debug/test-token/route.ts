// KIS 토큰 발급 테스트
import { NextRequest, NextResponse } from 'next/server';
import { getKISToken } from '@/lib/kis';

export async function GET(request: NextRequest) {
  // 보안: CRON_SECRET으로 보호
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('[Test Token] Starting token test...');

    // 토큰 발급 시도
    const kisToken = await getKISToken();

    console.log('[Test Token] Token received successfully');
    console.log('[Test Token] Token length:', kisToken.length);
    console.log('[Test Token] Token preview:', kisToken.substring(0, 20) + '...');

    return NextResponse.json({
      success: true,
      message: 'Token generated successfully',
      tokenLength: kisToken.length,
      tokenPreview: kisToken.substring(0, 20) + '...',
    });
  } catch (error) {
    console.error('[Test Token] Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
