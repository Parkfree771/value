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
 * Firestore 데이터에서 수익률을 계산하는 함수 (수익 확정 상태 포함)
 * 수익 확정된 게시글은 closed_return_rate를 반환
 */
export function calcReturnRate(data: Record<string, unknown>): number {
  if (data.is_closed && data.closed_return_rate != null) {
    return Number(data.closed_return_rate);
  }
  const initial = Number(data.initialPrice) || 0;
  const current = Number(data.currentPrice) || 0;
  const pos = (data.positionType as string) || 'long';
  return calculateReturn(initial, current, pos as 'long' | 'short');
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
  if (returnRate > 0) {
    return 'text-red-600 dark:text-red-500'; // 수익: Red (Korean Standard)
  } else if (returnRate < 0) {
    return 'text-blue-600 dark:text-blue-500'; // 손실: Blue (Korean Standard)
  } else {
    return 'text-gray-500 dark:text-gray-400';
  }
}
