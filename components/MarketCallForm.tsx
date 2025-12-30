'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import StockSearchInput from '@/components/StockSearchInput';
import { uploadMultipleImages } from '@/utils/imageOptimization';
import { sanitizeHtml, extractStyleTag } from '@/utils/sanitizeHtml';
import { BadgeLabel, BadgeIntensity, ActionDirection } from '@/app/guru-tracker/types';

type EditorMode = 'text' | 'html';

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

interface WordWatchFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  initialData?: any; // 수정 모드일 때 초기 데이터
  isEditMode?: boolean; // 수정 모드 여부
}

export default function WordWatchForm({ onSubmit, onCancel, initialData, isEditMode = false }: WordWatchFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<EditorMode>(initialData?.mode || 'text');
  const [title, setTitle] = useState(initialData?.title || '');
  const [stockData, setStockData] = useState<StockData | null>(initialData?.stockData || null);
  const [content, setContent] = useState(initialData?.mode === 'text' ? (initialData?.content_html || '') : '');
  const [htmlContent, setHtmlContent] = useState(initialData?.mode === 'html' ? (initialData?.content_html || '') : '');
  const [images, setImages] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>(initialData?.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 마켓콜 전용 필드
  const [guruName, setGuruName] = useState(initialData?.guru_name || '');
  const [guruPosition, setGuruPosition] = useState(initialData?.guru_name_kr || '');
  const [opinion, setOpinion] = useState<'buy' | 'sell'>(
    initialData?.badge_info?.label === 'SELL' ? 'sell' : 'buy'
  );
  const [sourceUrl, setSourceUrl] = useState(initialData?.source_url || '');
  const [baseDate, setBaseDate] = useState(initialData?.event_date || ''); // 기준 날짜 (사용자 입력)
  const [basePrice, setBasePrice] = useState(initialData?.base_price?.toString() || ''); // 기준 가격 (사용자 입력)

  // HTML 모드 미리보기
  const previewContent = useMemo(() => {
    if (mode === 'html' && htmlContent) {
      return extractStyleTag(htmlContent);
    }
    return { css: '', html: '' };
  }, [mode, htmlContent]);

  // 주식 선택 시
  const handleStockSelect = (data: StockData) => {
    setStockData(data);
    if (!title) {
      setTitle(`${data.name} - 분석가 의견`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    const validImages = imageFiles.filter(file => file.size <= 10 * 1024 * 1024);

    if (validImages.length !== imageFiles.length) {
      alert('일부 이미지가 10MB를 초과하여 제외되었습니다.');
    }

    if (validImages.length === 0) return;

    setIsUploading(true);
    try {
      const urls = await uploadMultipleImages(
        validImages,
        `word-watch/${Date.now()}`,
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

    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setUploadedImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const insertImageToEditor = (url: string) => {
    if (mode === 'text') {
      const imgMarkdown = `![이미지](${url})`;
      setContent((prev: string) => prev + '\n' + imgMarkdown);
    } else if (mode === 'html') {
      const imgTag = `<img src="${url}" alt="이미지" style="max-width: 100%; height: auto;" />`;
      navigator.clipboard.writeText(imgTag);
      alert('HTML 코드가 복사되었습니다!\n\nHTML 편집기에 붙여넣기(Ctrl+V) 하세요.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stockData) {
      alert('종목을 선택해주세요.');
      return;
    }

    if (!baseDate) {
      alert('기준 날짜를 입력해주세요.');
      return;
    }

    if (!basePrice || parseFloat(basePrice) <= 0) {
      alert('유효한 기준 가격을 입력해주세요.');
      return;
    }

    if (isUploading) {
      alert('이미지 업로드 중입니다. 잠시만 기다려주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalContent = mode === 'html' ? htmlContent : content;

      // 2-3줄 요약 생성 (본문 앞부분에서 추출)
      const summary = finalContent.replace(/<[^>]*>/g, '').substring(0, 150) + '...';

      // 투자 의견에 따라 배지 자동 설정
      const actionDirection: ActionDirection = opinion === 'sell' ? 'SHORT' : 'LONG';
      const badgeLabel: BadgeLabel = opinion === 'sell' ? 'SELL' : 'BUY';

      const marketCallData = {
        guru_name: guruName,
        guru_name_kr: guruPosition,
        data_type: 'MENTION',
        event_date: baseDate, // 사용자가 입력한 기준 날짜
        target_ticker: stockData.symbol,
        company_name: stockData.name,
        exchange: stockData.exchange,
        source_url: sourceUrl,
        badge_info: {
          label: badgeLabel,
          intensity: 'HIGH' as BadgeIntensity,
        },
        title,
        summary,
        content_html: finalContent,
        tracking_data: {
          base_price_date: baseDate, // 사용자가 입력한 기준 날짜
          action_direction: actionDirection,
        },
        base_price: parseFloat(basePrice), // 사용자가 입력한 기준 가격
        current_price: parseFloat(basePrice), // 초기값은 기준 가격과 동일
        return_rate: 0,
        views: 0,
        likes: 0,
        images: uploadedImageUrls,
        mode,
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
      };

      await onSubmit(marketCallData);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 제목 */}
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
          placeholder="나이키(NKE): 브랜드 고전 딛고 향후 2년 강력한 성장 전망"
        />
      </div>

      {/* 종목 및 의견 정보 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          종목 정보
        </h3>

        {/* 종목 검색 */}
        <StockSearchInput
          onStockSelect={handleStockSelect}
          selectedStock={stockData}
        />

        {/* 종목 프로필 카드 */}
        <div className="mt-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
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
            종목을 검색하면 현재 주가와 기업 프로필이 자동으로 표시되며, 이 가격을 기준으로 실시간 수익률이 계산됩니다.
          </div>
        </div>

        {/* 투자 의견 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            투자 의견
          </label>
          <select
            value={opinion}
            onChange={(e) => setOpinion(e.target.value as 'buy' | 'sell')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="buy">매수 (상승 예상)</option>
            <option value="sell">매도 (하락 예상)</option>
          </select>
        </div>

        {/* 기준 날짜 & 기준 가격 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              기준 날짜 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={baseDate}
              onChange={(e) => setBaseDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              발언/예측 시점의 날짜를 선택하세요
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              기준 가격 {stockData && `(${stockData.currency})`} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="150.00"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              기준 날짜 당시의 주가를 입력하세요
            </p>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex gap-2">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong className="font-semibold">마켓콜 추적 안내:</strong> 기준 날짜와 기준 가격을 기준으로 현재 시점까지의 수익률을 자동 계산합니다.
              예) 2025년 9월 30일에 "테슬라 매수" 의견을 냈다면, 기준 날짜를 2025-09-30으로, 기준 가격을 당시 테슬라 종가로 입력하세요.
            </div>
          </div>
        </div>
      </div>

      {/* 발언 인물 정보 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          발언 인물 정보
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              이름 (영문)
            </label>
            <input
              type="text"
              value={guruName}
              onChange={(e) => setGuruName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="David Swartz"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              소속 / 직함 (영문)
            </label>
            <input
              type="text"
              value={guruPosition}
              onChange={(e) => setGuruPosition(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Senior Equity Analyst, Morningstar"
            />
          </div>
        </div>
      </div>

      {/* 원문 링크 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          원문 링크 (선택사항)
        </label>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="https://finance.yahoo.com/..."
        />
      </div>

      {/* 내용 작성 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          내용 작성
        </h3>

        {/* 에디터 모드 선택 */}
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
            텍스트
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
            HTML/CSS
          </button>
        </div>

        {/* 텍스트 모드 에디터 */}
        {mode === 'text' && (
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={20}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm whitespace-pre-wrap"
              placeholder="발언 내용을 입력하세요..."
            />
          </div>
        )}

        {/* HTML/CSS 모드 에디터 */}
        {mode === 'html' && (
          <div className="space-y-4">
            <div>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                required
                rows={15}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                placeholder="<h3>제목</h3>
<p>내용...</p>"
              />
            </div>

            {/* 미리보기 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                미리보기
              </label>
              <div className="w-full min-h-[200px] px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
                {previewContent.css && <style>{previewContent.css}</style>}
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewContent.html) }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 이미지 첨부 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          이미지 첨부 (선택사항)
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
                              {mode === 'text' ? '본문에 삽입' : 'HTML 코드 복사'}
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
            </div>
          )}
        </div>
      </div>


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
          disabled={isSubmitting || isUploading}
          className={`flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-semibold transition-colors ${
            isSubmitting || isUploading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:from-cyan-700 hover:to-blue-700'
          }`}
        >
          {isSubmitting ? (isEditMode ? '수정 중...' : '작성 중...') : (isEditMode ? '수정 완료' : '작성 완료')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting || isUploading}
          className={`px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition-colors ${
            isSubmitting || isUploading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          취소
        </button>
      </div>
    </form>
  );
}
