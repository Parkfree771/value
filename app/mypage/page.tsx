'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Report } from '@/types/report';
import { useAuth } from '@/contexts/AuthContext';
import { useBookmark } from '@/contexts/BookmarkContext';
import { getUserProfile, processUserWithdrawal } from '@/lib/users';
import UserLevelInline from '@/components/UserLevelInline';
import LevelCard, { type LevelBreakdown } from '@/components/LevelCard';
import { InlineLoading } from '@/components/loading/Loading';

const ReportCard = dynamic(() => import('@/components/ReportCard'), {
  loading: () => <div className="skel h-48" />,
});

export default function MyPage() {
  const router = useRouter();
  const { user, authReady, signOut } = useAuth();
  const { bookmarkedIds, isLoading: bookmarkLoading } = useBookmark();
  const [activeTab, setActiveTab] = useState<'reports' | 'bookmarks' | 'settings'>('reports');
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [allPosts, setAllPosts] = useState<any[]>([]); // 전체 게시물 (북마크 필터링용)
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawConfirmText, setWithdrawConfirmText] = useState('');
  const [levelPoints, setLevelPoints] = useState<number | null>(null);
  const [levelBreakdown, setLevelBreakdown] = useState<LevelBreakdown | null>(null);

  // 로그인 체크 (Auth가 준비된 후에만)
  useEffect(() => {
    if (authReady && !user) {
      alert('로그인이 필요한 서비스입니다.');
      router.push('/login');
    }
  }, [user, authReady, router]);

  // 본인 작성 리포트 — Firestore where 쿼리(by-author API). feed.json 전체 받지 않음.
  useEffect(() => {
    if (!user) return;

    const fetchMyReports = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/reports/by-author?uid=${encodeURIComponent(user.uid)}`);
        if (!res.ok) throw new Error('fetch failed');
        const { reports } = await res.json();
        const fetchedReports: Report[] = (reports || []).map((data: any) => ({
          id: data.id,
          title: data.title || '',
          author: data.author || '익명',
          authorId: data.authorId || '',
          stockName: data.stockName || '',
          ticker: data.ticker || '',
          category: data.category || '',
          exchange: data.exchange || '',
          opinion: data.opinion || 'hold',
          returnRate: data.returnRate || 0,
          initialPrice: data.initialPrice || 0,
          currentPrice: data.currentPrice || 0,
          targetPrice: data.targetPrice || 0,
          createdAt: data.createdAt || '',
          views: data.views || 0,
          likes: data.likes || 0,
          mode: 'text',
          content: '',
          cssContent: '',
          images: [],
          files: [],
          positionType: data.positionType || 'long',
          stockData: {},
        }));
        setMyReports(fetchedReports);
      } catch (error) {
        console.error('내 리포트 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyReports();
  }, [user]);

  // 북마크 탭 활성화 시점에만 feed.json lazy fetch (북마크는 본인 글 외 다양한 작가 글)
  useEffect(() => {
    if (!user) return;
    if (activeTab !== 'bookmarks') return;
    if (allPosts.length > 0) return; // 이미 받은 경우 재요청 안 함
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/feed/public');
        const data = await res.json();
        if (!cancelled) setAllPosts(data.posts || []);
      } catch (e) {
        console.error('북마크용 피드 로드 실패:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, user, allPosts.length]);

  // 본인 프로필(닉네임·레벨) 로드 — 게시글 없어도 정보 표시 필요
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        // /api/me/profile — 세션 uid 기준 본인 프로필 + 레벨 점수 내역
        const res = await fetch('/api/me/profile', { credentials: 'include', cache: 'no-store' });
        if (!res.ok) throw new Error(`프로필 조회 실패 (${res.status})`);
        const { profile, levelBreakdown: breakdown } = await res.json();
        if (cancelled || !profile) return;

        setUserProfile((prev: any) => ({
          ...(prev || {}),
          nickname: profile.nickname,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
        }));
        setLevelPoints(typeof profile.levelPoints === 'number' ? profile.levelPoints : 0);
        setLevelBreakdown(breakdown ?? null);
      } catch (e) {
        console.error('프로필 로드 실패:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // 통계 — users 컬렉션 stats 우선. 첫 글 작성 직후처럼 stats가 아직 없으면 myReports 즉석 계산으로 fallback.
  const savedStats = userProfile?.stats;
  const totalReports = savedStats?.totalReports ?? myReports.length;
  const avgReturnRate = (savedStats?.avgReturnRate ?? (
    myReports.length > 0 ? myReports.reduce((sum, r) => sum + r.returnRate, 0) / myReports.length : 0
  )).toFixed(2);
  const maxReturnRate = (savedStats?.maxReturnRate ?? (
    myReports.length > 0 ? Math.max(...myReports.map((r) => r.returnRate)) : 0
  )).toFixed(2);
  const minReturnRate = (savedStats?.minReturnRate ?? (
    myReports.length > 0 ? Math.min(...myReports.map((r) => r.returnRate)) : 0
  )).toFixed(2);
  const winRate = (savedStats?.winRate ?? (
    myReports.length > 0 ? (myReports.filter((r) => r.returnRate > 0).length / myReports.length) * 100 : 0
  )).toFixed(0);
  const totalViews = savedStats?.totalViews ?? myReports.reduce((sum, r) => sum + r.views, 0);
  const totalLikes = savedStats?.totalLikes ?? myReports.reduce((sum, r) => sum + r.likes, 0);

  // 북마크된 게시물 필터링 (이미 로드된 allPosts에서)
  const bookmarkedReports: Report[] = allPosts
    .filter((post: any) => bookmarkedIds.includes(post.id))
    .map((data: any) => ({
      id: data.id,
      title: data.title || '',
      author: data.author || '익명',
      authorId: data.authorId || '',
      levelPoints: data.levelPoints,
      stockName: data.stockName || '',
      ticker: data.ticker || '',
      category: data.category || '',
      exchange: data.exchange || '',
      opinion: data.opinion || 'hold',
      returnRate: data.returnRate || 0,
      initialPrice: data.initialPrice || 0,
      currentPrice: data.currentPrice || 0,
      targetPrice: data.targetPrice || 0,
      createdAt: data.createdAt || '',
      views: data.views || 0,
      likes: data.likes || 0,
      mode: 'text' as const,
      content: '',
      cssContent: '',
      images: [],
      files: [],
      positionType: data.positionType || 'long',
      stockData: {},
    }));

  // 프로필 수정 모달 열기
  const handleOpenEditModal = async () => {
    if (!user) return;
    setIsEditModalOpen(true);

    try {
      const profile = await getUserProfile(user.uid);

      if (profile) {
        setUserProfile((prev: any) => ({
          ...(prev || {}),
          nickname: profile.nickname,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
        }));
        setNewNickname(profile.nickname || user.displayName || '');
      } else {
        setNewNickname(userProfile?.nickname || user.displayName || '');
      }
    } catch (error) {
      console.error('프로필 로드 실패:', error);
      setNewNickname(userProfile?.nickname || user.displayName || '');
    }
  };

  // 프로필 업데이트
  const handleUpdateProfile = async () => {
    if (!user || !newNickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }

    if (newNickname.trim().length < 2 || newNickname.trim().length > 20) {
      alert('닉네임은 2~20자 사이여야 합니다.');
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, nickname: newNickname.trim() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '프로필 업데이트에 실패했습니다.');

      setUserProfile({ ...userProfile, nickname: data.nickname });
      setMyReports(prevReports => prevReports.map(report => ({ ...report, author: data.nickname })));
      alert('프로필이 성공적으로 업데이트되었습니다!');
      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error('프로필 업데이트 오류:', error);
      alert(error.message || '프로필 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 리포트 삭제
  const handleReportDelete = (reportId: string) => {
    setMyReports(prevReports => prevReports.filter(report => report.id !== reportId));
  };

  // 회원 탈퇴
  const handleWithdraw = async () => {
    if (!user || withdrawConfirmText !== '탈퇴합니다') return;

    setIsWithdrawing(true);
    try {
      await processUserWithdrawal(
        user.uid,
        user.email || '',
        userProfile?.nickname || user.displayName || '탈퇴회원',
        []
      );
      await signOut();
      alert('회원 탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.');
      router.push('/');
    } catch (error) {
      console.error('회원 탈퇴 오류:', error);
      alert('회원 탈퇴 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsWithdrawing(false);
      setIsWithdrawModalOpen(false);
    }
  };

  const userName = userProfile?.nickname || user?.displayName || user?.email || '익명';
  const userEmail = user?.email || '';

  if (!authReady || !user) return null;

  const avg = parseFloat(avgReturnRate);
  const max = parseFloat(maxReturnRate);
  const min = parseFloat(minReturnRate);
  const rateClass = (v: number) => (v > 0 ? 'return-positive' : v < 0 ? 'return-negative' : 'return-neutral');
  const stats: { label: string; value: string; className?: string }[] = [
    { label: '평균 수익률', value: `${avg >= 0 ? '+' : ''}${avgReturnRate}%`, className: rateClass(avg) },
    { label: '승률', value: `${winRate}%` },
    { label: '최고 수익', value: `${max >= 0 ? '+' : ''}${maxReturnRate}%`, className: rateClass(max) },
    { label: '최저 수익', value: `${min >= 0 ? '+' : ''}${minReturnRate}%`, className: rateClass(min) },
    { label: '총 조회수', value: totalViews > 999 ? (totalViews / 1000).toFixed(1) + 'K' : String(totalViews) },
    { label: '총 좋아요', value: String(totalLikes) },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* 프로필 머리 — 이름 · 이메일 · 수정 */}
      <header className="border-t-2 border-[var(--theme-border)] pt-4">
        <p className="kicker">마이페이지</p>
        <div className="mt-2 flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 border border-[var(--theme-border)] flex items-center justify-center">
            <span className="headline text-2xl sm:text-3xl">{(userName || '?')[0]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="headline truncate text-[24px] sm:text-[30px] leading-tight">{userName}</h1>
              <UserLevelInline points={levelPoints} size="md" />
            </div>
            <p className="mt-0.5 truncate text-xs sm:text-sm text-[var(--theme-ink-soft)]">{userEmail}</p>
          </div>
          <button
            onClick={handleOpenEditModal}
            className="btn-secondary flex-shrink-0 inline-flex items-center gap-1.5 min-h-9 !px-3 !py-1.5 text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            프로필 수정
          </button>
        </div>

        {/* 기록 — 얇은 괘선으로 나눈 숫자 칸 (gap-px 사이로 괘선 색이 비친다) */}
        <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[var(--theme-border-muted)] border-y border-[var(--theme-border-muted)]">
          {stats.map((s) => (
            <div key={s.label} className="bg-[var(--background)] py-3 px-3 sm:px-4">
              <dt className="text-xs text-[var(--theme-ink-soft)]">{s.label}</dt>
              <dd className={`mt-1.5 font-mono font-black tabular-nums text-lg sm:text-2xl leading-none ${s.className ?? 'text-[var(--foreground)]'}`}>
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {/* 레벨 — 배지 시스템 대체 */}
      {levelPoints !== null && (
        <div className="mt-8">
          <LevelCard points={levelPoints} breakdown={levelBreakdown} isMine />
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="mt-8 flex gap-1 overflow-x-auto scrollbar-hide border-b border-[var(--theme-border-muted)]">
        <button
          onClick={() => setActiveTab('reports')}
          className={`pixel-tab min-h-9 ${activeTab === 'reports' ? 'pixel-tab-active' : ''}`}
        >
          내 리포트 ({totalReports})
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`pixel-tab min-h-9 ${activeTab === 'bookmarks' ? 'pixel-tab-active' : ''}`}
        >
          북마크 ({bookmarkedIds.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pixel-tab min-h-9 ${activeTab === 'settings' ? 'pixel-tab-active' : ''}`}
        >
          설정
        </button>
      </div>

      {/* 탭 컨텐츠 — ReportCard 가 아래 괘선을 갖고 있어 목록은 그대로 쌓는다 */}
      {activeTab === 'reports' && (
        <div>
          {loading ? (
            <InlineLoading label="불러오는 중" />
          ) : myReports.length > 0 ? (
            myReports.map((report) => (
              <ReportCard
                key={report.id}
                {...report}
                showActions={true}
                onDelete={() => handleReportDelete(report.id)}
              />
            ))
          ) : (
            <div className="py-14 text-center">
              <h3 className="headline text-lg">아직 작성한 리포트가 없습니다</h3>
              <p className="mt-2 mb-5 text-sm text-[var(--theme-ink-soft)]">첫 번째 투자 리포트를 작성해보세요!</p>
              <Link href="/write" className="btn-primary inline-flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                첫 리포트 작성하기
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookmarks' && (
        <div>
          {loading || bookmarkLoading ? (
            <InlineLoading label="불러오는 중" />
          ) : bookmarkedReports.length > 0 ? (
            bookmarkedReports.map((report) => (
              <ReportCard key={report.id} {...report} />
            ))
          ) : (
            <div className="py-14 text-center">
              <h3 className="headline text-lg">북마크한 리포트가 없습니다</h3>
              <p className="mt-2 mb-5 text-sm text-[var(--theme-ink-soft)]">관심있는 리포트를 북마크해보세요!</p>
              <Link href="/" className="btn-primary inline-flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                리포트 둘러보기
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <section className="pt-6">
          <h3 className="headline text-[18px]">계정 설정</h3>
          <dl className="mt-3 border-t border-[var(--theme-border)] divide-y divide-[var(--theme-border-muted)]">
            <div className="py-4">
              <dt className="text-sm font-bold">이메일</dt>
              <dd className="mt-1 text-sm text-[var(--theme-ink-soft)] break-all sm:break-normal">{userEmail}</dd>
            </div>

            <div className="py-4">
              <dt className="text-sm font-bold">알림 설정</dt>
              <dd className="mt-1 text-sm text-[var(--theme-ink-soft)]">
                알림 기능은 준비 중입니다. 곧 제공될 예정입니다.
              </dd>
            </div>

            <div className="py-4">
              <dt className="text-sm font-bold text-[var(--color-error)]">위험 영역</dt>
              <dd>
                <p className="mt-1 mb-3 text-sm text-[var(--theme-ink-soft)]">
                  회원 탈퇴 시 작성한 리포트와 댓글은 익명화되며, 일부 정보는 법적 의무에 따라 5년간 보관됩니다.
                </p>
                <button
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="btn-danger min-h-9"
                >
                  회원 탈퇴
                </button>
              </dd>
            </div>
          </dl>
        </section>
      )}

      {/* 프로필 수정 모달 */}
      {isEditModalOpen && (
        <div className="pixel-modal-overlay">
          <div className="pixel-modal max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-h-none sm:overflow-visible">
            <div className="pixel-modal-header">
              <h3 className="pixel-modal-title">프로필 수정</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="pixel-modal-close min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0">
                <svg className="w-[18px] h-[18px] sm:w-auto sm:h-auto text-[var(--theme-ink-soft)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="nickname" className="pixel-label">닉네임</label>
                <input
                  id="nickname"
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  className="pixel-input"
                  placeholder="닉네임을 입력하세요 (2-20자)"
                  maxLength={20}
                  disabled={isUpdating}
                />
                <p className="text-[11px] font-mono tabular-nums text-[var(--theme-ink-soft)]">{newNickname.length}/20자</p>
              </div>

              <div className="flex gap-2.5 border-l-2 border-[var(--theme-orange)] bg-[var(--theme-bg)] px-3 py-2.5">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--theme-orange)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs leading-relaxed text-[var(--foreground)]">
                  닉네임을 변경하면 이미 작성한 모든 게시글의 작성자 이름도 함께 변경됩니다.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsEditModalOpen(false)}
                disabled={isUpdating}
                className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={handleUpdateProfile}
                disabled={isUpdating || !newNickname.trim() || newNickname.trim().length < 2}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? (
                  <>
                    <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                    <span>저장 중...</span>
                  </>
                ) : (
                  '저장'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 회원 탈퇴 확인 모달 */}
      {isWithdrawModalOpen && (
        <div className="pixel-modal-overlay">
          <div className="pixel-modal max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-h-none sm:overflow-visible">
            <div className="pixel-modal-header">
              <h3 className="pixel-modal-title">회원 탈퇴</h3>
              <button onClick={() => setIsWithdrawModalOpen(false)} className="pixel-modal-close min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0">
                <svg className="w-[18px] h-[18px] sm:w-auto sm:h-auto text-[var(--theme-ink-soft)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="mb-2 border-l-2 border-[var(--color-error)] bg-[var(--theme-bg)] px-3 py-3">
                <p className="text-xs font-bold text-[var(--color-error)] mb-2">
                  탈퇴 시 다음 사항에 유의해주세요:
                </p>
                <ul className="text-xs text-[var(--foreground)] space-y-1 list-disc list-inside">
                  <li>작성한 리포트와 댓글은 익명화 처리됩니다</li>
                  <li>이메일, 동의 기록은 법적 의무에 따라 5년간 보관됩니다</li>
                  <li>탈퇴 후 동일 계정으로 재가입해도 이전 데이터는 복구되지 않습니다</li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="withdrawConfirm" className="pixel-label">
                  탈퇴를 원하시면 아래에 <strong className="text-[var(--color-error)]">&quot;탈퇴합니다&quot;</strong>를 입력해주세요
                </label>
                <input
                  id="withdrawConfirm"
                  type="text"
                  value={withdrawConfirmText}
                  onChange={(e) => setWithdrawConfirmText(e.target.value)}
                  className="pixel-input"
                  placeholder="탈퇴합니다"
                  disabled={isWithdrawing}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsWithdrawModalOpen(false);
                  setWithdrawConfirmText('');
                }}
                disabled={isWithdrawing}
                className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawing || withdrawConfirmText !== '탈퇴합니다'}
                className="btn-danger flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isWithdrawing ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
