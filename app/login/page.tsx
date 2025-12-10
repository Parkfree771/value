'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
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

      // Google 로그인
      const user = await signInWithGoogle();

      if (!user) {
        throw new Error('로그인에 실패했습니다');
      }

      // 사용자 프로필 가져오기 또는 생성
      const userProfile = await getOrCreateUserProfile(user);

      // 온보딩 완료 여부 체크
      if (!userProfile.onboardingCompleted) {
        // 첫 로그인이면 온보딩 페이지로
        router.push('/onboarding');
      } else {
        // 온보딩 완료했으면 메인 페이지로
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
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            워렌버핏 따라잡기
          </h1>
          <p className="text-gray-600 dark:text-gray-400">투자 리포트로 성과를 추적하세요</p>
        </div>

        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            소셜 로그인
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          <p className="text-center text-gray-600 dark:text-gray-400 mb-6 text-sm">
            소셜 계정으로 간편하게 시작하세요
          </p>

          {/* Social Login */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-3"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? '로그인 중...' : 'Google로 시작하기'}
            </Button>

            <Button variant="outline" className="w-full flex items-center justify-center gap-3" disabled>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm3.5 14.5h-7v-1h7v1zm0-2h-7v-1h7v1zm0-2h-7v-1h7v1z"/>
              </svg>
              카카오로 시작하기 (준비 중)
            </Button>

            <Button variant="outline" className="w-full flex items-center justify-center gap-3" disabled>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              </svg>
              네이버로 시작하기 (준비 중)
            </Button>
          </div>

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            로그인하시면{' '}
            <a href="/terms" className="underline hover:text-gray-700 dark:hover:text-gray-300">
              이용약관
            </a>
            {' '}및{' '}
            <a href="/privacy" className="underline hover:text-gray-700 dark:hover:text-gray-300">
              개인정보처리방침
            </a>
            에 동의하게 됩니다.
          </p>
        </Card>
      </div>
    </div>
  );
}
