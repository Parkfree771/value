// Neon Auth (Managed Better Auth) 서버 인스턴스.
// Server Component / Route Handler / proxy에서 사용. 클라이언트는 lib/auth/client.ts.

import { createNeonAuth } from '@neondatabase/auth/next/server';

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
