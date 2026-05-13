/**
 * us-gaap (& ifrs-full) 태그 우선순위 매핑
 *
 * 같은 개념이라도 회사/시기마다 다른 태그를 씀.
 * - 우선순위 배열 순서대로 시도해서 첫 번째 매칭값을 사용.
 * - 'us-gaap' 우선, 없으면 'ifrs-full' 폴백.
 * - unit: 'USD'(금액) / 'shares'(주식수) / 'USD/shares'(EPS)
 * - kind: 'flow'(기간 누적값, 분기 차감 가능) / 'instant'(시점 잔액)
 *         / 'flow-nosub'(기간값이지만 분기 차감으로 도출 불가 — EPS·가중평균)
 */

export type MetricKey =
  | 'revenue'
  | 'operatingProfit'
  | 'netIncome'
  | 'totalAssets'
  | 'totalLiabilities'
  | 'totalEquity'
  | 'currentAssets'
  | 'currentLiabilities'
  | 'operatingCashFlow'
  | 'investingCashFlow'
  | 'financingCashFlow'
  | 'dividendsPaid'
  | 'stockBuyback'
  | 'cashBalance'
  | 'longTermDebt'
  | 'shareBasedComp'
  | 'sharesOutstanding'
  | 'epsBasic'
  | 'epsDiluted'
  // 영업이익 계산식 폴백용 구성요소
  | 'costsAndExpenses'         // 에너지 등이 보고 (총비용 단일 라인)
  | 'grossProfit'              // 매출총이익
  | 'sgaExpense'               // 판매관리비
  | 'rdExpense';               // 연구개발비

interface TagPriority {
  /** 'us-gaap' 우선 시도 태그 (배열 앞쪽 우선) */
  usGaap: string[];
  /** ifrs-full 폴백 (해외 기업 20-F 등) */
  ifrs?: string[];
  /** dei 네임스페이스 폴백 (Entity 메타데이터, 발행주식수 등) */
  dei?: string[];
  /** 단위. 기본 USD */
  unit?: 'USD' | 'shares' | 'USD/shares';
}

