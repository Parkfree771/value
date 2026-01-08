import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // New Modern Fintech Palette
        'deep-black': '#050505',
        'electric-blue': {
          DEFAULT: '#2563EB',
          50: '#EBF3FF',
          100: '#D1E0FF',
          200: '#A3C1FF',
          300: '#75A2FF',
          400: '#4783FF',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#172554',
          950: '#0B1120',
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
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      boxShadow: {
        'neon-blue': '0 0 10px rgba(37, 99, 235, 0.5), 0 0 20px rgba(37, 99, 235, 0.3)',
        'neon-orange': '0 0 10px rgba(255, 69, 0, 0.5), 0 0 20px rgba(255, 69, 0, 0.3)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      },
      fontSize: {
        // 접근성을 위한 최소 폰트 크기 보장
        'xs': ['0.75rem', { lineHeight: '1rem' }],     // 12px (최소)
        'sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],    // 16px (기본)
        'lg': ['1.125rem', { lineHeight: '1.75rem' }], // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],  // 20px
      },
      screens: {
        'xs': '475px', // 추가: 아주 작은 모바일 대응
        // sm: 640px (기본)
        // md: 768px (기본)
        // lg: 1024px (기본)
        // xl: 1280px (기본)
        '2xl': '1536px', // 기본
      },
    },
  },
  plugins: [],
};
export default config;
