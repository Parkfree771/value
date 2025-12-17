'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import StockSearchInput from '@/components/StockSearchInput';
import { uploadMultipleImages } from '@/utils/imageOptimization';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { sanitizeHtml, extractStyleTag } from '@/utils/sanitizeHtml';
import { getMarketCategory, CATEGORY_LABELS } from '@/utils/categoryMapping';
import type { MarketCategory } from '@/types/report';

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
  const searchParams = useSearchParams();
  const editId = searchParams.get('id'); // URL에서 수정할 리포트 ID 가져오기
  const { user } = useAuth();

  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<EditorMode>('text');
  const [title, setTitle] = useState('');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [opinion, setOpinion] = useState<Opinion>('buy');
  const [targetPrice, setTargetPrice] = useState('');
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 투자 의견에 따라 포지션 타입 자동 결정
  const positionType: PositionType = opinion === 'sell' ? 'short' : 'long';

  // HTML 모드 미리보기를 위한 CSS/HTML 추출
  const previewContent = useMemo(() => {
    if (mode === 'html' && htmlContent) {
      return extractStyleTag(htmlContent);
    }
    return { css: '', html: '' };
  }, [mode, htmlContent]);

  // 수정 모드: 기존 리포트 데이터 불러오기
  useEffect(() => {
    const loadReport = async () => {
      if (!editId || !user) return;

      setIsLoading(true);
      try {
        const reportDoc = await getDoc(doc(db, 'posts', editId));

        if (!reportDoc.exists()) {
          alert('리포트를 찾을 수 없습니다.');
          router.push('/');
          return;
        }

        const reportData = reportDoc.data();

        // 작성자 확인
        if (reportData.authorId !== user.uid) {
          alert('수정 권한이 없습니다.');
          router.push('/');
          return;
        }

        // 폼에 데이터 채우기
        setIsEditMode(true);
        setTitle(reportData.title || '');
        setStockData(reportData.stockData || null);
        setOpinion(reportData.opinion || 'buy');
        setTargetPrice(reportData.targetPrice?.toString() || '');
        setMode(reportData.mode || 'text');

        if (reportData.mode === 'html') {
          setHtmlContent(reportData.content || '');
        } else {
          setContent(reportData.content || '');
        }

        // 기존 이미지 URL 설정
        if (reportData.images && reportData.images.length > 0) {
          setUploadedImageUrls(reportData.images);
        }

      } catch (error) {
        console.error('리포트 불러오기 실패:', error);
        alert('리포트를 불러오는 중 오류가 발생했습니다.');
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, [editId, user, router]);

  // 주식 선택 시
  const handleStockSelect = (data: StockData) => {
    setStockData(data);

    // 자동으로 제목 업데이트 (비어있을 경우만)
    if (!title) {
      setTitle(`${data.name} 투자 리포트`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    // 파일 크기 검증 (10MB)
    const validImages = imageFiles.filter(file => file.size <= 10 * 1024 * 1024);

    if (validImages.length !== imageFiles.length) {
      alert('일부 이미지가 10MB를 초과하여 제외되었습니다.');
    }

    if (validImages.length === 0) return;

    // 즉시 Firebase에 업로드
    setIsUploading(true);
    try {
      const urls = await uploadMultipleImages(
        validImages,
        `reports/${Date.now()}`,
        { maxWidth: 1920, maxHeight: 1920, quality: 0.85, maxSizeMB: 2 },
        (progress) => setUploadProgress(progress)
      );

      setImages((prev) => [...prev, ...validImages]);
      setUploadedImageUrls((prev) => [...prev, ...urls]);
      alert(`${validImages.length}개 이미지 업로드 완료!`);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }

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
    setUploadedImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const insertImageToEditor = (url: string) => {
    if (mode === 'text') {
      // 텍스트 모드에서는 textarea에 이미지 URL 삽입
      const imgMarkdown = `![이미지](${url})`;
      setContent(prev => prev + '\n' + imgMarkdown);
    } else if (mode === 'html') {
      // HTML 모드에서는 HTML 코드 복사
      const imgTag = `<img src="${url}" alt="이미지" style="max-width: 100%; height: auto;" />`;
      navigator.clipboard.writeText(imgTag);
      alert('HTML 코드가 복사되었습니다!\n\nHTML 편집기에 붙여넣기(Ctrl+V) 하세요.');
    }
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
      // 이미 업로드된 이미지 URL 사용
      const imageUrls = uploadedImageUrls;

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

      // 거래소 정보 기반으로 카테고리 자동 설정
      const category = getMarketCategory(stockData.exchange, stockData.symbol);

      // Firebase Firestore에 저장할 리포트 데이터
      const reportData = {
        title,
        authorId: user.uid,
        authorName: authorName,
        authorEmail: user.email,
        stockName: stockData.name,
        ticker: stockData.symbol,
        category, // 자동 설정된 카테고리
        opinion,
        targetPrice: parseFloat(targetPrice),
        content: finalContent,
        cssContent: '', // HTML 모드에서는 <style> 태그가 HTML에 포함되므로 별도 CSS 필드는 비움
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
      };

      if (isEditMode && editId) {
        // 수정 모드: 기존 리포트 업데이트

        // 오늘 날짜 (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];

        // 기존 updatedAt 배열 가져오기
        const reportRef = doc(db, 'posts', editId);
        const reportSnap = await getDoc(reportRef);
        const existingUpdatedAt = reportSnap.exists() ? (reportSnap.data().updatedAt || []) : [];

        // 오늘 날짜가 배열에 없으면 추가
        const updatedAtArray = Array.isArray(existingUpdatedAt) ? [...existingUpdatedAt] : [];
        if (!updatedAtArray.includes(today)) {
          updatedAtArray.push(today);
        }

        await updateDoc(reportRef, {
          ...reportData,
          updatedAt: updatedAtArray,
        });

        console.log('리포트가 수정되었습니다. ID:', editId);
        alert('리포트가 성공적으로 수정되었습니다!');
        router.push(`/reports/${editId}`);
      } else {
        // 새 글 작성 모드: 새 리포트 생성
        const docRef = await addDoc(collection(db, 'posts'), reportData);

        console.log('리포트가 저장되었습니다. ID:', docRef.id);
        alert('리포트가 성공적으로 작성되었습니다!');
        router.push('/');
      }
    } catch (error) {
      console.error('리포트 작성 실패:', error);
      alert('리포트 작성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">리포트를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          {isEditMode ? '투자 리포트 수정' : '투자 리포트 작성'}
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
                rows={20}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm whitespace-pre-wrap"
                placeholder="리포트 본문을 입력하세요...&#10;&#10;줄바꿈과 띄어쓰기가 그대로 유지됩니다."
                style={{ fontFamily: 'inherit' }}
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                작성한 텍스트가 줄바꿈과 띄어쓰기를 포함하여 그대로 표시됩니다.
              </p>
            </div>
          )}

          {/* 이미지 첨부 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              이미지 첨부
            </label>
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">이미지 선택</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">(PNG, JPG, GIF - 최대 10MB)</span>
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
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800">
                        <div className="flex gap-3">
                          <div className="w-20 h-20 relative rounded border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0">
                            <Image
                              src={uploadedImageUrls[index] || URL.createObjectURL(image)}
                              alt={`preview-${index}`}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {image.name}
                            </div>
                            {uploadedImageUrls[index] ? (
                              <>
                                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  업로드 완료
                                </div>
                                <button
                                  type="button"
                                  onClick={() => insertImageToEditor(uploadedImageUrls[index])}
                                  className="mt-2 text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                  {mode === 'text' ? '이미지 URL 복사' : 'HTML 코드 복사'}
                                </button>
                              </>
                            ) : (
                              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                업로드 중...
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {uploadedImageUrls.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>사용법:</strong> {mode === 'text' ? '각 이미지의 "이미지 URL 복사" 버튼을 클릭하면 이미지 URL이 본문에 추가됩니다. ![이미지](URL) 형식으로 표시됩니다.' : '각 이미지의 "HTML 코드 복사" 버튼을 클릭한 후 HTML 편집기에 붙여넣기(Ctrl+V) 하세요.'}
                      </p>
                    </div>
                  )}
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
              <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">파일 선택</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">(PDF, XLSX, DOCX 등 - 최대 50MB)</span>
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
                  HTML 코드 (&lt;style&gt; 태그 포함 가능)
                </label>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  required
                  rows={15}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="<style>
  .wrap { max-width: 720px; margin: 0 auto; }
  .title { font-size: 24px; font-weight: bold; }
</style>

<div class='wrap'>
  <h1 class='title'>제목</h1>
  <p>내용...</p>
</div>"
                />
                <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <p><strong>&lt;style&gt; 태그:</strong> HTML 코드 안에 &lt;style&gt;...&lt;/style&gt; 형태로 CSS를 포함할 수 있습니다</p>
                  <p><strong>이미지:</strong> 위의 "HTML 코드 복사" 버튼으로 이미지 태그를 복사하여 붙여넣기 하세요</p>
                  <p><strong>인라인 스타일:</strong> HTML 태그에 style="..." 속성도 사용 가능합니다</p>
                </div>
              </div>

              {/* 미리보기 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  미리보기
                </label>
                <div className="w-full min-h-[200px] px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
                  {/* 추출된 CSS를 별도로 렌더링 */}
                  {previewContent.css && <style>{previewContent.css}</style>}
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewContent.html) }} />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  보안을 위해 일부 위험한 태그나 스크립트는 자동으로 제거됩니다
                </p>
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
              {isUploading ? '업로드 중...' : (isEditMode ? '수정 완료' : '작성 완료')}
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
