'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import WordWatchForm from '@/components/WordWatchForm';
import { GuruTrackingEvent } from '@/app/guru-tracker/types';
import { useEffect } from 'react';

export default function WordWatchWritePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      alert('로그인이 필요합니다.');
      router.push('/login?redirect=/word-watch/write');
    }
  }, [user, loading, router]);

  const handleSubmit = async (data: Partial<GuruTrackingEvent>) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      // Firebase에 저장
      const wordWatchRef = collection(db, 'word-watch');
      await addDoc(wordWatchRef, {
        ...data,
        created_at: serverTimestamp(),
        author_uid: user.uid,
        author_email: user.email,
      });

      alert('워드워치가 성공적으로 작성되었습니다!');
      router.push('/word-watch');
    } catch (error) {
      console.error('Error writing document: ', error);
      throw error;
    }
  };

  const handleCancel = () => {
    router.push('/word-watch');
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
            워드워치 작성
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            시장 인플루언서들의 발언을 기록하고 추적하세요
          </p>
        </div>

        {/* 폼 */}
        <WordWatchForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </div>
  );
}
