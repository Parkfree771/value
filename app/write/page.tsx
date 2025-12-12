'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import StockSearchInput from '@/components/StockSearchInput';
import { uploadMultipleImages } from '@/utils/imageOptimization';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

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
  const { user } = useAuth();
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    if (!stockData) {
      alert('종목을 선택해주세요.');
      return;
    }

    if (isUploading) {
      alert('이미지 업로드 중입니다. 잠시만 기다려주세요.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let imageUrls: string[] = [];

      if (images.length > 0) {
        imageUrls = await uploadMultipleImages(
          images,
          `reports/${Date.now()}`,
          { maxWidth: 1920, maxHeight: 1920, quality: 0.85, maxSizeMB: 2 },
          (progress) => setUploadProgress(progress)
        );
      }

    // 사용자가 작성한 내용만 저장 (기업 프로필은 상세 페이지 상단에 표시됨)
    const finalContent = mode === 'html' ? htmlContent : content;

      // 사용자 프로필에서 닉네임 가져오기
      let authorName = '익명';
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          authorName = userDocSnap.data().nickname || user.displayName || user.email || '익명';
        } else {
          authorName = user.displayName || user.email || '익명';
        }
      } catch (error) {
        console.error('사용자 프로필 가져오기 실패:', error);
        authorName = user.displayName || user.email || '익명';
      }

      // Firebase Firestore에 저장할 리포트 데이터
      const reportData = {
        title,
        authorId: user.uid,
        authorName: authorName,
        authorEmail: user.email,
        stockName: stockData.name,
        ticker: stockData.symbol,
        opinion,
        targetPrice: parseFloat(targetPrice),
        content: finalContent,
        cssContent: mode === 'html' ? cssContent : '',
        mode,
        images: imageUrls,
        files: files.map((file) => file.name),
        initialPrice: stockData.currentPrice,
        currentPrice: stockData.currentPrice,
        positionType,
        returnRate: 0,
        views: 0,
        likes: 0,
        likedBy: [],
        stockData: {
          symbol: stockData.symbol,
          name: stockData.name,
          currentPrice: stockData.currentPrice,
          currency: stockData.currency,
          marketCap: stockData.marketCap,
          per: stockData.per,
          pbr: stockData.pbr,
          eps: stockData.eps,
          exchange: stockData.exchange,
          industry: stockData.industry,
          sector: stockData.sector,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Firestore posts 컬렉션에 저장
      const docRef = await addDoc(collection(db, 'posts'), reportData);

      console.log('리포트가 저장되었습니다. ID:', docRef.id);

      alert('리포트가 성공적으로 작성되었습니다!');
      router.push('/');
    } catch (error) {
      console.error('리포트 작성 실패:', error);
      alert('리포트 작성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                이 프로필 데이터는 리포트 상세 페이지 상단에 자동으로 표시됩니다.
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                placeholder="리포트 본문을 입력하세요..."
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="<div>HTML 본문을 입력하세요...</div>"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
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

          {/* 업로드 진행 상태 */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>이미지 업로드 중...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* 제출 버튼 */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isUploading}
              className={`flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold transition-colors ${
                isUploading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-blue-700'
              }`}
            >
              {isUploading ? '업로드 중...' : '작성 완료'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              disabled={isUploading}
              className={`px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition-colors ${
                isUploading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
