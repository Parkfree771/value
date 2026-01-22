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

  // 로그인 시 1회만 Firestore에서 북마크 목록 가져오기
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
        const { db } = await import('@/lib/firebase');
        const { collection, query, where, getDocs } = await import('firebase/firestore');

        const bookmarksQuery = query(
          collection(db, 'bookmarks'),
          where('userId', '==', user.uid)
        );

        const snapshot = await getDocs(bookmarksQuery);
        const ids = snapshot.docs.map(doc => doc.data().postId as string);
        setBookmarkedIds(ids);
        fetchedRef.current = true;
      } catch (error: any) {
        // 권한 에러는 조용히 처리 (북마크 없는 것으로 간주)
        if (error?.code === 'permission-denied') {
          console.warn('북마크 권한 없음 - Firestore 규칙 확인 필요');
          setBookmarkedIds([]);
          fetchedRef.current = true;
        } else {
          console.error('북마크 로드 실패:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarks();
  }, [user, authReady]);

  // 북마크 여부 확인
  const isBookmarked = useCallback((postId: string) => {
    return bookmarkedIds.includes(postId);
  }, [bookmarkedIds]);

  // 북마크 토글 (추가/삭제)
  const toggleBookmark = useCallback(async (postId: string) => {
    if (!user) {
      alert('로그인이 필요한 서비스입니다.');
      return;
    }

    const isCurrentlyBookmarked = bookmarkedIds.includes(postId);

    try {
      const { db } = await import('@/lib/firebase');
      const { collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp } = await import('firebase/firestore');

      if (isCurrentlyBookmarked) {
        // 북마크 삭제
        const bookmarksQuery = query(
          collection(db, 'bookmarks'),
          where('userId', '==', user.uid),
          where('postId', '==', postId)
        );
        const snapshot = await getDocs(bookmarksQuery);

        for (const doc of snapshot.docs) {
          await deleteDoc(doc.ref);
        }

        setBookmarkedIds(prev => prev.filter(id => id !== postId));
      } else {
        // 북마크 추가
        await addDoc(collection(db, 'bookmarks'), {
          userId: user.uid,
          postId: postId,
          bookmarkedAt: serverTimestamp(),
        });

        setBookmarkedIds(prev => [...prev, postId]);
      }
    } catch (error) {
      console.error('북마크 토글 실패:', error);
      alert('북마크 처리 중 오류가 발생했습니다.');
    }
  }, [user, bookmarkedIds]);

  const value = {
    bookmarkedIds,
    isBookmarked,
    toggleBookmark,
    isLoading,
  };

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
}
