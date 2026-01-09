import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 간단한 메모리 기반 Rate Limiter (서버리스 환경에서는 인스턴스별로 독립)
// 프로덕션에서 더 강력한 보호가 필요하면 Upstash Redis 등 사용 권장
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1분
const MAX_REQUESTS_PER_WINDOW = 100; // 분당 최대 100 요청

function getClientIP(request: NextRequest): string {
  // Vercel/Cloudflare 등에서 실제 클라이언트 IP 가져오기
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  record.count++;

  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  return false;
}

// 오래된 레코드 정리 (메모리 누수 방지)
function cleanupOldRecords() {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

// 주기적 정리 (100회 요청마다)
let requestCount = 0;

export function middleware(request: NextRequest) {
  // API 경로에만 Rate Limiting 적용
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = getClientIP(request);

    // 주기적 정리
    requestCount++;
    if (requestCount % 100 === 0) {
      cleanupOldRecords();
    }

    // Rate Limit 체크
    if (isRateLimited(ip)) {
      console.warn(`[Rate Limit] IP ${ip} exceeded rate limit`);
      return NextResponse.json(
        {
          success: false,
          error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
          retryAfter: 60
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
            'X-RateLimit-Remaining': '0',
          }
        }
      );
    }

    // Rate Limit 헤더 추가
    const response = NextResponse.next();
    const record = rateLimitMap.get(ip);
    if (record) {
      response.headers.set('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW));
      response.headers.set('X-RateLimit-Remaining', String(Math.max(0, MAX_REQUESTS_PER_WINDOW - record.count)));
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // API 경로에만 적용
    '/api/:path*',
  ],
};
