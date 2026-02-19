'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import AdminDashboard from './components/AdminDashboard';
import AdminPosts from './components/AdminPosts';
import AdminUsers from './components/AdminUsers';
import AdminComments from './components/AdminComments';
import AdminSystem from './components/AdminSystem';

// ───── 타입 ─────

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

interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  postId: string;
  likes: number;
  createdAt: string;
}

type TabKey = 'dashboard' | 'posts' | 'users' | 'comments' | 'system';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'posts', label: '게시글 관리' },
  { key: 'users', label: '사용자 관리' },
  { key: 'comments', label: '댓글 관리' },
  { key: 'system', label: '시스템' },
];

// ───── 컴포넌트 ─────

export default function AdminPage() {
  const router = useRouter();
  const { user, authReady, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  // 데이터 상태
  const [statsLoading, setStatsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  // 데이터 로드 여부 추적
  const [loaded, setLoaded] = useState({ posts: false, users: false, comments: false });

  // 확인 모달
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // ───── 권한 체크 ─────

  useEffect(() => {
    if (authReady) {
      if (!user) { router.push('/login'); return; }
      if (!isAdmin) { router.push('/'); return; }
    }
  }, [user, authReady, isAdmin, router]);

  // ───── API 헬퍼 ─────

  const getToken = useCallback(async () => {
    return auth.currentUser?.getIdToken() || null;
  }, []);

  const apiFetch = useCallback(async (url: string, options?: RequestInit) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
  }, [getToken]);

  // ───── 데이터 페칭 ─────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await apiFetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) {
      console.error('통계 조회 오류:', e);
    } finally {
      setStatsLoading(false);
    }
  }, [apiFetch]);

  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const res = await apiFetch('/api/admin/posts?pageSize=200');
      const data = await res.json();
      if (data.success) setPosts(data.posts);
    } catch (e) {
      console.error('게시글 조회 오류:', e);
    } finally {
      setPostsLoading(false);
      setLoaded((prev) => ({ ...prev, posts: true }));
    }
  }, [apiFetch]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await apiFetch('/api/admin/users');
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (e) {
      console.error('사용자 조회 오류:', e);
    } finally {
      setUsersLoading(false);
      setLoaded((prev) => ({ ...prev, users: true }));
    }
  }, [apiFetch]);

  const fetchComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const res = await apiFetch('/api/admin/comments');
      const data = await res.json();
      if (data.success) setComments(data.comments);
    } catch (e) {
      console.error('댓글 조회 오류:', e);
    } finally {
      setCommentsLoading(false);
      setLoaded((prev) => ({ ...prev, comments: true }));
    }
  }, [apiFetch]);

  // 초기 로드: 대시보드 통계
  useEffect(() => {
    if (user && isAdmin) fetchStats();
  }, [user, isAdmin, fetchStats]);

  // 탭 전환 시 데이터 로드
  useEffect(() => {
    if (!user || !isAdmin) return;
    if (activeTab === 'posts' && !loaded.posts) fetchPosts();
    if (activeTab === 'users' && !loaded.users) fetchUsers();
    if (activeTab === 'comments' && !loaded.comments) fetchComments();
  }, [activeTab, user, isAdmin, loaded, fetchPosts, fetchUsers, fetchComments]);

  // ───── 핸들러 ─────

  const handleDeletePost = (postId: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: '게시글 삭제',
      message: `"${title}" 게시글을 삭제하시겠습니까?`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await apiFetch('/api/admin/posts', {
            method: 'DELETE',
            body: JSON.stringify({ postId }),
          });
          const data = await res.json();
          if (data.success) {
            alert('게시글이 삭제되었습니다.');
            fetchPosts();
          } else {
            alert(data.error || '삭제 실패');
          }
        } catch (e) {
          alert('게시글 삭제 중 오류가 발생했습니다.');
        }
      },
    });
  };

  const handleToggleSuspend = (userId: string, nickname: string, isSuspended: boolean) => {
    const action = isSuspended ? '정지 해제' : '정지';
    setConfirmModal({
      isOpen: true,
      title: `사용자 ${action}`,
      message: `"${nickname}" 사용자를 ${action}하시겠습니까?`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await apiFetch('/api/admin/users', {
            method: 'PUT',
            body: JSON.stringify({ userId, isSuspended: !isSuspended }),
          });
          const data = await res.json();
          if (data.success) {
            alert(`사용자가 ${action}되었습니다.`);
            fetchUsers();
          } else {
            alert(data.error || `${action} 실패`);
          }
        } catch (e) {
          alert('사용자 정지/해제 중 오류가 발생했습니다.');
        }
      },
    });
  };

  const handleDeleteComment = (postId: string, commentId: string, content: string) => {
    setConfirmModal({
      isOpen: true,
      title: '댓글 삭제',
      message: `"${content}..." 댓글을 삭제하시겠습니까?`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await apiFetch('/api/admin/comments', {
            method: 'DELETE',
            body: JSON.stringify({ postId, commentId }),
          });
          const data = await res.json();
          if (data.success) {
            alert('댓글이 삭제되었습니다.');
            fetchComments();
          } else {
            alert(data.error || '삭제 실패');
          }
        } catch (e) {
          alert('댓글 삭제 중 오류가 발생했습니다.');
        }
      },
    });
  };

  // ───── 렌더링 ─────

  if (!authReady || !user || !isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">관리자 대시보드</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">시스템 관리 및 모니터링</p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-2 sm:gap-3 mb-6 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pixel-tab whitespace-nowrap ${activeTab === tab.key ? 'pixel-tab-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'dashboard' && (
        <AdminDashboard stats={stats} loading={statsLoading} />
      )}
      {activeTab === 'posts' && (
        <AdminPosts
          posts={posts}
          loading={postsLoading}
          onDelete={handleDeletePost}
          onRefresh={fetchPosts}
        />
      )}
      {activeTab === 'users' && (
        <AdminUsers
          users={users}
          loading={usersLoading}
          onToggleSuspend={handleToggleSuspend}
          onRefresh={fetchUsers}
        />
      )}
      {activeTab === 'comments' && (
        <AdminComments
          comments={comments}
          loading={commentsLoading}
          onDelete={handleDeleteComment}
          onRefresh={fetchComments}
        />
      )}
      {activeTab === 'system' && (
        <AdminSystem />
      )}

      {/* 확인 모달 */}
      {confirmModal.isOpen && (
        <div className="pixel-modal-overlay">
          <div className="pixel-modal">
            <div className="pixel-modal-header">
              <h3 className="pixel-modal-title">{confirmModal.title}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {confirmModal.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="btn-secondary !text-sm"
              >
                취소
              </button>
              <button onClick={confirmModal.onConfirm} className="btn-danger">
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
