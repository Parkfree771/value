'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import StockSearchInput from '@/components/StockSearchInput';
import { uploadMultipleImages } from '@/utils/imageOptimization';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getMarketCategory, CATEGORY_LABELS } from '@/utils/categoryMapping';
import type { MarketCategory } from '@/types/report';
import type { StockData } from '@/types/stock';
import { getCryptoImageUrl } from '@/lib/cryptoCoins';
import { loadThemes, getThemesForSymbol } from '@/lib/themeStocks';
import type { Theme } from '@/types/theme';
import dynamic from 'next/dynamic';
import type { Editor } from '@tiptap/react';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });
const HtmlCodeEditor = dynamic(() => import('@/components/HtmlCodeEditor'), { ssr: false });
const HtmlPreviewPanel = dynamic(() => import('@/components/HtmlCodeEditor').then(m => ({ default: m.HtmlPreviewPanel })), { ssr: false });

type Opinion = 'buy' | 'sell' | 'hold';
type PositionType = 'long' | 'short';

function WritePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id'); // URL에서 수정할 리포트 ID 가져오기
  const { user } = useAuth();

  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [opinion, setOpinion] = useState<Opinion>('buy');
  const [targetPrice, setTargetPrice] = useState('');
  const [content, setContent] = useState('');
  const [editorMode, setEditorMode] = useState<'text' | 'html'>('text');
  const [htmlContent, setHtmlContent] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewCss, setPreviewCss] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [originalInitialPrice, setOriginalInitialPrice] = useState<number | null>(null);
  const [tiptapEditor, setTiptapEditor] = useState<Editor | null>(null);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [allThemes, setAllThemes] = useState<Theme[]>([]);
  // 투자 의견에 따라 포지션 타입 자동 결정
  const positionType: PositionType = opinion === 'sell' ? 'short' : 'long';

  // 테마 데이터 로드
  useEffect(() => {
    loadThemes().then(setAllThemes).catch(console.error);
  }, []);

  // 종목 선택 시 관련 테마 자동 추천
  useEffect(() => {
    if (!stockData || allThemes.length === 0 || isEditMode) return;
    const autoThemes = getThemesForSymbol(allThemes, stockData.symbol);
    if (autoThemes.length > 0) {
      setSelectedThemes(autoThemes.map(t => t.id));
    }
  }, [stockData, allThemes, isEditMode]);

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
        setTargetPrice(reportData.targetPrice ? Number(reportData.targetPrice).toLocaleString() : '');
        if (reportData.mode === 'html') {
          setEditorMode('html');
          setHtmlContent(reportData.content || '');
        } else {
          setContent(reportData.content || '');
        }
        setOriginalInitialPrice(reportData.initialPrice || null);
        setSelectedThemes(reportData.themes || []);

        // 기존 이미지 URL 설정
        if (reportData.images && reportData.images.length > 0) {
          setUploadedImageUrls(reportData.images);
        }

        // 기존 파일 데이터 설정
        if (reportData.files && reportData.files.length > 0) {
          // 새 형식 {name, url} 또는 구 형식 string[]
          if (typeof reportData.files[0] === 'object') {
            setUploadedFiles(reportData.files);
          }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    // PDF만 허용
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    if (pdfFiles.length !== selectedFiles.length) {
      alert('PDF 파일만 업로드 가능합니다.');
    }

    // 파일 크기 검증 (20MB)
    const validFiles = pdfFiles.filter(file => file.size <= 20 * 1024 * 1024);

    if (validFiles.length !== pdfFiles.length) {
      alert('일부 파일이 20MB를 초과하여 제외되었습니다.');
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const newUploaded: { name: string; url: string }[] = [];
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
        const storageRef = ref(storage, `reports/files/${fileName}`);
        await uploadBytes(storageRef, file, {
          contentType: file.type,
          customMetadata: { originalName: file.name },
        });
        const url = await getDownloadURL(storageRef);
        newUploaded.push({ name: file.name, url });
        setUploadProgress(((i + 1) / validFiles.length) * 100);
      }
      setFiles((prev) => [...prev, ...validFiles]);
      setUploadedFiles((prev) => [...prev, ...newUploaded]);
      alert(`${validFiles.length}개 파일 업로드 완료!`);
    } catch (error) {
      console.error('파일 업로드 실패:', error);
      alert('파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }

    e.target.value = ''; // input 초기화
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setUploadedImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const insertImageToEditor = (url: string) => {
    if (tiptapEditor) {
      (tiptapEditor.chain().focus() as any).setImage({ src: url, alt: '이미지' }).run();
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 리포트 삭제
  const handleDelete = async () => {
    if (!editId || !user) return;
    if (!confirm('정말로 이 리포트를 삭제하시겠습니까?\n\n삭제된 리포트는 복구할 수 없습니다.')) return;

    try {
      const token = await (await import('@/lib/firebase')).auth.currentUser?.getIdToken();
      const response = await fetch(`/api/reports/${editId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert('리포트가 삭제되었습니다.');
        router.push('/');
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
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
    const finalContent = content;

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
      // 필드 순서: 제목 → 티커 → 거래소 → 초기가격 → 작성자 → 나머지
      const reportData = {
        // 1. 제목
        title,

        // 2. 티커 & 거래소
        ticker: stockData.symbol,
        exchange: stockData.exchange, // 거래소 (NAS, NYS, KRX 등)

        // 3. 초기 가격 (작성 시점)
        initialPrice: stockData.currentPrice,
        currentPrice: stockData.currentPrice, // 크론이 업데이트
        lastPriceUpdate: serverTimestamp(), // 마지막 가격 업데이트 시간

        // 4. 작성자 정보
        authorId: user.uid,
        authorName: authorName,
        authorEmail: user.email,

        // 5. 종목 정보
        stockName: stockData.name,
        category, // 자동 설정된 카테고리
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

        // 6. 투자 의견
        opinion,
        positionType,
        targetPrice: parseFloat(targetPrice.replace(/,/g, '')) || 0,
        themes: selectedThemes.length > 0 ? selectedThemes : [],

        // 7. 콘텐츠
        content: editorMode === 'html' ? htmlContent : finalContent,
        mode: editorMode,
        images: imageUrls,
        files: uploadedFiles,

        // 8. 통계 (현재가/수익률은 실시간 조회)
        views: 0,
        likes: 0,
        likedBy: [],

        // 9. 타임스탬프
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

        // 수정 시 initialPrice, currentPrice, views, likes, createdAt 유지
        const { initialPrice, currentPrice, lastPriceUpdate, views, likes, likedBy, createdAt, ...editableData } = reportData;

        await updateDoc(reportRef, {
          ...editableData,
          updatedAt: updatedAtArray,
        });

        console.log('리포트가 수정되었습니다. ID:', editId);

        // feed.json 업데이트 (수정된 내용 반영)
        try {
          const { auth } = await import('@/lib/firebase');
          const token = await auth.currentUser?.getIdToken();
          if (token) {
            await fetch('/api/feed', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                postId: editId,
                postData: {
                  ...reportData,
                  authorName: authorName,
                  themes: selectedThemes.length > 0 ? selectedThemes : [],
                },
              }),
            });
          }
        } catch (feedError) {
          console.error('feed.json 업데이트 실패:', feedError);
        }

        // 홈 페이지와 상세 페이지 캐시 즉시 무효화
        await Promise.all([
          fetch('/api/revalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: '/' }),
          }),
          fetch('/api/revalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: `/reports/${editId}` }),
          }),
        ]);

        alert('리포트가 성공적으로 수정되었습니다!');
        router.push(`/reports/${editId}`);
      } else {
        // 새 글 작성 모드: 새 리포트 생성
        const docRef = await addDoc(collection(db, 'posts'), reportData);

        // feed.json에 새 게시글 추가
        try {
          const { auth } = await import('@/lib/firebase');
          const token = await auth.currentUser?.getIdToken();
          if (token) {
            await fetch('/api/feed', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                postId: docRef.id,
                postData: {
                  ...reportData,
                  authorName: authorName,
                },
              }),
            });
          }
        } catch (feedError) {
          console.error('feed.json 업데이트 실패:', feedError);
        }

        console.log('리포트가 저장되었습니다. ID:', docRef.id);

        // 홈 페이지 캐시 즉시 무효화
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/' }),
        });

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

  // 비로그인 유저 차단
  if (!user) {
    return (
      <div className="write-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card-base p-8">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">로그인이 필요한 서비스입니다.</p>
            <button
              onClick={() => router.push('/login')}
              className="btn-primary !py-2 !px-6 !text-sm"
            >
              로그인하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="write-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card-base p-8">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-[3px] border-[var(--pixel-border-muted)] border-t-[var(--pixel-accent)] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">리포트를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // HTML 모드 전용 레이아웃
  // 왼쪽 상단: 폼 입력 (컴팩트) / 왼쪽 하단: 코드 에디터
  // 오른쪽 전체: 미리보기
  // ═══════════════════════════════════════════════════
  if (editorMode === 'html') {
    return (
      <div className="write-page w-full px-4 sm:px-6 py-4 sm:py-6" style={{ maxWidth: '100%' }}>
        {/* 상단 바: 제목 + 모드 전환 + 액션 */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold">
            {isEditMode ? '리포트 수정' : '리포트 작성'}
            <span className="ml-2 text-xs font-normal px-2 py-0.5 bg-[var(--pixel-accent)] text-white border border-[var(--pixel-accent-dark)]">HTML</span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditorMode('text')}
              className="px-3 py-1 text-xs font-bold border-2 bg-[var(--pixel-bg-card)] border-[var(--pixel-border-muted)] hover:border-[var(--pixel-accent)] transition-all"
            >
              텍스트 모드
            </button>
            <button
              type="submit"
              form="write-form"
              disabled={isUploading}
              className="px-4 py-1 text-xs font-bold bg-[var(--pixel-accent)] text-white border-2 border-[var(--pixel-accent-dark)] transition-all disabled:opacity-50"
            >
              {isUploading ? '업로드 중...' : (isEditMode ? '수정 완료' : '작성 완료')}
            </button>
            {isEditMode && editId && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1 text-xs font-bold border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] hover:border-red-500 hover:text-red-500 transition-all"
              >
                삭제
              </button>
            )}
          </div>
        </div>

        <form id="write-form" onSubmit={handleSubmit}>
          <div className="flex gap-4" style={{ height: 'calc(100vh - 140px)' }}>
            {/* ── 왼쪽 ── */}
            <div className="flex flex-col gap-4 w-[480px] flex-shrink-0 min-h-0">
              {/* 왼쪽 상단: 폼 입력 (컴팩트) */}
              <div className="card-base p-4 space-y-3 flex-shrink-0 overflow-y-auto" style={{ maxHeight: '45%' }}>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="pixel-input !py-1.5 !text-sm"
                  placeholder="리포트 제목"
                />
                <StockSearchInput
                  onStockSelect={handleStockSelect}
                  selectedStock={stockData}
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={opinion}
                    onChange={(e) => setOpinion(e.target.value as Opinion)}
                    className="pixel-input !py-1.5 !text-sm"
                  >
                    <option value="buy">매수 (롱)</option>
                    <option value="sell">매도 (숏)</option>
                    <option value="hold">보유</option>
                  </select>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={targetPrice}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setTargetPrice(raw === '' ? '' : Number(raw).toLocaleString());
                    }}
                    required
                    className="pixel-input !py-1.5 !text-sm"
                    placeholder="목표가격"
                  />
                </div>
                {/* 테마 태그 (컴팩트) */}
                {allThemes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {allThemes.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() =>
                          setSelectedThemes(prev =>
                            prev.includes(theme.id)
                              ? prev.filter(id => id !== theme.id)
                              : [...prev, theme.id]
                          )
                        }
                        className={`px-2 py-0.5 text-[10px] border transition-all ${
                          selectedThemes.includes(theme.id)
                            ? 'pixel-chip-active font-bold'
                            : 'bg-[var(--pixel-bg-card)] border-[var(--pixel-border-muted)]'
                        }`}
                      >
                        {theme.name}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-gray-400">
                  script, iframe, on* 이벤트는 보안상 차단됩니다.
                </p>
              </div>

              {/* 왼쪽 하단: 코드 에디터 */}
              <div className="flex-1 min-h-0">
                <HtmlCodeEditor
                  value={htmlContent}
                  onChange={setHtmlContent}
                  onPreviewUpdate={(h, c) => { setPreviewHtml(h); setPreviewCss(c); }}
                  placeholder={'<style>\n  .card {\n    padding: 20px;\n    border-radius: 8px;\n    background: #f8f9fa;\n  }\n</style>\n\n<div class="card">\n  <h2>제목</h2>\n  <p>내용을 입력하세요...</p>\n</div>'}
                  editorOnly
                />
              </div>
            </div>

            {/* ── 오른쪽: 프리뷰 전체 ── */}
            <div className="flex-1 min-w-0 min-h-0">
              <HtmlPreviewPanel html={previewHtml} css={previewCss} />
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // 텍스트 모드 (기존 레이아웃)
  // ═══════════════════════════════════════════════════
  return (
    <div className="write-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
        {isEditMode ? '투자 리포트 수정' : '투자 리포트 작성'}
      </h1>

      <div className="lg:flex lg:gap-8">
        {/* 왼쪽: 폼 영역 */}
        <div className="flex-1 min-w-0">
          {/* 모바일용 액션 버튼 (lg 이하) */}
          {isEditMode && (
            <div className="lg:hidden flex flex-wrap gap-1.5 sm:gap-2 mb-4">
              <button
                type="submit"
                form="write-form"
                disabled={isUploading}
                className="px-3 py-1.5 bg-[var(--pixel-accent)] text-white border-2 border-[var(--pixel-accent-dark)] font-pixel text-xs sm:text-sm transition-all disabled:opacity-50"
              >
                {isUploading ? '업로드 중...' : '수정 완료'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] hover:border-red-500 hover:text-red-500 font-pixel text-xs sm:text-sm transition-all"
              >
                삭제
              </button>
              <button
                type="button"
                onClick={() => router.push(`/reports/${editId}`)}
                className="px-3 py-1.5 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg-card)] font-pixel text-xs sm:text-sm transition-all"
              >
                글 보기
              </button>
            </div>
          )}

        <form id="write-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="card-base p-5 sm:p-8 space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <div>
              <label className="pixel-label mb-2">
                제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="pixel-input"
                placeholder="리포트 제목을 입력하세요"
              />
            </div>

            {/* 종목 검색 (StockSearchInput 컴포넌트 사용) */}
            <StockSearchInput
              onStockSelect={handleStockSelect}
              selectedStock={stockData}
            />

            {/* 종목 프로필 카드 (코인이면 숨김) */}
            <div className={`mt-4 p-6 card-base border-[var(--pixel-accent)]/30 ${stockData?.exchange === 'CRYPTO' ? 'hidden' : ''}`}>
              <h3 className="text-base font-bold mb-4">
                종목 프로필
              </h3>

              {stockData ? (
                stockData.exchange === 'CRYPTO' ? (
                  <div className="flex items-center gap-5">
                    <img
                      src={getCryptoImageUrl(stockData.symbol)}
                      alt={stockData.symbol}
                      className="w-16 h-16 rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {stockData.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {stockData.symbol}
                      </div>
                      <div className="text-2xl font-bold text-orange-500 dark:text-orange-400 mt-2">
                        {stockData.currency === 'KRW' ? '₩' : stockData.currency} {stockData.currentPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">현재 주가</div>
                      <div className="text-lg font-bold text-[var(--pixel-accent)]">
                        {stockData.currency} {stockData.currentPrice.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">PER</div>
                      <div className="text-lg font-bold text-[var(--pixel-accent)]">
                        {stockData.per ? stockData.per.toFixed(2) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">PBR</div>
                      <div className="text-lg font-bold text-[var(--pixel-accent)]">
                        {stockData.pbr ? stockData.pbr.toFixed(2) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">EPS</div>
                      <div className="text-lg font-bold text-[var(--pixel-accent)]">
                        {stockData.eps ? stockData.eps.toFixed(2) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">거래소</div>
                      <div className="text-lg font-bold text-[var(--pixel-accent)]">
                        {stockData.exchange}
                      </div>
                    </div>
                    {stockData.sector && (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">섹터</div>
                        <div className="text-lg font-bold text-[var(--pixel-accent)]">
                          {stockData.sector}
                        </div>
                      </div>
                    )}
                    {stockData.industry && (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">산업</div>
                        <div className="text-lg font-bold text-[var(--pixel-accent)]">
                          {stockData.industry}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 border-2 border-dashed border-[var(--pixel-border-muted)] bg-[var(--pixel-bg)]">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">현재 주가</div>
                    <div className="text-xl font-bold text-gray-300 dark:text-gray-600">-</div>
                  </div>
                  <div className="p-4 border-2 border-dashed border-[var(--pixel-border-muted)] bg-[var(--pixel-bg)]">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">PER</div>
                    <div className="text-xl font-bold text-gray-300 dark:text-gray-600">-</div>
                  </div>
                  <div className="p-4 border-2 border-dashed border-[var(--pixel-border-muted)] bg-[var(--pixel-bg)]">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">PBR</div>
                    <div className="text-xl font-bold text-gray-300 dark:text-gray-600">-</div>
                  </div>
                </div>
              )}

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="pixel-label mb-2">
                  투자 의견 *
                </label>
                <select
                  value={opinion}
                  onChange={(e) => setOpinion(e.target.value as Opinion)}
                  className="pixel-input"
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
                <label className="pixel-label mb-2">
                  목표 가격
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={targetPrice}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    if (raw === '') {
                      setTargetPrice('');
                    } else {
                      setTargetPrice(Number(raw).toLocaleString());
                    }
                  }}
                  required
                  className="pixel-input"
                  placeholder="예: 85,000"
                />
              </div>
            </div>

          </div>

          {/* 테마 태그 */}
          {allThemes.length > 0 && (
            <div>
              <label className="pixel-label mb-2">
                테마 태그
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                관련 투자 테마를 선택하세요 (선택사항)
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {allThemes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() =>
                      setSelectedThemes(prev =>
                        prev.includes(theme.id)
                          ? prev.filter(id => id !== theme.id)
                          : [...prev, theme.id]
                      )
                    }
                    className={`font-pixel px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs border-2 transition-all ${
                      selectedThemes.includes(theme.id)
                        ? 'pixel-chip-active font-bold'
                        : 'bg-[var(--pixel-bg-card)] border-[var(--pixel-border-muted)] hover:border-[var(--pixel-accent)]'
                    }`}
                    title={theme.description}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
              {selectedThemes.length > 0 && (
                <p className="mt-2 text-xs text-[var(--pixel-accent)]">
                  {selectedThemes.length}개 테마 선택됨
                </p>
              )}
            </div>
          )}

          {/* 에디터 */}
          <div>
              <div className="flex items-center justify-between mb-2">
                <label className="pixel-label">
                  내용
                </label>
                {/* 모드 선택 — 모바일에서는 숨김 */}
                <div className="hidden md:flex items-center gap-1">
                  <button
                    type="button"
                    className="px-3 py-1 text-xs font-bold border-2 pixel-chip-active"
                    disabled
                  >
                    텍스트
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('html')}
                    className="px-3 py-1 text-xs font-bold border-2 bg-[var(--pixel-bg-card)] border-[var(--pixel-border-muted)] hover:border-[var(--pixel-accent)] transition-all"
                  >
                    HTML
                  </button>
                </div>
              </div>

              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="리포트 본문을 입력하세요..."
                onEditorReady={setTiptapEditor}
              />

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                툴바를 사용하여 굵게, 색상, 정렬 등 서식을 적용할 수 있습니다. 다른 곳에서 복사/붙여넣기하면 서식이 유지됩니다.
              </p>
            </div>

          {/* 이미지 첨부 */}
          <div>
            <label className="pixel-label mb-2">
              이미지 첨부
            </label>
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 border-[3px] border-[var(--pixel-border-muted)] cursor-pointer hover:border-[var(--pixel-accent)] transition-all bg-[var(--pixel-bg-card)] shadow-pixel-sm">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">이미지 선택</span>
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
                      <div key={index} className="relative group border-[3px] border-[var(--pixel-border-muted)] p-3 bg-[var(--pixel-bg-card)]">
                        <div className="flex gap-3">
                          <div className="w-20 h-20 relative border-2 border-[var(--pixel-border-muted)] overflow-hidden flex-shrink-0">
                            <Image
                              src={uploadedImageUrls[index] || URL.createObjectURL(image)}
                              alt={`preview-${index}`}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate">
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
                                  className="mt-2 text-xs px-3 py-1 btn-primary !py-1 !px-3 !text-xs"
                                >
                                  이미지 삽입
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
                    <div className="border-2 border-[var(--pixel-accent)] bg-red-500/10 p-3">
                      <p className="text-xs text-red-900 dark:text-red-100">
                        <strong>사용법:</strong> 각 이미지의 &quot;이미지 삽입&quot; 버튼을 클릭하면 본문에 이미지가 추가됩니다.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PDF 첨부 */}
          <div>
            <label className="pixel-label mb-2">
              PDF 첨부
            </label>
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 border-[3px] border-[var(--pixel-border-muted)] cursor-pointer hover:border-[var(--pixel-accent)] transition-all bg-[var(--pixel-bg-card)] shadow-pixel-sm">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm">PDF 첨부</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">(최대 20MB)</span>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept="application/pdf"
                  onChange={handleFileUpload}
                />
              </label>

              {/* 업로드된 파일 목록 */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border-2 border-[var(--pixel-border-muted)] bg-[var(--pixel-bg)]"
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
                          <p className="text-sm font-bold truncate">
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

          {/* 업로드 진행 상태 */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>이미지 업로드 중...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-[var(--pixel-border-muted)] h-3 border-2 border-[var(--pixel-border-muted)]">
                <div
                  className="bg-[var(--pixel-accent)] h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          </div>
        </form>
        </div>

        {/* 오른쪽: 사이드바 (데스크톱) */}
        <div className="hidden lg:block lg:w-72 lg:flex-shrink-0">
          <div className="sticky top-20 space-y-4">
            {/* 제출 + 취소 */}
            <div className="card-base p-4 space-y-2">
              <button
                type="submit"
                form="write-form"
                disabled={isUploading}
                className="w-full btn-primary !py-2.5 !text-sm disabled:opacity-50"
              >
                {isUploading ? '업로드 중...' : (isEditMode ? '수정 완료' : '작성 완료')}
              </button>
              <button
                type="button"
                onClick={() => isEditMode && editId ? router.push(`/reports/${editId}`) : router.push('/')}
                disabled={isUploading}
                className="w-full btn-secondary !py-2.5 !text-sm disabled:opacity-50"
              >
                취소
              </button>
            </div>

            {/* 수정 모드 전용 액션 */}
            {isEditMode && editId && (
              <>
                {/* 삭제 */}
                <div className="card-base p-4 space-y-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full btn-danger font-pixel !py-2 !text-sm"
                  >
                    삭제
                  </button>
                </div>

                {/* 종목 정보 요약 */}
                {stockData && (
                  <div className="card-base p-4">
                    <h3 className="font-pixel text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">종목 정보</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">종목</span>
                        <span className="font-bold">{stockData.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">현재가</span>
                        <span className="font-bold tabular-nums">{stockData.currentPrice.toLocaleString()}</span>
                      </div>
                      {originalInitialPrice && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">작성가</span>
                          <span className="font-bold tabular-nums">{originalInitialPrice.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">거래소</span>
                        <span className="font-bold">{stockData.exchange}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 새 글 작성 모드 + 종목 선택됨 */}
            {!isEditMode && stockData && (
              <div className="card-base p-4">
                <h3 className="font-pixel text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">종목 정보</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">종목</span>
                    <span className="font-bold">{stockData.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">현재가</span>
                    <span className="font-bold tabular-nums">{stockData.currentPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">거래소</span>
                    <span className="font-bold">{stockData.exchange}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 모바일: 하단 고정 제출 버튼 (새 글 작성 시) */}
      {!isEditMode && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-[var(--pixel-bg)] border-t-[3px] border-[var(--pixel-border-muted)] z-40">
          <div className="flex gap-3 max-w-5xl mx-auto">
            <button
              type="submit"
              form="write-form"
              disabled={isUploading}
              className={`flex-1 btn-primary !py-3 !text-sm ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isUploading ? '업로드 중...' : '작성 완료'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              disabled={isUploading}
              className="btn-secondary !py-3 !text-sm"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Suspense wrapper for useSearchParams
export default function WritePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm">로딩 중...</div>}>
      <WritePageContent />
    </Suspense>
  );
}
