'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Card from './Card';
import Badge, { OpinionBadge } from './Badge';
import { formatReturn, getReturnColorClass } from '@/utils/calculateReturn';
import { useAuth } from '@/contexts/AuthContext';

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
  stockData?: {
    currency?: string;
    [key: string]: any;
  };
  is_closed?: boolean; // 수익 확정 여부
  closed_at?: string; // 확정 일시
  closed_return_rate?: number; // 확정 수익률
  closed_price?: number; // 확정 가격
}

export default function ReportCard({
  id,
  title,
  author,
  authorId,
  stockName,
  ticker,
  opinion,
  initialPrice,
  currentPrice,
  returnRate, // API에서 이미 계산된 수익률 사용
  createdAt,
  views,
  likes,
  showActions = false,
  onDelete,
  category,
  stockData,
  is_closed = false,
  closed_at,
  closed_return_rate,
  closed_price,
}: ReportCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isClosed, setIsClosed] = useState(is_closed);
  // API에서 이미 계산된 returnRate를 사용하므로 별도 계산 불필요

  // 통화 추론 함수
  const inferCurrency = (): string => {
    // stockData에 currency가 있으면 사용
    if (stockData?.currency) {
      return stockData.currency;
    }

    // category 기반 추론
    if (category) {
      const categoryUpper = category.toUpperCase();
      if (categoryUpper.includes('KOSPI') || categoryUpper.includes('KOSDAQ')) return 'KRW';
      if (categoryUpper.includes('NIKKEI')) return 'JPY';
      if (categoryUpper.includes('NYSE') || categoryUpper.includes('NASDAQ')) return 'USD';
      if (categoryUpper.includes('HANGSENG')) return 'HKD';
    }

    // 티커 suffix 기반 추론
    if (ticker) {
      if (ticker.endsWith('.T')) return 'JPY';
      if (ticker.endsWith('.KS') || ticker.endsWith('.KQ')) return 'KRW';
      if (ticker.endsWith('.L')) return 'GBP';
      if (ticker.endsWith('.HK')) return 'HKD';
      if (ticker.endsWith('.SS') || ticker.endsWith('.SZ')) return 'CNY';
    }

    return 'USD'; // 기본값
  };

  // 통화 기호 가져오기
  const getCurrencySymbol = (curr: string): string => {
    switch (curr.toUpperCase()) {
      case 'USD': return '$';
      case 'JPY': return '¥';
      case 'KRW': return '₩';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'CNY': case 'CNH': return '¥';
      case 'HKD': return 'HK$';
      default: return '$';
    }
  };

  const currency = inferCurrency();
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
      const response = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('삭제 실패');
      }

      alert('리포트가 삭제되었습니다.');
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('리포트 삭제 중 오류가 발생했습니다.');
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
        <div className="flex justify-between items-start mb-3 sm:mb-4 gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white font-heading tracking-wide">{stockName}</h3>
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono">{ticker}</span>
              <OpinionBadge opinion={opinion} />
            </div>
            <h2 className="text-sm sm:text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 line-clamp-2">{title}</h2>
          </div>
          <div className={`text-right flex-shrink-0 ${getReturnColorClass(returnRate)}`}>
            <div className="text-xl sm:text-2xl font-black font-heading tracking-tight drop-shadow-sm">
              {formatReturn(returnRate)}
            </div>
          </div>
        </div>

        {/* Price Info */}
        <div className="grid grid-cols-2 sm:flex sm:gap-6 gap-2 mb-3 sm:mb-4 text-xs sm:text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400 block sm:inline">작성시:</span>
            <span className="ml-0 sm:ml-2 font-semibold text-gray-900 dark:text-white block sm:inline">{currencySymbol}{initialPrice.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block sm:inline">현재:</span>
            <span className={`ml-0 sm:ml-2 font-semibold ${getReturnColorClass(returnRate)} block sm:inline`}>
              {currencySymbol}{currentPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-700 pt-2 sm:pt-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link
              href={`/user/${encodeURIComponent(author)}`}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors"
            >
              {author}
            </Link>
            <span className="hidden sm:inline">{createdAt}</span>
            <span className="sm:hidden">{createdAt.slice(5)}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {!showActions && (
              <>
                <span>조회 {views}</span>
                <span>좋아요 {likes}</span>
              </>
            )}
            {showActions && (
              <>
                {!isClosed && (
                  <button
                    onClick={handleClosePosition}
                    disabled={isClosing || isDeleting}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                >
                  수정
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting || isClosing}
                  className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
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
}
