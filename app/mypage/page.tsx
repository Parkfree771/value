'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Report } from '@/types/report';
import { useAuth } from '@/contexts/AuthContext';
import { useBookmark } from '@/contexts/BookmarkContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { processUserWithdrawal } from '@/lib/users';
import styles from './MyPage.module.css';

const ReportCard = dynamic(() => import('@/components/ReportCard'), {
  loading: () => <div className="animate-pulse h-48 bg-[var(--pixel-border-muted)]/30 border-[3px] border-[var(--pixel-border-muted)]" />,
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

  // 로그인 체크 (Auth가 준비된 후에만)
  useEffect(() => {
    if (authReady && !user) {
      alert('로그인이 필요한 서비스입니다.');
      router.push('/login');
    }
  }, [user, authReady, router]);

  // 사용자 리포트 가져오기
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/feed/public');
        const feedData = await response.json();
        const posts = feedData.posts || [];

        // 전체 게시물 저장 (북마크 필터링용)
        setAllPosts(posts);

        const myPosts = posts
          .filter((post: any) => post.authorId === user.uid)
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (myPosts.length > 0) {
          setUserProfile({ nickname: myPosts[0].author });
        }

        const fetchedReports: Report[] = myPosts.map((data: any) => ({
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
          is_closed: data.is_closed || false,
          closed_at: data.closed_at,
          closed_return_rate: data.closed_return_rate,
          closed_price: data.closed_price,
        }));

        setMyReports(fetchedReports);
      } catch (error) {
        console.error('사용자 데이터 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // 통계 계산
  const totalReports = myReports.length;
  const avgReturnRate = totalReports > 0
    ? (myReports.reduce((sum, r) => sum + r.returnRate, 0) / totalReports).toFixed(2)
    : '0.00';
  const maxReturnRate = totalReports > 0
    ? Math.max(...myReports.map((r) => r.returnRate)).toFixed(2)
    : '0.00';
  const minReturnRate = totalReports > 0
    ? Math.min(...myReports.map((r) => r.returnRate)).toFixed(2)
    : '0.00';
  const winRate = totalReports > 0
    ? ((myReports.filter((r) => r.returnRate > 0).length / totalReports) * 100).toFixed(0)
    : '0';
  const totalViews = myReports.reduce((sum, r) => sum + r.views, 0);
  const totalLikes = myReports.reduce((sum, r) => sum + r.likes, 0);

  // 북마크된 게시물 필터링 (이미 로드된 allPosts에서)
  const bookmarkedReports: Report[] = allPosts
    .filter((post: any) => bookmarkedIds.includes(post.id))
    .map((data: any) => ({
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
      mode: 'text' as const,
      content: '',
      cssContent: '',
      images: [],
      files: [],
      positionType: data.positionType || 'long',
      stockData: {},
      is_closed: data.is_closed || false,
      closed_at: data.closed_at,
      closed_return_rate: data.closed_return_rate,
      closed_price: data.closed_price,
    }));

  // 프로필 수정 모달 열기
  const handleOpenEditModal = async () => {
    if (!user) return;
    setIsEditModalOpen(true);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const profileData = userDocSnap.data();
        setUserProfile(profileData);
        setNewNickname(profileData.nickname || user.displayName || '');
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* 프로필 헤더 */}
      <div className={styles.profileHeader}>
        <div className={styles.profileCard}>
          {/* 배경 로고 */}
          <div className={styles.bgLogo}>
            <Image src="/logo.webp" alt="" width={200} height={200} priority />
          </div>
          {/* 스캔라인 오버레이 */}
          <div className={styles.scanlines} />

          <div className={styles.profileContent}>
            <div className={styles.profileInfo}>
              <div className={styles.avatar}>
                <Image src="/logo.webp" alt="프로필" width={80} height={80} className={styles.avatarImg} />
              </div>
              <div className={styles.userDetails}>
                <div className={styles.userNameRow}>
                  <h1 className={styles.userName}>{userName}</h1>
                  <span className={styles.userBadge}>INVESTOR</span>
                </div>
                <p className={styles.userEmail}>{userEmail}</p>
                <button onClick={handleOpenEditModal} className={styles.editButton}>
                  <svg className={styles.editButtonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  프로필 수정
                </button>
              </div>
            </div>

            <div className={styles.mainStats}>
              <div className={styles.mainStatCard}>
                <div className={styles.mainStatLabel}>평균 수익률</div>
                <div className={`${styles.mainStatValue} ${parseFloat(avgReturnRate) >= 0 ? styles.mainStatPositive : styles.mainStatNegative}`}>
                  {parseFloat(avgReturnRate) >= 0 ? '+' : ''}{avgReturnRate}%
                </div>
              </div>
              <div className={styles.mainStatCard}>
                <div className={styles.mainStatLabel}>승률</div>
                <div className={styles.mainStatValue}>{winRate}%</div>
              </div>
              <div className={styles.mainStatCard}>
                <div className={styles.mainStatLabel}>총 리포트</div>
                <div className={styles.mainStatValue}>{totalReports}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 상세 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="pixel-stat-card">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 border-2 flex items-center justify-center ${styles.statIconGreen}`}>
              <svg className={`w-5 h-5 ${styles.statIconSvgGreen}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">최고 수익</div>
              <div className={`text-xl font-bold tabular-nums ${parseFloat(maxReturnRate) >= 0 ? styles.statValueGreen : styles.statValueRed}`}>
                {parseFloat(maxReturnRate) >= 0 ? '+' : ''}{maxReturnRate}%
              </div>
            </div>
          </div>
        </div>

        <div className="pixel-stat-card">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 border-2 flex items-center justify-center ${styles.statIconRed}`}>
              <svg className={`w-5 h-5 ${styles.statIconSvgRed}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">최저 수익</div>
              <div className={`text-xl font-bold tabular-nums ${parseFloat(minReturnRate) >= 0 ? styles.statValueGreen : styles.statValueRed}`}>
                {parseFloat(minReturnRate) >= 0 ? '+' : ''}{minReturnRate}%
              </div>
            </div>
          </div>
        </div>

        <div className="pixel-stat-card">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 border-2 flex items-center justify-center ${styles.statIconBlue}`}>
              <svg className={`w-5 h-5 ${styles.statIconSvgBlue}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">총 조회수</div>
              <div className="text-xl font-bold tabular-nums">
                {totalViews > 999 ? (totalViews / 1000).toFixed(1) + 'K' : totalViews}
              </div>
            </div>
          </div>
        </div>

        <div className="pixel-stat-card">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 border-2 flex items-center justify-center ${styles.statIconPink}`}>
              <svg className={`w-5 h-5 ${styles.statIconSvgPink}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">총 좋아요</div>
              <div className="text-xl font-bold tabular-nums">{totalLikes}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('reports')}
          className={`pixel-tab ${activeTab === 'reports' ? 'pixel-tab-active' : ''}`}
        >
          내 리포트 ({totalReports})
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`pixel-tab ${activeTab === 'bookmarks' ? 'pixel-tab-active' : ''}`}
        >
          북마크 ({bookmarkedIds.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pixel-tab ${activeTab === 'settings' ? 'pixel-tab-active' : ''}`}
        >
          설정
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-[3px] border-[var(--pixel-accent)] border-t-transparent animate-spin mx-auto mb-4" />
              <p className="font-pixel text-xs text-gray-500 dark:text-gray-400">로딩 중...</p>
            </div>
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
            <div className="pixel-empty-state">
              <div className="w-16 h-16 border-2 border-[var(--pixel-border-muted)] bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-pixel text-base font-bold mb-2">아직 작성한 리포트가 없습니다</h3>
              <p className="font-pixel text-xs text-gray-500 dark:text-gray-400 mb-6">첫 번째 투자 리포트를 작성해보세요!</p>
              <Link href="/write" className="btn-primary inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                첫 리포트 작성하기
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookmarks' && (
        <div className="space-y-4">
          {loading || bookmarkLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-[3px] border-[var(--pixel-accent)] border-t-transparent animate-spin mx-auto mb-4" />
              <p className="font-pixel text-xs text-gray-500 dark:text-gray-400">로딩 중...</p>
            </div>
          ) : bookmarkedReports.length > 0 ? (
            bookmarkedReports.map((report) => (
              <ReportCard key={report.id} {...report} />
            ))
          ) : (
            <div className="pixel-empty-state">
              <div className="w-16 h-16 border-2 border-[var(--pixel-border-muted)] bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <h3 className="font-pixel text-base font-bold mb-2">북마크한 리포트가 없습니다</h3>
              <p className="font-pixel text-xs text-gray-500 dark:text-gray-400 mb-6">관심있는 리포트를 북마크해보세요!</p>
              <Link href="/" className="btn-primary inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                리포트 둘러보기
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="card-base overflow-hidden">
          <div className="px-5 py-4 border-b-[3px] border-[var(--pixel-border-muted)]">
            <h3 className="font-pixel text-base font-bold uppercase tracking-wider">계정 설정</h3>
          </div>
          <div className="p-6">
            <div className="py-4 border-b-2 border-[var(--pixel-border-muted)]">
              <h4 className="font-pixel text-sm font-bold mb-1">이메일</h4>
              <p className="font-pixel text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
            </div>

            <div className="py-4 border-b-2 border-[var(--pixel-border-muted)]">
              <h4 className="font-pixel text-sm font-bold mb-1">알림 설정</h4>
              <div className="card-base p-4">
                <p className="font-pixel text-xs text-gray-500 dark:text-gray-400">
                  알림 기능은 준비 중입니다. 곧 제공될 예정입니다.
                </p>
              </div>
            </div>

            <div className="py-4">
              <h4 className="font-pixel text-sm font-bold text-red-600 dark:text-red-400 mb-4">위험 영역</h4>
              <p className="font-pixel text-xs text-gray-500 dark:text-gray-400 mb-3">
                회원 탈퇴 시 작성한 리포트와 댓글은 익명화되며, 일부 정보는 법적 의무에 따라 5년간 보관됩니다.
              </p>
              <button
                onClick={() => setIsWithdrawModalOpen(true)}
                className="btn-danger"
              >
                회원 탈퇴
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 프로필 수정 모달 */}
      {isEditModalOpen && (
        <div className="pixel-modal-overlay">
          <div className="pixel-modal">
            <div className="pixel-modal-header">
              <h3 className="pixel-modal-title">프로필 수정</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="pixel-modal-close">
                <svg className="w-4.5 h-4.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <p className="font-pixel text-[0.625rem] text-gray-500 dark:text-gray-400">{newNickname.length}/20자</p>
              </div>

              <div className={styles.warningBox}>
                <svg className={styles.warningIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className={styles.warningText}>
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
                    <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
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
          <div className="pixel-modal">
            <div className="pixel-modal-header">
              <h3 className="pixel-modal-title">회원 탈퇴</h3>
              <button onClick={() => setIsWithdrawModalOpen(false)} className="pixel-modal-close">
                <svg className="w-4.5 h-4.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-4 bg-red-500/10 border-2 border-red-500 mb-2">
                <p className="font-pixel text-xs text-red-600 dark:text-red-400 font-bold mb-2">
                  탈퇴 시 다음 사항에 유의해주세요:
                </p>
                <ul className="font-pixel text-xs text-red-600 dark:text-red-400 space-y-1 list-disc list-inside">
                  <li>작성한 리포트와 댓글은 익명화 처리됩니다</li>
                  <li>이메일, 동의 기록은 법적 의무에 따라 5년간 보관됩니다</li>
                  <li>탈퇴 후 동일 계정으로 재가입해도 이전 데이터는 복구되지 않습니다</li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="withdrawConfirm" className="pixel-label">
                  탈퇴를 원하시면 아래에 <strong className="text-red-600">&quot;탈퇴합니다&quot;</strong>를 입력해주세요
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
