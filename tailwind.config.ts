import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts}",
    "./lib/**/*.{js,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // AntStreet Brand Palette - 빨간 개미 테마
        // 에디토리얼 테마(2026-10): 예전 빨강·네온 주황 팔레트를 버건디 계열로 — 페이지 곳곳의 하드코딩 클래스가 새 톤을 따라가게
        'ant-red': {
          DEFAULT: '#9E2A2B',
          50: '#FAF1EF',
          100: '#F3DEDA',
          200: '#E6BDB6',
          300: '#D4958B',
          400: '#BF6A5E',
          500: '#AB463B',
          600: '#9E2A2B',
          700: '#832223',
          800: '#681C1D',
          900: '#4F1617',
          950: '#2E0C0C',
        },
        'neon-orange': {
          DEFAULT: '#9E2A2B',
          50: '#FAF1EF',
          100: '#F3DEDA',
          200: '#E6BDB6',
          300: '#D4958B',
          400: '#BF6A5E',
          500: '#9E2A2B',
          600: '#832223',
          700: '#681C1D',
          800: '#4F1617',
          900: '#2E0C0C',
        },
        // 빨강/파랑도 채도 낮춘 에디토리얼 톤 — 수익률(상승 빨강/하락 파랑) 하드코딩 클래스가 전부 새 톤을 따라감
        red: {
          50: '#fbf1f0', 100: '#f6dfdc', 200: '#ecbcb6', 300: '#de958c', 400: '#cc6a5f',
          500: '#c4473d', 600: '#b8322a', 700: '#962720', 800: '#741f1a', 900: '#561815', 950: '#2f0c0a',
        },
        blue: {
          50: '#f0f4fa', 100: '#dde6f3', 200: '#bccde8', 300: '#93acd8', 400: '#6f8fca',
          500: '#4a72bb', 600: '#2b5ba8', 700: '#234a8a', 800: '#1d3c6f', 900: '#172f56', 950: '#0d1a30',
        },
        // 회색 — 흰 바탕에 맞춘 중립 회색 (WSJ 웹처럼 색 기운 없는 회색 괘선·보조 글자)
        gray: {
          50: '#fafafa',
          100: '#f4f4f4',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#555555',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
      },
      fontFamily: {
        // body와 동일한 스택. NumFont(Barlow)는 unicode-range로 숫자/%만 매칭되고,
        // 한글은 OS 시스템 폰트(Apple SD Gothic Neo / Malgun Gothic / Pretendard 등)로 렌더링.
        // 이전엔 var(--font-noto)로 Noto Sans KR을 next/font에서 다운받았는데
        // woff2 ~150KB preload가 LCP 지연 → 시스템 폰트로 대체.
        sans: ['NumFont', 'var(--font-inter)', 'system-ui', '-apple-system', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Inter', 'sans-serif'],
        heading: ['NumFont', 'var(--font-inter)', 'system-ui', '-apple-system', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Inter', 'sans-serif'],
        body: ['NumFont', 'var(--font-inter)', 'system-ui', '-apple-system', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        // 에디토리얼 테마 — 제목(명조)·제호
        serif: ['var(--font-serif)', 'Noto Serif KR', 'AppleMyungjo', 'Batang', 'Georgia', 'serif'],
        masthead: ['var(--font-masthead)', 'var(--font-serif)', 'Georgia', 'serif'],
      },
      boxShadow: {
        // 라운드 테마 소프트 그림자
        'glass': '0 8px 32px rgba(59, 80, 181, 0.12)',
      },
      // 라운드 테마: 둥근 모서리
      borderRadius: {
        'none': '0px',
        'sm': '4px',
        DEFAULT: '8px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
      },
      screens: {
        'xs': '475px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
};
export default config;
