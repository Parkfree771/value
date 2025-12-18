'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ReportCard from '@/components/ReportCard';
import Link from 'next/link';
import Card from '@/components/Card';

export default function UserPage() {
  const params = useParams();
  const router = useRouter();
  const username = decodeURIComponent(params.username as string);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchUserReports = async () => {
      try {
        const response = await fetch(`/api/user/profile?username=${encodeURIComponent(username)}`);
        const data = await response.json();

        if (data.success && data.user) {
          setUserReports(data.user.reports || []);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('사용자 리포트 가져오기 실패:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserReports();
  }, [username]);

  // 통계 계산
  const totalReports = userReports.length;
  const avgReturnRate =
    totalReports > 0
      ? (userReports.reduce((sum, r) => sum + r.returnRate, 0) / totalReports).toFixed(2)
      : '0.00';
  const maxReturnRate =
    totalReports > 0
      ? Math.max(...userReports.map((r) => r.returnRate)).toFixed(2)
      : '0.00';
  const winRate =
    totalReports > 0
      ? ((userReports.filter((r) => r.returnRate > 0).length / totalReports) * 100).toFixed(0)
      : '0';
  const totalViews = userReports.reduce((sum, r) => sum + r.views, 0);
  const totalLikes = userReports.reduce((sum, r) => sum + r.likes, 0);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            사용자를 찾을 수 없습니다
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            해당 사용자가 존재하지 않거나 삭제되었습니다.
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            돌아가기
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        href="/ranking"
        className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        랭킹으로 돌아가기
      </Link>

      {/* User Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-8 mb-6 sm:mb-8 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold mr-4">
            {username[0]}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {username}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              투자 리포트 전문가
            </p>
          </div>
        </div>

        {/* User Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-600">
            <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
              {totalReports}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              리포트
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-600">
            <div className={`text-lg sm:text-2xl font-bold ${
              parseFloat(avgReturnRate) > 0 ? 'text-red-600 dark:text-red-400' :
              parseFloat(avgReturnRate) < 0 ? 'text-blue-600 dark:text-blue-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {parseFloat(avgReturnRate) >= 0 ? '+' : ''}{avgReturnRate}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              평균
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-600">
            <div className={`text-lg sm:text-2xl font-bold ${
              parseFloat(maxReturnRate) > 0 ? 'text-red-600 dark:text-red-400' :
              parseFloat(maxReturnRate) < 0 ? 'text-blue-600 dark:text-blue-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {parseFloat(maxReturnRate) >= 0 ? '+' : ''}{maxReturnRate}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              최고
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-600">
            <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
              {winRate}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              승률
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-600">
            <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
              {totalViews.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              조회
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-600">
            <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
              {totalLikes.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              좋아요
            </div>
          </div>
        </div>
      </div>

      {/* User Reports */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          작성한 리포트
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          총 {userReports.length}개의 리포트
        </p>
      </div>

      {userReports.length > 0 ? (
        <div className="space-y-6">
          {userReports.map((report) => (
            <ReportCard key={report.id} {...report} showActions={false} />
          ))}
        </div>
      ) : (
        <Card className="p-8 sm:p-12 text-center">
          <div className="text-4xl sm:text-6xl mb-4">📝</div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
            작성한 리포트가 없습니다
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            아직 이 사용자가 작성한 리포트가 없습니다.
          </p>
        </Card>
      )}
    </div>
  );
}
