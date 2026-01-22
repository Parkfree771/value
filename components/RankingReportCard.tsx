'use client';

import { memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from './Card';
import { OpinionBadge } from './Badge';
import { formatReturn, getReturnColorClass } from '@/utils/calculateReturn';
import { inferCurrency, getCurrencySymbol } from '@/utils/currency';
import styles from './RankingReportCard.module.css';

interface RankingReportCardProps {
  report: {
    id: string;
    title: string;
    author: string;
    stockName: string;
    ticker: string;
    opinion: 'buy' | 'sell' | 'hold';
    returnRate: number;
    initialPrice: number;
    currentPrice: number;
    createdAt: string;
    views: number;
    likes: number;
    daysElapsed: number;
    category?: string;
    exchange?: string;
    stockData?: {
      currency?: string;
      [key: string]: any;
    };
  };
  rank: number;
}

const RankingReportCard = memo(function RankingReportCard({ report, rank }: RankingReportCardProps) {
  const router = useRouter();

  // 통화 추론 및 기호
  const currency = inferCurrency({
    exchange: report.exchange,
    category: report.category,
    ticker: report.ticker,
    stockData: report.stockData
  });
  const currencySymbol = getCurrencySymbol(currency);

  const getRankBadge = () => {
    if (rank === 1) {
      return (
        <div className={`${styles.badge} ${styles.badgeFirst}`}>
          <span className={styles.badgeFirstNumber}>1</span>
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className={`${styles.badge} ${styles.badgeSecond}`}>
          <span className={styles.badgeSecondNumber}>2</span>
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className={`${styles.badge} ${styles.badgeThird}`}>
          <span className={styles.badgeThirdNumber}>3</span>
        </div>
      );
    } else {
      return (
        <div className={`${styles.badge} ${styles.badgeDefault}`}>
          <span className={styles.badgeDefaultNumber}>{rank}</span>
        </div>
      );
    }
  };

  const handleCardClick = () => {
    router.push(`/reports/${report.id}`);
  };

  return (
    <div onClick={handleCardClick} className="block cursor-pointer">
      <Card variant="glass" padding="md">
        <div className="flex gap-3 sm:gap-4">
          {/* Rank Badge */}
          <div className="flex-shrink-0 flex items-start pt-1">
            {getRankBadge()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex justify-between items-start mb-2 sm:mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white font-heading tracking-wide">{report.stockName}</h3>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono">{report.ticker}</span>
                  <OpinionBadge opinion={report.opinion} />
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">{report.title}</h2>
              </div>
              <div className={`text-right flex-shrink-0 ${getReturnColorClass(report.returnRate)}`}>
                <div className="text-xl sm:text-2xl font-black font-heading tracking-tight drop-shadow-sm">
                  {formatReturn(report.returnRate)}
                </div>
              </div>
            </div>

            {/* Price Info */}
            <div className="grid grid-cols-2 sm:flex sm:gap-6 gap-2 mb-2 sm:mb-3 text-xs sm:text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400 block sm:inline">작성시:</span>
                <span className="ml-0 sm:ml-2 font-semibold text-gray-900 dark:text-white block sm:inline">{currencySymbol}{report.initialPrice.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block sm:inline">현재:</span>
                <span className={`ml-0 sm:ml-2 font-semibold ${getReturnColorClass(report.returnRate)} block sm:inline`}>
                  {currencySymbol}{report.currentPrice.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-700 pt-2 sm:pt-3">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <Link
                  href={`/user/${encodeURIComponent(report.author)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors"
                >
                  {report.author}
                </Link>
                <span className="hidden sm:inline">{report.createdAt}</span>
                <span className="sm:hidden">{report.createdAt.slice(5)}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <span>조회 {report.views.toLocaleString()}</span>
                <span>좋아요 {report.likes.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

export default RankingReportCard;
