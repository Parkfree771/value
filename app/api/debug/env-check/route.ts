// 환경 변수 확인용 디버깅 엔드포인트
import { NextRequest, NextResponse } from 'next/server';

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

  // 환경 변수 존재 여부만 확인 (실제 값은 노출하지 않음)
  return NextResponse.json({
    env_check: {
      KIS_BASE_URL: process.env.KIS_BASE_URL ? '✅ SET' : '❌ NOT SET',
      KIS_APP_KEY: process.env.KIS_APP_KEY ? '✅ SET' : '❌ NOT SET',
      KIS_APP_SECRET: process.env.KIS_APP_SECRET ? '✅ SET' : '❌ NOT SET',
      CRON_SECRET: process.env.CRON_SECRET ? '✅ SET' : '❌ NOT SET',

      // 값의 일부만 보여주기 (처음 10자만)
      KIS_BASE_URL_preview: process.env.KIS_BASE_URL?.substring(0, 30) + '...',
      KIS_APP_KEY_preview: process.env.KIS_APP_KEY?.substring(0, 10) + '...',
      KIS_APP_SECRET_preview: process.env.KIS_APP_SECRET?.substring(0, 10) + '...',
    }
  });
}
