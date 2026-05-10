/**
 * global-stocks.json의 nameKr 매핑 보강 스크립트
 * 한국인이 자주 검색하는 미국 종목 ~120개 추가 (78 → ~200)
 *
 * 실행: npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/add-us-namekr.ts
 */

import { promises as fs } from 'fs';
import path from 'path';

interface Stock {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  nameKr?: string;
}

interface Data {
  version: string;
  updatedAt: string;
  totalCount: number;
  exchanges: Record<string, number>;
  stocks: Stock[];
}

/* ─── 추가 매핑 (한글명) ───
 * 기준: 한국인 미국주식 거래량 + 검색량 상위 + ETF 인기 종목.
 */
const ADD_MAP: Record<string, string> = {
  // 반도체
  AMAT: '어플라이드머티리얼즈',
  LRCX: '램리서치',
  KLAC: 'KLA',
  ASML: 'ASML',
  ARM: 'ARM',
  ADI: '아날로그디바이스',
  TXN: '텍사스인스트루먼트',
  MRVL: '마벨',
  ON: '온세미컨덕터',
  WDC: '웨스턴디지털',
  MPWR: '모놀리식파워',
  STX: '시게이트',

  // 소프트웨어/클라우드
  NOW: '서비스나우',
  PANW: '팔로알토네트웍스',
  CRWD: '크라우드스트라이크',
  DDOG: '데이터독',
  NET: '클라우드플레어',
  TEAM: '아틀라시안',
  WDAY: '워크데이',
  ZS: '지스케일러',
  SHOP: '쇼피파이',
  SQ: '블록',
  INTU: '인튜이트',
  IBM: 'IBM',
  ANET: '아리스타네트웍스',
  FTNT: '포티넷',
  SPLK: '스플렁크',
  DOCU: '도큐사인',

  // 인터넷/미디어
  SPOT: '스포티파이',
  ROKU: '로쿠',
  PINS: '핀터레스트',
  SNAP: '스냅',
  EA: 'EA',
  TTWO: '테이크투인터랙티브',

  // EV/자동차
  RIVN: '리비안',
  LCID: '루시드',
  NIO: '니오',
  XPEV: '샤오펑',
  LI: '리오토',

  // 핀테크/암호화폐
  COIN: '코인베이스',
  HOOD: '로빈후드',
  SOFI: '소파이',
  MSTR: '마이크로스트레티지',
  MARA: '마라톤디지털',
  RIOT: '라이엇',

  // 헬스케어
  ISRG: '인튜이티브서지컬',
  REGN: '리제네론',
  VRTX: '버텍스',
  GILD: '길리어드',
  BMY: '브리스톨마이어스',
  AMGN: '암젠',
  TMO: '써모피셔',
  DHR: '다나허',
  ZTS: '조에티스',
  CI: '시그나',
  CVS: 'CVS',
  HUM: '휴매나',
  ELV: '엘레반스헬스',
  MDT: '메드트로닉',
  SYK: '스트라이커',
  BSX: '보스톤사이언티픽',

  // 소비/리테일
  BKNG: '부킹',
  CMCSA: '컴캐스트',
  LULU: '룰루레몬',
  TJX: 'TJX',
  ROST: '로스스토어',
  YUM: '얌브랜즈',
  CMG: '치폴레',
  MDLZ: '몬델리즈',
  CL: '콜게이트',
  EL: '에스티로더',
  KMB: '킴벌리클락',
  GIS: '제너럴밀스',
  K: '켈로그',
  HSY: '허쉬',
  MO: '알트리아',
  PM: '필립모리스',

  // 금융
  BLK: '블랙록',
  SCHW: '찰스슈왑',
  USB: 'US뱅크',
  C: '씨티그룹',
  TFC: '트루이스트',
  AIG: 'AIG',
  PNC: 'PNC',
  ICE: '인터컨티넨탈익스체인지',
  CME: 'CME',
  SPGI: 'S&P글로벌',

  // 산업/방산
  HON: '허니웰',
  UPS: 'UPS',
  FDX: '페덱스',
  LMT: '록히드마틴',
  RTX: 'RTX',
  NOC: '노스롭그루먼',
  DE: '디어',
  GD: '제너럴다이내믹스',
  EMR: '에머슨일렉트릭',
  ETN: '이튼',
  ITW: '일리노이툴웍스',
  CSX: 'CSX',
  UNP: '유니온퍼시픽',
  NSC: '노포크서던',
  WM: '웨이스트매니지먼트',

  // 에너지/소재
  SHEL: '셸',
  BP: 'BP',
  EOG: 'EOG리소시스',
  PSX: '필립스66',
  VLO: '발레로',
  MPC: '마라톤페트롤리움',
  LIN: '린데',
  APD: '에어프로덕츠',
  FCX: '프리포트맥모란',
  NEM: '뉴몬트',

  // 통신/유틸리티
  CHTR: '차터커뮤니케이션즈',
  NEE: '넥스트에라에너지',
  DUK: '듀크에너지',
  SO: '서던컴퍼니',
  D: '도미니언에너지',

  // 중국 ADR
  BABA: '알리바바',
  BIDU: '바이두',
  JD: 'JD닷컴',
  PDD: '핀둬둬',

  // 기타 인기
  ABNB: '에어비앤비',
  DASH: '도어대시',
  UBER: '우버',
  LYFT: '리프트',
  ABM: 'ABM인더스트리',
  PLUG: '플러그파워',
  ENPH: '엔페이즈에너지',
  FSLR: '퍼스트솔라',
  CEG: '컨스텔레이션에너지',

  // ETF (한국인 인기)
  SPY: 'S&P500 ETF',
  VOO: 'S&P500 ETF (뱅가드)',
  IVV: 'S&P500 ETF (아이쉐어즈)',
  VTI: '전체시장 ETF',
  VEA: '선진시장 ETF',
  VWO: '신흥국 ETF',
  SCHD: 'SCHD 배당 ETF',
  JEPI: 'JEPI 커버드콜',
  JEPQ: 'JEPQ 커버드콜',
  TLT: '장기 미국채 ETF',
  IEF: '7-10년 미국채 ETF',
  SHY: '단기 미국채 ETF',
  TQQQ: '나스닥 3X ETF',
  SOXL: '반도체 3X ETF',
  TMF: '20년 미국채 3X',
  SQQQ: '나스닥 인버스 3X',
  SOXX: '반도체 ETF',
  SMH: '반도체 ETF (반에크)',
  XLK: '기술주 ETF',
  XLF: '금융주 ETF',
  XLV: '헬스케어 ETF',
  XLE: '에너지 ETF',
  XLY: '경기소비재 ETF',
  XLP: '필수소비재 ETF',
  XLI: '산업재 ETF',
  XLU: '유틸리티 ETF',
  XLRE: '리츠 ETF',
  ARKK: 'ARK 혁신 ETF',
  GLD: '금 ETF',
  SLV: '은 ETF',
  USO: '원유 ETF',
  IBIT: '비트코인 ETF (블랙록)',
  FBTC: '비트코인 ETF (피델리티)',
  ETHA: '이더리움 ETF (블랙록)',
};

