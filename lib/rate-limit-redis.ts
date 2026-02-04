/**
 * Redis 기반 Rate Limiter (Upstash Redis 사용)
 *
 * 사용하려면:
 * 1. Upstash에서 Redis 인스턴스 생성
 * 2. 환경변수 설정:
 *    - UPSTASH_REDIS_REST_URL
 *    - UPSTASH_REDIS_REST_TOKEN
 * 3. 패키지 설치: npm install @upstash/redis @upstash/ratelimit
 */

import { RateLimitResult } from './rate-limit';

// Redis 클라이언트 (lazy initialization)
let redisClient: any = null;
let rateLimiter: any = null;

/**
 * Redis 연결 초기화
 * 환경변수가 설정되어 있지 않으면 null 반환
 */
async function initRedis() {
  if (redisClient !== null) return redisClient;

  // 환경변수 확인
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[Rate Limit] Redis 환경변수가 설정되지 않음. 메모리 기반 rate limit 사용');
    redisClient = false; // null이 아닌 false로 설정하여 재시도 방지
    return null;
  }

  try {
    // 동적 import (설치되지 않았을 경우 에러 처리)
    const { Redis } = await import('@upstash/redis');
    const { Ratelimit } = await import('@upstash/ratelimit');

    redisClient = new Redis({
      url,
      token,
    });

    // 기본 rate limiter 생성 (분당 100 요청)
    rateLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true, // Upstash 대시보드에서 분석 가능
    });

    console.log('[Rate Limit] Redis 연결 성공');
    return redisClient;
  } catch (error) {
    console.warn('[Rate Limit] Redis 초기화 실패:', error);
    redisClient = false;
    return null;
  }
}

/**
 * Redis 기반 Rate Limit 체크
 * Redis 연결 실패 시 메모리 기반으로 폴백
 */
export async function checkRateLimitRedis(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60 * 1000
): Promise<RateLimitResult> {
  await initRedis();

  // Redis 사용 불가시 메모리 기반 폴백
  if (!rateLimiter) {
    const { checkRateLimit } = await import('./rate-limit');
    return checkRateLimit(identifier, maxRequests, windowMs);
  }

  try {
    const { Ratelimit } = await import('@upstash/ratelimit');

    // 커스텀 limiter 생성 (요청된 설정에 맞게)
    const customLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(maxRequests, `${Math.floor(windowMs / 1000)} s`),
    });

    const result = await customLimiter.limit(identifier);

    return {
      success: result.success,
      remaining: result.remaining,
      resetTime: result.reset,
    };
  } catch (error) {
    console.error('[Rate Limit] Redis 체크 실패:', error);
    // 에러 시 메모리 기반으로 폴백
    const { checkRateLimit } = await import('./rate-limit');
    return checkRateLimit(identifier, maxRequests, windowMs);
  }
}

/**
 * Rate Limit with 다양한 제한 (IP + 사용자 ID 조합)
 */
export async function checkRateLimitAdvanced(
  ip: string,
  userId?: string,
  config: {
    ipLimit?: number;
    userLimit?: number;
    windowMs?: number;
  } = {}
): Promise<RateLimitResult> {
  const { ipLimit = 100, userLimit = 50, windowMs = 60 * 1000 } = config;

  // IP 기반 체크
  const ipResult = await checkRateLimitRedis(`ip:${ip}`, ipLimit, windowMs);
  if (!ipResult.success) {
    return ipResult;
  }

  // 로그인 사용자는 추가 제한
  if (userId) {
    const userResult = await checkRateLimitRedis(`user:${userId}`, userLimit, windowMs);
    if (!userResult.success) {
      return userResult;
    }
    return userResult;
  }

  return ipResult;
}
