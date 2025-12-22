'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Card from './Card';
import { formatReturn, getReturnColorClass } from '@/utils/calculateReturn';

interface ReportCardProps {
  id: string;
  title: string;
  author: string;
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
}

export default function ReportCard({
  id,
  title,
  author,
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
}: ReportCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
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

  const getOpinionBadge = () => {
    const styles = {
      buy: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      sell: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      hold: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    };

    const labels = {
      buy: '매수',
      sell: '매도',
      hold: '보유',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[opinion]}`}>
        {labels[opinion]}
      </span>
    );
  };

  const handleCardClick = () => {
    router.push(`/reports/${id}`);
  };

  return (
    <div onClick={handleCardClick} className="block cursor-pointer">
      <Card className="p-4 sm:p-6 hover:border-blue-300 dark:hover:border-blue-500 border border-transparent dark:border-transparent transition-colors">
        {/* Header */}
        <div className="flex justify-between items-start mb-3 sm:mb-4 gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{stockName}</h3>
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{ticker}</span>
              {getOpinionBadge()}
            </div>
            <h2 className="text-sm sm:text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 line-clamp-2">{title}</h2>
          </div>
          <div className={`text-right flex-shrink-0 ${getReturnColorClass(returnRate)}`}>
            <div className="text-xl sm:text-2xl font-bold">
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
                <button
                  onClick={handleEdit}
                  disabled={isDeleting}
                  className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                >
                  수정
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
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
