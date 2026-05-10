/**
 * us-gaap (& ifrs-full) 태그 우선순위 매핑
 *
 * 같은 개념이라도 회사/시기마다 다른 태그를 씀.
 * - 우선순위 배열 순서대로 시도해서 첫 번째 매칭값을 사용.
 * - 'us-gaap' 우선, 없으면 'ifrs-full' 폴백.
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
  | 'financingCashFlow';

interface TagPriority {
  /** 'us-gaap' 우선 시도 태그 (배열 앞쪽 우선) */
  usGaap: string[];
  /** ifrs-full 폴백 (해외 기업 20-F 등) */
  ifrs?: string[];
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
    ],
    ifrs: ['Revenue'],
  },
  operatingProfit: {
    usGaap: ['OperatingIncomeLoss'],
    ifrs: ['ProfitLossFromOperatingActivities', 'OperatingProfitLoss'],
  },
  netIncome: {
    usGaap: [
      'NetIncomeLoss',
      'ProfitLoss',
      'NetIncomeLossAvailableToCommonStockholdersBasic',
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
};
