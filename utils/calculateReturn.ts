/**
 * 포지션 타입에 따라 수익률을 계산하는 함수
 * @param initialPrice - 리포트 작성 당시의 가격
 * @param currentPrice - 현재 가격
 * @param positionType - 포지션 타입 ('long' 또는 'short')
 * @returns 수익률 (백분율)
 */
export function calculateReturn(
  initialPrice: number,
  currentPrice: number,
  positionType: 'long' | 'short' = 'long'
): number {
  if (initialPrice <= 0 || currentPrice <= 0) return 0;

  if (positionType === 'long') {
    return ((currentPrice - initialPrice) / initialPrice) * 100;
  } else {
    return ((initialPrice - currentPrice) / initialPrice) * 100;
  }
}

/**
 * 수익률을 포맷팅하는 함수
 * @param returnRate - 수익률 (백분율)
 * @param decimalPlaces - 소수점 자릿수 (기본값: 2)
 * @returns 포맷팅된 수익률 문자열 (예: "+12.34%")
 */
export function formatReturn(returnRate: number, decimalPlaces: number = 2): string {
  const sign = returnRate >= 0 ? '+' : '';
  return `${sign}${returnRate.toFixed(decimalPlaces)}%`;
}

/**
 * 수익률에 따라 색상 클래스를 반환하는 함수 (한국 주식 시장 스타일 - Strict Financial Standard)
 * @param returnRate - 수익률 (백분율)
 * @returns Tailwind CSS 색상 클래스
 */
export function getReturnColorClass(returnRate: number): string {
  // 한국식 상승 빨강 / 하락 파랑 — 에디토리얼 테마 토큰(--color-up/down, 채도 낮춤)
  if (returnRate > 0) {
    return 'text-[var(--color-up)]';
  } else if (returnRate < 0) {
    return 'text-[var(--color-down)]';
  } else {
    return 'text-[var(--color-hold)]';
  }
}
