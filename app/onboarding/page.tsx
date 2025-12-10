'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { completeOnboarding, getUserProfile, checkNicknameAvailable } from '@/lib/users';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Link from 'next/link';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [nicknameError, setNicknameError] = useState('');

  const [formData, setFormData] = useState({
    nickname: '',
    termsAgreed: false,
    privacyAgreed: false,
    investmentDisclaimerAgreed: false,
    marketingAgreed: false,
  });

  // 로그인하지 않았으면 로그인 페이지로
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // 이미 온보딩 완료한 사용자는 메인으로
  useEffect(() => {
    const checkOnboarding = async () => {
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile?.onboardingCompleted) {
          router.push('/');
        }
      }
    };
    checkOnboarding();
  }, [user, router]);

  // 닉네임 중복 체크 (debounce 적용)
  useEffect(() => {
    const checkNickname = async () => {
      const nickname = formData.nickname.trim();

      // 빈 문자열이거나 너무 짧으면 체크하지 않음
      if (!nickname || nickname.length < 2) {
        setNicknameAvailable(null);
        setNicknameError('');
        return;
      }

      // 닉네임 길이 체크 (2-20자)
      if (nickname.length > 20) {
        setNicknameAvailable(false);
        setNicknameError('닉네임은 20자 이하여야 합니다.');
        return;
      }

      setNicknameChecking(true);
      setNicknameError('');

      try {
        const available = await checkNicknameAvailable(nickname, user?.uid);
        setNicknameAvailable(available);
        if (!available) {
          setNicknameError('이미 사용 중인 닉네임입니다.');
        }
      } catch (error) {
        console.error('닉네임 중복 체크 오류:', error);
        setNicknameError('닉네임 확인 중 오류가 발생했습니다.');
      } finally {
        setNicknameChecking(false);
      }
    };

    const timeoutId = setTimeout(checkNickname, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.nickname, user?.uid]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      // 닉네임 변경 시 상태 초기화
      if (name === 'nickname') {
        setNicknameAvailable(null);
        setNicknameError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }

    // 필수 항목 체크
    const nickname = formData.nickname.trim();
    if (!nickname) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    if (nickname.length < 2) {
      setError('닉네임은 2자 이상이어야 합니다.');
      return;
    }

    if (nickname.length > 20) {
      setError('닉네임은 20자 이하여야 합니다.');
      return;
    }

    // 닉네임 사용 가능 여부 확인
    if (nicknameAvailable !== true) {
      setError('사용할 수 없는 닉네임입니다. 다른 닉네임을 입력해주세요.');
      return;
    }

    if (!formData.termsAgreed || !formData.privacyAgreed || !formData.investmentDisclaimerAgreed) {
      setError('필수 약관에 동의해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await completeOnboarding(user.uid, {
        nickname: nickname,
        termsAgreed: formData.termsAgreed,
        privacyAgreed: formData.privacyAgreed,
        investmentDisclaimerAgreed: formData.investmentDisclaimerAgreed,
        marketingAgreed: formData.marketingAgreed,
      });

      // 온보딩 완료 후 메인 페이지로
      router.push('/');
    } catch (error) {
      console.error('온보딩 오류:', error);
      setError('온보딩 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            환영합니다! 🎉
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            서비스 이용을 위해 몇 가지 정보를 입력해주세요
          </p>
        </div>

        <Card className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 사용자 정보 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                기본 정보
              </h2>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Google 계정: <span className="font-medium text-gray-900 dark:text-white">{user.email}</span>
                </p>
              </div>

              <div>
                <Input
                  name="nickname"
                  type="text"
                  label="닉네임"
                  placeholder="사용할 닉네임을 입력하세요 (2-20자)"
                  value={formData.nickname}
                  onChange={handleChange}
                  required
                />
                {/* 닉네임 체크 상태 표시 */}
                {formData.nickname.trim().length >= 2 && (
                  <div className="mt-2">
                    {nicknameChecking && (
                      <p className="text-sm text-blue-600 dark:text-blue-400">닉네임 확인 중...</p>
                    )}
                    {!nicknameChecking && nicknameAvailable === true && (
                      <p className="text-sm text-green-600 dark:text-green-400">✓ 사용 가능한 닉네임입니다</p>
                    )}
                    {!nicknameChecking && nicknameAvailable === false && nicknameError && (
                      <p className="text-sm text-red-600 dark:text-red-400">✗ {nicknameError}</p>
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  다른 사용자에게 표시될 이름입니다
                </p>
              </div>
            </div>

            {/* 약관 동의 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                약관 동의
              </h2>

              <div className="space-y-3">
                {/* 이용약관 */}
                <label className="flex items-start gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    name="termsAgreed"
                    checked={formData.termsAgreed}
                    onChange={handleChange}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        이용약관 동의
                      </span>
                      <span className="text-xs text-red-500">(필수)</span>
                    </div>
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      약관 보기
                    </Link>
                  </div>
                </label>

                {/* 개인정보처리방침 */}
                <label className="flex items-start gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    name="privacyAgreed"
                    checked={formData.privacyAgreed}
                    onChange={handleChange}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        개인정보처리방침 동의
                      </span>
                      <span className="text-xs text-red-500">(필수)</span>
                    </div>
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      방침 보기
                    </Link>
                  </div>
                </label>

                {/* 투자 면책 조항 */}
                <label className="flex items-start gap-3 p-4 border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    name="investmentDisclaimerAgreed"
                    checked={formData.investmentDisclaimerAgreed}
                    onChange={handleChange}
                    className="mt-1 w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        투자 면책 조항 동의
                      </span>
                      <span className="text-xs text-red-500">(필수)</span>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1 font-medium">
                      본 사이트의 투자 정보는 투자 권유가 아니며, 투자 손실에 대한 책임은 투자자에게 있습니다.
                    </p>
                    <Link
                      href="/disclaimer"
                      target="_blank"
                      className="text-sm text-red-600 dark:text-red-400 hover:underline font-semibold"
                      onClick={(e) => e.stopPropagation()}
                    >
                      면책 조항 전문 보기
                    </Link>
                  </div>
                </label>

                {/* 마케팅 정보 수신 */}
                <label className="flex items-start gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    name="marketingAgreed"
                    checked={formData.marketingAgreed}
                    onChange={handleChange}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        마케팅 정보 수신 동의
                      </span>
                      <span className="text-xs text-gray-500">(선택)</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      새로운 기능, 이벤트 등의 소식을 이메일로 받아보실 수 있습니다
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? '처리 중...' : '시작하기'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
