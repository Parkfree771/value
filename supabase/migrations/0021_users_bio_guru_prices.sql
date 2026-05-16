-- 누락된 스키마를 마이그레이션으로 명시 (대시보드/MCP로 추가됐던 것들 reproducibility 확보)
--
-- 1) users.bio: /api/users/by-nickname/[nickname] 가 읽지만 0001에 없음.
-- 2) guru_prices: /api/portfolio-prices가 읽고 Edge Function이 쓰는데 마이그레이션 없음.
--
-- 둘 다 이미 운영 중인 객체이므로 IF NOT EXISTS / 멱등 패턴으로 안전하게 선언.

-- ── 1) users.bio ──────────────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio text;

COMMENT ON COLUMN public.users.bio IS '공개 프로필 자기소개. 닉네임 옆에 표시.';

-- ── 2) guru_prices ────────────────────────────────────────────────────────────
-- 9구루(310 ticker)의 최신 현재가·수익률. 매일 미국 장 마감 후 cron이 UPSERT.
CREATE TABLE IF NOT EXISTS public.guru_prices (
  ticker        text PRIMARY KEY,
  current_price numeric NOT NULL,
  return_rate   numeric NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거 (다른 테이블 패턴 따름).
CREATE OR REPLACE FUNCTION public.touch_guru_prices_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guru_prices_touch ON public.guru_prices;
CREATE TRIGGER trg_guru_prices_touch
  BEFORE UPDATE ON public.guru_prices
  FOR EACH ROW EXECUTE FUNCTION public.touch_guru_prices_updated_at();

-- RLS: 누구나 SELECT (포트폴리오 페이지가 공개), 쓰기는 service_role만.
ALTER TABLE public.guru_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guru_prices_select_all ON public.guru_prices;
CREATE POLICY guru_prices_select_all
  ON public.guru_prices FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE는 정책 없음 = service_role만 (BYPASS RLS).
REVOKE INSERT, UPDATE, DELETE ON public.guru_prices FROM anon, authenticated;
