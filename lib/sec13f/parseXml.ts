// 13F XML 파싱 모듈

import { XMLParser } from 'fast-xml-parser';
import { Raw13FHolding } from './types';

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true, // 네임스페이스 접두사 제거
  parseTagValue: false, // 자동 숫자 변환 비활성화 (CUSIP '37950E263' → 3.795e+267 방지)
  isArray: (name) => {
    // infoTable은 항상 배열로 처리 (단일 종목일 때도)
    return name === 'infoTable';
  },
});

/**
 * 13F information table XML을 파싱하여 Raw13FHolding 배열 반환
 */
export function parse13FXml(xmlString: string): Raw13FHolding[] {
  const parsed = parser.parse(xmlString);

  // 여러 가능한 경로 시도 (파일러마다 구조가 다를 수 있음)
  let entries: any[] = [];

  if (parsed.informationTable?.infoTable) {
    entries = parsed.informationTable.infoTable;
  } else if (parsed.edgarSubmission?.informationTable?.infoTable) {
    entries = parsed.edgarSubmission.informationTable.infoTable;
  } else {
    // 최상위 키 탐색
    const topKey = Object.keys(parsed).find(k =>
      k.toLowerCase().includes('informationtable') || k.toLowerCase().includes('information')
    );
    if (topKey) {
      const tableData = parsed[topKey];
      const infoKey = Object.keys(tableData).find(k =>
        k.toLowerCase().includes('infotable')
      );
      if (infoKey) {
        entries = Array.isArray(tableData[infoKey]) ? tableData[infoKey] : [tableData[infoKey]];
      }
    }
  }

  if (!entries || entries.length === 0) {
    console.error('[파싱] XML 구조:', JSON.stringify(Object.keys(parsed), null, 2));
    throw new Error('[파싱] infoTable을 찾을 수 없습니다. XML 구조를 확인하세요.');
  }

  console.log(`[파싱] ${entries.length}개 종목 발견`);

  const holdings: Raw13FHolding[] = entries.map((entry: any) => {
    const nameOfIssuer = String(entry.nameOfIssuer || entry.NAMEOFISSUER || '');
    const titleOfClass = String(entry.titleOfClass || entry.TITLEOFCLASS || '');
    // CUSIP은 9자리여야 하는데, 숫자로 파싱되면 앞의 0이 사라짐
    let cusip = String(entry.cusip || entry.CUSIP || '');
    if (cusip.length < 9 && /^\d+$/.test(cusip)) {
      cusip = cusip.padStart(9, '0');
    }
    const value = Number(entry.value || entry.VALUE || 0);
    const sharesData = entry.shrsOrPrnAmt || entry.SHRSORNPRAMT || {};
    const shares = Number(sharesData.sshPrnamt || sharesData.SSHPRNAMT || 0);
    const sharesType = (sharesData.sshPrnamtType || sharesData.SSHPRNAMTTYPE || 'SH') as 'SH' | 'PRN';
    const putCall = entry.putCall || entry.PUTCALL || undefined;
    const investmentDiscretion = entry.investmentDiscretion || entry.INVESTMENTDISCRETION || '';

    return {
      nameOfIssuer: nameOfIssuer.trim(),
      titleOfClass: titleOfClass.trim(),
      cusip: cusip.trim(),
      value,
      shares,
      sharesType,
      putCall: putCall ? putCall.trim() : undefined,
      investmentDiscretion: investmentDiscretion.trim(),
    };
  });

  // 값 단위 자동 감지: 13F 표준은 천달러(x1000) 단위지만
  // 일부 펀드가 달러 단위로 보고하는 경우가 있음
  // 개별 종목의 value가 1억 이상이면 이미 달러 단위로 판단하여 /1000 보정
  // (천달러 기준 1억 = $1000억 단일 포지션 → 현실적으로 불가능)
  const maxValue = Math.max(...holdings.map(h => h.value));
  if (maxValue > 100_000_000) {
    console.log(`[파싱] 값이 달러 단위로 보고됨 (최대값: ${maxValue.toLocaleString()}) → 천달러로 변환`);
    for (const h of holdings) {
      h.value = Math.round(h.value / 1000);
    }
  }

  return holdings;
}

/**
 * 채권 CUSIP 판별
 * 주식: 6자리 발행자 + 2자리 이슈(보통 숫자) + 1자리 체크
 * 채권: 6자리 발행자 + 2자리 이슈(알파벳 포함, 예: AG, AE, BE) + 1자리 체크
 */
function isBondCusip(cusip: string): boolean {
  if (cusip.length < 9) return false;
  // CUSIP 7-8번째 자리 (index 6,7): 둘 다 알파벳이면 채권
  // 주식: 81141R100 → [6][7] = "1","0" (숫자)
  // 채권: 81141RAG5 → [6][7] = "A","G" (알파벳)
  const c7 = cusip.charAt(6);
  const c8 = cusip.charAt(7);
  return /[A-Z]/.test(c7) && /[A-Z]/.test(c8);
}

/**
 * 동일 CUSIP의 여러 행을 합산 (클래스별 분리 보고 시)
 * CUSIP + titleOfClass 기준으로 그룹핑
 */
export function aggregateHoldings(holdings: Raw13FHolding[]): Raw13FHolding[] {
  const map = new Map<string, Raw13FHolding>();

  for (const h of holdings) {
    // PUT/CALL 옵션은 제외 (일반 주식만)
    if (h.putCall) continue;

    // 채권 CUSIP 제외: 7-8자리가 문자+숫자 조합이면 채권
    // 주식 CUSIP: 123456 10 9 (7-8자리가 숫자 위주)
    // 채권 CUSIP: 123456 AG 5, 123456 AE 8 등 (7-8자리에 알파벳 포함)
    if (isBondCusip(h.cusip)) continue;

    const key = h.cusip;
    const existing = map.get(key);

    if (existing) {
      existing.value += h.value;
      existing.shares += h.shares;
    } else {
      map.set(key, { ...h });
    }
  }

  return Array.from(map.values());
}
