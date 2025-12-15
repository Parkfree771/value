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
  if (initialPrice === 0) return 0;

  if (positionType === 'long') {
    // 롱 포지션: 가격 상승 시 수익
    return ((currentPrice - initialPrice) / initialPrice) * 100;
  } else {
    // 숏 포지션: 가격 하락 시 수익
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
 * 수익률에 따라 색상 클래스를 반환하는 함수 (한국 주식 시장 스타일)
 * @param returnRate - 수익률 (백분율)
 * @returns Tailwind CSS 색상 클래스
 */
export function getReturnColorClass(returnRate: number): string {
  if (returnRate > 0) {
    return 'text-red-600 dark:text-red-400'; // 수익: 빨간색
  } else if (returnRate < 0) {
    return 'text-blue-600 dark:text-blue-400'; // 손실: 파란색
  } else {
    return 'text-gray-600 dark:text-gray-400';
  }
}
