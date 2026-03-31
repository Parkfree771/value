'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, memo, useCallback } from 'react';
import Card from './Card';
import Badge, { OpinionBadge } from './Badge';
import { formatReturn, getReturnColorClass } from '@/utils/calculateReturn';
import { inferCurrency, formatPrice } from '@/utils/currency';
import { useAuth } from '@/contexts/AuthContext';
import { useBookmark } from '@/contexts/BookmarkContext';

// 테마 ID → 이름 정적 맵 (theme-stocks.json과 동기화)
const THEME_NAMES: Record<string, string> = {
  'physical-ai': '피지컬AI',
  'quantum-computing': '양자컴퓨터',
  'secondary-battery': '2차전지',
  'ai-semiconductor': 'AI반도체',
  'robotics': '로봇',
  'autonomous-driving': '자율주행',
  'bio-healthcare': '바이오/헬스케어',
  'space-aerospace': '우주항공',
  'nuclear-energy': '원자력',
  'defense': '방산',
};

interface ReportCardProps {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  stockName: string;
  ticker: string;
  opinion: 'buy' | 'sell' | 'hold';
  initialPrice: number;
  currentPrice: number;
  returnRate: number;
  createdAt: string;
  views: number;
  likes: number;
  showActions?: boolean;
  onDelete?: () => void;
  category?: string;
  exchange?: string;
  stockData?: {
    currency?: string;
    [key: string]: any;
  };
  themes?: string[];
}

const ReportCard = memo(function ReportCard({
  id,
  title,
  author,
  authorId,
  stockName,
  ticker,
  opinion,
  initialPrice,
  currentPrice,
  returnRate,
  createdAt,
  views,
  likes,
  showActions = false,
  onDelete,
  category,
  exchange,
  stockData,
  themes,
}: ReportCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmark();
  const [isDeleting, setIsDeleting] = useState(false);

  const bookmarked = isBookmarked(id);

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleBookmark(id);
  };

  // 통화 추론 (utils/currency.ts 사용)
  const currency = inferCurrency({ exchange, category, ticker, stockData });
  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/write?id=${id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('정말 이 리포트를 삭제하시겠습니까?')) {
      return;
    }

    setIsDeleting(true);

    try {
      // Firebase Auth에서 ID 토큰 가져오기 (lazy import)
      const { auth } = await import('@/lib/firebase');
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert('로그인이 필요합니다.');
        return;
      }

      const response = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '삭제 실패');
      }

      alert('리포트가 삭제되었습니다.');
      if (onDelete) {
        onDelete();
      }
    } catch (error: any) {
      console.error('삭제 오류:', error);
      alert(error.message || '리포트 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCardClick = () => {
    router.push(`/reports/${id}`);
  };

  return (
    <div onClick={handleCardClick} className="block cursor-pointer">
      <Card variant="glass" padding="md">
        {/* Header */}
        <div className="flex justify-between items-start mb-2 sm:mb-4 gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 truncate mb-1 sm:mb-2">{title}</h2>
            <div className="flex items-center gap-1 sm:gap-2 overflow-hidden">
              <h3 className="text-xs sm:text-lg font-bold text-gray-900 dark:text-white font-heading tracking-wide truncate">{stockName}</h3>
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-mono flex-shrink-0">{ticker}</span>
              {themes && themes.length > 0 && themes.slice(0, 2).map(themeId => (
                <span key={themeId} className="text-[10px] px-1 sm:px-1.5 py-0.5 border border-[var(--theme-border-muted)] rounded text-gray-500 dark:text-gray-400 flex-shrink-0 hidden sm:inline">
                  #{THEME_NAMES[themeId] || themeId}
                </span>
              ))}
              {themes && themes.length > 2 && (
                <span className="text-[10px] text-gray-500 dark:text-gray-400 flex-shrink-0 hidden sm:inline">+{themes.length - 2}</span>
              )}
            </div>
          </div>
          <div className={`text-right flex-shrink-0 ${getReturnColorClass(returnRate)}`}>
            <div className="text-base sm:text-2xl font-black font-heading font-mono tracking-tight">
              {formatReturn(returnRate)}
            </div>
            <div className="mt-1">
              <OpinionBadge opinion={opinion} />
            </div>
          </div>
        </div>

        {/* Price Info - 한 줄 */}
        <div className="mb-1 sm:mb-2 text-[11px] sm:text-sm flex items-center gap-1.5 sm:gap-3 overflow-hidden whitespace-nowrap text-gray-500 dark:text-gray-400">
          <span>
            매수{' '}
            <span className="font-semibold font-mono text-gray-900 dark:text-white">{formatPrice(initialPrice, currency)}</span>
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>
            현재{' '}
            <span className={`font-semibold font-mono ${getReturnColorClass(returnRate)}`}>{formatPrice(currentPrice, currency)}</span>
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 border-t dark:border-gray-700 pt-1 sm:pt-2 gap-0.5 sm:gap-1 overflow-hidden whitespace-nowrap leading-none">
          <span className="font-medium text-gray-700 dark:text-gray-300 truncate min-w-0 flex-shrink"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/user/${encodeURIComponent(author)}`; }}
          >
            {author}
          </span>
          <span className="flex-shrink-0">·</span>
          <span className="flex-shrink-0 hidden sm:inline">{createdAt}</span>
          <span className="flex-shrink-0 sm:hidden">{createdAt.slice(5)}</span>
          <span className="flex-shrink-0">·</span>
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            {!showActions && (
              <>
                <span>조회 {views}</span>
                <span>·</span>
                <span>좋아요 {likes}</span>
                <button
                  onClick={handleBookmarkClick}
                  className="card-footer-action group/bm p-0.5 sm:p-1 -m-0.5 ml-0.5 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                  aria-label={bookmarked ? '북마크 해제' : '북마크'}
                >
                  {bookmarked ? (
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neon-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 dark:text-gray-500 group-hover/bm:text-neon-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  )}
                </button>
              </>
            )}
            {showActions && (
              <>
                <button
                  onClick={handleEdit}
                  disabled={isDeleting}
                  className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                >
                  수정
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
});

export default ReportCard;
