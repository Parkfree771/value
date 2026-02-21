// CUSIP → 티커 매핑 모듈
// 3계층 전략: 수동 매핑 → global-stocks.json 이름 매칭 → 미매핑

import { CusipMapping } from './types';
import * as fs from 'fs';
import * as path from 'path';

// 주요 종목 수동 CUSIP 매핑 (가장 정확함)
// name: ETF 등 SEC 원본 종목명이 부정확한 경우 표시용 이름 오버라이드
const MANUAL_CUSIP_MAP: Record<string, { ticker: string; exchange: string; name?: string }> = {
  // 메가캡 기술주
  '037833100': { ticker: 'AAPL', exchange: 'NAS' },
  '594918104': { ticker: 'MSFT', exchange: 'NAS' },
  '02079K305': { ticker: 'GOOG', exchange: 'NAS' },
  '02079K107': { ticker: 'GOOGL', exchange: 'NAS' },
  '023135106': { ticker: 'AMZN', exchange: 'NAS' },
  '30303M102': { ticker: 'META', exchange: 'NAS' },
  '67066G104': { ticker: 'NVDA', exchange: 'NAS' },
  '88160R101': { ticker: 'TSLA', exchange: 'NAS' },

  // 금융
  '084670702': { ticker: 'BRK-B', exchange: 'NYS' },
  '46625H100': { ticker: 'JPM', exchange: 'NYS' },
  '060505104': { ticker: 'BAC', exchange: 'NYS' },
  '92826C839': { ticker: 'V', exchange: 'NYS' },
  '57636Q104': { ticker: 'MA', exchange: 'NYS' },
  '172967424': { ticker: 'C', exchange: 'NYS' },
  '38141G104': { ticker: 'GS', exchange: 'NYS' },
  '585515101': { ticker: 'MCO', exchange: 'NYS' },
  '00724F101': { ticker: 'AXP', exchange: 'NYS' },
  '949746101': { ticker: 'WFC', exchange: 'NYS' },
  '02005N100': { ticker: 'ALLY', exchange: 'NYS' },
  '14913Q104': { ticker: 'COF', exchange: 'NYS' },
  '896522109': { ticker: 'TFC', exchange: 'NYS' },
  '808513105': { ticker: 'SCHW', exchange: 'NYS' },

  // 헬스케어/제약
  '478160104': { ticker: 'JNJ', exchange: 'NYS' },
  '91324P102': { ticker: 'UNH', exchange: 'NYS' },
  '58933Y105': { ticker: 'MRK', exchange: 'NYS' },
  '717081103': { ticker: 'PFE', exchange: 'NYS' },
  '00287Y109': { ticker: 'ABBV', exchange: 'NYS' },
  '002824100': { ticker: 'ABT', exchange: 'NYS' },
  '532457108': { ticker: 'LLY', exchange: 'NYS' },
  '88579Y101': { ticker: 'TMO', exchange: 'NYS' },
  '219350105': { ticker: 'COR', exchange: 'NYS' },

  // 소비재
  '742718109': { ticker: 'PG', exchange: 'NYS' },
  '191216100': { ticker: 'KO', exchange: 'NYS' },
  '713448108': { ticker: 'PEP', exchange: 'NAS' },
  '931142103': { ticker: 'WMT', exchange: 'NYS' },
  '30231G102': { ticker: 'XOM', exchange: 'NYS' },
  '166764100': { ticker: 'CVX', exchange: 'NYS' },
  '20825C104': { ticker: 'COP', exchange: 'NYS' },
  '67011E106': { ticker: 'NUE', exchange: 'NYS' },
  '458140100': { ticker: 'INTC', exchange: 'NAS' },
  '254687106': { ticker: 'DIS', exchange: 'NYS' },

  // 산업/방산
  '539830109': { ticker: 'LMT', exchange: 'NYS' },
  '79466L302': { ticker: 'CRM', exchange: 'NYS' },
  '00206R102': { ticker: 'T', exchange: 'NYS' },
  '92343V104': { ticker: 'VZ', exchange: 'NYS' },
  '11135F101': { ticker: 'BMY', exchange: 'NYS' },
  '09247X101': { ticker: 'BLK', exchange: 'NYS' },

  // 기술 (추가)
  '035420505': { ticker: 'ANSS', exchange: 'NAS' },
  '22160K105': { ticker: 'COST', exchange: 'NAS' },
  '29786A106': { ticker: 'EQIX', exchange: 'NAS' },
  '040413106': { ticker: 'ANET', exchange: 'NYS' },

  // 에너지/자원
  '674599105': { ticker: 'OXY', exchange: 'NYS' },
  '71654V101': { ticker: 'PDCO', exchange: 'NAS' },

  // 버핏 미매핑 해결
  '829933100': { ticker: 'SIRI', exchange: 'NAS' },  // Sirius XM
  '14040H105': { ticker: 'COF', exchange: 'NYS' },   // Capital One Financial
  'G0403H108': { ticker: 'AON', exchange: 'NYS' },   // Aon PLC
  '546347105': { ticker: 'LPX', exchange: 'NYS' },   // Louisiana-Pacific
  '47233W109': { ticker: 'JEF', exchange: 'NYS' },   // Jefferies Financial Group
  '812215200': { ticker: 'SEG', exchange: 'NYS' },   // Seaport Entertainment Group

  // 일본 상사 (버핏 포트폴리오)
  'J4578C101': { ticker: '8058', exchange: 'TSE' }, // 미쓰비시 상사
  'J4578E107': { ticker: '8031', exchange: 'TSE' }, // 미쓰이 상사
  'J3504G103': { ticker: '8001', exchange: 'TSE' }, // 이토추 상사

  // 버핏 주요 보유 종목 추가
  '210518100': { ticker: 'CB', exchange: 'NYS' },   // Chubb
  '500754106': { ticker: 'KHC', exchange: 'NAS' },  // Kraft Heinz
  '256135203': { ticker: 'DVA', exchange: 'NYS' },  // DaVita
  '171340102': { ticker: 'CHTR', exchange: 'NAS' }, // Charter Communications
  '549271106': { ticker: 'LOW', exchange: 'NYS' },  // Lowe's
  // Liberty Live Holdings (2024년 스핀오프)
  '530909100': { ticker: 'LLYVA', exchange: 'NAS' },  // Liberty Live Holdings Class A
  '530909308': { ticker: 'LLYVK', exchange: 'NAS' },  // Liberty Live Holdings Class C

  // Liberty Media (Formula One)
  '531229755': { ticker: 'FWONK', exchange: 'NAS' },  // Liberty Media Formula One Class C (Q4 신규 CUSIP)
  '531229854': { ticker: 'FWONK', exchange: 'NAS' },  // Liberty Media Formula One Class C (Q3 구 CUSIP)

  // Liberty Media 구 트래킹 주식 (Q3→Q4 스핀오프로 SOLD OUT 처리됨)
  '531229722': { ticker: 'LLYVK', exchange: 'NAS' },  // 구 Liberty Live tracking C → LLYVK로 전환
  '531229748': { ticker: 'LLYVA', exchange: 'NAS' },  // 구 Liberty Live tracking A → LLYVA로 전환

  // Liberty Latin America
  'G9001E102': { ticker: 'LILA', exchange: 'NAS' },    // Liberty Latin America Class A
  'G9001E128': { ticker: 'LILAK', exchange: 'NAS' },   // Liberty Latin America Class C

  'G5784H106': { ticker: 'LSXMK', exchange: 'NAS' }, // Liberty SiriusXM
  '552953101': { ticker: 'MKTX', exchange: 'NAS' }, // MarketAxess
  '45866F104': { ticker: 'ICE', exchange: 'NYS' },  // Intercontinental Exchange

  // 빌 애크먼 관련 (Pershing Square)
  '125523100': { ticker: 'CMG', exchange: 'NYS' },   // Chipotle
  '09260D107': { ticker: 'BKNG', exchange: 'NAS' },  // Booking Holdings
  '40434L105': { ticker: 'HLT', exchange: 'NYS' },   // Hilton
  '449489103': { ticker: 'HHH', exchange: 'NYS' },   // Howard Hughes
  '86959K105': { ticker: 'SWVL', exchange: 'NAS' },
  '74762E102': { ticker: 'QSR', exchange: 'NYS' },   // Restaurant Brands
  '075887109': { ticker: 'BN', exchange: 'NYS' },    // Brookfield
  '11271J107': { ticker: 'BN', exchange: 'NYS' },    // Brookfield Corp (NOT Blackstone)
  '579780206': { ticker: 'MCD', exchange: 'NYS' },   // McDonald's
  'N7749L103': { ticker: 'NKE', exchange: 'NYS' },   // Nike
  '617446448': { ticker: 'MSCI', exchange: 'NYS' },  // MSCI

  // 드러켄밀러 관련 (Duquesne)
  '22266T109': { ticker: 'CPNG', exchange: 'NYS' },  // Coupang (NOT CrowdStrike)
  '22788C105': { ticker: 'CRWD', exchange: 'NAS' },  // CrowdStrike
  '03769M106': { ticker: 'APHA', exchange: 'NAS' },
  '872589106': { ticker: 'TJX', exchange: 'NYS' },   // TJX
  '83406F102': { ticker: 'SOFI', exchange: 'NAS' },  // SoFi
  // SPY, IWM, IBIT → ETF 섹션으로 이동
  '98980G102': { ticker: 'ZS', exchange: 'NAS' },    // Zscaler

  // 세스 클라만 (Baupost)
  '345370860': { ticker: 'FOXA', exchange: 'NAS' },  // Fox Corp A
  '345370878': { ticker: 'FOX', exchange: 'NAS' },   // Fox Corp B
  '526057104': { ticker: 'LEN', exchange: 'NYS' },   // Lennar Corp (NOT Liberty Global)
  '526057302': { ticker: 'LEN', exchange: 'NYS' },   // Lennar Corp Class B
  'G5785G107': { ticker: 'LNG', exchange: 'NYS' },   // Liberty TripAdvisor
  '92536U106': { ticker: 'VRSN', exchange: 'NAS' },  // VeriSign
  '651639106': { ticker: 'NWSA', exchange: 'NAS' },  // News Corp A
  '651639304': { ticker: 'NWS', exchange: 'NAS' },   // News Corp B

  // ETF - iShares
  '464287655': { ticker: 'EEM', exchange: 'AMS', name: 'iShares MSCI Emerging Markets ETF' },
  '464287234': { ticker: 'EEM', exchange: 'AMS', name: 'iShares MSCI Emerging Markets ETF' },
  '464287200': { ticker: 'IVV', exchange: 'AMS', name: 'iShares Core S&P 500 ETF' },
  '464286400': { ticker: 'EWZ', exchange: 'AMS', name: 'iShares MSCI Brazil ETF' },
  '46434V613': { ticker: 'AAXJ', exchange: 'NAS', name: 'iShares MSCI All Country Asia ex Japan ETF' },
  '464287432': { ticker: 'IBIT', exchange: 'NAS', name: 'iShares Bitcoin Trust ETF' },
  '46120E602': { ticker: 'IWM', exchange: 'AMS', name: 'iShares Russell 2000 ETF' },

  // ETF - SPDR
  '78462F103': { ticker: 'SPY', exchange: 'AMS', name: 'SPDR S&P 500 ETF' },
  '78409V104': { ticker: 'SPY', exchange: 'AMS', name: 'SPDR S&P 500 ETF' },
  '81369Y605': { ticker: 'XLF', exchange: 'AMS', name: 'Financial Select Sector SPDR Fund' },
  '81369Y886': { ticker: 'XLB', exchange: 'AMS', name: 'Materials Select Sector SPDR Fund' },
  '81369Y803': { ticker: 'XLE', exchange: 'AMS', name: 'Energy Select Sector SPDR Fund' },
  '81369Y704': { ticker: 'XLI', exchange: 'AMS', name: 'Industrial Select Sector SPDR Fund' },
  '81369Y100': { ticker: 'XLV', exchange: 'AMS', name: 'Health Care Select Sector SPDR Fund' },

  // ETF - SPDR Series Trust (국채/채권 등)
  '78464A870': { ticker: 'BWX', exchange: 'AMS', name: 'SPDR Bloomberg Intl Treasury Bond ETF' },
  '78464A698': { ticker: 'BWX', exchange: 'AMS', name: 'SPDR Bloomberg Intl Treasury Bond ETF' },
  '78464A797': { ticker: 'KBE', exchange: 'AMS', name: 'SPDR S&P Bank ETF' },

  // ETF - Invesco
  '46137V357': { ticker: 'RSP', exchange: 'AMS', name: 'Invesco S&P 500 Equal Weight ETF' },
  '46090E103': { ticker: 'QQQ', exchange: 'NAS', name: 'Invesco QQQ Trust' },

  // ETF - Global X
  '37950E259': { ticker: 'ARGT', exchange: 'AMS', name: 'Global X MSCI Argentina ETF' },

  // 추가 주요 종목
  '00507V109': { ticker: 'ABNB', exchange: 'NAS' }, // Airbnb
  '49456B101': { ticker: 'KDP', exchange: 'NAS' },  // Keurig Dr Pepper
  '68389X105': { ticker: 'ORCL', exchange: 'NYS' }, // Oracle
  '00971T101': { ticker: 'AFRM', exchange: 'NAS' }, // Affirm
  '018581108': { ticker: 'ALGN', exchange: 'NAS' }, // Align Tech
  '29444U700': { ticker: 'EQIX', exchange: 'NAS' }, // Equinix
  '404119982': { ticker: 'HCA', exchange: 'NYS' },  // HCA Healthcare
  '74340W103': { ticker: 'PSA', exchange: 'NYS' },  // Public Storage

  // 드러켄밀러 미매핑 해결
  '881624209': { ticker: 'TEVA', exchange: 'NYS' },  // Teva Pharmaceutical (ADR)
  '874039100': { ticker: 'TSM', exchange: 'NYS' },   // Taiwan Semiconductor (ADR)
  '81141R100': { ticker: 'SE', exchange: 'NYS' },    // Sea Ltd (ADR)
  '929740108': { ticker: 'WAB', exchange: 'NYS' },   // Wabtec
  '910047109': { ticker: 'UAL', exchange: 'NAS' },   // United Airlines
  'G3643J108': { ticker: 'FLUT', exchange: 'NYS' },  // Flutter Entertainment
  '185899101': { ticker: 'CLF', exchange: 'NYS' },   // Cleveland-Cliffs
  '861012102': { ticker: 'STM', exchange: 'NYS' },   // STMicroelectronics (ADR)
  '74967X103': { ticker: 'RH', exchange: 'NYS' },    // RH (Restoration Hardware)
  '718172109': { ticker: 'PM', exchange: 'NYS' },    // Philip Morris International
  '02376R102': { ticker: 'AAL', exchange: 'NAS' },   // American Airlines
  '020398707': { ticker: 'AII', exchange: 'NYS' },   // Almonty Industries
  '925050106': { ticker: 'VRNA', exchange: 'NAS' },  // Verona Pharma (ADR)
  '23331A109': { ticker: 'DHI', exchange: 'NYS' },   // D.R. Horton
  '042068205': { ticker: 'ARM', exchange: 'NAS' },   // Arm Holdings (ADR)
  'G6683N103': { ticker: 'NU', exchange: 'NYS' },    // Nu Holdings (ADR)

  // 리 루 미매핑 해결
  '722304102': { ticker: 'PDD', exchange: 'NAS' },   // PDD Holdings (ADR)

  // 세스 클라만 미매핑 해결
  '337738108': { ticker: 'FI', exchange: 'NYS' },    // Fiserv (2023년 FISV→FI 티커 변경)
  '95082P105': { ticker: 'WCC', exchange: 'NYS' },   // WESCO International
  '31620M106': { ticker: 'FIS', exchange: 'NYS' },   // Fidelity National Information
  '26969P108': { ticker: 'EXP', exchange: 'NYS' },   // Eagle Materials
  '36165L108': { ticker: 'GDS', exchange: 'NAS' },   // GDS Holdings (ADR)

  // 하워드 막스 — 워런트/클래스 주식 분리
  'L01800108': { ticker: 'ALVO', exchange: 'NAS' },   // Alvotech Common Stock
  'L01800116': { ticker: 'ALVOW', exchange: 'NAS' },  // Alvotech Warrant
  '165167735': { ticker: 'EXE', exchange: 'NAS' },    // Expand Energy Common Stock
  '165167180': { ticker: 'EXE/WS', exchange: 'NYS' }, // Expand Energy Warrant
  'G7553X106': { ticker: 'KRSP', exchange: 'NYS' },   // Rice Acquisition Corp 3 Common
  'G7553X114': { ticker: 'KRSP/WS', exchange: 'NYS' },// Rice Acquisition Corp 3 Warrant
  'N4732M103': { ticker: 'JBSAY', exchange: 'NYS' },  // JBS NV (OTC ADR)

  // 하워드 막스 미매핑 해결
  '879433829': { ticker: 'TDS', exchange: 'NYS' },   // Telephone and Data Systems
  '465562106': { ticker: 'ITUB', exchange: 'NYS' },  // Itau Unibanco (ADR)
  '071705107': { ticker: 'BLCO', exchange: 'NYS' },  // Bausch + Lomb
  'G98239109': { ticker: 'XP', exchange: 'NAS' },    // XP Inc (ADR)
  '35969L108': { ticker: 'YMM', exchange: 'NYS' },   // Full Truck Alliance (ADR)
  '071734107': { ticker: 'BHC', exchange: 'NYS' },   // Bausch Health
  '87266J104': { ticker: 'TPIC', exchange: 'NAS' },  // TPI Composites
};

