'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateUserProfile } from '@/lib/users';

export default function LoginPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      const user = await signInWithGoogle();

      if (!user) {
        throw new Error('로그인에 실패했습니다');
      }

      const userProfile = await getOrCreateUserProfile(user);

      if (!userProfile.onboardingCompleted) {
        router.push('/onboarding');
      } else {
        router.push('/');
      }
    } catch (error: any) {
      console.error('Google 로그인 오류:', error);
      setError(error.message || 'Google 로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            GuruNote
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            투자 리포트 공유 플랫폼
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6 text-center">
            로그인
          </h2>

          {error && (
            <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          {/* Google Sign-In Button - Official Style */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-[44px] flex items-center justify-center gap-3 bg-white border border-gray-300 rounded shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm"
            style={{ fontFamily: "'Roboto', 'Noto Sans KR', sans-serif" }}
          >
            {/* Google G Logo */}
            <svg className="w-[18px] h-[18px]" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span className="text-[14px] font-medium text-gray-700">
              {loading ? '로그인 중...' : 'Google 계정으로 로그인'}
            </span>
          </button>

          {/* Coming Soon Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
              추가 로그인 옵션 (준비 중)
            </p>

            <div className="space-y-2">
              {/* Kakao - Disabled */}
              <button
                disabled
                className="w-full h-[44px] flex items-center justify-center gap-3 bg-[#FEE500] rounded opacity-40 cursor-not-allowed"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                  <path fill="#000000" d="M12 3C6.477 3 2 6.463 2 10.69c0 2.806 1.867 5.273 4.667 6.67-.167.615-.606 2.23-.695 2.576-.11.42.154.414.324.302.134-.088 2.129-1.45 2.995-2.04A12.6 12.6 0 0012 18.38c5.523 0 10-3.463 10-7.69S17.523 3 12 3z"/>
                </svg>
                <span className="text-[14px] font-medium text-black/85">카카오 로그인</span>
              </button>

              {/* Naver - Disabled */}
              <button
                disabled
                className="w-full h-[44px] flex items-center justify-center gap-3 bg-[#03C75A] rounded opacity-40 cursor-not-allowed"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                  <path fill="#FFFFFF" d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
                </svg>
                <span className="text-[14px] font-medium text-white">네이버 로그인</span>
              </button>
            </div>
          </div>
        </div>

        {/* Terms */}
        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          로그인 시{' '}
          <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
            이용약관
          </Link>
          ,{' '}
          <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
            개인정보처리방침
          </Link>
          ,{' '}
          <Link href="/disclaimer" className="text-blue-600 dark:text-blue-400 hover:underline">
            투자 면책조항
          </Link>
          에 동의하게 됩니다.
        </p>

        {/* Security Notice */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>SSL 암호화로 안전하게 보호됩니다</span>
        </div>
      </div>
    </div>
  );
}
