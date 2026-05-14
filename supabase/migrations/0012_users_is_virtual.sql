-- 0012_users_is_virtual.sql
-- 가상 작성자 구분 컬럼 + 인덱스
-- 가상 작성자는 auth.users에는 가짜 이메일(@local.invalid)로 등록되지만 영구 ban 처리.
-- public.users.is_virtual = true 인 행은 로그인 불가능, UI에서 "가상" 배지로 표시.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_virtual boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.is_virtual IS
  '가상(시드용) 작성자 여부. auth.users는 가짜 이메일로 존재하지만 로그인 불가.';

-- 가상 작성자만 조회/필터링하는 쿼리용 인덱스 (보통 false라 partial index가 효율적)
CREATE INDEX IF NOT EXISTS idx_users_is_virtual ON public.users(is_virtual) WHERE is_virtual = true;
