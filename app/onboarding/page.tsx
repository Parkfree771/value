'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { completeOnboarding, getUserProfile, checkNicknameAvailable, saveConsentRecord } from '@/lib/users';
import Link from 'next/link';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, authReady } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [nicknameError, setNicknameError] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nickname: '',
    termsAgreed: false,
    privacyAgreed: false,
    investmentDisclaimerAgreed: false,
    marketingAgreed: false,
  });

  const allRequiredAgreed = formData.termsAgreed && formData.privacyAgreed && formData.investmentDisclaimerAgreed;
  const allAgreed = allRequiredAgreed && formData.marketingAgreed;

  useEffect(() => {
    if (authReady && !user) {
      router.push('/login');
    }
  }, [user, authReady, router]);

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

  useEffect(() => {
    const checkNickname = async () => {
      const nickname = formData.nickname.trim();

      if (!nickname || nickname.length < 2) {
        setNicknameAvailable(null);
        setNicknameError('');
        return;
      }

      if (nickname.length > 12) {
        setNicknameAvailable(false);
        setNicknameError('닉네임은 12자 이하여야 합니다.');
        return;
      }

      const nicknameRegex = /^[a-zA-Z0-9가-힣]+$/;
      if (!nicknameRegex.test(nickname)) {
        setNicknameAvailable(false);
        setNicknameError('닉네임은 한글, 영문, 숫자만 사용할 수 있습니다.');
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = e.target.checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (name === 'nickname') {
        setNicknameAvailable(null);
        setNicknameError('');
      }
    }
  };

  const handleAllAgree = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      termsAgreed: checked,
      privacyAgreed: checked,
      investmentDisclaimerAgreed: checked,
      marketingAgreed: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }

    const nickname = formData.nickname.trim();
    if (!nickname) {
      setError('닉네임을 입력해주세요.');
      return;
    }

    if (nickname.length < 2) {
      setError('닉네임은 2자 이상이어야 합니다.');
      return;
    }

    if (nickname.length > 12) {
      setError('닉네임은 12자 이하여야 합니다.');
      return;
    }

    const nicknameRegex = /^[a-zA-Z0-9가-힣]+$/;
    if (!nicknameRegex.test(nickname)) {
      setError('닉네임은 한글, 영문, 숫자만 사용할 수 있습니다.');
      return;
    }

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

      await saveConsentRecord(
        user.uid,
        user.email || '',
        {
          termsAgreed: formData.termsAgreed,
          privacyAgreed: formData.privacyAgreed,
          investmentDisclaimerAgreed: formData.investmentDisclaimerAgreed,
          marketingAgreed: formData.marketingAgreed,
        },
        'onboarding'
      );

      await completeOnboarding(user.uid, {
        nickname: nickname,
        termsAgreed: formData.termsAgreed,
        privacyAgreed: formData.privacyAgreed,
        investmentDisclaimerAgreed: formData.investmentDisclaimerAgreed,
        marketingAgreed: formData.marketingAgreed,
      });

      router.push('/');
    } catch (error) {
      console.error('온보딩 오류:', error);
      setError('온보딩 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!authReady) {
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
      <div className="w-full max-w-[480px]">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            회원가입
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            서비스 이용을 위해 정보를 입력해주세요
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          {error && (
            <div className="mx-6 mt-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* 계정 정보 */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">계정 정보</h2>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Google 계정</p>
                </div>
              </div>
            </div>

            {/* 닉네임 */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">닉네임</h2>
              <div>
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  placeholder="닉네임을 입력하세요"
                  className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  maxLength={12}
                />
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    {nicknameChecking && (
                      <p className="text-xs text-red-600 dark:text-red-400">확인 중...</p>
                    )}
                    {!nicknameChecking && nicknameAvailable === true && (
                      <p className="text-xs text-green-600 dark:text-green-400">사용 가능한 닉네임입니다</p>
                    )}
                    {!nicknameChecking && nicknameAvailable === false && nicknameError && (
                      <p className="text-xs text-red-600 dark:text-red-400">{nicknameError}</p>
                    )}
                    {!nicknameChecking && nicknameAvailable === null && formData.nickname.length === 0 && (
                      <p className="text-xs text-gray-400">한글, 영문, 숫자 2-12자</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{formData.nickname.length}/12</span>
                </div>
              </div>
            </div>

            {/* 약관 동의 */}
            <div className="p-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">약관 동의</h2>

              {/* 전체 동의 */}
              <div
                className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg mb-3 cursor-pointer"
                onClick={() => handleAllAgree(!allAgreed)}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  allAgreed
                    ? 'bg-red-600 border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {allAgreed && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="font-medium text-gray-900 dark:text-white">전체 동의</span>
              </div>

              {/* 개별 약관 */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                {/* 이용약관 */}
                <div>
                  <div className="flex items-center justify-between p-4">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => setFormData(prev => ({ ...prev, termsAgreed: !prev.termsAgreed }))}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        formData.termsAgreed
                          ? 'bg-red-600 border-red-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {formData.termsAgreed && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        이용약관 동의 <span className="text-red-500">(필수)</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection('terms')}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                    >
                      <svg className={`w-5 h-5 transition-transform ${expandedSection === 'terms' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {expandedSection === 'terms' && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <p>- 투자 리포트 작성 및 공유 서비스 이용</p>
                        <p>- 허위 정보, 명예훼손, 시세조종 목적 게시물 금지</p>
                        <p>- 작성한 리포트의 저작권은 회원에게 귀속</p>
                        <Link href="/terms" target="_blank" className="inline-block text-red-600 dark:text-red-400 hover:underline mt-2">
                          전문 보기
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* 개인정보 수집 및 이용 */}
                <div>
                  <div className="flex items-center justify-between p-4">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => setFormData(prev => ({ ...prev, privacyAgreed: !prev.privacyAgreed }))}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        formData.privacyAgreed
                          ? 'bg-red-600 border-red-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {formData.privacyAgreed && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        개인정보 수집 및 이용 동의 <span className="text-red-500">(필수)</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection('privacy')}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                    >
                      <svg className={`w-5 h-5 transition-transform ${expandedSection === 'privacy' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {expandedSection === 'privacy' && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs text-gray-600 dark:text-gray-400">
                        <table className="w-full">
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            <tr>
                              <td className="py-1.5 text-gray-500 dark:text-gray-500 w-20">수집 항목</td>
                              <td className="py-1.5">이메일, 닉네임, 프로필 사진(선택)</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 text-gray-500 dark:text-gray-500">수집 목적</td>
                              <td className="py-1.5">회원 식별, 서비스 제공</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 text-gray-500 dark:text-gray-500">보유 기간</td>
                              <td className="py-1.5">탈퇴 시까지 (일부 정보 5년 보관)</td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="text-[11px] text-gray-400 mt-2">* 동의 거부 시 서비스 이용이 제한됩니다.</p>
                        <Link href="/privacy" target="_blank" className="inline-block text-red-600 dark:text-red-400 hover:underline mt-2">
                          전문 보기
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* 투자 면책 조항 */}
                <div>
                  <div className="flex items-center justify-between p-4">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => setFormData(prev => ({ ...prev, investmentDisclaimerAgreed: !prev.investmentDisclaimerAgreed }))}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        formData.investmentDisclaimerAgreed
                          ? 'bg-red-600 border-red-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {formData.investmentDisclaimerAgreed && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        투자 면책 조항 동의 <span className="text-red-500">(필수)</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection('disclaimer')}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                    >
                      <svg className={`w-5 h-5 transition-transform ${expandedSection === 'disclaimer' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {expandedSection === 'disclaimer' && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400 space-y-1">
                        <p className="font-medium mb-2">[필독] 투자 책임 안내</p>
                        <p>- 본 사이트의 정보는 투자 권유가 아닙니다</p>
                        <p>- 투자 손실의 책임은 전적으로 본인에게 있습니다</p>
                        <p>- 과거 수익률이 미래 수익을 보장하지 않습니다</p>
                        <p>- 투자 전 전문가 상담을 권장합니다</p>
                        <Link href="/disclaimer" target="_blank" className="inline-block text-red-600 dark:text-red-400 hover:underline mt-2 font-medium">
                          전문 보기
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* 마케팅 정보 수신 */}
                <div className="flex items-center justify-between p-4">
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => setFormData(prev => ({ ...prev, marketingAgreed: !prev.marketingAgreed }))}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      formData.marketingAgreed
                        ? 'bg-red-600 border-red-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {formData.marketingAgreed && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      마케팅 정보 수신 동의 <span className="text-gray-400">(선택)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 가입 버튼 */}
            <div className="p-6 pt-0">
              <button
                type="submit"
                disabled={loading || !allRequiredAgreed || nicknameAvailable !== true}
                className={`w-full h-12 rounded-lg font-medium text-white transition-all ${
                  loading || !allRequiredAgreed || nicknameAvailable !== true
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                }`}
              >
                {loading ? '처리 중...' : '가입 완료'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          가입 시 입력한 정보는 안전하게 암호화되어 보관됩니다
        </p>
      </div>
    </div>
  );
}
