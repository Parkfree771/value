'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/Card';
import ReportCard from '@/components/ReportCard';
import Button from '@/components/Button';
import { getCurrentUser, getUserReports } from '@/lib/reportStore';
import { Report } from '@/types/report';

// Mock user data
const mockUser = {
  name: '투자왕김부자',
  email: 'investor@example.com',
  joinDate: '2024-06-15',
  totalReports: 24,
  avgReturnRate: 32.5,
  totalViews: 15234,
  totalLikes: 1234,
  followers: 456,
  following: 123,
};

// Mock user reports
const mockUserReports = [
  {
    id: '1',
    title: '삼성전자 반도체 업황 회복 기대',
    author: '투자왕김부자',
    stockName: '삼성전자',
    ticker: '005930',
    opinion: 'buy' as const,
    returnRate: 24.5,
    initialPrice: 50000,
    currentPrice: 62250,
    createdAt: '2025-11-01',
    views: 1234,
    likes: 89,
  },
  {
    id: '2',
    title: 'SK하이닉스 HBM 시장 독점',
    author: '투자왕김부자',
    stockName: 'SK하이닉스',
    ticker: '000660',
    opinion: 'buy' as const,
    returnRate: 35.4,
    initialPrice: 120000,
    currentPrice: 162480,
    createdAt: '2025-10-01',
    views: 2341,
    likes: 156,
  },
  {
    id: '3',
    title: '카카오 실적 턴어라운드',
    author: '투자왕김부자',
    stockName: '카카오',
    ticker: '035720',
    opinion: 'buy' as const,
    returnRate: 22.3,
    initialPrice: 45000,
    currentPrice: 55035,
    createdAt: '2025-10-20',
    views: 1890,
    likes: 134,
  },
];

export default function MyPage() {
  const [activeTab, setActiveTab] = useState<'reports' | 'bookmarks' | 'settings'>('reports');
  const [currentUser, setCurrentUser] = useState('');
  const [myReports, setMyReports] = useState<Report[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    const reports = getUserReports(user);
    setMyReports(reports);
  }, []);

  // 실제 사용자 리포트와 Mock 데이터 병합
  const allReports = [...myReports, ...mockUserReports];
  const totalReports = allReports.length;
  const avgReturnRate =
    totalReports > 0
      ? (allReports.reduce((sum, r) => sum + r.returnRate, 0) / totalReports).toFixed(2)
      : mockUser.avgReturnRate.toFixed(2);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-20">
            {/* Profile Picture */}
            <div className="text-center mb-6">
              <div className="w-24 h-24 mx-auto bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4">
                {mockUser.name[0]}
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{currentUser || mockUser.name}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{mockUser.email}</p>
            </div>

            {/* Stats */}
            <div className="space-y-4 mb-6">
              <div className="text-center p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">평균 수익률</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">+{avgReturnRate}%</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">리포트</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{totalReports}</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">총 조회</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{mockUser.totalViews.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">팔로워</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{mockUser.followers}</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">팔로잉</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{mockUser.following}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button variant="outline" className="w-full">프로필 수정</Button>
              <Button variant="outline" className="w-full">설정</Button>
            </div>

            <div className="mt-6 text-sm text-gray-500 text-center">
              가입일: {mockUser.joinDate}
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-2 rounded-lg font-semibold ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              내 리포트
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-6 py-2 rounded-lg font-semibold ${
                activeTab === 'bookmarks'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              북마크
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-2 rounded-lg font-semibold ${
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
              {/* Performance Summary */}
              <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">포트폴리오 성과</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">전체 평균</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">+{mockUser.avgReturnRate}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">최고 수익률</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">+45.8%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">승률</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">75%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">총 좋아요</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{mockUser.totalLikes}</div>
                  </div>
                </div>
              </Card>

              {/* Reports List */}
              <div className="space-y-4">
                {allReports.length > 0 ? (
                  allReports.map((report) => (
                    <ReportCard key={report.id} {...report} />
                  ))
                ) : (
                  <Card className="p-12 text-center">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">아직 작성한 리포트가 없습니다.</p>
                    <Link
                      href="/write"
                      className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      첫 리포트 작성하기
                    </Link>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === 'bookmarks' && (
            <Card className="p-6">
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">북마크한 리포트가 없습니다.</p>
              </div>
            </Card>
          )}

          {activeTab === 'settings' && (
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">계정 설정</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">이메일</h4>
                  <p className="text-gray-600 dark:text-gray-400">{mockUser.email}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">알림 설정</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-gray-700 dark:text-gray-300">새 댓글 알림</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-gray-700 dark:text-gray-300">새 팔로워 알림</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-gray-700 dark:text-gray-300">마케팅 이메일 수신</span>
                    </label>
                  </div>
                </div>
                <div>
                  <Button variant="danger">회원 탈퇴</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
