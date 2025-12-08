'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import StockSearchInput from '@/components/StockSearchInput';

type EditorMode = 'text' | 'html';
type Opinion = 'buy' | 'sell' | 'hold';
type PositionType = 'long' | 'short';

interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  currency: string;
  marketCap: number;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  exchange: string;
  industry?: string;
  sector?: string;
}

export default function WritePage() {
  const router = useRouter();
  const [mode, setMode] = useState<EditorMode>('text');
  const [title, setTitle] = useState('');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [opinion, setOpinion] = useState<Opinion>('buy');
  const [targetPrice, setTargetPrice] = useState('');
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  // 투자 의견에 따라 포지션 타입 자동 결정
  const positionType: PositionType = opinion === 'sell' ? 'short' : 'long';

  // 주식 선택 시
  const handleStockSelect = (data: StockData) => {
    setStockData(data);

    // 자동으로 제목 업데이트 (비어있을 경우만)
    if (!title) {
      setTitle(`${data.name} 투자 리포트`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    // 파일 크기 검증 (10MB)
    const validImages = imageFiles.filter(file => file.size <= 10 * 1024 * 1024);

    if (validImages.length !== imageFiles.length) {
      alert('일부 이미지가 10MB를 초과하여 제외되었습니다.');
    }

    setImages((prev) => [...prev, ...validImages]);
    e.target.value = ''; // input 초기화
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);

    // 파일 크기 검증 (50MB)
    const validFiles = uploadedFiles.filter(file => file.size <= 50 * 1024 * 1024);

    if (validFiles.length !== uploadedFiles.length) {
      alert('일부 파일이 50MB를 초과하여 제외되었습니다.');
    }

    setFiles((prev) => [...prev, ...validFiles]);
    e.target.value = ''; // input 초기화
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!stockData) {
      alert('종목을 선택해주세요.');
      return;
    }

    // 종목 프로필 데이터를 본문 앞에 자동으로 추가
    let finalContent = '';

    if (mode === 'text') {
      // 텍스트 모드: 마크다운 표 형식으로 프로필 생성
      const stockProfile = `## ${stockData.name} (${stockData.symbol}) 기업 개요\n\n` +
        `| 항목 | 값 |\n` +
        `|------|------|\n` +
        `| 현재 주가 | ${stockData.currency} ${stockData.currentPrice.toLocaleString()} |\n` +
        `| 시가총액 | ${(stockData.marketCap / 1e9).toFixed(2)}B ${stockData.currency} |\n` +
        (stockData.per ? `| PER | ${stockData.per.toFixed(2)} |\n` : '') +
        (stockData.pbr ? `| PBR | ${stockData.pbr.toFixed(2)} |\n` : '') +
        (stockData.eps ? `| EPS | ${stockData.eps.toFixed(2)} |\n` : '') +
        `| 거래소 | ${stockData.exchange} |\n` +
        (stockData.sector ? `| 섹터 | ${stockData.sector} |\n` : '') +
        (stockData.industry ? `| 산업 | ${stockData.industry} |\n` : '') +
        `\n---\n\n`;

      finalContent = stockProfile + content;
    } else {
      // HTML 모드: HTML 테이블로 프로필 생성
      const stockProfile = `<div class="stock-profile">
  <h2>${stockData.name} (${stockData.symbol}) 기업 개요</h2>
  <table class="profile-table">
    <tbody>
      <tr><th>현재 주가</th><td>${stockData.currency} ${stockData.currentPrice.toLocaleString()}</td></tr>
      <tr><th>시가총액</th><td>${(stockData.marketCap / 1e9).toFixed(2)}B ${stockData.currency}</td></tr>
      ${stockData.per ? `<tr><th>PER</th><td>${stockData.per.toFixed(2)}</td></tr>` : ''}
      ${stockData.pbr ? `<tr><th>PBR</th><td>${stockData.pbr.toFixed(2)}</td></tr>` : ''}
      ${stockData.eps ? `<tr><th>EPS</th><td>${stockData.eps.toFixed(2)}</td></tr>` : ''}
      <tr><th>거래소</th><td>${stockData.exchange}</td></tr>
      ${stockData.sector ? `<tr><th>섹터</th><td>${stockData.sector}</td></tr>` : ''}
      ${stockData.industry ? `<tr><th>산업</th><td>${stockData.industry}</td></tr>` : ''}
    </tbody>
  </table>
  <hr />
</div>\n\n`;

      finalContent = stockProfile + htmlContent;
    }

    // 새 리포트 객체 생성
    const newReport = {
      id: Date.now().toString(),
      title,
      author: '현재사용자', // TODO: 실제 로그인 사용자 정보로 대체
      stockName: stockData.name,
      ticker: stockData.symbol,
      opinion,
      targetPrice: parseFloat(targetPrice),
      content: finalContent, // 프로필 + 본문 합친 내용
      cssContent: mode === 'html' ? cssContent : '',
      mode,
      images: images.map((img) => img.name), // TODO: 실제로는 서버에 업로드 후 URL 저장
      files: files.map((file) => file.name), // TODO: 실제로는 서버에 업로드 후 URL 저장
      createdAt: new Date().toISOString().split('T')[0],
      initialPrice: stockData.currentPrice,
      currentPrice: stockData.currentPrice,
      positionType, // 포지션 타입 저장 (long/short)
      returnRate: 0,
      views: 0,
      likes: 0,
      stockData, // 전체 주식 데이터 저장
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

            {/* 종목 검색 (StockSearchInput 컴포넌트 사용) */}
            <StockSearchInput
              onStockSelect={handleStockSelect}
              selectedStock={stockData}
            />

            {/* 종목 프로필 카드 */}
            <div className="mt-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20
                          border-2 border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                종목 프로필
              </h3>

              {stockData ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">현재 주가</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {stockData.currency} {stockData.currentPrice.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">시가총액</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {(stockData.marketCap / 1e9).toFixed(2)}B
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">PER</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {stockData.per ? stockData.per.toFixed(2) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">PBR</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {stockData.pbr ? stockData.pbr.toFixed(2) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">EPS</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {stockData.eps ? stockData.eps.toFixed(2) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">거래소</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {stockData.exchange}
                    </div>
                  </div>
                  {stockData.sector && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">섹터</div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {stockData.sector}
                      </div>
                    </div>
                  )}
                  {stockData.industry && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">산업</div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {stockData.industry}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">현재 주가</div>
                    <div className="text-xl font-bold text-gray-300 dark:text-gray-600">-</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">시가총액</div>
                    <div className="text-xl font-bold text-gray-300 dark:text-gray-600">-</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">PER</div>
                    <div className="text-xl font-bold text-gray-300 dark:text-gray-600">-</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">PBR</div>
                    <div className="text-xl font-bold text-gray-300 dark:text-gray-600">-</div>
                  </div>
                </div>
              )}

              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800/50 p-3 rounded border border-blue-200 dark:border-blue-800">
                이 프로필 데이터는 리포트 제출 시 자동으로 본문 상단에 표시됩니다.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  투자 의견 *
                </label>
                <select
                  value={opinion}
                  onChange={(e) => setOpinion(e.target.value as Opinion)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="buy">매수 (롱 포지션 - 상승 예상)</option>
                  <option value="sell">매도 (숏 포지션 - 하락 예상)</option>
                  <option value="hold">보유</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {opinion === 'buy' && '매수: 가격 상승 시 수익률 증가'}
                  {opinion === 'sell' && '매도: 가격 하락 시 수익률 증가'}
                  {opinion === 'hold' && '보유: 현재 포지션 유지'}
                </p>
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
                placeholder="리포트 본문을 입력하세요... (종목 프로필은 자동으로 상단에 추가됩니다)"
              />
            </div>
          )}

          {/* 이미지 첨부 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              이미지 첨부
            </label>
            <div className="space-y-3">
              <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-gray-50 dark:bg-gray-700/50">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">클릭하여 업로드</span> 또는 드래그 앤 드롭
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">PNG, JPG, GIF (최대 10MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                />
              </label>

              {/* 업로드된 이미지 미리보기 */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="w-full h-32 relative rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                        <Image
                          src={URL.createObjectURL(image)}
                          alt={`preview-${index}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate">
                        {image.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 파일 첨부 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              파일 첨부
            </label>
            <div className="space-y-3">
              <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-gray-50 dark:bg-gray-700/50">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">클릭하여 업로드</span> 또는 드래그 앤 드롭
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">PDF, XLSX, DOCX, TXT 등 (최대 50MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileUpload}
                />
              </label>

              {/* 업로드된 파일 목록 */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <svg className="w-8 h-8 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="ml-3 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
                  placeholder="<div>HTML 본문을 입력하세요... (종목 프로필은 자동으로 상단에 추가됩니다)</div>"
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
