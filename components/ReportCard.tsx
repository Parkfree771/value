'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, memo, useCallback } from 'react';
import Card from './Card';
import Badge, { OpinionBadge } from './Badge';
import { formatReturn, getReturnColorClass } from '@/utils/calculateReturn';
import { inferCurrency, getCurrencySymbol } from '@/utils/currency';
import { useAuth } from '@/contexts/AuthContext';
import { useBookmark } from '@/contexts/BookmarkContext';

interface ReportCardProps {
  id: string;
  title: string;
  author: string;
  authorId?: string; // 작성자 ID 추가
  stockName: string;
  ticker: string;
  opinion: 'buy' | 'sell' | 'hold';
  initialPrice: number;
  currentPrice: number;
  returnRate: number; // API에서 이미 계산된 수익률 사용
  createdAt: string;
  views: number;
  likes: number;
  showActions?: boolean; // 수정/삭제 버튼 표시 여부
  onDelete?: () => void; // 삭제 후 콜백
  category?: string;
  exchange?: string; // 거래소 정보 추가
  stockData?: {
    currency?: string;
    [key: string]: any;
  };
  is_closed?: boolean; // 수익 확정 여부
  closed_at?: string; // 확정 일시
  closed_return_rate?: number; // 확정 수익률
  closed_price?: number; // 확정 가격
  avgPrice?: number; // 물타기 평균단가
  entries?: { price: number; date: string }[]; // 물타기 기록
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
  is_closed = false,
  closed_at,
  closed_return_rate,
  closed_price,
  avgPrice,
  entries,
}: ReportCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmark();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isClosed, setIsClosed] = useState(is_closed);

  const bookmarked = isBookmarked(id);

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleBookmark(id);
  };

  // 통화 추론 및 기호 (utils/currency.ts 사용)
  const currency = inferCurrency({ exchange, category, ticker, stockData });
  const currencySymbol = getCurrencySymbol(currency);

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

  // 수익 확정 처리
  const handleClosePosition = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !id || isClosing) return;

    const confirmMessage = `현재 수익률 ${returnRate?.toFixed(2)}%로 수익을 확정하시겠습니까?\n\n확정 후에는 더 이상 실시간 주가 업데이트가 되지 않습니다.`;
    if (!confirm(confirmMessage)) return;

    setIsClosing(true);

    try {
      const response = await fetch('/api/close-position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: id,
          collection: 'posts',
          userId: user.uid,
          closedPrice: currentPrice,
          closedReturnRate: returnRate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('수익이 확정되었습니다!');
        setIsClosed(true);
      } else {
        alert(data.error || '수익 확정에 실패했습니다.');
      }
    } catch (error) {
      console.error('수익 확정 오류:', error);
      alert('수익 확정 중 오류가 발생했습니다.');
    } finally {
      setIsClosing(false);
    }
  };

  // OpinionBadge 컴포넌트 사용으로 대체됨
  // const getOpinionBadge = () => { ... };

  const handleCardClick = () => {
    router.push(`/reports/${id}`);
  };

  return (
    <div onClick={handleCardClick} className="block cursor-pointer">
      <Card variant="glass" padding="md">
        {/* Header */}
        <div className="flex justify-between items-start mb-2 sm:mb-4 gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 overflow-hidden whitespace-nowrap">
              <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white font-heading tracking-wide truncate">{stockName}</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono flex-shrink-0">{ticker}</span>
              <span className="flex-shrink-0"><OpinionBadge opinion={opinion} /></span>
            </div>
            <h2 className="text-xs sm:text-base font-semibold text-gray-800 dark:text-gray-200 mb-1.5 sm:mb-2 truncate">{title}</h2>
          </div>
          <div className={`text-right flex-shrink-0 ${getReturnColorClass(returnRate)}`}>
            <div className="text-base sm:text-2xl font-black font-heading tracking-tight">
              {formatReturn(returnRate)}
            </div>
          </div>
        </div>

        {/* Price Info */}
        <div className="flex gap-4 sm:gap-6 mb-2 sm:mb-4 text-xs sm:text-sm">
          <div>
            {avgPrice && entries && entries.length > 0 ? (
              <>
                <span className="text-gray-500 dark:text-gray-400">{currencySymbol}{initialPrice.toLocaleString()} → </span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{currencySymbol}{Number.isInteger(avgPrice) ? avgPrice.toLocaleString() : parseFloat(avgPrice.toFixed(2)).toLocaleString()}</span>
              </>
            ) : (
              <>
                <span className="text-gray-500 dark:text-gray-400">작성시: </span>
                <span className="font-semibold text-gray-900 dark:text-white">{currencySymbol}{initialPrice.toLocaleString()}</span>
              </>
            )}
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">현재: </span>
            <span className={`font-semibold ${getReturnColorClass(returnRate)}`}>
              {currencySymbol}{currentPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 border-t dark:border-gray-700 pt-2 sm:pt-3 gap-1 overflow-hidden whitespace-nowrap">
          <span className="font-medium text-gray-700 dark:text-gray-300 truncate min-w-0 flex-shrink"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/user/${encodeURIComponent(author)}`; }}
          >
            {author}
          </span>
          <span className="flex-shrink-0">·</span>
          <span className="flex-shrink-0 hidden sm:inline">{createdAt}</span>
          <span className="flex-shrink-0 sm:hidden">{createdAt.slice(5)}</span>
          <span className="flex-shrink-0">·</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!showActions && (
              <>
                <span>조회 {views}</span>
                <span>·</span>
                <span>좋아요 {likes}</span>
                <button
                  onClick={handleBookmarkClick}
                  className="group/bm p-1.5 -m-1 ml-0.5 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                  title={bookmarked ? '북마크 해제' : '북마크'}
                >
                  {bookmarked ? (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-neon-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300 dark:text-gray-500 group-hover/bm:text-neon-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  )}
                </button>
              </>
            )}
            {showActions && (
              <>
                {!isClosed && (
                  <button
                    onClick={handleClosePosition}
                    disabled={isClosing || isDeleting}
                    className="px-3 py-2 font-pixel text-xs font-bold text-white bg-emerald-600 border-2 border-emerald-800 hover:bg-emerald-700 transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isClosing ? '처리 중...' : '수익 확정하기'}
                  </button>
                )}
                {isClosed && (
                  <Badge variant="success" size="lg">
                    수익 확정 완료
                  </Badge>
                )}
                <button
                  onClick={handleEdit}
                  disabled={isDeleting || isClosing}
                  className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                >
                  수정
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting || isClosing}
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
