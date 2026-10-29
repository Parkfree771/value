-- Neon 초기 스키마 — Supabase public 스키마(2026-10-29 기준 라이브 상태)에서 이관.
--
-- Supabase 대비 달라진 점:
--   * users.id → auth.users FK 제거. 인증은 Neon Auth(neon_auth."user", uuid)이고
--     프로필 행 생성은 앱(lib/db/users.ts ensureUserProfile)이 담당 — handle_new_auth_user 트리거 대체.
--   * users(id)를 참조하는 FK 전부 ON UPDATE CASCADE — 기존 프로필을 새 Neon Auth id로
--     넘겨받을 때(같은 이메일 첫 로그인) 게시글/댓글/좋아요가 같이 따라오도록.
--   * RLS 정책/grant 없음 — 모든 DB 접근은 서버에서 세션 검증 후 수행.
--   * rls_auto_enable / supabase_function_url / pg_cron 스케줄 제거 (크론은 GitHub Actions).

create extension if not exists pgcrypto;

-- ── enums ──
create type public.post_mode as enum ('text', 'html');
create type public.post_opinion as enum ('buy', 'sell', 'hold');
create type public.post_position as enum ('long', 'short');

-- ── tables ──
create table public.users (
  id uuid not null primary key,
  email text not null unique,
  nickname text not null unique,
  display_name text,
  photo_url text,
  is_admin boolean default false not null,
  is_suspended boolean default false not null,
  onboarding_completed boolean default false not null,
  terms_agreed boolean default false not null,
  privacy_agreed boolean default false not null,
  investment_disclaimer_agreed boolean default false not null,
  terms_version text,
  privacy_version text,
  agreed_at timestamp with time zone,
  equipped_badge_id text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  is_virtual boolean default false not null,
  marketing_agreed boolean default false not null,
  disclaimer_version text,
  bio text
);

create table public.posts (
  id uuid default gen_random_uuid() not null primary key,
  author_id uuid not null references public.users(id) on delete cascade on update cascade,
  title text not null,
  content text,
  css_content text,
  mode post_mode default 'text'::post_mode not null,
  stock_name text not null,
  ticker text not null,
  exchange text not null,
  category text,
  themes text[] default '{}'::text[] not null,
  opinion post_opinion default 'hold'::post_opinion not null,
  position_type post_position default 'long'::post_position not null,
  initial_price numeric not null,
  current_price numeric default 0 not null,
  return_rate numeric default 0 not null,
  prev_return_rate numeric default 0 not null,
  target_price numeric default 0 not null,
  likes integer default 0 not null,
  views integer default 0 not null,
  comment_count integer default 0 not null,
  images jsonb default '[]'::jsonb not null,
  files jsonb default '[]'::jsonb not null,
  stock_data jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone[] default '{}'::timestamp with time zone[] not null
);

create table public.comments (
  id uuid default gen_random_uuid() not null primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade on update cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  likes integer default 0 not null,
  is_deleted boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone
);

create table public.bookmarks (
  user_id uuid not null references public.users(id) on delete cascade on update cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  bookmarked_at timestamp with time zone default now() not null,
  primary key (user_id, post_id)
);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade on update cascade,
  created_at timestamp with time zone default now() not null,
  primary key (post_id, user_id)
);

create table public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade on update cascade,
  created_at timestamp with time zone default now() not null,
  primary key (comment_id, user_id)
);

create table public.user_badges (
  user_id uuid not null references public.users(id) on delete cascade on update cascade,
  badge_id text not null,
  unlocked_at timestamp with time zone default now() not null,
  primary key (user_id, badge_id)
);

create table public.user_consents (
  id uuid default gen_random_uuid() not null primary key,
  user_id uuid not null references public.users(id) on delete cascade on update cascade,
  consent_type text not null,
  terms_version text not null,
  privacy_version text not null,
  terms_agreed boolean not null,
  privacy_agreed boolean not null,
  investment_disclaimer_agreed boolean not null,
  ip_address inet,
  user_agent text,
  agreed_at timestamp with time zone default now() not null,
  marketing_agreed boolean default false not null,
  disclaimer_version text
);

create table public.current_prices (
  ticker text not null primary key,
  exchange text not null,
  current_price numeric not null,
  updated_at timestamp with time zone default now() not null
);

create table public.price_history (
  ticker text not null,
  exchange text not null,
  date date not null,
  close numeric not null,
  primary key (ticker, date)
);

create table public.guru_portfolios (
  slug text not null primary key,
  guru_name text not null,
  data jsonb not null,
  updated_at timestamp with time zone default now() not null
);

create table public.guru_prices (
  ticker text not null primary key,
  current_price numeric not null,
  return_rate numeric not null,
  updated_at timestamp with time zone default now() not null
);

create table public.settings (
  key text not null primary key,
  value jsonb not null,
  updated_at timestamp with time zone default now() not null
);

