-- ticker → 현재가 jsonb 맵을 받아 같은 ticker의 모든 posts row를 한 쿼리로 갱신.
-- 효율: 기존 cron이 ticker당 row 수만큼 UPDATE 루프 (삼성전자 10글 = 10 UPDATE)
--      → SQL aggregate 1쿼리로 ticker 수만큼만 (54 ticker → 1 RPC 호출).
-- 같은 ticker의 가격은 1개만 필요하다는 본질에 맞춰 데이터 일관성·트래픽 모두 개선.

CREATE OR REPLACE FUNCTION public.update_posts_prices_batch(p_prices jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.posts p SET
    prev_return_rate = return_rate,
    current_price = (v.value #>> '{}')::numeric,
    return_rate = ROUND((
      CASE WHEN position_type = 'long'
           THEN ((v.value #>> '{}')::numeric - initial_price) / NULLIF(initial_price, 0) * 100
           ELSE (initial_price - (v.value #>> '{}')::numeric) / NULLIF(initial_price, 0) * 100
      END)::numeric, 2)
  FROM jsonb_each(p_prices) v
  WHERE upper(p.ticker) = upper(v.key)
    AND p.initial_price > 0
    AND (v.value #>> '{}')::numeric > 0;
$$;

REVOKE EXECUTE ON FUNCTION public.update_posts_prices_batch(jsonb) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_posts_prices_batch(jsonb) TO service_role;
