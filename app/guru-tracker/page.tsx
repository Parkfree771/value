import * as fs from 'fs';
import * as path from 'path';
import Link from 'next/link';
import { GURU_LIST, type GuruInfo } from './types';
import GuruDisclaimer from './GuruDisclaimer';
import type { GuruPortfolioDoc } from '@/lib/sec13f/types';
import { formatUsd, quarterLabel } from '@/lib/sec13f/format';

// 구루 목록 — 신문 지면 3단. 서버에서 공시 데이터를 읽어 요약만 싣는다 (클라이언트 JS 0KB).

const guruSlug = (guru: GuruInfo) => guru.name_en.toLowerCase().replace(/\s+/g, '-');

function loadPortfolios(): Record<string, GuruPortfolioDoc> {
  try {
    const file = path.join(process.cwd(), 'data', 'guru-portfolios.json');
    return (JSON.parse(fs.readFileSync(file, 'utf-8')) as { gurus?: Record<string, GuruPortfolioDoc> }).gurus ?? {};
  } catch (e) {
    console.error('[guru-tracker] JSON 로드 실패', e);
    return {};
  }
}

function GuruEntry({ guru, doc, index }: { guru: GuruInfo; doc?: GuruPortfolioDoc; index: number }) {
  const top = doc
    ? [...doc.holdings].sort((a, b) => b.weight_curr - a.weight_curr).filter((h) => h.ticker).slice(0, 3)
    : [];
  const newBuys = doc?.holdings.filter((h) => h.status === 'NEW BUY').length ?? 0;
  const soldOut = doc?.holdings.filter((h) => h.status === 'SOLD OUT').length ?? 0;

  return (
    <article
      className={`py-5 border-b border-[var(--theme-border-muted)] sm:px-5 ${index % 2 === 0 ? 'sm:pl-0 sm:border-r' : 'sm:pr-0'} lg:border-r lg:px-5 ${index % 3 === 0 ? 'lg:pl-0' : 'lg:pl-5'} ${index % 3 === 2 ? 'lg:pr-0 lg:border-r-0' : 'lg:pr-5'}`}
    >
      <Link href={`/portfolio/${guruSlug(guru)}`} className="group flex h-full flex-col">
        <p className="kicker">{guru.style}</p>
        <h2 className="headline mt-1 text-[24px] leading-tight group-hover:underline underline-offset-4">{guru.name_kr}</h2>
        <p className="mt-0.5 text-xs text-[var(--theme-ink-soft)]">{guru.filing_name}</p>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--theme-ink-soft)] break-keep">{guru.catchphrase}</p>

        {doc && (
          <dl className="mt-4 space-y-1.5 border-t border-[var(--theme-border-muted)] pt-3 text-[13px]">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[var(--theme-ink-soft)]">운용 규모</dt>
              <dd className="font-mono font-bold tabular-nums">
                {formatUsd(doc.total_value_curr)} · {doc.holdings_count}종목
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="flex-shrink-0 text-[var(--theme-ink-soft)]">상위 종목</dt>
              <dd className="truncate font-mono font-bold">{top.map((h) => h.ticker).join(' · ')}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[var(--theme-ink-soft)]">이번 분기</dt>
              <dd className="font-bold tabular-nums">
                <span className="text-[var(--color-up)]">신규 {newBuys}</span>
                <span className="mx-1.5 font-normal text-[var(--theme-ink-soft)]">·</span>
                <span className="text-[var(--color-down)]">전량매도 {soldOut}</span>
              </dd>
            </div>
          </dl>
        )}
      </Link>
    </article>
  );
}

export default function GuruTrackerPage() {
  const portfolios = loadPortfolios();
  const latestReport = Object.values(portfolios).map((p) => p.report_date_curr).sort().at(-1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b-2 border-[var(--theme-border)] pb-3">
        <div>
          <h1 className="headline text-[32px] sm:text-[40px] leading-tight">구루 포트폴리오</h1>
          <p className="mt-1 text-sm text-[var(--theme-ink-soft)] break-keep">
            투자 거장들이 무엇을 사고 팔았는지, SEC 13F 공시로 분기마다 추적합니다.
          </p>
        </div>
        {latestReport && <p className="text-xs text-[var(--theme-ink-soft)]">{quarterLabel(latestReport)} 공시 기준</p>}
      </header>

      <section aria-label="구루 목록" className="grid sm:grid-cols-2 lg:grid-cols-3">
        {GURU_LIST.map((guru, i) => (
          <GuruEntry key={guru.name_en} guru={guru} doc={portfolios[guruSlug(guru)]} index={i} />
        ))}
      </section>

      <GuruDisclaimer />
    </div>
  );
}