-- ── indexes ──
create index idx_bookmarks_post on public.bookmarks using btree (post_id);
create index idx_bookmarks_user on public.bookmarks using btree (user_id);
create index idx_comment_likes_user on public.comment_likes using btree (user_id);
create index idx_comments_author on public.comments using btree (author_id);
create index idx_comments_parent on public.comments using btree (parent_id) where (parent_id is not null);
create index idx_comments_post_created on public.comments using btree (post_id, created_at);
create index idx_post_likes_user on public.post_likes using btree (user_id);
create index idx_posts_author_created on public.posts using btree (author_id, created_at desc);
create index idx_posts_category on public.posts using btree (category) where (category is not null);
create index idx_posts_created on public.posts using btree (created_at desc);
create index idx_posts_exchange on public.posts using btree (exchange);
create index idx_posts_likes on public.posts using btree (likes desc);
create index idx_posts_return_rate on public.posts using btree (return_rate desc);
create index idx_posts_themes on public.posts using gin (themes);
create index idx_posts_ticker on public.posts using btree (ticker);
create index idx_posts_views on public.posts using btree (views desc);
create index idx_price_history_ticker_date_desc on public.price_history using btree (ticker, date desc);
create index idx_user_badges_badge on public.user_badges using btree (badge_id);
create index idx_user_consents_user on public.user_consents using btree (user_id, agreed_at desc);
create index idx_users_email on public.users using btree (lower(email));
create index idx_users_is_virtual on public.users using btree (is_virtual) where (is_virtual = true);
create index idx_users_nickname on public.users using btree (lower(nickname));

-- ── functions ──
create or replace function public.set_updated_at()
 returns trigger language plpgsql set search_path to 'public', 'pg_temp'
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.touch_guru_prices_updated_at()
 returns trigger language plpgsql set search_path to 'public', 'pg_catalog'
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create or replace function public.sync_comment_likes_count()
 returns trigger language plpgsql set search_path to 'public', 'pg_temp'
as $function$
begin
  if tg_op = 'INSERT' then
    update public.comments set likes = likes + 1 where id = new.comment_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.comments set likes = greatest(likes - 1, 0) where id = old.comment_id;
    return old;
  end if;
  return null;
end;
$function$;

create or replace function public.sync_post_comment_count()
 returns trigger language plpgsql set search_path to 'public', 'pg_temp'
as $function$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$function$;

create or replace function public.sync_post_likes_count()
 returns trigger language plpgsql set search_path to 'public', 'pg_temp'
as $function$
begin
  if tg_op = 'INSERT' then
    update public.posts set likes = likes + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set likes = greatest(likes - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$function$;

create or replace function public.increment_post_views(p_post_id uuid)
 returns bigint language sql set search_path to 'public'
as $function$
  update public.posts
  set views = coalesce(views, 0) + 1
  where id = p_post_id
  returning views;
$function$;

create or replace function public.update_posts_prices_batch(p_prices jsonb)
 returns void language sql set search_path to 'public'
as $function$
  update public.posts p set
    prev_return_rate = return_rate,
    current_price = (v.value #>> '{}')::numeric,
    return_rate = round((
      case when position_type = 'long'
           then ((v.value #>> '{}')::numeric - initial_price) / nullif(initial_price, 0) * 100
           else (initial_price - (v.value #>> '{}')::numeric) / nullif(initial_price, 0) * 100
      end)::numeric, 2)
  from jsonb_each(p_prices) v
  where upper(p.ticker) = upper(v.key)
    and p.initial_price > 0
    and (v.value #>> '{}')::numeric > 0;
$function$;

-- ── triggers ──
create trigger trg_comment_likes_count after insert or delete on public.comment_likes for each row execute function sync_comment_likes_count();
create trigger trg_comments_count after insert or delete on public.comments for each row execute function sync_post_comment_count();
create trigger trg_guru_portfolios_updated_at before update on public.guru_portfolios for each row execute function set_updated_at();
create trigger trg_guru_prices_touch before update on public.guru_prices for each row execute function touch_guru_prices_updated_at();
create trigger trg_post_likes_count after insert or delete on public.post_likes for each row execute function sync_post_likes_count();
create trigger trg_settings_updated_at before update on public.settings for each row execute function set_updated_at();
create trigger trg_users_updated_at before update on public.users for each row execute function set_updated_at();

-- ── views ──
create view public.user_post_counts as
  select p.author_id,
    (count(*))::integer as post_count,
    u.nickname,
    u.email
  from posts p
    join users u on u.id = p.author_id
  group by p.author_id, u.nickname, u.email;

create view public.user_stats as
  select author_id,
    (count(*))::integer as total_reports,
    coalesce(avg(return_rate), 0::numeric) as avg_return_rate,
    coalesce(max(return_rate), 0::numeric) as max_return_rate,
    coalesce(min(return_rate), 0::numeric) as min_return_rate,
    coalesce(avg(case when return_rate > 0 then 1.0 else 0.0 end) * 100, 0::numeric) as win_rate,
    (coalesce(sum(likes), 0::bigint))::integer as total_likes,
    (coalesce(sum(views), 0::bigint))::integer as total_views,
    (count(*) filter (where position_type = 'short'::post_position))::integer as short_positions,
    coalesce(avg(return_rate) filter (where position_type = 'short'::post_position), 0::numeric) as short_avg_return_rate,
    (count(distinct ticker))::integer as unique_tickers,
    (count(*) filter (where exchange = 'CRYPTO'))::integer as crypto_count
  from posts
  group by author_id;
