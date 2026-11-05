'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

/** 관리자에게만 보이는 등록·수정 버튼 (서버 API 도 관리자만 허용) */
export default function ExpertAdminLink({ href, label }: { href: string; label: string }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return (
    <Link href={href} className="btn-secondary inline-flex min-h-9 items-center !py-1.5 !px-3 text-sm">
      {label}
    </Link>
  );
}
