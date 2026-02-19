'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Card from '@/components/Card';

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

interface AdminPostsProps {
  posts: Post[];
  loading: boolean;
  onDelete: (postId: string, title: string) => void;
  onRefresh: () => void;
}

const POSTS_PER_PAGE = 20;

export default function AdminPosts({ posts, loading, onDelete, onRefresh }: AdminPostsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Client-side filtering by title, authorName, stockName, ticker
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;

    const query = searchQuery.toLowerCase().trim();
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(query) ||
        post.authorName.toLowerCase().includes(query) ||
        post.stockName.toLowerCase().includes(query) ||
        post.ticker.toLowerCase().includes(query)
    );
  }, [posts, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [filteredPosts, currentPage]);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-12 w-12 border-[3px] border-[var(--pixel-border-muted)] border-t-[var(--pixel-accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: Search + Refresh */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="제목, 작성자, 종목명, 티커로 검색..."
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

      {/* Results count */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        전체 {filteredPosts.length}건
        {searchQuery.trim() && ` (검색: "${searchQuery.trim()}")`}
      </div>

      {/* Table */}
      <Card className="overflow-hidden" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--pixel-bg)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  제목
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  작성자
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  종목
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  수익률
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  조회수
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  작성일
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-[2px] divide-[var(--pixel-border-muted)]">
              {paginatedPosts.map((post) => (
                <tr
                  key={post.id}
                  className="hover:bg-red-50 dark:hover:bg-red-900/10"
                >
                  <td className="px-4 py-3 max-w-[240px]">
                    <Link
                      href={`/reports/${post.id}`}
                      className="text-xs text-[var(--pixel-accent)] hover:underline font-bold truncate block transition-colors"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {post.authorName}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {post.stockName || post.ticker}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-bold ${
                        post.returnRate >= 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {post.returnRate >= 0 ? '+' : ''}
                      {post.returnRate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {post.views.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onDelete(post.id, post.title)}
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

        {/* Empty state */}
        {filteredPosts.length === 0 && (
          <div className="pixel-empty-state">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery.trim()
                ? `"${searchQuery.trim()}" 검색 결과가 없습니다.`
                : '게시글이 없습니다.'}
            </p>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {filteredPosts.length > POSTS_PER_PAGE && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="btn-secondary !text-xs !px-4 !py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="btn-secondary !text-xs !px-4 !py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
