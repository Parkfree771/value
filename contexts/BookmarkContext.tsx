'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

interface BookmarkContextType {
  bookmarkedIds: string[];
  isBookmarked: (postId: string) => boolean;
  toggleBookmark: (postId: string) => Promise<void>;
  isLoading: boolean;
}

const BookmarkContext = createContext<BookmarkContextType>({
  bookmarkedIds: [],
  isBookmarked: () => false,
  toggleBookmark: async () => {},
  isLoading: false,
});

export const useBookmark = () => {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmark must be used within a BookmarkProvider');
  }
  return context;
};

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef(false);

  // 로그인 시 1회 /api/me/bookmarks에서 북마크 목록 가져오기 (서버가 세션 uid로 본인 것만 반환)
  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      setBookmarkedIds([]);
      fetchedRef.current = false;
      return;
    }

    if (fetchedRef.current) return;

    const fetchBookmarks = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/me/bookmarks', { credentials: 'include', cache: 'no-store' });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          console.error('북마크 로드 실패:', res.status, data);
          setBookmarkedIds([]);
        } else {
          setBookmarkedIds((data?.postIds ?? []) as string[]);
        }
        fetchedRef.current = true;
      } catch (error) {
        console.error('북마크 로드 실패:', error);
        setBookmarkedIds([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarks();
  }, [user, authReady]);

  const isBookmarked = useCallback(
    (postId: string) => bookmarkedIds.includes(postId),
    [bookmarkedIds],
  );

  const toggleBookmark = useCallback(
    async (postId: string) => {
      if (!user) {
        alert('로그인이 필요한 서비스입니다.');
        return;
      }

      const isCurrentlyBookmarked = bookmarkedIds.includes(postId);

      try {
        if (isCurrentlyBookmarked) {
          const res = await fetch(`/api/me/bookmarks?postId=${encodeURIComponent(postId)}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (!res.ok) throw new Error(`북마크 해제 실패 (${res.status})`);
          setBookmarkedIds((prev) => prev.filter((id) => id !== postId));
        } else {
          const res = await fetch('/api/me/bookmarks', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId }),
          });
          if (!res.ok) throw new Error(`북마크 추가 실패 (${res.status})`);
          setBookmarkedIds((prev) => [...prev, postId]);
        }
      } catch (error) {
        console.error('북마크 토글 실패:', error);
        alert('북마크 처리 중 오류가 발생했습니다.');
      }
    },
    [user, bookmarkedIds],
  );

  return (
    <BookmarkContext.Provider
      value={{ bookmarkedIds, isBookmarked, toggleBookmark, isLoading }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}
