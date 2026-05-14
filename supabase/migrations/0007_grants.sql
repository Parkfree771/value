-- ============================================================
-- 0007_grants.sql — anon / authenticated 역할에 테이블 권한 부여
--
-- Supabase Dashboard로 만든 테이블은 자동 GRANT 되지만, MCP
-- apply_migration으로 만든 테이블은 안 됨. RLS만 켜져 있으면
-- "permission denied for table posts" (42501) 발생.
--
-- 정책: 일반 사용자가 접근할 수 있는 모든 public 테이블에 SELECT 부여.
-- INSERT/UPDATE/DELETE는 RLS가 행 단위 제한하므로 부여해도 안전.
-- settings는 service_role 전용이므로 의도적으로 제외.
-- ============================================================

-- 스키마 사용 권한 (이게 없으면 테이블 권한 줘도 못 들어옴)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ─── 공개 읽기 (anon + authenticated) ───────────────────
GRANT SELECT ON public.users           TO anon, authenticated;
GRANT SELECT ON public.posts           TO anon, authenticated;
GRANT SELECT ON public.post_likes      TO anon, authenticated;
GRANT SELECT ON public.comments        TO anon, authenticated;
GRANT SELECT ON public.comment_likes   TO anon, authenticated;
GRANT SELECT ON public.user_badges     TO anon, authenticated;
GRANT SELECT ON public.guru_portfolios TO anon, authenticated;
GRANT SELECT ON public.user_stats      TO anon, authenticated;  -- VIEW

-- ─── 인증 사용자 쓰기 (RLS가 행 단위 제한) ────────────────
GRANT UPDATE ON public.users         TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.posts        TO authenticated;
GRANT INSERT, DELETE         ON public.post_likes   TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.bookmarks    TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments     TO authenticated;
GRANT INSERT, DELETE         ON public.comment_likes TO authenticated;
GRANT SELECT, INSERT         ON public.user_consents TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.guru_portfolios TO authenticated;  -- RLS가 admin만 통과시킴

-- ─── settings는 의도적으로 grant 없음 (service_role 전용) ─

-- ─── 시퀀스 (uuid는 시퀀스 없지만 호환 위해) ─────────────
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
