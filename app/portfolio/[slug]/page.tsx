import * as fs from 'fs';
import * as path from 'path';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { GURU_LIST } from '@/app/guru-tracker/types';
import { GuruPortfolioDoc } from '@/lib/sec13f/types';
import PortfolioSummary from './components/PortfolioSummary';
import PortfolioTable from './components/PortfolioTable';
import BackButton from './BackButton';

const PORTFOLIOS_PATH = path.join(process.cwd(), 'data', 'guru-portfolios.json');

// 빌드 시점에 정적 prerender — guru-portfolios.json은 분기 1회 변경.
// 새 분기 데이터 갱신 시 git push로 새 빌드가 캐시 무효화.
export const revalidate = 86400;

interface PortfoliosJson {
  gurus: Record<string, GuruPortfolioDoc>;
}

function getPortfolio(slug: string): GuruPortfolioDoc | null {
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
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: rows } = await supabase
      .from('guru_prices')
      .select('ticker, current_price, return_rate');
    if (!rows) return {};
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

export default async function PortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guruNameEn = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const guruInfo = GURU_LIST.find((g) => g.name_en === guruNameEn);

  if (!guruInfo) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card-base p-6 sm:p-12 text-center">
          <div className="text-4xl font-bold text-gray-300 dark:text-gray-600 mb-4">404</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">구루를 찾을 수 없습니다</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            요청하신 투자 거장의 정보를 찾을 수 없습니다.
          </p>
          <Link href="/guru-tracker" className="btn-primary inline-block">
            구루 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 포트폴리오는 정적 JSON (분기 1회), 가격은 Supabase (매일 cron). 병렬 fetch.
  const [portfolio, prices] = await Promise.all([
    Promise.resolve(getPortfolio(slug)),
    getPrices(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <BackButton />
      </div>

      {/* 구루 헤더 섹션 */}
      <section
        className="mb-6 sm:mb-8 bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border)] rounded-2xl p-6 sm:p-8 relative overflow-hidden"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="relative z-10">
          <div className="text-center sm:text-left">
            <div className="inline-block mb-3 px-4 py-1.5 rounded-xl border-2 border-ant-red-600 dark:border-ant-red-400 bg-ant-red-50 dark:bg-ant-red-950/30">
              <span className="text-xs font-bold tracking-widest text-ant-red-600 dark:text-ant-red-400 uppercase">
                {guruInfo.style}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground mb-2 tracking-tight text-shadow-md">
              {guruInfo.name_kr}
            </h1>
            <p className="text-lg sm:text-xl text-ant-red-600 dark:text-ant-red-400 mb-3 font-bold">
              {guruInfo.name_en}
            </p>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 max-w-2xl">
              {guruInfo.catchphrase}
            </p>
            <div
              className="inline-block px-4 py-2 rounded-xl border-2 border-[var(--theme-border-muted)] bg-[var(--theme-bg)]"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">운용사</p>
              <p className="text-sm font-bold text-foreground">{guruInfo.filing_name}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 포트폴리오 섹션 */}
      <section>
        <h2 className="text-xl sm:text-2xl font-black text-foreground mb-4 tracking-wider uppercase">
          13F PORTFOLIO
        </h2>

        {!portfolio ? (
          <div className="card-base p-6 sm:p-12 text-center">
            <div className="text-4xl font-bold text-gray-300 dark:text-gray-600 mb-4">13F</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">포트폴리오 데이터 준비중</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {guruInfo.name_kr}의 13F 공시 데이터를 곧 추가할 예정입니다.
            </p>
          </div>
        ) : (
          <>
            <PortfolioSummary portfolio={portfolio} />
            <PortfolioTable
              holdings={portfolio.holdings}
              filingDate={portfolio.filing_date_curr}
              prices={prices}
            />
          </>
        )}
      </section>

      {/* 면책 조항 */}
      <section
        className="mt-12 p-6 sm:p-8 bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-muted)] border-l-4 sm:border-l-[6px] border-l-ant-red-600 dark:border-l-ant-red-400 rounded-2xl"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <h3 className="text-base sm:text-lg font-bold text-foreground mb-4 tracking-wide uppercase">
          13F 공시의 &apos;135일 시차&apos; 주의사항
        </h3>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p className="leading-relaxed">
            13F 보고서는 분기 종료 후 45일 뒤에 공개됩니다. 따라서 구루가 실제로 매수한 시점과 공개 시점 사이에
            <strong className="text-ant-red-600 dark:text-ant-red-400"> 최대 135일의 시차</strong>가 발생할 수 있습니다.
          </p>
          <p className="leading-relaxed">
            본 사이트의 수익률 추적은 <strong>&quot;공시된 가격(분기 말)을 기준으로 따라 샀을 때&quot;</strong>를 가정한
            시뮬레이션입니다. 구루들의 실제 진입 시점 및 수익률과는 차이가 있으며,
            재미와 인사이트 발견을 위한 데이터로만 참고해 주시기 바랍니다.
          </p>
        </div>
        <div className="mt-6 pt-4 border-t-2 border-[var(--theme-border-muted)] text-xs text-gray-600 dark:text-gray-400 space-y-2">
          <div className="flex gap-2"><strong className="font-bold text-ant-red-600 dark:text-ant-red-400">TIME LAG:</strong> <span>13F 공시는 매수 시점으로부터 최대 135일 지연된 데이터일 수 있습니다.</span></div>
          <div className="flex gap-2"><strong className="font-bold text-ant-red-600 dark:text-ant-red-400">TRACKING METHOD:</strong> <span>표기된 수익률은 공시된 보고서 가격 대비 현재가를 산출한 것으로, 해당 투자자의 실제 평단가와는 무관합니다.</span></div>
          <div className="flex gap-2"><strong className="font-bold text-ant-red-600 dark:text-ant-red-400">FOR ENTERTAINMENT:</strong> <span>이 데이터는 투자 권유가 아니며, 유명 투자자들의 포트폴리오를 기반으로 한 후행적 분석 시뮬레이션입니다. 실제 투자의 책임은 본인에게 있습니다.</span></div>
        </div>
      </section>
    </div>
  );
}
