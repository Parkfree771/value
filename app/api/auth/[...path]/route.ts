// Neon Auth 프록시 — 브라우저 authClient 요청을 Neon Auth로 전달하고 세션 쿠키를 심는다.
// /api/auth/admin-check 같은 정적 라우트가 이 catch-all보다 우선.

import { auth } from '@/lib/auth/server';

export const { GET, POST } = auth.handler();
