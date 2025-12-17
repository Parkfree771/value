import Link from 'next/link';
import Card from './Card';
import { calculateReturn, formatReturn, getReturnColorClass } from '@/utils/calculateReturn';

interface ReportCardProps {
  id: string;
  title: string;
  author: string;
  stockName: string;
  ticker: string;
  opinion: 'buy' | 'sell' | 'hold';
  initialPrice: number;
  currentPrice: number;
  positionType?: 'long' | 'short'; // 포지션 타입 추가
  createdAt: string;
  views: number;
  likes: number;
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
  positionType = 'long', // 기본값은 long
  createdAt,
  views,
  likes,
}: ReportCardProps) {
  // 포지션 타입에 따라 수익률 계산
  const returnRate = calculateReturn(initialPrice, currentPrice, positionType);

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

  return (
    <Link href={`/reports/${id}`} className="block">
      <Card className="p-4 sm:p-6 hover:border-blue-300 dark:hover:border-blue-500 border border-transparent dark:border-transparent">
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
            <span className="ml-0 sm:ml-2 font-semibold text-gray-900 dark:text-white block sm:inline">{initialPrice.toLocaleString()}원</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block sm:inline">현재:</span>
            <span className={`ml-0 sm:ml-2 font-semibold ${getReturnColorClass(returnRate)} block sm:inline`}>
              {currentPrice.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-700 pt-2 sm:pt-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{author}</span>
            <span className="hidden sm:inline">{createdAt}</span>
            <span className="sm:hidden">{createdAt.slice(5)}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <span>조회 {views}</span>
            <span>좋아요 {likes}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
