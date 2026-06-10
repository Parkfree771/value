-- ISR keep-warm 크론.
-- 홈(/)·랭킹(/ranking)은 ISR(revalidate=3600) 페이지라 트래픽이 적으면 캐시가 stale/evict 되어
-- "최초 진입" 사용자가 blocking on-demand regeneration을 그대로 뒤집어쓴다(트랜스퍼시픽 DB 왕복 다수).
-- 20분마다 가볍게 GET 해서 백그라운드 재생성을 cron이 대신 떠안게 → 실사용자는 항상 따뜻한 캐시를 받는다.
--
-- net.http_get = pg_net (기존 가격 cron이 net.http_post 사용 중이라 확장은 이미 활성).
-- antstreet.kr 은 Vercel 배포 도메인. 응답 본문은 버린다(타임아웃만 짧게).

select cron.schedule(
  'keepwarm-home',
  '*/20 * * * *',
  $sql$
    select
      net.http_get(url := 'https://antstreet.kr/',        timeout_milliseconds := 15000),
      net.http_get(url := 'https://antstreet.kr/ranking', timeout_milliseconds := 15000);
  $sql$
);
