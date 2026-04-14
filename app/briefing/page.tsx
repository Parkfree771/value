import { Metadata } from 'next';
import BriefingClient from './BriefingClient';

export const metadata: Metadata = {
  title: '글로벌 모닝 브리핑',
  description: '미국 주요 매체 분석 기반 시장 브리핑. 주요 지수, 원자재, 환율과 오늘의 핵심 이슈를 한눈에.',
  openGraph: {
    title: 'AntStreet - 글로벌 모닝 브리핑',
    description: '미국 주요 매체 분석 기반 시장 브리핑.',
  },
};

const STORAGE_BASE = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o`;

async function fetchJSON(filename: string, tag: string) {
  try {
    const res = await fetch(`${STORAGE_BASE}/${filename}?alt=media`, {
      next: { revalidate: false, tags: [tag, 'briefing-all'] },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function BriefingPage() {
  const [briefingUS, marketUS, briefingKR, marketKR, briefingJP, marketJP] = await Promise.all([
    fetchJSON('briefing.json', 'briefing-us'),
    fetchJSON('market.json', 'briefing-us'),
    fetchJSON('briefing_korea.json', 'briefing-kr'),
    fetchJSON('market_korea.json', 'briefing-kr'),
    fetchJSON('briefing_japan.json', 'briefing-jp'),
    fetchJSON('market_japan.json', 'briefing-jp'),
  ]);

  return (
    <BriefingClient
      data={{
        US: { briefing: briefingUS, market: marketUS },
        KR: { briefing: briefingKR, market: marketKR },
        JP: { briefing: briefingJP, market: marketJP },
      }}
    />
  );
}