async function main() {
  const filePath = path.join(process.cwd(), 'public', 'data', 'global-stocks.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  const data: Data = JSON.parse(raw);

  let added = 0;
  let updated = 0;
  let missing = 0;

  for (const stock of data.stocks) {
    if (stock.exchange !== 'NAS' && stock.exchange !== 'NYS') continue;
    const kr = ADD_MAP[stock.symbol];
    if (!kr) continue;
    if (stock.nameKr === kr) continue;
    if (stock.nameKr && stock.nameKr !== kr) {
      stock.nameKr = kr;
      updated++;
    } else {
      stock.nameKr = kr;
      added++;
    }
  }

  // 매핑에 있는데 글로벌 인덱스에 없는 티커 체크
  for (const ticker of Object.keys(ADD_MAP)) {
    const found = data.stocks.find(
      (s) => s.symbol === ticker && (s.exchange === 'NAS' || s.exchange === 'NYS'),
    );
    if (!found) {
      console.warn(`[missing] ${ticker} (${ADD_MAP[ticker]}) not in NAS/NYS list`);
      missing++;
    }
  }

  data.updatedAt = new Date().toISOString();

  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

  const total = data.stocks.filter(
    (s) => (s.exchange === 'NAS' || s.exchange === 'NYS') && s.nameKr,
  ).length;
  console.log(`✅ added=${added} updated=${updated} missing=${missing} totalKr=${total}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
