'use client';

import { memo, useState } from 'react';
import Link from 'next/link';

const Footer = memo(function Footer() {
  const [expanded, setExpanded] = useState(false);

  return (
    <footer className="bg-[var(--theme-bg)] text-[var(--foreground)] border-t-[3px] border-double border-[var(--theme-border)] mt-auto pb-[var(--sab,0px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* 기본 정보 (항상 표시) */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-[var(--theme-ink-soft)] flex-wrap justify-center">
            <span className="brand-title text-sm" data-text="AntStreet">AntStreet</span>
            <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">이용약관</Link>
            <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">개인정보</Link>
            <Link href="/disclaimer" className="font-bold hover:text-[var(--foreground)] transition-colors">면책조항</Link>
            <Link href="/contact" className="hover:text-[var(--foreground)] transition-colors">문의</Link>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-[var(--theme-ink-soft)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1"
          >
            {expanded ? '접기' : '사업자 정보'}
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

        {/* 확장 영역 - 사업자 정보 */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-[var(--theme-border-muted)]">
            <div className="max-w-md mx-auto text-center">
              {/* 사업자 정보 */}
              <div className="text-xs text-gray-400 space-y-1 mb-4">
                <p>
                  <span className="text-gray-500">상호명:</span> 부자FARM
                  <span className="mx-2 text-gray-600">|</span>
                  <span className="text-gray-500">대표:</span> 박유로
                </p>
                <p>
                  <span className="text-gray-500">사업자등록번호:</span> 326-23-01856
                </p>
                <p>
                  <span className="text-gray-500">주소:</span> 경기도 고양시 일산서구 킨텍스로 240
                </p>
                <p>
                  <span className="text-gray-500">이메일:</span> dbfh1498@gmail.com
                </p>
              </div>

              {/* 링크 */}
              <div className="flex justify-center gap-4 text-sm mb-4">
                <Link href="/" className="text-gray-400 hover:text-[var(--foreground)] transition-colors">피드</Link>
                <Link href="/ranking" className="text-gray-400 hover:text-[var(--foreground)] transition-colors">랭킹</Link>
                <Link href="/write" className="text-gray-400 hover:text-[var(--foreground)] transition-colors">글쓰기</Link>
              </div>

              {/* 투자 경고 */}
              <div className="p-3 border border-[var(--theme-border)]">
                <p className="text-xs text-[var(--theme-orange)] font-medium mb-1">[투자 위험 고지]</p>
                <p className="text-xs text-gray-400">
                  본 사이트의 투자 리포트는 작성자 개인의 의견이며, 투자 권유가 아닙니다.
                  투자 손실의 책임은 전적으로 투자자 본인에게 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 저작권 */}
        <div className="mt-3 pt-3 border-t border-[var(--theme-border-muted)] text-center text-xs text-gray-500">
          &copy; 2026 AntStreet. All rights reserved.
        </div>
      </div>
    </footer>
  );
});

export default Footer;
