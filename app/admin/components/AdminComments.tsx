'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  postId: string;
  likes: number;
  createdAt: string;
}

interface AdminCommentsProps {
  comments: Comment[];
  loading: boolean;
  onDelete: (postId: string, commentId: string, content: string) => void;
  onRefresh: () => void;
}

const COMMENTS_PER_PAGE = 20;

export default function AdminComments({ comments, loading, onDelete, onRefresh }: AdminCommentsProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return comments;
    const q = search.toLowerCase();
    return comments.filter(
      (c) =>
        c.content.toLowerCase().includes(q) ||
        c.authorName.toLowerCase().includes(q)
    );
  }, [comments, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / COMMENTS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * COMMENTS_PER_PAGE, page * COMMENTS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-12 w-12 border-[3px] border-[var(--pixel-border-muted)] border-t-[var(--pixel-accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <input
          type="text"
          placeholder="댓글 내용 또는 작성자 검색..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pixel-input w-full sm:w-72 text-xs"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            총 {filtered.length}건
          </span>
          <button onClick={onRefresh} className="btn-secondary !text-xs !py-1.5 !px-3">
            새로고침
          </button>
        </div>
      </div>

      {/* 댓글 목록 */}
      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--pixel-bg)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">댓글 내용</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">작성자</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">게시글</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">작성일</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y-[2px] divide-[var(--pixel-border-muted)]">
              {paginated.map((comment) => (
                <tr key={`${comment.postId}-${comment.id}`} className="hover:bg-red-50 dark:hover:bg-red-900/10">
                  <td className="px-4 py-3 text-xs max-w-xs">
                    <p className="truncate">{comment.content.replace(/<[^>]*>/g, '')}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{comment.authorName}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/reports/${comment.postId}`}
                      className="text-xs text-[var(--pixel-accent)] hover:underline font-bold"
                    >
                      보기
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onDelete(comment.postId, comment.id, comment.content.replace(/<[^>]*>/g, '').substring(0, 30))}
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
        {paginated.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {search ? '검색 결과가 없습니다.' : '댓글이 없습니다.'}
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary !text-xs !py-1.5 !px-3 disabled:opacity-30"
          >
            이전
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary !text-xs !py-1.5 !px-3 disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
