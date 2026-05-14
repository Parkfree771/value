-- ============================================================
-- 0006_security_hardening.sql — Supabase Security Advisor 대응
--
-- 1. 모든 함수에 search_path 고정 (search-path injection 방지)
-- 2. handle_new_auth_user를 anon/authenticated REST 노출에서 차단
--    (트리거 전용 함수이므로 PostgREST RPC로 호출될 필요 없음)
--
-- rls_auto_enable은 Supabase Automatic RLS 기능이 자동 생성한
-- 함수라 우리 마이그레이션에서 건드리지 않음.
-- ============================================================

-- ─── 1. 함수 search_path 고정 ───────────────────────────────
ALTER FUNCTION public.set_updated_at()           SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_post_likes_count()    SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_post_comment_count()  SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_comment_likes_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_post_view(uuid)  SET search_path = public, pg_temp;

-- handle_new_auth_user는 auth schema 트리거에서 호출되므로
-- search_path에 auth도 포함시켜 안전하게 한정
ALTER FUNCTION public.handle_new_auth_user()
  SET search_path = public, auth, pg_temp;

-- ─── 2. handle_new_auth_user REST RPC 차단 ─────────────────
-- 트리거 전용이므로 일반 사용자가 직접 호출할 필요 없음.
-- PUBLIC에서 회수하면 anon/authenticated 모두 차단됨.
-- 트리거는 SECURITY DEFINER로 owner 권한으로 실행되므로
-- REVOKE 후에도 정상 동작.
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM authenticated;
