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
