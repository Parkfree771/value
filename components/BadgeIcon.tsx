import { memo } from 'react';

// 배지 ID → SVG. viewBox는 64×64로 통일.
// size는 px 단위. 라벨/툴팁은 외부에서 입혀서 사용.

interface BadgeIconProps {
  id: string;
  size?: number;
  className?: string;
  title?: string;
}

type SvgRender = () => React.ReactNode;

const RENDERERS: Record<string, SvgRender> = {
  // ─── 활동 ───
  'posts-1': () => (
    // 발자국 (첫걸음)
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#1A2860" stroke="#0F1B3D" strokeWidth="2" />
      {/* 뒤쪽 발자국 (작고 연하게) */}
      <ellipse cx="22" cy="42" rx="6" ry="8" fill="#3B50B5" stroke="#0F1B3D" strokeWidth="1.5" />
      <circle cx="19" cy="32" r="2" fill="#3B50B5" stroke="#0F1B3D" strokeWidth="1" />
      <circle cx="23" cy="30" r="2" fill="#3B50B5" stroke="#0F1B3D" strokeWidth="1" />
      <circle cx="27" cy="32" r="2" fill="#3B50B5" stroke="#0F1B3D" strokeWidth="1" />
      {/* 앞쪽 발자국 (크고 진하게) */}
      <ellipse cx="40" cy="32" rx="7" ry="9" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="2" />
      <circle cx="36" cy="20" r="2.5" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" />
      <circle cx="41" cy="17" r="2.5" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" />
      <circle cx="46" cy="20" r="2.5" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" />
      <circle cx="49" cy="25" r="2" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" />
    </>
  ),

  'posts-5': () => (
    // 두루마리
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#1A2860" stroke="#0F1B3D" strokeWidth="2" />
      <rect x="14" y="12" width="36" height="6" rx="3" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="2" />
      <rect x="16" y="18" width="32" height="28" fill="#F5E9C5" stroke="#0F1B3D" strokeWidth="2" />
      <line x1="20" y1="25" x2="44" y2="25" stroke="#1A2860" strokeWidth="1.5" />
      <line x1="20" y1="31" x2="44" y2="31" stroke="#1A2860" strokeWidth="1.5" />
      <line x1="20" y1="37" x2="38" y2="37" stroke="#1A2860" strokeWidth="1.5" />
      <rect x="14" y="46" width="36" height="6" rx="3" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="2" />
      <circle cx="32" cy="49" r="3.5" fill="#DC2626" stroke="#0F1B3D" strokeWidth="1.5" />
    </>
  ),

  'posts-20': () => (
    // 서가의 책
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#1A2860" stroke="#0F1B3D" strokeWidth="2" />
      <rect x="15" y="14" width="10" height="36" rx="1" fill="#FF4500" stroke="#0F1B3D" strokeWidth="2" />
      <rect x="27" y="14" width="10" height="36" rx="1" fill="#DC2626" stroke="#0F1B3D" strokeWidth="2" />
      <rect x="39" y="14" width="10" height="36" rx="1" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="2" />
      <line x1="18" y1="20" x2="22" y2="20" stroke="#FFFFFF" strokeWidth="1.5" />
      <line x1="18" y1="44" x2="22" y2="44" stroke="#FFFFFF" strokeWidth="1.5" />
      <line x1="30" y1="20" x2="34" y2="20" stroke="#FFFFFF" strokeWidth="1.5" />
      <line x1="30" y1="44" x2="34" y2="44" stroke="#FFFFFF" strokeWidth="1.5" />
      <line x1="42" y1="20" x2="46" y2="20" stroke="#1A2860" strokeWidth="1.5" />
      <line x1="42" y1="44" x2="46" y2="44" stroke="#1A2860" strokeWidth="1.5" />
    </>
  ),

  'posts-50': () => (
    // 분석가의 인장 (빨강)
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#1A2860" stroke="#0F1B3D" strokeWidth="2" />
      <path
        d="M 32 10 L 36 16 L 43 16 L 43 23 L 49 27 L 43 31 L 43 38 L 36 38 L 32 44 L 28 38 L 21 38 L 21 31 L 15 27 L 21 23 L 21 16 L 28 16 Z"
        fill="#DC2626"
        stroke="#0F1B3D"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="27" r="8" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="2" />
      <path d="M 28 23 L 36 23 L 36 31 L 28 31 Z" fill="#FF4500" />
      <path
        d="M 18 46 L 14 56 L 32 50 L 50 56 L 46 46 Z"
        fill="#FF4500"
        stroke="#0F1B3D"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </>
  ),

  'posts-100': () => (
    // 분석가의 인장 (골드 ver - 최상위 티어)
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#1A2860" stroke="#0F1B3D" strokeWidth="2" />
      <path
        d="M 32 10 L 36 16 L 43 16 L 43 23 L 49 27 L 43 31 L 43 38 L 36 38 L 32 44 L 28 38 L 21 38 L 21 31 L 15 27 L 21 23 L 21 16 L 28 16 Z"
        fill="#F59E0B"
        stroke="#0F1B3D"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="27" r="8" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="2" />
      <path d="M 28 23 L 36 23 L 36 31 L 28 31 Z" fill="#DC2626" />
      <path
        d="M 18 46 L 14 56 L 32 50 L 50 56 L 46 46 Z"
        fill="#DC2626"
        stroke="#0F1B3D"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </>
  ),

  // ─── 수익 ───
  'alpha-30': () => (
    // 왕관
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#DC2626" stroke="#7F1D1D" strokeWidth="2" />
      <path
        d="M 10 32 L 14 18 L 22 26 L 32 14 L 42 26 L 50 18 L 54 32 L 54 46 L 10 46 Z"
        fill="#F59E0B"
        stroke="#0F1B3D"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="18" r="3" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" />
      <circle cx="32" cy="14" r="3.5" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" />
      <circle cx="50" cy="18" r="3" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" />
      <rect x="28" y="34" width="8" height="8" rx="1" fill="#DC2626" stroke="#0F1B3D" strokeWidth="1.5" />
      <line x1="10" y1="46" x2="54" y2="46" stroke="#0F1B3D" strokeWidth="2" />
    </>
  ),

  'jackpot-100': () => (
    // 별
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#F59E0B" stroke="#92400E" strokeWidth="2" />
      <path
        d="M 32 10 L 38 25 L 54 26 L 42 36 L 46 52 L 32 43 L 18 52 L 22 36 L 10 26 L 26 25 Z"
        fill="#FFFFFF"
        stroke="#0F1B3D"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M 32 18 L 35 26 L 32 30 L 29 26 Z" fill="#F59E0B" />
    </>
  ),

  'winrate-70': () => (
    // 트로피
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#F59E0B" stroke="#92400E" strokeWidth="2" />
      <path
        d="M 14 16 Q 8 16 8 22 Q 8 30 18 32"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M 50 16 Q 56 16 56 22 Q 56 30 46 32"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M 18 12 L 46 12 L 44 36 Q 44 42 32 42 Q 20 42 20 36 Z"
        fill="#FFFFFF"
        stroke="#0F1B3D"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text
        x="32"
        y="32"
        fontSize="14"
        fontWeight="900"
        textAnchor="middle"
        fill="#DC2626"
        fontFamily="Arial Black, Arial, sans-serif"
      >
        1
      </text>
      <rect x="28" y="42" width="8" height="6" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="2" />
      <rect x="20" y="48" width="24" height="5" rx="1" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="2" />
    </>
  ),

  // ─── 인버스 ───
  'bear-shy': () => (
    // 하방 화살표 (역방향 시도자, 가벼운 톤)
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#2563EB" stroke="#1E3A8A" strokeWidth="2" />
      <path
        d="M 24 14 L 40 14 L 40 36 L 50 36 L 32 52 L 14 36 L 24 36 Z"
        fill="#FFFFFF"
        stroke="#1E3A8A"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line x1="28" y1="20" x2="36" y2="20" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="26" x2="36" y2="26" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" />
    </>
  ),

  'short-master': () => (
    // 닻
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#2563EB" stroke="#1E3A8A" strokeWidth="2" />
      <circle cx="32" cy="14" r="4.5" fill="none" stroke="#FFFFFF" strokeWidth="3" />
      <rect x="29.5" y="18" width="5" height="28" fill="#FFFFFF" />
      <rect x="22" y="22" width="20" height="3.5" fill="#FFFFFF" />
      <path
        d="M 14 38 Q 14 52 32 52 Q 50 52 50 38"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="14" cy="38" r="2.5" fill="#FFFFFF" />
      <circle cx="50" cy="38" r="2.5" fill="#FFFFFF" />
    </>
  ),

  'bear-alpha': () => (
    // 역삼각 보석
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#2563EB" stroke="#1E3A8A" strokeWidth="2" />
      <polygon points="12,16 52,16 32,54" fill="#FFFFFF" stroke="#1E3A8A" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="12,16 52,16 32,30" fill="#60A5FA" />
      <line x1="32" y1="16" x2="32" y2="54" stroke="#1E3A8A" strokeWidth="1.5" />
      <line x1="22" y1="30" x2="42" y2="30" stroke="#1E3A8A" strokeWidth="1.5" />
    </>
  ),

  drawdown: () => (
    // 초승달
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#2563EB" stroke="#1E3A8A" strokeWidth="2" />
      <path
        d="M 42 14 A 18 18 0 1 0 42 50 A 14 14 0 1 1 42 14 Z"
        fill="#FFFFFF"
        stroke="#1E3A8A"
        strokeWidth="2"
      />
      <circle cx="14" cy="20" r="1.5" fill="#FFFFFF" />
      <circle cx="20" cy="44" r="1.5" fill="#FFFFFF" />
      <circle cx="12" cy="50" r="1.5" fill="#FFFFFF" />
      <circle cx="22" cy="14" r="1" fill="#FFFFFF" />
    </>
  ),

  // ─── 특수 ───
  'crypto-pioneer': () => (
    // ₿ 코인 (크립토 작가)
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#F97316" stroke="#9A3412" strokeWidth="2" />
      <circle cx="32" cy="32" r="18" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="13" fill="#F59E0B" stroke="#0F1B3D" strokeWidth="1.5" />
      <text
        x="32"
        y="40"
        fontSize="20"
        fontWeight="900"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="Arial Black, Arial, sans-serif"
        stroke="#0F1B3D"
        strokeWidth="0.6"
      >
        ₿
      </text>
      <line x1="32" y1="12" x2="32" y2="16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="48" x2="32" y2="52" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </>
  ),

  'views-10k': () => (
    // 태양
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#F59E0B" stroke="#92400E" strokeWidth="2" />
      <circle cx="32" cy="32" r="13" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="2" />
      <polygon points="32,8 28,18 36,18" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="32,56 28,46 36,46" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="8,32 18,28 18,36" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="56,32 46,28 46,36" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="15,15 22,20 20,22" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" />
      <polygon points="49,15 42,20 44,22" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" />
      <polygon points="15,49 22,44 20,42" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" />
      <polygon points="49,49 42,44 44,42" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="5" fill="#DC2626" stroke="#0F1B3D" strokeWidth="1.5" />
    </>
  ),

  'variety-10': () => (
    // 다이아몬드
    <>
      <rect x="3" y="3" width="58" height="58" rx="12" fill="#DC2626" stroke="#7F1D1D" strokeWidth="2" />
      <polygon points="32,12 50,28 32,52 14,28" fill="#FFFFFF" stroke="#0F1B3D" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="32,12 42,24 22,24" fill="#FF4500" stroke="#0F1B3D" strokeWidth="1.5" />
      <line x1="22" y1="24" x2="32" y2="52" stroke="#0F1B3D" strokeWidth="1.5" />
      <line x1="42" y1="24" x2="32" y2="52" stroke="#0F1B3D" strokeWidth="1.5" />
      <line x1="14" y1="28" x2="50" y2="28" stroke="#0F1B3D" strokeWidth="1.5" />
    </>
  ),
};

const BadgeIcon = memo(function BadgeIcon({ id, size = 24, className = '', title }: BadgeIconProps) {
  const render = RENDERERS[id];
  if (!render) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-label={title}
      role={title ? 'img' : 'presentation'}
    >
      {title && <title>{title}</title>}
      {render()}
    </svg>
  );
});

export default BadgeIcon;
