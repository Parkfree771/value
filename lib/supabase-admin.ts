// 서버 사이드 service_role 클라이언트 — RLS 우회.
// API Routes / Cron / Scripts에서만 사용. 절대 클라이언트 노출 금지.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error('Supabase service client: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY 누락');
  }
  cached = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
