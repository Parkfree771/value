'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Report } from '@/types/report';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';

const Card = dynamic(() => import('@/components/Card'));
const ReportCard = dynamic(() => import('@/components/ReportCard'), {
  loading: () => <div className="animate-pulse h-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />,
});
const Button = dynamic(() => import('@/components/Button'));

export default function MyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'reports' | 'bookmarks' | 'settings'>('reports');
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [updatingPrices, setUpdatingPrices] = useState(false);

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      alert('로그인이 필요한 서비스입니다.');
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // 사용자 프로필 및 리포트 가져오기
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);

        // 사용자 프로필 가져오기
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data());
        }

        // 사용자가 작성한 리포트 가져오기
        const postsRef = collection(db, 'posts');
        const q = query(
          postsRef,
          where('authorId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);

        const fetchedReports: Report[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();

          // createdAt을 문자열로 변환
          let createdAtStr = '';
          if (data.createdAt instanceof Timestamp) {
            createdAtStr = data.createdAt.toDate().toISOString().split('T')[0];
          } else if (typeof data.createdAt === 'string') {
            createdAtStr = data.createdAt;
          } else {
            createdAtStr = new Date().toISOString().split('T')[0];
          }

          return {
            id: doc.id,
            title: data.title || '',
            author: data.authorName || '익명',
            authorId: data.authorId || '',
            stockName: data.stockName || '',
            ticker: data.ticker || '',
            opinion: data.opinion || 'hold',
            returnRate: data.returnRate || 0,
            initialPrice: data.initialPrice || 0,
            currentPrice: data.currentPrice || 0,
            targetPrice: data.targetPrice || 0,
            createdAt: createdAtStr,
            views: data.views || 0,
            likes: data.likes || 0,
            mode: data.mode || 'text',
            content: data.content || '',
            cssContent: data.cssContent || '',
            images: data.images || [],
            files: data.files || [],
            positionType: data.positionType || 'long',
            stockData: data.stockData || {},
          };
        });

        setMyReports(fetchedReports);
      } catch (error) {
        console.error('사용자 데이터 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // 실시간 주가 및 수익률 업데이트
  useEffect(() => {
    if (myReports.length === 0) return;

    const updatePrices = async () => {
      setUpdatingPrices(true);
      console.log('[MyPage] 실시간 주가 업데이트 시작');

      try {
        const updatedReports = await Promise.all(
          myReports.map(async (report) => {
            // ticker와 initialPrice가 없으면 기존 리포트 반환
            if (!report.ticker || !report.initialPrice || report.initialPrice === 0) {
              console.log(`[MyPage] ${report.id}: ticker 또는 initialPrice 없음`);
              return report;
            }

            try {
              // API를 통해 실시간 주가 및 수익률 조회
              const response = await fetch('/api/update-return-rate', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ticker: report.ticker,
                  initialPrice: report.initialPrice,
                  positionType: report.positionType || 'long',
                }),
              });

              if (!response.ok) {
                console.log(`[MyPage] ${report.id}: API 호출 실패 (${response.status})`);
                return report;
              }

              const priceData = await response.json();

              if (priceData && !priceData.error) {
                console.log(`[MyPage] ${report.id} 수익률 업데이트:`, priceData);
                return {
                  ...report,
                  currentPrice: priceData.currentPrice,
                  returnRate: priceData.returnRate,
                  stockData: {
                    ...report.stockData,
                    ...priceData.stockData,
                  },
                };
              }

              console.log(`[MyPage] ${report.id}: 가격 조회 실패, 기존 데이터 유지`);
              return report;
            } catch (error) {
              console.error(`[MyPage] ${report.id} 가격 업데이트 실패:`, error);
              return report;
            }
          })
        );

        setMyReports(updatedReports);
        console.log('[MyPage] 모든 리포트 수익률 업데이트 완료');
      } catch (error) {
        console.error('[MyPage] 가격 업데이트 중 오류:', error);
      } finally {
        setUpdatingPrices(false);
      }
    };

    updatePrices();
  }, [myReports.length]); // myReports.length를 의존성으로 사용하여 초기 로드 시에만 실행

  // 통계 계산
  const totalReports = myReports.length;
  const avgReturnRate =
    totalReports > 0
      ? (myReports.reduce((sum, r) => sum + r.returnRate, 0) / totalReports).toFixed(2)
      : '0.00';
  const maxReturnRate =
    totalReports > 0
      ? Math.max(...myReports.map((r) => r.returnRate)).toFixed(2)
      : '0.00';
  const winRate =
    totalReports > 0
      ? ((myReports.filter((r) => r.returnRate > 0).length / totalReports) * 100).toFixed(0)
      : '0';
  const totalViews = myReports.reduce((sum, r) => sum + r.views, 0);
  const totalLikes = myReports.reduce((sum, r) => sum + r.likes, 0);

  // 사용자 정보
  const userName = userProfile?.nickname || user?.displayName || user?.email || '익명';
  const userEmail = user?.email || '';

  // 가입일 포맷
  let joinDate = '';
  if (userProfile?.createdAt) {
    if (userProfile.createdAt instanceof Timestamp) {
      joinDate = userProfile.createdAt.toDate().toISOString().split('T')[0];
    } else if (typeof userProfile.createdAt === 'string') {
      joinDate = userProfile.createdAt;
    }
  }

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4 sm:p-6 lg:sticky lg:top-20">
            {/* Profile Picture */}
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
                {userName[0]}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1 truncate px-2">{userName}</h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate px-2">{userEmail}</p>
            </div>

            {/* Stats */}
            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <div className="text-center p-3 sm:p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 rounded-lg">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">평균 수익률</div>
                <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">+{avgReturnRate}%</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">리포트</div>
                  <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{totalReports}</div>
                </div>
                <div className="p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">총 조회</div>
                  <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{totalViews.toLocaleString()}</div>
                </div>
                <div className="p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">총 좋아요</div>
                  <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{totalLikes}</div>
                </div>
                <div className="p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">승률</div>
                  <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{winRate}%</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button variant="outline" className="w-full text-sm sm:text-base">프로필 수정</Button>
              <Button variant="outline" className="w-full text-sm sm:text-base">설정</Button>
            </div>

            {joinDate && (
              <div className="mt-4 sm:mt-6 text-xs sm:text-sm text-gray-500 text-center">
                가입일: {joinDate}
              </div>
            )}
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Tab Navigation */}
          <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              내 리포트
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap ${
                activeTab === 'bookmarks'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              북마크
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              설정
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'reports' && (
            <div>
              {/* 실시간 업데이트 상태 */}
              {updatingPrices && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm text-blue-900 dark:text-blue-100">실시간 주가 및 수익률 업데이트 중...</span>
                </div>
              )}

              {/* Performance Summary */}
              <Card className="p-4 sm:p-6 mb-4 sm:mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">포트폴리오 성과</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">전체 평균</div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">+{avgReturnRate}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">최고 수익률</div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">+{maxReturnRate}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">승률</div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{winRate}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">총 좋아요</div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{totalLikes}</div>
                  </div>
                </div>
              </Card>

              {/* Reports List */}
              <div className="space-y-6">
                {myReports.length > 0 ? (
                  myReports.map((report) => (
                    <ReportCard key={report.id} {...report} />
                  ))
                ) : (
                  <Card className="p-8 sm:p-12 text-center">
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">아직 작성한 리포트가 없습니다.</p>
                    <Link
                      href="/write"
                      className="inline-block px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      첫 리포트 작성하기
                    </Link>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === 'bookmarks' && (
            <Card className="p-4 sm:p-6">
              <div className="text-center py-8 sm:py-12">
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">북마크한 리포트가 없습니다.</p>
              </div>
            </Card>
          )}

          {activeTab === 'settings' && (
            <Card className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">계정 설정</h3>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2">이메일</h4>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 break-all">{userEmail}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2">알림 설정</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">새 댓글 알림</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">새 팔로워 알림</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">마케팅 이메일 수신</span>
                    </label>
                  </div>
                </div>
                <div>
                  <Button variant="danger" className="text-sm sm:text-base">회원 탈퇴</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
