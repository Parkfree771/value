-- pg_cron 잡 본문에 하드코딩된 https://zuuvksnzzownauunfygt.supabase.co/functions/v1/...
-- URL을 한 곳에 모으는 헬퍼. 프로젝트가 다른 인스턴스로 옮길 때 잡 본문을 일일이 수정하지
-- 않고 이 함수만 갱신하면 됨.
--
-- 호환성: 기존 잡 본문은 그대로 두고 새 잡부터 이 함수를 사용. 다음 cron 재스케줄 시 적용.

CREATE OR REPLACE FUNCTION public.supabase_function_url(function_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  -- pg_cron이 실행되는 같은 인스턴스의 functions 엔드포인트.
  -- TODO: project_ref 변경 시 이 줄 한 곳만 수정.
  SELECT 'https://zuuvksnzzownauunfygt.supabase.co/functions/v1/' || function_name;
$$;

COMMENT ON FUNCTION public.supabase_function_url(text) IS
  'pg_cron 잡 본문에서 사용할 Supabase Edge Function URL을 생성. project_ref가 바뀌면 이 함수 본문만 수정.';
