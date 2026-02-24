'use client';

import { useState, memo } from 'react';
import { GuruTrackingEvent, BadgeLabel } from '@/app/guru-tracker/types';
import { useStockPrice } from '@/hooks/useStockPrice';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeHtml } from '@/utils/sanitizeHtml';

interface GuruTrackingCardProps {
  event: GuruTrackingEvent;
  collection?: 'posts'; // 어느 컬렉션에서 온 데이터인지
}

const GuruTrackingCard = memo(function GuruTrackingCard({ event, collection = 'posts' }: GuruTrackingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isClosed, setIsClosed] = useState(event.is_closed || false);
  const { user } = useAuth();
  const isOwner = user && event.author_id === user.uid;

  // 수익 확정 버튼 표시 조건
  const showCloseButton = !isClosed && isOwner;

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
    const baseStyles = 'px-3 py-1 font-pixel text-xs font-bold uppercase border-2';

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

  // 삭제된 경우 렌더링하지 않음
  if (isDeleted) return null;

  return (
    <div className="group bg-[var(--pixel-bg-card)] border-[3px] border-[var(--pixel-border-muted)] hover:border-[var(--pixel-accent)] transition-all duration-300 overflow-hidden">
      {/* Main Content Area */}
      <div className="p-6 sm:p-8">
        {/* Header: Author + Badge + Return Rate */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* Left: Author Info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--pixel-accent)] border-2 border-pixel-accent-dark flex items-center justify-center text-white font-pixel font-bold text-lg flex-shrink-0">
              {event.guru_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-pixel text-sm font-bold">
                  {event.guru_name}
                </h3>
                <span className={getBadgeStyles(event.badge_info.label, event.badge_info.intensity)}>
                  {event.badge_info.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{event.guru_name_kr}</p>
            </div>
          </div>

          {/* Right: Return Rate - Prominent Display */}
          {displayReturnRate !== undefined && (
            <div className={`relative px-6 py-4 border-[3px] ${
              displayReturnRate > 0
                ? 'bg-red-500/10 border-red-300 dark:border-red-700'
                : displayReturnRate < 0
                ? 'bg-blue-500/10 border-blue-300 dark:border-blue-700'
                : 'bg-[var(--pixel-bg)] border-[var(--pixel-border-muted)]'
            }`}>
              {isClosed && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white font-pixel text-xs font-bold px-2 py-1 border-2 border-green-700">
                  확정
                </div>
              )}
              <div className="font-pixel text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                수익률
                {priceLoading && !isClosed && <span className="text-yellow-500 animate-spin">⟳</span>}
              </div>
              <div className={`text-3xl font-black font-pixel ${
                displayReturnRate > 0
                  ? 'text-red-600 dark:text-red-400'
                  : displayReturnRate < 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {displayReturnRate > 0 ? '+' : ''}{displayReturnRate.toFixed(2)}%
              </div>
              {event.base_price && displayPrice && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-mono">
                  {currencySymbol}{event.base_price.toFixed(2)} → {currencySymbol}{displayPrice.toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stock Info Bar */}
        {event.target_ticker && (
          <div className="mb-6 p-4 bg-red-500/10 border-[3px] border-[var(--pixel-accent)]/30">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {(event.company_name || event.stockData?.name) && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Company</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{event.company_name || event.stockData?.name}</span>
                  </div>
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                </>
              )}
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Ticker</span>
                <span className="font-mono font-bold text-ant-red-600 dark:text-ant-red-400 text-base">{event.target_ticker}</span>
              </div>
              {event.exchange && (
                <>
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Exchange</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{event.exchange}</span>
                  </div>
                </>
              )}
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Date</span>
                <span className="font-semibold text-gray-900 dark:text-white">{event.event_date}</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Content: Title + Summary + Content */}
        <div className="border-t-[3px] border-[var(--pixel-border-muted)] pt-6">
          <div className="mb-4">
            <h2 className="font-pixel text-base font-bold leading-tight mb-3">
              {event.title}
            </h2>
            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              {event.summary}
            </p>
          </div>

          <div
            className={`text-sm text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none transition-all duration-300 ${
              isExpanded ? '' : 'line-clamp-3'
            }`}
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(event.content_html)
                // Tiptap 빈 줄 보존: <p></p> → <p><br></p> (속성 있는 경우도 처리)
                .replace(/<p([^>]*)><\/p>/g, '<p$1><br></p>')
            }}
          />

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--pixel-bg)] border-2 border-[var(--pixel-border-muted)] hover:border-[var(--pixel-accent)] font-pixel text-xs font-bold transition-all"
            >
              {isExpanded ? (
                <>
                  <span>접기</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </>
              ) : (
                <>
                  <span>더보기</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>

            {event.source_url && (
              <a
                href={event.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--pixel-accent)] border-2 border-pixel-accent-dark hover:bg-red-700 text-white font-pixel text-xs font-bold transition-all shadow-[2px_2px_0px_var(--pixel-accent-dark)]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                원문 보기
              </a>
            )}

            {/* Close Position Button */}
            {showCloseButton && (
              <button
                onClick={handleClosePosition}
                disabled={isClosing}
                className={`inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 border-2 border-emerald-800 hover:bg-emerald-700 text-white font-pixel text-xs font-bold transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.3)] ${
                  isClosing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span className="text-lg">💰</span>
                <span>{isClosing ? '처리중...' : '수익 확정'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 sm:px-8 py-4 bg-[var(--pixel-bg)] border-t-[3px] border-[var(--pixel-border-muted)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 font-pixel text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="font-semibold">{event.views || 0}</span>
          </span>
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="font-semibold">{event.likes || 0}</span>
          </span>
          {(isClosed && event.closed_at) ? (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>확정: {new Date(event.closed_at).toLocaleDateString('ko-KR')}</span>
              </span>
            </>
          ) : lastUpdated ? (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>갱신: {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 font-pixel font-bold tracking-wider text-xs ${
            event.data_type === 'PORTFOLIO'
              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-2 border-purple-300 dark:border-purple-700'
              : 'bg-red-500/10 text-[var(--pixel-accent)] border-2 border-[var(--pixel-accent)]/50'
          }`}>
            {event.data_type === 'PORTFOLIO' ? 'WALLET WATCH' : 'MARKET CALL'}
          </span>
        </div>
      </div>
    </div>
  );
});

export default GuruTrackingCard;
