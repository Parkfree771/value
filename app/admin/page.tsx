'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/admin/adminCheck';

interface Post {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  stockName: string;
  ticker: string;
  createdAt: string;
  views: number;
  likes: number;
  returnRate: number;
  opinion: string;
}

interface FeedData {
  posts: Post[];
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
  isSuspended: boolean;
  postCount: number;
}

interface Stats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  avgReturnRate: number;
  todayPosts: number;
  weekPosts: number;
}

type SortField = 'createdAt' | 'views' | 'likes' | 'returnRate';
type SortOrder = 'asc' | 'desc';

export default function AdminPage() {
  const router = useRouter();
  const { user, authReady } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'posts' | 'users'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [feedUpdatedAt, setFeedUpdatedAt] = useState<string>('');

  // 검색 및 정렬
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 작업 상태
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // 관리자 권한 체크
  useEffect(() => {
    if (authReady) {
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
  }, [user, authReady, router]);

  // feed.json에서 게시글 가져오기
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/feed/public');
      const data: FeedData = await response.json();

      if (data.posts) {
        setPosts(data.posts);
        setFeedUpdatedAt(data.updatedAt || '');

        // 통계 계산
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const todayPosts = data.posts.filter(p => new Date(p.createdAt) >= today).length;
        const weekPosts = data.posts.filter(p => new Date(p.createdAt) >= weekAgo).length;
        const totalViews = data.posts.reduce((sum, p) => sum + (p.views || 0), 0);
        const totalLikes = data.posts.reduce((sum, p) => sum + (p.likes || 0), 0);
        const avgReturnRate = data.posts.length > 0
          ? data.posts.reduce((sum, p) => sum + (p.returnRate || 0), 0) / data.posts.length
          : 0;

        setStats({
          totalPosts: data.posts.length,
          totalViews,
          totalLikes,
          avgReturnRate,
          todayPosts,
          weekPosts,
        });
      }
    } catch (error) {
      console.error('게시글 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 사용자 목록 가져오기 (Firestore)
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

  // 초기 로드
  useEffect(() => {
    if (user && isAdmin(user.email)) {
      fetchPosts();
    }
  }, [user]);

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) {
      fetchUsers();
    }
  }, [activeTab]);

  // 게시글 검색 및 정렬
  const filteredAndSortedPosts = useMemo(() => {
    let result = [...posts];

    // 검색 필터
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.ticker.toLowerCase().includes(q) ||
        p.stockName.toLowerCase().includes(q)
      );
    }

    // 정렬
    result.sort((a, b) => {
      let aVal: number | string = a[sortField];
      let bVal: number | string = b[sortField];

      if (sortField === 'createdAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return result;
  }, [posts, searchQuery, sortField, sortOrder]);

  // 사용자 검색
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const q = userSearchQuery.toLowerCase();
    return users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      u.nickname.toLowerCase().includes(q)
    );
  }, [users, userSearchQuery]);

  // 수동 캐시 갱신
  const handleRefreshCache = async () => {
    if (!user || !isAdmin(user.email)) return;

    setIsRefreshing(true);
    try {
      // feed.json 갱신
      const response = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        // 캐시 무효화
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/' }),
        });

        alert('캐시가 갱신되었습니다.');
        fetchPosts(); // 목록 새로고침
      } else {
        alert('갱신 실패');
      }
    } catch (error) {
      console.error('캐시 갱신 오류:', error);
      alert('갱신 중 오류 발생');
    } finally {
      setIsRefreshing(false);
    }
  };

  // 게시글 삭제
  const handleDeletePost = async (postId: string, title: string) => {
    if (!user || !isAdmin(user.email)) return;

    setConfirmModal({
      isOpen: true,
      title: '게시글 삭제',
      message: `"${title}" 게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });

        try {
          const response = await fetch('/api/admin/posts', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminEmail: user.email, postId }),
          });

          const data = await response.json();

          if (data.success) {
            alert('게시글이 삭제되었습니다.');
            // 로컬 상태에서도 제거
            setPosts(prev => prev.filter(p => p.id !== postId));
          } else {
            alert(data.error || '삭제 실패');
          }
        } catch (error) {
          console.error('삭제 오류:', error);
          alert('삭제 중 오류 발생');
        }
      },
    });
  };

  // 사용자 정지/해제
  const handleToggleSuspend = async (userId: string, nickname: string, isSuspended: boolean) => {
    if (!user || !isAdmin(user.email)) return;

    const action = isSuspended ? '정지 해제' : '정지';

    setConfirmModal({
      isOpen: true,
      title: `사용자 ${action}`,
      message: `"${nickname}" 사용자를 ${action}하시겠습니까?`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });

        try {
          const response = await fetch('/api/admin/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminEmail: user.email,
              userId,
              isSuspended: !isSuspended,
            }),
          });

          const data = await response.json();

          if (data.success) {
            alert(`사용자가 ${action}되었습니다.`);
            // 로컬 상태 업데이트
            setUsers(prev => prev.map(u =>
              u.id === userId ? { ...u, isSuspended: !isSuspended } : u
            ));
          } else {
            alert(data.error || `${action} 실패`);
          }
        } catch (error) {
          console.error('정지/해제 오류:', error);
          alert('처리 중 오류 발생');
        }
      },
    });
  };

  // 정렬 토글
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (!authReady || !user || !isAdmin(user.email)) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">관리자</h1>
          {feedUpdatedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              마지막 갱신: {new Date(feedUpdatedAt).toLocaleString('ko-KR')}
            </p>
          )}
        </div>
        <button
          onClick={handleRefreshCache}
          disabled={isRefreshing}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isRefreshing ? '갱신 중...' : '데이터 갱신'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(['dashboard', 'posts', 'users'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab === 'dashboard' ? '통계' : tab === 'posts' ? `게시글 (${posts.length})` : `사용자 (${users.length})`}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">전체 게시글</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPosts.toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">오늘 게시글</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.todayPosts}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">주간 게시글</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.weekPosts}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">총 조회수</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalViews.toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">총 좋아요</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalLikes.toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">평균 수익률</div>
                  <div className={`text-2xl font-bold ${stats.avgReturnRate >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {stats.avgReturnRate >= 0 ? '+' : ''}{stats.avgReturnRate.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Top Posts */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">인기 게시글 TOP 10</h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {posts
                    .sort((a, b) => (b.views + b.likes * 10) - (a.views + a.likes * 10))
                    .slice(0, 10)
                    .map((post, index) => (
                      <div key={post.id} className="px-4 py-3 flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/reports/${post.id}`}
                            className="text-sm text-gray-900 dark:text-white hover:text-blue-600 truncate block"
                          >
                            {post.title}
                          </Link>
                          <span className="text-xs text-gray-500">{post.author} | {post.ticker}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          조회 {post.views} / 좋아요 {post.likes}
                        </div>
                        <div className={`text-sm font-medium ${post.returnRate >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                          {post.returnRate >= 0 ? '+' : ''}{post.returnRate.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">데이터를 불러올 수 없습니다.</p>
          )}
        </div>
      )}

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="제목, 작성자, 티커 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                setSortField(field);
                setSortOrder(order);
              }}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="createdAt-desc">최신순</option>
              <option value="createdAt-asc">오래된순</option>
              <option value="views-desc">조회수 높은순</option>
              <option value="views-asc">조회수 낮은순</option>
              <option value="likes-desc">좋아요 많은순</option>
              <option value="returnRate-desc">수익률 높은순</option>
              <option value="returnRate-asc">수익률 낮은순</option>
            </select>
          </div>

          {/* Results count */}
          {searchQuery && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              검색 결과: {filteredAndSortedPosts.length}건
            </p>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">제목</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">작성자</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">종목</th>
                      <th
                        className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600"
                        onClick={() => toggleSort('returnRate')}
                      >
                        수익률 {sortField === 'returnRate' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </th>
                      <th
                        className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600"
                        onClick={() => toggleSort('views')}
                      >
                        조회 {sortField === 'views' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </th>
                      <th
                        className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600"
                        onClick={() => toggleSort('createdAt')}
                      >
                        작성일 {sortField === 'createdAt' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAndSortedPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3">
                          <Link href={`/reports/${post.id}`} className="text-blue-600 hover:underline">
                            {post.title.length > 30 ? post.title.slice(0, 30) + '...' : post.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{post.author}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{post.ticker}</td>
                        <td className="px-4 py-3">
                          <span className={post.returnRate >= 0 ? 'text-red-600' : 'text-blue-600'}>
                            {post.returnRate >= 0 ? '+' : ''}{post.returnRate.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{post.views}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeletePost(post.id, post.title)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredAndSortedPosts.length === 0 && (
                <div className="p-8 text-center text-gray-600 dark:text-gray-400">
                  {searchQuery ? '검색 결과가 없습니다.' : '게시글이 없습니다.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search */}
          <input
            type="text"
            placeholder="이메일, 닉네임 검색..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />

          {userSearchQuery && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              검색 결과: {filteredUsers.length}명
            </p>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">이메일</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">닉네임</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">게시글</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">가입일</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">상태</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{u.email}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{u.nickname}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.postCount}개</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3">
                          {u.isSuspended ? (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                              정지
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                              활성
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleSuspend(u.id, u.nickname, u.isSuspended)}
                            className={`px-2 py-1 text-xs rounded ${
                              u.isSuspended
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-orange-600 text-white hover:bg-orange-700'
                            }`}
                          >
                            {u.isSuspended ? '해제' : '정지'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-gray-600 dark:text-gray-400">
                  {userSearchQuery ? '검색 결과가 없습니다.' : '사용자가 없습니다.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {confirmModal.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
              {confirmModal.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                취소
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
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
