import * as fs from 'fs';
import * as path from 'path';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { GURU_LIST } from '@/app/guru-tracker/types';
import {
  GuruPortfolioDoc,
  PortfolioHolding,
  Raw13FHolding,
} from '@/lib/sec13f/types';
import { compareHoldings } from '@/lib/sec13f/compareHoldings';
import PortfolioView, { QuarterView } from './components/PortfolioView';
import GuruDisclaimer from '@/app/guru-tracker/GuruDisclaimer';

const PORTFOLIOS_PATH = path.join(process.cwd(), 'data', 'guru-portfolios.json');

// ISR — guru-portfolios.json은 분기 1회 변경(git push로 새 빌드), guru_prices는 매일 06:30 KST cron 갱신.
// 1시간 주기면 cron 직후 최대 1시간 안에 새 가격 반영. (예전엔 cookies() 호출 때문에 매 요청 동적 렌더였음)
export const revalidate = 3600;

// 누적 스냅샷 스키마 (scripts/fetch-13f.ts와 동일)
interface QuarterHolding {
  cusip: string;
  ticker: string | null;
  exchange: string;
  name_of_issuer: string;
  title_of_class: string;
  value: number; // USD (천달러 변환 후)
  shares: number;
  weight: number;
  ticker_source: 'manual' | 'auto' | 'unmapped';
}

interface QuarterSnapshot {
  report_date: string;
  filing_date: string;
  accession_number: string;
  form: string;
  total_value: number;
  holdings_count: number;
  holdings: QuarterHolding[];
}

interface ExtendedGuruDoc extends GuruPortfolioDoc {
  quarters?: Record<string, QuarterSnapshot>;
}

interface PortfoliosJson {
  gurus: Record<string, ExtendedGuruDoc>;
}

function getPortfolio(slug: string): ExtendedGuruDoc | null {
  try {
    if (!fs.existsSync(PORTFOLIOS_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(PORTFOLIOS_PATH, 'utf-8')) as PortfoliosJson;
    return data.gurus?.[slug] ?? null;
  } catch (e) {
    console.error('[portfolio] JSON 로드 실패', e);
    return null;
  }
}

async function getPrices(): Promise<Record<string, { currentPrice: number; returnRate: number }>> {
  try {
    const rows = await sql`select ticker, current_price, return_rate from guru_prices`;
    const prices: Record<string, { currentPrice: number; returnRate: number }> = {};
    for (const r of rows) {
      prices[r.ticker] = {
        currentPrice: Number(r.current_price),
        returnRate: Number(r.return_rate),
      };
    }
    return prices;
  } catch (e) {
    console.error('[portfolio] 가격 로드 실패', e);
    return {};
  }
}

// QuarterSnapshot → Raw13FHolding[] (compareHoldings 입력용)
// value는 USD로 저장돼 있으므로 천달러 단위로 환원 후 비교 함수에 전달.
function snapshotToRaw(snap: QuarterSnapshot): Raw13FHolding[] {
  return snap.holdings
    .filter((h) => h.shares > 0)
    .map((h) => ({
      nameOfIssuer: h.name_of_issuer,
      titleOfClass: h.title_of_class,
      cusip: h.cusip,
      value: Math.round(h.value / 1000),
      shares: h.shares,
      sharesType: 'SH' as const,
      investmentDiscretion: '',
    }));
}

// 인접 분기쌍마다 compareHoldings 호출 → QuarterView[] (오름차순).
// 최신 분기쌍은 doc.holdings 그대로 사용 — price_at_filing 등 가격 메타 보존.
// 옛 분기쌍은 compareHoldings로 재계산되지만 historical filing 가격은 없어서 수익률은 "—".
// 가장 오래된 분기는 prev가 없으므로 비교 뷰에서 제외됨.
function buildQuarterViews(doc: ExtendedGuruDoc): QuarterView[] {
  if (!doc.quarters) {
    return [
      {
        report_date_curr: doc.report_date_curr,
        report_date_prev: doc.report_date_prev,
        filing_date_curr: doc.filing_date_curr,
        total_value_curr: doc.total_value_curr,
        total_value_prev: doc.total_value_prev,
        holdings_count: doc.holdings_count,
        holdings: doc.holdings,
      },
    ];
  }
  const dates = Object.keys(doc.quarters).sort();
  const views: QuarterView[] = [];
  for (let i = 1; i < dates.length; i++) {
    const prevSnap = doc.quarters[dates[i - 1]];
    const currSnap = doc.quarters[dates[i]];
    const isLatest = i === dates.length - 1;

    // 최신 분기는 doc.holdings 그대로 — price_at_filing 보존.
    const holdings: PortfolioHolding[] = isLatest
      ? doc.holdings
      : compareHoldings(snapshotToRaw(prevSnap), snapshotToRaw(currSnap));

    views.push({
      report_date_curr: currSnap.report_date,
      report_date_prev: prevSnap.report_date,
      filing_date_curr: currSnap.filing_date,
      total_value_curr: currSnap.total_value,
      total_value_prev: prevSnap.total_value,
      holdings_count: currSnap.holdings_count,
      holdings,
    });
  }
  return views;
}

export default async function PortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guruNameEn = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const guruInfo = GURU_LIST.find((g) => g.name_en === guruNameEn);

  if (!guruInfo) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="headline text-2xl">구루를 찾을 수 없습니다</h1>
        <Link href="/guru-tracker" className="btn-primary mt-5 inline-block text-sm">
          구루 목록으로
        </Link>
      </div>
    );
  }

  const [portfolio, prices] = await Promise.all([
    Promise.resolve(getPortfolio(slug)),
    getPrices(),
  ]);

  const quarterViews = portfolio ? buildQuarterViews(portfolio) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <Link href="/guru-tracker" className="text-xs font-bold hover:underline underline-offset-4">
        ← 구루 목록
      </Link>

      <header className="mt-4 mb-8">
        <p className="kicker">{guruInfo.style}</p>
        <h1 className="headline mt-1 text-[36px] sm:text-[46px] leading-tight">{guruInfo.name_kr}</h1>
        <p className="mt-1 text-sm text-[var(--theme-ink-soft)]">
          {guruInfo.name_en} · {guruInfo.filing_name}
        </p>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed break-keep">{guruInfo.catchphrase}</p>
      </header>

      {!portfolio || quarterViews.length === 0 ? (
        <p className="border-t-2 border-[var(--theme-border)] py-12 text-center text-sm text-[var(--theme-ink-soft)]">
          {guruInfo.name_kr}의 13F 공시 데이터를 준비하고 있습니다.
        </p>
      ) : (
        <PortfolioView quarterViews={quarterViews} prices={prices} />
      )}

      <GuruDisclaimer />
    </div>
  );
}
