'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { OpinionBadge } from '@/components/Badge';
import { Report } from '@/types/report';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeHtml, extractStyleTag } from '@/utils/sanitizeHtml';
import { getReturnColorClass } from '@/utils/calculateReturn';
import { auth } from '@/lib/firebase';

interface ReportDetailClientProps {
  report: Report;
}

export default function ReportDetailClient({ report }: ReportDetailClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(report.likes || 0);
  const [isClosing, setIsClosing] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  // 수익 확정 상태 확인
  useEffect(() => {
    setIsClosed(report.is_closed || false);
  }, [report.is_closed]);

  // 조회수 증가 + 좋아요 상태 확인 (병렬 처리)
  useEffect(() => {
    const initializeData = async () => {
      const promises: Promise<void>[] = [];

      // 조회수 증가 (항상 실행)
      promises.push(
        fetch(`/api/reports/${report.id}/view`, { method: 'POST' })
          .catch(error => console.error('조회수 증가 실패:', error))
          .then(() => {})
      );

      // 좋아요 상태 확인 (로그인 시에만)
      if (user) {
        promises.push(
          fetch(`/api/reports/${report.id}/like?userId=${user.uid}`)
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                setIsLiked(data.isLiked);
              }
            })
            .catch(error => console.error('좋아요 상태 확인 실패:', error))
        );
      }

      await Promise.all(promises);
    };

    initializeData();
  }, [report.id, user]);

  // 좋아요 토글
  const handleLike = async () => {
    if (!user) {
      alert('로그인이 필요한 서비스입니다.');
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(`/api/reports/${report.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();
      if (data.success) {
        setIsLiked(data.isLiked);
        setLikesCount(data.likes);
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      alert('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  // HTML 모드일 때 <style> 태그 추출
  const { css, html } = useMemo(() => {
    if (report.mode === 'html') {
      return extractStyleTag(report.content);
    }
    return { css: '', html: report.content };
  }, [report.content, report.mode]);


  // 수정 버튼 클릭
  const handleEdit = () => {
    router.push(`/write?id=${report.id}`);
  };

  // 삭제 버튼 클릭
  const handleDelete = async () => {
    if (!confirm('정말로 이 리포트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      // Firebase Auth에서 ID 토큰 가져오기
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert('로그인이 필요합니다.');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('리포트가 삭제되었습니다.');
        router.push('/');
      } else {
        alert(data.error || '리포트 삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('리포트 삭제 실패:', error);
      alert('리포트 삭제 중 오류가 발생했습니다.');
    }
  };

  // 수익 확정 처리
  const handleClosePosition = async () => {
    if (!user || !report.id || isClosing) return;

    const confirmMessage = `현재 수익률 ${report.returnRate?.toFixed(2)}%로 수익을 확정하시겠습니까?\n\n확정 후에는 더 이상 실시간 주가 업데이트가 되지 않습니다.`;
    if (!confirm(confirmMessage)) return;

    setIsClosing(true);

    try {
      const response = await fetch('/api/close-position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: report.id,
          collection: 'posts',
          userId: user.uid,
          closedPrice: report.currentPrice,
          closedReturnRate: report.returnRate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('수익이 확정되었습니다!');
        // 상태 업데이트로 UI 반영 (새로고침 대신)
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

  // 현재 사용자가 작성자인지 확인
  const isAuthor = user && report.authorId === user.uid;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Main Content - 넓게 */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          {/* Report Header with Stock Info */}
          <Card className="p-4 sm:p-6">
            {/* 제목과 작성자 */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 leading-tight">
                {report.title}
              </h1>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b dark:border-gray-700 pb-3 sm:pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0">
                    {report.author[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">{report.author}</div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {report.createdAt} 작성
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span>조회 {report.views}</span>
                    <span>좋아요 {likesCount}</span>
                  </div>
                  {isAuthor ? (
                    <div className="flex gap-2">
                      {!isClosed && (
                        <button
                          onClick={handleClosePosition}
                          disabled={isClosing}
                          className="px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          {isClosing ? '처리 중...' : '수익 확정하기'}
                        </button>
                      )}
                      <Button variant="outline" size="sm" onClick={handleEdit} className="flex-shrink-0">수정</Button>
                      <Button variant="outline" size="sm" onClick={handleDelete} className="flex-shrink-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">삭제</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-shrink-0">팔로우</Button>
                  )}
                </div>
              </div>
            </div>

            {/* 모바일 액션 버튼 (상단) */}
            <div className="lg:hidden mb-4 flex items-center justify-center gap-2 pb-4 border-b dark:border-gray-700">
              {isAuthor ? (
                <>
                  {!isClosed && (
                    <button
                      onClick={handleClosePosition}
                      disabled={isClosing}
                      className={`px-4 py-2 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm ${
                        isClosing ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isClosing ? '처리 중...' : '수익 확정하기'}
                    </button>
                  )}
                  <button onClick={handleEdit} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>수정</span>
                  </button>
                  <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 border border-red-300 dark:border-red-600 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>삭제</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isLiked
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <svg className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} stroke={isLiked ? "none" : "currentColor"} viewBox="0 0 20 20">
                      <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                    </svg>
                    <span>{likesCount}</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span className="hidden xs:inline">북마크</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span className="hidden xs:inline">공유</span>
                  </button>
                </>
              )}
            </div>

            {/* 기업 정보 카드 - 컴팩트 2줄 디자인 */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white via-gray-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl border border-gray-200 dark:border-transparent">
              {/* 1줄: 기업명 + 매수 | 작성가 | 현재가 | 수익률 */}
              <div className="relative px-6 sm:px-8 py-5 sm:py-6">
                <div className="grid grid-cols-4 gap-4 sm:gap-6 items-center">
                  {/* 기업 정보 */}
                  <div className="text-center">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate mb-1">
                      {report.stockName}
                    </h3>
                    <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
                      <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {report.ticker}
                      </span>
                      {report.stockData?.exchange && (
                        <>
                          <span className="text-gray-400 dark:text-slate-500">·</span>
                          <span className="text-gray-500 dark:text-slate-400">{report.stockData.exchange}</span>
                        </>
                      )}
                      <OpinionBadge opinion={report.opinion} />
                    </div>
                  </div>

                  {/* 작성가 */}
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">작성 당시</div>
                    <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                      <span className="text-gray-400 dark:text-slate-400 text-xs mr-0.5">{report.stockData?.currency || '$'}</span>
                      {report.initialPrice?.toLocaleString()}
                    </div>
                  </div>

                  {/* 현재가 */}
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">현재가</div>
                    <div className={`text-base sm:text-lg font-bold tabular-nums ${
                      report.returnRate > 0 ? 'text-red-600 dark:text-red-400' :
                      report.returnRate < 0 ? 'text-blue-600 dark:text-blue-400' :
                      'text-gray-900 dark:text-white'
                    }`}>
                      <span className="text-gray-400 dark:text-slate-400 text-xs mr-0.5">{report.stockData?.currency || '$'}</span>
                      {report.currentPrice?.toLocaleString()}
                    </div>
                  </div>

                  {/* 수익률 */}
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                      {isClosed ? '확정 수익률' : '수익률'}
                    </div>
                    <div className={`text-base sm:text-lg font-black tabular-nums ${
                      report.returnRate > 0 ? 'text-red-600 dark:text-red-400' :
                      report.returnRate < 0 ? 'text-blue-600 dark:text-blue-400' :
                      'text-gray-600 dark:text-slate-300'
                    }`}>
                      {report.returnRate > 0 ? '+' : ''}{report.returnRate?.toFixed(2)}%
                      {isClosed && <span className="ml-1 text-emerald-600 dark:text-emerald-400">✓</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2줄: P/E | P/B | EPS | 목표가 */}
              <div className="relative px-6 sm:px-8 py-4 sm:py-5 bg-gray-100/50 dark:bg-black/20 border-t border-gray-200 dark:border-white/5">
                <div className="grid grid-cols-4 gap-4 sm:gap-6 items-center">
                  {/* P/E */}
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">P/E</div>
                    <div className={`text-base sm:text-lg font-bold tabular-nums ${
                      report.stockData?.per
                        ? report.stockData.per < 15 ? 'text-emerald-600 dark:text-emerald-400'
                          : report.stockData.per > 30 ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-slate-500'
                    }`}>
                      {report.stockData?.per ? report.stockData.per.toFixed(1) : '-'}
                    </div>
                  </div>

                  {/* P/B */}
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">P/B</div>
                    <div className={`text-base sm:text-lg font-bold tabular-nums ${
                      report.stockData?.pbr
                        ? report.stockData.pbr < 1 ? 'text-emerald-600 dark:text-emerald-400'
                          : report.stockData.pbr > 3 ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-slate-500'
                    }`}>
                      {report.stockData?.pbr ? report.stockData.pbr.toFixed(2) : '-'}
                    </div>
                  </div>

                  {/* EPS */}
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">EPS</div>
                    <div className={`text-base sm:text-lg font-bold tabular-nums ${
                      report.stockData?.eps
                        ? report.stockData.eps > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        : 'text-gray-400 dark:text-slate-500'
                    }`}>
                      {report.stockData?.eps ? report.stockData.eps.toFixed(2) : '-'}
                    </div>
                  </div>

                  {/* 목표가 */}
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">목표가</div>
                    {report.targetPrice ? (
                      <div className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                        <span className="text-gray-400 dark:text-slate-400 text-xs mr-0.5">{report.stockData?.currency || '$'}</span>
                        {report.targetPrice?.toLocaleString()}
                      </div>
                    ) : (
                      <div className="text-base sm:text-lg font-bold text-gray-400 dark:text-slate-500">-</div>
                    )}
                  </div>
                </div>
              </div>

              {/* 하단 그라데이션 라인 */}
              <div className="h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            </div>
          </Card>

          {/* Report Content - 넓고 여유롭게 */}
          <Card className="p-4 sm:p-6 lg:p-8">
            {/* HTML/CSS 모드로 작성된 리포트 */}
            {report.mode === 'html' && (
              <>
                {/* 추출된 CSS를 별도로 렌더링 */}
                {css && <style>{css}</style>}
                <div
                  className="prose prose-sm sm:prose-base lg:prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
                />
              </>
            )}

            {/* 텍스트 모드로 작성된 리포트 */}
            {(!report.mode || report.mode === 'text') && (
              <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed whitespace-pre-wrap break-words text-gray-900 dark:text-gray-300">
                {report.content}
              </div>
            )}
          </Card>

          {/* Comments Section */}
          <Card className="p-4 sm:p-6 lg:p-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              댓글 0개
            </h3>

            <div className="mb-4 sm:mb-6">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={user ? "댓글을 작성하세요..." : "댓글을 작성하려면 로그인이 필요합니다."}
                rows={3}
                disabled={!user}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
              <div className="flex justify-end mt-2">
                {user ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (commentText.trim()) {
                        alert('댓글이 작성되었습니다.');
                        setCommentText('');
                      }
                    }}
                  >
                    댓글 작성
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      alert('로그인이 필요한 서비스입니다.');
                      router.push('/login');
                    }}
                  >
                    로그인하고 댓글 작성
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {[].map((comment: any) => (
                <div key={comment.id} className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">{comment.author}</div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">{comment.createdAt}</div>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2">{comment.content}</p>
                  <button className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                    좋아요 {comment.likes}
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar - 간소화 (데스크톱만 표시) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-20 space-y-3">
            {/* Actions */}
            <Card className="p-4">
              <div className="space-y-2">
                <button
                  onClick={handleLike}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    isLiked
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} stroke={isLiked ? "none" : "currentColor"} viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                  <span>좋아요 {likesCount}</span>
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span>북마크</span>
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>공유하기</span>
                </button>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="p-4">
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">작성일</div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">{report.createdAt}</div>
              </div>

              {/* 수정일 표시 (작성일과 다른 날짜만) */}
              {(() => {
                // 작성일과 다른 수정일만 필터링
                const filteredUpdates = report.updatedAt?.filter(date => date !== report.createdAt) || [];

                return filteredUpdates.length > 0 && (
                  <>
                    <div className="border-t dark:border-gray-700 my-3"></div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">수정일</div>
                      <div className="space-y-1">
                        {filteredUpdates.map((date, index) => (
                          <div key={index} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {date}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="border-t dark:border-gray-700 my-3"></div>
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">조회수</div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">{report.views}</div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
