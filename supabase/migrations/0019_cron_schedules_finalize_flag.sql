-- 장 마감 cron에만 finalize=true 인자 추가.
-- 장중 cron(09:00, 12:00 KST ASIA / 22:30, 01:00 KST US)은 finalize 없이 → current_prices만 갱신.
-- 장 마감 cron(16:00 KST ASIA / 05:30 KST US)만 finalize=true → 종가를 price_history에 1행 UPSERT.
-- 결과: price_history는 ticker당 1행/일.

do $$
declare j text;
begin
  for j in select jobname from cron.job where jobname like 'cron-stock-%' or jobname like 'cron-guru-%'
  loop perform cron.unschedule(j); end loop;
end $$;

-- ASIA 장중 (current_prices만)
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

-- ASIA 장 마감 (finalize=true → price_history에 종가 1행/일)
select cron.schedule(
  'cron-stock-asia-1600',
  '0 7 * * 1-5',
  $sql$
    select net.http_post(
      url := 'https://zuuvksnzzownauunfygt.supabase.co/functions/v1/update-stock-prices?market=ASIA&finalize=true',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      timeout_milliseconds := 120000
    );
  $sql$
);

-- US 장중 (current_prices만)
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

-- US 장 마감 (finalize=true → price_history)
select cron.schedule(
  'cron-stock-us-0530',
  '30 20 * * 1-5',
  $sql$
    select net.http_post(
      url := 'https://zuuvksnzzownauunfygt.supabase.co/functions/v1/update-stock-prices?market=US&finalize=true',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      timeout_milliseconds := 120000
    );
  $sql$
);

-- GURU (별도 함수, price_history 안 씀)
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
