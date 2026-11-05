'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StockSearchInput from '@/components/StockSearchInput';
import { useAuth } from '@/contexts/AuthContext';
import type { BrokerOpinion, BrokerReport } from '@/lib/brokerReports';
import type { StockData } from '@/types/stock';

// 자주 쓰는 증권사 — 자유 입력도 된다
const BROKERS = [
  '미래에셋증권', '한국투자증권', 'NH투자증권', '삼성증권', 'KB증권', '키움증권', '하나증권', '신한투자증권',
  '한화투자증권', '대신증권', '메리츠증권', '유안타증권',
  'Goldman Sachs', 'J.P. Morgan', 'Morgan Stanley', 'Nomura', 'Citi', 'BofA Securities', 'UBS', 'Macquarie', 'CLSA', 'Jefferies',
];

const OPINIONS: { value: BrokerOpinion; label: string }[] = [
  { value: 'buy', label: '매수' },
  { value: 'hold', label: '중립' },
  { value: 'sell', label: '매도' },
];

const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const toNum = (s: string) => {
  const n = Number(s.replace(/[^\d.]/g, ''));
  return s.trim() && Number.isFinite(n) && n > 0 ? n : null;
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="pixel-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--theme-ink-soft)]">{hint}</span>}
    </label>
  );
}

