'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authReady: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<User | undefined>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  checkAuth: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  authReady: false,
  isAdmin: false,
  signInWithGoogle: async () => undefined,
  signOut: async () => {},
  getIdToken: async () => null,
  checkAuth: async () => null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // 관리자 상태 확인 (서버 API 호출)
  const checkAdminStatus = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setIsAdmin(false);
      return;
    }

    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/auth/admin-check', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin === true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('관리자 상태 확인 실패:', error);
      setIsAdmin(false);
    }
  }, []);

  // Auth 초기화 (백그라운드에서 lazy하게)
  const initAuth = useCallback(async () => {
    if (authInitialized) return;
    setAuthInitialized(true);

    try {
      const { onAuthStateChangeLazy } = await import('@/lib/firebase-lazy');
      onAuthStateChangeLazy((firebaseUser) => {
        setUser(firebaseUser);
        setAuthReady(true);
        // 관리자 상태도 함께 확인
        checkAdminStatus(firebaseUser);
      });
    } catch (error) {
      console.error('Auth 초기화 실패:', error);
      setAuthReady(true);
    }
  }, [authInitialized, checkAdminStatus]);

  // 페이지 로드 후 백그라운드에서 Auth 확인 (지연 로드)
  useEffect(() => {
    // 약간의 지연 후 Auth 초기화 (초기 렌더링 차단 방지)
    const timer = setTimeout(() => {
      initAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, [initAuth]);

  // 명시적으로 Auth 체크 (권한 필요한 액션 전에 호출)
  const checkAuth = useCallback(async (): Promise<User | null> => {
    if (user) return user;

    setLoading(true);
    try {
      const { getCurrentUser } = await import('@/lib/firebase-lazy');
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        await checkAdminStatus(currentUser);
      }
      return currentUser;
    } catch (error) {
      console.error('Auth 체크 실패:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, checkAdminStatus]);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { signInWithGoogleLazy } = await import('@/lib/firebase-lazy');
      const firebaseUser = await signInWithGoogleLazy();
      setUser(firebaseUser);
      // 로그인 후 관리자 상태 확인
      await checkAdminStatus(firebaseUser);
      return firebaseUser;
    } catch (error) {
      console.error('로그인 실패:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { signOutLazy } = await import('@/lib/firebase-lazy');
      await signOutLazy();
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('로그아웃 실패:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('토큰 가져오기 실패:', error);
      return null;
    }
  };

  const value = {
    user,
    loading,
    authReady,
    isAdmin,
    signInWithGoogle,
    signOut,
    getIdToken,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
