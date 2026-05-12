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
        'deep-black': '#050505',
        'ant-red': {
          DEFAULT: '#DC2626',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
          950: '#450A0A',
        },
        'neon-orange': {
          DEFAULT: '#FF4500',
          50: '#FFF1EB',
          100: '#FFD9CC',
          200: '#FFB399',
          300: '#FF8C66',
          400: '#FF6633',
          500: '#FF4500',
          600: '#CC3700',
          700: '#992900',
          800: '#661C00',
          900: '#330E00',
        },
        'neon-green': {
          DEFAULT: '#00FF99',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },
      },
      fontFamily: {
        // body와 동일한 스택 — `font-sans`/`font-heading`/`font-body` 클래스를 붙여도 인라인 인접 텍스트(클래스 없는 부분)와 한글이 동일 폰트로 렌더링되게 함.
        // NumFont(Barlow)는 unicode-range로 숫자/%만 매칭되고, 한글은 Noto Sans KR로 일관 렌더링.
        sans: ['NumFont', 'var(--font-noto)', 'var(--font-inter)', 'Noto Sans KR', 'Inter', 'sans-serif'],
        heading: ['NumFont', 'var(--font-noto)', 'var(--font-inter)', 'Noto Sans KR', 'Inter', 'sans-serif'],
        body: ['NumFont', 'var(--font-noto)', 'var(--font-inter)', 'Noto Sans KR', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
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
