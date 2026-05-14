-- ============================================================
-- 0001_tables.sql
-- 워렌버핏 따라잡기 / antstreet.kr — 초기 스키마
--
-- 실행 방법: Supabase Dashboard → SQL Editor에 통째 붙여넣고 Run
-- 실행 순서: 0001 → 0002 → 0003 → 0004 → 0005
-- ============================================================

-- ─── 확장 ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ─── ENUM 타입 ───────────────────────────────────────────
CREATE TYPE post_mode AS ENUM ('text', 'html');
CREATE TYPE post_opinion AS ENUM ('buy', 'sell', 'hold');
CREATE TYPE post_position AS ENUM ('long', 'short');

-- ============================================================
-- 1. users (프로필) — auth.users(id) 참조
-- ============================================================
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  nickname text UNIQUE NOT NULL,
  display_name text,
  photo_url text,

  -- 권한
  is_admin boolean NOT NULL DEFAULT false,
  is_suspended boolean NOT NULL DEFAULT false,

  -- 동의·온보딩
  onboarding_completed boolean NOT NULL DEFAULT false,
  terms_agreed boolean NOT NULL DEFAULT false,
  privacy_agreed boolean NOT NULL DEFAULT false,
  investment_disclaimer_agreed boolean NOT NULL DEFAULT false,
  terms_version text,
  privacy_version text,
  agreed_at timestamptz,

  -- 배지 장착 (id만 저장, 정의는 코드 BADGES 배열)
  equipped_badge_id text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS '사용자 프로필. auth.users와 1:1 매핑';

-- ============================================================
-- 2. posts (글 본체) — 좋아요/조회수 카운터 포함
-- ============================================================
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 본문
  title text NOT NULL,
  content text,                   -- TOAST 자동 분리 (큰 본문)
  css_content text,               -- HTML 모드 인라인 스타일 (현재 거의 빈값)
  mode post_mode NOT NULL DEFAULT 'text',

  -- 종목
  stock_name text NOT NULL,
  ticker text NOT NULL,
  exchange text NOT NULL,
  category text,
  themes text[] NOT NULL DEFAULT '{}',

  -- 포지션·의견
  opinion post_opinion NOT NULL DEFAULT 'hold',
  position_type post_position NOT NULL DEFAULT 'long',

  -- 가격·수익률 (가격 cron이 UPDATE)
  initial_price numeric NOT NULL,
  current_price numeric NOT NULL DEFAULT 0,
  return_rate numeric NOT NULL DEFAULT 0,
  prev_return_rate numeric NOT NULL DEFAULT 0,
  target_price numeric NOT NULL DEFAULT 0,

  -- 카운터 (실시간 increment)
  likes int NOT NULL DEFAULT 0,
  views int NOT NULL DEFAULT 0,
  comment_count int NOT NULL DEFAULT 0,

  -- 첨부
  images jsonb NOT NULL DEFAULT '[]'::jsonb,   -- Firebase Storage URL 배열
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock_data jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz[] NOT NULL DEFAULT '{}'  -- 수정 이력 배열 (현재 구조 유지)
);

COMMENT ON TABLE public.posts IS '글 본체. likes/views는 실시간 increment';

-- ============================================================
-- 3. post_likes (좋아요 누른 사용자, 중복 방지)
-- ============================================================
CREATE TABLE public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- ============================================================
-- 4. bookmarks (북마크, 개인 즐겨찾기)
-- ============================================================
CREATE TABLE public.bookmarks (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  bookmarked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

-- ============================================================
-- 5. comments (댓글 + 대댓글, self-reference)
-- ============================================================
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,  -- NULL이면 최상위 댓글
  content text NOT NULL,
  likes int NOT NULL DEFAULT 0,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- ============================================================
-- 6. comment_likes
-- ============================================================
CREATE TABLE public.comment_likes (
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

-- ============================================================
-- 7. user_badges (배지 해금 이력, sticky)
-- PK가 (user_id, badge_id)라 ON CONFLICT DO NOTHING으로 중복 방지
-- ============================================================
CREATE TABLE public.user_badges (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- ============================================================
-- 8. user_consents (동의 이력, 법적 감사용)
-- ============================================================
CREATE TABLE public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL,           -- 'onboarding' | 'terms_update' | 'marketing_change'
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  terms_agreed boolean NOT NULL,
  privacy_agreed boolean NOT NULL,
  investment_disclaimer_agreed boolean NOT NULL,
  ip_address inet,
  user_agent text,
  agreed_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. settings (KIS 토큰 등 시스템 설정, key-value)
-- ============================================================
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.settings IS '시스템 설정 (예: kis_token). service_role만 접근';

-- ============================================================
-- 10. guru_portfolios (구루 포트폴리오, 기존 컬렉션 매핑)
-- ============================================================
CREATE TABLE public.guru_portfolios (
  slug text PRIMARY KEY,
  guru_name text NOT NULL,
  data jsonb NOT NULL,                  -- 13F 데이터 등
  updated_at timestamptz NOT NULL DEFAULT now()
);
