-- 0021/0022에서 추가한 함수가 search_path 미설정 (advisor WARN 0011_function_search_path_mutable).
-- 표준 hardening: search_path = public, pg_catalog 명시 → SQL injection via 검색경로 차단.
--
-- 멱등: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.touch_guru_prices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.supabase_function_url(function_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT 'https://zuuvksnzzownauunfygt.supabase.co/functions/v1/' || function_name;
$$;
