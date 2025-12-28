// 최소 토큰 테스트 - Firestore 없이
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[Minimal Token] Starting...');
    console.log('[Minimal Token] KIS_BASE_URL:', process.env.KIS_BASE_URL);
    console.log('[Minimal Token] KIS_APP_KEY exists:', !!process.env.KIS_APP_KEY);
    console.log('[Minimal Token] KIS_APP_SECRET exists:', !!process.env.KIS_APP_SECRET);

    const url = `${process.env.KIS_BASE_URL}/oauth2/tokenP`;
    console.log('[Minimal Token] URL:', url);

    const body = {
      grant_type: 'client_credentials',
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    };

    console.log('[Minimal Token] Body:', { ...body, appsecret: '***' });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('[Minimal Token] Response status:', response.status);
    console.log('[Minimal Token] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Minimal Token] Error response:', errorText);

      return NextResponse.json({
        success: false,
        status: response.status,
        error: errorText,
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('[Minimal Token] Success!');

    return NextResponse.json({
      success: true,
      tokenLength: data.access_token?.length,
      expiresIn: data.expires_in,
    });
  } catch (error) {
    console.error('[Minimal Token] Exception:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
