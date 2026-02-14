'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
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
  const { user, authReady, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'posts' | 'users'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // 확인 모달 상태
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // 관리자 권한 체크 (Auth가 준비된 후에만)
  useEffect(() => {
    if (authReady) {
      if (!user) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      if (!isAdmin) {
        alert('관리자 권한이 필요합니다.');
        router.push('/');
        return;
      }
    }
  }, [user, authReady, router]);

  // 통계 데이터 가져오기
  useEffect(() => {
    if (!user || !isAdmin) return;

    const fetchStats = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
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
    if (!user || !isAdmin) return;

    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/posts?pageSize=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
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
    if (!user || !isAdmin) return;

    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
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
    if (!user || !isAdmin) return;

    setConfirmModal({
      isOpen: true,
      title: '게시글 삭제',
      message: `"${title}" 게시글을 삭제하시겠습니까?`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });

        try {
          const token = await auth.currentUser?.getIdToken();
          const response = await fetch('/api/admin/posts', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
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
      },
    });
  };

  // 사용자 정지/해제
  const handleToggleSuspend = async (userId: string, nickname: string, isSuspended: boolean) => {
    if (!user || !isAdmin) return;

    const action = isSuspended ? '정지 해제' : '정지';

    setConfirmModal({
      isOpen: true,
      title: `사용자 ${action}`,
      message: `"${nickname}" 사용자를 ${action}하시겠습니까?`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });

        try {
          const token = await auth.currentUser?.getIdToken();
          const response = await fetch('/api/admin/users', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
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
      },
    });
  };

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'posts' && posts.length === 0) {
      fetchPosts();
    } else if (activeTab === 'users' && users.length === 0) {
      fetchUsers();
    }
  }, [activeTab]);

  if (!authReady || !user || !isAdmin) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-pixel text-2xl sm:text-3xl font-bold mb-2">관리자 대시보드</h1>
        <p className="font-pixel text-xs text-gray-500 dark:text-gray-400">시스템 관리 및 모니터링</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 sm:gap-3 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pixel-tab ${activeTab === 'dashboard' ? 'pixel-tab-active' : ''}`}
        >
          대시보드
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`pixel-tab ${activeTab === 'posts' ? 'pixel-tab-active' : ''}`}
        >
          게시글 관리
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pixel-tab ${activeTab === 'users' ? 'pixel-tab-active' : ''}`}
        >
          사용자 관리
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-12 w-12 border-[3px] border-[var(--pixel-border-muted)] border-t-[var(--pixel-accent)]"></div>
            </div>
          ) : stats ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="pixel-stat-card">
                  <div className="font-pixel text-xs text-gray-500 dark:text-gray-400 mb-1">전체 게시글</div>
                  <div className="font-pixel text-2xl font-bold text-[var(--pixel-accent)]">{stats.totalPosts.toLocaleString()}</div>
                </div>

                <div className="pixel-stat-card">
                  <div className="font-pixel text-xs text-gray-500 dark:text-gray-400 mb-1">전체 사용자</div>
                  <div className="font-pixel text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalUsers.toLocaleString()}</div>
                </div>

                <div className="pixel-stat-card">
                  <div className="font-pixel text-xs text-gray-500 dark:text-gray-400 mb-1">오늘 게시글</div>
                  <div className="font-pixel text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.todayPosts.toLocaleString()}</div>
                </div>

                <div className="pixel-stat-card">
                  <div className="font-pixel text-xs text-gray-500 dark:text-gray-400 mb-1">주간 게시글</div>
                  <div className="font-pixel text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.weekPosts.toLocaleString()}</div>
                </div>

                <div className="pixel-stat-card">
                  <div className="font-pixel text-xs text-gray-500 dark:text-gray-400 mb-1">총 조회수</div>
                  <div className="font-pixel text-2xl font-bold text-pink-600 dark:text-pink-400">{stats.totalViews.toLocaleString()}</div>
                </div>

                <div className="pixel-stat-card">
                  <div className="font-pixel text-xs text-gray-500 dark:text-gray-400 mb-1">총 좋아요</div>
                  <div className="font-pixel text-2xl font-bold text-[var(--pixel-accent)]">{stats.totalLikes.toLocaleString()}</div>
                </div>
              </div>

              {/* Top Posts */}
              <Card className="p-6" padding="none">
                <h3 className="font-pixel text-base font-bold mb-4">인기 게시글 TOP 5</h3>
                <div className="space-y-2">
                  {stats.topPosts.map((post, index) => (
                    <div key={post.id} className="flex items-center gap-3 p-3 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg)]">
                      <div className="flex-shrink-0 w-8 h-8 bg-[var(--pixel-accent)] border-2 border-pixel-accent-dark flex items-center justify-center text-white font-pixel font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/report/${post.id}`} className="font-pixel text-sm font-bold hover:text-[var(--pixel-accent)] truncate block transition-colors">
                          {post.title}
                        </Link>
                        <div className="font-pixel text-xs text-gray-500 dark:text-gray-400">{post.authorName}</div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="font-pixel text-xs font-bold">조회 {post.views.toLocaleString()}</div>
                        <div className="font-pixel text-xs text-gray-500 dark:text-gray-400">좋아요 {post.likes.toLocaleString()}</div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`font-pixel text-sm font-bold ${post.returnRate >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                          {post.returnRate >= 0 ? '+' : ''}{post.returnRate.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Top Users */}
              <Card className="p-6" padding="none">
                <h3 className="font-pixel text-base font-bold mb-4">활동적인 사용자 TOP 5</h3>
                <div className="space-y-2">
                  {stats.topUsers.map((user, index) => (
                    <div key={user.userId} className="flex items-center gap-3 p-3 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg)]">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-600 border-2 border-purple-900 flex items-center justify-center text-white font-pixel font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-pixel text-sm font-bold truncate">{user.nickname}</div>
                        <div className="font-pixel text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="font-pixel text-sm font-bold text-[var(--pixel-accent)]">게시글 {user.postCount}개</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <div className="pixel-empty-state">
              <p className="font-pixel text-sm text-gray-500 dark:text-gray-400">통계 데이터를 불러올 수 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'posts' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-12 w-12 border-[3px] border-[var(--pixel-border-muted)] border-t-[var(--pixel-accent)]"></div>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--pixel-bg)]">
                    <tr>
                      <th className="px-4 py-3 text-left font-pixel text-xs font-bold uppercase tracking-wider">제목</th>
                      <th className="px-4 py-3 text-left font-pixel text-xs font-bold uppercase tracking-wider">작성자</th>
                      <th className="px-4 py-3 text-left font-pixel text-xs font-bold uppercase tracking-wider">종목</th>
                      <th className="px-4 py-3 text-left font-pixel text-xs font-bold uppercase tracking-wider">수익률</th>
                      <th className="px-4 py-3 text-left font-pixel text-xs font-bold uppercase tracking-wider">조회수</th>
                      <th className="px-4 py-3 text-left font-pixel text-xs font-bold uppercase tracking-wider">작성일</th>
                      <th className="px-4 py-3 text-center font-pixel text-xs font-bold uppercase tracking-wider">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[2px] divide-[var(--pixel-border-muted)]">
                    {posts.map((post) => (
                      <tr key={post.id} className="hover:bg-red-50 dark:hover:bg-red-900/10">
                        <td className="px-4 py-3">
                          <Link href={`/report/${post.id}`} className="font-pixel text-xs text-[var(--pixel-accent)] hover:underline font-bold">
                            {post.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-pixel text-xs">{post.authorName}</td>
                        <td className="px-4 py-3 font-pixel text-xs">{post.stockName || post.ticker}</td>
                        <td className="px-4 py-3">
                          <span className={`font-pixel text-xs font-bold ${post.returnRate >= 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                            {post.returnRate >= 0 ? '+' : ''}{post.returnRate.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 font-pixel text-xs">{post.views.toLocaleString()}</td>
                        <td className="px-4 py-3 font-pixel text-xs text-gray-500 dark:text-gray-400">
                          {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeletePost(post.id, post.title)}
                            className="btn-danger !py-1 !px-3 !text-xs"
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
                <div className="p-8 text-center font-pixel text-sm text-gray-500 dark:text-gray-400">게시글이 없습니다.</div>
              )}
            </Card>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-12 w-12 border-[3px] border-[var(--pixel-border-muted)] border-t-[var(--pixel-accent)]"></div>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--pixel-bg)]">
                    <tr>
                      <th className="px-4 py-3 text-left font-pixel text-xs font-bold uppercase tracking-wider">이메일</th>
                      <th className="px-4 py-3 text-left font-pixel text-xs font-bold uppercase tracking-wider">닉네임</th>
                      <th className="px-4 py-3 text-left font-pixel text-xs font-bold uppercase tracking-wider">게시글 수</th>
                      <th className="px-4 py-3 text-left font-pixel text-xs font-bold uppercase tracking-wider">가입일</th>
                      <th className="px-4 py-3 text-left font-pixel text-xs font-bold uppercase tracking-wider">상태</th>
                      <th className="px-4 py-3 text-center font-pixel text-xs font-bold uppercase tracking-wider">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[2px] divide-[var(--pixel-border-muted)]">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-red-50 dark:hover:bg-red-900/10">
                        <td className="px-4 py-3 font-pixel text-xs">{user.email}</td>
                        <td className="px-4 py-3 font-pixel text-xs">{user.nickname}</td>
                        <td className="px-4 py-3 font-pixel text-xs">{user.postCount}개</td>
                        <td className="px-4 py-3 font-pixel text-xs text-gray-500 dark:text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3">
                          {user.isSuspended ? (
                            <span className="inline-flex items-center px-2 py-1 font-pixel text-xs font-bold text-red-600 dark:text-red-400 bg-red-500/10 border-2 border-red-500">
                              정지됨
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 font-pixel text-xs font-bold text-green-600 dark:text-green-400 bg-green-500/10 border-2 border-green-500">
                              활성
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleSuspend(user.id, user.nickname, user.isSuspended)}
                            className={`font-pixel px-3 py-1 text-xs font-bold border-2 transition-all ${
                              user.isSuspended
                                ? 'bg-green-600 text-white border-green-800 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.5)]'
                                : 'bg-orange-600 text-white border-orange-800 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.5)]'
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
                <div className="p-8 text-center font-pixel text-sm text-gray-500 dark:text-gray-400">사용자가 없습니다.</div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* 확인 모달 */}
      {confirmModal.isOpen && (
        <div className="pixel-modal-overlay">
          <div className="pixel-modal">
            <div className="pixel-modal-header">
              <h3 className="pixel-modal-title">
                {confirmModal.title}
              </h3>
            </div>
            <p className="font-pixel text-sm text-gray-600 dark:text-gray-400 mb-6">
              {confirmModal.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="btn-secondary font-pixel !text-sm"
              >
                취소
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="btn-danger"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
