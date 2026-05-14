'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { createClient } from '@/utils/supabase/client';

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
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef(false);

  // 로그인 시 1회 Supabase에서 북마크 목록 가져오기
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
        const { data, error } = await supabase
          .from('bookmarks')
          .select('post_id')
          .eq('user_id', user.uid);

        if (error) {
          console.error('북마크 로드 실패:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            name: (error as { name?: string }).name,
            raw: JSON.stringify(error),
          });
          setBookmarkedIds([]);
        } else {
          setBookmarkedIds((data ?? []).map((b) => b.post_id as string));
        }
        fetchedRef.current = true;
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarks();
  }, [user, authReady, supabase]);

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
          const { error } = await supabase
            .from('bookmarks')
            .delete()
            .eq('user_id', user.uid)
            .eq('post_id', postId);
          if (error) throw error;
          setBookmarkedIds((prev) => prev.filter((id) => id !== postId));
        } else {
          const { error } = await supabase
            .from('bookmarks')
            .insert({ user_id: user.uid, post_id: postId });
          if (error) throw error;
          setBookmarkedIds((prev) => [...prev, postId]);
        }
      } catch (error) {
        console.error('북마크 토글 실패:', error);
        alert('북마크 처리 중 오류가 발생했습니다.');
      }
    },
    [user, bookmarkedIds, supabase],
  );

  return (
    <BookmarkContext.Provider
      value={{ bookmarkedIds, isBookmarked, toggleBookmark, isLoading }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}
