'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { OpinionBadge } from '@/components/Badge';
import { Report } from '@/types/report';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeHtml } from '@/utils/sanitizeHtml';
import { getReturnColorClass } from '@/utils/calculateReturn';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/lib/users';
import { useBookmark } from '@/contexts/BookmarkContext';

interface ReportDetailClientProps {
  report: Report;
}

interface Comment {
  id: string;
  content: string;
  author: string;
  authorId: string;
  parentId: string | null;
  createdAt: string;
  likes: number;
  isLiked: boolean;
}

export default function ReportDetailClient({ report }: ReportDetailClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmark();
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(report.likes || 0);
  const [isClosing, setIsClosing] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [userNickname, setUserNickname] = useState<string>('');
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string } | null>(null);
  const [replyText, setReplyText] = useState('');

  // 수익 확정 상태 확인
  useEffect(() => {
    setIsClosed(report.is_closed || false);
  }, [report.is_closed]);

  // 사용자 닉네임 로드
  useEffect(() => {
    const loadUserNickname = async () => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile?.nickname) {
            setUserNickname(profile.nickname);
          } else {
            setUserNickname(user.displayName || '익명');
          }
        } catch (error) {
          console.error('닉네임 로드 실패:', error);
          setUserNickname(user.displayName || '익명');
        }
      }
    };
    loadUserNickname();
  }, [user]);

  // 댓글 로드 함수
  const loadComments = async (userId?: string) => {
    try {
      const url = userId
        ? `/api/reports/${report.id}/comments?userId=${userId}`
        : `/api/reports/${report.id}/comments`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setComments(data.comments);
        setCommentCount(data.count);
      }
    } catch (error) {
      console.error('댓글 로드 실패:', error);
    }
  };

  // 조회수 증가 + 좋아요 상태 확인 + 댓글 로드 (병렬 처리)
  useEffect(() => {
    const initializeData = async () => {
      const promises: Promise<void>[] = [];

      // 조회수 증가 (항상 실행)
      promises.push(
        fetch(`/api/reports/${report.id}/view`, { method: 'POST' })
          .catch(error => console.error('조회수 증가 실패:', error))
          .then(() => {})
      );

      // 댓글 로드 (항상 실행)
      promises.push(loadComments(user?.uid));

      // 좋아요 상태 확인 (로그인 시에만)
      if (user) {
        promises.push(
          (async () => {
            try {
              const token = await auth.currentUser?.getIdToken();
              const res = await fetch(`/api/reports/${report.id}/like`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              const data = await res.json();
              if (data.success) {
                setIsLiked(data.isLiked);
              }
            } catch (error) {
              console.error('좋아요 상태 확인 실패:', error);
            }
          })()
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
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/reports/${report.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.success) {
        setIsLiked(data.isLiked);
        setLikesCount(data.likes);
      } else if (response.status === 401) {
        alert('로그인이 필요합니다.');
        router.push('/login');
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      alert('좋아요 처리 중 오류가 발생했습니다.');
    }
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* 제목 + 메타 정보 (전체 너비) */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 leading-tight">
          {report.title}
        </h1>
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-wrap">
          <span className="font-medium text-gray-700 dark:text-gray-300">{report.author}</span>
          <span>{report.createdAt}</span>
          <span>조회 {report.views}</span>
          <span>좋아요 {likesCount}</span>
        </div>
      </div>

      <div className="lg:flex lg:gap-8">
        {/* 왼쪽: 본문 영역 */}
        <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">
          {/* 기업 프로필 */}
          <Card padding="none" className="overflow-hidden">
            {/* 1행: 종목명 · 티커 · 거래소 · 의견배지 | 수익률 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">{report.stockName}</span>
                <span className="font-mono text-xs text-gray-400">{report.ticker}</span>
                {report.stockData?.exchange && (
                  <span className={report.stockData.exchange === 'CRYPTO' ? 'text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-medium' : 'text-xs text-gray-400'}>
                    {report.stockData.exchange === 'CRYPTO' ? '코인' : report.stockData.exchange}
                  </span>
                )}
                <OpinionBadge opinion={report.opinion} />
              </div>
              <span className={`flex-shrink-0 ml-4 text-xl sm:text-2xl font-black tabular-nums ${
                report.returnRate > 0 ? 'text-red-600 dark:text-red-500' :
                report.returnRate < 0 ? 'text-blue-600 dark:text-blue-500' :
                'text-gray-900 dark:text-white'
              }`}>
                {report.returnRate > 0 ? '+' : ''}{report.returnRate?.toFixed(2)}%
              </span>
            </div>
            {/* 2행: 작성가 · 현재가 · 목표가 */}
            <div style={{ display: 'flex', borderTop: '1px solid var(--pixel-border-muted)' }}>
              <div style={{ flex: 1, padding: '10px 16px', borderRight: '1px solid var(--pixel-border-muted)' }}>
                <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">작성가</div>
                <div className="text-sm sm:text-base font-bold tabular-nums text-gray-800 dark:text-gray-100 mt-0.5">{report.initialPrice?.toLocaleString()}</div>
              </div>
              <div style={{ flex: 1, padding: '10px 16px', borderRight: '1px solid var(--pixel-border-muted)' }}>
                <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">현재가</div>
                <div className={`text-sm sm:text-base font-bold tabular-nums mt-0.5 ${
                  report.returnRate > 0 ? 'text-red-600 dark:text-red-500' :
                  report.returnRate < 0 ? 'text-blue-600 dark:text-blue-500' :
                  'text-gray-800 dark:text-gray-100'
                }`}>{report.currentPrice?.toLocaleString()}</div>
              </div>
              <div style={{ flex: 1, padding: '10px 16px' }}>
                <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">목표가</div>
                <div className="text-sm sm:text-base font-bold tabular-nums text-gray-800 dark:text-gray-100 mt-0.5">{report.targetPrice?.toLocaleString() || '-'}</div>
              </div>
            </div>
            {/* 3행: PER · PBR · EPS (코인이면 숨김) */}
            {report.stockData?.exchange !== 'CRYPTO' && (
              <div style={{ display: 'flex', borderTop: '1px solid var(--pixel-border-muted)' }} className="bg-gray-50/50 dark:bg-gray-800/30">
                <div style={{ flex: 1, padding: '10px 16px', borderRight: '1px solid var(--pixel-border-muted)' }}>
                  <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">PER</div>
                  <div className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100 mt-0.5">{report.stockData?.per?.toFixed(1) || '-'}</div>
                </div>
                <div style={{ flex: 1, padding: '10px 16px', borderRight: '1px solid var(--pixel-border-muted)' }}>
                  <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">PBR</div>
                  <div className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100 mt-0.5">{report.stockData?.pbr?.toFixed(2) || '-'}</div>
                </div>
                <div style={{ flex: 1, padding: '10px 16px' }}>
                  <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">EPS</div>
                  <div className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100 mt-0.5">{report.stockData?.eps?.toFixed(0) || '-'}</div>
                </div>
              </div>
            )}
          </Card>

          {/* 모바일용 액션 버튼 (lg 이하에서만 표시) */}
          <div className="lg:hidden flex flex-wrap gap-1.5 sm:gap-2">
            {/* 작성자 전용 버튼 */}
            {isAuthor && (
              <>
                {!isClosed && (
                  <button
                    onClick={handleClosePosition}
                    disabled={isClosing}
                    className="px-2.5 py-1.5 sm:px-3 sm:py-2 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] hover:border-[var(--pixel-accent)] font-pixel text-xs sm:text-sm transition-all disabled:opacity-50"
                  >
                    {isClosing ? '처리 중...' : '수익확정'}
                  </button>
                )}
                <button
                  onClick={handleEdit}
                  className="px-2.5 py-1.5 sm:px-3 sm:py-2 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] hover:border-[var(--pixel-accent)] font-pixel text-xs sm:text-sm transition-all"
                >
                  수정
                </button>
                <button
                  onClick={handleDelete}
                  className="px-2.5 py-1.5 sm:px-3 sm:py-2 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] hover:border-[var(--pixel-accent)] font-pixel text-xs sm:text-sm transition-all"
                >
                  삭제
                </button>
              </>
            )}
            {/* 일반 버튼 */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 font-pixel text-xs sm:text-sm transition-all ${
                isLiked
                  ? 'bg-red-500/10 text-[var(--pixel-accent)] border-2 border-[var(--pixel-accent)]'
                  : 'border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] hover:border-[var(--pixel-accent)] text-gray-600 dark:text-gray-400'
              }`}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 20 20">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              {likesCount}
            </button>
            <button
              onClick={() => {
                if (!user) { alert('로그인이 필요합니다.'); router.push('/login'); return; }
                toggleBookmark(report.id);
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 font-pixel text-xs sm:text-sm transition-all ${
                isBookmarked(report.id)
                  ? 'bg-yellow-500/10 text-yellow-600 border-2 border-yellow-500'
                  : 'border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] hover:border-[var(--pixel-accent)]'
              }`}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill={isBookmarked(report.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              북마크
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: report.title, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('링크가 복사되었습니다.');
                }
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] hover:border-[var(--pixel-accent)] font-pixel text-xs sm:text-sm transition-all"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              공유
            </button>
          </div>

          {/* Report Content - 넓고 여유롭게 */}
          <Card className="p-3 sm:p-6 lg:p-8">
            {/* 리포트 본문 */}
            <div
              className="article-content max-w-none"
              dangerouslySetInnerHTML={{
                __html: /<[a-z][\s\S]*>/i.test(report.content)
                  ? sanitizeHtml(report.content)
                    // Tiptap 빈 줄 보존: <p></p> → <p><br></p> (속성 있는 경우도 처리)
                    .replace(/<p([^>]*)><\/p>/g, '<p$1><br></p>')
                  : report.content.replace(/\n/g, '<br />')
              }}
            />
          </Card>

          {/* 첨부 파일 */}
          {report.files && report.files.length > 0 && (
            <Card className="p-3 sm:p-5">
              <h3 className="font-pixel text-sm font-bold mb-2 sm:mb-3">
                첨부 파일 {report.files.length}개
              </h3>
              <div className="space-y-2">
                {report.files.map((file, index) => {
                  const isNewFormat = typeof file === 'object' && file !== null;
                  const fileName = isNewFormat ? (file as { name: string; url: string }).name : (file as string);
                  const fileUrl = isNewFormat ? (file as { name: string; url: string }).url : null;
                  const ext = fileName.split('.').pop()?.toLowerCase() || '';

                  return (
                    <div key={index} className="flex items-center justify-between p-3 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg)]">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{fileName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{ext} 파일</p>
                        </div>
                      </div>
                      {fileUrl && (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 btn-primary !py-1.5 !px-3 font-pixel !text-xs flex-shrink-0"
                        >
                          다운로드
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Comments Section */}
          <Card className="p-3 sm:p-5">
            <h3 className="font-pixel text-sm font-bold mb-2 sm:mb-3">
              댓글 {commentCount}개
            </h3>

            {/* 댓글 목록 */}
            <div className="space-y-3 mb-4">
              {comments.length > 0 ? (
                <>
                  {/* 부모 댓글만 먼저 렌더링 */}
                  {comments.filter(c => !c.parentId).map((comment) => (
                    <div key={comment.id}>
                      {/* 부모 댓글 */}
                      <div className="p-3 sm:p-4 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg)]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">{comment.author}</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {new Date(comment.createdAt).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            {user && user.uid === comment.authorId && (
                              <button
                                onClick={async () => {
                                  if (deletingCommentId) return;
                                  if (!confirm('댓글을 삭제하시겠습니까?')) return;

                                  setDeletingCommentId(comment.id);
                                  try {
                                    const response = await fetch(`/api/reports/${report.id}/comments/${comment.id}`, {
                                      method: 'DELETE',
                                    });
                                    const data = await response.json();
                                    if (data.success) {
                                      setComments(comments.filter(c => c.id !== comment.id && c.parentId !== comment.id));
                                      setCommentCount(prev => prev - 1);
                                    } else {
                                      alert(data.error || '댓글 삭제에 실패했습니다.');
                                    }
                                  } catch (error) {
                                    console.error('댓글 삭제 실패:', error);
                                    alert('댓글 삭제 중 오류가 발생했습니다.');
                                  } finally {
                                    setDeletingCommentId(null);
                                  }
                                }}
                                disabled={deletingCommentId === comment.id}
                                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                              >
                                {deletingCommentId === comment.id ? '삭제 중...' : '삭제'}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">{comment.content}</p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={async () => {
                              if (!user) {
                                alert('로그인이 필요합니다.');
                                return;
                              }
                              try {
                                const response = await fetch(`/api/reports/${report.id}/comments/${comment.id}`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userId: user.uid }),
                                });
                                const data = await response.json();
                                if (data.success) {
                                  setComments(comments.map(c =>
                                    c.id === comment.id ? { ...c, likes: data.likes, isLiked: data.isLiked } : c
                                  ));
                                }
                              } catch (error) {
                                console.error('좋아요 실패:', error);
                              }
                            }}
                            className="flex items-center gap-1 text-xs sm:text-sm transition-colors"
                          >
                            <svg className="w-4 h-4" fill={comment.isLiked ? "#ef4444" : "none"} stroke={comment.isLiked ? "#ef4444" : "currentColor"} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span className={comment.isLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}>{comment.likes}</span>
                          </button>
                          <button
                            onClick={() => setReplyingTo({ id: comment.id, author: comment.author })}
                            className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                          >
                            답글
                          </button>
                        </div>

                        {/* 대댓글 입력 폼 */}
                        {replyingTo?.id === comment.id && (
                          <div className="mt-3 pl-4 border-l-2 border-red-500">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              @{replyingTo.author}에게 답글 작성 중
                              <button
                                onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                className="ml-2 text-red-500 hover:text-red-700"
                              >
                                취소
                              </button>
                            </div>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="답글을 작성하세요..."
                              rows={2}
                              className="pixel-input !text-sm"
                            />
                            <div className="flex justify-end mt-2">
                              <Button
                                size="sm"
                                disabled={!replyText.trim() || isSubmittingComment}
                                onClick={async () => {
                                  if (!replyText.trim() || !user) return;
                                  setIsSubmittingComment(true);
                                  try {
                                    const token = await auth.currentUser?.getIdToken();
                                    const response = await fetch(`/api/reports/${report.id}/comments`, {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`,
                                      },
                                      body: JSON.stringify({
                                        content: replyText,
                                        authorName: userNickname || '익명',
                                        parentId: comment.id,
                                      }),
                                    });
                                    const data = await response.json();
                                    if (data.success) {
                                      setComments([...comments, data.comment]);
                                      setCommentCount(prev => prev + 1);
                                      setReplyText('');
                                      setReplyingTo(null);
                                    }
                                  } catch (error) {
                                    console.error('답글 작성 실패:', error);
                                  } finally {
                                    setIsSubmittingComment(false);
                                  }
                                }}
                              >
                                답글 작성
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 대댓글 (자식 댓글) */}
                      {comments.filter(c => c.parentId === comment.id).map((reply) => (
                        <div key={reply.id} className="ml-3 sm:ml-6 mt-2 p-3 sm:p-4 bg-[var(--pixel-bg)] border-2 border-[var(--pixel-border-muted)] border-l-[3px] border-l-[var(--pixel-accent)]">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-pixel text-xs font-bold truncate">{reply.author}</div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(reply.createdAt).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                              {user && user.uid === reply.authorId && (
                                <button
                                  onClick={async () => {
                                    if (deletingCommentId) return;
                                    if (!confirm('답글을 삭제하시겠습니까?')) return;
                                    setDeletingCommentId(reply.id);
                                    try {
                                      const response = await fetch(`/api/reports/${report.id}/comments/${reply.id}`, {
                                        method: 'DELETE',
                                      });
                                      const data = await response.json();
                                      if (data.success) {
                                        setComments(comments.filter(c => c.id !== reply.id));
                                        setCommentCount(prev => prev - 1);
                                      }
                                    } catch (error) {
                                      console.error('답글 삭제 실패:', error);
                                    } finally {
                                      setDeletingCommentId(null);
                                    }
                                  }}
                                  disabled={deletingCommentId === reply.id}
                                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                                >
                                  {deletingCommentId === reply.id ? '삭제 중...' : '삭제'}
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">{reply.content}</p>
                          <button
                            onClick={async () => {
                              if (!user) {
                                alert('로그인이 필요합니다.');
                                return;
                              }
                              try {
                                const response = await fetch(`/api/reports/${report.id}/comments/${reply.id}`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userId: user.uid }),
                                });
                                const data = await response.json();
                                if (data.success) {
                                  setComments(comments.map(c =>
                                    c.id === reply.id ? { ...c, likes: data.likes, isLiked: data.isLiked } : c
                                  ));
                                }
                              } catch (error) {
                                console.error('좋아요 실패:', error);
                              }
                            }}
                            className="flex items-center gap-1 text-xs transition-colors"
                          >
                            <svg className="w-4 h-4" fill={reply.isLiked ? "#ef4444" : "none"} stroke={reply.isLiked ? "#ef4444" : "currentColor"} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span className={reply.isLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}>{reply.likes}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-4 text-sm text-gray-400 dark:text-gray-500">
                  댓글이 없습니다
                </div>
              )}
            </div>

            {/* 댓글 작성 */}
            <div className="pt-3 border-t-[3px] border-[var(--pixel-border-muted)]">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={user ? "댓글을 작성하세요..." : "로그인 후 댓글 작성이 가능합니다"}
                rows={2}
                disabled={!user || isSubmittingComment}
                className="pixel-input !text-sm resize-none"
              />
              <div className="flex justify-end mt-2">
                {user ? (
                  <Button
                    size="sm"
                    disabled={isSubmittingComment || !commentText.trim()}
                    onClick={async () => {
                      if (!commentText.trim() || isSubmittingComment) return;

                      setIsSubmittingComment(true);
                      try {
                        const token = await auth.currentUser?.getIdToken();
                        const response = await fetch(`/api/reports/${report.id}/comments`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            content: commentText,
                            authorName: userNickname || '익명',
                          }),
                        });

                        const data = await response.json();
                        if (data.success) {
                          setComments([data.comment, ...comments]);
                          setCommentCount(prev => prev + 1);
                          setCommentText('');
                        } else {
                          alert(data.error || '댓글 작성에 실패했습니다.');
                        }
                      } catch (error) {
                        console.error('댓글 작성 실패:', error);
                        alert('댓글 작성 중 오류가 발생했습니다.');
                      } finally {
                        setIsSubmittingComment(false);
                      }
                    }}
                  >
                    {isSubmittingComment ? '작성 중...' : '작성'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      alert('로그인이 필요한 서비스입니다.');
                      router.push('/login');
                    }}
                  >
                    로그인
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* 오른쪽: 사이드바 (고정 폭) - 데스크톱만 */}
        <div className="hidden lg:block lg:w-72 lg:flex-shrink-0">
          <div className="sticky top-20 space-y-4">
            {/* 작성자 전용 액션 */}
            {isAuthor && (
              <Card className="p-4">
                <div className="space-y-2">
                  {!isClosed && (
                    <button
                      onClick={handleClosePosition}
                      disabled={isClosing}
                      className="w-full font-pixel px-4 py-2.5 bg-emerald-600 text-white border-2 border-emerald-800 text-sm font-bold transition-all shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] disabled:opacity-50"
                    >
                      {isClosing ? '처리 중...' : '수익 확정하기'}
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleEdit}
                      className="flex-1 btn-secondary font-pixel !py-2 !text-sm"
                    >
                      수정
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 btn-danger font-pixel !py-2 !text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {/* 액션 버튼 */}
            <Card className="p-4">
              <div className="space-y-2">
                <button
                  onClick={handleLike}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 font-pixel text-sm font-bold transition-all ${
                    isLiked
                      ? 'border-2 pixel-chip-active'
                      : 'border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] hover:border-[var(--pixel-accent)] hover:text-[var(--pixel-accent)]'
                  }`}
                >
                  <svg className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} stroke={isLiked ? "none" : "currentColor"} viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                  <span>좋아요 {likesCount}</span>
                </button>
                <button
                  onClick={() => {
                    if (!user) { alert('로그인이 필요합니다.'); router.push('/login'); return; }
                    toggleBookmark(report.id);
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 font-pixel text-sm font-bold transition-all ${
                    isBookmarked(report.id)
                      ? 'border-2 border-yellow-500 bg-yellow-500/10 text-yellow-600'
                      : 'border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] hover:border-[var(--pixel-accent)] hover:text-[var(--pixel-accent)]'
                  }`}
                >
                  <svg className="w-5 h-5" fill={isBookmarked(report.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span>{isBookmarked(report.id) ? '북마크 해제' : '북마크'}</span>
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: report.title, url: window.location.href });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      alert('링크가 복사되었습니다.');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] hover:border-[var(--pixel-accent)] hover:text-[var(--pixel-accent)] font-pixel text-sm font-bold transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>공유하기</span>
                </button>
              </div>
            </Card>

            {/* 날짜 정보 */}
            <Card className="p-4">
              <div className="text-center">
                <div className="font-pixel text-xs text-gray-500 dark:text-gray-400 mb-1">작성일</div>
                <div className="font-pixel text-sm font-bold">{report.createdAt}</div>
              </div>

              {(() => {
                const filteredUpdates = report.updatedAt?.filter(date => date !== report.createdAt) || [];
                return filteredUpdates.length > 0 && (
                  <>
                    <div className="border-t-[3px] border-[var(--pixel-border-muted)] my-3"></div>
                    <div className="text-center">
                      <div className="font-pixel text-xs text-gray-500 dark:text-gray-400 mb-2">수정일</div>
                      <div className="space-y-1">
                        {filteredUpdates.map((date, index) => (
                          <div key={index} className="font-pixel text-xs font-bold">
                            {date}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="border-t-[3px] border-[var(--pixel-border-muted)] my-3"></div>
              <div className="text-center">
                <div className="font-pixel text-xs text-gray-500 dark:text-gray-400 mb-1">조회수</div>
                <div className="font-pixel text-sm font-bold">{report.views}</div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
