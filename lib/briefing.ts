// 모닝 브리핑 — scripts/news 배치(GitHub Actions news-briefing)가 만든 briefing/briefing.json (Neon Storage 공개 버킷)
// 해외 매체 RSS 를 모아 매일 아침 경제 이슈 10개로 새로 쓴 결과. 날짜별 사본은 briefing/archive/{YYYY-MM-DD}.json
// 서버 전용. 홈 ISR 재생성 때 읽는다.

import { publicUrl } from '@/lib/storage';

export interface BriefingIssue {
  headline: string;
  summary: string;
  tags?: string[];
  covered_by?: string[];
  importance?: 'high' | 'medium' | 'low' | string;
}

export interface Briefing {
  generatedAt: string;   // ISO
  sourceArticles: number;
  issues: BriefingIssue[];
  /** 마지막 발행이 36시간보다 오래됐는지 — 화면에 "최근 발행일"을 분명히 표시하는 데 쓴다 */
  isStale: boolean;
}

const STALE_MS = 36 * 60 * 60 * 1000;

export async function getBriefing(): Promise<Briefing | null> {
  try {
    if (!process.env.AWS_ENDPOINT_URL_S3) return null;
    const res = await fetch(publicUrl('briefing/briefing.json'), { next: { revalidate: 900 } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      generated_at?: string;
      source_articles?: number;
      issues?: BriefingIssue[];
    };
    if (!json.generated_at || !Array.isArray(json.issues)) return null;
    return {
      generatedAt: json.generated_at,
      sourceArticles: json.source_articles ?? 0,
      issues: json.issues.slice(0, 10).map((i) => ({
        headline: i.headline,
        summary: i.summary,
        tags: i.tags?.slice(0, 3),
        covered_by: i.covered_by,
        importance: i.importance,
      })),
      isStale: Date.now() - new Date(json.generated_at).getTime() > STALE_MS,
    };
  } catch (err) {
    console.error('[briefing] fetch failed:', err);
    return null;
  }
}
