'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Report } from '@/types/report';
import { useAuth } from '@/contexts/AuthContext';
import { useBookmark } from '@/contexts/BookmarkContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import styles from './MyPage.module.css';

const ReportCard = dynamic(() => import('@/components/ReportCard'), {
  loading: () => <div className="animate-pulse h-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />,
});

export default function MyPage() {
  const router = useRouter();
  const { user, authReady } = useAuth();
  const { bookmarkedIds, isLoading: bookmarkLoading } = useBookmark();
  const [activeTab, setActiveTab] = useState<'reports' | 'bookmarks' | 'settings'>('reports');
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [allPosts, setAllPosts] = useState<any[]>([]); // 전체 게시물 (북마크 필터링용)
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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

  const userName = userProfile?.nickname || user?.displayName || user?.email || '익명';
  const userEmail = user?.email || '';

  if (!authReady || !user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* 프로필 헤더 */}
      <div className={styles.profileHeader}>
        <div className={styles.profileCard}>
          <div className={styles.profileContent}>
            <div className={styles.profileInfo}>
              <div className={styles.avatar}>{userName[0]}</div>
              <div className={styles.userDetails}>
                <h1 className={styles.userName}>{userName}</h1>
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
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardInner}>
            <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
              <svg className={`${styles.statIconSvg} ${styles.statIconSvgGreen}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <div className={styles.statLabel}>최고 수익</div>
              <div className={`${styles.statValue} ${parseFloat(maxReturnRate) >= 0 ? styles.statValueGreen : styles.statValueRed}`}>
                {parseFloat(maxReturnRate) >= 0 ? '+' : ''}{maxReturnRate}%
              </div>
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardInner}>
            <div className={`${styles.statIcon} ${styles.statIconRed}`}>
              <svg className={`${styles.statIconSvg} ${styles.statIconSvgRed}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <div>
              <div className={styles.statLabel}>최저 수익</div>
              <div className={`${styles.statValue} ${parseFloat(minReturnRate) >= 0 ? styles.statValueGreen : styles.statValueRed}`}>
                {parseFloat(minReturnRate) >= 0 ? '+' : ''}{minReturnRate}%
              </div>
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardInner}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
              <svg className={`${styles.statIconSvg} ${styles.statIconSvgBlue}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <div className={styles.statLabel}>총 조회수</div>
              <div className={styles.statValue}>
                {totalViews > 999 ? (totalViews / 1000).toFixed(1) + 'K' : totalViews}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardInner}>
            <div className={`${styles.statIcon} ${styles.statIconPink}`}>
              <svg className={`${styles.statIconSvg} ${styles.statIconSvgPink}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div>
              <div className={styles.statLabel}>총 좋아요</div>
              <div className={styles.statValue}>{totalLikes}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className={styles.tabNav}>
        <button
          onClick={() => setActiveTab('reports')}
          className={`${styles.tabButton} ${activeTab === 'reports' ? styles.tabButtonActive : ''}`}
        >
          내 리포트 ({totalReports})
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`${styles.tabButton} ${activeTab === 'bookmarks' ? styles.tabButtonActive : ''}`}
        >
          북마크 ({bookmarkedIds.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`${styles.tabButton} ${activeTab === 'settings' ? styles.tabButtonActive : ''}`}
        >
          설정
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.loadingSpinner} />
              <p className={styles.loadingText}>로딩 중...</p>
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
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg className={styles.emptyIconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className={styles.emptyTitle}>아직 작성한 리포트가 없습니다</h3>
              <p className={styles.emptyDescription}>첫 번째 투자 리포트를 작성해보세요!</p>
              <Link href="/write" className={styles.emptyButton}>
                <svg className={styles.emptyButtonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className={styles.loading}>
              <div className={styles.loadingSpinner} />
              <p className={styles.loadingText}>로딩 중...</p>
            </div>
          ) : bookmarkedReports.length > 0 ? (
            bookmarkedReports.map((report) => (
              <ReportCard key={report.id} {...report} />
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg className={styles.emptyIconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <h3 className={styles.emptyTitle}>북마크한 리포트가 없습니다</h3>
              <p className={styles.emptyDescription}>관심있는 리포트를 북마크해보세요!</p>
              <Link href="/" className={styles.emptyButton}>
                <svg className={styles.emptyButtonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                리포트 둘러보기
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className={styles.settingsCard}>
          <div className={styles.settingsHeader}>
            <h3 className={styles.settingsTitle}>계정 설정</h3>
          </div>
          <div className={styles.settingsContent}>
            <div className={styles.settingsSection}>
              <h4 className={styles.settingsSectionTitle}>이메일</h4>
              <p className={styles.settingsSectionValue}>{userEmail}</p>
            </div>

            <div className={styles.settingsSection}>
              <h4 className={styles.settingsSectionTitle}>알림 설정</h4>
              <div className={styles.toggleList}>
                <label className={styles.toggleItem}>
                  <span className={styles.toggleLabel}>새 댓글 알림</span>
                  <input type="checkbox" defaultChecked className={styles.toggleInput} />
                  <div className={styles.toggle}>
                    <div className={styles.toggleKnob} />
                  </div>
                </label>
                <label className={styles.toggleItem}>
                  <span className={styles.toggleLabel}>새 팔로워 알림</span>
                  <input type="checkbox" defaultChecked className={styles.toggleInput} />
                  <div className={styles.toggle}>
                    <div className={styles.toggleKnob} />
                  </div>
                </label>
                <label className={styles.toggleItem}>
                  <span className={styles.toggleLabel}>마케팅 이메일 수신</span>
                  <input type="checkbox" className={styles.toggleInput} />
                  <div className={styles.toggle}>
                    <div className={styles.toggleKnob} />
                  </div>
                </label>
              </div>
            </div>

            <div className={styles.settingsSection}>
              <h4 className={`${styles.settingsSectionTitle} ${styles.settingsSectionTitleDanger}`}>위험 영역</h4>
              <button className={styles.dangerButton}>회원 탈퇴</button>
            </div>
          </div>
        </div>
      )}

      {/* 프로필 수정 모달 */}
      {isEditModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>프로필 수정</h3>
              <button onClick={() => setIsEditModalOpen(false)} className={styles.modalClose}>
                <svg className={styles.modalCloseIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label htmlFor="nickname" className={styles.inputLabel}>닉네임</label>
                <input
                  id="nickname"
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  className={styles.input}
                  placeholder="닉네임을 입력하세요 (2-20자)"
                  maxLength={20}
                  disabled={isUpdating}
                />
                <p className={styles.inputHint}>{newNickname.length}/20자</p>
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

            <div className={styles.modalFooter}>
              <button
                onClick={() => setIsEditModalOpen(false)}
                disabled={isUpdating}
                className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
              >
                취소
              </button>
              <button
                onClick={handleUpdateProfile}
                disabled={isUpdating || !newNickname.trim() || newNickname.trim().length < 2}
                className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
              >
                {isUpdating ? (
                  <>
                    <div className={styles.spinner} />
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
    </div>
  );
}
