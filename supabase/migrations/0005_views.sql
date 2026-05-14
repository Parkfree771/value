-- ============================================================
-- 0005_views.sql — 사용자 통계 VIEW
-- 0004 다음 실행
--
-- userStats.ts의 calculateUserStats 함수를 SQL로 옮긴 것.
-- 캐시 안 만들어도 항상 fresh.
-- 글 수 1만개까지 인덱스 기반으로 ms 단위 응답 예상.
-- ============================================================

CREATE OR REPLACE VIEW public.user_stats AS
SELECT
  author_id,

  -- 글 수
  COUNT(*)::int AS total_reports,

  -- 수익률 통계
  COALESCE(AVG(return_rate), 0) AS avg_return_rate,
  COALESCE(MAX(return_rate), 0) AS max_return_rate,
  COALESCE(MIN(return_rate), 0) AS min_return_rate,

  -- 승률 (수익률 > 0 비율)
  COALESCE(
    AVG(CASE WHEN return_rate > 0 THEN 1.0 ELSE 0.0 END) * 100,
    0
  ) AS win_rate,

  -- 호응
  COALESCE(SUM(likes), 0)::int AS total_likes,
  COALESCE(SUM(views), 0)::int AS total_views,

  -- 인버스/숏 통계
  COUNT(*) FILTER (WHERE position_type = 'short')::int AS short_positions,
  COALESCE(
    AVG(return_rate) FILTER (WHERE position_type = 'short'),
    0
  ) AS short_avg_return_rate,

  -- 다양성
  COUNT(DISTINCT ticker)::int AS unique_tickers,

  -- 크립토 글 수
  COUNT(*) FILTER (WHERE exchange = 'CRYPTO')::int AS crypto_count

FROM public.posts
GROUP BY author_id;

COMMENT ON VIEW public.user_stats IS
'사용자별 글 통계 자동 집계. lib/badges.ts의 UserStats 타입과 매칭.
SELECT * FROM user_stats WHERE author_id = $1 로 마이페이지/배지 판정에 사용.';

-- ============================================================
-- VIEW에는 RLS가 적용 안 되니, security_invoker 옵션으로
-- 베이스 테이블(posts)의 RLS 정책을 따르게 함. posts는
-- 누구나 SELECT 가능하니 user_stats도 누구나 SELECT 가능.
-- ============================================================
ALTER VIEW public.user_stats SET (security_invoker = on);
