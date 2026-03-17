/**
 * 거래소별 장 운영 시간 체크
 *
 * 장이 닫혀있으면 가격 변동이 없으므로 KIS API 호출을 스킵합니다.
 * 모든 시간은 UTC 기준으로 계산됩니다.
 */

interface MarketSchedule {
  /** UTC 기준 장 시작 시간 */
  openHourUTC: number;
  openMinuteUTC: number;
  /** UTC 기준 장 종료 시간 */
  closeHourUTC: number;
  closeMinuteUTC: number;
  /** 거래일 (0=일, 1=월, ..., 6=토) */
  tradingDays: number[];
}

// 거래소별 장 운영 시간 (UTC 기준)
// 여유 시간(버퍼) 30분씩 앞뒤로 포함
const MARKET_SCHEDULES: Record<string, MarketSchedule> = {
  // 한국 KRX: 09:00~15:30 KST = 00:00~06:30 UTC (버퍼 포함 23:30~07:00 UTC)
  KRX: {
    openHourUTC: 23, openMinuteUTC: 30, // 전날 23:30 UTC
    closeHourUTC: 7, closeMinuteUTC: 0,
    tradingDays: [1, 2, 3, 4, 5],
  },
  // 일본 TSE: 09:00~15:00 JST = 00:00~06:00 UTC (버퍼 포함 23:30~06:30 UTC)
  TSE: {
    openHourUTC: 23, openMinuteUTC: 30,
    closeHourUTC: 6, closeMinuteUTC: 30,
    tradingDays: [1, 2, 3, 4, 5],
  },
  // 홍콩 HKS: 09:30~16:00 HKT = 01:30~08:00 UTC (버퍼 포함 01:00~08:30 UTC)
  HKS: {
    openHourUTC: 1, openMinuteUTC: 0,
    closeHourUTC: 8, closeMinuteUTC: 30,
    tradingDays: [1, 2, 3, 4, 5],
  },
  // 상하이/선전 SHS/SZS: 09:30~15:00 CST = 01:30~07:00 UTC (버퍼 포함 01:00~07:30 UTC)
  SHS: {
    openHourUTC: 1, openMinuteUTC: 0,
    closeHourUTC: 7, closeMinuteUTC: 30,
    tradingDays: [1, 2, 3, 4, 5],
  },
  SZS: {
    openHourUTC: 1, openMinuteUTC: 0,
    closeHourUTC: 7, closeMinuteUTC: 30,
    tradingDays: [1, 2, 3, 4, 5],
  },
  // 미국 NAS/NYS/AMS: 09:30~16:00 ET = 14:30~21:00 UTC (버퍼 포함 14:00~21:30 UTC)
  // 서머타임: 13:30~20:00 UTC (버퍼 포함 13:00~20:30 UTC)
  // → 넉넉하게 13:00~21:30 UTC로 통합
  NAS: {
    openHourUTC: 13, openMinuteUTC: 0,
    closeHourUTC: 21, closeMinuteUTC: 30,
    tradingDays: [1, 2, 3, 4, 5],
  },
  NYS: {
    openHourUTC: 13, openMinuteUTC: 0,
    closeHourUTC: 21, closeMinuteUTC: 30,
    tradingDays: [1, 2, 3, 4, 5],
  },
  AMS: {
    openHourUTC: 13, openMinuteUTC: 0,
    closeHourUTC: 21, closeMinuteUTC: 30,
    tradingDays: [1, 2, 3, 4, 5],
  },
};

/**
 * 현재 시각 기준으로 해당 거래소가 장 운영 중인지 확인합니다.
 * 암호화폐(CRYPTO)는 항상 true를 반환합니다.
 */
export function isMarketOpen(exchange: string, now?: Date): boolean {
  if (exchange === 'CRYPTO') return true;

  const schedule = MARKET_SCHEDULES[exchange];
  if (!schedule) return false; // 알 수 없는 거래소는 갱신 안 함

  const d = now || new Date();
  const day = d.getUTCDay();
  const hourUTC = d.getUTCHours();
  const minuteUTC = d.getUTCMinutes();
  const currentMinutes = hourUTC * 60 + minuteUTC;

  // 거래일 체크 (주말 제외)
  if (!schedule.tradingDays.includes(day)) return false;

  const openMinutes = schedule.openHourUTC * 60 + schedule.openMinuteUTC;
  const closeMinutes = schedule.closeHourUTC * 60 + schedule.closeMinuteUTC;

  // 자정을 넘기는 경우 (예: KRX 23:30~07:00 UTC)
  if (openMinutes > closeMinutes) {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }

  // 일반적인 경우
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

/**
 * 주어진 거래소 목록 중 현재 장이 열린 거래소만 필터링합니다.
 */
export function getOpenExchanges(exchanges: string[]): string[] {
  return exchanges.filter(ex => isMarketOpen(ex));
}
