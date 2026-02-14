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

  // 픽셀 체크박스 렌더링 헬퍼
  const PixelCheck = ({ checked, size = 'sm' }: { checked: boolean; size?: 'sm' | 'lg' }) => {
    const sizeClass = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
    return (
      <div className={`${sizeClass} border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        checked
          ? 'bg-[var(--pixel-accent)] border-pixel-accent-dark'
          : 'border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)]'
      }`}>
        {checked && (
          <svg className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    );
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-pixel text-sm text-gray-500 dark:text-gray-400">로딩 중...</div>
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
          <h1 className="font-pixel text-2xl font-bold mb-2">
            회원가입
          </h1>
          <p className="font-pixel text-xs text-gray-500 dark:text-gray-400">
            서비스 이용을 위해 정보를 입력해주세요
          </p>
        </div>

        {/* Main Card */}
        <div className="card-base">
          {error && (
            <div className="mx-6 mt-6 p-3 border-2 border-[var(--pixel-accent)] bg-red-500/10 font-pixel text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* 계정 정보 */}
            <div className="p-6 border-b-[3px] border-[var(--pixel-border-muted)]">
              <h2 className="pixel-label mb-4">계정 정보</h2>
              <div className="flex items-center gap-3 p-3 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg)]">
                <div className="w-10 h-10 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-pixel text-sm font-bold truncate">{user.email}</p>
                  <p className="font-pixel text-xs text-gray-500 dark:text-gray-400">Google 계정</p>
                </div>
              </div>
            </div>

            {/* 닉네임 */}
            <div className="p-6 border-b-[3px] border-[var(--pixel-border-muted)]">
              <h2 className="pixel-label mb-4">닉네임</h2>
              <div>
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  placeholder="닉네임을 입력하세요"
                  className="pixel-input !py-3"
                  maxLength={12}
                />
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    {nicknameChecking && (
                      <p className="font-pixel text-xs text-[var(--pixel-accent)]">확인 중...</p>
                    )}
                    {!nicknameChecking && nicknameAvailable === true && (
                      <p className="font-pixel text-xs text-green-600 dark:text-green-400">사용 가능한 닉네임입니다</p>
                    )}
                    {!nicknameChecking && nicknameAvailable === false && nicknameError && (
                      <p className="font-pixel text-xs text-red-600 dark:text-red-400">{nicknameError}</p>
                    )}
                    {!nicknameChecking && nicknameAvailable === null && formData.nickname.length === 0 && (
                      <p className="font-pixel text-xs text-gray-400">한글, 영문, 숫자 2-12자</p>
                    )}
                  </div>
                  <span className="font-pixel text-xs text-gray-400">{formData.nickname.length}/12</span>
                </div>
              </div>
            </div>

            {/* 약관 동의 */}
            <div className="p-6">
              <h2 className="pixel-label mb-4">약관 동의</h2>

              {/* 전체 동의 */}
              <div
                className="flex items-center gap-3 p-4 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg)] mb-3 cursor-pointer"
                onClick={() => handleAllAgree(!allAgreed)}
              >
                <PixelCheck checked={allAgreed} size="lg" />
                <span className="font-pixel text-sm font-bold">전체 동의</span>
              </div>

              {/* 개별 약관 */}
              <div className="border-[3px] border-[var(--pixel-border-muted)] divide-y-[2px] divide-[var(--pixel-border-muted)]">
                {/* 이용약관 */}
                <div>
                  <div className="flex items-center justify-between p-4">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => setFormData(prev => ({ ...prev, termsAgreed: !prev.termsAgreed }))}
                    >
                      <PixelCheck checked={formData.termsAgreed} />
                      <span className="font-pixel text-xs">
                        이용약관 동의 <span className="text-[var(--pixel-accent)] font-bold">(필수)</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection('terms')}
                      className="text-gray-400 hover:text-[var(--pixel-accent)] p-1 transition-colors"
                    >
                      <svg className={`w-5 h-5 transition-transform ${expandedSection === 'terms' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {expandedSection === 'terms' && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="p-3 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg)] font-pixel text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <p>- 투자 리포트 작성 및 공유 서비스 이용</p>
                        <p>- 허위 정보, 명예훼손, 시세조종 목적 게시물 금지</p>
                        <p>- 작성한 리포트의 저작권은 회원에게 귀속</p>
                        <Link href="/terms" target="_blank" className="inline-block text-[var(--pixel-accent)] hover:underline mt-2">
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
                      <PixelCheck checked={formData.privacyAgreed} />
                      <span className="font-pixel text-xs">
                        개인정보 수집 및 이용 동의 <span className="text-[var(--pixel-accent)] font-bold">(필수)</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection('privacy')}
                      className="text-gray-400 hover:text-[var(--pixel-accent)] p-1 transition-colors"
                    >
                      <svg className={`w-5 h-5 transition-transform ${expandedSection === 'privacy' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {expandedSection === 'privacy' && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="p-3 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg)] font-pixel text-xs text-gray-600 dark:text-gray-400">
                        <table className="w-full">
                          <tbody className="divide-y-[2px] divide-[var(--pixel-border-muted)]">
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
                        <Link href="/privacy" target="_blank" className="inline-block text-[var(--pixel-accent)] hover:underline mt-2">
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
                      <PixelCheck checked={formData.investmentDisclaimerAgreed} />
                      <span className="font-pixel text-xs">
                        투자 면책 조항 동의 <span className="text-[var(--pixel-accent)] font-bold">(필수)</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection('disclaimer')}
                      className="text-gray-400 hover:text-[var(--pixel-accent)] p-1 transition-colors"
                    >
                      <svg className={`w-5 h-5 transition-transform ${expandedSection === 'disclaimer' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {expandedSection === 'disclaimer' && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="p-3 border-2 border-[var(--pixel-accent)] bg-red-500/10 font-pixel text-xs text-red-700 dark:text-red-400 space-y-1">
                        <p className="font-bold mb-2">[필독] 투자 책임 안내</p>
                        <p>- 본 사이트의 정보는 투자 권유가 아닙니다</p>
                        <p>- 투자 손실의 책임은 전적으로 본인에게 있습니다</p>
                        <p>- 과거 수익률이 미래 수익을 보장하지 않습니다</p>
                        <p>- 투자 전 전문가 상담을 권장합니다</p>
                        <Link href="/disclaimer" target="_blank" className="inline-block text-[var(--pixel-accent)] hover:underline mt-2 font-bold">
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
                    <PixelCheck checked={formData.marketingAgreed} />
                    <span className="font-pixel text-xs">
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
                className={`w-full font-pixel py-3 font-bold text-sm transition-all ${
                  loading || !allRequiredAgreed || nicknameAvailable !== true
                    ? 'bg-[var(--pixel-border-muted)] text-gray-500 border-[3px] border-[var(--pixel-border-muted)] cursor-not-allowed'
                    : 'btn-primary'
                }`}
              >
                {loading ? '처리 중...' : '가입 완료'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center font-pixel text-xs text-gray-400 dark:text-gray-500">
          가입 시 입력한 정보는 안전하게 암호화되어 보관됩니다
        </p>
      </div>
    </div>
  );
}
