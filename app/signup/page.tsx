'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();

  // 회원가입과 로그인이 동일하므로 로그인 페이지로 리다이렉트
  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400">로그인 페이지로 이동 중...</p>
      </div>
    </div>
  );
}
