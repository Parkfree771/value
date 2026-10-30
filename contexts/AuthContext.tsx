'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { authClient } from '@/lib/auth/client';
import {
  isNativeApp,
  getNativePlatform,
  nativeGoogleSignIn,
  nativeAppleSignIn,
  nativeSocialSignOut,
} from '@/lib/nativeApp';

/**
 * 앱 내부에서 쓰는 정규화된 사용자 형태.
 * Firebase User와 키 이름 호환 (uid, displayName, photoURL).
 * Neon Auth(Better Auth) User → AuthUser 변환은 mapSessionUser()에서.
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authReady: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  authReady: false,
  isAdmin: false,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signOut: async () => {},
  checkAuth: async () => null,
});

export const useAuth = () => useContext(AuthContext);

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

function mapSessionUser(u: SessionUser | null | undefined): AuthUser | null {
  if (!u) return null;
  return {
    uid: u.id,
    email: u.email ?? null,
    displayName: u.name || null,
    photoURL: u.image ?? null,
  };
}

// /login, /auth/* 페이지에서 로그인하면 next에 같은 페이지가 들어가
// 로그인 후에도 그 페이지에 머무는 문제 발생 → 메인(/)으로 보낸다.
function nextPathAfterLogin(): string {
  if (typeof window === 'undefined') return '/';
  const { pathname, search } = window.location;
  if (pathname === '/login') {
    // /login?next=/write — 글쓰기 안내 화면 등에서 넘어온 경우 원래 화면으로 복귀 (내부 경로만)
    const next = new URLSearchParams(search).get('next');
    return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  }
  return pathname.startsWith('/auth/') ? '/' : pathname;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, refetch } = authClient.useSession();
  const user = useMemo(() => mapSessionUser(session?.user), [session?.user]);
  const authReady = !isPending;

  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // 관리자 상태 확인 (서버 API 호출, 쿠키 자동 포함됨)
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    fetch('/api/auth/admin-check', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { isAdmin: false }))
      .then((data) => {
        if (!cancelled) setIsAdmin(data.isAdmin === true);
      })
      .catch((err) => {
        console.error('관리자 상태 확인 실패:', err);
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const checkAuth = useCallback(async (): Promise<AuthUser | null> => {
    if (user) return user;
    setLoading(true);
    try {
      const { data } = await authClient.getSession();
      const mapped = mapSessionUser(data?.user);
      if (mapped) await refetch();
      return mapped;
    } finally {
      setLoading(false);
    }
  }, [user, refetch]);

  const signInWithProvider = useCallback(
    async (provider: 'google' | 'apple', getNativeIdToken: (() => Promise<string>) | null) => {
      setLoading(true);
      try {
        const next = nextPathAfterLogin();
        const callbackURL = `/auth/callback?next=${encodeURIComponent(next)}`;

        // 네이티브 앱: 네이티브 SDK로 idToken을 받아 바로 세션을 만든다 (리다이렉트 없음).
        // 이후 서버 라우트에서 프로필 보장 + 온보딩 체크 + 풀 리로드로 SSR에도 세션 반영.
        if (getNativeIdToken) {
          const idToken = await getNativeIdToken();
          const { error } = await authClient.signIn.social({ provider, idToken: { token: idToken } });
          if (error) throw error;
          window.location.href = `/auth/native-callback?next=${encodeURIComponent(next)}`;
          return;
        }

        const { error } = await authClient.signIn.social({ provider, callbackURL });
        if (error) throw error;
        // 이 시점 이후 브라우저가 OAuth 제공자로 리다이렉트됨. 컴포넌트는 언마운트.
      } catch (err) {
        console.error(`${provider} 로그인 실패:`, err);
        setLoading(false);
        throw err;
      }
    },
    [],
  );

  // 네이티브 앱(iOS/Android): 웹뷰에서 구글 OAuth 페이지가 차단되므로 네이티브 SDK 경로.
  const signInWithGoogle = useCallback(
    () => signInWithProvider('google', isNativeApp() ? nativeGoogleSignIn : null),
    [signInWithProvider],
  );

  // iOS 앱: 시스템 네이티브 Sign in with Apple (App Store 심사 4.8 필수 경로).
  // Android 앱/웹: OAuth 웹 플로우 — 애플은 웹뷰 OAuth를 차단하지 않아 그대로 동작.
  const signInWithApple = useCallback(
    () =>
      signInWithProvider(
        'apple',
        isNativeApp() && getNativePlatform() === 'ios' ? nativeAppleSignIn : null,
      ),
    [signInWithProvider],
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await authClient.signOut();
      if (error) throw error;
      if (isNativeApp()) await nativeSocialSignOut();
      setIsAdmin(false);
      await refetch();
    } catch (err) {
      console.error('로그아웃 실패:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  return (
    <AuthContext.Provider
      value={{ user, loading, authReady, isAdmin, signInWithGoogle, signInWithApple, signOut, checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}
