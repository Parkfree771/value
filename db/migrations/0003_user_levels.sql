-- 레벨 시스템 (배지 대체)
-- ─────────────────────────────────────────────────────────────────
-- 점수 = 기록 + 보유 + 수익  (공식은 lib/levels.ts 의 LEVEL_RULES 와 반드시 동기화)
--   기록: 리포트 1개당 20점
--   보유: 리포트마다 작성 후 30일당 1점 (리포트당 최대 12점 = 1년)
--   수익: 리포트마다 수익률 1%p당 1점 (손실은 0점, 리포트당 최대 300점)
-- users.level_points 는 지금까지 도달한 최고 점수 (sticky) — 수익률이 내려가도 레벨은 안 떨어진다.

alter table public.users
  add column if not exists level_points integer not null default 0;

-- 현재 시점 점수 내역 (마이페이지 "점수 내역" 표시용)
create or replace view public.user_level_breakdown as
select
  p.author_id as user_id,
  (count(*) * 20)::int as record_points,
  coalesce(sum(least(floor(extract(epoch from now() - p.created_at) / 86400 / 30), 12)), 0)::int as hold_points,
  coalesce(sum(least(greatest(floor(p.return_rate), 0), 300)), 0)::int as profit_points
from public.posts p
where p.author_id is not null
group by p.author_id;

-- 점수 갱신: 현재 점수가 저장값보다 높을 때만 올린다. target 이 null 이면 전체.
-- 호출: 글 작성 직후(/api/feed POST), 가격 cron 종료 시.
create or replace function public.refresh_level_points(target uuid default null)
returns integer
language sql
as $$
  with updated as (
    update public.users u
       set level_points = b.record_points + b.hold_points + b.profit_points
      from public.user_level_breakdown b
     where b.user_id = u.id
       and (target is null or u.id = target)
       and b.record_points + b.hold_points + b.profit_points > u.level_points
    returning 1
  )
  select count(*)::int from updated;
$$;

select public.refresh_level_points();
