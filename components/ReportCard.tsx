import Link from 'next/link';
import Card from './Card';

interface ReportCardProps {
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
}

export default function ReportCard({
  id,
  title,
  author,
  stockName,
  ticker,
  opinion,
  returnRate,
  initialPrice,
  currentPrice,
  createdAt,
  views,
  likes,
}: ReportCardProps) {
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

  const getReturnRateColor = () => {
    if (returnRate > 0) return 'text-red-600 dark:text-red-400';
    if (returnRate < 0) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <Link href={`/reports/${id}`}>
      <Card className="p-6 hover:border-blue-300 dark:hover:border-blue-500 border border-transparent dark:border-transparent">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{stockName}</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">{ticker}</span>
              {getOpinionBadge()}
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">{title}</h2>
          </div>
          <div className={`text-right ${getReturnRateColor()}`}>
            <div className="text-2xl font-bold">
              {returnRate > 0 ? '+' : ''}{returnRate.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Price Info */}
        <div className="flex gap-6 mb-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">작성시 주가:</span>
            <span className="ml-2 font-semibold text-gray-900 dark:text-white">{initialPrice.toLocaleString()}원</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">현재 주가:</span>
            <span className={`ml-2 font-semibold ${getReturnRateColor()}`}>
              {currentPrice.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-700 pt-3">
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700 dark:text-gray-300">{author}</span>
            <span>{createdAt}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>조회 {views}</span>
            <span>좋아요 {likes}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
