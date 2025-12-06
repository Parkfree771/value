'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type EditorMode = 'text' | 'html';
type Opinion = 'buy' | 'sell' | 'hold';

export default function WritePage() {
  const router = useRouter();
  const [mode, setMode] = useState<EditorMode>('text');
  const [title, setTitle] = useState('');
  const [stockName, setStockName] = useState('');
  const [ticker, setTicker] = useState('');
  const [opinion, setOpinion] = useState<Opinion>('buy');
  const [targetPrice, setTargetPrice] = useState('');
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 새 리포트 객체 생성
    const newReport = {
      id: Date.now().toString(),
      title,
      author: '현재사용자', // TODO: 실제 로그인 사용자 정보로 대체
      stockName,
      ticker,
      opinion,
      targetPrice: parseFloat(targetPrice),
      content: mode === 'text' ? content : htmlContent,
      cssContent: mode === 'html' ? cssContent : '',
      mode,
      createdAt: new Date().toISOString().split('T')[0],
      initialPrice: 0, // TODO: API에서 현재 가격 가져오기
      currentPrice: 0,
      returnRate: 0,
      views: 0,
      likes: 0,
    };

    // localStorage에 저장 (실제로는 API 호출)
    const existingReports = JSON.parse(localStorage.getItem('userReports') || '[]');
    existingReports.push(newReport);
    localStorage.setItem('userReports', JSON.stringify(existingReports));

    alert('리포트가 성공적으로 작성되었습니다!');
    router.push('/');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          투자 리포트 작성
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="리포트 제목을 입력하세요"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  종목명
                </label>
                <input
                  type="text"
                  value={stockName}
                  onChange={(e) => setStockName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="예: 삼성전자"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  티커
                </label>
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="예: 005930"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  투자 의견
                </label>
                <select
                  value={opinion}
                  onChange={(e) => setOpinion(e.target.value as Opinion)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="buy">매수</option>
                  <option value="hold">보유</option>
                  <option value="sell">매도</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  목표 가격
                </label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="예: 85000"
                />
              </div>
            </div>
          </div>

          {/* 에디터 모드 선택 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              작성 모드
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  mode === 'text'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                텍스트 모드
              </button>
              <button
                type="button"
                onClick={() => setMode('html')}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  mode === 'html'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                HTML/CSS 모드
              </button>
            </div>
          </div>

          {/* 텍스트 모드 에디터 */}
          {mode === 'text' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                내용
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={15}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                placeholder="리포트 내용을 입력하세요..."
              />
            </div>
          )}

          {/* HTML/CSS 모드 에디터 */}
          {mode === 'html' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  HTML
                </label>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  required
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  placeholder="<div>HTML 코드를 입력하세요...</div>"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  CSS (선택사항)
                </label>
                <textarea
                  value={cssContent}
                  onChange={(e) => setCssContent(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  placeholder=".custom-class { color: blue; }"
                />
              </div>

              {/* 미리보기 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  미리보기
                </label>
                <div className="w-full min-h-[200px] px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900">
                  <style>{cssContent}</style>
                  <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                </div>
              </div>
            </div>
          )}

          {/* 제출 버튼 */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              작성 완료
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
