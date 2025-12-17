'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { Report } from '@/types/report';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeHtml, extractStyleTag } from '@/utils/sanitizeHtml';
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

interface ReportDetailClientProps {
  report: Report;
}

export default function ReportDetailClient({ report }: ReportDetailClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(report.likes || 0);

  // 조회수 증가
  useEffect(() => {
    const incrementView = async () => {
      try {
        await fetch(`/api/reports/${report.id}/view`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('조회수 증가 실패:', error);
      }
    };

    incrementView();
  }, [report.id]);

  // 좋아요 상태 확인
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user) return;

      try {
        const response = await fetch(`/api/reports/${report.id}/like?userId=${user.uid}`);
        const data = await response.json();
        if (data.success) {
          setIsLiked(data.isLiked);
        }
      } catch (error) {
        console.error('좋아요 상태 확인 실패:', error);
      }
    };

    checkLikeStatus();
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
      <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${styles[report.opinion]}`}>
        {labels[report.opinion]}
      </span>
    );
  };

  const getReturnRateColor = () => {
    if (report.returnRate > 0) return 'text-red-600 dark:text-red-400';
    if (report.returnRate < 0) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-600 dark:text-gray-400';
  };

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
      await deleteDoc(doc(db, 'posts', report.id));
      alert('리포트가 삭제되었습니다.');
      router.push('/');
    } catch (error) {
      console.error('리포트 삭제 실패:', error);
      alert('리포트 삭제 중 오류가 발생했습니다.');
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

            {/* 기업 정보 카드 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 sm:p-6 border-2 border-blue-200 dark:border-blue-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{report.stockName}</h3>
                  <span className="text-sm sm:text-base lg:text-lg text-gray-500 dark:text-gray-400">{report.ticker}</span>
                  {getOpinionBadge()}
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">리포트 수익률</div>
                  <div className={`text-2xl sm:text-3xl font-bold ${getReturnRateColor()}`}>
                    {report.returnRate > 0 ? '+' : ''}{report.returnRate}%
                  </div>
                </div>
              </div>

              {/* 기업 기본 정보 그리드 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">현재 주가</div>
                  <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white truncate">
                    {report.stockData?.currency || ''} {report.currentPrice?.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">시가총액</div>
                  <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white truncate">
                    {report.stockData?.marketCap
                      ? `${(report.stockData.marketCap / 1e9).toFixed(2)}B`
                      : 'N/A'}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">PER</div>
                  <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white">
                    {report.stockData?.per ? report.stockData.per.toFixed(2) : 'N/A'}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">PBR</div>
                  <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white">
                    {report.stockData?.pbr ? report.stockData.pbr.toFixed(2) : 'N/A'}
                  </div>
                </div>
              </div>

              {/* 작성 시점 주가 & 목표가 */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-3 sm:mt-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">작성 시점 주가</div>
                  <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white truncate">
                    {report.stockData?.currency || ''} {report.initialPrice?.toLocaleString()}
                  </div>
                </div>
                {report.targetPrice && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">목표가</div>
                    <div className="text-sm sm:text-base lg:text-lg font-bold text-blue-600 dark:text-blue-400 truncate">
                      {report.stockData?.currency || ''} {report.targetPrice?.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
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
              <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed whitespace-pre-wrap break-words">
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
