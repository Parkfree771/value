'use client';

// Neon Auth 브라우저 클라이언트 — /api/auth/[...path] 프록시를 통해 Neon Auth와 통신.

import { createAuthClient } from '@neondatabase/auth/next';

export const authClient = createAuthClient();
