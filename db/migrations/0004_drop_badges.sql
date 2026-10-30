-- 배지 시스템 제거 (레벨 시스템 0003 으로 대체)
-- ─────────────────────────────────────────────────────────────────
-- 코드는 더 이상 user_badges · users.equipped_badge_id 를 읽거나 쓰지 않는다.
-- 0003_user_levels.sql 적용 · 새 코드 배포가 끝난 뒤에 적용할 것 (옛 코드가 아직 돌고 있으면 깨진다).
-- 되돌릴 수 없으니 필요하면 먼저 Neon 브랜치/백업.

drop table if exists public.user_badges;
alter table public.users drop column if exists equipped_badge_id;
