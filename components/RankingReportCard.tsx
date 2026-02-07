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
        <span className="w-5 sm:w-7 text-center text-xs sm:text-sm font-bold text-gray-400 dark:text-gray-500">
          {rank}
        </span>
      );
    }
  };

  const handleCardClick = () => {
    router.push(`/reports/${report.id}`);
  };

  return (
    <div onClick={handleCardClick} className="block cursor-pointer">
      <Card variant="glass" padding="md">
        <div className="flex gap-2.5 sm:gap-4">
          {/* Rank Badge */}
          <div className="flex-shrink-0 flex items-start pt-0.5 sm:pt-1">
            {getRankBadge()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex justify-between items-start mb-1.5 sm:mb-3 gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1.5 overflow-hidden whitespace-nowrap">
                  <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white font-heading tracking-wide truncate">{report.stockName}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono flex-shrink-0">{report.ticker}</span>
                  <span className="flex-shrink-0"><OpinionBadge opinion={report.opinion} /></span>
                </div>
                <h2 className="text-xs sm:text-base font-semibold text-gray-800 dark:text-gray-200 truncate">{report.title}</h2>
              </div>
              <div className={`text-right flex-shrink-0 ${getReturnColorClass(report.returnRate)}`}>
                <div className="text-base sm:text-2xl font-black font-heading tracking-tight">
                  {formatReturn(report.returnRate)}
                </div>
              </div>
            </div>

            {/* Price Info */}
            <div className="flex gap-4 sm:gap-6 mb-1.5 sm:mb-3 text-xs sm:text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">작성시: </span>
                <span className="font-semibold text-gray-900 dark:text-white">{currencySymbol}{report.initialPrice.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">현재: </span>
                <span className={`font-semibold ${getReturnColorClass(report.returnRate)}`}>
                  {currencySymbol}{report.currentPrice.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 border-t dark:border-gray-700 pt-1.5 sm:pt-3 gap-1 overflow-hidden whitespace-nowrap">
              <span
                className="font-medium text-gray-700 dark:text-gray-300 truncate min-w-0 flex-shrink"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/user/${encodeURIComponent(report.author)}`; }}
              >
                {report.author}
              </span>
              <span className="flex-shrink-0">·</span>
              <span className="flex-shrink-0 hidden sm:inline">{report.createdAt}</span>
              <span className="flex-shrink-0 sm:hidden">{report.createdAt.slice(5)}</span>
              <span className="flex-shrink-0">·</span>
              <span className="flex-shrink-0">조회 {report.views.toLocaleString()}</span>
              <span className="flex-shrink-0">·</span>
              <span className="flex-shrink-0">좋아요 {report.likes.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

export default RankingReportCard;
