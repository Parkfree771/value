-- ============================================================
-- 0002_indexes.sql — 검색·정렬 인덱스
-- 0001 다음 실행
-- ============================================================

-- ─── users ───────────────────────────────────────────────
CREATE INDEX idx_users_nickname ON public.users (lower(nickname));
CREATE INDEX idx_users_email ON public.users (lower(email));

-- ─── posts ───────────────────────────────────────────────
-- 작성자별 글 조회 (마이페이지, 사용자 페이지)
CREATE INDEX idx_posts_author_created ON public.posts (author_id, created_at DESC);

-- 최신순 메인 피드
CREATE INDEX idx_posts_created ON public.posts (created_at DESC);

-- 종목별 글 (검색·관련 글)
CREATE INDEX idx_posts_ticker ON public.posts (ticker);
CREATE INDEX idx_posts_exchange ON public.posts (exchange);

-- 수익률순 랭킹
CREATE INDEX idx_posts_return_rate ON public.posts (return_rate DESC);

-- 카테고리·테마 필터
CREATE INDEX idx_posts_category ON public.posts (category) WHERE category IS NOT NULL;
CREATE INDEX idx_posts_themes ON public.posts USING GIN (themes);

-- 인기순 (좋아요 많은 순)
CREATE INDEX idx_posts_likes ON public.posts (likes DESC);

-- 조회수순
CREATE INDEX idx_posts_views ON public.posts (views DESC);

-- ─── post_likes ──────────────────────────────────────────
-- 특정 사용자가 누른 좋아요 조회용
CREATE INDEX idx_post_likes_user ON public.post_likes (user_id);

-- ─── bookmarks ───────────────────────────────────────────
CREATE INDEX idx_bookmarks_user ON public.bookmarks (user_id);
CREATE INDEX idx_bookmarks_post ON public.bookmarks (post_id);

-- ─── comments ────────────────────────────────────────────
-- 글의 댓글 목록 (시간순)
CREATE INDEX idx_comments_post_created ON public.comments (post_id, created_at);

-- 사용자별 댓글
CREATE INDEX idx_comments_author ON public.comments (author_id);

-- 대댓글 (부모 댓글 기준)
CREATE INDEX idx_comments_parent ON public.comments (parent_id) WHERE parent_id IS NOT NULL;

-- ─── comment_likes ───────────────────────────────────────
CREATE INDEX idx_comment_likes_user ON public.comment_likes (user_id);

-- ─── user_badges ─────────────────────────────────────────
-- "이 배지 가진 사람들" 분석용
CREATE INDEX idx_user_badges_badge ON public.user_badges (badge_id);

-- ─── user_consents ───────────────────────────────────────
CREATE INDEX idx_user_consents_user ON public.user_consents (user_id, agreed_at DESC);
