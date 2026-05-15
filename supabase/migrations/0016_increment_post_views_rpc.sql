-- 조회수 atomic +1 RPC — race condition 제거 + select+update 2쿼리 → 1쿼리.
-- service_role 라우트에서만 호출. anon/authenticated 직접 RPC 차단.

CREATE OR REPLACE FUNCTION public.increment_post_views(p_post_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts
  SET views = COALESCE(views, 0) + 1
  WHERE id = p_post_id
  RETURNING views;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_post_views(uuid) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_post_views(uuid) TO service_role;
