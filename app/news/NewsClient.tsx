'use client';

import { useState } from 'react';
import Container from '@/components/Container';

interface NewsArticle {
  title_ko: string;
  title_en: string;
  source: string;
  published: string;
  summary_ko: string;
  link: string;
  image?: string;
}

interface NewsCategory {
  name: string;
  icon: string;
  articles: NewsArticle[];
}

interface NewsData {
  generated_at: string;
  generated_at_kr: string;
  total_articles: number;
  categories: Record<string, NewsCategory>;
}

const CATEGORY_ORDER = [
  'finance',
  'us_major',
  'global_top',
  'europe',
  'middle_east_asia',
  'tech_ai',
];

const CATEGORY_LABELS: Record<string, string> = {
  finance: '경제 / 금융',
  us_major: '미국',
  global_top: '글로벌',
  europe: '유럽',
  middle_east_asia: '중동 / 아시아',
  tech_ai: '테크 / AI',
};

function formatKST(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' KST';
  } catch {
    return dateStr;
  }
}

export default function NewsClient({ initialData }: { initialData: NewsData | null }) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  if (!initialData) {
    return (
      <Container maxWidth="xl">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-xl mb-2 opacity-30">NEWS</p>
            <p className="text-muted text-sm">뉴스 데이터가 없습니다.</p>
          </div>
        </div>
      </Container>
    );
  }

  const data = initialData;
  const availableCategories = CATEGORY_ORDER.filter((key) => data.categories[key]);

  const displayCategories =
    activeCategory === 'all'
      ? availableCategories
      : availableCategories.filter((key) => key === activeCategory);

  return (
    <>
      <Container maxWidth="xl">
        {/* 헤더 */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">글로벌 뉴스 브리핑</h1>
          <p className="text-muted text-sm">
            {data.generated_at_kr} 업데이트 · {data.total_articles}개 주요 기사
          </p>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveCategory('all')}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border-2 ${
              activeCategory === 'all'
                ? 'bg-[var(--theme-accent)] text-white border-[var(--theme-accent)]'
                : 'bg-[var(--theme-bg-card)] text-[var(--foreground)] border-[var(--theme-border-muted)] hover:border-[var(--theme-accent)]'
            }`}
          >
            전체
          </button>
          {availableCategories.map((key) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border-2 ${
                activeCategory === key
                  ? 'bg-[var(--theme-accent)] text-white border-[var(--theme-accent)]'
                  : 'bg-[var(--theme-bg-card)] text-[var(--foreground)] border-[var(--theme-border-muted)] hover:border-[var(--theme-accent)]'
              }`}
            >
              {CATEGORY_LABELS[key] || data.categories[key].name}
            </button>
          ))}
        </div>

        {/* 뉴스 섹션 */}
        {displayCategories.map((catKey) => {
          const category = data.categories[catKey];
          return (
            <section key={catKey} className="mb-8 sm:mb-10">
              {activeCategory === 'all' && (
                <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-[var(--theme-border-muted)]">
                  <h2 className="text-lg sm:text-xl font-bold">{category.name}</h2>
                  <span className="text-xs text-muted bg-[var(--theme-bg)] px-2 py-0.5 rounded-full">
                    {category.articles.length}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.articles.map((article, idx) => (
                  <NewsCard
                    key={`${catKey}-${idx}`}
                    article={article}
                    onClick={() => setSelectedArticle(article)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </Container>

      {/* 모달 */}
      {selectedArticle && (
        <NewsModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </>
  );
}

function NewsCard({ article, onClick }: { article: NewsArticle; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card-interactive flex flex-col overflow-hidden group text-left w-full"
    >
      {/* 썸네일 */}
      {article.image ? (
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-[var(--theme-bg)]">
          <img
            src={article.image}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : (
        <SourcePlaceholder source={article.source} />
      )}

      {/* 콘텐츠 */}
      <div className="flex flex-col flex-1 p-4">
        {/* 매체 */}
        <span className="text-xs font-semibold text-[var(--theme-accent)] bg-[var(--theme-accent)]/10 px-2 py-0.5 rounded w-fit mb-1.5">
          {article.source}
        </span>

        {/* 한국시간 */}
        <p className="text-xs font-bold text-[var(--foreground)] mb-3">
          {formatKST(article.published)}
        </p>

        {/* 한국어 제목 */}
        <h3 className="text-sm sm:text-[0.95rem] font-bold leading-snug mb-2 line-clamp-2 group-hover:text-[var(--theme-accent)] transition-colors">
          {article.title_ko}
        </h3>

        {/* 요약 */}
        <p className="text-xs text-muted leading-relaxed line-clamp-2 mt-auto">
          {article.summary_ko}
        </p>
      </div>
    </button>
  );
}

const SOURCE_COLORS: Record<string, string> = {
  'BBC': '#BB1919',
  'NYT': '#1A1A1A',
  'CNBC': '#005594',
  'CNN': '#CC0000',
  'NPR': '#6B6B6B',
  'Washington Post': '#2D2D2D',
  'Fox Business': '#003366',
  'NY Post': '#C41E3A',
  'MarketWatch': '#1E8C45',
  'Seeking Alpha': '#F58220',
  'Nasdaq': '#0096D6',
  'The Motley Fool': '#4B2D85',
  'Guardian': '#052962',
  'France 24': '#2E55A0',
  'EuroNews': '#003399',
  'The Irish Times': '#003B5C',
  'Al Jazeera': '#D2982A',
  'Asia Times': '#8B0000',
  'SCMP': '#FFD700',
  'The Hindu': '#1A3C7A',
  'Times of India': '#E03A3E',
  'TechCrunch': '#0A9E01',
  'The Verge': '#E84646',
  'Ars Technica': '#FF4500',
  'Wired': '#000000',
  'MIT Technology Review': '#9B1D20',
};

function getSourceColor(source: string): string {
  for (const [key, color] of Object.entries(SOURCE_COLORS)) {
    if (source.includes(key)) return color;
  }
  return '#3b50b5';
}

function SourcePlaceholder({ source }: { source: string }) {
  const color = getSourceColor(source);
  // 매체 이름에서 괄호 부분 제거 (예: "BBC (World)" → "BBC")
  const shortName = source.replace(/\s*\(.*\)/, '');
  return (
    <div
      className="w-full aspect-[16/9] flex items-center justify-center"
      style={{ backgroundColor: color }}
    >
      <span className="text-white font-bold text-lg tracking-wide opacity-90">
        {shortName}
      </span>
    </div>
  );
}

function NewsModal({ article, onClose }: { article: NewsArticle; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 모달 콘텐츠 */}
      <div
        className="relative w-full max-w-lg card-base p-0 overflow-hidden animate-[modalIn_0.2s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 이미지 */}
        {article.image && (
          <div className="w-full overflow-hidden bg-[var(--theme-bg)] flex justify-center">
            <img
              src={article.image}
              alt=""
              className="w-full max-h-[300px] object-cover"
            />
          </div>
        )}

        {/* 본문 */}
        <div className="p-5 sm:p-6">
          {/* 매체 + 한국시간 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-[var(--theme-accent)] border-2 border-[var(--theme-accent)] px-2 py-0.5 rounded">
              {article.source}
            </span>
            <span className="text-xs text-muted">
              {formatKST(article.published)}
            </span>
          </div>

          {/* 한국어 제목 */}
          <h2 className="text-lg sm:text-xl font-bold leading-snug mb-4">
            {article.title_ko}
          </h2>

          {/* 요약 */}
          <p className="text-sm leading-relaxed mb-6 text-[var(--foreground)]">
            {article.summary_ko}
          </p>

          {/* 원문 보기 버튼 */}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2 !text-sm"
          >
            원문 보기
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
