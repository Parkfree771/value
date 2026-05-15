-- 미국 장 마감 cron을 안전 마진 15분 확보한 시각으로 이동.
-- 동절기(EST) 마감 = KST 06:00, 하절기(EDT) 마감 = KST 05:00.
-- KST 06:15 = UTC 21:15 → 동절기 +15분, 하절기 +1시간 15분 (둘 다 마감 후 안전).
-- 코인은 같은 cron에 자동 포함되어 미국 종가 시점과 통일.

do $$
begin
  perform cron.unschedule('cron-stock-us-0530');
exception when others then null;
end $$;

select cron.schedule(
  'cron-stock-us-0615',
  '15 21 * * 1-5',
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
