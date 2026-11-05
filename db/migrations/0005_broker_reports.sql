-- 전문가 추적 — 증권사 리포트 추적 (/expert)
-- ─────────────────────────────────────────────────────────────────
-- 운영자가 주요 리포트를 직접 읽고 정리해 넣는다 (관리자 전용 입력 화면 /expert/write).
-- 국내 증권사·해외 IB 모두 — 증권사명은 자유 입력.
-- 회원 글(posts)과 섞지 않는다: 랭킹·레벨·피드 쿼리는 이 테이블을 모른다.
-- 가격: base_price = 발간일 종가(그날 샀다면) — 저장 시 서버가 KIS 일봉으로 확정.
--       current_price/return_rate = 가격 cron(update-stock-prices.mjs)이 회원 글과 같은 주기로 갱신.
-- 원문은 저장하지 않는다 — headline/summary 는 우리가 쓴 문장, 원문은 source_url 링크만.

create table if not exists public.broker_reports (
  id uuid primary key default gen_random_uuid(),
  broker text not null,               -- '미래에셋증권', 'Goldman Sachs' …
  analyst text,
  ticker text not null,
  exchange text not null,             -- KRX · NAS · NYS · AMS · TSE · HKS …
  currency text not null default 'KRW',
  stock_name text not null,
  report_date date not null,          -- 발간일
  report_title text,                  -- 원문 리포트 제목 (사실 정보)
  opinion text not null default 'buy',-- buy | hold | sell
  opinion_raw text,                   -- 원문 표기 (매수, Overweight, Trading Buy …)
  target_price numeric,
  prev_target_price numeric,
  headline text not null,             -- 우리 요약 — 한 줄
  summary text not null default '',   -- 우리 요약 — 줄마다 핵심 근거 하나
  source_url text,                    -- 원문 링크 (있으면)
  base_price numeric not null,        -- 발간일 종가
  current_price numeric,
  return_rate numeric,                -- (current - base) / base * 100
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_broker_reports_date on public.broker_reports (report_date desc);
create index if not exists idx_broker_reports_ticker on public.broker_reports (ticker);

drop trigger if exists trg_broker_reports_updated_at on public.broker_reports;
create trigger trg_broker_reports_updated_at before update on public.broker_reports
  for each row execute function set_updated_at();

-- 가격 cron 이 ticker → 현재가 맵으로 한 번에 갱신 (update_posts_prices_batch 와 같은 방식)
create or replace function public.update_broker_reports_prices(p_prices jsonb)
returns void
language sql
as $$
  update public.broker_reports b
  set current_price = (p_prices ->> b.ticker)::numeric,
      return_rate = round((((p_prices ->> b.ticker)::numeric - b.base_price) / b.base_price * 100)::numeric, 2)
  where p_prices ? b.ticker and b.base_price > 0;
$$;
