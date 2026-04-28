'use client';

import type { DartCompanyInfo, StockProfile } from '../types';
import { fmtPrice } from '../theme';

interface Props {
  companyName: string;
  companyInfo: DartCompanyInfo;
  stockProfile: StockProfile | null;
}

export function CompanyHeader({ companyName, companyInfo, stockProfile }: Props) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--theme-border-muted)] bg-gradient-to-br from-[var(--theme-bg-card)] to-[var(--theme-bg)] p-5 sm:p-7"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-2xl sm:text-[34px] font-black text-[var(--foreground)] leading-none tracking-tight truncate">
            {companyName}
          </h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="font-heading text-sm font-bold text-gray-400 dark:text-gray-500 tabular-nums">
              {companyInfo.stock_code}
            </span>
            {companyInfo.corp_cls && (
              <span className="inline-flex items-center font-heading text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {companyInfo.corp_cls === 'Y' ? 'KOSPI' : companyInfo.corp_cls === 'K' ? 'KOSDAQ' : companyInfo.corp_cls}
              </span>
            )}
            {companyInfo.ceo_nm && (
              <span className="font-sans text-xs text-gray-400 dark:text-gray-500">대표 {companyInfo.ceo_nm}</span>
            )}
          </div>
        </div>

        {stockProfile && (
          <div className="text-right flex-shrink-0">
            <p className="font-heading text-2xl sm:text-[34px] font-black text-[var(--foreground)] leading-none tabular-nums">
              {fmtPrice(stockProfile.currentPrice)}
            </p>
            <div className="flex items-center justify-end gap-3 sm:gap-4 mt-2 flex-wrap">
              {stockProfile.per !== null && (
                <span className="font-heading text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                  PER <b className="text-[var(--foreground)] tabular-nums ml-0.5">{stockProfile.per.toFixed(1)}</b>
                </span>
              )}
              {stockProfile.pbr !== null && (
                <span className="font-heading text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                  PBR <b className="text-[var(--foreground)] tabular-nums ml-0.5">{stockProfile.pbr.toFixed(2)}</b>
                </span>
              )}
              {stockProfile.eps !== null && (
                <span className="font-heading text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                  EPS <b className="text-[var(--foreground)] tabular-nums ml-0.5">{stockProfile.eps.toLocaleString()}</b>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
