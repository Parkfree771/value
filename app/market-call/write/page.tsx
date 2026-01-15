'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { registerTicker } from '@/lib/tickers';
import MarketCallForm from '@/components/MarketCallForm';
import { GuruTrackingEvent } from '@/app/guru-tracker/types';
import { useEffect } from 'react';

export default function MarketCallWritePage() {
  const router = useRouter();
  const { user, authReady } = useAuth();

  useEffect(() => {
    // Auth가 준비된 후에만 체크
    if (authReady && !user) {
      alert('로그인이 필요합니다.');
      router.push('/login?redirect=/market-call/write');
    }
  }, [user, authReady, router]);

  const handleSubmit = async (data: Partial<GuruTrackingEvent>) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      // Firebase에 저장
      // 필드 순서: 제목 → 티커 → 초기가격 → 작성자 → 나머지
      const marketCallRef = collection(db, 'market-call');
      const marketCallData = {
        // 1. 제목/내용
        title: data.title,

        // 2. 티커
        target_ticker: data.target_ticker,

        // 3. 초기 가격 (작성 시점)
        initial_price: data.base_price, // base_price를 initial_price로 통일
        currentPrice: data.current_price, // 크론이 업데이트
        lastPriceUpdate: serverTimestamp(), // 마지막 가격 업데이트 시간

        // 4. 작성자 정보
        author_id: user.uid,
        author_email: user.email,
        author_nickname: user.displayName || user.email?.split('@')[0] || '익명',

        // 5. 나머지 필드
        ...data,

        // 6. 타임스탬프
        created_at: serverTimestamp(),
      };

      const docRef = await addDoc(marketCallRef, marketCallData);

      // tickers 컬렉션에 등록 (가격 업데이트 최적화용)
      if (data.target_ticker && data.exchange) {
        await registerTicker(data.target_ticker, data.exchange);
      }

      console.log('마켓 콜이 저장되었습니다. ID:', docRef.id);

      // 마켓콜 페이지와 홈 캐시 즉시 무효화
      await Promise.all([
        fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/market-call' }),
        }),
        fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/' }),
        }),
      ]);

      alert('마켓 콜이 성공적으로 작성되었습니다!');
      router.push('/market-call');
    } catch (error) {
      console.error('Error writing document: ', error);
      throw error;
    }
  };

  const handleCancel = () => {
    router.push('/market-call');
  };

  if (!authReady) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="text-lg text-gray-600 dark:text-gray-400">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 border border-gray-200 dark:border-gray-700">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            마켓 콜 작성
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            투자 전문가들의 시장 예측을 기록하고 검증하세요
          </p>
        </div>

        {/* 폼 */}
        <MarketCallForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </div>
  );
}
