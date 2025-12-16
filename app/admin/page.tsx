'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/admin/adminCheck';
import Card from '@/components/Card';
import Button from '@/components/Button';

interface Stats {
  totalPosts: number;
  totalUsers: number;
  todayPosts: number;
  weekPosts: number;
  totalViews: number;
  totalLikes: number;
  topPosts: Array<{
    id: string;
    title: string;
    views: number;
    likes: number;
    returnRate: number;
    authorName: string;
  }>;
  topUsers: Array<{
    userId: string;
    nickname: string;
    email: string;
    postCount: number;
  }>;
}

interface Post {
  id: string;
  title: string;
  authorName: string;
  authorId: string;
  stockName: string;
  ticker: string;
  createdAt: string;
  views: number;
  likes: number;
  returnRate: number;
}

interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
  isSuspended: boolean;
  postCount: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'posts' | 'users'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // 관리자 권한 체크
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      if (!isAdmin(user.email)) {
        alert('관리자 권한이 필요합니다.');
        router.push('/');
        return;
      }
    }
  }, [user, authLoading, router]);

  // 통계 데이터 가져오기
  useEffect(() => {
    if (!user || !isAdmin(user.email)) return;

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/admin/stats?adminEmail=${encodeURIComponent(user.email || '')}`);
        const data = await response.json();

        if (data.success) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error('통계 조회 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  // 게시글 목록 가져오기
  const fetchPosts = async () => {
    if (!user || !isAdmin(user.email)) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/posts?adminEmail=${encodeURIComponent(user.email || '')}&pageSize=50`);
      const data = await response.json();

      if (data.success) {
        setPosts(data.posts);
      }
    } catch (error) {
      console.error('게시글 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 사용자 목록 가져오기
  const fetchUsers = async () => {
    if (!user || !isAdmin(user.email)) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users?adminEmail=${encodeURIComponent(user.email || '')}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('사용자 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 게시글 삭제
  const handleDeletePost = async (postId: string, title: string) => {
    if (!user || !isAdmin(user.email)) return;

    if (!confirm(`"${title}" 게시글을 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch('/api/admin/posts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminEmail: user.email,
          postId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('게시글이 삭제되었습니다.');
        fetchPosts();
      } else {
        alert(data.error || '게시글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      alert('게시글 삭제 중 오류가 발생했습니다.');
    }
  };

  // 사용자 정지/해제
  const handleToggleSuspend = async (userId: string, nickname: string, isSuspended: boolean) => {
    if (!user || !isAdmin(user.email)) return;

    const action = isSuspended ? '정지 해제' : '정지';
    if (!confirm(`"${nickname}" 사용자를 ${action}하시겠습니까?`)) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminEmail: user.email,
          userId,
          isSuspended: !isSuspended,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`사용자가 ${action}되었습니다.`);
        fetchUsers();
      } else {
        alert(data.error || `사용자 ${action}에 실패했습니다.`);
      }
    } catch (error) {
      console.error('사용자 정지/해제 오류:', error);
      alert('사용자 정지/해제 중 오류가 발생했습니다.');
    }
  };

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'posts' && posts.length === 0) {
      fetchPosts();
    } else if (activeTab === 'users' && users.length === 0) {
      fetchUsers();
    }
  }, [activeTab]);

  if (authLoading || !user || !isAdmin(user.email)) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">관리자 대시보드</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">시스템 관리 및 모니터링</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 sm:gap-4 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          📊 대시보드
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap ${
            activeTab === 'posts'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          📝 게시글 관리
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          👥 사용자 관리
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : stats ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">전체 게시글</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalPosts.toLocaleString()}</div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">전체 사용자</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalUsers.toLocaleString()}</div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">오늘 게시글</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.todayPosts.toLocaleString()}</div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">주간 게시글</div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.weekPosts.toLocaleString()}</div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/30">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">총 조회수</div>
                  <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{stats.totalViews.toLocaleString()}</div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">총 좋아요</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.totalLikes.toLocaleString()}</div>
                </Card>
              </div>

              {/* Top Posts */}
              <Card className="p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">인기 게시글 TOP 5</h3>
                <div className="space-y-3">
                  {stats.topPosts.map((post, index) => (
                    <div key={post.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/report/${post.id}`} className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block">
                          {post.title}
                        </Link>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{post.authorName}</div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">👁️ {post.views.toLocaleString()}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">❤️ {post.likes.toLocaleString()}</div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`text-sm font-bold ${post.returnRate >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                          {post.returnRate >= 0 ? '+' : ''}{post.returnRate.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Top Users */}
              <Card className="p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">활동적인 사용자 TOP 5</h3>
                <div className="space-y-3">
                  {stats.topUsers.map((user, index) => (
                    <div key={user.userId} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.nickname}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{user.email}</div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">📝 {user.postCount}개</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">통계 데이터를 불러올 수 없습니다.</p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'posts' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">제목</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">작성자</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">종목</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">수익률</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">조회수</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">작성일</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">관리</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {posts.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3">
                          <Link href={`/report/${post.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
                            {post.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{post.authorName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{post.stockName || post.ticker}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-semibold ${post.returnRate >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                            {post.returnRate >= 0 ? '+' : ''}{post.returnRate.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{post.views.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeletePost(post.id, post.title)}
                            className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition-colors"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {posts.length === 0 && (
                <div className="p-8 text-center text-gray-600 dark:text-gray-400">게시글이 없습니다.</div>
              )}
            </Card>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">이메일</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">닉네임</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">게시글 수</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">가입일</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">상태</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">관리</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{user.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{user.nickname}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{user.postCount}개</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3">
                          {user.isSuspended ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded">
                              정지됨
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded">
                              활성
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleSuspend(user.id, user.nickname, user.isSuspended)}
                            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                              user.isSuspended
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-orange-600 text-white hover:bg-orange-700'
                            }`}
                          >
                            {user.isSuspended ? '정지 해제' : '정지'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && (
                <div className="p-8 text-center text-gray-600 dark:text-gray-400">사용자가 없습니다.</div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
