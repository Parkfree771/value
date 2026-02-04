/**
 * 간단한 메모리 기반 Rate Limiter
 * 프로덕션에서는 Redis 사용 권장
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// IP별 요청 카운트 저장
const rateLimitMap = new Map<string, RateLimitEntry>();

// 주기적으로 만료된 엔트리 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 1000); // 1분마다 정리

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Rate Limit 체크
 * @param identifier 식별자 (IP, userId 등)
 * @param maxRequests 윈도우 당 최대 요청 수
 * @param windowMs 윈도우 시간 (밀리초)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  // 새로운 윈도우 시작
  if (!entry || entry.resetTime < now) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  // 기존 윈도우에 요청 추가
  entry.count++;

  if (entry.count > maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * IP 주소 추출 헬퍼
 */
export function getClientIP(request: Request): string {
  // Vercel/Netlify 등 프록시 뒤에서는 X-Forwarded-For 사용
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

/**
 * Rate Limit 응답 헤더 설정
 */
export function setRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult,
  maxRequests: number
): void {
  headers.set('X-RateLimit-Limit', maxRequests.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
}
