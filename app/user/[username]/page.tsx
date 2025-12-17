'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import ReportCard from '@/components/ReportCard';
import Link from 'next/link';

export default function UserPage() {
  const params = useParams();
  const username = decodeURIComponent(params.username as string);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserReports = async () => {
      try {
        const response = await fetch(`/api/user/profile?username=${encodeURIComponent(username)}`);
        const data = await response.json();

        if (data.success && data.user) {
          setUserReports(data.user.reports || []);
        }
      } catch (error) {
        console.error('사용자 리포트 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserReports();
  }, [username]);

  const userStats = {
    totalReports: 0,
    avgReturnRate: 0,
    totalLikes: 0,
    totalViews: 0,
    successRate: 0,
  };

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {username}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              투자 리포트 전문가
            </p>
          </div>
        </div>

        {/* User Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {userStats.totalReports}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              총 리포트
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              +{userStats.avgReturnRate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              평균 수익률
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {userStats.successRate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              적중률
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {userStats.totalLikes.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              총 좋아요
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {userStats.totalViews.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              총 조회수
            </div>
          </div>
        </div>
      </div>

      {/* User Reports */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          작성한 리포트
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          총 {userReports.length}개의 리포트
        </p>
      </div>

      {userReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userReports.map((report) => (
            <ReportCard key={report.id} {...report} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            작성한 리포트가 없습니다
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            아직 이 사용자가 작성한 리포트가 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
