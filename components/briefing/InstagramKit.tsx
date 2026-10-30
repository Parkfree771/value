'use client';

// 모닝 브리핑 — 관리자에게만 보이는 인스타 게시용 묶음. 카드 5장(캐러셀) · 같은 5장 릴스 · 캡션 복사.
// 휴대폰에서 열어 카드를 길게 눌러 사진첩에 저장 → 인스타 앱에서 바로 게시하는 용도.

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface KitCard {
  index: number;
  tag?: string;
  headline: string;
  image: string;
}

interface Manifest {
  date: string;
  cover_hook?: string;
  cards: KitCard[];
  reel: string;
  caption: string;
}

export default function InstagramKit() {
  const { isAdmin } = useAuth();
  const [manifest, setManifest] = useState<Manifest | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetch('/api/admin/instagram', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { manifest: null }))
      .then((data) => { if (!cancelled) setManifest(data.manifest ?? null); })
      .catch(() => { if (!cancelled) setManifest(null); });
    return () => { cancelled = true; };
  }, [isAdmin]);

  if (!isAdmin) return null;

  const copyCaption = async () => {
    if (!manifest) return;
    try {
      await navigator.clipboard.writeText(manifest.caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-label="인스타 게시용 (관리자)" className="my-8 border-2 border-[var(--theme-border)] bg-[var(--theme-bg-card)]">
      <div className="flex items-baseline justify-between gap-3 px-4 py-3 bg-[var(--theme-border)] text-[var(--theme-bg-card)]">
        <h2 className="font-bold text-sm sm:text-base">인스타 게시용 · 관리자만 보임</h2>
        {manifest && <span className="text-xs opacity-80">{manifest.date.replace(/-/g, '.')}</span>}
      </div>

      {manifest === undefined && <p className="px-4 py-6 text-sm text-[var(--theme-ink-soft)]">불러오는 중…</p>}
      {manifest === null && (
        <p className="px-4 py-6 text-sm text-[var(--theme-ink-soft)]">최근 7일 안에 만든 인스타 카드가 없어요. 새벽 배치가 끝나면 여기에 올라옵니다.</p>
      )}

      {manifest && (
        <div className="p-4 space-y-6">
          <div>
            <p className="text-xs font-bold text-[var(--theme-ink-soft)]">
              카드 {manifest.cards.length}장 — 길게 눌러 사진첩에 저장, 순서대로 캐러셀에 올리세요
            </p>
            <div className="mt-2 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4">
              {manifest.cards.map((c, i) => (
                <a
                  key={c.image}
                  href={c.image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="snap-start flex-shrink-0 w-[62vw] sm:w-[220px] group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.image} alt={`카드 ${i + 1}: ${c.headline}`} className="w-full aspect-[4/5] object-cover border border-[var(--theme-border-muted)]" loading="lazy" />
                  <p className="mt-1 text-xs text-[var(--theme-ink-soft)] truncate group-hover:underline">
                    {i + 1}. {c.headline}
                  </p>
                </a>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-[200px_1fr] gap-4">
            <div>
              <p className="text-xs font-bold text-[var(--theme-ink-soft)]">릴스 (같은 5장 · 15초)</p>
              <video src={manifest.reel} controls playsInline preload="metadata" className="mt-2 w-[50vw] sm:w-full aspect-[9/16] bg-black" />
              <a href={manifest.reel} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-bold hover:underline">
                영상 파일 열기 →
              </a>
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[var(--theme-ink-soft)]">캡션</p>
                <button type="button" onClick={copyCaption} className="btn-primary text-xs px-3 py-1.5">
                  {copied ? '복사됨' : '캡션 복사'}
                </button>
              </div>
              <pre className="mt-2 whitespace-pre-wrap break-keep font-sans text-[13px] leading-relaxed p-3 bg-[var(--theme-bg-input)] border border-[var(--theme-border-muted)]">
                {manifest.caption}
              </pre>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