// global-stocks.json 로드 (이름 매칭용)
let globalStocksCache: { symbol: string; name: string; exchange: string }[] | null = null;

function loadGlobalStocks(): { symbol: string; name: string; exchange: string }[] {
  if (globalStocksCache) return globalStocksCache;

  const filePath = path.join(process.cwd(), 'public', 'data', 'global-stocks.json');
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  globalStocksCache = (raw.stocks || []).filter(
    (s: any) => ['NAS', 'NYS', 'AMS'].includes(s.exchange)
  );
  console.log(`[매핑] global-stocks.json 로드: ${globalStocksCache!.length}개 미국 주식`);
  return globalStocksCache!;
}

// 회사명 정규화 (매칭용)
export function normalizeCompanyName(name: string): string {
  return name
    .toUpperCase()
    .replace(/\b(INC|CORP|CORPORATION|LTD|LIMITED|CO|COMPANY|GROUP|HOLDINGS|PLC|NV|SA|AG|LP|LLC|THE|TR|TRUST|FD|FDS)\b/g, '')
    .replace(/\b(CLASS [A-Z]|CL [A-Z]|SER [A-Z]|SERIES [A-Z]|NEW)\b/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ETF/펀드 포괄적 발행자명 — 자동 매핑 시 제외 (동일 발행자 아래 여러 ETF가 존재)
export const GENERIC_ISSUER_BLACKLIST = [
  'ISHARES', 'ISHARES TR', 'ISHARES TRUST',
  'INVESCO', 'INVESCO EXCHANGE TRADED FD',
  'SELECT SECTOR SPDR', 'SELECT SECTOR SPDR TR',
  'SPDR', 'SPDR GOLD', 'SPDR SERIES TRUST', 'SPDR SERIES TR',
  'VANGUARD', 'VANGUARD INDEX FDS', 'VANGUARD INTL EQUITY INDEX FDS',
  'PROSHARES', 'PROSHARES TR',
  'WISDOMTREE', 'WISDOMTREE TR',
  'VANECK', 'VANECK ETF TR',
  'SCHWAB STRATEGIC TR',
  'FIRST TR',
  'GLOBAL X FDS',
  'ARK ETF TR',
  'DIREXION',
];

/**
 * CUSIP으로 티커 매핑 시도
 */
export function resolveCusip(cusip: string, issuerName: string): CusipMapping | null {
  // Layer 1: 수동 매핑
  const manual = MANUAL_CUSIP_MAP[cusip];
  if (manual) {
    return {
      cusip,
      ticker: manual.ticker,
      exchange: manual.exchange,
      name: manual.name || issuerName,
      source: 'manual',
    };
  }

  // Layer 2: global-stocks.json 이름 매칭
  const stocks = loadGlobalStocks();
  const normalizedIssuer = normalizeCompanyName(issuerName);

  if (normalizedIssuer.length < 3) return null;

  // ETF 포괄 발행자명은 자동 매핑에서 제외 (CUSIP별 수동 매핑 필요)
  if (GENERIC_ISSUER_BLACKLIST.some(b => normalizedIssuer === normalizeCompanyName(b))) {
    return null;
  }

  // 정확한 이름 매칭
  for (const stock of stocks) {
    const normalizedStock = normalizeCompanyName(stock.name);
    if (normalizedStock === normalizedIssuer) {
      return {
        cusip,
        ticker: stock.symbol,
        exchange: stock.exchange,
        name: stock.name,
        source: 'auto',
      };
    }
  }

  // 부분 매칭 (issuer 이름이 stock 이름의 시작 부분과 일치)
  for (const stock of stocks) {
    const normalizedStock = normalizeCompanyName(stock.name);
    if (
      normalizedStock.startsWith(normalizedIssuer) ||
      normalizedIssuer.startsWith(normalizedStock)
    ) {
      if (normalizedIssuer.length >= 4 && normalizedStock.length >= 4) {
        return {
          cusip,
          ticker: stock.symbol,
          exchange: stock.exchange,
          name: stock.name,
          source: 'auto',
        };
      }
    }
  }

  // Layer 3: 미매핑
  return null;
}

/**
 * 매핑 결과 통계 출력
 */
export function printMappingStats(
  holdings: { cusip: string; ticker: string | null; name_of_issuer: string; ticker_source: string }[]
) {
  const total = holdings.length;
  const manual = holdings.filter(h => h.ticker_source === 'manual').length;
  const auto = holdings.filter(h => h.ticker_source === 'auto').length;
  const unmapped = holdings.filter(h => h.ticker_source === 'unmapped').length;

  console.log(`\n[매핑 통계]`);
  console.log(`  전체: ${total}개`);
  console.log(`  수동 매핑: ${manual}개`);
  console.log(`  자동 매핑: ${auto}개`);
  console.log(`  미매핑: ${unmapped}개`);

  if (unmapped > 0) {
    console.log(`\n[미매핑 종목] cusipMap.ts에 추가 필요:`);
    holdings
      .filter(h => h.ticker_source === 'unmapped')
      .forEach(h => {
        console.log(`  '${h.cusip}': { ticker: '???', exchange: '???' }, // ${h.name_of_issuer}`);
      });
  }
}
