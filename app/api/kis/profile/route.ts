import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { adminDb } from '@/lib/firebase-admin';

// 서버 메모리 캐시 (5분)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';

/** Admin SDK로 Firestore에서 KIS 토큰 가져오기 */
async function getKISTokenFromAdmin(): Promise<string> {
  const doc = await adminDb.collection('settings').doc('kis_token').get();

  if (doc.exists) {
    const data = doc.data()!;
    const expiresAt = data.expiresAt?._seconds
      ? data.expiresAt._seconds * 1000
      : data.expiresAt;
    const now = Date.now();

    if (now < expiresAt - 5 * 60 * 1000) {
      return data.token;
    }
  }

  // 토큰 만료 또는 없음 → 새로 발급
  const response = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    }),
  });

  if (!response.ok) throw new Error(`Token request failed: ${response.status}`);

  const tokenData = await response.json();
  const token = tokenData.access_token;

  // Firestore에 캐시
  await adminDb.collection('settings').doc('kis_token').set({
    token,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
    updatedAt: new Date(),
  });

  return token;
}

/** KIS API로 한국 주식 프로필 조회 */
async function fetchKoreanProfile(token: string, stockCode: string) {
  const url = `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${stockCode}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'authorization': `Bearer ${token}`,
      'appkey': process.env.KIS_APP_KEY!,
      'appsecret': process.env.KIS_APP_SECRET!,
      'tr_id': 'FHKST01010100',
    },
  });

  if (!res.ok) throw new Error(`KIS API failed: ${res.status}`);

  const data = await res.json();
  if (!data.output) throw new Error('No output from KIS API');

  const output = data.output;
  return {
    stockCode,
    currentPrice: parseFloat(output.stck_prpr || 0),
    per: parseFloat(output.per || 0) || null,
    pbr: parseFloat(output.pbr || 0) || null,
    eps: parseFloat(output.eps || 0) || null,
    high52w: parseFloat(output.w52_hgpr || 0) || null,
    low52w: parseFloat(output.w52_lwpr || 0) || null,
    volume: parseInt(output.acml_vol || 0) || 0,
    marketCap: null,
  };
}

export async function GET(request: NextRequest) {
  const stockCode = request.nextUrl.searchParams.get('stock_code');

  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`kis_profile:${ip}`, 20, 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!stockCode || !/^\d{6}$/.test(stockCode)) {
    return NextResponse.json({ error: 'Invalid stock_code' }, { status: 400 });
  }

  // 캐시 확인
  const cacheKey = `kis_profile_${stockCode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const token = await getKISTokenFromAdmin();
    const result = await fetchKoreanProfile(token, stockCode);

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    const res = NextResponse.json(result);
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    return res;
  } catch (error) {
    console.error('[KIS Profile API] Error:', error);

    if (cached) {
      return NextResponse.json(cached.data);
    }

    return NextResponse.json(
      { error: 'Failed to fetch stock profile' },
      { status: 500 }
    );
  }
}
