// 구루 목록 · 상세 공용 안내 — 13F 시차와 수익률 계산 방식
export default function GuruDisclaimer() {
  return (
    <footer className="mt-12 border-t-2 border-[var(--theme-border)] pt-3 text-xs leading-relaxed text-[var(--theme-ink-soft)]">
      <h2 className="font-bold text-[var(--foreground)]">13F 공시를 볼 때 알아둘 점</h2>
      <p className="mt-1.5 max-w-3xl">
        13F는 분기가 끝나고 45일 뒤에 공개되므로 실제 매매 시점과 최대 135일 차이가 날 수 있습니다.
        매수·매도 금액은 주식 수 변화에 분기 말 가격을 곱한 추정치입니다.
        수익률은 공시일 가격에 따라 샀다고 가정해 계산한 값으로, 구루의 실제 평단가와 수익률과는 다릅니다.
        투자 권유가 아니며, 투자 판단과 책임은 본인에게 있습니다.
      </p>
    </footer>
  );
}