export const TAG_MAP: Record<MetricKey, TagPriority> = {
  revenue: {
    usGaap: [
      'Revenues',
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'RevenueFromContractWithCustomerIncludingAssessedTax',
      'SalesRevenueNet',
      'SalesRevenueGoodsNet',
      'SalesRevenueServicesNet',
      // 은행 폴백: WFC·GS·MS·C 같은 대형 은행은 "이자수익 - 이자비용 + 비이자수익" 합쳐서
      // RevenuesNetOfInterestExpense로 보고. BAC·JPM은 Revenues로도 보고해서 그게 먼저 잡힘.
      'RevenuesNetOfInterestExpense',
    ],
    ifrs: ['Revenue'],
  },
  operatingProfit: {
    usGaap: ['OperatingIncomeLoss'],
    ifrs: ['ProfitLossFromOperatingActivities', 'OperatingProfitLoss'],
  },
  netIncome: {
    // EPS와 일관성 맞추려고 'AvailableToCommonStockholdersBasic'을 1순위.
    // 대부분 회사(우선주 없음)는 NetIncomeLoss와 동일하지만,
    // MSTR/REIT/금융 등 우선주 발행 회사는 우선주 배당 차감 후 값을 반환 → 표시 EPS와 정합.
    usGaap: [
      'NetIncomeLossAvailableToCommonStockholdersBasic',
      'NetIncomeLoss',
      'ProfitLoss',
    ],
    ifrs: ['ProfitLoss', 'ProfitLossAttributableToOwnersOfParent'],
  },
  totalAssets: {
    usGaap: ['Assets'],
    ifrs: ['Assets'],
  },
  totalLiabilities: {
    usGaap: ['Liabilities'],
    ifrs: ['Liabilities'],
  },
  totalEquity: {
    usGaap: [
      'StockholdersEquity',
      'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest',
    ],
    ifrs: ['Equity', 'EquityAttributableToOwnersOfParent'],
  },
  currentAssets: {
    usGaap: ['AssetsCurrent'],
    ifrs: ['CurrentAssets'],
  },
  currentLiabilities: {
    usGaap: ['LiabilitiesCurrent'],
    ifrs: ['CurrentLiabilities'],
  },
  operatingCashFlow: {
    usGaap: [
      'NetCashProvidedByUsedInOperatingActivities',
      'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations',
    ],
    ifrs: ['CashFlowsFromUsedInOperatingActivities'],
  },
  investingCashFlow: {
    usGaap: [
      'NetCashProvidedByUsedInInvestingActivities',
      'NetCashProvidedByUsedInInvestingActivitiesContinuingOperations',
    ],
    ifrs: ['CashFlowsFromUsedInInvestingActivities'],
  },
  financingCashFlow: {
    usGaap: [
      'NetCashProvidedByUsedInFinancingActivities',
      'NetCashProvidedByUsedInFinancingActivitiesContinuingOperations',
    ],
    ifrs: ['CashFlowsFromUsedInFinancingActivities'],
  },
  // 배당 지급액 — Apple은 PaymentsOfDividends, MS는 PaymentsOfDividendsCommonStock
  // 양수로 보고됨 (지급 금액의 절대값)
  dividendsPaid: {
    usGaap: ['PaymentsOfDividends', 'PaymentsOfDividendsCommonStock'],
    ifrs: ['DividendsPaid'],
  },
  // 자사주 매입 — 양수로 보고됨 (매입 금액의 절대값)
  stockBuyback: {
    usGaap: ['PaymentsForRepurchaseOfCommonStock', 'PaymentsForRepurchaseOfEquity'],
  },
  // 현금성자산 잔액 (BS instant value)
  cashBalance: {
    usGaap: [
      'CashAndCashEquivalentsAtCarryingValue',
      'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents',
      'Cash',
    ],
    ifrs: ['CashAndCashEquivalents'],
  },
  // 이자성 차입금 (장기부채 — 보통 1년내 만기 도래분 포함된 합계)
  longTermDebt: {
    usGaap: ['LongTermDebt', 'LongTermDebtNoncurrent'],
    ifrs: ['LongtermBorrowings', 'BorrowingsNoncurrent', 'Borrowings'],
  },
  // ─── 영업이익 계산식 폴백용 구성요소 ─────────────────────────────────
  // OperatingIncomeLoss 태그가 없는 회사의 영업이익을 추정하기 위한 구성요소들.
  // 1순위 계산: Revenue - CostsAndExpenses (XOM·CVX·OXY 같은 에너지/단순 P&L)
  // 2순위 계산: GrossProfit - SGA - R&D (JNJ 같은 제조/제약)

  // 총비용 단일 라인 (매출원가 + 판관비 + R&D + 감가상각 + 손상 등 모두 합산)
  costsAndExpenses: {
    usGaap: ['CostsAndExpenses', 'OperatingExpenses'],
  },

  // 매출총이익 (Revenue - COGS)
  grossProfit: {
    usGaap: ['GrossProfit'],
  },

  // 판매관리비
  sgaExpense: {
    usGaap: [
      'SellingGeneralAndAdministrativeExpense',
      'GeneralAndAdministrativeExpense',
    ],
  },

  // 연구개발비 — JNJ 같은 일부 회사는 "Excluding Acquired In-Process Cost" 태그가 주 R&D
  // (ResearchAndDevelopmentExpense는 IPR&D 같은 일부 항목만 잡힘). 그래서 "Excluding" 우선.
  // 대부분 회사(AAPL, NVDA 등)는 standard 태그만 써서 폴백으로 동작.
  rdExpense: {
    usGaap: [
      'ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost',
      'ResearchAndDevelopmentExpense',
    ],
  },

  // 주식기반보상 비용 (현금흐름표의 비현금 가산 항목)
  // BABA(2023+) 등 일부 회사는 AllocatedShareBasedCompensationExpense 태그 사용
  shareBasedComp: {
    usGaap: [
      'ShareBasedCompensation',
      'StockBasedCompensation',
      'AllocatedShareBasedCompensationExpense',
    ],
  },
  // 발행주식수 — 우선순위:
  //  1) 기말 시점 보통주 발행 잔량 (단일 클래스 회사: AAPL, MSFT 등)
  //  2) 희석 가중평균 주식수 (이중 클래스 회사: CRWD, COIN, DKNG 등은 1)을 0으로 보고)
  //     기말값과 살짝 다름(연중 평균이라 buyback 시점에 따라 미세 차이) — 트렌드용으론 충분
  //  3) dei 폴백 (Entity 공시용)
  sharesOutstanding: {
    usGaap: [
      'CommonStockSharesOutstanding',
      'WeightedAverageNumberOfDilutedSharesOutstanding',
      'WeightedAverageNumberOfSharesOutstandingBasic',
      'WeightedAverageNumberOfShareOutstandingBasicAndDiluted',
    ],
    dei: ['EntityCommonStockSharesOutstanding'],
    unit: 'shares',
  },
  // 주당순이익 — 기본·희석 (USD/주)
  epsBasic: {
    usGaap: ['EarningsPerShareBasic', 'IncomeLossFromContinuingOperationsPerBasicShare'],
    unit: 'USD/shares',
  },
  epsDiluted: {
    usGaap: ['EarningsPerShareDiluted', 'IncomeLossFromContinuingOperationsPerDilutedShare'],
    unit: 'USD/shares',
  },
};
