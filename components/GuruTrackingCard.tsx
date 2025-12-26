'use client';

import { useState } from 'react';
import { GuruTrackingEvent, BadgeLabel } from '@/app/guru-tracker/types';
import { useStockPrice } from '@/hooks/useStockPrice';
import { useAuth } from '@/contexts/AuthContext';

interface GuruTrackingCardProps {
  event: GuruTrackingEvent;
  collection?: 'posts' | 'word-watch'; // 어느 컬렉션에서 온 데이터인지
}

export default function GuruTrackingCard({ event, collection = 'posts' }: GuruTrackingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { user } = useAuth();

  // 수익 확정 여부 확인
  const isClosed = event.is_closed || false;
  const isOwner = user && event.author_id === user.uid;

  // 워드워치는 수익 확정 버튼 표시 안 함
  const showCloseButton = collection !== 'word-watch' && !isClosed && isOwner;

  // 실시간 주식 가격 가져오기 (확정되지 않은 경우에만)
  const { currentPrice, currency, returnRate, loading: priceLoading, lastUpdated } = useStockPrice(
    !isClosed ? (event.target_ticker ?? undefined) : undefined, // 확정된 경우 실시간 업데이트 중지
    event.base_price,
    event.tracking_data.action_direction,
    60000 // 1분마다 갱신
  );

  // 거래소나 티커 기반으로 통화 추론
  const inferCurrencyFromExchange = (exchange?: string, ticker?: string): string => {
    // 거래소 기반 추론
    if (exchange) {
      const exchangeUpper = exchange.toUpperCase();
      if (exchangeUpper.includes('TSE') || exchangeUpper.includes('TOKYO')) return 'JPY';
      if (exchangeUpper.includes('KRX') || exchangeUpper.includes('KOREA') || exchangeUpper.includes('KOSPI') || exchangeUpper.includes('KOSDAQ')) return 'KRW';
      if (exchangeUpper.includes('NYSE') || exchangeUpper.includes('NASDAQ') || exchangeUpper.includes('AMEX')) return 'USD';
      if (exchangeUpper.includes('LSE') || exchangeUpper.includes('LONDON')) return 'GBP';
      if (exchangeUpper.includes('SSE') || exchangeUpper.includes('SHANGHAI') || exchangeUpper.includes('SHENZHEN')) return 'CNY';
    }

    // 티커 suffix 기반 추론
    if (ticker) {
      if (ticker.endsWith('.T')) return 'JPY';
      if (ticker.endsWith('.KS') || ticker.endsWith('.KQ')) return 'KRW';
      if (ticker.endsWith('.L')) return 'GBP';
      if (ticker.endsWith('.SS') || ticker.endsWith('.SZ')) return 'CNY';
    }

    return 'USD'; // 기본값
  };

  // 확정된 경우 확정 수익률/가격 사용, 아니면 실시간 또는 기존 가격 사용
  const displayPrice = isClosed
    ? (event.closed_price ?? event.current_price)
    : (currentPrice ?? event.current_price);
  const displayReturnRate = isClosed
    ? (event.closed_return_rate ?? event.return_rate)
    : (returnRate ?? event.return_rate);
  const displayCurrency = currency ?? inferCurrencyFromExchange(event.exchange, event.target_ticker ?? undefined);

  // 통화 기호 가져오기
  const getCurrencySymbol = (curr: string) => {
    switch (curr.toUpperCase()) {
      case 'USD': return '$';
      case 'JPY': return '¥';
      case 'KRW': return '₩';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'CNY': return '¥';
      default: return '$';
    }
  };

  const currencySymbol = getCurrencySymbol(displayCurrency);

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
    if (label === 'BUY' || label === 'BULLISH') {
      return `${baseStyles} ${
        intensity === 'HIGH'
          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
          : intensity === 'MEDIUM'
          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
          : 'bg-gradient-to-r from-green-400 to-emerald-400 text-white'
      }`;
    }
    if (label === 'SELL' || label === 'BEARISH') {
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

  // 수익 확정 처리
  const handleClosePosition = async () => {
    if (!user || !event.id || isClosing) return;

    const confirmMessage = `현재 수익률 ${displayReturnRate?.toFixed(2)}%로 수익을 확정하시겠습니까?\n\n확정 후에는 더 이상 실시간 주가 업데이트가 되지 않습니다.`;
    if (!confirm(confirmMessage)) return;

    setIsClosing(true);

    try {
      const response = await fetch('/api/close-position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: event.id,
          collection,
          userId: user.uid,
          closedPrice: displayPrice,
          closedReturnRate: displayReturnRate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('수익이 확정되었습니다!');
        // 페이지 새로고침하여 업데이트된 데이터 표시
        window.location.reload();
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Main Content Area */}
      <div className="p-6">
        {/* Top Section: Horizontal Layout */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-6">
          {/* Left: Avatar + Analyst Info + Badge */}
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
              {event.guru_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {event.guru_name}
                </h3>
                <span className={getBadgeStyles(event.badge_info.label, event.badge_info.intensity)}>
                  {event.badge_info.label}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{event.guru_name_kr}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{event.event_date}</span>
              </div>
            </div>
          </div>

          {/* Middle: Stock Info */}
          {event.target_ticker && (
            <div className="px-4 py-3 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 rounded-lg flex-shrink-0 h-[90px] flex items-center">
              <div className="flex gap-3 text-xs w-[280px]">
                <div className="w-[100px]">
                  <div className="text-gray-500 dark:text-gray-400 mb-1.5 text-xs leading-tight">Company</div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                    Nike, Inc.
                  </div>
                </div>
                <div className="w-[70px]">
                  <div className="text-gray-500 dark:text-gray-400 mb-1.5 text-xs leading-tight">Ticker</div>
                  <div className="font-mono font-bold text-cyan-700 dark:text-cyan-300 text-sm">
                    {event.target_ticker}
                  </div>
                </div>
                <div className="w-[80px]">
                  <div className="text-gray-500 dark:text-gray-400 mb-1.5 text-xs leading-tight">Exchange</div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">
                    {event.exchange || '-'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right: Return Rate */}
          {displayReturnRate !== undefined && (
            <div className={`bg-gradient-to-br rounded-lg px-4 py-3 text-center border flex-shrink-0 w-[160px] h-[90px] flex flex-col justify-center ${
              isClosed
                ? 'from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-400 dark:border-green-600'
                : 'from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 border-gray-200 dark:border-gray-600'
            }`}>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center justify-center gap-1.5 leading-tight whitespace-nowrap">
                {isClosed ? (
                  <span className="text-green-600 dark:text-green-400 font-bold">✓ 수익확정</span>
                ) : (
                  <>
                    수익률
                    {priceLoading && <span className="text-yellow-500 animate-spin">⟳</span>}
                  </>
                )}
              </div>
              <div className={`text-2xl font-black mb-1 ${
                displayReturnRate >= 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}>
                {displayReturnRate >= 0 ? '+' : ''}{displayReturnRate.toFixed(2)}%
              </div>
              {event.base_price && displayPrice && (
                <div className="text-xs text-gray-600 dark:text-gray-400 font-mono leading-tight">
                  {currencySymbol}{event.base_price.toFixed(2)} → {currencySymbol}{displayPrice.toFixed(2)}
                </div>
              )}
            </div>
          )}

          {/* Far Right: Price Update Time or Close Button */}
          {showCloseButton ? (
            <button
              onClick={handleClosePosition}
              disabled={isClosing}
              className={`bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg px-4 py-3 text-center border-2 border-cyan-400 dark:border-cyan-500 flex-shrink-0 w-[120px] h-[90px] flex flex-col justify-center transition-all shadow-md hover:shadow-lg ${
                isClosing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="text-xs text-white font-bold mb-1.5 leading-tight">
                {isClosing ? '처리중...' : '수익 확정'}
              </div>
              <div className="text-lg font-black text-white">
                💰
              </div>
              <div className="text-xs text-white/80 mt-1 leading-tight">
                {displayReturnRate !== undefined ? `${displayReturnRate >= 0 ? '+' : ''}${displayReturnRate.toFixed(1)}%` : '-'}
              </div>
            </button>
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-lg px-4 py-3 text-center border border-gray-200 dark:border-gray-600 flex-shrink-0 w-[120px] h-[90px] flex flex-col justify-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 leading-tight whitespace-nowrap">
                {isClosed ? '확정일' : '가격갱신'}
              </div>
              {isClosed && event.closed_at ? (
                <>
                  <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                    {new Date(event.closed_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-tight">
                    {new Date(event.closed_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </>
              ) : lastUpdated ? (
                <>
                  <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                    {lastUpdated.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-tight">
                    {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">-</div>
              )}
            </div>
          )}
        </div>

        {/* Middle Section: Main Statement */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight flex-1">
              {event.title}
            </h2>
            {event.source_url && (
              <a
                href={event.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                원문 보기
              </a>
            )}
          </div>
          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            {event.summary}
          </p>
          <div
            className={`text-sm text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none transition-all duration-300 ${
              isExpanded ? '' : 'line-clamp-3'
            }`}
            dangerouslySetInnerHTML={{ __html: event.content_html }}
          />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
          >
            {isExpanded ? (
              <>
                <span>접기</span>
                <svg className="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                <span>더보기</span>
                <svg className="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {event.views || 0}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {event.likes || 0}
          </span>
        </div>
        <span className={`px-3 py-1 rounded-full font-bold tracking-wider text-xs ${
          event.data_type === 'PORTFOLIO'
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
            : 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
        }`}>
          {event.data_type === 'PORTFOLIO' ? 'WALLET WATCH' : 'MARKET CALL'}
        </span>
      </div>
    </div>
  );
}
