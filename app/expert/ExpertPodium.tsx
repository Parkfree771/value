import TopThree from '@/components/front/TopThree';
import type { BrokerReport } from '@/lib/brokerReports';

// 전문가 추적 1·2·3위 — 개인 리포트와 같은 카드(TopThree)에 증권사 리포트를 맞춰 넣는다.
// (lib/brokerReports 의 함수는 서버 DB 코드를 끌고 오므로 여기선 타입만 쓴다)

const OPINION_LABEL: Record<BrokerReport['opinion'], string> = { buy: '매수', hold: '중립', sell: '매도' };

export default function ExpertPodium({ items }: { items: BrokerReport[] }) {
  return (
    <TopThree
      items={items.map((r) => ({
        id: r.id,
        href: `/expert/${r.id}`,
        rate: r.returnRate,
        stockName: r.stockName,
        opinion: r.opinion,
        opinionLabel: OPINION_LABEL[r.opinion],
        byline: r.broker,
        date: r.reportDate,
        basePrice: r.basePrice,
        currentPrice: r.currentPrice,
        targetPrice: r.targetPrice,
        currency: r.currency,
        targetReached: !!r.targetPrice && Math.max(r.maxClose ?? 0, r.currentPrice) >= r.targetPrice,
      }))}
    />
  );
}