export default function ExpertWriteForm({ initial }: { initial: BrokerReport | null }) {
  const router = useRouter();
  const { isAdmin, authReady } = useAuth();
  const isEdit = !!initial;

  const [stock, setStock] = useState<StockData | null>(
    initial
      ? {
          symbol: initial.ticker,
          name: initial.stockName,
          currentPrice: initial.currentPrice,
          currency: initial.currency,
          exchange: initial.exchange,
          marketCap: 0,
          per: null,
          pbr: null,
          eps: null,
        }
      : null,
  );
  const [broker, setBroker] = useState(initial?.broker ?? '');
  const [reportDate, setReportDate] = useState(initial?.reportDate ?? kstToday());
  const [reportTitle, setReportTitle] = useState(initial?.reportTitle ?? '');
  const [opinion, setOpinion] = useState<BrokerOpinion>(initial?.opinion ?? 'buy');
  const [opinionRaw, setOpinionRaw] = useState(initial?.opinionRaw ?? '');
  const [targetPrice, setTargetPrice] = useState(initial?.targetPrice ? String(initial.targetPrice) : '');
  const [prevTargetPrice, setPrevTargetPrice] = useState(initial?.prevTargetPrice ? String(initial.prevTargetPrice) : '');
  const [headline, setHeadline] = useState(initial?.headline ?? '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authReady) return <div className="py-16" />;
  if (!isAdmin) {
    return (
      <p className="py-16 text-center text-sm text-[var(--theme-ink-soft)]">
        관리자만 등록할 수 있습니다. <Link href="/expert" className="font-bold underline underline-offset-4">전문가 추적으로</Link>
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stock) return setError('종목을 선택하세요.');
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/broker-reports', {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: initial?.id,
          broker,
          ticker: stock.symbol,
          exchange: stock.exchange,
          currency: stock.currency,
          stockName: stock.name,
          reportDate,
          reportTitle,
          opinion,
          opinionRaw,
          targetPrice: toNum(targetPrice),
          prevTargetPrice: toNum(prevTargetPrice),
          headline,
          summary,
          sourceUrl,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? '저장 실패');
      router.push(`/expert/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!initial || !confirm('이 리포트를 삭제할까요?')) return;
    const res = await fetch(`/api/admin/broker-reports?id=${initial.id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      router.push('/expert');
      router.refresh();
    } else setError('삭제 실패');
  };

  return (
    <form onSubmit={submit} className="write-page mx-auto max-w-2xl">
      <header className="border-b-2 border-[var(--theme-border)] pb-3">
        <p className="kicker">전문가 추적</p>
        <h1 className="headline mt-1 text-[28px] leading-tight">{isEdit ? '리포트 수정' : '리포트 등록'}</h1>
        <p className="mt-1 text-sm text-[var(--theme-ink-soft)] break-keep">
          원문을 읽고 우리 말로 정리해 주세요. 발간일 종가는 저장할 때 자동으로 확정되고, 이후 수익률은 매일 갱신됩니다.
        </p>
      </header>

      <div className="mt-6 space-y-5">
        <div>
          <span className="pixel-label">종목</span>
          <StockSearchInput onStockSelect={(s) => setStock(s)} selectedStock={stock} hideLabel />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="증권사">
            <input className="pixel-input" list="broker-list" value={broker} onChange={(e) => setBroker(e.target.value)} required />
            <datalist id="broker-list">
              {BROKERS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </Field>
          <Field label="발간일" hint="이날 종가에 샀다고 보고 수익률을 계산합니다">
            <input type="date" className="pixel-input" value={reportDate} max={kstToday()} onChange={(e) => setReportDate(e.target.value)} required />
          </Field>
          <Field label="원문 제목" hint="선택 — 원문 리포트 제목 그대로">
            <input className="pixel-input" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} />
          </Field>
        </div>

        <div>
          <span className="pixel-label">투자의견</span>
          <div className="flex flex-wrap items-center gap-2">
            {OPINIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setOpinion(o.value)}
                aria-pressed={opinion === o.value}
                className={`min-h-9 rounded-sm border px-4 text-sm font-bold ${
                  opinion === o.value
                    ? 'border-[var(--theme-border)] bg-[var(--foreground)] text-[var(--background)]'
                    : 'border-[var(--theme-border-control)] text-[var(--theme-ink-soft)]'
                }`}
              >
                {o.label}
              </button>
            ))}
            <input
              className="pixel-input !w-44"
              placeholder="원문 표기 (예: Overweight)"
              value={opinionRaw}
              onChange={(e) => setOpinionRaw(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={`목표가${stock ? ` (${stock.currency})` : ''}`} hint="없으면 비워 두세요">
            <input className="pixel-input font-mono" inputMode="decimal" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} />
          </Field>
          <Field label="직전 목표가" hint="상향·하향이면 입력">
            <input className="pixel-input font-mono" inputMode="decimal" value={prevTargetPrice} onChange={(e) => setPrevTargetPrice(e.target.value)} />
          </Field>
        </div>

        <Field label="한 줄 요약" hint="목록과 검색결과에 나옵니다 (60자 안팎)">
          <input className="pixel-input" value={headline} maxLength={120} onChange={(e) => setHeadline(e.target.value)} required />
        </Field>

        <Field label="핵심 정리" hint="한 줄에 근거 하나씩. 원문 문장을 옮기지 말고 우리 말로 써 주세요">
          <textarea
            className="pixel-input min-h-40 leading-relaxed"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={'3분기 영업이익 946억원, 컨센서스 11% 상회\n면세점 적자 축소로 이익 개선 본격화\n목표가 12만원 — 12개월 PER 10배 적용'}
          />
        </Field>

        <Field label="원문 링크" hint="증권사 공개 페이지나 PDF 주소 (선택)">
          <input className="pixel-input" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" />
        </Field>
      </div>

      {error && (
        <p className="mt-5 border-l-2 border-[var(--color-error)] bg-[var(--theme-bg)] px-3 py-2 text-sm text-[var(--color-error)]">{error}</p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--theme-border-muted)] pt-4">
        {isEdit ? (
          <button type="button" onClick={remove} className="min-h-9 text-sm font-bold text-[var(--color-error)] hover:underline">
            삭제
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Link href={isEdit ? `/expert/${initial!.id}` : '/expert'} className="btn-secondary inline-flex min-h-9 items-center text-sm">
            취소
          </Link>
          <button type="submit" disabled={saving} className="btn-primary min-h-9 text-sm disabled:opacity-50">
            {saving ? '가격 확인 중…' : isEdit ? '수정' : '등록'}
          </button>
        </div>
      </div>
    </form>
  );
}
