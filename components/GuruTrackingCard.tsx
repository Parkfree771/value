'use client';

import { GuruTrackingEvent, BadgeLabel } from '@/app/guru-tracker/types';

interface GuruTrackingCardProps {
  event: GuruTrackingEvent;
}

export default function GuruTrackingCard({ event }: GuruTrackingCardProps) {
  const getBadgeStyles = (label: BadgeLabel, intensity: string) => {
    const baseStyles = 'px-3 py-1 rounded-full text-xs font-bold uppercase';

    // Portfolio badges
    if (label === 'NEW BUY') {
      return `${baseStyles} ${
        intensity === 'HIGH'
          ? 'bg-green-600 text-white'
          : intensity === 'MEDIUM'
          ? 'bg-green-500 text-white'
          : 'bg-green-400 text-white'
      }`;
    }
    if (label === 'ADD') {
      return `${baseStyles} ${
        intensity === 'HIGH'
          ? 'bg-blue-600 text-white'
          : intensity === 'MEDIUM'
          ? 'bg-blue-500 text-white'
          : 'bg-blue-400 text-white'
      }`;
    }
    if (label === 'TRIM') {
      return `${baseStyles} ${
        intensity === 'HIGH'
          ? 'bg-orange-600 text-white'
          : intensity === 'MEDIUM'
          ? 'bg-orange-500 text-white'
          : 'bg-orange-400 text-white'
      }`;
    }
    if (label === 'SOLD OUT') {
      return `${baseStyles} ${
        intensity === 'HIGH'
          ? 'bg-red-600 text-white'
          : intensity === 'MEDIUM'
          ? 'bg-red-500 text-white'
          : 'bg-red-400 text-white'
      }`;
    }

    // Mention badges
    if (label === 'BULLISH') {
      return `${baseStyles} ${
        intensity === 'HIGH'
          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
          : intensity === 'MEDIUM'
          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
          : 'bg-gradient-to-r from-green-400 to-emerald-400 text-white'
      }`;
    }
    if (label === 'BEARISH') {
      return `${baseStyles} ${
        intensity === 'HIGH'
          ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white'
          : intensity === 'MEDIUM'
          ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
          : 'bg-gradient-to-r from-red-400 to-rose-400 text-white'
      }`;
    }
    if (label === 'WARNING') {
      return `${baseStyles} ${
        intensity === 'HIGH'
          ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white'
          : intensity === 'MEDIUM'
          ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white'
          : 'bg-gradient-to-r from-yellow-400 to-amber-400 text-white'
      }`;
    }
    if (label === 'OPINION') {
      return `${baseStyles} ${
        intensity === 'HIGH'
          ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white'
          : intensity === 'MEDIUM'
          ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white'
          : 'bg-gradient-to-r from-purple-400 to-violet-400 text-white'
      }`;
    }

    return `${baseStyles} bg-gray-500 text-white`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getDaysAgo = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - eventDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
    return `${Math.floor(diffDays / 365)}년 전`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {event.guru_name_kr.charAt(0)}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                {event.guru_name_kr}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{event.guru_name}</p>
            </div>
          </div>
          <span className={getBadgeStyles(event.badge_info.label, event.badge_info.intensity)}>
            {event.badge_info.label}
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
          {event.title}
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {event.summary}
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            {formatDate(event.event_date)}
          </span>
          <span>•</span>
          <span>{getDaysAgo(event.event_date)}</span>
          {event.target_ticker && (
            <>
              <span>•</span>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-mono font-semibold">
                {event.target_ticker}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Return Rate Display (if calculated) */}
      {event.return_rate !== undefined && (
        <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {event.tracking_data.action_direction === 'LONG' ? '매수 후 수익률' : '하락 예측 정확도'}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${
                  event.return_rate >= 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {event.return_rate >= 0 ? '+' : ''}{event.return_rate.toFixed(2)}%
                </span>
                {event.base_price && event.current_price && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ${event.base_price.toFixed(2)} → ${event.current_price.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">기준일</div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {event.tracking_data.base_price_date}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Preview */}
      <div className="p-4 sm:p-6">
        <div
          className="text-sm text-gray-700 dark:text-gray-300 prose dark:prose-invert max-w-none line-clamp-3"
          dangerouslySetInnerHTML={{ __html: event.content_html }}
        />
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="font-semibold">조회</span> {event.views || 0}
          </span>
          <span className="flex items-center gap-1">
            <span className="font-semibold">좋아요</span> {event.likes || 0}
          </span>
        </div>
        <span className={`px-3 py-1 rounded font-semibold tracking-wide ${
          event.data_type === 'PORTFOLIO'
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
            : 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
        }`}>
          {event.data_type === 'PORTFOLIO' ? 'WALLET WATCH' : 'WORD WATCH'}
        </span>
      </div>
    </div>
  );
}
