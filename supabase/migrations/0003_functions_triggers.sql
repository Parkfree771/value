-- ============================================================
-- 0003_functions_triggers.sql — 자동 카운터·타임스탬프 갱신
-- 0002 다음 실행
-- ============================================================

-- ─────────────────────────────────────────────────────────
-- 1. updated_at 자동 갱신 (users, settings)
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_guru_portfolios_updated_at
  BEFORE UPDATE ON public.guru_portfolios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────
-- 2. posts.likes 자동 카운터 (post_likes INSERT/DELETE 시)
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes = likes + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes = GREATEST(likes - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_likes_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes_count();

-- ─────────────────────────────────────────────────────────
-- 3. comments.comment_count 자동 카운터
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comments_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_comment_count();

-- ─────────────────────────────────────────────────────────
-- 4. comments.likes 자동 카운터 (comment_likes 토글 시)
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments SET likes = likes + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments SET likes = GREATEST(likes - 1, 0) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_likes_count
  AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_comment_likes_count();

-- ─────────────────────────────────────────────────────────
-- 5. 새 사용자 가입 시 public.users 자동 생성
--    auth.users INSERT 트리거 → public.users INSERT
--    nickname은 임시값(이메일 prefix), 온보딩에서 갱신
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  base_nick text;
  final_nick text;
  i int := 0;
BEGIN
  -- 이메일 prefix를 임시 닉네임으로
  base_nick := split_part(NEW.email, '@', 1);
  final_nick := base_nick;

  -- 중복 회피
  WHILE EXISTS (SELECT 1 FROM public.users WHERE nickname = final_nick) LOOP
    i := i + 1;
    final_nick := base_nick || '_' || i::text;
  END LOOP;

  INSERT INTO public.users (id, email, nickname, display_name, photo_url)
  VALUES (
    NEW.id,
    NEW.email,
    final_nick,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth schema의 users 테이블 트리거 (Supabase Auth 가입 직후 발동)
CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ─────────────────────────────────────────────────────────
-- 6. 조회수 증가 함수 (24시간 쿠키 중복방지 로직은 앱 레벨에서)
--    앱이 24시간 쿠키 체크 후 이 함수 호출
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_post_view(p_post_id uuid)
RETURNS int AS $$
DECLARE
  v_new_views int;
BEGIN
  UPDATE public.posts
    SET views = views + 1
    WHERE id = p_post_id
    RETURNING views INTO v_new_views;

  RETURN COALESCE(v_new_views, 0);
END;
$$ LANGUAGE plpgsql;
