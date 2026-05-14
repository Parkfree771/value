-- ============================================================
-- 0008_price_tables.sql — 가격 데이터 Postgres화
--
-- Firebase Storage의 prices-history/{TICKER}.json 과 feed.json의
-- 가격 캐시를 Postgres 테이블로 이관.
--
-- - price_history: 일별 종가 시계열 (차트용)
-- - current_prices: 최신 가격 캐시 (cron이 UPSERT, 글 목록 등에서 조회)
-- ============================================================

-- ─── price_history: 일별 종가 ─────────────────────────────
CREATE TABLE public.price_history (
  ticker text NOT NULL,
  exchange text NOT NULL,
  date date NOT NULL,
  close numeric NOT NULL,
  PRIMARY KEY (ticker, date)
);

COMMENT ON TABLE public.price_history IS '종목별 일별 종가. 차트·수익률 시계열용.';

CREATE INDEX idx_price_history_ticker_date_desc
  ON public.price_history (ticker, date DESC);

-- ─── current_prices: 최신 가격 캐시 ──────────────────────
CREATE TABLE public.current_prices (
  ticker text PRIMARY KEY,
  exchange text NOT NULL,
  current_price numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.current_prices IS '티커별 최신 가격. 가격 cron이 UPSERT.';

-- ─── RLS ─────────────────────────────────────────────────
-- 둘 다 공개 가격 정보 → 누구나 SELECT, 쓰기는 service_role만
ALTER TABLE public.price_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_prices  ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_history_select_all ON public.price_history
  FOR SELECT USING (true);

CREATE POLICY current_prices_select_all ON public.current_prices
  FOR SELECT USING (true);

-- ─── Grants ──────────────────────────────────────────────
GRANT SELECT ON public.price_history  TO anon, authenticated;
GRANT SELECT ON public.current_prices TO anon, authenticated;
-- 쓰기는 service_role만 (cron이 service_role 키로 동작)
