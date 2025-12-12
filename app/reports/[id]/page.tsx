'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { getReportById } from '@/lib/reportStore';
import { Report } from '@/types/report';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';

// Mock data
const mockReport = {
  id: '1',
  title: '삼성전자 반도체 업황 회복 기대',
  author: '투자왕김부자',
  stockName: '삼성전자',
  ticker: '005930',
  opinion: 'buy' as const,
  returnRate: 24.5,
  initialPrice: 50000,
  currentPrice: 62250,
  targetPrice: 70000,
  createdAt: '2025-11-01',
  views: 1234,
  likes: 89,
  mode: 'text' as const,

  // Report content
  content: `
# 투자 아이디어

삼성전자의 반도체 부문이 회복세를 보이고 있습니다. 특히 HBM 시장에서의 입지 강화와 파운드리 사업의 턴어라운드가 기대됩니다.

## 투자 포인트

1. **HBM 시장 확대**: AI 반도체 수요 증가로 HBM 시장이 급성장하고 있으며, 삼성전자는 HBM3E 양산을 통해 시장 점유율을 확대하고 있습니다.

2. **파운드리 턴어라운드**: 3nm 공정의 수율 개선과 주요 고객사 확보로 파운드리 사업이 회복세를 보이고 있습니다.

3. **메모리 반도체 업황 회복**: DRAM과 NAND 가격이 상승세를 보이며 메모리 반도체 업황이 개선되고 있습니다.

## 재무적 분석

- 2024년 4분기부터 영업이익률이 개선될 것으로 예상
- 반도체 부문의 흑자 전환 기대
- 배당 증가 가능성

## 리스크 요인

- 중국 경기 둔화로 인한 수요 감소 우려
- 미중 무역 분쟁 심화 가능성
- 경쟁사(SK하이닉스) 대비 기술 격차
  `,
} as Report;

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

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true);

        // Firestore에서 리포트 가져오기
        const docRef = doc(db, 'posts', resolvedParams.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          // createdAt을 문자열로 변환
          let createdAtStr = '';
          if (data.createdAt instanceof Timestamp) {
            createdAtStr = data.createdAt.toDate().toISOString().split('T')[0];
          } else if (typeof data.createdAt === 'string') {
            createdAtStr = data.createdAt;
          } else {
            createdAtStr = new Date().toISOString().split('T')[0];
          }

          const fetchedReport: Report = {
            id: docSnap.id,
            title: data.title || '',
            author: data.authorName || '익명',
            stockName: data.stockName || '',
            ticker: data.ticker || '',
            opinion: data.opinion || 'hold',
            returnRate: data.returnRate || 0,
            initialPrice: data.initialPrice || 0,
            currentPrice: data.currentPrice || 0,
            targetPrice: data.targetPrice || 0,
            createdAt: createdAtStr,
            views: data.views || 0,
            likes: data.likes || 0,
            mode: data.mode || 'text',
            content: data.content || '',
            cssContent: data.cssContent || '',
            images: data.images || [],
            files: data.files || [],
            positionType: data.positionType || 'long',
            stockData: data.stockData || {},
          };

          setReport(fetchedReport);
        } else {
          console.log('리포트를 찾을 수 없습니다.');
          // localStorage에서 시도 (백업)
          const savedReport = getReportById(resolvedParams.id);
          if (savedReport) {
            setReport(savedReport);
          }
        }
      } catch (error) {
        console.error('리포트 가져오기 실패:', error);
        // 에러 발생 시 localStorage에서 시도
        const savedReport = getReportById(resolvedParams.id);
        if (savedReport) {
          setReport(savedReport);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [resolvedParams.id]);

  // 로딩 중이거나 리포트가 없으면 표시
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            리포트를 찾을 수 없습니다
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            요청하신 리포트가 존재하지 않거나 삭제되었습니다.
          </p>
          <Button onClick={() => router.push('/')}>
            홈으로 돌아가기
          </Button>
        </Card>
      </div>
    );
  }

  const displayReport = report;

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
      <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${styles[displayReport.opinion]}`}>
        {labels[displayReport.opinion]}
      </span>
    );
  };

  const getReturnRateColor = () => {
    if (displayReport.returnRate > 0) return 'text-red-600 dark:text-red-400';
    if (displayReport.returnRate < 0) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          <div className="text-center text-gray-600 dark:text-gray-400">로딩 중...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Main Content - 넓게 */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          {/* Report Header with Stock Info */}
          <Card className="p-4 sm:p-6">
            {/* 제목과 작성자 */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 leading-tight">
                {displayReport.title}
              </h1>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b dark:border-gray-700 pb-3 sm:pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0">
                    {displayReport.author[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">{displayReport.author}</div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {displayReport.createdAt} 작성
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span>조회 {displayReport.views}</span>
                    <span>좋아요 {displayReport.likes}</span>
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
                <span>{displayReport.likes}</span>
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
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{displayReport.stockName}</h3>
                  <span className="text-sm sm:text-base lg:text-lg text-gray-500 dark:text-gray-400">{displayReport.ticker}</span>
                  {getOpinionBadge()}
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">리포트 수익률</div>
                  <div className={`text-2xl sm:text-3xl font-bold ${getReturnRateColor()}`}>
                    {displayReport.returnRate > 0 ? '+' : ''}{displayReport.returnRate}%
                  </div>
                </div>
              </div>

              {/* 기업 기본 정보 그리드 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">현재 주가</div>
                  <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white truncate">
                    {displayReport.stockData?.currency || ''} {displayReport.currentPrice?.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">시가총액</div>
                  <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white truncate">
                    {displayReport.stockData?.marketCap
                      ? `${(displayReport.stockData.marketCap / 1e9).toFixed(2)}B`
                      : 'N/A'}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">PER</div>
                  <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white">
                    {displayReport.stockData?.per ? displayReport.stockData.per.toFixed(2) : 'N/A'}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">PBR</div>
                  <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white">
                    {displayReport.stockData?.pbr ? displayReport.stockData.pbr.toFixed(2) : 'N/A'}
                  </div>
                </div>
              </div>

              {/* 작성 시점 주가 & 목표가 */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-3 sm:mt-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">작성 시점 주가</div>
                  <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white truncate">
                    {displayReport.stockData?.currency || ''} {displayReport.initialPrice?.toLocaleString()}
                  </div>
                </div>
                {displayReport.targetPrice && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">목표가</div>
                    <div className="text-sm sm:text-base lg:text-lg font-bold text-blue-600 dark:text-blue-400 truncate">
                      {displayReport.stockData?.currency || ''} {displayReport.targetPrice?.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Report Content - 넓고 여유롭게 */}
          <Card className="p-4 sm:p-6 lg:p-8">
            {/* HTML/CSS 모드로 작성된 리포트 */}
            {displayReport.mode === 'html' && (
              <div>
                <style>{displayReport.cssContent || ''}</style>
                <div
                  className="prose prose-sm sm:prose-base lg:prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: displayReport.content }}
                />
              </div>
            )}

            {/* 텍스트 모드로 작성된 리포트 */}
            {(!displayReport.mode || displayReport.mode === 'text') && (
              <div className="space-y-3 sm:space-y-4">
                {displayReport.content.split('\n').map((line, index) => {
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
                  <span>좋아요 {displayReport.likes}</span>
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
                <div className="text-base font-semibold text-gray-900 dark:text-white">{displayReport.createdAt}</div>
              </div>
              <div className="border-t dark:border-gray-700 my-3"></div>
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">조회수</div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">{displayReport.views}</div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
