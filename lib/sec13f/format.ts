// 13F 화면 공용 표기 — 금액 · 주식 수 · 분기 · 날짜

export function formatUsd(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export function formatShares(shares: number): string {
  if (shares >= 1e6) return `${(shares / 1e6).toFixed(2)}M`;
  if (shares >= 1e3) return `${(shares / 1e3).toFixed(0)}K`;
  return shares.toLocaleString();
}

/** '2026-03-31' → '2026년 1분기' */
export function quarterLabel(date: string): string {
  const [year, month] = date.split('-');
  return `${year}년 ${Math.floor((Number(month) - 1) / 3) + 1}분기`;
}

/** '2026-03-31' → '2026.03.31' */
export function dotDate(date: string): string {
  return date.replaceAll('-', '.');
}
