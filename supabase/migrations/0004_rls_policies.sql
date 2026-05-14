-- ============================================================
-- 0004_rls_policies.sql — Row Level Security 정책
-- 0003 다음 실행
--
-- 프로젝트 생성 시 "Automatic RLS" 켰으니 모든 신규 테이블에
-- RLS가 자동 활성화돼 있음. 정책 없으면 누구도 접근 불가.
-- 의도적으로 열어주는 정책을 명시.
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- RLS 명시 활성화 (보험 차원, Automatic RLS 안 켰을 경우 대비)
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guru_portfolios ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- users
-- - 누구나 SELECT 가능 (프로필 공개)
-- - 자기 자신만 UPDATE
-- - INSERT는 트리거(handle_new_auth_user)로만, 외부 직접 차단
-- - DELETE는 service_role만 (auth.users CASCADE로 자동 처리)
-- ============================================================
CREATE POLICY users_select_all ON public.users
  FOR SELECT USING (true);

CREATE POLICY users_update_own ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- posts
-- - 누구나 SELECT
-- - 본인만 INSERT/UPDATE/DELETE (작성자)
-- - 관리자(is_admin) 또는 service_role은 모든 행 가능
-- ============================================================
CREATE POLICY posts_select_all ON public.posts
  FOR SELECT USING (true);

CREATE POLICY posts_insert_own ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY posts_update_own ON public.posts
  FOR UPDATE
  USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY posts_delete_own ON public.posts
  FOR DELETE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- post_likes
-- - 누구나 SELECT (좋아요 수 표시용, 트리거가 카운터 갱신)
-- - 본인만 INSERT/DELETE
-- ============================================================
CREATE POLICY post_likes_select_all ON public.post_likes
  FOR SELECT USING (true);

CREATE POLICY post_likes_insert_own ON public.post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY post_likes_delete_own ON public.post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- bookmarks (개인 즐겨찾기, 본인만)
-- ============================================================
CREATE POLICY bookmarks_select_own ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY bookmarks_insert_own ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY bookmarks_delete_own ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- comments
-- - 누구나 SELECT (삭제된 건 본문 비우는 식으로 클라이언트 처리 또는 별도 정책)
-- - 본인만 INSERT/UPDATE/DELETE, 관리자도 가능
-- ============================================================
CREATE POLICY comments_select_all ON public.comments
  FOR SELECT USING (true);

CREATE POLICY comments_insert_own ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY comments_update_own ON public.comments
  FOR UPDATE
  USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY comments_delete_own ON public.comments
  FOR DELETE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- comment_likes
-- ============================================================
CREATE POLICY comment_likes_select_all ON public.comment_likes
  FOR SELECT USING (true);

CREATE POLICY comment_likes_insert_own ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY comment_likes_delete_own ON public.comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- user_badges
-- - 누구나 SELECT (프로필 배지 표시용)
-- - INSERT/DELETE는 service_role만 (배지 시스템이 자동 부여)
-- ============================================================
CREATE POLICY user_badges_select_all ON public.user_badges
  FOR SELECT USING (true);

-- INSERT/DELETE 정책 없음 → service_role(SECRET_KEY)로만 가능

-- ============================================================
-- user_consents (동의 이력, 본인만 조회)
-- ============================================================
CREATE POLICY user_consents_select_own ON public.user_consents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_consents_insert_own ON public.user_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- settings (시스템 설정, service_role만 가능)
-- - 정책 없음 → 일반 사용자 접근 불가
-- - service_role(SECRET_KEY)은 RLS 우회하므로 cron이 사용 가능
-- ============================================================
-- (no policy = no access for authenticated/anon)

-- ============================================================
-- guru_portfolios
-- - 누구나 SELECT
-- - 관리자만 UPDATE/INSERT (또는 service_role)
-- ============================================================
CREATE POLICY guru_portfolios_select_all ON public.guru_portfolios
  FOR SELECT USING (true);

CREATE POLICY guru_portfolios_modify_admin ON public.guru_portfolios
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));
