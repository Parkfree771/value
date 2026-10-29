-- 로그인 직후 public.users 프로필 보장.
-- Neon Auth 테이블(neon_auth.*)은 관리형이라 트리거를 달지 않고, 로그인 콜백 라우트가 이 함수를 호출.
--
--   1. 같은 id 프로필이 있으면 그대로
--   2. 이메일 인증된 계정이고 같은 이메일의 기존 프로필(이전 DB에서 이관된 것)이 있으면
--      그 프로필의 id를 새 Neon Auth id로 교체 — FK ON UPDATE CASCADE로 글/댓글/배지가 따라옴.
--      닉네임 등 기존 값 보존 (Phase 3 nickname 보존 원칙과 동일).
--   3. 없으면 새로 생성 — 닉네임은 이메일 로컬파트, 충돌 시 _1, _2 …

create or replace function public.ensure_user_profile(
  p_id uuid,
  p_email text,
  p_display_name text,
  p_photo_url text,
  p_email_verified boolean
)
 returns void language plpgsql set search_path to 'public', 'pg_temp'
as $function$
declare
  base_nick text;
  final_nick text;
  i int := 0;
begin
  if exists (select 1 from public.users where id = p_id) then
    return;
  end if;

  if p_email_verified then
    update public.users set id = p_id where lower(email) = lower(p_email);
    if found then
      return;
    end if;
  end if;

  base_nick := split_part(p_email, '@', 1);
  final_nick := base_nick;
  while exists (select 1 from public.users where nickname = final_nick) loop
    i := i + 1;
    final_nick := base_nick || '_' || i::text;
  end loop;

  insert into public.users (id, email, nickname, display_name, photo_url)
  values (p_id, p_email, final_nick, p_display_name, p_photo_url)
  on conflict (id) do nothing;
end;
$function$;
