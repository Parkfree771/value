'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import MarketCallForm from '@/components/MarketCallForm';
import { GuruTrackingEvent } from '@/app/guru-tracker/types';
import { useEffect } from 'react';

export default function MarketCallWritePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      alert('로그인이 필요합니다.');
      router.push('/login?redirect=/market-call/write');
    }
  }, [user, loading, router]);

  const handleSubmit = async (data: Partial<GuruTrackingEvent>) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      // Firebase에 저장
      const marketCallRef = collection(db, 'market-call');
      await addDoc(marketCallRef, {
        ...data,
        created_at: serverTimestamp(),
        author_id: user.uid,
        author_email: user.email,
        author_nickname: user.displayName || user.email?.split('@')[0] || '익명',
      });

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

  if (loading) {
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
