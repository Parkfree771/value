-- =============================================================================
-- Supabase advisor 발견 보안 + 성능 이슈 일괄 수정 (2026-05-15)
-- =============================================================================
-- 1) SECURITY DEFINER 함수 anon/authenticated 실행 권한 박탈
-- 2) RLS 정책의 auth.uid() → (select auth.uid()) — InitPlan 1회 평가로 트래픽 증가 시 성능 큰 차이
-- 3) guru_portfolios_modify_admin (ALL) → INSERT/UPDATE/DELETE 분할로 SELECT 중복 평가 제거
-- 4) media_public_read 정책 제거 — public bucket은 URL 접근에 정책 불필요, listing만 노출됨

-- ----- 1) rls_auto_enable EXECUTE 권한 박탈 -----
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;

-- ----- 2) RLS 정책 (select auth.uid()) 패턴으로 재작성 -----

-- bookmarks
DROP POLICY IF EXISTS bookmarks_select_own ON public.bookmarks;
CREATE POLICY bookmarks_select_own ON public.bookmarks
  FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS bookmarks_insert_own ON public.bookmarks;
CREATE POLICY bookmarks_insert_own ON public.bookmarks
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS bookmarks_delete_own ON public.bookmarks;
CREATE POLICY bookmarks_delete_own ON public.bookmarks
  FOR DELETE USING ((select auth.uid()) = user_id);

-- comment_likes
DROP POLICY IF EXISTS comment_likes_insert_own ON public.comment_likes;
CREATE POLICY comment_likes_insert_own ON public.comment_likes
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS comment_likes_delete_own ON public.comment_likes;
CREATE POLICY comment_likes_delete_own ON public.comment_likes
  FOR DELETE USING ((select auth.uid()) = user_id);

-- comments
DROP POLICY IF EXISTS comments_insert_own ON public.comments;
CREATE POLICY comments_insert_own ON public.comments
  FOR INSERT WITH CHECK ((select auth.uid()) = author_id);
DROP POLICY IF EXISTS comments_update_own ON public.comments;
CREATE POLICY comments_update_own ON public.comments
  FOR UPDATE
  USING (
    (select auth.uid()) = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.is_admin = true)
  )
  WITH CHECK (
    (select auth.uid()) = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.is_admin = true)
  );
DROP POLICY IF EXISTS comments_delete_own ON public.comments;
CREATE POLICY comments_delete_own ON public.comments
  FOR DELETE USING (
    (select auth.uid()) = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.is_admin = true)
  );

-- post_likes
DROP POLICY IF EXISTS post_likes_insert_own ON public.post_likes;
CREATE POLICY post_likes_insert_own ON public.post_likes
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS post_likes_delete_own ON public.post_likes;
CREATE POLICY post_likes_delete_own ON public.post_likes
  FOR DELETE USING ((select auth.uid()) = user_id);

-- posts
DROP POLICY IF EXISTS posts_insert_own ON public.posts;
CREATE POLICY posts_insert_own ON public.posts
  FOR INSERT WITH CHECK ((select auth.uid()) = author_id);
DROP POLICY IF EXISTS posts_update_own ON public.posts;
CREATE POLICY posts_update_own ON public.posts
  FOR UPDATE
  USING (
    (select auth.uid()) = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.is_admin = true)
  )
  WITH CHECK (
    (select auth.uid()) = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.is_admin = true)
  );
DROP POLICY IF EXISTS posts_delete_own ON public.posts;
CREATE POLICY posts_delete_own ON public.posts
  FOR DELETE USING (
    (select auth.uid()) = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.is_admin = true)
  );

-- user_consents
DROP POLICY IF EXISTS user_consents_select_own ON public.user_consents;
CREATE POLICY user_consents_select_own ON public.user_consents
  FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS user_consents_insert_own ON public.user_consents;
CREATE POLICY user_consents_insert_own ON public.user_consents
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- users
DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

-- ----- 3) guru_portfolios ALL 정책을 INSERT/UPDATE/DELETE로 분할 (SELECT 중복 평가 제거) -----
DROP POLICY IF EXISTS guru_portfolios_modify_admin ON public.guru_portfolios;
CREATE POLICY guru_portfolios_insert_admin ON public.guru_portfolios
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.is_admin = true)
  );
CREATE POLICY guru_portfolios_update_admin ON public.guru_portfolios
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.is_admin = true));
CREATE POLICY guru_portfolios_delete_admin ON public.guru_portfolios
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = (select auth.uid()) AND users.is_admin = true)
  );

-- ----- 4) media bucket public listing 정책 제거 (public bucket은 URL 접근 시 정책 불필요) -----
DROP POLICY IF EXISTS media_public_read ON storage.objects;
