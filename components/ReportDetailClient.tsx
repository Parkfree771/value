'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { Report } from '@/types/report';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeHtml } from '@/utils/sanitizeHtml';

const mockComments = [
  {
    id: 1,
    author: '주식고수',
    content: '좋은 분석입니다! 저도 삼성전자에 대해 긍정적으로 보고 있습니다.',
    createdAt: '2025-11-02',
    likes: 12,
  },
  {
    id: 2,
    author: '신중한투자자',
    content: 'HBM 시장은 좋지만 파운드리는 아직 불확실한 것 같습니다.',
    createdAt: '2025-11-03',
    likes: 8,
  },
];

interface ReportDetailClientProps {
  report: Report;
}

export default function ReportDetailClient({ report }: ReportDetailClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');

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
                    <span>좋아요 {report.likes}</span>
                  </div>
                  <Button variant="outline" size="sm" className="flex-shrink-0">팔로우</Button>
                </div>
              </div>
            </div>

            {/* 모바일 액션 버튼 (상단) */}
            <div className="lg:hidden mb-4 flex items-center justify-center gap-2 pb-4 border-b dark:border-gray-700">
              <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
                <span>{report.likes}</span>
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
              <div>
                <style>{report.cssContent || ''}</style>
                <div
                  className="prose prose-sm sm:prose-base lg:prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(report.content) }}
                />
              </div>
            )}

            {/* 텍스트 모드로 작성된 리포트 */}
            {(!report.mode || report.mode === 'text') && (
              <div className="space-y-3 sm:space-y-4">
                {report.content.split('\n').map((line, index) => {
                  if (line.startsWith('# ')) {
                    return <h1 key={index} className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 mt-6 sm:mt-8 text-gray-900 dark:text-white">{line.slice(2)}</h1>;
                  } else if (line.startsWith('## ')) {
                    return <h2 key={index} className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4 mt-4 sm:mt-6 text-gray-900 dark:text-white">{line.slice(3)}</h2>;
                  } else if (line.startsWith('### ')) {
                    return <h3 key={index} className="text-base sm:text-lg lg:text-xl font-bold mb-2 sm:mb-3 mt-3 sm:mt-5 text-gray-900 dark:text-white">{line.slice(4)}</h3>;
                  } else if (line.startsWith('- ')) {
                    return <li key={index} className="ml-4 sm:ml-6 mb-2 text-sm sm:text-base lg:text-lg text-gray-700 dark:text-gray-300 leading-relaxed">{line.slice(2)}</li>;
                  } else if (line.trim() === '') {
                    return <div key={index} className="h-2 sm:h-4" />;
                  } else {
                    return <p key={index} className="mb-3 sm:mb-4 text-sm sm:text-base lg:text-lg text-gray-700 dark:text-gray-300 leading-relaxed">{line}</p>;
                  }
                })}
              </div>
            )}
          </Card>

          {/* Comments Section */}
          <Card className="p-4 sm:p-6 lg:p-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              댓글 {mockComments.length}개
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
              {mockComments.map((comment) => (
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
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                  <span>좋아요 {report.likes}</span>
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
