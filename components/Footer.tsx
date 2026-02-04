'use client';

import { memo, useState } from 'react';
import Link from 'next/link';

const Footer = memo(function Footer() {
  const [expanded, setExpanded] = useState(false);

  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* 기본 정보 (항상 표시) */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="font-semibold text-white">워렌버핏 따라잡기</span>
            <Link href="/terms" className="hover:text-white transition-colors">이용약관</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">개인정보</Link>
            <Link href="/disclaimer" className="text-yellow-400 hover:text-yellow-300 transition-colors">면책조항</Link>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            {expanded ? '접기' : '더보기'}
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* 확장 영역 */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-700 text-center">
            <p className="text-gray-400 text-sm mb-3">
              개인 투자자들이 투자 리포트를 작성하고 성과를 추적하는 주식 커뮤니티
            </p>
            <div className="flex justify-center gap-4 text-sm mb-3">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">피드</Link>
              <Link href="/ranking" className="text-gray-400 hover:text-white transition-colors">랭킹</Link>
              <Link href="/write" className="text-gray-400 hover:text-white transition-colors">글쓰기</Link>
            </div>
            <p className="text-gray-500 text-xs mb-3">contact@warren-tracker.com</p>
            <p className="text-xs text-gray-500">
              <span className="text-yellow-400">⚠️</span> 본 사이트의 투자 리포트는 작성자 개인의 의견이며, 투자 권유가 아닙니다.
            </p>
          </div>
        )}

        {/* 저작권 */}
        <div className="mt-3 pt-3 border-t border-gray-700 text-center text-xs text-gray-500">
          &copy; 2025 워렌버핏 따라잡기
        </div>
      </div>
    </footer>
  );
});

export default Footer;
