-- 가격 cron을 Supabase 네이티브(Edge Functions + pg_cron)로 이전.
-- 사전조건:
--   1) Edge Functions 'update-stock-prices' / 'update-guru-prices' 배포 완료
--   2) Vault에 'service_role_key' 시크릿 저장
--   3) Edge Function secrets: KIS_APP_KEY, KIS_APP_SECRET, REVALIDATE_SECRET, SITE_URL

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 기존 같은 이름 cron job 정리 (idempotent)
do $$
declare j text;
begin
  for j in select jobname from cron.job where jobname like 'cron-stock-%' or jobname like 'cron-guru-%'
  loop perform cron.unschedule(j); end loop;
end $$;

-- ===== ASIA: KST 09:00 / 12:00 / 16:00 평일 = UTC 00 / 03 / 07 =====
select cron.schedule(
  'cron-stock-asia-0900',
  '0 0 * * 1-5',
  $sql$
    select net.http_post(
      url := 'https://zuuvksnzzownauunfygt.supabase.co/functions/v1/update-stock-prices?market=ASIA',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      timeout_milliseconds := 120000
    );
  $sql$
);

select cron.schedule(
  'cron-stock-asia-1200',
  '0 3 * * 1-5',
  $sql$
    select net.http_post(
      url := 'https://zuuvksnzzownauunfygt.supabase.co/functions/v1/update-stock-prices?market=ASIA',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      timeout_milliseconds := 120000
    );
  $sql$
);

select cron.schedule(
  'cron-stock-asia-1600',
  '0 7 * * 1-5',
  $sql$
    select net.http_post(
      url := 'https://zuuvksnzzownauunfygt.supabase.co/functions/v1/update-stock-prices?market=ASIA',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      timeout_milliseconds := 120000
    );
  $sql$
);

-- ===== US: KST 22:30 / 01:00 / 05:30 평일 = UTC 13:30 / 16:00 / 20:30 =====
select cron.schedule(
  'cron-stock-us-2230',
  '30 13 * * 1-5',
  $sql$
    select net.http_post(
      url := 'https://zuuvksnzzownauunfygt.supabase.co/functions/v1/update-stock-prices?market=US',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      timeout_milliseconds := 120000
    );
  $sql$
);

select cron.schedule(
  'cron-stock-us-0100',
  '0 16 * * 1-5',
  $sql$
    select net.http_post(
      url := 'https://zuuvksnzzownauunfygt.supabase.co/functions/v1/update-stock-prices?market=US',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      timeout_milliseconds := 120000
    );
  $sql$
);

select cron.schedule(
  'cron-stock-us-0530',
  '30 20 * * 1-5',
  $sql$
    select net.http_post(
      url := 'https://zuuvksnzzownauunfygt.supabase.co/functions/v1/update-stock-prices?market=US',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      timeout_milliseconds := 120000
    );
  $sql$
);

-- ===== GURU: KST 06:30 평일 = UTC 21:30 (전날) =====
select cron.schedule(
  'cron-guru-0630',
  '30 21 * * 1-5',
  $sql$
    select net.http_post(
      url := 'https://zuuvksnzzownauunfygt.supabase.co/functions/v1/update-guru-prices',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      timeout_milliseconds := 180000
    );
  $sql$
);
