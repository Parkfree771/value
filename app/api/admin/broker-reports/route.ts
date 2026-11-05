// /api/admin/broker-reports — 전문가 추적 리포트 등록·수정·삭제 (관리자 전용)
//   POST   { ...BrokerReportInput }          → { id }   발간일 종가를 KIS 일봉으로 확정
//   PUT    { id, ...BrokerReportInput }      → { id }   종목·발간일이 바뀌면 기준가 다시 확정
//   DELETE ?id=
import { NextRequest, NextResponse } from 'next/server';
import { invalidateBroker } from '@/lib/cache';
import { sql } from '@/lib/db';
import { verifyAdmin } from '@/lib/admin/adminVerify';
import { parseBrokerReportInput, resolvePrices } from '@/lib/brokerReports';
import { pingIndexNow } from '@/lib/indexnow';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://antstreet.kr').replace(/\/$/, '');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh(id?: string) {
  // 목록·상세·홈 통합 순위·사이트맵이 같은 broker 캐시를 쓴다 (lib/cache.ts)
  invalidateBroker();
  if (id) {
    pingIndexNow([`${SITE_URL}/expert/${id}`, `${SITE_URL}/expert`]).catch(() => {});
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const parsed = parseBrokerReportInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.value;

  try {
    const prices = await resolvePrices(v.ticker, v.exchange, v.reportDate);
    if ('error' in prices) return NextResponse.json({ error: prices.error }, { status: 422 });
    const returnRate = ((prices.currentPrice - prices.basePrice) / prices.basePrice) * 100;

    const [row] = await sql`
      insert into broker_reports (
        broker, analyst, ticker, exchange, currency, stock_name, report_date, report_title,
        opinion, opinion_raw, target_price, prev_target_price, headline, summary, source_url,
        base_price, current_price, return_rate, created_by
      ) values (
        ${v.broker}, ${v.analyst}, ${v.ticker}, ${v.exchange}, ${v.currency}, ${v.stockName}, ${v.reportDate}::date,
        ${v.reportTitle}, ${v.opinion}, ${v.opinionRaw}, ${v.targetPrice}, ${v.prevTargetPrice}, ${v.headline},
        ${v.summary}, ${v.sourceUrl}, ${prices.basePrice}, ${prices.currentPrice}, ${returnRate.toFixed(2)}, ${admin.uid}
      )
      returning id`;
    // 가격 cron 이 이 종목도 갱신하도록 (이미 있으면 그대로)
    await sql`
      insert into current_prices (ticker, exchange, current_price) values (${v.ticker}, ${v.exchange}, ${prices.currentPrice})
      on conflict (ticker) do nothing`;

    refresh(row.id);
    return NextResponse.json({ id: row.id, basePrice: prices.basePrice, baseDate: prices.baseDate });
  } catch (e) {
    console.error('[admin/broker-reports POST]', e);
    return NextResponse.json({ error: '저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!UUID_RE.test(id)) return NextResponse.json({ error: '잘못된 id' }, { status: 400 });
  const parsed = parseBrokerReportInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.value;

  try {
    const [prev] = await sql`select ticker, report_date::text as report_date, base_price from broker_reports where id = ${id}`;
    if (!prev) return NextResponse.json({ error: '없는 리포트입니다.' }, { status: 404 });

    // 종목이나 발간일이 바뀌었을 때만 기준가를 다시 잡는다
    let basePrice = Number(prev.base_price);
    let currentPrice: number | null = null;
    if (prev.ticker !== v.ticker || prev.report_date !== v.reportDate) {
      const prices = await resolvePrices(v.ticker, v.exchange, v.reportDate);
      if ('error' in prices) return NextResponse.json({ error: prices.error }, { status: 422 });
      basePrice = prices.basePrice;
      currentPrice = prices.currentPrice;
    }

    await sql`
      update broker_reports set
        broker = ${v.broker}, analyst = ${v.analyst}, ticker = ${v.ticker}, exchange = ${v.exchange},
        currency = ${v.currency}, stock_name = ${v.stockName}, report_date = ${v.reportDate}::date,
        report_title = ${v.reportTitle}, opinion = ${v.opinion}, opinion_raw = ${v.opinionRaw},
        target_price = ${v.targetPrice}, prev_target_price = ${v.prevTargetPrice},
        headline = ${v.headline}, summary = ${v.summary}, source_url = ${v.sourceUrl},
        base_price = ${basePrice},
        current_price = coalesce(${currentPrice}::numeric, current_price),
        return_rate = round(((coalesce(${currentPrice}::numeric, current_price) - ${basePrice}::numeric) / ${basePrice}::numeric * 100)::numeric, 2)
      where id = ${id}`;

    refresh(id);
    return NextResponse.json({ id });
  } catch (e) {
    console.error('[admin/broker-reports PUT]', e);
    return NextResponse.json({ error: '수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  const id = request.nextUrl.searchParams.get('id') ?? '';
  if (!UUID_RE.test(id)) return NextResponse.json({ error: '잘못된 id' }, { status: 400 });
  try {
    await sql`delete from broker_reports where id = ${id}`;
    refresh();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[admin/broker-reports DELETE]', e);
    return NextResponse.json({ error: '삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
