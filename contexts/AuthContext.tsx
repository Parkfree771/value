'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
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
 * Supabase User → AuthUser 변환은 mapSupabaseUser()에서.
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
  getIdToken: () => Promise<string | null>;
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
  getIdToken: async () => null,
  checkAuth: async () => null,
});

export const useAuth = () => useContext(AuthContext);

function mapSupabaseUser(u: SupabaseUser | null): AuthUser | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  return {
    uid: u.id,
    email: u.email ?? null,
    displayName:
      (meta.full_name as string | undefined) ??
      (meta.name as string | undefined) ??
      null,
    photoURL: (meta.avatar_url as string | undefined) ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 단일 브라우저 클라이언트 인스턴스 — 매 렌더마다 새로 만들면 onAuthStateChange가 중복 구독됨
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // 관리자 상태 확인 (서버 API 호출, 쿠키 자동 포함됨)
  const checkAdminStatus = useCallback(async (u: AuthUser | null) => {
    if (!u) {
      setIsAdmin(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/admin-check', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.isAdmin === true);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('관리자 상태 확인 실패:', err);
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // 1) 초기 세션 한 번 읽기
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const mapped = mapSupabaseUser(data.user);
      setUser(mapped);
      setAuthReady(true);
      checkAdminStatus(mapped);
    })();

    // 2) 이후 변화는 listener로
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const mapped = mapSupabaseUser(session?.user ?? null);
      setUser(mapped);
      setAuthReady(true);
      checkAdminStatus(mapped);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase, checkAdminStatus]);

  const checkAuth = useCallback(async (): Promise<AuthUser | null> => {
    if (user) return user;
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const mapped = mapSupabaseUser(data.user);
      if (mapped) {
        setUser(mapped);
        await checkAdminStatus(mapped);
      }
      return mapped;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, checkAdminStatus]);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
      // /login, /auth/* 페이지에서 로그인하면 next에 같은 페이지가 들어가
      // 로그인 후에도 그 페이지에 머무는 문제 발생 → 메인(/)으로 보낸다.
      const next = pathname === '/login' || pathname.startsWith('/auth/') ? '/' : pathname;

      // 네이티브 앱(iOS/Android): 웹뷰에서 구글 OAuth 페이지가 차단되므로
      // 네이티브 SDK로 idToken을 받아 세션을 만든다. 이후 서버 라우트에서
      // 온보딩 체크 + 풀 리로드로 SSR에도 세션 반영.
      if (isNativeApp()) {
        const idToken = await nativeGoogleSignIn();
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });
        if (error) throw error;
        window.location.href = `/auth/native-callback?next=${encodeURIComponent(next)}`;
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      // 이 시점 이후 브라우저가 Google로 리다이렉트됨. 컴포넌트는 언마운트.
    } catch (err) {
      console.error('로그인 실패:', err);
      setLoading(false);
      throw err;
    }
  }, [supabase]);

  const signInWithApple = useCallback(async () => {
    setLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
      const next = pathname === '/login' || pathname.startsWith('/auth/') ? '/' : pathname;

      // iOS 앱: 시스템 네이티브 Sign in with Apple (App Store 심사 4.8 필수 경로).
      // Android 앱/웹: Supabase OAuth 웹 플로우 — 애플은 웹뷰 OAuth를 차단하지 않아 그대로 동작.
      if (isNativeApp() && getNativePlatform() === 'ios') {
        const idToken = await nativeAppleSignIn();
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: idToken,
        });
        if (error) throw error;
        window.location.href = `/auth/native-callback?next=${encodeURIComponent(next)}`;
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('애플 로그인 실패:', err);
      setLoading(false);
      throw err;
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      if (isNativeApp()) await nativeSocialSignOut();
      setUser(null);
      setIsAdmin(false);
    } catch (err) {
      console.error('로그아웃 실패:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ user, loading, authReady, isAdmin, signInWithGoogle, signInWithApple, signOut, getIdToken, checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}
