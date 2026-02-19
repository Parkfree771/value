'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/Card';

interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
  isSuspended: boolean;
  postCount: number;
}

interface AdminUsersProps {
  users: User[];
  loading: boolean;
  onToggleSuspend: (userId: string, nickname: string, isSuspended: boolean) => void;
  onRefresh: () => void;
}

type FilterTab = 'all' | 'active' | 'suspended';

export default function AdminUsers({ users, loading, onToggleSuspend, onRefresh }: AdminUsersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  // Client-side filtering by email, nickname
  const filteredUsers = useMemo(() => {
    let result = users;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.nickname.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterTab === 'active') {
      result = result.filter((user) => !user.isSuspended);
    } else if (filterTab === 'suspended') {
      result = result.filter((user) => user.isSuspended);
    }

    return result;
  }, [users, searchQuery, filterTab]);

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-12 w-12 border-[3px] border-[var(--pixel-border-muted)] border-t-[var(--pixel-accent)]" />
      </div>
    );
  }

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'active', label: '활성' },
    { key: 'suspended', label: '정지됨' },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar: Search + Refresh */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이메일, 닉네임으로 검색..."
            className="pixel-input w-full"
          />
        </div>
        <button
          onClick={onRefresh}
          className="btn-secondary !text-sm shrink-0"
        >
          새로고침
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`px-4 py-2 text-xs font-bold border-2 transition-all ${
              filterTab === tab.key
                ? 'bg-[var(--pixel-accent)] text-white border-[var(--pixel-accent-dark)] shadow-[2px_2px_0px_var(--pixel-accent-dark)]'
                : 'bg-[var(--pixel-bg-card)] text-[var(--foreground)] border-[var(--pixel-border-muted)] shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:border-[var(--pixel-accent)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,0.3)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        전체 {filteredUsers.length}명
        {searchQuery.trim() && ` (검색: "${searchQuery.trim()}")`}
      </div>

      {/* Table */}
      <Card className="overflow-hidden" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--pixel-bg)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  이메일
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  닉네임
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  게시글 수
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  가입일
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-[2px] divide-[var(--pixel-border-muted)]">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-red-50 dark:hover:bg-red-900/10"
                >
                  <td className="px-4 py-3 text-xs max-w-[200px] truncate">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {user.nickname}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {user.postCount}개
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    {user.isSuspended ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-500/10 border-2 border-red-500">
                        정지됨
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-bold text-green-600 dark:text-green-400 bg-green-500/10 border-2 border-green-500">
                        활성
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() =>
                        onToggleSuspend(user.id, user.nickname, user.isSuspended)
                      }
                      className={`px-3 py-1 text-xs font-bold border-2 transition-all ${
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

        {/* Empty state */}
        {filteredUsers.length === 0 && (
          <div className="pixel-empty-state">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery.trim()
                ? `"${searchQuery.trim()}" 검색 결과가 없습니다.`
                : filterTab === 'suspended'
                  ? '정지된 사용자가 없습니다.'
                  : filterTab === 'active'
                    ? '활성 사용자가 없습니다.'
                    : '사용자가 없습니다.'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
