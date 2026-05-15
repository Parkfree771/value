-- 동의 기록 강화: 마케팅 동의 + 투자 면책 동의 버전 컬럼 추가.
-- 법적 증빙(개인정보보호법 제22조, 정보통신망법 제50조)을 위해 동의 시점·버전 명시 필요.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS marketing_agreed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disclaimer_version text;

ALTER TABLE public.user_consents
  ADD COLUMN IF NOT EXISTS marketing_agreed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disclaimer_version text;
