'use client';

import { useState } from 'react';

interface Props {
  url: string;
  title: string;
  hashTags?: string[];
}

const ICON_SIZE = 'w-4 h-4 sm:w-5 sm:h-5';

export default function ShareButtons({ url, title, hashTags = [] }: Props) {
  const [copied, setCopied] = useState(false);
  const [kakaoNotice, setKakaoNotice] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedTags = encodeURIComponent(hashTags.map((t) => `#${t}`).join(' '));

  const openShare = (shareUrl: string) => {
    if (typeof window === 'undefined') return;
    window.open(shareUrl, '_blank', 'width=600,height=600,noopener,noreferrer');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('링크를 복사하세요', url);
    }
  };

  const handleKakao = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n${url}`);
      setKakaoNotice(true);
      setTimeout(() => setKakaoNotice(false), 2500);
    } catch {
      window.prompt('카카오톡에 붙여넣기 하세요', `${title}\n${url}`);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share !== 'function') {
      handleCopy();
      return;
    }
    try {
      await navigator.share({ title, url, text: title });
    } catch {
      // 사용자가 취소한 경우 무시
    }
  };

  const buttons = [
    {
      key: 'x',
      label: 'X',
      bg: 'bg-black hover:bg-gray-800 text-white',
      onClick: () =>
        openShare(
          `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}${
            encodedTags ? `&hashtags=${encodeURIComponent(hashTags.join(','))}` : ''
          }`,
        ),
      icon: (
        <svg className={ICON_SIZE} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      key: 'facebook',
      label: 'Facebook',
      bg: 'bg-[#1877F2] hover:bg-[#0d65d9] text-white',
      onClick: () => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`),
      icon: (
        <svg className={ICON_SIZE} viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      key: 'band',
      label: '밴드',
      bg: 'bg-[#00C73C] hover:bg-[#00a833] text-white',
      onClick: () =>
        openShare(`https://www.band.us/plugin/share?body=${encodedTitle}%0A${encodedUrl}&route=${encodedUrl}`),
      icon: (
        <svg className={ICON_SIZE} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.5 6.75h3v3h3v3h-3v3h-3v-3h-3v-3h3z" />
        </svg>
      ),
    },
    {
      key: 'line',
      label: '라인',
      bg: 'bg-[#06C755] hover:bg-[#05b34c] text-white',
      onClick: () => openShare(`https://social-plugins.line.me/lineit/share?url=${encodedUrl}`),
      icon: (
        <svg className={ICON_SIZE} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125zm-3.855 3.016c0 .27-.174.51-.432.596a.62.62 0 01-.197.033c-.21 0-.4-.097-.526-.273l-2.444-3.324v2.96c0 .345-.282.63-.631.63-.345 0-.627-.285-.627-.63V8.108c0-.27.173-.51.43-.595.06-.023.122-.034.193-.034.195 0 .375.104.512.273l2.443 3.323V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63zM9.768 12.879c0 .345-.282.63-.631.63-.345 0-.627-.285-.627-.63V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63zm-2.952.016c.348 0 .63.285.63.63 0 .345-.282.63-.63.63H4.43c-.345 0-.63-.285-.63-.63v-4.77c0-.348.285-.63.63-.63.348 0 .63.282.63.63v4.14h1.756zm17.184-2.882C24 4.491 18.615 0 12 0 5.385 0 0 4.491 0 10.013c0 4.954 4.27 9.099 10.035 9.883.39.085.923.258 1.058.59.121.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.98 1.732-1.901 2.548-3.846 2.548-6.238z" />
        </svg>
      ),
    },
    {
      key: 'kakao',
      label: '카카오톡',
      bg: 'bg-[#FEE500] hover:bg-[#fdd800] text-[#3C1E1E]',
      onClick: handleKakao,
      icon: (
        <svg className={ICON_SIZE} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C6.48 3 2 6.58 2 10.95c0 2.78 1.85 5.22 4.66 6.62-.21.74-.75 2.66-.86 3.07-.13.51.19.5.39.36.16-.11 2.55-1.74 3.58-2.44.71.1 1.45.16 2.23.16 5.52 0 10-3.58 10-7.95C22 6.58 17.52 3 12 3z" />
        </svg>
      ),
    },
    {
      key: 'copy',
      label: copied ? '복사됨' : '링크복사',
      bg: copied
        ? 'bg-green-500 text-white'
        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200',
      onClick: handleCopy,
      icon: (
        <svg className={ICON_SIZE} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
        {buttons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            onClick={btn.onClick}
            aria-label={`${btn.label}로 공유`}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${btn.bg}`}
          >
            {btn.icon}
            <span className="hidden sm:inline">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* 모바일 네이티브 공유 (iOS/Android에서 카톡 등 가능) */}
      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="w-full sm:hidden flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-[var(--theme-border-muted)] bg-[var(--theme-bg-card)] hover:border-[var(--theme-accent)] text-xs font-medium transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          더 많은 앱으로 공유
        </button>
      )}

      {kakaoNotice && (
        <div className="text-[11px] sm:text-xs text-center text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-md py-1.5 px-2">
          링크가 복사되었습니다. 카카오톡 채팅창에 붙여넣기 하세요.
        </div>
      )}
    </div>
  );
}
