-- 사용자별 게시글 수 view. admin 대시보드 stats + users 페이지의 N+1 패턴 제거.
-- service_role만 SELECT (admin 라우트 전용). RLS는 view에 적용 안 되지만 admin은 service_role로 접근.

DROP VIEW IF EXISTS public.user_post_counts;

CREATE OR REPLACE VIEW public.user_post_counts AS
SELECT
  p.author_id,
  count(*)::int AS post_count,
  u.nickname,
  u.email
FROM public.posts p
JOIN public.users u ON u.id = p.author_id
GROUP BY p.author_id, u.nickname, u.email;

REVOKE ALL ON public.user_post_counts FROM anon, authenticated;
GRANT SELECT ON public.user_post_counts TO service_role;
