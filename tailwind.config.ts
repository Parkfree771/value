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
        // 픽셀 테마 색상
        'pixel': {
          bg: 'var(--pixel-bg)',
          card: 'var(--pixel-bg-card)',
          border: 'var(--pixel-border)',
          'border-muted': 'var(--pixel-border-muted)',
          accent: 'var(--pixel-accent)',
          gold: '#F5A623',
        },
      },
      fontFamily: {
        heading: ['var(--font-body)', 'Inter', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'sans-serif'],
        pixel: ["'Galmuri11'", 'monospace'],
      },
      boxShadow: {
        // 픽셀 하드 그림자 (블러 0)
        'pixel': '3px 3px 0px #000000',
        'pixel-sm': '2px 2px 0px #000000',
        'pixel-lg': '5px 5px 0px #000000',
        'pixel-hover': '0 0 15px rgba(233, 69, 96, 0.4), 2px 2px 0px #000000',
        // 네온 글로우 + 픽셀 그림자
        'neon-red': '0 0 10px rgba(233, 69, 96, 0.6), 0 0 20px rgba(233, 69, 96, 0.3), 3px 3px 0px #000000',
        'neon-orange': '0 0 10px rgba(255, 69, 0, 0.6), 0 0 20px rgba(255, 69, 0, 0.3), 3px 3px 0px #000000',
        'glass': '4px 4px 0px rgba(0, 0, 0, 0.6)',
      },
      // 픽셀 아트: 모든 rounded-* 를 각진 형태로 오버라이드
      borderRadius: {
        'none': '0px',
        'sm': '0px',
        DEFAULT: '0px',
        'md': '2px',
        'lg': '2px',
        'xl': '4px',
        '2xl': '4px',
        '3xl': '4px',
        'full': '4px',
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
