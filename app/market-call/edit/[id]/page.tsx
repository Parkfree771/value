'use client';

import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import MarketCallForm from '@/components/MarketCallForm';
import { useEffect, useState } from 'react';

export default function MarketCallEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, loading } = useAuth();
  const [initialData, setInitialData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const docRef = doc(db, 'market-call', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          alert('게시글을 찾을 수 없습니다.');
          router.push('/market-call');
          return;
        }

        const data = docSnap.data();

        // 작성자 확인
        if (user && data.author_id !== user.uid) {
          alert('수정 권한이 없습니다.');
          router.push('/market-call');
          return;
        }

        setInitialData(data);
      } catch (error) {
        console.error('Error fetching document:', error);
        alert('게시글을 불러오는 중 오류가 발생했습니다.');
        router.push('/market-call');
      } finally {
        setIsLoading(false);
      }
    };

    if (!loading) {
      if (!user) {
        alert('로그인이 필요합니다.');
        router.push('/login?redirect=/market-call');
        return;
      }
      fetchData();
    }
  }, [id, user, loading, router]);

  const handleSubmit = async (data: any) => {
    if (!user || !id) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const response = await fetch('/api/market-call', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          userId: user.uid,
          ...data,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('마켓 콜이 성공적으로 수정되었습니다!');
        router.push('/market-call');
      } else {
        alert(result.error || '수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error updating document:', error);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const handleCancel = () => {
    router.push('/market-call');
  };

  if (loading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="text-lg text-gray-600 dark:text-gray-400">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!user || !initialData) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 border border-gray-200 dark:border-gray-700">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            마켓 콜 수정
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            작성한 마켓 콜을 수정하세요
          </p>
        </div>

        {/* 폼 */}
        <MarketCallForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          initialData={initialData}
          isEditMode={true}
        />
      </div>
    </div>
  );
}
